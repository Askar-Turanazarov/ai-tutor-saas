/**
 * Plans, billing periods and default prices/limits. Pure data: safe to import on the client.
 * Admin can override every number through Settings (see SETTING_DEFAULTS).
 */

export const TIERS = ["FREE", "PLUS", "PRO"] as const;
export type Tier = (typeof TIERS)[number];
export type PaidTier = Exclude<Tier, "FREE">;
export const PAID_TIERS: PaidTier[] = ["PLUS", "PRO"];

export const PERIODS = [1, 3, 12] as const;
export type Period = (typeof PERIODS)[number];

export type Currency = "UZS";

export const TIER_RANK: Record<Tier, number> = { FREE: 0, PLUS: 1, PRO: 2 };

export const tierLabel = (t: string) => (t === "PRO" ? "Pro" : t === "PLUS" ? "Plus" : "Free");

export const isPeriod = (n: number): n is Period => (PERIODS as readonly number[]).includes(n);
export const isPaidTier = (t: string): t is PaidTier => t === "PLUS" || t === "PRO";

/** Per-day/per-month quotas. null = unlimited, 0 = not included. */
export const LIMIT_KEYS = [
  "dailyMinutes",
  "lessonsPerDay",
  "reviewsPerDay",
  "missionsPerDay",
  "pronunciationPerDay",
  "streakFreezesPerMonth",
] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];

export const DEFAULT_LIMITS: Record<Tier, Record<LimitKey, number | null>> = {
  FREE: {
    dailyMinutes: 15,
    lessonsPerDay: 1,
    reviewsPerDay: 20,
    missionsPerDay: 0,
    pronunciationPerDay: 0,
    streakFreezesPerMonth: 0,
  },
  PLUS: {
    dailyMinutes: 60,
    lessonsPerDay: null,
    reviewsPerDay: null,
    missionsPerDay: 3,
    pronunciationPerDay: 10,
    streakFreezesPerMonth: 1,
  },
  PRO: {
    dailyMinutes: null,
    lessonsPerDay: null,
    reviewsPerDay: null,
    missionsPerDay: null,
    pronunciationPerDay: null,
    streakFreezesPerMonth: 2,
  },
};

/** Monthly list price in whole UZS (Stripe gets ×100). */
export const DEFAULT_PRICES: Record<PaidTier, number> = { PLUS: 49_000, PRO: 89_000 };

/** Discount in percent for longer periods. */
export const DEFAULT_DISCOUNTS: Record<Period, number> = { 1: 0, 3: 10, 12: 25 };

export const TRIAL_DAYS = 7;

/** Payment, reminder and fiscal-receipt settings (MXIK and package code are test values). */
export const BILLING_SETTINGS = {
  "billing.noticeDays": "3",
  "billing.stripeEnabled": "true",
  "billing.clickEnabled": "true",
  "billing.cardEnabled": "true",
  "billing.mxik": "10305008003000000",
  "billing.packageCode": "1545643",
  "billing.vatPercent": "12",
  "billing.sellerName": "Ustoz AI MChJ (test)",
  "billing.sellerTin": "300000000",
};
export const GRACE_DAYS = 3;

/** Setting key for a limit; stored as a number or "unlimited". */
export const limitSettingKey = (tier: Tier, key: LimitKey) => `limit.${tier}.${key}`;
export const priceSettingKey = (tier: PaidTier) => `price.${tier}.UZS`;
export const discountSettingKey = (p: Period) => `price.discount.${p}`;

export function billingDefaults(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tier of TIERS)
    for (const key of LIMIT_KEYS) {
      const v = DEFAULT_LIMITS[tier][key];
      out[limitSettingKey(tier, key)] = v === null ? "unlimited" : String(v);
    }
  for (const tier of PAID_TIERS) out[priceSettingKey(tier)] = String(DEFAULT_PRICES[tier]);
  for (const p of PERIODS) out[discountSettingKey(p)] = String(DEFAULT_DISCOUNTS[p]);
  out["billing.trialDays"] = String(TRIAL_DAYS);
  out["billing.graceDays"] = String(GRACE_DAYS);
  Object.assign(out, BILLING_SETTINGS);
  return out;
}

export function formatMoney(amount: number, currency: Currency | string = "UZS", locale = "ru") {
  const n = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU").format(amount);
  return `${n} ${currency !== "UZS" ? currency : locale === "en" ? "UZS" : locale === "uz" ? "soʻm" : "сум"}`;
}
