"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clickCreds, clickMode, isPeriod, type PaymentProvider } from "@/lib/billing/config";
import {
  EMULATOR_CARDS,
  EMULATOR_SMS,
  cardTokenRequest,
  cardTokenVerify,
  clickSign,
  tiyinToClickAmount,
} from "@/lib/billing/click";
import * as billing from "@/lib/billing/service";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthorized");
  return user;
}

const refresh = () => revalidatePath("/", "layout");

export async function startCheckout(input: { months: number; provider: PaymentProvider; autoRenew: boolean }) {
  const user = await requireUser();
  if (!isPeriod(input.months) || !["click", "stripe"].includes(input.provider)) return { error: "bad_request" };
  try {
    const url = await billing.startCheckout({ userId: user.id, months: input.months, provider: input.provider, autoRenew: !!input.autoRenew, locale: await getLocale() });
    return { url };
  } catch (e) {
    console.error("[billing] checkout:", e);
    const msg = (e as Error).message;
    return { error: msg === "lifetime_pro" || msg === "provider_unavailable" ? msg : "checkout_failed" };
  }
}

/** Polled by the return page until the provider has confirmed the payment. */
export async function invoiceStatus(invoiceId: string) {
  const user = await requireUser();
  let inv = await db.invoice.findFirst({ where: { id: invoiceId, userId: user.id } });
  if (!inv) return null;
  if (inv.status === "open" && inv.provider === "stripe") {
    await billing.syncStripeInvoice(inv.id).catch(() => {});
    inv = await db.invoice.findUniqueOrThrow({ where: { id: inv.id } });
  }
  const failed = await db.transaction.findFirst({ where: { invoiceId: inv.id, state: { in: ["failed", "canceled"] } }, orderBy: { updatedAt: "desc" } });
  return { status: inv.status, periodEnd: inv.periodEnd?.toISOString() ?? null, error: inv.status === "open" ? (failed?.error ?? null) : null };
}

/* ───────────── Click emulator (CLICK_MODE=emulator) ───────────── */

const signTime = () => new Date().toISOString().replace("T", " ").slice(0, 19);

async function selfOrigin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

/**
 * Plays Click's part: sends signed Prepare and Complete callbacks over HTTP to our own
 * /api/payments/click/* routes, exactly as Click's servers would.
 */
export async function clickEmulatorPay(input: { invoiceId: string; card: string; expire: string; sms: string; save: boolean }) {
  if (clickMode() !== "emulator") return { error: "emulator_off" };
  const user = await requireUser();
  const inv = await db.invoice.findFirst({ where: { id: input.invoiceId, userId: user.id, provider: "click" } });
  if (!inv) return { error: "not_found" };
  if (inv.status !== "open") return { error: inv.status === "paid" ? "already_paid" : "cancelled" };
  const pan = input.card.replace(/\D/g, "");
  if (!EMULATOR_CARDS.some((c) => c.replace(/\s/g, "") === pan)) return { error: "card_not_found" };
  if (!/^\d{2}\/?\d{2}$/.test(input.expire.trim())) return { error: "bad_expire" };
  if (input.sms.trim() !== EMULATOR_SMS) return { error: "bad_sms" };

  if (input.save) {
    const { token } = await cardTokenRequest(pan, input.expire);
    const { maskedPan } = await cardTokenVerify(token, EMULATOR_SMS);
    const card = await db.paymentCard.create({ data: { userId: user.id, provider: "click", token, maskedPan, brand: pan.startsWith("9860") ? "Humo" : "Uzcard", expire: input.expire } });
    await db.subscription.update({ where: { id: inv.subscriptionId }, data: { cardId: card.id } });
  }

  const origin = await selfOrigin();
  const { serviceId } = clickCreds();
  const base = {
    click_trans_id: String(randomInt(1_000_000_000, 2_000_000_000)),
    service_id: serviceId,
    click_paydoc_id: String(randomInt(10_000_000, 99_999_999)),
    merchant_trans_id: inv.id,
    amount: tiyinToClickAmount(inv.amount),
  };
  const post = async (path: string, p: Record<string, string>) => {
    const res = await fetch(`${origin}/api/payments/click/${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(p),
    });
    return (await res.json()) as { error: number; error_note: string; merchant_prepare_id?: number };
  };

  const prepare = { ...base, action: "0", error: "0", error_note: "Success", sign_time: signTime() };
  const r1 = await post("prepare", { ...prepare, sign_string: clickSign(prepare) });
  if (r1.error !== 0) return { error: `click_${r1.error}` };

  // A card ending in 0002 has no money: Click still calls Complete, with error -5017.
  const declined = pan.endsWith("0002");
  const complete = {
    ...base,
    merchant_prepare_id: String(r1.merchant_prepare_id),
    action: "1",
    error: declined ? "-5017" : "0",
    error_note: declined ? "Insufficient funds" : "Success",
    sign_time: signTime(),
  };
  const r2 = await post("complete", { ...complete, sign_string: clickSign(complete) });
  if (declined) return { error: "insufficient_funds" };
  if (r2.error !== 0) return { error: `click_${r2.error}` };
  refresh();
  return { ok: true };
}

/* ───────────── Subscription management ───────────── */

export async function setAutoRenew(on: boolean) {
  const user = await requireUser();
  const r = await billing.setAutoRenew(user.id, on);
  refresh();
  return r;
}

export async function removeCard(cardId: string) {
  const user = await requireUser();
  await billing.removeCard(user.id, cardId);
  refresh();
}

/** Binding a Click card for auto-renewal: step 1 sends an SMS code. */
export async function bindClickCardStart(card: string, expire: string) {
  await requireUser();
  try {
    return await cardTokenRequest(card, expire);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Step 2: verify the SMS code, save the card and turn auto-renewal on. */
export async function bindClickCardConfirm(token: string, sms: string, expire: string) {
  const user = await requireUser();
  try {
    const { maskedPan } = await cardTokenVerify(token, sms);
    const pan = maskedPan.replace(/\D/g, "");
    await db.paymentCard.create({
      data: { userId: user.id, provider: "click", token, maskedPan, brand: pan.startsWith("9860") ? "Humo" : "Uzcard", expire },
    });
    const sub = await billing.currentSubscription(user.id);
    if (sub?.provider === "click") await billing.setAutoRenew(user.id, true);
    refresh();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  refresh();
}
