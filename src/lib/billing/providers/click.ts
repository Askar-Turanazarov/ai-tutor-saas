import { createHash } from "node:crypto";
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

export function clickConfig() {
  return {
    live: process.env.CLICK_MODE === "live",
    serviceId: process.env.CLICK_SERVICE_ID || "10000",
    merchantId: process.env.CLICK_MERCHANT_ID || "20000",
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
  const tx = await db.clickTransaction.upsert({
    where: { clickTransId: p.click_trans_id },
    update: {},
    create: { clickTransId: p.click_trans_id, invoiceId: res.invoice.id, amount: res.invoice.amount },
  });
  if (tx.status === "cancelled") return reply(p, "TRANSACTION_CANCELLED");
  return reply(p, "SUCCESS", { merchant_prepare_id: tx.id });
}

export async function clickComplete(p: ClickParams) {
  const tx = await db.clickTransaction.findUnique({ where: { clickTransId: p.click_trans_id ?? "" } });
  // A repeated Complete for an already confirmed payment is answered as success (idempotency).
  if (tx?.status === "completed" && String(tx.id) === p.merchant_prepare_id) {
    const cfg = clickConfig();
    if (clickSign(p, cfg.secretKey) === p.sign_string) return reply(p, "SUCCESS", { merchant_confirm_id: tx.id });
  }
  const res = await check(p, "1");
  if ("fail" in res) return res.fail;
  if (!tx || String(tx.id) !== p.merchant_prepare_id || tx.invoiceId !== res.invoice.id) return reply(p, "TRANSACTION_NOT_FOUND");
  if (tx.status === "cancelled") return reply(p, "TRANSACTION_CANCELLED");

  // Click reports a failed payment (e.g. -5017 insufficient funds) through a negative `error`.
  if (Number(p.error ?? 0) < 0) {
    await db.clickTransaction.update({ where: { id: tx.id }, data: { status: "cancelled" } });
    await failInvoice(res.invoice.id, p.error_note || `Click error ${p.error}`);
    return reply(p, "TRANSACTION_CANCELLED");
  }

  await db.clickTransaction.update({ where: { id: tx.id }, data: { status: "completed" } });
  await applyPaidInvoice(res.invoice.id, { txId: `click_${p.click_trans_id}` });
  return reply(p, "SUCCESS", { merchant_confirm_id: tx.id });
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

export const click: PaymentProvider = {
  id: "click",
  currency: "UZS",
  enabled: () => true,
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
