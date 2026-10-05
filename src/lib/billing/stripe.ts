import Stripe from "stripe";
import { appUrl, stripeKey, stripeWebhookSecret } from "./config";

let client: Stripe | null = null;
export function stripe() {
  if (!stripeKey()) throw new Error("STRIPE_SECRET_KEY is not set");
  return (client ??= new Stripe(stripeKey()));
}

/**
 * One-off Checkout payment in UZS (2-decimal currency in Stripe, so the amount is in tiyin).
 * Our own billing engine handles periods and renewals, so the card is saved for off-session
 * charges instead of creating a Stripe Subscription.
 */
export async function createStripeCheckout(o: {
  invoiceId: string;
  number: string;
  amount: number;
  title: string;
  customerId: string;
  saveCard: boolean;
  locale: string;
}) {
  const back = `${appUrl()}/${o.locale}/app/billing/return?invoice=${o.invoiceId}`;
  return stripe().checkout.sessions.create({
    mode: "payment",
    customer: o.customerId,
    client_reference_id: o.invoiceId,
    locale: o.locale === "ru" ? "ru" : "en",
    line_items: [{ quantity: 1, price_data: { currency: "uzs", unit_amount: o.amount, product_data: { name: o.title } } }],
    payment_intent_data: {
      ...(o.saveCard ? { setup_future_usage: "off_session" as const } : {}),
      description: `Invoice ${o.number}`,
      metadata: { invoiceId: o.invoiceId },
    },
    metadata: { invoiceId: o.invoiceId },
    success_url: `${back}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${back}&canceled=1`,
  });
}

export async function ensureStripeCustomer(user: { id: string; email: string; name: string; stripeCustomerId: string | null }) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const c = await stripe().customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
  return c.id;
}

/** Charges a saved card without the customer present (auto-renewal). Throws on decline. */
export async function chargeStripeOffSession(o: { customerId: string; paymentMethodId: string; amount: number; invoiceId: string; number: string }) {
  return stripe().paymentIntents.create(
    {
      amount: o.amount,
      currency: "uzs",
      customer: o.customerId,
      payment_method: o.paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Invoice ${o.number} (auto-renewal)`,
      metadata: { invoiceId: o.invoiceId, kind: "renewal" },
    },
    { idempotencyKey: `renew-${o.invoiceId}` },
  );
}

/** Card details of a PaymentIntent, to save it for auto-renewal. */
export async function stripeCardOf(paymentIntentId: string) {
  const pi = await stripe().paymentIntents.retrieve(paymentIntentId, { expand: ["payment_method"] });
  const pm = pi.payment_method as Stripe.PaymentMethod | null;
  if (!pm || !pm.card) return null;
  return {
    token: pm.id,
    maskedPan: `•••• ${pm.card.last4}`,
    brand: pm.card.brand,
    expire: `${String(pm.card.exp_month).padStart(2, "0")}/${String(pm.card.exp_year).slice(-2)}`,
  };
}

/** Verifies the `stripe-signature` header. Throws if the payload was not signed by Stripe. */
export function verifyStripeEvent(rawBody: string, signature: string | null) {
  if (!signature) throw new Error("missing stripe-signature");
  if (!stripeWebhookSecret()) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe().webhooks.constructEvent(rawBody, signature, stripeWebhookSecret());
}

export type { Stripe };
