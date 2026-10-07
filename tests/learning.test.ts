import { describe, expect, test } from "vitest";
import { difficultyFor, expected, pickSession, suggestLesson, update } from "@/lib/learning/adaptive";
import { gradeAnswer, isLeech, matches, newCard, schedule } from "@/lib/learning/srs";

describe("adaptive difficulty (Elo)", () => {
  test("expected score and updates", () => {
    expect(expected(500, 500)).toBeCloseTo(0.8, 3);
    expect(expected(500, 600)).toBeLessThan(expected(500, 500));
    expect(difficultyFor(500, 0.8)).toBe(500);
    const up = update(500, 500, true);
    const down = update(500, 500, false);
    expect(up.rating).toBeGreaterThan(500);
    expect(up.difficulty).toBeLessThan(500);
    expect(down.rating).toBeLessThan(500);
    expect(down.difficulty).toBeGreaterThan(500);
    // An expected success moves the rating less than a surprise failure.
    expect(up.rating - 500).toBeLessThan(500 - down.rating);
  });

  test("session: ten distinct items, one stretch item, starts with a win", () => {
    let seed = 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pool = Array.from({ length: 30 }, (_, i) => ({ id: String(i), difficulty: 400 + i * 10 }));
    for (let run = 0; run < 50; run++) {
      const s = pickSession(pool, 500, 10, 0.1, rnd);
      expect(s).toHaveLength(10);
      expect(new Set(s.map((x) => x.id)).size).toBe(10);
      const stretch = s.filter((x) => x.difficulty > 525);
      expect(stretch).toHaveLength(1);
      expect(Math.abs(stretch[0].difficulty - 550)).toBeLessThanOrEqual(10);
      expect(s.filter((x) => x.difficulty <= 525).every((x) => Math.abs(x.difficulty - 500) <= 60)).toBe(true);
      expect(s.indexOf(stretch[0])).toBeGreaterThanOrEqual(2);
    }
  });

  test("suggests the nearest unfinished lesson", () => {
    const lessons = [{ id: "a", difficulty: 400, done: true }, { id: "b", difficulty: 410 }, { id: "c", difficulty: 600 }];
    expect(suggestLesson(lessons, 450)?.id).toBe("b");
  });
});

describe("spaced repetition", () => {
  test("grading", () => {
    expect(gradeAnswer({ correct: false, ms: 1000 })).toBe(1);
    expect(gradeAnswer({ correct: true, ms: 1000, hinted: true })).toBe(3);
    expect(gradeAnswer({ correct: true, ms: 2000, answerLength: 10 })).toBe(5);
    expect(gradeAnswer({ correct: true, ms: 5000, answerLength: 10 })).toBe(4);
    expect(gradeAnswer({ correct: true, ms: 20000, answerLength: 10 })).toBe(3);
  });

  test("intervals 1 → 3 → ×ease, lapses and leeches", () => {
    const now = new Date("2026-10-02T09:00:00Z");
    const r1 = schedule(newCard(), 5, 2000, now);
    expect(r1.intervalDays).toBe(1);
    const r2 = schedule(r1, 5, 2000, now);
    expect(r2.intervalDays).toBe(3);
    const r3 = schedule(r2, 5, 2000, now);
    expect(r3.intervalDays).toBeGreaterThanOrEqual(7);
    expect(r3.due.getTime() - now.getTime()).toBe(r3.intervalDays * 86400000);
    const lapse = schedule(r3, 1, 9000, now);
    expect(lapse.intervalDays).toBe(1);
    expect(lapse.lapses).toBe(1);
    expect(lapse.ease).toBeLessThan(r3.ease);
    let e = newCard();
    for (let i = 0; i < 20; i++) e = schedule(e, 1, 1000, now);
    expect(e.ease).toBe(1.3);
    expect(isLeech(e)).toBe(true);
    let g = newCard();
    for (let i = 0; i < 20; i++) g = schedule(g, 5, 1000, now);
    expect(g.ease).toBe(2.8);
  });

  test("answer matching ignores case, contractions and punctuation", () => {
    expect(matches("i am in a hurry", "I'm in a hurry.")).toBe(true);
    expect(matches("Sorry,  I’m in a hurry", "Sorry, I'm in a hurry.")).toBe(true);
    expect(matches("I in a hurry", "I'm in a hurry.")).toBe(false);
  });
});
