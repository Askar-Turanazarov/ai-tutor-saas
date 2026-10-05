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
import { adminSetPlan } from "@/lib/billing/service";
import { runBillingCycle } from "@/lib/billing/scheduler";
import { fiscalize } from "@/lib/billing/fiscal";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

const refresh = () => revalidatePath("/", "layout");

export async function setUserPlan(userId: string, plan: "FREE" | "PRO") {
  await requireAdmin();
  // Pro from an admin is lifetime (no end date); Free also stops a running subscription.
  await adminSetPlan(userId, plan);
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

export async function saveSetting(key: SettingKey, value: string) {
  await requireAdmin();
  if (!(key in SETTING_DEFAULTS)) return;
  if (key === "free.dailyMinutes") value = String(Math.max(1, Math.min(240, Math.round(Number(value) || 15))));
  if (/^billing\.price\d+$/.test(key)) value = String(Math.max(1000, Math.round(Number(value) || 0)));
  if (key === "billing.noticeDays") value = String(Math.max(1, Math.min(30, Math.round(Number(value) || 3))));
  if (key === "billing.vatPercent") value = String(Math.max(0, Math.min(100, Number(value) || 0)));
  await setSetting(key, value);
  if (key.startsWith("ai.")) resetBreakers();
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

/* ───────────── Billing ───────────── */

export async function runBillingNow() {
  await requireAdmin();
  const report = await runBillingCycle();
  refresh();
  return report;
}

/** Test helper: move the end of a paid period so reminders, renewals and expiry can be tried right away. */
export async function shiftSubscriptionEnd(subId: string, minutesFromNow: number) {
  await requireAdmin();
  const sub = await db.subscription.findUnique({ where: { id: subId } });
  if (!sub || !["active", "past_due"].includes(sub.status)) return;
  const end = new Date(Date.now() + minutesFromNow * 60_000);
  await db.subscription.update({
    where: { id: subId },
    data: { currentPeriodEnd: end, notifiedSoonAt: null, renewAttempts: 0, lastRenewAttemptAt: null },
  });
  await db.user.updateMany({ where: { id: sub.userId, plan: "PRO", proUntil: { not: null } }, data: { proUntil: end } });
  refresh();
}

export async function retryReceipt(receiptId: string) {
  await requireAdmin();
  await db.receipt.update({ where: { id: receiptId }, data: { attempts: 0 } });
  await fiscalize(receiptId);
  refresh();
}
