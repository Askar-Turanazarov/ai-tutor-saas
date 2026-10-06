import "server-only";
import type { PaymentMethod, Subscription } from "@prisma/client";
import { db } from "../db";
import { getAllSettings } from "../settings";
import { LIMIT_KEYS, PAID_TIERS, PERIODS, TIERS, discountSettingKey, limitSettingKey, type LimitKey, type PaidTier, type Period, type Tier } from "./catalog";
import { enabledProviders } from "./providers";
import { clickConfig } from "./providers/click";
import { isLive, priceFor, quote, tierFromSubscription } from "./subscription";

/** Plain, serialisable views of the billing state for client components. */

export type SubView = {
  tier: string;
  period: number;
  status: string;
  provider: string;
  live: boolean;
  periodStart: string;
  periodEnd: string;
  graceUntil: string | null;
  cancelAtPeriodEnd: boolean;
  pendingTier: string | null;
  pendingPeriod: number | null;
  method: CardView | null;
};

export type CardView = { id: string; brand: string; last4: string; exp: string; provider: string };

export type QuoteView = { kind: "new" | "renewal" | "upgrade"; amount: number; list: number; period: number; until: string | null };

export type PlansData = {
  tier: Tier;
  sub: SubView | null;
  trial: { available: boolean; days: number };
  limits: Record<Tier, Record<LimitKey, number | null>>;
  discounts: Record<Period, number>;
  /** Monthly-equivalent price and total in UZS, per tier and period. */
  prices: Record<PaidTier, Record<Period, { total: number; monthly: number }>>;
  /** What a checkout would charge right now (upgrade proration, renewal…). */
  quotes: Record<PaidTier, Record<Period, QuoteView>>;
  providers: string[];
  /** Checkouts that can save the card for auto-renewal. */
  savesCard: string[];
  cards: CardView[];
};

const parse = (v: string | undefined) => (v === undefined || v === "unlimited" || v === "" ? null : Math.max(0, Number(v) || 0));

export const cardView = (m: PaymentMethod): CardView => ({
  id: m.id,
  brand: m.brand,
  last4: m.last4,
  exp: `${String(m.expMonth).padStart(2, "0")}/${String(m.expYear).slice(-2)}`,
  provider: m.provider,
});

export function subView(sub: Subscription & { paymentMethod?: PaymentMethod | null }): SubView {
  return {
    tier: sub.tier,
    period: sub.period,
    status: sub.status,
    provider: sub.provider,
    live: isLive(sub),
    periodStart: sub.currentPeriodStart.toISOString(),
    periodEnd: sub.currentPeriodEnd.toISOString(),
    graceUntil: sub.graceUntil?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    pendingTier: sub.pendingTier,
    pendingPeriod: sub.pendingPeriod,
    method: sub.paymentMethod ? cardView(sub.paymentMethod) : null,
  };
}

export async function plansData(user: { id: string; trialUsedAt: Date | null }): Promise<PlansData> {
  const [s, sub, cards] = await Promise.all([
    getAllSettings(),
    db.subscription.findUnique({ where: { userId: user.id }, include: { paymentMethod: true } }),
    db.paymentMethod.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const limits = Object.fromEntries(
    TIERS.map((t) => [t, Object.fromEntries(LIMIT_KEYS.map((k) => [k, parse(s[limitSettingKey(t, k)])]))]),
  ) as PlansData["limits"];
  const discounts = Object.fromEntries(PERIODS.map((p) => [p, Number(s[discountSettingKey(p)]) || 0])) as PlansData["discounts"];

  const prices = {} as PlansData["prices"];
  const quotes = {} as PlansData["quotes"];
  for (const tier of PAID_TIERS) {
    prices[tier] = {} as PlansData["prices"][PaidTier];
    quotes[tier] = {} as PlansData["quotes"][PaidTier];
    for (const period of PERIODS) {
      const total = await priceFor(tier, period);
      prices[tier][period] = { total, monthly: Math.round(total / period / 1000) * 1000 };
      const q = await quote(user.id, tier, period, "UZS");
      quotes[tier][period] = { kind: q.kind, amount: q.amount, list: q.list, period: q.period, until: q.until?.toISOString() ?? null };
    }
  }

  return {
    tier: tierFromSubscription(sub),
    sub: sub ? subView(sub) : null,
    trial: { available: !user.trialUsedAt && !(sub && isLive(sub)), days: Number(s["billing.trialDays"]) || 7 },
    limits,
    discounts,
    prices,
    quotes,
    providers: (await enabledProviders()).map((p) => p.id),
    // Live Click pays on my.click.uz, which doesn't hand out card tokens; the emulator does.
    savesCard: ["card", "stripe", ...(clickConfig().live ? [] : ["click"])],
    cards: cards.map(cardView),
  };
}

export type InvoiceView = {
  id: string;
  tier: string;
  period: number;
  amount: number;
  currency: string;
  provider: string;
  kind: string;
  status: string;
  date: string;
  reason: string | null;
};

export async function billingData(userId: string) {
  const [sub, cards, invoices] = await Promise.all([
    db.subscription.findUnique({ where: { userId }, include: { paymentMethod: true } }),
    db.paymentMethod.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.invoice.findMany({ where: { userId, status: { not: "pending" } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  // The next automatic charge: the price of the plan that will be active after renewal.
  let next: { amount: number; currency: string; date: string } | null = null;
  if (sub && isLive(sub) && sub.status !== "trialing" && !sub.cancelAtPeriodEnd && sub.provider !== "admin") {
    const tier = (sub.pendingTier ?? sub.tier) as PaidTier;
    const period = (sub.pendingPeriod ?? sub.period) as Period;
    if (sub.paymentMethodId) next = { amount: await priceFor(tier, period), currency: "UZS", date: sub.currentPeriodEnd.toISOString() };
  }
  return {
    tier: tierFromSubscription(sub),
    sub: sub ? subView(sub) : null,
    next,
    cards: cards.map(cardView),
    invoices: invoices.map(
      (i): InvoiceView => ({
        id: i.id,
        tier: i.tier,
        period: i.period,
        amount: i.amount,
        currency: i.currency,
        provider: i.provider,
        kind: i.kind,
        status: i.status,
        date: (i.paidAt ?? i.createdAt).toISOString(),
        reason: i.failureReason,
      }),
    ),
  };
}

export type BillingData = Awaited<ReturnType<typeof billingData>>;
