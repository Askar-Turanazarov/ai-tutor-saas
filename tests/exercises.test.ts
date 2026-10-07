import { describe, expect, test } from "vitest";
import { LESSONS } from "@/lib/content/lessons";
import { bankEntry, check, derivedExercises, reviewExercise, spotFromAnti, spotRange, type ItemInfo } from "@/lib/learning/exercises";

describe("lesson content and exercise engine", () => {
  test.each(LESSONS.map((l) => [l.slug, l] as const))("%s: exercises are answerable", (_, l) => {
    const items: ItemInfo[] = l.items.map((i) => ({ id: i.key, chunk: i.chunk, kind: i.kind, meaning: i.meaning, examples: i.examples, anti: i.anti ?? [], difficulty: 500 }));
    const derived = derivedExercises(items, { speaking: true });
    const total = l.exercises.length + derived.length;
    expect(total).toBeGreaterThanOrEqual(12);
    expect(total).toBeLessThanOrEqual(16);

    for (const ex of [...l.exercises, ...derived]) {
      if (ex.type === "spot") {
        const r = spotRange(ex.sentence, ex.wrong);
        expect(r.length, `${ex.sentence} | ${ex.wrong}`).toBeGreaterThan(0);
        expect(check(ex, { kind: "spot", value: r }).ok).toBe(true);
        expect(check(ex, { kind: "spot", value: [99] }).ok).toBe(false);
      }
      if (ex.type === "choice" || ex.type === "collocate" || ex.type === "dialogue") {
        expect(check(ex, { kind: "index", value: ex.answer }).ok).toBe(true);
        expect(check(ex, { kind: "index", value: (ex.answer + 1) % ex.options.length }).ok).toBe(false);
      }
      if (ex.type === "gap" || ex.type === "translate") expect(check(ex, { kind: "text", value: ex.answer }).ok, ex.answer).toBe(true);
      if (ex.type === "order") {
        const toks = ex.answer.split(/\s+/).map((w, i) => `${i}:${w}`);
        expect(check(ex, { kind: "words", value: toks }).ok).toBe(true);
      }
    }
    for (const it of items) {
      const r = reviewExercise(it, items.filter((x) => x !== it), () => 0.1);
      if (r.type === "gap") expect(r.prompt, it.chunk).toContain("___");
    }
  });

  test("spot exercise from an anti-example", () => {
    expect(spotFromAnti({ wrong: "I from Tashkent.", right: "I'm from Tashkent.", why: { ru: "", en: "", uz: "" } })).toEqual({
      sentence: "I from Tashkent.",
      wrong: "I",
      right: "I'm",
    });
  });

  test("mistake bank entries only for real mistakes", () => {
    const gap = { type: "gap", prompt: "I'm ___ Bukhara.", answer: "from" } as const;
    expect(bankEntry(gap, check(gap, { kind: "text", value: "of" }))).toEqual({ given: "I'm of Bukhara.", answer: "I'm from Bukhara." });
    expect(bankEntry(gap, check(gap, { kind: "text", value: "from" }))).toEqual({});
    const listen = { type: "listen", text: "Nice to meet you." } as const;
    expect(bankEntry(listen, check(listen, { kind: "text", value: "nice to see you" }))).toEqual({});
  });
});
