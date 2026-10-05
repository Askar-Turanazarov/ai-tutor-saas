import { db } from "../db";
import { FREE_LEVELS, type Level } from "../levels";
import { addMonths, billingConfig, type PaymentProvider, type Period } from "./config";
import { clickPayUrl, cardTokenDelete } from "./click";
import { createStripeCheckout, ensureStripeCustomer, stripe, stripeCardOf } from "./stripe";
import { createReceipt } from "./fiscal";
import { notify } from "./notify";

export type SavedCard = { token: string; maskedPan: string; brand?: string | null; expire?: string | null };

/** Pro forever, granted by an admin: never expires and is never charged. */
export const isLifetimePro = (u: { plan: string; proUntil: Date | null }) => u.plan === "PRO" && !u.proUntil;

const sum = (tiyin: number) => Math.round(tiyin / 100);

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const n = await db.invoice.count({ where: { number: { startsWith: `UST-${year}-` } } });
  return `UST-${year}-${String(n + 1).padStart(6, "0")}`;
}

/** The subscription that currently gives (or last gave) the user Pro. */
export function currentSubscription(userId: string) {
  return db.subscription.findFirst({
    where: { userId, status: { in: ["active", "past_due"] } },
    orderBy: { currentPeriodEnd: "desc" },
    include: { card: true },
  });
}

export async function createInvoice(o: {
  userId: string;
  subscriptionId: string;
  kind: "initial" | "renewal";
  provider: PaymentProvider;
  months: number;
  amount: number;
  saveCard: boolean;
}) {
  for (let i = 0; i < 3; i++) {
    try {
      return await db.invoice.create({ data: { ...o, number: await nextInvoiceNumber() } });
    } catch (e) {
      if (i === 2) throw e; // number collision under concurrency: try the next one
    }
  }
  throw new Error("unreachable");
}

/**
 * Starts a purchase: a pending subscription (or the active one, which will be extended),
 * an open invoice and the provider's payment page. Returns the URL to send the user to.
 */
export async function startCheckout(o: { userId: string; months: Period; provider: PaymentProvider; autoRenew: boolean; locale: string }) {
  const cfg = await billingConfig();
  if (!cfg.providers[o.provider]) throw new Error("provider_unavailable");
  const user = await db.user.findUniqueOrThrow({ where: { id: o.userId } });
  if (isLifetimePro(user)) throw new Error("lifetime_pro");

  // Shows up as "wants Pro" in the admin overview until the payment goes through.
  if (!user.upgradeRequested) await db.user.update({ where: { id: user.id }, data: { upgradeRequested: true } });
  const active = await currentSubscription(user.id);
  const sub =
    active ??
    (await db.subscription.create({ data: { userId: user.id, provider: o.provider, months: o.months, autoRenew: false } }));
  const amount = cfg.prices[o.months] * 100;
  const inv = await createInvoice({
    userId: user.id,
    subscriptionId: sub.id,
    kind: "initial",
    provider: o.provider,
    months: o.months,
    amount,
    saveCard: o.autoRenew,
  });

  if (o.provider === "click") return clickPayUrl(inv.id, amount, o.locale);

  const customerId = await ensureStripeCustomer(user);
  if (customerId !== user.stripeCustomerId) await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  const session = await createStripeCheckout({
    invoiceId: inv.id,
    number: inv.number,
    amount,
    title: `Ustoz AI Pro — ${o.months} mo.`,
    customerId,
    saveCard: o.autoRenew,
    locale: o.locale,
  });
  await db.transaction.create({
    data: { invoiceId: inv.id, provider: "stripe", providerTxId: session.id, amount, state: "created" },
  });
  return session.url!;
}

/**
 * Marks an invoice paid and gives Pro until the end of the paid period. Idempotent: a repeated
 * webhook or callback for the same invoice changes nothing. Returns false if it was already paid.
 */
export async function activatePaidInvoice(
  invoiceId: string,
  o: { provider: PaymentProvider; providerTxId: string; raw?: unknown; card?: SavedCard | null },
) {
  const res = await db.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { subscription: true } });
    if (!inv) throw new Error("invoice_not_found");
    if (inv.status === "paid") return null;
    const sub = inv.subscription;
    const now = new Date();
    const extending = sub.status !== "pending" && !!sub.currentPeriodEnd && sub.currentPeriodEnd > now;
    const start = extending ? sub.currentPeriodEnd! : now;
    const end = addMonths(start, inv.months);

    let cardId = sub.cardId;
    if (o.card) {
      const card = await tx.paymentCard.create({
        data: { userId: inv.userId, provider: inv.provider, token: o.card.token, maskedPan: o.card.maskedPan, brand: o.card.brand, expire: o.card.expire },
      });
      cardId = card.id;
    }

    const t = await tx.transaction.upsert({
      where: { provider_providerTxId: { provider: o.provider, providerTxId: o.providerTxId } },
      update: { state: "completed", raw: o.raw ? JSON.stringify(o.raw) : undefined, error: null },
      create: { invoiceId, provider: o.provider, providerTxId: o.providerTxId, amount: inv.amount, state: "completed", raw: o.raw ? JSON.stringify(o.raw) : null },
    });
    await tx.invoice.update({ where: { id: invoiceId }, data: { status: "paid", paidAt: now, periodStart: start, periodEnd: end } });
    // Other unpaid checkouts of this subscription are no longer needed.
    await tx.invoice.updateMany({ where: { subscriptionId: sub.id, status: "open", id: { not: invoiceId } }, data: { status: "void" } });
    await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: "active",
        provider: inv.provider,
        months: inv.months,
        currentPeriodStart: extending ? sub.currentPeriodStart : start,
        currentPeriodEnd: end,
        cardId,
        autoRenew: inv.kind === "initial" ? inv.saveCard && !!cardId : sub.autoRenew,
        notifiedSoonAt: null,
        notifiedEndAt: null,
        renewAttempts: 0,
        lastRenewAttemptAt: null,
        canceledAt: null,
      },
    });
    // Any other subscription left pending by an abandoned checkout.
    await tx.subscription.updateMany({ where: { userId: inv.userId, status: "pending", id: { not: sub.id } }, data: { status: "canceled", canceledAt: now } });
    await tx.user.update({ where: { id: inv.userId }, data: { plan: "PRO", proUntil: end, upgradeRequested: false } });
    return { inv, end, txId: t.id };
  });
  if (!res) return false;

  await createReceipt(invoiceId, res.txId).catch((e) => console.error("[billing] receipt:", e));
  await notify(res.inv.userId, res.inv.kind === "renewal" ? "renewed" : "payment_ok", {
    number: res.inv.number,
    amount: sum(res.inv.amount),
    until: res.end.toISOString(),
  });
  return true;
}

export async function failTransaction(o: { invoiceId: string; provider: PaymentProvider; providerTxId: string; error: string; raw?: unknown }) {
  await db.transaction.upsert({
    where: { provider_providerTxId: { provider: o.provider, providerTxId: o.providerTxId } },
    update: { state: "failed", error: o.error.slice(0, 300), raw: o.raw ? JSON.stringify(o.raw) : undefined },
    create: {
      invoiceId: o.invoiceId,
      provider: o.provider,
      providerTxId: o.providerTxId,
      amount: (await db.invoice.findUnique({ where: { id: o.invoiceId } }))?.amount ?? 0,
      state: "failed",
      error: o.error.slice(0, 300),
      raw: o.raw ? JSON.stringify(o.raw) : null,
    },
  });
}

/**
 * Asks Stripe directly whether a Checkout was paid. Used by the return page, so the
 * purchase completes even when webhooks can't reach a local machine.
 */
export async function syncStripeInvoice(invoiceId: string) {
  const tx = await db.transaction.findFirst({ where: { invoiceId, provider: "stripe", providerTxId: { startsWith: "cs_" } } });
  if (!tx?.providerTxId) return;
  const session = await stripe().checkout.sessions.retrieve(tx.providerTxId);
  if (session.payment_status !== "paid") return;
  await completeStripeSession(session);
}

export async function completeStripeSession(session: { id: string; metadata: Record<string, string> | null; payment_intent: unknown; customer: unknown }) {
  const invoiceId = session.metadata?.invoiceId;
  if (!invoiceId) return;
  const inv = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv || inv.status === "paid") return;
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as { id?: string } | null)?.id;
  const card = inv.saveCard && piId ? await stripeCardOf(piId).catch(() => null) : null;
  // The Checkout session row becomes the completed transaction; the payment intent id is kept in raw.
  await activatePaidInvoice(invoiceId, { provider: "stripe", providerTxId: session.id, raw: { payment_intent: piId }, card });
}

/** Back to Free: Pro-only levels are clamped and the learning path is rebuilt. */
export async function downgradeToFree(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return;
  const level = FREE_LEVELS.includes(u.level as Level) ? u.level : "A2";
  await db.user.update({ where: { id: userId }, data: { plan: "FREE", proUntil: null, level } });
  // Same as rebuildPlan(): the path is regenerated for the new level on the next visit.
  if (level !== u.level) await db.planUnit.deleteMany({ where: { userId } });
}

export async function expireSubscription(subId: string) {
  const sub = await db.subscription.findUnique({ where: { id: subId }, include: { user: true } });
  if (!sub || !["active", "past_due"].includes(sub.status)) return;
  await db.subscription.update({ where: { id: sub.id }, data: { status: "expired", notifiedEndAt: new Date(), autoRenew: false } });
  await db.invoice.updateMany({ where: { subscriptionId: sub.id, status: "open" }, data: { status: "void" } });
  const u = sub.user;
  // An admin may have granted lifetime Pro meanwhile; that one stays.
  if (u.plan === "PRO" && u.proUntil && u.proUntil <= new Date()) {
    await downgradeToFree(u.id);
    await notify(u.id, "sub_expired", {});
  }
}

export async function setAutoRenew(userId: string, on: boolean) {
  const sub = await currentSubscription(userId);
  if (!sub) return { ok: false, reason: "no_subscription" as const };
  if (on && !sub.cardId) {
    // No saved card for this subscription: use the newest card of the same provider, if any.
    const card = await db.paymentCard.findFirst({ where: { userId, provider: sub.provider }, orderBy: { createdAt: "desc" } });
    if (!card) return { ok: false, reason: "no_card" as const };
    await db.subscription.update({ where: { id: sub.id }, data: { cardId: card.id } });
  }
  await db.subscription.update({ where: { id: sub.id }, data: { autoRenew: on, renewAttempts: 0, notifiedSoonAt: null } });
  return { ok: true as const };
}

/** Cancelling keeps Pro until the paid period ends, it only stops renewals. */
export const cancelSubscription = (userId: string) => setAutoRenew(userId, false);

export async function removeCard(userId: string, cardId: string) {
  const card = await db.paymentCard.findFirst({ where: { id: cardId, userId } });
  if (!card) return;
  await db.subscription.updateMany({ where: { cardId: card.id }, data: { autoRenew: false, cardId: null } });
  if (card.provider === "click") await cardTokenDelete(card.token);
  if (card.provider === "stripe") await stripe().paymentMethods.detach(card.token).catch(() => {});
  await db.paymentCard.delete({ where: { id: card.id } });
}

/** Admin: lifetime Pro (never expires) or Free (stops any running subscription). */
export async function adminSetPlan(userId: string, plan: "FREE" | "PRO") {
  if (plan === "PRO") {
    await db.user.update({ where: { id: userId }, data: { plan: "PRO", proUntil: null, upgradeRequested: false } });
    await db.subscription.updateMany({ where: { userId, status: { in: ["active", "past_due"] } }, data: { autoRenew: false } });
    return;
  }
  await db.subscription.updateMany({
    where: { userId, status: { in: ["active", "past_due", "pending"] } },
    data: { status: "canceled", autoRenew: false, canceledAt: new Date() },
  });
  await downgradeToFree(userId);
}
