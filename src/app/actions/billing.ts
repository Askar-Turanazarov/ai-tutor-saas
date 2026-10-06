"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { randomInt } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { getCurrentUser, isGuest } from "@/lib/auth";
import { isPaidTier, isPeriod } from "@/lib/billing/catalog";
import { enabledProviders, getProvider } from "@/lib/billing/providers";
import {
  applyPaidInvoice,
  createInvoice,
  failInvoice,
  scheduleChange,
  setCancelAtPeriodEnd,
  startTrial,
} from "@/lib/billing/subscription";
import { declinesPayment, detectBrand, newCardToken, newTxId } from "@/lib/billing/providers/card-mock";
import { EMULATOR_CARDS, EMULATOR_SMS, cardTokenDelete, cardTokenRequest, cardTokenVerify, clickConfig, clickSign } from "@/lib/billing/providers/click";
import { detachCard } from "@/lib/billing/providers/stripe";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const refresh = () => revalidatePath("/", "layout");

/** Creates a pending invoice and returns where to pay it. */
export async function startCheckout(input: { tier: string; period: number; provider: string; saveCard?: boolean }) {
  const user = await requireUser();
  if (isGuest(user)) return { error: "guest" as const };
  if (!isPaidTier(input.tier) || !isPeriod(input.period)) return { error: "bad_request" as const };
  const provider = getProvider(input.provider);
  if (!provider || !(await enabledProviders()).includes(provider)) return { error: "provider" as const };

  const invoice = await createInvoice(user, {
    tier: input.tier,
    period: input.period,
    provider: provider.id,
    currency: "UZS",
    saveCard: input.saveCard,
  });
  try {
    const { redirectUrl } = await provider.createCheckout(invoice, { locale: await getLocale(), origin: await origin() });
    return { redirectUrl };
  } catch (e) {
    await failInvoice(invoice.id, (e as Error).message);
    return { error: "provider" as const };
  }
}

/** One-click payment with a saved card token: no gateway page, no SMS. */
export async function payWithSavedCard(input: { tier: string; period: number; methodId: string }) {
  const user = await requireUser();
  if (isGuest(user)) return { error: "guest" as const };
  if (!isPaidTier(input.tier) || !isPeriod(input.period)) return { error: "bad_request" as const };
  const method = await db.paymentMethod.findFirst({ where: { id: input.methodId, userId: user.id } });
  const provider = method && getProvider(method.provider);
  if (!method || !provider?.chargeToken) return { error: "provider" as const };
  const invoice = await createInvoice(user, { tier: input.tier, period: input.period, provider: provider.id, currency: "UZS", saveCard: true });
  const res = await provider.chargeToken(method, invoice);
  if (res.ok) await applyPaidInvoice(invoice.id, { txId: res.txId, paymentMethodId: method.id });
  else await failInvoice(invoice.id, res.reason, res.txId);
  refresh();
  return { invoiceId: invoice.id };
}

async function ownPendingInvoice(invoiceId: string) {
  const user = await requireUser();
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId: user.id } });
  return { user, invoice };
}

/* ───── Uzcard / HUMO emulator ───── */

/** Step 1: "send" the SMS code. Any 16-digit number with a future expiry date is accepted. */
export async function cardSendCode(input: { invoiceId: string; number: string; exp: string; saveCard: boolean }) {
  const { invoice } = await ownPendingInvoice(input.invoiceId);
  if (!invoice || invoice.status !== "pending") return { error: "invoice" as const };
  const digits = input.number.replace(/\D/g, "");
  if (digits.length !== 16) return { error: "number" as const };
  const m = /^(\d{2})\/?(\d{2})$/.exec(input.exp.trim());
  const month = m ? Number(m[1]) : 0;
  const year = m ? 2000 + Number(m[2]) : 0;
  const now = new Date();
  if (!m || month < 1 || month > 12 || year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
    return { error: "exp" as const };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const verifyId = await new SignJWT({ inv: invoice.id, last4: digits.slice(-4), brand: detectBrand(digits), month, year, save: !!input.saveCard })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(secret());
  // The emulator shows the code on screen instead of sending a real SMS.
  return { verifyId, code, phone: "+998 •• ••• •• 47" };
}

/** Step 2: confirm the code, tokenize the card (optionally save it) and charge. */
export async function cardConfirm(input: { verifyId: string; code: string }) {
  let claims: { inv: string; last4: string; brand: string; month: number; year: number; save: boolean };
  try {
    claims = (await jwtVerify(input.verifyId, secret())).payload as typeof claims;
  } catch {
    return { error: "expired" as const };
  }
  if (!/^\d{6}$/.test(input.code.trim())) return { error: "code" as const };
  const { user, invoice } = await ownPendingInvoice(claims.inv);
  if (!invoice || invoice.status !== "pending") return { error: "invoice" as const };

  if (declinesPayment(claims.last4)) {
    await failInvoice(invoice.id, "Insufficient funds");
    refresh();
    return { error: "declined" as const, invoiceId: invoice.id };
  }

  if (claims.save !== invoice.saveCard) await db.invoice.update({ where: { id: invoice.id }, data: { saveCard: claims.save } });
  const method = claims.save
    ? await db.paymentMethod.create({
        data: {
          userId: user.id,
          provider: "card",
          brand: claims.brand,
          last4: claims.last4,
          expMonth: claims.month,
          expYear: claims.year,
          token: newCardToken(),
        },
      })
    : null;
  await applyPaidInvoice(invoice.id, { txId: newTxId(), paymentMethodId: method?.id });
  refresh();
  return { ok: true as const, invoiceId: invoice.id };
}

/** The user closed the payment page. */
export async function cancelInvoice(invoiceId: string) {
  const { invoice } = await ownPendingInvoice(invoiceId);
  if (invoice?.status === "pending") await db.invoice.update({ where: { id: invoice.id }, data: { status: "canceled" } });
}

/* ───── Subscription management ───── */

export async function startTrialAction() {
  const user = await requireUser();
  if (isGuest(user)) return { error: "guest" as const };
  const res = await startTrial(user.id);
  refresh();
  return res;
}

export async function cancelSubscription() {
  const user = await requireUser();
  await setCancelAtPeriodEnd(user.id, true);
  refresh();
}

export async function resumeSubscription() {
  const user = await requireUser();
  await setCancelAtPeriodEnd(user.id, false);
  refresh();
}

/** Downgrade or period change from the next renewal. */
export async function scheduleDowngrade(input: { tier: string; period: number }) {
  const user = await requireUser();
  if (!isPaidTier(input.tier) || !isPeriod(input.period)) return;
  await scheduleChange(user.id, input.tier, input.period);
  refresh();
}

export async function removeCard(id: string) {
  const user = await requireUser();
  const card = await db.paymentMethod.findFirst({ where: { id, userId: user.id } });
  if (!card) return;
  if (card.provider === "stripe") await detachCard(card.token);
  if (card.provider === "click") await cardTokenDelete(card.token);
  await db.paymentMethod.delete({ where: { id: card.id } });
  refresh();
}

/* ───── Click emulator ───── */

/**
 * Plays Click's part: tokenizes a test card (SMS 666666), then sends the signed Prepare and
 * Complete requests to our own SHOP API endpoints over HTTP, exactly as my.click.uz would.
 */
export async function clickEmulatePay(input: { invoiceId: string; card: string; exp: string; sms: string; save: boolean }) {
  const { user, invoice } = await ownPendingInvoice(input.invoiceId);
  if (!invoice || invoice.status !== "pending" || invoice.provider !== "click") return { error: "invoice" as const };
  const cfg = clickConfig();
  if (cfg.live) return { error: "invoice" as const };
  const pan = input.card.replace(/\D/g, "");
  if (!EMULATOR_CARDS.some((c) => c.replace(/\s/g, "") === pan)) return { error: "card" as const };
  const m = /^(\d{2})\/?(\d{2})$/.exec(input.exp.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return { error: "exp" as const };
  if (input.sms.trim() !== EMULATOR_SMS) return { error: "code" as const };

  const declined = pan.endsWith("0002");
  let methodId: string | undefined;
  if (input.save && !declined) {
    const { token } = await cardTokenRequest(pan, input.exp);
    await cardTokenVerify(token, input.sms.trim(), pan);
    const method = await db.paymentMethod.create({
      data: { userId: user.id, provider: "click", brand: detectBrand(pan), last4: pan.slice(-4), expMonth: Number(m[1]), expYear: 2000 + Number(m[2]), token },
    });
    methodId = method.id;
  }
  if (input.save !== invoice.saveCard) await db.invoice.update({ where: { id: invoice.id }, data: { saveCard: input.save } });

  const base = await origin();
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date();
  const signTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const common = {
    click_trans_id: String(randomInt(1_000_000_000, 2_000_000_000)),
    service_id: cfg.serviceId,
    click_paydoc_id: String(randomInt(10_000_000, 99_999_999)),
    merchant_trans_id: invoice.id,
    amount: invoice.amount.toFixed(2),
    sign_time: signTime,
  };
  const call = async (path: string, p: Record<string, string>) => {
    const body = new URLSearchParams({ ...p, sign_string: clickSign(p, cfg.secretKey) });
    const res = await fetch(`${base}/api/payments/click/${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    return ((await res.json().catch(() => null)) ?? { error: -8, error_note: `HTTP ${res.status}` }) as {
      error: number;
      error_note: string;
      merchant_prepare_id?: number;
    };
  };

  const prepared = await call("prepare", { ...common, action: "0", error: "0", error_note: "Success" });
  if (prepared.error !== 0 || !prepared.merchant_prepare_id) return { error: "provider" as const, note: prepared.error_note };
  // A card without money: Click still calls Complete, with error -5017.
  const done = await call("complete", {
    ...common,
    action: "1",
    merchant_prepare_id: String(prepared.merchant_prepare_id),
    error: declined ? "-5017" : "0",
    error_note: declined ? "Insufficient funds" : "Success",
  });
  // The saved card becomes the one renewals are charged to.
  if (done.error === 0 && methodId) await db.subscription.updateMany({ where: { userId: user.id }, data: { paymentMethodId: methodId } });
  refresh();
  return { invoiceId: invoice.id };
}
