import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { demoXp, leagueState, weekStart } from "@/lib/gamification/league";
import { makeUser } from "./helpers";

describe("weekly league", () => {
  test("weeks start on Monday", () => {
    expect(["2026-10-03", "2026-09-28", "2026-10-04", "2026-10-05"].map((d) => weekStart(d))).toEqual(["2026-09-28", "2026-09-28", "2026-09-28", "2026-10-05"]);
  });

  test("demo rivals gain XP through the week", () => {
    const p = { id: "demo-05", pace: 100 };
    const a = demoXp(p, "2026-09-28", new Date("2026-09-29T06:00:00Z"));
    const b = demoXp(p, "2026-09-28", new Date("2026-10-02T06:00:00Z"));
    const c = demoXp(p, "2026-09-28", new Date("2026-10-04T18:00:00Z"));
    expect(a).toBeLessThanOrEqual(b);
    expect(b).toBeLessThanOrEqual(c);
    expect(c).toBeGreaterThan(300);
    expect(c).toBeLessThan(1200);
  });

  describe("settling (database)", () => {
    let u: User;
    const lastMonday = new Date(Date.parse(weekStart() + "T00:00:00Z") - 7 * 864e5).toISOString().slice(0, 10);
    const state = async () => leagueState(await db.user.findUniqueOrThrow({ where: { id: u.id } }));

    beforeAll(async () => {
      u = await makeUser({ plan: "PRO" });
    });
    afterAll(async () => {
      await db.user.delete({ where: { id: u.id } });
    });

    test("a big week promotes once and keeps the note", async () => {
      const ev = await db.xpEvent.create({ data: { userId: u.id, amount: 5000, source: "test", date: lastMonday } });
      await db.user.update({ where: { id: u.id }, data: { league: 1, leagueWeek: lastMonday, leagueLast: null } });
      let s = await state();
      expect(s.league).toBe(2);
      expect(s.last).toMatchObject({ from: 1, to: 2, rank: 1 });
      expect(s.rows.length).toBeGreaterThanOrEqual(13);
      expect(s.rows.filter((r) => r.demo).length).toBeGreaterThanOrEqual(12);
      expect(s.rows.some((r) => r.me)).toBe(true);
      s = await state();
      expect(s.league).toBe(2);
      expect(s.last?.to).toBe(2);
      await db.xpEvent.delete({ where: { id: ev.id } });
    });

    test("no XP demotes, a long absence drops one league", async () => {
      await db.user.update({ where: { id: u.id }, data: { league: 3, leagueWeek: lastMonday, leagueLast: null } });
      const s = await state();
      expect(s.league).toBe(2);
      await db.user.update({ where: { id: u.id }, data: { league: 2, leagueWeek: "2026-08-03", leagueLast: null } });
      expect((await state()).league).toBe(1);
    });
  });
});
