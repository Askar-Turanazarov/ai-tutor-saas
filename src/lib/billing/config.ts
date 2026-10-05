import { getAllSettings } from "../settings";

export type PaymentProvider = "stripe" | "click";
export const PERIODS = [1, 3, 12] as const;
export type Period = (typeof PERIODS)[number];
export const isPeriod = (n: number): n is Period => (PERIODS as readonly number[]).includes(n);

const env = (k: string) => (process.env[k] || "").trim();

export const appUrl = () => env("APP_URL").replace(/\/$/, "") || "http://localhost:3000";

export const stripeKey = () => env("STRIPE_SECRET_KEY");
export const stripeWebhookSecret = () => env("STRIPE_WEBHOOK_SECRET");
export const stripeConfigured = () => stripeKey().length > 0;

/** "emulator" runs a built-in Click checkout (no merchant contract needed); "live" talks to Click itself (test merchant). */
export const clickMode = (): "emulator" | "live" => (env("CLICK_MODE") === "live" ? "live" : "emulator");

export function clickCreds() {
  return {
    serviceId: env("CLICK_SERVICE_ID") || "10001",
    merchantId: env("CLICK_MERCHANT_ID") || "20001",
    merchantUserId: env("CLICK_MERCHANT_USER_ID") || "30001",
    // The emulator needs some secret to sign with; a live merchant must set the real one.
    secretKey: env("CLICK_SECRET_KEY") || "click-emulator-secret",
  };
}

export const clickConfigured = () => clickMode() === "emulator" || env("CLICK_SECRET_KEY").length > 0;

export const fiscalProviderName = (): "mock-ofd" | "click-ofd" | "none" => {
  const v = env("FISCAL_PROVIDER");
  return v === "click-ofd" || v === "none" ? v : "mock-ofd";
};

export type BillingConfig = Awaited<ReturnType<typeof billingConfig>>;

/** Everything the checkout page needs: prices in sum and which providers can be offered. */
export async function billingConfig() {
  const s = await getAllSettings();
  const prices = Object.fromEntries(PERIODS.map((m) => [m, Math.max(1000, Number(s[`billing.price${m}`]) || 0)])) as Record<Period, number>;
  return {
    prices,
    noticeDays: Math.max(1, Number(s["billing.noticeDays"]) || 3),
    providers: {
      click: s["billing.clickEnabled"] === "true" && clickConfigured(),
      stripe: s["billing.stripeEnabled"] === "true" && stripeConfigured(),
    } as Record<PaymentProvider, boolean>,
    clickMode: clickMode(),
    fiscal: {
      mxik: s["billing.mxik"],
      packageCode: s["billing.packageCode"],
      vatPercent: Number(s["billing.vatPercent"]) || 0,
      sellerName: s["billing.sellerName"],
      sellerTin: s["billing.sellerTin"],
    },
  };
}

/** Saving against paying monthly, in whole percent. */
export const savingPercent = (prices: Record<Period, number>, m: Period) =>
  Math.max(0, Math.round((1 - prices[m] / (prices[1] * m)) * 100));

export function addMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}
