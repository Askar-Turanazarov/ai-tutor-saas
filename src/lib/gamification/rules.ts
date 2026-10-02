/**
 * Gamification rules: pure and shared by the server and the UI.
 * XP scale: a lesson gives ~100–150 XP, a review session ~20–40, a chat message 2.
 */

/* ───────────── Profile levels ───────────── */

/** XP to go from level n to n+1: 100, 150, 200… so early levels come fast and later ones mean something. */
export const levelCost = (n: number) => 100 + 50 * (n - 1);
/** Total XP needed to reach level n (level 1 = 0). */
export const levelStart = (n: number) => 100 * (n - 1) + 25 * (n - 1) * (n - 2);

export function levelFromXp(xp: number) {
  let level = 1;
  while (levelStart(level + 1) <= xp) level++;
  const into = xp - levelStart(level);
  return { level, into, need: levelCost(level), progress: into / levelCost(level) };
}

/* ───────────── Daily goal & combo ───────────── */

export const DAILY_GOALS = [30, 60, 120] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];
export const goalName = (g: number) => (g <= 30 ? "light" : g <= 60 ? "regular" : "serious");

/** Bonus for a run of correct answers: +5 XP per 5 in a row, up to +25. */
export const comboBonus = (maxCombo: number) => Math.min(25, Math.floor(maxCombo / 5) * 5);

/** Longest run of correct first answers. */
export function longestRun(answers: { ok: boolean; retry?: boolean }[]) {
  let best = 0;
  let run = 0;
  for (const a of answers) {
    if (a.retry) continue;
    run = a.ok ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/* ───────────── Quests ───────────── */

export type QuestKey = "xp" | "lesson" | "correct" | "review" | "chat" | "mission" | "perfect";

export const QUESTS: Record<QuestKey, { target: number; xp: number; icon: string }> = {
  xp: { target: 60, xp: 10, icon: "Zap" },
  lesson: { target: 1, xp: 15, icon: "BookOpen" },
  correct: { target: 15, xp: 10, icon: "CheckCheck" },
  review: { target: 10, xp: 10, icon: "Layers" },
  chat: { target: 5, xp: 10, icon: "MessageCircle" },
  mission: { target: 1, xp: 15, icon: "Drama" },
  perfect: { target: 1, xp: 20, icon: "Star" },
};

/** Small deterministic PRNG so a learner's quests for a day are stable. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Today's three quests: always the XP goal, plus two others (review only when enough cards are due). */
export function pickQuests(userId: string, date: string, opts: { goal: number; due: number }) {
  const rnd = seeded(userId + date);
  const pool: QuestKey[] = ["lesson", "correct", "chat", "mission", "perfect", ...(opts.due >= 5 ? (["review", "review"] as const) : [])];
  const picked: QuestKey[] = [];
  while (picked.length < 2) {
    const k = pool[Math.floor(rnd() * pool.length)];
    if (!picked.includes(k)) picked.push(k);
  }
  return (["xp", ...picked] as QuestKey[]).map((key) => ({
    key,
    target: key === "xp" ? opts.goal : key === "review" ? Math.min(QUESTS.review.target, opts.due) : QUESTS[key].target,
    xp: QUESTS[key].xp,
  }));
}

/* ───────────── Achievements ───────────── */

export type Metric = "lessons" | "perfect" | "missions" | "streak" | "xp" | "deck" | "learned" | "fixed" | "chat";

export type AchievementDef = { id: string; icon: string; metric: Metric; threshold: number; xp: number };

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-lesson", icon: "BookOpen", metric: "lessons", threshold: 1, xp: 20 },
  { id: "lessons-10", icon: "Library", metric: "lessons", threshold: 10, xp: 50 },
  { id: "lessons-24", icon: "GraduationCap", metric: "lessons", threshold: 24, xp: 150 },
  { id: "perfect-1", icon: "Star", metric: "perfect", threshold: 1, xp: 20 },
  { id: "perfect-10", icon: "Sparkles", metric: "perfect", threshold: 10, xp: 80 },
  { id: "mission-5", icon: "Drama", metric: "missions", threshold: 5, xp: 50 },
  { id: "streak-3", icon: "Flame", metric: "streak", threshold: 3, xp: 20 },
  { id: "streak-7", icon: "Flame", metric: "streak", threshold: 7, xp: 50 },
  { id: "streak-30", icon: "Crown", metric: "streak", threshold: 30, xp: 200 },
  { id: "xp-1000", icon: "Zap", metric: "xp", threshold: 1000, xp: 0 },
  { id: "xp-5000", icon: "Gem", metric: "xp", threshold: 5000, xp: 0 },
  { id: "deck-50", icon: "Layers", metric: "deck", threshold: 50, xp: 40 },
  { id: "learned-20", icon: "Brain", metric: "learned", threshold: 20, xp: 80 },
  { id: "fixed-10", icon: "PenLine", metric: "fixed", threshold: 10, xp: 50 },
  { id: "chat-50", icon: "MessageCircle", metric: "chat", threshold: 50, xp: 40 },
];
