import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { comboBonus, levelFromXp, levelStart, longestRun, pickQuests } from "@/lib/gamification/rules";
import { currentStreak, ensureQuests, recordActivity, todayXp, touchStreak } from "@/lib/gamification";
import { previousDate, tashkentDate } from "@/lib/time";
import { makeUser } from "./helpers";

describe("gamification rules", () => {
  test("levels", () => {
    expect([levelFromXp(0).level, levelFromXp(99).level, levelFromXp(100).level, levelFromXp(250).level]).toEqual([1, 1, 2, 3]);
    expect(levelStart(5)).toBe(700);
    expect(levelFromXp(700)).toMatchObject({ into: 0, need: 300 });
  });

  test("daily quests are stable per day and skip review without due cards", () => {
    const q1 = pickQuests("u1", "2026-10-02", { goal: 60, due: 0 });
    expect(pickQuests("u1", "2026-10-02", { goal: 60, due: 0 })).toEqual(q1);
    expect(q1).toHaveLength(3);
    expect(q1[0]).toMatchObject({ key: "xp", target: 60 });
    expect(new Set(q1.map((q) => q.key)).size).toBe(3);
    expect(q1.some((q) => q.key === "review")).toBe(false);
  });

  test("combo", () => {
    expect(longestRun([{ ok: true }, { ok: true }, { ok: false }, { ok: true, retry: true }, { ok: true }])).toBe(2);
    expect([comboBonus(4), comboBonus(12), comboBonus(40)]).toEqual([0, 10, 25]);
  });
});

describe("streaks, XP and quests (database)", () => {
  let u: User;
  const today = tashkentDate();
  const ago = (n: number) => {
    let d = today;
    for (let i = 0; i < n; i++) d = previousDate(d);
    return d;
  };
  const fresh = () => db.user.findUniqueOrThrow({ where: { id: u.id } });

  beforeAll(async () => {
    u = await makeUser({ plan: "PRO" });
  });
  afterAll(async () => {
    await db.user.delete({ where: { id: u.id } });
  });

  test("Pro freezes cover two missed days, then the streak resets", async () => {
    await db.user.update({ where: { id: u.id }, data: { streak: 10, lastActiveDate: ago(3), freezeMonth: null, streakFreezes: 0 } });
    let x = await fresh();
    expect(currentStreak(x, 2)).toMatchObject({ streak: 10, atRisk: true });
    expect(currentStreak(x, 1).streak).toBe(0);
    const r = await touchStreak(x);
    x = await fresh();
    expect(r).toMatchObject({ streak: 11, frozen: 2 });
    expect(x.streakFreezes).toBe(0);
    expect(x.freezeMonth).toBe(today.slice(0, 7));
    expect(x.bestStreak).toBeGreaterThanOrEqual(11);

    await db.user.update({ where: { id: u.id }, data: { lastActiveDate: ago(4) } });
    expect((await touchStreak(await fresh())).streak).toBe(1);
  });

  test("activity logs XP and completes all three quests", async () => {
    await db.dailyQuest.deleteMany({ where: { userId: u.id, date: today } });
    expect(await ensureQuests({ id: u.id, dailyGoal: 30 })).toHaveLength(3);
    const xp0 = await todayXp(u.id);
    const res = await recordActivity(await fresh(), { source: "lesson", xp: 40, lesson: true, perfect: true, mission: true, correct: 15, chat: 5 });
    expect(await todayXp(u.id)).toBeGreaterThanOrEqual(xp0 + 40);
    expect(res.quests).toContain("xp");
    expect(res.quests).toHaveLength(3);
    const stored = await db.dailyQuest.findMany({ where: { userId: u.id, date: today } });
    expect(stored.every((q) => q.doneAt && q.progress === q.target)).toBe(true);
  });
});
