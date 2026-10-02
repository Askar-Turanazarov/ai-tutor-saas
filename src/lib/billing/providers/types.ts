import type { Invoice, PaymentMethod } from "@prisma/client";
import type { Currency } from "../catalog";

export type ProviderId = "card" | "click" | "stripe";

export type ChargeResult = { ok: true; txId: string } | { ok: false; reason: string };

export interface PaymentProvider {
  id: ProviderId;
  currency: Currency;
  /** Hidden from checkout when false (e.g. Stripe without keys). */
  enabled(): boolean;
  /** Where to send the user to pay a pending invoice. */
  createCheckout(invoice: Invoice, ctx: { locale: string; origin: string }): Promise<{ redirectUrl: string }>;
  /** Off-session charge with a saved card token (auto-renewal). */
  chargeToken?(method: PaymentMethod, invoice: Invoice): Promise<ChargeResult>;
  /** Called when a subscription is cancelled or resumed, for providers that bill on their own (Stripe). */
  setCancelAtPeriodEnd?(providerRef: string, cancel: boolean): Promise<void>;
}
