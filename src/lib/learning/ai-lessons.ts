import "server-only";
import { db } from "../db";
import { generateLesson } from "../ai/tutor";
import type { LessonData } from "../ai/schemas";
import { LESSONS, lessonRows } from "../content/lessons";
import { levelRating, type Exercise, type LessonSeed } from "../content/types";
import { LEVELS, type Level } from "../levels";
import { shuffle } from "./adaptive";
import { skills, type Area } from "./progress";

/** A guard against runaway generation; Pro has no lesson quota otherwise. */
export const AI_LESSONS_PER_DAY = 10;
const DAY = 86_400_000;
const BANK_TOP: Level = "B2";

/** Personal lessons of one learner, newest first, with progress. */
export async function personalLessons(userId: string) {
  const rows = await db.lesson.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" }, include: { progress: { where: { userId } } } });
  return rows.map(({ progress, ...l }) => ({ ...l, progress: progress[0] ?? null }));
}

export const generatedToday = (userId: string) => db.lesson.count({ where: { ownerId: userId, createdAt: { gte: new Date(Date.now() - DAY) } } });

/** The bank lesson closest to the request: same level (B2 at most), most words in common with the situation. */
export function nearestBankLesson(level: Level, situation: string, random = Math.random): LessonSeed {
  const lvl = LEVELS.indexOf(level) > LEVELS.indexOf(BANK_TOP) ? BANK_TOP : level;
  const words = new Set(situation.toLowerCase().split(/[^a-zа-яёʻʼ']+/i).filter((w) => w.length > 3));
  const score = (l: LessonSeed) =>
    [l.title.en, l.title.ru, l.situation.en, l.situation.ru, l.canDo.en]
      .join(" ")
      .toLowerCase()
      .split(/[^a-zа-яёʻʼ']+/i)
      .filter((w) => words.has(w)).length;
  const pool = shuffle(LESSONS.filter((l) => l.level === lvl), random);
  return pool.reduce((best, l) => (score(l) > score(best) ? l : best), pool[0]);
}

/**
 * Model output can be inconsistent in small ways: links to chunks that don't exist, answer
 * indexes out of range, a "wrong" fragment that isn't in the sentence. Fix or drop those.
 */
export function sanitizeLesson(data: LessonData): LessonData {
  const keys = new Set(data.items.map((i) => i.key));
  const exercises = data.exercises
    .map((e): Exercise | null => {
      const ex = "item" in e && e.item && !keys.has(e.item) ? { ...e, item: undefined } : e;
      switch (ex.type) {
        case "choice":
        case "collocate":
        case "dialogue":
          return ex.answer < ex.options.length && new Set(ex.options).size === ex.options.length ? ex : null;
        case "spot":
          return ex.sentence.includes(ex.wrong) && ex.wrong !== ex.right ? ex : null;
        case "match": {
          const items = ex.items.filter((k) => keys.has(k));
          return items.length >= 3 ? { ...ex, items } : null;
        }
        case "gap":
          return ex.answer.trim() ? ex : null;
        default:
          return ex;
      }
    })
    .filter((e): e is Exercise => !!e);
  const script = data.mission.script.length >= 2 ? data.mission.script : [...data.mission.script, "I see. Could you tell me a little more?", "Great, thank you! That's all for today."];
  return { ...data, exercises, mission: { ...data.mission, script } };
}

const AREA_NAME: Record<Area, string> = { vocab: "vocabulary", grammar: "grammar", listening: "listening", speaking: "speaking" };

/**
 * Generates a personal lesson for a Pro learner and stores it (chunks too) like a bank lesson,
 * owned by the learner. Without an AI model the nearest bank lesson is adapted instead.
 */
export async function createPersonalLesson(user: { id: string; level: string }, opts: { level: Level; situation: string }) {
  const [mistakes, s, count] = await Promise.all([
    db.mistake.findMany({ where: { userId: user.id, resolvedAt: null }, orderBy: [{ hits: "desc" }, { updatedAt: "desc" }], take: 6 }),
    skills(user),
    db.lesson.count({ where: { ownerId: user.id } }),
  ]);
  const weakest = (Object.keys(s) as Area[]).reduce((a, b) => (s[b] < s[a] ? b : a));
  const bank = nearestBankLesson(opts.level, opts.situation);

  const res = await generateLesson({
    userId: user.id,
    level: opts.level,
    situation: opts.situation,
    weakArea: AREA_NAME[weakest],
    mistakes: mistakes.map((m) => ({ original: m.original, corrected: m.corrected, category: m.category })),
    fallback: () => structuredClone(bank) as LessonData,
  });
  const fallback = res.provider === "mock";
  const data = sanitizeLesson(res.data);
  const level = fallback ? bank.level : opts.level;
  const slug = `${data.slug.slice(0, 40).replace(/-+$/, "")}-${Date.now().toString(36)}`;

  const seed: LessonSeed = { ...data, slug, level, minTier: "PRO" };
  const { items, rows } = lessonRows([seed]);
  const row = { ...rows[0], order: 100 + count, difficulty: levelRating(level) + 40, source: "ai", ownerId: user.id };
  await db.$transaction([...items.map((it) => db.lexicalItem.create({ data: { ...it, tags: `ai,${slug}` } })), db.lesson.create({ data: row })]);
  return { slug, fallback, provider: res.provider };
}

/** Removes a personal lesson with its chunks (their review cards go with them). */
export async function deletePersonalLesson(userId: string, slug: string) {
  const l = await db.lesson.findFirst({ where: { slug, ownerId: userId } });
  if (!l) return false;
  await db.$transaction([db.lexicalItem.deleteMany({ where: { id: { in: JSON.parse(l.itemIds) as string[] } } }), db.lesson.delete({ where: { id: l.id } })]);
  return true;
}
