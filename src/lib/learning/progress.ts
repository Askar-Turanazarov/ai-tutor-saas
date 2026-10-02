import "server-only";
import { db } from "../db";
import { levelRating, type Exercise, type L3, type Mission } from "../content/types";
import { canAccessLevel, atLeast } from "../billing/entitlements";
import type { Tier } from "../billing/catalog";
import { pickSession, update } from "./adaptive";
import { gradeAnswer, isLeech, newCard, schedule } from "./srs";
import { derivedExercises, exerciseDifficulty, type ItemInfo, type RunExercise } from "./exercises";

export type Area = "vocab" | "grammar" | "listening" | "speaking";

const AREA: Record<Exercise["type"], Area> = {
  choice: "vocab",
  collocate: "vocab",
  match: "vocab",
  dialogue: "vocab",
  gap: "grammar",
  order: "grammar",
  translate: "grammar",
  spot: "grammar",
  listen: "listening",
  speak: "speaking",
};

const DAY = 86_400_000;

/** Skill ratings, created on first use from the learner's CEFR level. */
export async function skills(user: { id: string; level: string }): Promise<Record<Area, number>> {
  const rows = await db.skill.findMany({ where: { userId: user.id } });
  const base = levelRating(user.level);
  const out = { vocab: base, grammar: base, listening: base, speaking: base };
  for (const r of rows) out[r.area as Area] = r.rating;
  return out;
}

export const overallRating = (s: Record<Area, number>) => Math.round((s.vocab * 2 + s.grammar * 2 + s.listening + s.speaking) / 6);

/* ───────────── Lessons ───────────── */

export type LessonRow = Awaited<ReturnType<typeof db.lesson.findFirst>> & {};

export function parseLesson(l: NonNullable<LessonRow>) {
  return {
    ...l,
    situation: JSON.parse(l.situation) as L3,
    canDo: JSON.parse(l.canDo) as L3,
    itemIds: JSON.parse(l.itemIds) as string[],
    exercises: JSON.parse(l.exercises) as Exercise[],
    mission: JSON.parse(l.mission) as Mission,
  };
}

export type LessonAccess = "open" | "level" | "tier";

export function lessonAccess(user: { plan: string }, l: { level: string; minTier: string }): LessonAccess {
  if (!atLeast(user, l.minTier as Tier)) return "tier";
  if (!canAccessLevel(user, l.level)) return "level";
  return "open";
}

export async function lessonItems(ids: string[]): Promise<ItemInfo[]> {
  const rows = await db.lexicalItem.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({
      id: r.id,
      chunk: r.chunk,
      kind: r.kind as ItemInfo["kind"],
      meaning: { ru: r.meaningRu, en: r.meaningEn, uz: r.meaningUz },
      examples: JSON.parse(r.examples),
      anti: JSON.parse(r.antiExamples),
      difficulty: r.difficulty,
    }));
}

/**
 * The practice part of a lesson, chosen for this learner: all hand-written and derived
 * exercises rated by chunk difficulty, then ~12 picked around the learner's rating (i+1).
 */
export function lessonSession(lesson: { slug: string; difficulty: number; exercises: Exercise[] }, items: ItemInfo[], rating: number, speaking: boolean, n = 12): RunExercise[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const all = [...lesson.exercises, ...derivedExercises(items, { speaking })];
  const pool = all.map((ex, i) => {
    const item = "item" in ex ? ex.item : undefined;
    const base = (item && byId.get(item)?.difficulty) || lesson.difficulty;
    return { id: `${lesson.slug}#${i}`, key: `${lesson.slug}#${i}`, ex, item, difficulty: exerciseDifficulty(ex, base) };
  });
  // Matching is a gentle warm-up: keep it first when it's picked.
  const picked = pickSession(pool, rating, Math.min(n, pool.length));
  return [...picked.filter((p) => p.ex.type === "match"), ...picked.filter((p) => p.ex.type !== "match")];
}

/* ───────────── Answers ───────────── */

export type AnswerIn = { type: Exercise["type"]; item?: string; difficulty: number; ok: boolean; ms: number; hinted: boolean; retry: boolean; given?: string; answer?: string };

/**
 * Applies a batch of answers: Elo for the learner's skills and the chunks' difficulty,
 * SRS for chunks that already have a review card, and wrong answers into the mistake bank.
 */
export async function recordAnswers(user: { id: string; level: string }, answers: AnswerIn[], source: "exercise" | "review" = "exercise") {
  const s = await skills(user);
  const itemDelta = new Map<string, number>();
  for (const a of answers) {
    if (a.retry) continue;
    const area = AREA[a.type];
    const r = update(s[area], a.difficulty, a.ok);
    s[area] = r.rating;
    if (a.item) itemDelta.set(a.item, (itemDelta.get(a.item) ?? 0) + (r.difficulty - a.difficulty));
  }
  await Promise.all(
    (Object.keys(s) as Area[]).map((area) =>
      db.skill.upsert({ where: { userId_area: { userId: user.id, area } }, update: { rating: s[area] }, create: { userId: user.id, area, rating: s[area] } }),
    ),
  );
  for (const [id, d] of itemDelta) if (d) await db.lexicalItem.updateMany({ where: { id }, data: { difficulty: { increment: d } } });

  // Spaced repetition for chunks the learner already studies.
  const ids = [...new Set(answers.filter((a) => a.item && !a.retry).map((a) => a.item!))];
  const cards = await db.reviewCard.findMany({ where: { userId: user.id, itemId: { in: ids } } });
  for (const c of cards) {
    const mine = answers.filter((a) => a.item === c.itemId && !a.retry);
    let state = { intervalDays: c.intervalDays, ease: c.ease, reps: c.reps, lapses: c.lapses, avgMs: c.avgMs };
    let next = null as ReturnType<typeof schedule> | null;
    for (const a of mine) {
      next = schedule(state, gradeAnswer({ correct: a.ok, ms: a.ms, hinted: a.hinted, answerLength: a.answer?.length }), a.ms);
      state = next;
    }
    if (next) await db.reviewCard.update({ where: { id: c.id }, data: { ...next } });
    if (next && isLeech(next) && !isLeech(c)) await leechToMistakes(user.id, c.itemId);
  }

  const wrong = answers.filter((a) => !a.ok && !a.retry && a.given && a.answer && a.type !== "speak");
  for (const a of wrong.slice(0, 5)) await addMistake(user.id, { original: a.given!, corrected: a.answer!, category: AREA[a.type] === "vocab" ? "vocabulary" : "grammar", explanation: "", itemId: a.item, source });
  return s;
}

export async function addMistake(userId: string, m: { original: string; corrected: string; category: string; explanation: string; itemId?: string; source: string }) {
  const same = await db.mistake.findFirst({ where: { userId, corrected: m.corrected, resolvedAt: null } });
  if (same) return db.mistake.update({ where: { id: same.id }, data: { hits: { increment: 1 }, original: m.original, streak: 0 } });
  return db.mistake.create({ data: { userId, ...m } });
}

async function leechToMistakes(userId: string, itemId: string) {
  const it = await db.lexicalItem.findUnique({ where: { id: itemId } });
  const anti = it ? (JSON.parse(it.antiExamples) as { wrong: string; right: string }[])[0] : undefined;
  if (it) await addMistake(userId, { original: anti?.wrong ?? "?", corrected: it.chunk, category: "vocabulary", explanation: it.meaningEn, itemId, source: "review" });
}

/* ───────────── Completion ───────────── */

export const starsFor = (ratio: number) => (ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : 1);

/** Marks the lesson done, adds its chunks to the learner's review deck and returns what was earned. */
export async function completeLesson(userId: string, lesson: { id: string; itemIds: string[] }, score: { correct: number; total: number }, missionDone: boolean) {
  const ratio = score.correct / Math.max(1, score.total);
  const stars = starsFor(ratio);
  const percent = Math.round(ratio * 100);
  const prev = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: lesson.id } } });
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    update: { status: "done", stars: Math.max(stars, prev?.stars ?? 0), bestScore: Math.max(percent, prev?.bestScore ?? 0), missionDone: missionDone || !!prev?.missionDone, completedAt: prev?.completedAt ?? new Date() },
    create: { userId, lessonId: lesson.id, status: "done", stars, bestScore: percent, missionDone, completedAt: new Date() },
  });
  const existing = new Set((await db.reviewCard.findMany({ where: { userId, itemId: { in: lesson.itemIds } }, select: { itemId: true } })).map((c) => c.itemId));
  const fresh = lesson.itemIds.filter((id) => !existing.has(id));
  const due = new Date(Date.now() + DAY);
  if (fresh.length) await db.reviewCard.createMany({ data: fresh.map((itemId) => ({ userId, itemId, due, ...newCard(), intervalDays: 1 })) });
  return { stars, percent, added: fresh.length, firstTime: prev?.status !== "done" };
}

/** Bank lessons for the map, with this learner's progress. Personal AI lessons come separately. */
export async function lessonMap(userId: string) {
  const [lessons, progress] = await Promise.all([
    db.lesson.findMany({ where: { ownerId: null }, orderBy: [{ level: "asc" }, { order: "asc" }] }),
    db.lessonProgress.findMany({ where: { userId } }),
  ]);
  const p = new Map(progress.map((x) => [x.lessonId, x]));
  return lessons.map((l) => ({ ...l, progress: p.get(l.id) ?? null }));
}

