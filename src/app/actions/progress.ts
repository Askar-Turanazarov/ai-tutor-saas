"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DAILY_GOALS, levelFromXp } from "@/lib/gamification/rules";
import { tashkentDate } from "@/lib/time";
import { dismissLeagueNote } from "@/lib/gamification/league";

export async function setDailyGoal(goal: number) {
  const user = await getCurrentUser();
  if (!user || !DAILY_GOALS.includes(goal as (typeof DAILY_GOALS)[number])) return { ok: false };
  await db.user.update({ where: { id: user.id }, data: { dailyGoal: goal } });
  // Today's "earn XP" quest follows the new goal unless it's already done.
  await db.dailyQuest.updateMany({ where: { userId: user.id, date: tashkentDate(), key: "xp", doneAt: null }, data: { target: goal } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** The celebration sheet was shown: don't show these achievements or this level again. */
export async function markCelebrated() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.$transaction([
    db.userAchievement.updateMany({ where: { userId: user.id, seen: false }, data: { seen: true } }),
    db.user.update({ where: { id: user.id }, data: { levelSeen: Math.max(user.levelSeen, levelFromXp(user.xp).level) } }),
  ]);
}

export async function dismissLeagueResult() {
  const user = await getCurrentUser();
  if (user) await dismissLeagueNote(user.id);
}
