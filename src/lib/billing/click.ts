import { createHash, randomBytes } from "node:crypto";
import { appUrl, clickCreds, clickMode } from "./config";

/**
 * Click SHOP API (Prepare / Complete) and Merchant API (card tokens for auto-renewal).
 * https://docs.click.uz/click-api-request/ and https://docs.click.uz/merchant-api-request/
 */

export const CLICK_ERR = {
  OK: 0,
  SIGN: -1,
  AMOUNT: -2,
  ACTION: -3,
  ALREADY_PAID: -4,
  NOT_FOUND: -5,
  TX_NOT_FOUND: -6,
  UPDATE_FAILED: -7,
  BAD_REQUEST: -8,
  CANCELLED: -9,
} as const;

export type ClickParams = {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string;
  error: string;
  error_note?: string;
  sign_time: string;
  sign_string: string;
};

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

/** sign_string = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + [merchant_prepare_id] + amount + action + sign_time) */
export function clickSign(p: Omit<ClickParams, "sign_string" | "error">) {
  const { secretKey } = clickCreds();
  return md5(
    p.click_trans_id +
      p.service_id +
      secretKey +
      p.merchant_trans_id +
      (p.action === "1" ? (p.merchant_prepare_id ?? "") : "") +
      p.amount +
      p.action +
      p.sign_time,
  );
}

export function clickVerify(p: ClickParams) {
  if (p.service_id !== clickCreds().serviceId) return false;
  const expected = clickSign(p);
  return expected.length === p.sign_string?.length && expected === p.sign_string.toLowerCase();
}

/** Click sends amounts in sum with optional decimals ("79000" or "79000.00"). */
export const clickAmountToTiyin = (a: string) => Math.round(Number(a) * 100);
export const tiyinToClickAmount = (t: number) => (t / 100).toFixed(2);

export function clickPayUrl(invoiceId: string, amountTiyin: number, locale: string) {
  const back = `${appUrl()}/${locale}/app/billing/return?invoice=${invoiceId}`;
  if (clickMode() === "emulator") return `${appUrl()}/${locale}/pay/click/${invoiceId}`;
  const { serviceId, merchantId } = clickCreds();
  const q = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: tiyinToClickAmount(amountTiyin),
    transaction_param: invoiceId,
    return_url: back,
  });
  return `https://my.click.uz/services/pay?${q}`;
}

/* ───────────── Merchant API (card tokens) ───────────── */

const MERCHANT_API = "https://api.click.uz/v2/merchant";

function merchantAuth() {
  const { merchantUserId, secretKey } = clickCreds();
  const ts = Math.floor(Date.now() / 1000);
  const digest = createHash("sha1").update(`${ts}${secretKey}`).digest("hex");
  return `${merchantUserId}:${digest}:${ts}`;
}

async function merchant<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${MERCHANT_API}${path}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Auth: merchantAuth() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error_code?: number; error_note?: string };
  if (!res.ok || (data.error_code ?? 0) !== 0) throw new Error(`click ${path}: ${data.error_note ?? res.status}`);
  return data;
}

/** Card numbers accepted by the emulator. Ending in 0002 always declines (insufficient funds). */
export const EMULATOR_CARDS = ["8600 0000 0000 0001", "9860 0000 0000 0001", "8600 0000 0000 0002"];
export const EMULATOR_SMS = "666666";

const emuTokens = ((globalThis as unknown as { __clickEmu?: Map<string, { pan: string; verified: boolean }> }).__clickEmu ??= new Map());

export async function cardTokenRequest(cardNumber: string, expire: string) {
  const pan = cardNumber.replace(/\D/g, "");
  if (clickMode() === "emulator") {
    if (!EMULATOR_CARDS.some((c) => c.replace(/\s/g, "") === pan)) throw new Error("card_not_found");
    const token = `emu_${randomBytes(12).toString("hex")}`;
    emuTokens.set(token, { pan, verified: false });
    return { token, phone: "+998 ** *** 45 67" };
  }
  const r = await merchant<{ card_token: string; phone_number: string }>("/card_token/request", {
    service_id: Number(clickCreds().serviceId),
    card_number: pan,
    expire_date: expire.replace(/\D/g, ""),
    temporary: 0,
  });
  return { token: r.card_token, phone: r.phone_number };
}

export async function cardTokenVerify(token: string, smsCode: string) {
  if (clickMode() === "emulator") {
    const t = emuTokens.get(token);
    if (!t || smsCode !== EMULATOR_SMS) throw new Error("bad_sms_code");
    t.verified = true;
    return { maskedPan: `${t.pan.slice(0, 6)}******${t.pan.slice(-4)}` };
  }
  const r = await merchant<{ card_number: string }>("/card_token/verify", {
    service_id: Number(clickCreds().serviceId),
    card_token: token,
    sms_code: Number(smsCode),
  });
  return { maskedPan: r.card_number };
}

/** Charges a saved card. In emulator mode the card number ending decides the outcome. */
export async function cardTokenPayment(token: string, amountTiyin: number, invoiceId: string, maskedPan: string) {
  if (clickMode() === "emulator") {
    if (maskedPan.endsWith("0002")) throw new Error("insufficient_funds");
    return { paymentId: `emu_pay_${randomBytes(6).toString("hex")}` };
  }
  const r = await merchant<{ payment_id: number }>("/card_token/payment", {
    service_id: Number(clickCreds().serviceId),
    card_token: token,
    amount: Number(tiyinToClickAmount(amountTiyin)),
    transaction_parameter: invoiceId,
  });
  return { paymentId: String(r.payment_id) };
}

export async function cardTokenDelete(token: string) {
  if (clickMode() === "emulator") {
    emuTokens.delete(token);
    return;
  }
  const { serviceId } = clickCreds();
  await fetch(`${MERCHANT_API}/card_token/${serviceId}/${token}`, {
    method: "DELETE",
    headers: { Accept: "application/json", Auth: merchantAuth() },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => {});
}

/** Fiscal data for a Click payment (OFD). Click registers the receipt with the tax office itself. */
export async function submitFiscalItems(paymentId: string, items: object[], receivedCard: number) {
  return merchant<{ error_code: number }>("/payment/ofd_data/submit_items", {
    service_id: Number(clickCreds().serviceId),
    payment_id: Number(paymentId),
    items,
    received_ecash: 0,
    received_cash: 0,
    received_card: receivedCard,
  });
}
