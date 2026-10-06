"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { createSession, getCurrentUser } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { setSetting, type SettingKey, SETTING_DEFAULTS } from "@/lib/settings";
import { tashkentDate } from "@/lib/time";
import { PROVIDERS, providerModels, resetBreakers } from "@/lib/ai/router";
import { tutorReply } from "@/lib/ai/tutor";
import { asLang, rebuildPlan } from "@/lib/learning";
import { LEVELS, type Level } from "@/lib/levels";
import { grantPlan, reconcile, syncUserPlan } from "@/lib/billing/subscription";
import { runBillingCycle } from "@/lib/billing/scheduler";
import { fiscalize } from "@/lib/billing/fiscal";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

const refresh = () => revalidatePath("/", "layout");

/** Grants a plan without payment for N days, or with no end date when days is 0 (FREE ends the subscription). */
export async function setUserPlan(userId: string, plan: "FREE" | "PLUS" | "PRO", days = 30) {
  await requireAdmin();
  await grantPlan(userId, plan, days);
  refresh();
}

/** Marks a paid invoice refunded; refunding the invoice behind the current period ends the plan. */
export async function refundInvoice(invoiceId: string) {
  await requireAdmin();
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status !== "paid") return;
  await db.invoice.update({ where: { id: invoiceId }, data: { status: "refunded" } });
  const latest = await db.invoice.findFirst({
    where: { subscriptionId: invoice.subscriptionId ?? "", status: { in: ["paid", "refunded"] } },
    orderBy: { paidAt: "desc" },
  });
  if (invoice.subscriptionId && latest?.id === invoice.id) {
    await db.subscription.update({ where: { id: invoice.subscriptionId }, data: { status: "expired", cancelAtPeriodEnd: false } });
    await syncUserPlan(invoice.userId);
  }
  refresh();
}

/**
 * Test helper: moves the subscription to the end of its period (or past the grace period)
 * and runs the same reconcile as a real request would.
 */
export async function timeTravel(userId: string, to: "periodEnd" | "graceEnd") {
  await requireAdmin();
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub) return;
  const now = Date.now();
  const shift = to === "graceEnd" && sub.graceUntil ? sub.graceUntil.getTime() - now + 60_000 : sub.currentPeriodEnd.getTime() - now + 60_000;
  const moved = await db.subscription.update({
    where: { id: sub.id },
    data: {
      currentPeriodStart: new Date(sub.currentPeriodStart.getTime() - shift),
      currentPeriodEnd: new Date(sub.currentPeriodEnd.getTime() - shift),
      graceUntil: sub.graceUntil ? new Date(sub.graceUntil.getTime() - shift) : null,
      // The last renewal attempt travels too, otherwise the retry pause would block the next try.
      lastRenewAttemptAt: sub.lastRenewAttemptAt ? new Date(sub.lastRenewAttemptAt.getTime() - shift) : null,
    },
  });
  await reconcile(moved);
  await syncUserPlan(userId);
  refresh();
}

export async function runRenewalsNow() {
  await requireAdmin();
  const res = await runBillingCycle();
  refresh();
  return res;
}

/**
 * Test helper: puts the end of a paid period N minutes from now (+2 days: reminder, +2 min: early
 * renewal, −1 min: ended), as if the period had just started over, then the billing cycle does the rest.
 */
export async function shiftSubscriptionEnd(userId: string, minutesFromNow: number) {
  await requireAdmin();
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub || !["active", "past_due", "trialing"].includes(sub.status)) return;
  const end = new Date(Date.now() + minutesFromNow * 60_000);
  await db.subscription.update({
    where: { id: sub.id },
    data: {
      currentPeriodEnd: end,
      currentPeriodStart: end < sub.currentPeriodStart ? new Date(end.getTime() - 30 * 86_400_000) : sub.currentPeriodStart,
      status: sub.status === "past_due" ? "active" : sub.status,
      graceUntil: null,
      notifiedSoonAt: null,
      notifiedEndAt: null,
      renewAttempts: 0,
      lastRenewAttemptAt: null,
    },
  });
  refresh();
}

export async function retryReceipt(receiptId: string) {
  await requireAdmin();
  await db.receipt.update({ where: { id: receiptId }, data: { attempts: 0 } });
  await fiscalize(receiptId);
  refresh();
}

export async function setUserLevel(userId: string, level: string) {
  await requireAdmin();
  if (!LEVELS.includes(level as Level)) return;
  await db.user.update({ where: { id: userId }, data: { level } });
  await rebuildPlan(userId);
  refresh();
}

export async function resetUserUsage(userId: string) {
  await requireAdmin();
  await db.dailyUsage.deleteMany({ where: { userId, date: tashkentDate() } });
  refresh();
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) return;
  await db.user.delete({ where: { id: userId } });
  refresh();
}

/** "Log in as": the session remembers the admin so they can come back in one click. */
export async function impersonate(userId: string) {
  const admin = await requireAdmin();
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return;
  await createSession(u.id, admin.id);
  redirect({ href: u.onboarded ? "/app" : "/onboarding", locale: await getLocale() });
}

export async function toggleTopicPro(topicId: string, proOnly: boolean) {
  await requireAdmin();
  await db.topic.update({ where: { id: topicId }, data: { proOnly } });
  refresh();
}

function cleanSetting(key: string, value: string) {
  if (!(key in SETTING_DEFAULTS)) return null;
  if (key.startsWith("limit.") && value !== "unlimited") return String(Math.max(0, Math.min(1000, Math.round(Number(value) || 0))));
  if (key.startsWith("price.discount.")) return String(Math.max(0, Math.min(90, Math.round(Number(value) || 0))));
  if (key.startsWith("price.")) return String(Math.max(0, Math.round(Number(value) || 0)));
  if (/^billing\.\w+Enabled$/.test(key)) return value === "true" ? "true" : "false";
  if (["billing.mxik", "billing.packageCode", "billing.sellerName", "billing.sellerTin"].includes(key)) return value.trim().slice(0, 120);
  if (key === "billing.vatPercent") return String(Math.max(0, Math.min(50, Math.round(Number(value) || 0))));
  if (key.startsWith("billing.")) return String(Math.max(0, Math.min(90, Math.round(Number(value) || 0))));
  return value;
}

export async function saveSetting(key: SettingKey, value: string) {
  await requireAdmin();
  const clean = cleanSetting(key, value);
  if (clean === null) return;
  await setSetting(key, clean);
  if (key.startsWith("ai.")) resetBreakers();
  refresh();
}

/** Plan limits and prices are saved together from one form. */
export async function saveSettings(entries: { key: string; value: string }[]) {
  await requireAdmin();
  for (const { key, value } of entries) {
    const clean = cleanSetting(key, value);
    if (clean !== null) await setSetting(key as SettingKey, clean);
  }
  refresh();
}

export async function toggleModel(id: string, enable: boolean) {
  await requireAdmin();
  const row = await db.setting.findUnique({ where: { key: "ai.disabledModels" } });
  const set = new Set((row?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  if (enable) set.delete(id);
  else set.add(id);
  await setSetting("ai.disabledModels", [...set].join(","));
  refresh();
}

export async function refreshModels() {
  await requireAdmin();
  resetBreakers();
  await Promise.all(PROVIDERS.filter((p) => p.isConfigured()).map((p) => providerModels(p, true)));
  refresh();
}

export async function pingAI(text: string) {
  const admin = await requireAdmin();
  const started = Date.now();
  const res = await tutorReply({
    userId: admin.id,
    history: [{ role: "user", content: text.slice(0, 500) || "I has a cat" }],
    level: "A2",
    lang: asLang(await getLocale()),
    pro: true,
  });
  refresh();
  return { ...res, ms: Date.now() - started };
}
