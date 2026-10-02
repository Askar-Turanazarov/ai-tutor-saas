import { randomBytes } from "node:crypto";
import type { PaymentProvider } from "./types";

/**
 * Uzcard / HUMO through a payment aggregator — fully emulated.
 *
 * Real flow (Payme Subscribe API, Atmos, Click Card Token): the card number goes to the
 * aggregator, it sends an SMS code from the card's bank, after confirmation it returns a
 * card token. The merchant stores only the token and charges it (now and for renewals).
 * Here every step is local: any 16 digits work, any 6-digit code works.
 *
 * Test cards: ending in 0000 — declined; ending in 1111 — first payment OK,
 * automatic renewals declined (to try past_due and the grace period).
 */

export type CardBrand = "uzcard" | "humo" | "visa" | "mastercard";

export function detectBrand(number: string): CardBrand {
  const n = number.replace(/\D/g, "");
  if (n.startsWith("9860")) return "humo";
  if (n.startsWith("8600") || n.startsWith("5614")) return "uzcard";
  if (n.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  return "uzcard";
}

export const declinesPayment = (last4: string) => last4 === "0000";
export const declinesRecurring = (last4: string) => last4 === "1111" || last4 === "0000";

export const newCardToken = () => `tok_mock_${randomBytes(12).toString("hex")}`;
export const newTxId = () => `mock_${Date.now()}_${randomBytes(4).toString("hex")}`;

export const cardMock: PaymentProvider = {
  id: "card",
  currency: "UZS",
  enabled: () => true,
  async createCheckout(invoice, { locale }) {
    return { redirectUrl: `/${locale}/pay/card/${invoice.id}` };
  },
  async chargeToken(method) {
    // A short delay feels like a real processing round-trip in the admin "run renewals" button.
    await new Promise((r) => setTimeout(r, 150));
    if (declinesRecurring(method.last4)) return { ok: false, reason: "Recurring payment declined by the issuer" };
    return { ok: true, txId: newTxId() };
  },
};
