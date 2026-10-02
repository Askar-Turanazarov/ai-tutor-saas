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
import { grantPlan } from "@/lib/billing/subscription";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

const refresh = () => revalidatePath("/", "layout");

/** Grants a plan for 30 days without payment (or ends the subscription for FREE). */
export async function setUserPlan(userId: string, plan: "FREE" | "PLUS" | "PRO", days = 30) {
  await requireAdmin();
  await grantPlan(userId, plan, days);
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
  if (key.startsWith("limit.") && value !== "unlimited") value = String(Math.max(0, Math.min(1000, Math.round(Number(value) || 0))));
  if (key.startsWith("price.")) value = String(Math.max(0, Math.round(Number(value) || 0)));
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
