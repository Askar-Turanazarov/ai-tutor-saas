import { createHash, randomBytes } from "node:crypto";
import { db } from "../../db";
import { applyPaidInvoice, failInvoice } from "../subscription";
import type { PaymentProvider } from "./types";

/**
 * Click SHOP API (https://docs.click.uz/click-api-request).
 *
 * The user pays on my.click.uz; Click then calls our two endpoints server-to-server:
 *   Prepare  (action=0) → we check the order and reserve it, answer merchant_prepare_id
 *   Complete (action=1) → we confirm the payment (or cancel it when Click sends error < 0)
 * Both requests are signed with md5 over the parameters and our SECRET_KEY.
 *
 * Without a merchant contract we run the emulator page /pay/click/[invoiceId], which sends
 * exactly these signed requests to our endpoints. With CLICK_MODE=live and real keys
 * the user is redirected to my.click.uz instead and nothing else changes.
 *
 * Auto-renewal uses the Merchant API card tokens (https://docs.click.uz/merchant-api-request):
 * request → SMS verify → payment by token. The emulator keeps the same three steps locally.
 */

export const CLICK_ERRORS = {
  SUCCESS: [0, "Success"],
  SIGN_CHECK_FAILED: [-1, "SIGN CHECK FAILED!"],
  INCORRECT_AMOUNT: [-2, "Incorrect parameter amount"],
  ACTION_NOT_FOUND: [-3, "Action not found"],
  ALREADY_PAID: [-4, "Already paid"],
  ORDER_NOT_FOUND: [-5, "User does not exist"],
  TRANSACTION_NOT_FOUND: [-6, "Transaction does not exist"],
  BAD_REQUEST: [-8, "Error in request from click"],
  TRANSACTION_CANCELLED: [-9, "Transaction cancelled"],
} as const;

type ErrorKey = keyof typeof CLICK_ERRORS;

/** CLICK_MODE=live talks to Click; anything else (emulator, the old "mock") runs the local emulator. */
export function clickConfig() {
  return {
    live: process.env.CLICK_MODE === "live",
    serviceId: process.env.CLICK_SERVICE_ID || "10000",
    merchantId: process.env.CLICK_MERCHANT_ID || "20000",
    merchantUserId: process.env.CLICK_MERCHANT_USER_ID || "30000",
    secretKey: process.env.CLICK_SECRET_KEY || "mock-click-secret-key",
  };
}

export type ClickParams = Record<string, string>;

export function clickSign(p: ClickParams, secretKey: string) {
  const parts = [p.click_trans_id, p.service_id, secretKey, p.merchant_trans_id];
  if (p.action === "1") parts.push(p.merchant_prepare_id);
  parts.push(p.amount, p.action, p.sign_time);
  return createHash("md5").update(parts.join("")).digest("hex");
}

const REQUIRED = ["click_trans_id", "service_id", "merchant_trans_id", "amount", "action", "sign_time", "sign_string"];

function reply(p: ClickParams, key: ErrorKey, extra: Record<string, unknown> = {}) {
  const [error, error_note] = CLICK_ERRORS[key];
  return { click_trans_id: p.click_trans_id, merchant_trans_id: p.merchant_trans_id, ...extra, error, error_note };
}

/** Shared checks for both actions. Returns an error reply, or the invoice when everything is fine. */
async function check(p: ClickParams, action: "0" | "1") {
  if (REQUIRED.some((k) => p[k] === undefined) || (action === "1" && p.merchant_prepare_id === undefined))
    return { fail: reply(p, "BAD_REQUEST") };
  if (p.action !== action) return { fail: reply(p, "ACTION_NOT_FOUND") };
  const cfg = clickConfig();
  if (p.service_id !== cfg.serviceId || clickSign(p, cfg.secretKey) !== p.sign_string) return { fail: reply(p, "SIGN_CHECK_FAILED") };
  const invoice = await db.invoice.findUnique({ where: { id: p.merchant_trans_id } });
  if (!invoice || invoice.provider !== "click") return { fail: reply(p, "ORDER_NOT_FOUND") };
  if (Math.abs(Number(p.amount) - invoice.amount) > 0.01) return { fail: reply(p, "INCORRECT_AMOUNT") };
  if (invoice.status === "paid") return { fail: reply(p, "ALREADY_PAID") };
  if (invoice.status !== "pending") return { fail: reply(p, "TRANSACTION_CANCELLED") };
  return { invoice };
}

export async function clickPrepare(p: ClickParams) {
  const res = await check(p, "0");
  if ("fail" in res) return res.fail;
  // Click may resend Prepare; answer with the same prepare id.
  const key = { provider: "click", providerTxId: p.click_trans_id };
  let tx = await db.transaction.findUnique({ where: { provider_providerTxId: key } });
  if (!tx) {
    const last = await db.transaction.aggregate({ _max: { clickPrepareId: true } });
    tx = await db.transaction.create({
      data: { ...key, invoiceId: res.invoice.id, amount: res.invoice.amount, state: "prepared", clickPrepareId: (last._max.clickPrepareId ?? 0) + 1, raw: JSON.stringify(p) },
    });
  }
  if (tx.state === "canceled" || tx.state === "failed") return reply(p, "TRANSACTION_CANCELLED");
  return reply(p, "SUCCESS", { merchant_prepare_id: tx.clickPrepareId });
}

export async function clickComplete(p: ClickParams) {
  const tx = p.click_trans_id ? await db.transaction.findUnique({ where: { provider_providerTxId: { provider: "click", providerTxId: p.click_trans_id } } }) : null;
  // A repeated Complete for a confirmed payment gets "already paid" (-4) from check(), as Click expects.
  const res = await check(p, "1");
  if ("fail" in res) return res.fail;
  if (!tx || String(tx.clickPrepareId) !== p.merchant_prepare_id || tx.invoiceId !== res.invoice.id) return reply(p, "TRANSACTION_NOT_FOUND");
  if (tx.state === "canceled" || tx.state === "failed") return reply(p, "TRANSACTION_CANCELLED");

  // Click reports a failed payment (e.g. -5017 insufficient funds) through a negative `error`.
  if (Number(p.error ?? 0) < 0) {
    await failInvoice(res.invoice.id, p.error_note || `Click error ${p.error}`, p.click_trans_id);
    return reply(p, "TRANSACTION_CANCELLED");
  }

  await applyPaidInvoice(res.invoice.id, { txId: p.click_trans_id, raw: p });
  return reply(p, "SUCCESS", { merchant_confirm_id: tx.clickPrepareId });
}

/** Reads a Click request body: form-urlencoded in production, JSON accepted for convenience. */
export async function readClickParams(req: Request): Promise<ClickParams> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v)]));
  }
  const form = new URLSearchParams(await req.text());
  return Object.fromEntries(form.entries());
}

/* ───────────── Merchant API: card tokens ───────────── */

const MERCHANT_API = "https://api.click.uz/v2/merchant";

function merchantAuth() {
  const { merchantUserId, secretKey } = clickConfig();
  const ts = Math.floor(Date.now() / 1000);
  return `${merchantUserId}:${createHash("sha1").update(`${ts}${secretKey}`).digest("hex")}:${ts}`;
}

async function merchant<T>(path: string, body: object, method = "POST"): Promise<T> {
  const res = await fetch(`${MERCHANT_API}${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", Auth: merchantAuth() },
    body: method === "POST" ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error_code?: number; error_note?: string };
  if (!res.ok || (data.error_code ?? 0) !== 0) throw new Error(data.error_note || `Click ${path}: HTTP ${res.status}`);
  return data;
}

/** Test cards of the emulator: …0001 pays, …0002 has no money (also on renewals). */
export const EMULATOR_CARDS = ["8600 0000 0000 0001", "9860 0000 0000 0001", "8600 0000 0000 0002"];
export const EMULATOR_SMS = "666666";
const emulatorDeclines = (last4: string) => last4 === "0002";

/** Step 1: Click sends an SMS code to the card owner and returns a not yet verified token. */
export async function cardTokenRequest(cardNumber: string, expire: string) {
  const pan = cardNumber.replace(/\D/g, "");
  const cfg = clickConfig();
  if (!cfg.live) {
    if (!EMULATOR_CARDS.some((c) => c.replace(/\s/g, "") === pan)) throw new Error("card_not_found");
    return { token: `emu_${randomBytes(12).toString("hex")}`, phone: "+998 •• ••• 45 67" };
  }
  const r = await merchant<{ card_token: string; phone_number: string }>("/card_token/request", {
    service_id: Number(cfg.serviceId),
    card_number: pan,
    expire_date: expire.replace(/\D/g, ""),
    temporary: 0,
  });
  return { token: r.card_token, phone: r.phone_number };
}

/** Step 2: the SMS code makes the token chargeable. Returns the masked card number. */
export async function cardTokenVerify(token: string, smsCode: string, pan = "") {
  const cfg = clickConfig();
  if (!cfg.live) {
    if (smsCode !== EMULATOR_SMS) throw new Error("bad_sms");
    return { maskedPan: `${pan.slice(0, 6)}******${pan.slice(-4)}` };
  }
  const r = await merchant<{ card_number: string }>("/card_token/verify", { service_id: Number(cfg.serviceId), card_token: token, sms_code: Number(smsCode) });
  return { maskedPan: r.card_number };
}

/** Registers the fiscal receipt of a Click payment with the OFD (live mode only); amounts in tiyin. */
export async function submitFiscalItems(paymentId: string, items: object[], receivedCard: number) {
  return merchant<{ error_code: number }>("/payment/ofd_data/submit_items", {
    service_id: Number(clickConfig().serviceId),
    payment_id: Number(paymentId),
    items,
    received_ecash: 0,
    received_cash: 0,
    received_card: receivedCard,
  });
}

export async function cardTokenDelete(token: string) {
  const cfg = clickConfig();
  if (!cfg.live) return;
  await merchant(`/card_token/${cfg.serviceId}/${token}`, {}, "DELETE").catch(() => null);
}

export const click: PaymentProvider = {
  id: "click",
  currency: "UZS",
  enabled: () => true,

  /** Auto-renewal by a verified card token. */
  async chargeToken(method, invoice) {
    const cfg = clickConfig();
    if (!cfg.live) {
      await new Promise((r) => setTimeout(r, 150));
      if (emulatorDeclines(method.last4)) return { ok: false, reason: "Insufficient funds (-5017)" };
      return { ok: true, txId: `emu_pay_${randomBytes(6).toString("hex")}` };
    }
    try {
      const r = await merchant<{ payment_id: number }>("/card_token/payment", {
        service_id: Number(cfg.serviceId),
        card_token: method.token,
        amount: invoice.amount,
        transaction_parameter: invoice.id,
      });
      return { ok: true, txId: String(r.payment_id) };
    } catch (e) {
      return { ok: false, reason: (e as Error).message };
    }
  },

  async createCheckout(invoice, { locale, origin }) {
    const cfg = clickConfig();
    if (!cfg.live) return { redirectUrl: `/${locale}/pay/click/${invoice.id}` };
    const url = new URL("https://my.click.uz/services/pay");
    url.searchParams.set("service_id", cfg.serviceId);
    url.searchParams.set("merchant_id", cfg.merchantId);
    url.searchParams.set("amount", invoice.amount.toFixed(2));
    url.searchParams.set("transaction_param", invoice.id);
    url.searchParams.set("return_url", `${origin}/${locale}/app/billing/${invoice.id}`);
    return { redirectUrl: url.toString() };
  },
};
