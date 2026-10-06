import "server-only";
import type { Invoice, Prisma, Subscription, User } from "@prisma/client";
import { db } from "../db";
import { getAllSettings } from "../settings";
import { FREE_LEVELS, type Level } from "../levels";
import {
  discountSettingKey,
  isPaidTier,
  isPeriod,
  priceSettingKey,
  TIER_RANK,
  type Currency,
  type PaidTier,
  type Period,
  type Tier,
} from "./catalog";

/** Loaded lazily: providers import this module back (they apply paid invoices). */
const providerById = async (id: string) => (await import("./providers")).getProvider(id);

const DAY = 24 * 60 * 60 * 1000;

export function addMonths(d: Date, months: number) {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

/* ───────────── Prices ───────────── */

/** Whole UZS for a plan and period, rounded to 1 000 sum. */
export async function priceFor(tier: PaidTier, period: Period) {
  const s = await getAllSettings();
  const monthly = Number(s[priceSettingKey(tier)]) || 0;
  const discount = Number(s[discountSettingKey(period)]) || 0;
  return Math.round((monthly * period * (1 - discount / 100)) / 1000) * 1000;
}

export type Quote = {
  tier: PaidTier;
  period: Period;
  currency: Currency;
  kind: "new" | "renewal" | "upgrade";
  /** Full price of the chosen plan and period. */
  list: number;
  /** Discount for the days already paid on the lower plan (upgrade only). */
  credit: number;
  amount: number;
  /** Upgrade only: the current period end, which stays the same. */
  until?: Date;
};

/**
 * What the user pays right now. An upgrade keeps the current billing period and charges
 * the price difference for the days that are left (the usual proration).
 */
export async function quote(userId: string, tier: PaidTier, period: Period, currency: Currency): Promise<Quote> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  const paidAndLive = sub && isLive(sub) && sub.status !== "trialing" && isPaidTier(sub.tier);

  if (paidAndLive && TIER_RANK[tier] > TIER_RANK[sub.tier as Tier]) {
    const subPeriod = (isPeriod(sub.period) ? sub.period : 1) as Period;
    const [list, current] = await Promise.all([
      priceFor(tier, subPeriod),
      priceFor(sub.tier as PaidTier, subPeriod),
    ]);
    const total = sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime();
    const left = Math.min(1, Math.max(0, (sub.currentPeriodEnd.getTime() - Date.now()) / Math.max(total, 1)));
    let amount = Math.round((list - current) * left);
    amount = Math.max(1000, Math.round(amount / 1000) * 1000);
    return { tier, period: subPeriod, currency, kind: "upgrade", list, credit: Math.max(0, list - amount), amount, until: sub.currentPeriodEnd };
  }

  const list = await priceFor(tier, period);
  const kind = paidAndLive && tier === sub.tier ? "renewal" : "new";
  return { tier, period, currency, kind, list, credit: 0, amount: list };
}

/* ───────────── State ───────────── */

/** The subscription still gives access (incl. grace period and "cancel at period end"). */
export function isLive(sub: Pick<Subscription, "status" | "currentPeriodEnd" | "graceUntil">, now = new Date()) {
  if (sub.status === "expired" || sub.status === "canceled") return false;
  if (sub.status === "past_due") return !!sub.graceUntil && sub.graceUntil > now;
  return sub.currentPeriodEnd > now;
}

export function tierFromSubscription(sub: Subscription | null): Tier {
  return sub && isLive(sub) && isPaidTier(sub.tier) ? sub.tier : "FREE";
}

/** Writes the effective tier into User.plan; Free users are moved back to an A-level. */
export async function syncUserPlan(userId: string) {
  const [user, sub] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.subscription.findUnique({ where: { userId } }),
  ]);
  if (!user) return null;
  const plan = tierFromSubscription(sub);
  if (user.plan === plan) return user;
  const level = plan === "FREE" && !FREE_LEVELS.includes(user.level as Level) ? "A2" : user.level;
  const updated = await db.user.update({ where: { id: userId }, data: { plan, level } });
  if (level !== user.level) await db.planUnit.deleteMany({ where: { userId } });
  return updated;
}

/* ───────────── Transitions ───────────── */

/**
 * Marks an invoice paid and applies it to the subscription. Idempotent: providers may
 * report the same payment twice (webhook + return URL).
 */
export async function applyPaidInvoice(invoiceId: string, opts: { txId?: string; paymentMethodId?: string; providerRef?: string; raw?: unknown } = {}) {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "paid" || invoice.status === "refunded") return invoice;
  if (!isPaidTier(invoice.tier)) return invoice;

  const now = new Date();
  const sub = await db.subscription.findUnique({ where: { userId: invoice.userId } });
  const live = sub && isLive(sub, now) && sub.status !== "trialing";

  // A renewal continues after the current period, an upgrade keeps it, a new plan starts today.
  // An automatic renewal runs right after the period has ended, so "active" past its end still counts.
  const renewal = invoice.kind === "renewal" && !!sub && (live || sub.status === "active");
  const upgrade = invoice.kind === "upgrade" && live;
  const start = renewal
    ? addMonths(sub.currentPeriodEnd, invoice.period) > now
      ? sub.currentPeriodEnd
      : now
    : upgrade
      ? sub.currentPeriodStart
      : now;
  const tier = renewal && sub.pendingTier && isPaidTier(sub.pendingTier) ? sub.pendingTier : invoice.tier;
  const period = renewal && sub.pendingPeriod ? sub.pendingPeriod : invoice.period;

  const data = {
    tier,
    period,
    status: "active",
    // An upgrade is a one-off top-up: renewals stay with the provider and card already on the subscription.
    provider: upgrade ? sub.provider : invoice.provider,
    currentPeriodStart: start,
    currentPeriodEnd: upgrade ? sub.currentPeriodEnd : addMonths(start, period),
    cancelAtPeriodEnd: false,
    graceUntil: null,
    pendingTier: null,
    pendingPeriod: null,
    notifiedSoonAt: null,
    notifiedEndAt: null,
    renewAttempts: 0,
    lastRenewAttemptAt: null,
    ...(upgrade || renewal
      ? {
          ...(opts.providerRef ? { providerRef: opts.providerRef } : {}),
          ...(opts.paymentMethodId ? { paymentMethodId: opts.paymentMethodId } : {}),
        }
      : { providerRef: opts.providerRef ?? null, paymentMethodId: opts.paymentMethodId ?? null }),
  };
  const saved = sub
    ? await db.subscription.update({ where: { id: sub.id }, data })
    : await db.subscription.create({ data: { userId: invoice.userId, ...data } });

  const paid = await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "paid",
      paidAt: now,
      subscriptionId: saved.id,
      providerTxId: opts.txId ?? invoice.providerTxId,
      failureReason: null,
      periodStart: upgrade ? now : start,
      periodEnd: saved.currentPeriodEnd,
    },
  });
  await completeTransaction(invoice, opts.txId ?? null, opts.raw);
  // Other checkouts the user opened and abandoned are no longer payable.
  await db.invoice.updateMany({ where: { userId: invoice.userId, status: "pending", id: { not: invoice.id } }, data: { status: "canceled" } });
  await syncUserPlan(invoice.userId);
  return paid;
}

/** Records the provider transaction behind a paid invoice (one row per provider tx id). */
async function completeTransaction(invoice: Invoice, txId: string | null, raw?: unknown) {
  const data = { state: "completed", amount: invoice.amount, error: null, ...(raw ? { raw: JSON.stringify(raw).slice(0, 8000) } : {}) };
  if (txId)
    return db.transaction.upsert({
      where: { provider_providerTxId: { provider: invoice.provider, providerTxId: txId } },
      update: data,
      create: { invoiceId: invoice.id, provider: invoice.provider, providerTxId: txId, ...data },
    });
  return db.transaction.create({ data: { invoiceId: invoice.id, provider: invoice.provider, ...data } });
}

/** UST-2026-000123: sequential per year, shown to the user and on the receipt. */
async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const last = await db.invoice.findFirst({ where: { number: { startsWith: `UST-${year}-` } }, orderBy: { number: "desc" }, select: { number: true } });
  const n = last ? Number(last.number.slice(-6)) : 0;
  return `UST-${year}-${String(n + 1).padStart(6, "0")}`;
}

/** Creates an invoice with the next number; retries when two requests take the same one. */
export async function newInvoice(data: Omit<Prisma.InvoiceUncheckedCreateInput, "number">) {
  for (let i = 0; ; i++) {
    try {
      return await db.invoice.create({ data: { ...data, number: await nextInvoiceNumber() } });
    } catch (e) {
      if (i >= 4) throw e;
    }
  }
}

export async function failInvoice(invoiceId: string, reason: string, txId?: string) {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status !== "pending") return invoice;
  const tx = { state: "failed", amount: invoice.amount, error: reason.slice(0, 200) };
  if (txId)
    await db.transaction.upsert({
      where: { provider_providerTxId: { provider: invoice.provider, providerTxId: txId } },
      update: tx,
      create: { invoiceId, provider: invoice.provider, providerTxId: txId, ...tx },
    });
  return db.invoice.update({ where: { id: invoiceId }, data: { status: "failed", failureReason: reason.slice(0, 200) } });
}

export async function createInvoice(
  user: Pick<User, "id">,
  opts: { tier: PaidTier; period: Period; provider: string; currency: Currency; saveCard?: boolean },
) {
  const q = await quote(user.id, opts.tier, opts.period, opts.currency);
  return newInvoice({
    userId: user.id,
    tier: q.tier,
    period: q.period,
    amount: q.amount,
    currency: q.currency,
    provider: opts.provider,
    kind: q.kind,
    saveCard: !!opts.saveCard,
  });
}

export async function startTrial(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { subscription: true } });
  if (!user) return { error: "not_found" as const };
  if (user.trialUsedAt) return { error: "used" as const };
  if (user.subscription && isLive(user.subscription)) return { error: "active" as const };
  const days = Number((await getAllSettings())["billing.trialDays"]) || 7;
  const now = new Date();
  const data = {
    tier: "PRO",
    period: 1,
    status: "trialing",
    provider: "trial",
    providerRef: null,
    currentPeriodStart: now,
    currentPeriodEnd: new Date(now.getTime() + days * DAY),
    cancelAtPeriodEnd: true,
    graceUntil: null,
    pendingTier: null,
    pendingPeriod: null,
  };
  await db.subscription.upsert({ where: { userId }, update: data, create: { userId, ...data } });
  await db.user.update({ where: { id: userId }, data: { trialUsedAt: now } });
  await syncUserPlan(userId);
  return { ok: true as const, days };
}

/** Stops auto-renewal; access stays until the end of the paid period. */
export async function setCancelAtPeriodEnd(userId: string, cancel: boolean) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub || !isLive(sub) || sub.status === "trialing") return null;
  return db.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: cancel } });
}

/** Downgrade (or period change) takes effect at the next renewal. */
export async function scheduleChange(userId: string, tier: PaidTier, period: Period) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub || !isLive(sub)) return null;
  const same = tier === sub.tier && period === sub.period;
  return db.subscription.update({
    where: { id: sub.id },
    data: { pendingTier: same ? null : tier, pendingPeriod: same ? null : period, cancelAtPeriodEnd: false },
  });
}

/** Admin: grant a plan for N days without payment. */
export async function grantPlan(userId: string, tier: PaidTier | "FREE", days: number) {
  if (tier === "FREE") {
    await db.subscription.updateMany({ where: { userId }, data: { status: "canceled", cancelAtPeriodEnd: false } });
    return syncUserPlan(userId);
  }
  const now = new Date();
  const data = {
    tier,
    period: Math.max(1, Math.round(days / 30)),
    status: "active",
    provider: "admin",
    providerRef: null,
    currentPeriodStart: now,
    currentPeriodEnd: new Date(now.getTime() + days * DAY),
    cancelAtPeriodEnd: true,
    graceUntil: null,
    pendingTier: null,
    pendingPeriod: null,
  };
  await db.subscription.upsert({ where: { userId }, update: data, create: { userId, ...data } });
  return syncUserPlan(userId);
}

/* ───────────── Renewal ───────────── */

/**
 * Brings one subscription up to date: renews with a saved card when the period is over,
 * moves to past_due with a grace period on failure, and expires it after that.
 * Cheap when nothing is due, so it runs on every request (see getCurrentUser).
 */
export async function reconcile(sub: Subscription, now = new Date()): Promise<Subscription> {
  if (sub.status === "expired" || sub.status === "canceled") return sub;
  const due = sub.currentPeriodEnd <= now;
  if (!due) return sub;

  const graceDays = Number((await getAllSettings())["billing.graceDays"]) || 3;
  const expire = () => db.subscription.update({ where: { id: sub.id }, data: { status: "expired", graceUntil: null } });

  if (sub.status === "trialing" || sub.cancelAtPeriodEnd) return expire();
  if (sub.status === "past_due" && sub.graceUntil && sub.graceUntil <= now) return expire();

  // One automatic charge attempt per day while in grace.
  const lastTry = await db.invoice.findFirst({
    where: { subscriptionId: sub.id, kind: "renewal", createdAt: { gt: new Date(now.getTime() - DAY) } },
    orderBy: { createdAt: "desc" },
  });
  if (!lastTry) {
    const method = sub.paymentMethodId ? await db.paymentMethod.findUnique({ where: { id: sub.paymentMethodId } }) : null;
    const provider = method ? await providerById(method.provider) : undefined;
    if (method && provider?.chargeToken) {
      const tier = (sub.pendingTier ?? sub.tier) as PaidTier;
      const period = (sub.pendingPeriod ?? sub.period) as Period;
      const invoice = await newInvoice({
        userId: sub.userId,
        subscriptionId: sub.id,
        tier,
        period,
        amount: await priceFor(tier, period),
        provider: provider.id,
        kind: "renewal",
      });
      const res = await provider.chargeToken(method, invoice);
      if (res.ok) {
        await applyPaidInvoice(invoice.id, { txId: res.txId });
        return (await db.subscription.findUnique({ where: { id: sub.id } }))!;
      }
      await failInvoice(invoice.id, res.reason, res.txId);
    }
  }

  if (sub.status === "past_due") return sub;
  return db.subscription.update({
    where: { id: sub.id },
    data: { status: "past_due", graceUntil: new Date(sub.currentPeriodEnd.getTime() + graceDays * DAY) },
  });
}

/** Reconciles the user's subscription and keeps User.plan in sync with it. */
export async function reconcileUser<U extends User & { subscription: Subscription | null }>(user: U): Promise<U> {
  let sub = user.subscription;
  if (sub) sub = await reconcile(sub);
  const plan = tierFromSubscription(sub);
  if (plan === user.plan && sub === user.subscription) return user;
  const synced = await syncUserPlan(user.id);
  return { ...user, ...(synced ?? {}), subscription: sub };
}

/** Batch renewal for a cron job or the admin button. */
export async function runRenewals(now = new Date()) {
  const due = await db.subscription.findMany({
    where: { status: { in: ["active", "trialing", "past_due"] }, currentPeriodEnd: { lte: now } },
  });
  const result = { checked: due.length, renewed: 0, pastDue: 0, expired: 0 };
  for (const sub of due) {
    const after = await reconcile(sub, now);
    if (after.status === "active" && after.currentPeriodEnd > now) result.renewed++;
    else if (after.status === "past_due") result.pastDue++;
    else if (after.status === "expired") result.expired++;
    await syncUserPlan(sub.userId);
  }
  return result;
}

export type { Invoice };
