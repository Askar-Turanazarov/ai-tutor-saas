import "server-only";
import { db } from "../db";
import { limit } from "../billing/limits";
import { tashkentDate } from "../time";
import { ACHIEVEMENTS, levelFromXp, pickQuests, type Metric, type QuestKey } from "./rules";

type StreakUser = { id: string; plan: string; streak: number; lastActiveDate: string | null; bestStreak: number; streakFreezes: number; freezeMonth: string | null };

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86_400_000);

/* ───────────── Streak & freezes ───────────── */

/** Freezes in stock now: refilled to the plan's monthly amount on the first activity of a month (they don't pile up). */
async function freezesNow(user: StreakUser, today: string) {
  const month = today.slice(0, 7);
  if (user.freezeMonth === month) return { stock: user.streakFreezes, refill: null as null | { streakFreezes: number; freezeMonth: string } };
  const n = (await limit(user, "streakFreezesPerMonth")) ?? 0;
  return { stock: n, refill: { streakFreezes: n, freezeMonth: month } };
}

/**
 * Counts today in the streak. Missed days are covered by freezes when there are enough of them;
 * otherwise the streak starts again from 1.
 */
export async function touchStreak(user: StreakUser) {
  const today = tashkentDate();
  if (user.lastActiveDate === today) return { streak: user.streak, frozen: 0 };
  const { stock, refill } = await freezesNow(user, today);
  const missed = user.lastActiveDate ? daysBetween(user.lastActiveDate, today) - 1 : -1;
  let streak = 1;
  let frozen = 0;
  if (missed === 0) streak = user.streak + 1;
  else if (missed > 0 && user.streak > 0 && missed <= stock) {
    streak = user.streak + 1;
    frozen = missed;
  }
  await db.user.update({
    where: { id: user.id },
    data: { streak, lastActiveDate: today, bestStreak: Math.max(user.bestStreak, streak), ...(refill ?? {}), streakFreezes: (refill?.streakFreezes ?? stock) - frozen },
  });
  Object.assign(user, { streak, lastActiveDate: today });
  return { streak, frozen };
}

/** The streak as it stands right now: 0 if days were missed and freezes can't cover them. */
export function currentStreak(user: Pick<StreakUser, "streak" | "lastActiveDate" | "streakFreezes" | "freezeMonth">, monthlyFreezes: number) {
  if (!user.lastActiveDate) return { streak: 0, atRisk: false, freezes: monthlyFreezes };
  const today = tashkentDate();
  const freezes = user.freezeMonth === today.slice(0, 7) ? user.streakFreezes : monthlyFreezes;
  const missed = daysBetween(user.lastActiveDate, today) - 1;
  if (missed <= 0) return { streak: user.streak, atRisk: missed === 0, freezes };
  return missed <= freezes ? { streak: user.streak, atRisk: true, freezes } : { streak: 0, atRisk: false, freezes };
}

/* ───────────── XP, quests, achievements ───────────── */

export type Activity = {
  source: "lesson" | "review" | "mistakes" | "chat" | "quiz" | "pronunciation";
  xp: number;
  lesson?: boolean;
  perfect?: boolean;
  mission?: boolean;
  correct?: number;
  reviewed?: number;
  chat?: number;
};

export type ActivityResult = { xp: number; quests: QuestKey[]; achievements: string[] };

async function grant(userId: string, amount: number, source: string) {
  if (amount <= 0) return;
  await db.$transaction([
    db.xpEvent.create({ data: { userId, amount, source, date: tashkentDate() } }),
    db.user.update({ where: { id: userId }, data: { xp: { increment: amount } } }),
  ]);
}

/**
 * The one entry point for learning activity: XP (logged per day for goals and the league),
 * the streak, quest progress and achievements. Returns what was completed, for celebrations.
 */
export async function recordActivity(user: StreakUser & { dailyGoal: number }, a: Activity): Promise<ActivityResult> {
  await touchStreak(user);
  await grant(user.id, a.xp, a.source);

  const quests = await ensureQuests(user);
  const inc: Record<QuestKey, number> = {
    xp: a.xp,
    lesson: a.lesson ? 1 : 0,
    perfect: a.perfect ? 1 : 0,
    mission: a.mission ? 1 : 0,
    correct: a.correct ?? 0,
    review: a.reviewed ?? 0,
    chat: a.chat ?? 0,
  };
  const done: QuestKey[] = [];
  for (const q of quests) {
    const k = q.key as QuestKey;
    if (q.doneAt || !inc[k]) continue;
    const progress = Math.min(q.target, q.progress + inc[k]);
    const finished = progress >= q.target;
    await db.dailyQuest.update({ where: { id: q.id }, data: { progress, doneAt: finished ? new Date() : null } });
    if (finished) {
      done.push(k);
      await grant(user.id, q.xp, "quest");
    }
  }
  const achievements = await checkAchievements(user.id);
  return { xp: a.xp, quests: done, achievements };
}

/** Today's quests, created on first look. */
export async function ensureQuests(user: { id: string; dailyGoal: number }) {
  const date = tashkentDate();
  const existing = await db.dailyQuest.findMany({ where: { userId: user.id, date } });
  if (existing.length) return existing;
  const due = await db.reviewCard.count({ where: { userId: user.id, due: { lte: new Date() } } });
  const picked = pickQuests(user.id, date, { goal: user.dailyGoal, due });
  await db.dailyQuest.createMany({ data: picked.map((q) => ({ userId: user.id, date, ...q })) });
  return db.dailyQuest.findMany({ where: { userId: user.id, date } });
}

export const todayXp = async (userId: string) =>
  (await db.xpEvent.aggregate({ where: { userId, date: tashkentDate() }, _sum: { amount: true } }))._sum.amount ?? 0;

let synced = false;
/** Achievement definitions are code; keep the table in step (once per server process). */
export async function syncAchievements() {
  if (synced) return;
  await db.$transaction(
    ACHIEVEMENTS.map((a, order) => db.achievement.upsert({ where: { id: a.id }, update: { ...a, order }, create: { ...a, order } })),
  );
  synced = true;
}

async function metric(userId: string, m: Metric): Promise<number> {
  switch (m) {
    case "lessons":
      return db.lessonProgress.count({ where: { userId, status: "done" } });
    case "perfect":
      return db.lessonProgress.count({ where: { userId, stars: 3 } });
    case "missions":
      return db.lessonProgress.count({ where: { userId, missionDone: true } });
    case "deck":
      return db.reviewCard.count({ where: { userId } });
    case "learned":
      return db.reviewCard.count({ where: { userId, intervalDays: { gte: 21 } } });
    case "fixed":
      return db.mistake.count({ where: { userId, resolvedAt: { not: null } } });
    case "chat":
      return db.message.count({ where: { role: "user", conversation: { userId } } });
    case "streak":
    case "xp": {
      const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, bestStreak: true, streak: true } });
      return m === "xp" ? u.xp : Math.max(u.bestStreak, u.streak);
    }
  }
}

/** Unlocks every achievement the learner has reached; their XP rewards are paid at once. */
export async function checkAchievements(userId: string) {
  await syncAchievements();
  const have = new Set((await db.userAchievement.findMany({ where: { userId }, select: { achievementId: true } })).map((u) => u.achievementId));
  const todo = ACHIEVEMENTS.filter((a) => !have.has(a.id));
  const values = new Map<Metric, number>();
  const unlocked: string[] = [];
  for (const a of todo) {
    if (!values.has(a.metric)) values.set(a.metric, await metric(userId, a.metric));
    if (values.get(a.metric)! < a.threshold) continue;
    await db.userAchievement.create({ data: { userId, achievementId: a.id } });
    await grant(userId, a.xp, "achievement");
    unlocked.push(a.id);
  }
  return unlocked;
}

/** What the app shell should celebrate: new achievements and a profile level not yet shown. */
export async function pendingCelebrations(user: { id: string; xp: number; levelSeen: number }) {
  const fresh = await db.userAchievement.findMany({ where: { userId: user.id, seen: false }, orderBy: { unlockedAt: "asc" }, select: { achievementId: true } });
  const { level } = levelFromXp(user.xp);
  return { achievements: fresh.map((f) => f.achievementId), level: level > user.levelSeen ? level : null };
}


/** Everything the progress page and the dashboard show about goals, streak, quests and achievements. */
export async function progressState(user: StreakUser & { xp: number; dailyGoal: number }) {
  await checkAchievements(user.id);
  const [xpToday, quests, unlocked, monthly] = await Promise.all([
    todayXp(user.id),
    ensureQuests(user),
    db.userAchievement.findMany({ where: { userId: user.id }, select: { achievementId: true, unlockedAt: true } }),
    limit(user, "streakFreezesPerMonth"),
  ]);
  const metrics = new Map<Metric, number>();
  for (const m of new Set(ACHIEVEMENTS.map((a) => a.metric))) metrics.set(m, await metric(user.id, m));
  const at = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt.toISOString()]));
  return {
    level: levelFromXp(user.xp),
    xp: user.xp,
    streak: currentStreak(user, monthly ?? 0),
    bestStreak: Math.max(user.bestStreak, user.streak),
    monthlyFreezes: monthly ?? 0,
    goal: user.dailyGoal,
    xpToday,
    quests: quests.map((q) => ({ key: q.key, target: q.target, progress: q.progress, xp: q.xp, done: !!q.doneAt })),
    achievements: ACHIEVEMENTS.map((a) => ({ id: a.id, icon: a.icon, xp: a.xp, threshold: a.threshold, value: Math.min(a.threshold, metrics.get(a.metric) ?? 0), unlockedAt: at.get(a.id) ?? null })),
  };
}
export type ProgressState = Awaited<ReturnType<typeof progressState>>;
