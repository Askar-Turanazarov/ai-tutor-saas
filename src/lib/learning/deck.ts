import "server-only";
import { db } from "../db";
import type { Exercise } from "../content/types";
import { shuffle } from "./adaptive";
import { reviewExercise, type ItemInfo, type RunExercise } from "./exercises";
import { lessonItems } from "./progress";

/** Days between reviews after which a chunk counts as learned. */
export const LEARNED_DAYS = 21;
/** Correct answers in a row that close a mistake. */
export const RESOLVE_STREAK = 3;
export const SESSION_SIZE = 20;

export type DeckCard = {
  id: string;
  item: ItemInfo;
  due: string;
  intervalDays: number;
  reps: number;
  lapses: number;
  lastGrade: number | null;
};

/** The learner's whole deck with chunk details, soonest due first. */
export async function deck(userId: string): Promise<DeckCard[]> {
  const cards = await db.reviewCard.findMany({ where: { userId }, orderBy: { due: "asc" } });
  const items = new Map((await lessonItems(cards.map((c) => c.itemId))).map((i) => [i.id, i]));
  return cards
    .filter((c) => items.has(c.itemId))
    .map((c) => ({ id: c.id, item: items.get(c.itemId)!, due: c.due.toISOString(), intervalDays: c.intervalDays, reps: c.reps, lapses: c.lapses, lastGrade: c.lastGrade }));
}

export const dueCount = (userId: string) => db.reviewCard.count({ where: { userId, due: { lte: new Date() } } });

/**
 * A review session over due cards: one exercise per chunk, alternating recall from an
 * example (gap) and recognition from the meaning (choice) so it doesn't feel like flashcards.
 */
export async function reviewSession(userId: string, max: number): Promise<{ steps: RunExercise[]; items: ItemInfo[] }> {
  const due = await db.reviewCard.findMany({ where: { userId, due: { lte: new Date() } }, orderBy: { due: "asc" }, take: max });
  if (!due.length) return { steps: [], items: [] };
  const items = await lessonItems(due.map((c) => c.itemId));
  // Distractors come from the whole deck, so recognition isn't trivially "the only phrase I know".
  const pool = await lessonItems((await db.reviewCard.findMany({ where: { userId }, select: { itemId: true }, take: 200 })).map((c) => c.itemId));
  const steps = shuffle(items).map((it) => ({
    key: `r:${it.id}`,
    ex: reviewExercise(it, pool.filter((p) => p.id !== it.id && p.kind === it.kind).concat(pool.filter((p) => p.id !== it.id && p.kind !== it.kind))),
    difficulty: it.difficulty,
    item: it.id,
  }));
  return { steps, items: pool };
}

/* ───────────── Mistake bank ───────────── */

/**
 * Training from the mistake bank: chunk mistakes come back as a review exercise for that chunk,
 * the rest as "which one is right?" with the learner's own wrong version as the distractor.
 */
export async function mistakeSession(userId: string, max = 10): Promise<{ steps: RunExercise[]; items: ItemInfo[] }> {
  const mistakes = await db.mistake.findMany({ where: { userId, resolvedAt: null }, orderBy: [{ hits: "desc" }, { updatedAt: "desc" }], take: max });
  const items = await lessonItems([...new Set(mistakes.flatMap((m) => (m.itemId ? [m.itemId] : [])))]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const steps = mistakes.map((m): RunExercise => {
    const item = m.itemId ? byId.get(m.itemId) : undefined;
    const why = m.explanation ? { ru: m.explanation, en: m.explanation, uz: m.explanation } : undefined;
    const ex: Exercise =
      item && m.source !== "chat" && items.length > 1
        ? reviewExercise(item, items.filter((i) => i !== item))
        : (() => {
            const options = shuffle([m.corrected, m.original]);
            return { type: "choice", prompt: "___", options, answer: options.indexOf(m.corrected), why };
          })();
    return { key: `m:${m.id}`, ex, difficulty: item?.difficulty ?? 500, item: item?.id };
  });
  return { steps: shuffle(steps), items };
}

/** Correct answers build a streak; RESOLVE_STREAK in a row closes the mistake. A miss resets it. */
export async function applyMistakeResults(userId: string, results: { id: string; ok: boolean }[]) {
  let resolved = 0;
  for (const r of results) {
    const m = await db.mistake.findFirst({ where: { id: r.id, userId, resolvedAt: null } });
    if (!m) continue;
    const streak = r.ok ? m.streak + 1 : 0;
    const done = streak >= RESOLVE_STREAK;
    if (done) resolved++;
    await db.mistake.update({
      where: { id: m.id },
      data: { streak, hits: r.ok ? m.hits : m.hits + 1, resolvedAt: done ? new Date() : null },
    });
  }
  return resolved;
}
