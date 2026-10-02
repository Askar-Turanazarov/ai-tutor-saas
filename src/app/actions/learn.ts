"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { touchStreak } from "@/lib/plans";
import { consumeQuota, limit } from "@/lib/billing/limits";
import { tashkentDate } from "@/lib/time";
import { completeLesson, lessonAccess, parseLesson, recordAnswers } from "@/lib/learning/progress";

async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error("unauthorized");
  return u;
}

async function findLesson(userId: string, slug: string) {
  const row = await db.lesson.findFirst({ where: { slug, OR: [{ ownerId: null }, { ownerId: userId }] } });
  return row ? parseLesson(row) : null;
}

/**
 * Opens a lesson for today. A new lesson takes one unit of the daily lesson quota;
 * resuming or repeating a lesson already started today is free.
 */
export async function startLesson(slug: string) {
  const user = await requireUser();
  const lesson = await findLesson(user.id, slug);
  if (!lesson) return { error: "not_found" as const };
  const access = lessonAccess(user, lesson);
  if (access !== "open") return { error: "locked" as const, access };
  const progress = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } } });
  const today = tashkentDate();
  if (!progress || tashkentDate(progress.updatedAt) !== today) {
    if (!(await consumeQuota(user, "lessonsPerDay")).ok) return { error: "quota" as const, limit: (await limit(user, "lessonsPerDay")) ?? 0 };
  }
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    update: { updatedAt: new Date() },
    create: { userId: user.id, lessonId: lesson.id, status: "started" },
  });
  return { ok: true as const };
}

const Answer = z.object({
  type: z.enum(["choice", "collocate", "dialogue", "gap", "order", "translate", "spot", "match", "listen", "speak"]),
  item: z.string().max(120).optional(),
  difficulty: z.number().int().min(0).max(2000),
  ok: z.boolean(),
  ms: z.number().int().min(0).max(600_000),
  hinted: z.boolean(),
  retry: z.boolean(),
  given: z.string().max(300).optional(),
  answer: z.string().max(300).optional(),
});

/** Practice results: skill ratings, chunk difficulty, SRS and the mistake bank. */
export async function reportPractice(input: { slug: string; answers: unknown }) {
  const user = await requireUser();
  const answers = z.array(Answer).max(60).safeParse(input.answers);
  if (!answers.success) return { ok: false };
  const lesson = await findLesson(user.id, input.slug);
  if (!lesson) return { ok: false };
  const known = new Set(lesson.itemIds);
  await recordAnswers(user, answers.data.map((a) => ({ ...a, item: a.item && known.has(a.item) ? a.item : undefined })));
  return { ok: true };
}

/** XP: 10 per correct answer, +20 for finishing, +15 for the mission; repeats give half. */
export async function finishLesson(input: { slug: string; correct: number; total: number; missionDone: boolean }) {
  const user = await requireUser();
  const lesson = await findLesson(user.id, input.slug);
  if (!lesson) return null;
  const total = Math.max(1, Math.min(input.total, 40));
  const correct = Math.max(0, Math.min(input.correct, total));
  const res = await completeLesson(user.id, lesson, { correct, total }, input.missionDone);
  let xp = correct * 10 + 20 + (input.missionDone ? 15 : 0);
  if (!res.firstTime) xp = Math.round(xp / 2);
  await db.user.update({ where: { id: user.id }, data: { xp: { increment: xp } } });
  await touchStreak(user);
  revalidatePath("/", "layout");
  return { ...res, xp };
}
