/**
 * Adaptive difficulty (i+1) on an Elo scale shared by learners and content.
 *
 * Ratings are anchored so that a learner rated r answers an item of difficulty r correctly
 * ~80% of the time — the "comfortable but not trivial" zone. Level baselines: A1 400 … C2 900.
 * Each session mixes ~90% material at the learner's rating with ~10% "stretch" items ≈ +50.
 * Pure functions only — persisted by src/lib/learning/progress.ts.
 */

export const K_LEARNER = 24;
export const K_ITEM = 12;
/** Shift that puts P(correct) = 0.8 at d = r: 400·log10(1/0.8 − 1) ≈ −241. */
const OFFSET = 400 * Math.log10(1 / 0.8 - 1);
export const STRETCH = 50;

export type Rated = { id: string; difficulty: number };

/** Probability that a learner rated `r` answers an item of difficulty `d` correctly. */
export function expected(r: number, d: number) {
  return 1 / (1 + 10 ** ((d - r + OFFSET) / 400));
}

/** New ratings after one answer: the learner moves by K·(score − expected), the item the opposite way. */
export function update(r: number, d: number, correct: boolean) {
  const delta = (correct ? 1 : 0) - expected(r, d);
  return {
    rating: Math.round(r + K_LEARNER * delta),
    difficulty: Math.round(d - K_ITEM * delta),
  };
}

/** Difficulty at which the learner's success chance equals `p`. */
export function difficultyFor(r: number, p = 0.8) {
  return Math.round(r - OFFSET + 400 * Math.log10(1 / p - 1));
}

/**
 * Picks `n` items for a session: the ones closest to the learner's rating, plus a share of
 * stretch items nearest to r + STRETCH. `random` lets tests make the shuffle deterministic.
 */
export function pickSession<T extends Rated>(pool: T[], r: number, n: number, stretchShare = 0.1, random = Math.random): T[] {
  if (pool.length <= n) return shuffle(pool, random);
  const stretchN = Math.max(1, Math.round(n * stretchShare));
  const target = r + STRETCH;
  const stretch = pool
    .filter((x) => x.difficulty > r + STRETCH / 2)
    .sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target))
    .slice(0, stretchN);
  // Core material stays at or below r + STRETCH/2; harder items only fill gaps in a thin pool.
  const byCloseness = (a: T, b: T) => Math.abs(a.difficulty - r) - Math.abs(b.difficulty - r);
  const rest = pool.filter((x) => !stretch.includes(x));
  const core = [
    ...rest.filter((x) => x.difficulty <= r + STRETCH / 2).sort(byCloseness),
    ...rest.filter((x) => x.difficulty > r + STRETCH / 2).sort((a, b) => a.difficulty - b.difficulty),
  ].slice(0, n - stretch.length);
  // Stretch items never take the first two slots, so a session starts with a win.
  const mixed = shuffle(core, random);
  for (const s of stretch) mixed.splice(2 + Math.floor(random() * Math.max(1, mixed.length - 1)), 0, s);
  return mixed;
}

/** The next lesson to suggest: not done, closest to the learner's rating, bank order on ties. */
export function suggestLesson<T extends Rated & { done?: boolean; order?: number }>(lessons: T[], r: number): T | undefined {
  return lessons
    .filter((l) => !l.done)
    .sort((a, b) => Math.abs(a.difficulty - r) - Math.abs(b.difficulty - r) || (a.order ?? 0) - (b.order ?? 0))[0];
}

export function shuffle<T>(xs: T[], random = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
