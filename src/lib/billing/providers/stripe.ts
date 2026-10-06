import Stripe from "stripe";
import { db } from "../../db";
import { getSetting, setSetting } from "../../settings";
import { isPaidTier, tierLabel, type PaidTier } from "../catalog";
import { applyPaidInvoice, failInvoice, isLive, newInvoice, priceFor, syncUserPlan } from "../subscription";
import type { PaymentProvider } from "./types";

/**
 * Stripe in test mode: Checkout for new subscriptions, Stripe bills renewals itself and
 * reports them through the webhook. Works without products in the Dashboard (inline prices).
 * Enabled only when STRIPE_SECRET_KEY is set.
 */

let client: Stripe | null = null;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return (client ??= new Stripe(key));
}

const DAY = 24 * 60 * 60 * 1000;

/** One Stripe product per tier, created on first use and remembered in Settings. */
async function productFor(tier: PaidTier) {
  const key = `billing.stripeProduct.${tier}` as const;
  const saved = await getSetting(key);
  if (saved) return saved;
  const product = await stripe().products.create({ name: `Ustoz ${tierLabel(tier)}`, metadata: { ustoz_tier: tier } });
  await setSetting(key, product.id);
  return product.id;
}

async function customerFor(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe().customers.create({ email: user.email, name: user.name, metadata: { userId } });
  await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

const recurring = (months: number) => ({ interval: "month" as const, interval_count: months });

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  currency: "UZS",
  enabled: () => !!process.env.STRIPE_SECRET_KEY,

  async createCheckout(invoice, { locale, origin }) {
    if (!isPaidTier(invoice.tier)) throw new Error("Bad tier");
    const resultUrl = `${origin}/${locale}/app/billing/${invoice.id}`;
    const customer = await customerFor(invoice.userId);
    const sub = await db.subscription.findUnique({ where: { userId: invoice.userId } });

    // Stripe bills a running subscription itself; paying again would start a second one.
    if (invoice.kind === "renewal" && sub?.provider === "stripe" && sub.providerRef && isLive(sub))
      throw new Error("Stripe subscription is already active");

    // Upgrade of a Stripe subscription: change the price in place, Stripe prorates and charges now.
    if (invoice.kind === "upgrade" && sub?.provider === "stripe" && sub.providerRef) {
      const current = await stripe().subscriptions.retrieve(sub.providerRef);
      const item = current.items.data[0];
      await stripe().subscriptions.update(sub.providerRef, {
        items: [
          {
            id: item.id,
            price_data: {
              currency: "uzs",
              product: await productFor(invoice.tier),
              unit_amount: (await priceFor(invoice.tier, invoice.period as 1 | 3 | 12)) * 100,
              recurring: recurring(sub.period),
            },
          },
        ],
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
        metadata: { tier: invoice.tier, userId: invoice.userId },
      });
      await applyPaidInvoice(invoice.id, { txId: `stripe_upgrade_${Date.now()}` });
      return { redirectUrl: resultUrl };
    }

    const common = {
      customer,
      client_reference_id: invoice.id,
      metadata: { invoiceId: invoice.id, userId: invoice.userId },
      success_url: `${resultUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/app/plans?canceled=${invoice.id}`,
      locale: (locale === "uz" ? "auto" : locale) as Stripe.Checkout.SessionCreateParams.Locale,
    };

    // Upgrade of a card/Click subscription: one-off payment of the difference, renewals stay where they are.
    if (invoice.kind === "upgrade") {
      const session = await stripe().checkout.sessions.create({
        ...common,
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: { currency: "uzs", unit_amount: invoice.amount * 100, product: await productFor(invoice.tier) },
          },
        ],
      });
      return { redirectUrl: session.url! };
    }

    const session = await stripe().checkout.sessions.create({
      ...common,
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "uzs",
            unit_amount: invoice.amount * 100,
            product: await productFor(invoice.tier),
            recurring: recurring(invoice.period),
          },
        },
      ],
      subscription_data: { metadata: { invoiceId: invoice.id, userId: invoice.userId, tier: invoice.tier } },
    });
    return { redirectUrl: session.url! };
  },

  async setCancelAtPeriodEnd(providerRef, cancel) {
    await stripe().subscriptions.update(providerRef, { cancel_at_period_end: cancel });
  },
};

/* ───── Applying Stripe events ───── */

/** Checkout finished (from the webhook or the return URL — whichever comes first). */
export async function applyCheckoutSession(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId ?? session.client_reference_id;
  if (!invoiceId) return;
  if (session.status !== "complete" || session.payment_status === "unpaid") return;
  const providerRef = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const before = await db.subscription.findUnique({ where: { userId: session.metadata?.userId ?? "" } });
  await applyPaidInvoice(invoiceId, { txId: session.id, providerRef: session.mode === "subscription" ? providerRef : undefined });

  // A new Stripe subscription replaces a Stripe one that might still be running.
  if (session.mode === "subscription" && before?.provider === "stripe" && before.providerRef && before.providerRef !== providerRef)
    await stripe().subscriptions.cancel(before.providerRef).catch(() => null);

  if (session.mode === "subscription" && providerRef) {
    const s = await stripe().subscriptions.retrieve(providerRef);
    const end = s.items.data[0]?.current_period_end;
    // Days left from an earlier non-Stripe plan are never cut short.
    const sub = await db.subscription.findFirst({ where: { providerRef } });
    if (end && sub && end * 1000 > sub.currentPeriodEnd.getTime())
      await db.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: new Date(end * 1000) } });
  }
}

/** Called by the result page with ?session_id=… so it works even without `stripe listen`. */
export async function syncCheckoutSession(sessionId: string, invoiceId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  const id = session.metadata?.invoiceId ?? session.client_reference_id;
  if (id !== invoiceId) return;
  await applyCheckoutSession(session);
}

function subscriptionIdOf(invoice: Stripe.Invoice) {
  const s = invoice.parent?.subscription_details?.subscription;
  return typeof s === "string" ? s : s?.id;
}

/** Stripe charged a renewal: record it and move the period forward. */
async function applyRenewal(si: Stripe.Invoice) {
  if (si.billing_reason !== "subscription_cycle") return;
  const ref = subscriptionIdOf(si);
  const sub = ref ? await db.subscription.findFirst({ where: { providerRef: ref } }) : null;
  if (!sub) return;
  const txId = `stripe_${si.id}`;
  if (await db.invoice.findFirst({ where: { providerTxId: txId } })) return;
  const invoice = await newInvoice({
    userId: sub.userId,
    subscriptionId: sub.id,
    tier: sub.tier,
    period: sub.period,
    amount: Math.round(si.amount_paid / 100),
    provider: "stripe",
    kind: "renewal",
  });
  await applyPaidInvoice(invoice.id, { txId });
  const end = si.lines.data[0]?.period?.end;
  if (end) await db.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: new Date(end * 1000) } });
}

async function applyPaymentFailed(si: Stripe.Invoice) {
  const ref = subscriptionIdOf(si);
  const sub = ref ? await db.subscription.findFirst({ where: { providerRef: ref } }) : null;
  if (!sub || !isLive(sub)) return;
  const graceDays = Number(await getSetting("billing.graceDays")) || 3;
  await db.subscription.update({
    where: { id: sub.id },
    data: { status: "past_due", graceUntil: new Date(Math.max(Date.now(), sub.currentPeriodEnd.getTime()) + graceDays * DAY) },
  });
  const pending = await db.invoice.findFirst({ where: { subscriptionId: sub.id, status: "pending" }, orderBy: { createdAt: "desc" } });
  if (pending) await failInvoice(pending.id, si.last_finalization_error?.message ?? "Card declined");
}

async function applySubscriptionChange(s: Stripe.Subscription, deleted: boolean) {
  const sub = await db.subscription.findFirst({ where: { providerRef: s.id } });
  if (!sub) return;
  const end = s.items.data[0]?.current_period_end;
  await db.subscription.update({
    where: { id: sub.id },
    data: {
      cancelAtPeriodEnd: s.cancel_at_period_end,
      ...(deleted || s.status === "canceled" ? { status: "expired" } : {}),
      ...(end && !deleted ? { currentPeriodEnd: new Date(end * 1000) } : {}),
    },
  });
  await syncUserPlan(sub.userId);
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return applyCheckoutSession(event.data.object);
    case "checkout.session.expired": {
      const id = event.data.object.metadata?.invoiceId;
      if (id) await db.invoice.updateMany({ where: { id, status: "pending" }, data: { status: "canceled" } });
      return;
    }
    case "invoice.paid":
      return applyRenewal(event.data.object);
    case "invoice.payment_failed":
      return applyPaymentFailed(event.data.object);
    case "customer.subscription.updated":
      return applySubscriptionChange(event.data.object, false);
    case "customer.subscription.deleted":
      return applySubscriptionChange(event.data.object, true);
  }
}

/** Customer Portal: change card, see invoices, cancel. */
export async function portalUrl(userId: string, returnUrl: string) {
  const customer = await customerFor(userId);
  const session = await stripe().billingPortal.sessions.create({ customer, return_url: returnUrl });
  return session.url;
}
