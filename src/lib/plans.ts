import { db } from "./db";
import { getSetting } from "./settings";
import { tashkentDate, previousDate } from "./time";
import { FREE_LEVELS, type Level } from "./levels";

export type Plan = "FREE" | "PRO";
type UserLike = { id: string; plan: string; level: string };

export const isPro = (u: { plan: string }) => u.plan === "PRO";

export function canAccessLevel(u: { plan: string }, level: string) {
  return isPro(u) || FREE_LEVELS.includes(level as Level);
}

export function canAccessTopic(u: { plan: string }, t: { proOnly: boolean; level: string }) {
  return isPro(u) || (!t.proOnly && canAccessLevel(u, t.level));
}

export async function freeLimitSeconds() {
  return Number(await getSetting("free.dailyMinutes")) * 60;
}

export async function usageToday(userId: string) {
  const row = await db.dailyUsage.findUnique({ where: { userId_date: { userId, date: tashkentDate() } } });
  return row?.seconds ?? 0;
}

/** Remaining seconds today; null means unlimited. */
export async function remainingSeconds(u: UserLike): Promise<number | null> {
  if (isPro(u)) return null;
  const [limit, used] = await Promise.all([freeLimitSeconds(), usageToday(u.id)]);
  return Math.max(0, limit - used);
}

export async function addUsage(userId: string, seconds: number) {
  const date = tashkentDate();
  await db.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { seconds: { increment: seconds } },
    create: { userId, date, seconds },
  });
}

/** Updates the daily streak; call on any learning activity. */
export async function touchStreak(user: { id: string; streak: number; lastActiveDate: string | null }) {
  const today = tashkentDate();
  if (user.lastActiveDate === today) return;
  const streak = user.lastActiveDate === previousDate(today) ? user.streak + 1 : 1;
  await db.user.update({ where: { id: user.id }, data: { streak, lastActiveDate: today } });
}
