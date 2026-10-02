/**
 * Spaced repetition: simplified SM-2. Pure functions only.
 *
 * Grade 0–5 comes from correctness, answer time and hints: fast & correct → 5, slow → 4/3,
 * with a hint → 3, wrong → 1. Intervals go 1 → 3 → interval × ease days; a lapse resets the
 * interval to 1 day and lowers ease. Four lapses make a "leech" that goes to the mistake bank.
 */

export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;
export const START_EASE = 2.3;
export const LEECH_LAPSES = 4;
const DAY = 86_400_000;

export type CardState = { intervalDays: number; ease: number; reps: number; lapses: number; avgMs: number };

export const newCard = (): CardState => ({ intervalDays: 0, ease: START_EASE, reps: 0, lapses: 0, avgMs: 0 });

/** Time a learner may reasonably need for an answer of this length (characters). */
export const normMs = (answerLength: number) => 2500 + 120 * Math.max(0, answerLength);

export function gradeAnswer(a: { correct: boolean; ms: number; hinted?: boolean; answerLength?: number }): number {
  if (!a.correct) return 1;
  if (a.hinted) return 3;
  const norm = normMs(a.answerLength ?? 10);
  return a.ms <= norm ? 5 : a.ms <= norm * 2 ? 4 : 3;
}

const clampEase = (e: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(e * 100) / 100));

/** Applies one review. Returns the new state and the next due date. */
export function schedule(card: CardState, grade: number, ms: number, now = new Date()): CardState & { due: Date; lastGrade: number } {
  const avgMs = card.avgMs ? Math.round(card.avgMs * 0.7 + ms * 0.3) : Math.round(ms);
  let { intervalDays, ease, reps, lapses } = card;
  if (grade < 3) {
    reps = 0;
    lapses += 1;
    intervalDays = 1;
    ease = clampEase(ease - 0.2);
  } else {
    reps += 1;
    intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(intervalDays * ease);
    ease = clampEase(ease + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  }
  return { intervalDays, ease, reps, lapses, avgMs, lastGrade: grade, due: new Date(now.getTime() + intervalDays * DAY) };
}

export const isLeech = (c: { lapses: number }) => c.lapses >= LEECH_LAPSES;

/** Lenient answer check shared by typed exercises and reviews. */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/\bi am\b/g, "i'm")
    .replace(/\bit is\b/g, "it's")
    .replace(/\bthat is\b/g, "that's")
    .replace(/\blet us\b/g, "let's")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matches(input: string, answer: string, accept: string[] = []) {
  const n = normalize(input);
  return [answer, ...accept].some((a) => normalize(a) === n);
}
