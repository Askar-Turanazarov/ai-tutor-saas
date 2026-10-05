import { db } from "./db";
import { getSetting } from "./settings";
import { tashkentDate, previousDate } from "./time";
import { FREE_LEVELS, type Level } from "./levels";

export type Plan = "FREE" | "PRO";
type PlanLike = { plan: string; proUntil?: Date | null };
type UserLike = PlanLike & { id: string; level: string };

/**
 * Pro access. `proUntil` is the end of the paid period (null = lifetime Pro from an admin).
 * Checked on every request, so access ends on time even before the billing job downgrades the user.
 */
export const isPro = (u: PlanLike) => u.plan === "PRO" && (!u.proUntil || u.proUntil.getTime() > Date.now());

export function canAccessLevel(u: PlanLike, level: string) {
  return isPro(u) || FREE_LEVELS.includes(level as Level);
}

export function canAccessTopic(u: PlanLike, t: { proOnly: boolean; level: string }) {
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
