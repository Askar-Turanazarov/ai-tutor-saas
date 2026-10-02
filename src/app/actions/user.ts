"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { LEVELS, type Level } from "@/lib/levels";
import { canAccessLevel, canAccessTopic, isPro, remainingSeconds, touchStreak } from "@/lib/plans";
import { PLACEMENT, levelFromScore } from "@/lib/content/placement";
import { asLang, completeUnit, ensurePlan, randomPhrase, rebuildPlan, topicTitle } from "@/lib/learning";
import { generateQuiz, pronunciationFeedback } from "@/lib/ai/tutor";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale: await getLocale() });
  return user!;
}

export async function saveLocale(locale: string) {
  const user = await getCurrentUser();
  if (user && ["ru", "en", "uz"].includes(locale)) await db.user.update({ where: { id: user.id }, data: { locale } });
}

export async function completeOnboarding(input: { goal: string; answers: (number | null)[] }) {
  const user = await requireUser();
  const correct = input.answers.filter((a, i) => a !== null && a === PLACEMENT[i]?.answer).length;
  const measured = levelFromScore(correct);
  const level: Level = canAccessLevel(user, measured) ? measured : "A2";
  await db.user.update({ where: { id: user.id }, data: { goal: input.goal, level, onboarded: true } });
  return { measured, level };
}

export async function updateProfile(input: { name: string; level: string }) {
  const user = await requireUser();
  const level = LEVELS.includes(input.level as Level) && canAccessLevel(user, input.level) ? input.level : user.level;
  const name = input.name.trim().slice(0, 60) || user.name;
  await db.user.update({ where: { id: user.id }, data: { name, level } });
  if (level !== user.level) await rebuildPlan(user.id);
  revalidatePath("/", "layout");
}

export async function requestUpgrade() {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { upgradeRequested: true } });
}

export async function startConversation(topicSlug: string | null) {
  const user = await requireUser();
  const locale = await getLocale();
  const topic = topicSlug ? await db.topic.findUnique({ where: { slug: topicSlug } }) : null;
  if (topic && !canAccessTopic(user, topic)) redirect({ href: "/app/upgrade", locale });
  const conv = await db.conversation.create({
    data: {
      userId: user.id,
      topicSlug: topic?.slug,
      title: topic ? topicTitle(topic, locale) : "",
      messages: topic ? { create: { role: "assistant", content: topic.starter } } : undefined,
    },
  });
  redirect({ href: `/app/chat?c=${conv.id}`, locale });
}

export async function deleteConversation(id: string) {
  const user = await requireUser();
  await db.conversation.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/[locale]/app/chat", "page");
}

/** Creates a quiz for a plan unit (Pro) and returns its id. */
export async function createQuiz(unitId: string) {
  const user = await requireUser();
  if (!isPro(user)) return { error: "pro" as const };
  const unit = await db.planUnit.findFirst({ where: { id: unitId, userId: user.id } });
  if (!unit || unit.status === "locked") return { error: "locked" as const };
  const topic = await db.topic.findUnique({ where: { slug: unit.topicSlug } });
  const locale = await getLocale();
  const mistakes = await db.mistake.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { original: true, corrected: true, category: true },
  });
  const level = unit.level as Level;
  const res = await generateQuiz({
    userId: user.id,
    level,
    lang: asLang(locale),
    pro: true,
    topicTitle: topic ? topicTitle(topic, locale) : unit.topicSlug,
    mistakes,
    speakText: randomPhrase(level),
  });
  const quiz = await db.quiz.create({
    data: {
      userId: user.id,
      unitId: unit.id,
      title: res.data.title,
      level,
      questions: JSON.stringify(res.data.questions),
      source: `${res.provider}/${res.model}`,
    },
  });
  return { id: quiz.id };
}

export async function submitQuiz(input: { quizId: string; score: number; total: number }) {
  const user = await requireUser();
  const quiz = await db.quiz.findFirst({ where: { id: input.quizId, userId: user.id } });
  if (!quiz) return { xp: 0 };
  const total = Math.max(1, Math.min(input.total, 20));
  const score = Math.max(0, Math.min(input.score, total));
  const xp = score * 10 + (score === total ? 20 : 0);
  await db.quizAttempt.create({ data: { quizId: quiz.id, userId: user.id, score, total, xp } });
  await db.user.update({ where: { id: user.id }, data: { xp: { increment: xp } } });
  await touchStreak(user);
  if (quiz.unitId) await completeUnit(quiz.unitId, score / total);
  revalidatePath("/", "layout");
  return { xp };
}

export async function pronunciationCheck(input: { target: string; heard: string }) {
  const user = await requireUser();
  if (!isPro(user)) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/).filter(Boolean);
  const target = norm(input.target);
  const heard = new Set(norm(input.heard));
  const words = target.map((w) => ({ word: w, ok: heard.has(w) }));
  const missed = words.filter((w) => !w.ok).map((w) => w.word);
  const score = Math.round((100 * (target.length - missed.length)) / Math.max(1, target.length));
  const res = await pronunciationFeedback({
    userId: user.id,
    target: input.target,
    heard: input.heard,
    missed,
    score,
    lang: asLang(await getLocale()),
  });
  if (score >= 60) {
    await db.user.update({ where: { id: user.id }, data: { xp: { increment: 5 } } });
    await touchStreak(user);
  }
  return { words, score, ...res.data };
}

export async function nextPhrase(exclude?: string) {
  const user = await requireUser();
  return randomPhrase(user.level as Level, exclude);
}

export async function getRemaining() {
  const user = await requireUser();
  return remainingSeconds(user);
}

export async function getPlan() {
  const user = await requireUser();
  return ensurePlan(user);
}
