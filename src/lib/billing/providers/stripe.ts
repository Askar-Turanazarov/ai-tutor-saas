import Stripe from "stripe";
import type { Invoice } from "@prisma/client";
import { db } from "../../db";
import { tierLabel } from "../catalog";
import { applyPaidInvoice, failInvoice } from "../subscription";
import type { PaymentProvider } from "./types";

/**
 * Stripe in test mode, in UZS. Checkout takes a one-off payment and, with auto-renewal on,
 * saves the card for off-session charges; periods and renewals are run by our own billing
 * engine, the same way as for Click and Uzcard/HUMO. Enabled only when STRIPE_SECRET_KEY is set.
 * UZS is a two-decimal currency in Stripe, so amounts are sent in tiyin (×100).
 */

let client: Stripe | null = null;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return (client ??= new Stripe(key));
}

const tiyin = (sum: number) => sum * 100;
const title = (invoice: Invoice) => `Ustoz AI ${tierLabel(invoice.tier)} · ${invoice.period} mo.`;

async function customerFor(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe().customers.create({ email: user.email, name: user.name, metadata: { userId } });
  await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  currency: "UZS",
  enabled: () => !!process.env.STRIPE_SECRET_KEY,

  async createCheckout(invoice, { locale, origin }) {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer: await customerFor(invoice.userId),
      client_reference_id: invoice.id,
      locale: locale === "ru" ? "ru" : "en",
      line_items: [{ quantity: 1, price_data: { currency: "uzs", unit_amount: tiyin(invoice.amount), product_data: { name: title(invoice) } } }],
      payment_intent_data: {
        ...(invoice.saveCard ? { setup_future_usage: "off_session" as const } : {}),
        description: `Invoice ${invoice.number}`,
        metadata: { invoiceId: invoice.id },
      },
      metadata: { invoiceId: invoice.id, userId: invoice.userId },
      success_url: `${origin}/${locale}/app/billing/${invoice.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/app/plans?canceled=${invoice.id}`,
    });
    await db.transaction.create({ data: { invoiceId: invoice.id, provider: "stripe", providerTxId: session.id, amount: invoice.amount } });
    return { redirectUrl: session.url! };
  },

  /** Auto-renewal: charges the saved card without the customer present. */
  async chargeToken(method, invoice) {
    try {
      const pi = await stripe().paymentIntents.create(
        {
          amount: tiyin(invoice.amount),
          currency: "uzs",
          customer: await customerFor(invoice.userId),
          payment_method: method.token,
          off_session: true,
          confirm: true,
          description: `Invoice ${invoice.number} (auto-renewal)`,
          metadata: { invoiceId: invoice.id, kind: "renewal" },
        },
        { idempotencyKey: `charge-${invoice.id}` },
      );
      return pi.status === "succeeded" ? { ok: true, txId: pi.id } : { ok: false, reason: `Payment ${pi.status}`, txId: pi.id };
    } catch (e) {
      const err = e as Stripe.errors.StripeError;
      return { ok: false, reason: err.message, txId: err.payment_intent?.id };
    }
  },
};

/** Saves the card behind a Checkout payment for auto-renewal (once per Stripe payment method). */
async function saveCardOf(userId: string, paymentIntentId: string) {
  const pi = await stripe().paymentIntents.retrieve(paymentIntentId, { expand: ["payment_method"] });
  const pm = pi.payment_method as Stripe.PaymentMethod | null;
  if (!pm?.card) return undefined;
  const existing = await db.paymentMethod.findFirst({ where: { userId, provider: "stripe", token: pm.id } });
  if (existing) return existing.id;
  const card = await db.paymentMethod.create({
    data: { userId, provider: "stripe", brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year, token: pm.id },
  });
  return card.id;
}

/** Checkout was paid (from the webhook or the return URL — whichever comes first). */
export async function completeCheckoutSession(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId ?? session.client_reference_id;
  if (!invoiceId || session.payment_status !== "paid") return;
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "paid") return;
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const paymentMethodId = invoice.saveCard && piId ? await saveCardOf(invoice.userId, piId).catch(() => undefined) : undefined;
  // The Checkout session row becomes the completed transaction; the payment intent id is kept in raw.
  await applyPaidInvoice(invoiceId, { txId: session.id, paymentMethodId, raw: { payment_intent: piId } });
}

/** Called by the result page with ?session_id=… so it works even without `stripe listen`. */
export async function syncCheckoutSession(sessionId: string, invoiceId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if ((session.metadata?.invoiceId ?? session.client_reference_id) !== invoiceId) return;
  await completeCheckoutSession(session);
}

/** Events forwarded by scripts/stripe-listen.mjs; see /api/payments/stripe/webhook. */
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return completeCheckoutSession(event.data.object);
    case "checkout.session.async_payment_failed": {
      const s = event.data.object;
      if (s.metadata?.invoiceId) await failInvoice(s.metadata.invoiceId, "Payment failed", s.id);
      return;
    }
    case "checkout.session.expired": {
      const s = event.data.object;
      if (!s.metadata?.invoiceId) return;
      await db.invoice.updateMany({ where: { id: s.metadata.invoiceId, status: "pending" }, data: { status: "canceled" } });
      await db.transaction.updateMany({ where: { provider: "stripe", providerTxId: s.id, state: "created" }, data: { state: "canceled" } });
      return;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      // Renewals record their own failure synchronously; this covers declines inside Checkout (the user may retry there).
      if (pi.metadata?.invoiceId && pi.metadata.kind !== "renewal")
        await db.transaction.upsert({
          where: { provider_providerTxId: { provider: "stripe", providerTxId: pi.id } },
          update: { state: "failed", error: pi.last_payment_error?.message ?? "payment failed" },
          create: { invoiceId: pi.metadata.invoiceId, provider: "stripe", providerTxId: pi.id, amount: Math.round(pi.amount / 100), state: "failed", error: pi.last_payment_error?.message ?? "payment failed" },
        });
      return;
    }
  }
}

/** Removes a saved card on Stripe's side too. */
export async function detachCard(token: string) {
  if (process.env.STRIPE_SECRET_KEY) await stripe().paymentMethods.detach(token).catch(() => null);
}
