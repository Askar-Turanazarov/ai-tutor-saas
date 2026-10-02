import "server-only";
import { db } from "../db";
import { getAllSettings } from "../settings";
import { tashkentDate } from "../time";
import { limitSettingKey, type LimitKey } from "./catalog";
import { tierOf } from "./entitlements";

type UserLike = { id: string; plan: string };

function parse(v: string | undefined): number | null {
  if (v === undefined || v === "unlimited" || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

/** The user's quota for a key: null = unlimited, 0 = not included in the plan. */
export async function limit(u: { plan: string }, key: LimitKey): Promise<number | null> {
  const s = await getAllSettings();
  return parse(s[limitSettingKey(tierOf(u), key)]);
}

/** All quotas of the user's plan at once (one settings read). */
export async function limitsOf(u: { plan: string }): Promise<Record<LimitKey, number | null>> {
  const s = await getAllSettings();
  const tier = tierOf(u);
  const keys: LimitKey[] = ["dailyMinutes", "lessonsPerDay", "reviewsPerDay", "missionsPerDay", "pronunciationPerDay", "streakFreezesPerMonth"];
  return Object.fromEntries(keys.map((k) => [k, parse(s[limitSettingKey(tier, k)])])) as Record<LimitKey, number | null>;
}

type CounterKey = Exclude<LimitKey, "dailyMinutes" | "streakFreezesPerMonth">;

export async function usedToday(userId: string, key: CounterKey) {
  const row = await db.dailyCounter.findUnique({ where: { userId_date_key: { userId, date: tashkentDate(), key } } });
  return row?.count ?? 0;
}

/** Left for today; null = unlimited. */
export async function quotaLeft(u: UserLike, key: CounterKey): Promise<number | null> {
  const [max, used] = await Promise.all([limit(u, key), usedToday(u.id, key)]);
  return max === null ? null : Math.max(0, max - used);
}

/**
 * Takes one unit of a daily quota. Returns false when the plan doesn't include it
 * or today's quota is used up (nothing is counted then).
 */
export async function consumeQuota(u: UserLike, key: CounterKey): Promise<{ ok: boolean; left: number | null }> {
  const left = await quotaLeft(u, key);
  if (left !== null && left <= 0) return { ok: false, left: 0 };
  const date = tashkentDate();
  await db.dailyCounter.upsert({
    where: { userId_date_key: { userId: u.id, date, key } },
    update: { count: { increment: 1 } },
    create: { userId: u.id, date, key, count: 1 },
  });
  return { ok: true, left: left === null ? null : left - 1 };
}
