import { db } from "./db";
import { tashkentDate } from "./time";
import { limit } from "./billing/limits";

export { can, canAccessLevel, canAccessTopic, tierOf, atLeast } from "./billing/entitlements";

type UserLike = { id: string; plan: string };

/** Daily active-time limit in seconds; null = unlimited. */
export async function dailyLimitSeconds(u: { plan: string }) {
  const minutes = await limit(u, "dailyMinutes");
  return minutes === null ? null : minutes * 60;
}

export async function usageToday(userId: string) {
  const row = await db.dailyUsage.findUnique({ where: { userId_date: { userId, date: tashkentDate() } } });
  return row?.seconds ?? 0;
}

/** Remaining seconds today; null means unlimited. */
export async function remainingSeconds(u: UserLike): Promise<number | null> {
  const max = await dailyLimitSeconds(u);
  if (max === null) return null;
  return Math.max(0, max - (await usageToday(u.id)));
}

export async function addUsage(userId: string, seconds: number) {
  const date = tashkentDate();
  await db.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { seconds: { increment: seconds } },
    create: { userId, date, seconds },
  });
}

/** Freezes cover missed days; see src/lib/gamification. */
export { touchStreak } from "./gamification";
