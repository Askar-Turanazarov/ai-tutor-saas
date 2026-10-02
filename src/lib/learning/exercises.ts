/**
 * Exercise engine core shared by lessons, reviews, mistake training and quizzes.
 * Pure: builds runnable exercises from lesson JSON + chunks and checks answers.
 */
import type { AntiExample, ChunkKind, Exercise, L3 } from "../content/types";
import type { Question } from "../ai/schemas";
import { matches, normalize } from "./srs";
import { shuffle } from "./adaptive";

/** What the client needs to know about a chunk to render match cards, hints and feedback. */
export type ItemInfo = { id: string; chunk: string; kind: ChunkKind; meaning: L3; examples: string[]; anti: AntiExample[]; difficulty: number };

/** One step of a session. `key` is stable per session (answers are reported by it). */
export type RunExercise = { key: string; ex: Exercise; difficulty: number; item?: string };

export type Locale = "ru" | "en" | "uz";
export const pick = (t: L3 | undefined, locale: string) => (t ? t[locale as Locale] ?? t.en : undefined);

/** Relative effort of each exercise type, added to the chunk difficulty. */
const TYPE_SHIFT: Record<Exercise["type"], number> = {
  match: -40,
  choice: -30,
  dialogue: -20,
  collocate: -10,
  order: 0,
  gap: 10,
  listen: 20,
  spot: 20,
  speak: 30,
  translate: 40,
};

export const exerciseDifficulty = (ex: Exercise, base: number) => base + TYPE_SHIFT[ex.type];

/**
 * Exercises that come "for free" from the chunks: match pairs, listening, spot-the-error
 * from anti-examples and a speaking line. Together with the hand-written ones a lesson gets 12–15.
 */
export function derivedExercises(items: ItemInfo[], opts: { speaking: boolean }): Exercise[] {
  const out: Exercise[] = [];
  if (items.length >= 3) out.push({ type: "match", items: items.slice(0, 4).map((i) => i.id) });
  if (items.length >= 7) out.push({ type: "match", items: items.slice(4, 8).map((i) => i.id) });
  const withExamples = items.filter((i) => i.examples.length);
  for (const i of withExamples.slice(0, 2)) out.push({ type: "listen", text: i.examples[0], item: i.id });
  for (const i of items.filter((x) => x.anti.length).slice(0, 2)) {
    const a = i.anti[0];
    const spot = spotFromAnti(a);
    if (spot) out.push({ type: "spot", ...spot, why: a.why, item: i.id });
  }
  if (opts.speaking && withExamples.length) {
    const i = withExamples[withExamples.length - 1];
    out.push({ type: "speak", text: i.examples[i.examples.length - 1], item: i.id });
  }
  return out;
}

/** Finds the differing middle of a wrong/right pair so the learner taps just the wrong words. */
export function spotFromAnti(a: AntiExample): { sentence: string; wrong: string; right: string } | null {
  const w = a.wrong.split(/\s+/);
  const r = a.right.split(/\s*\/\s*/)[0].split(/\s+/);
  let s = 0;
  while (s < w.length && s < r.length && normalize(w[s]) === normalize(r[s])) s++;
  let e = 0;
  while (e < w.length - s && e < r.length - s && normalize(w[w.length - 1 - e]) === normalize(r[r.length - 1 - e])) e++;
  const wrong = w.slice(s, w.length - e).join(" ").replace(/[.,!?]$/, "");
  const right = r.slice(s, r.length - e).join(" ").replace(/[.,!?]$/, "");
  if (!wrong || !right || wrong.split(" ").length > 6) return null;
  return { sentence: a.wrong, wrong, right };
}

/** Review card for one chunk: a gap from its example, or meaning → chunk when no example contains it. */
export function reviewExercise(item: ItemInfo, distractors: ItemInfo[], random = Math.random): Exercise {
  const core = item.chunk.replace(/\s*[…?.!].*$/, "").replace(/ \/ .*$/, "").trim();
  const example = item.examples.find((e) => e.toLowerCase().includes(core.toLowerCase()));
  if (example && core.split(" ").length <= 4 && (!distractors.length || random() < 0.6)) {
    const at = example.toLowerCase().indexOf(core.toLowerCase());
    return { type: "gap", prompt: example.slice(0, at) + "___" + example.slice(at + core.length), answer: core, hint: item.meaning, item: item.id };
  }
  const options = shuffle([item, ...shuffle(distractors, random).slice(0, 3)], random);
  return { type: "choice", prompt: "", options: options.map((o) => o.chunk), answer: options.indexOf(item), item: item.id };
}

/** Old AI quiz questions → the new exercise shape. */
export function fromQuestion(q: Question | Exercise): Exercise {
  if (q.type === "choice" && !("why" in q)) {
    const e = "explanation" in q ? q.explanation : undefined;
    return { type: "choice", prompt: q.prompt, options: q.options, answer: q.answer, why: e ? { ru: e, en: e, uz: e } : undefined };
  }
  if (q.type === "order" && "prompt" in q && typeof q.prompt === "string") return { type: "order", answer: q.answer, hint: { ru: q.prompt, en: q.prompt, uz: q.prompt } };
  if (q.type === "translate" && "prompt" in q) return { type: "translate", from: { ru: q.prompt, en: q.prompt, uz: q.prompt }, answer: q.answer, accept: q.accept };
  const l3 = (e?: string) => (e ? { ru: e, en: e, uz: e } : undefined);
  if (q.type === "gap" && "explanation" in q) return { type: "gap", prompt: q.prompt, answer: q.answer, accept: q.accept };
  if (q.type === "spot" && "explanation" in q) return { type: "spot", sentence: q.sentence, wrong: q.wrong, right: q.right, why: l3(q.explanation)! };
  if (q.type === "dialogue" && "explanation" in q) return { type: "dialogue", line: q.line, options: q.options, answer: q.answer, why: l3(q.explanation) };
  return q as Exercise;
}

/* ───────────── Checking ───────────── */

export type Response =
  | { kind: "index"; value: number }
  | { kind: "text"; value: string }
  /** Order tokens as "index:word". */
  | { kind: "words"; value: string[] }
  | { kind: "spot"; value: number[] }
  | { kind: "match"; mistakes: number };

export type Verdict = { ok: boolean; answer?: string; given?: string };

export const words = (s: string) => s.split(/\s+/).filter(Boolean);

/** Word indexes (in `words(sentence)`) covered by the wrong fragment. */
export function spotRange(sentence: string, wrong: string) {
  const ws = words(sentence).map(normalize);
  const target = words(wrong).map(normalize);
  for (let i = 0; i + target.length <= ws.length; i++) if (target.every((t, j) => ws[i + j] === t)) return Array.from({ length: target.length }, (_, j) => i + j);
  return [];
}

export function check(ex: Exercise, r: Response): Verdict {
  switch (ex.type) {
    case "choice":
    case "collocate":
    case "dialogue": {
      const ok = r.kind === "index" && r.value === ex.answer;
      return { ok, answer: ex.options[ex.answer], given: r.kind === "index" ? ex.options[r.value] : undefined };
    }
    case "gap":
    case "translate":
    case "listen": {
      const answer = ex.type === "listen" ? ex.text : ex.answer;
      const given = r.kind === "text" ? r.value : "";
      return { ok: matches(given, answer, ex.accept), answer, given };
    }
    case "order": {
      const given = r.kind === "words" ? r.value.map((w) => w.slice(w.indexOf(":") + 1)).join(" ") : "";
      return { ok: normalize(given) === normalize(ex.answer), answer: ex.answer, given };
    }
    case "spot": {
      const range = spotRange(ex.sentence, ex.wrong);
      const picked = r.kind === "spot" ? r.value : [];
      const ok = picked.length > 0 && picked.every((i) => range.includes(i));
      return { ok, answer: ex.right };
    }
    case "match":
      return { ok: r.kind === "match" && r.mistakes <= 1 };
    case "speak": {
      const target = words(normalize(ex.text));
      const heard = new Set(words(normalize(r.kind === "text" ? r.value : "")));
      const hit = target.filter((w) => heard.has(w)).length / Math.max(1, target.length);
      return { ok: hit >= 0.7, answer: ex.text, given: r.kind === "text" ? r.value : "" };
    }
  }
}

/**
 * What goes into the mistake bank for a wrong answer: blanks are filled into the sentence so the
 * entry makes sense on its own later. Mishearing (listen) and speaking aren't language mistakes.
 */
export function bankEntry(ex: Exercise, v: Verdict): { given?: string; answer?: string } {
  if (v.ok || ex.type === "listen" || ex.type === "speak" || !v.given || !v.answer) return {};
  const prompt = ex.type === "gap" || ex.type === "choice" || ex.type === "collocate" ? ex.prompt : "";
  if (prompt.includes("___")) return { given: prompt.replace("___", v.given), answer: prompt.replace("___", v.answer) };
  return { given: v.given, answer: v.answer };
}

/** Length of the expected answer, used to normalise answer time for SRS grading. */
export function answerLength(ex: Exercise) {
  if ("answer" in ex && typeof ex.answer === "string") return ex.answer.length;
  if (ex.type === "listen" || ex.type === "speak") return ex.text.length;
  if (ex.type === "match") return 30;
  return 8;
}
