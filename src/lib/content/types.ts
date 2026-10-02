/**
 * Shapes of the lesson bank. The same shapes are stored as JSON in the Lesson table and
 * validated by zod (src/lib/ai/schemas.ts) when a lesson comes from an AI model.
 */
import type { Level } from "../levels";

export type L3 = { ru: string; en: string; uz: string };

export type ChunkKind = "collocation" | "phrasal" | "idiom" | "fixed" | "word";

/** A wrong but tempting usage and why native speakers don't say it. */
export type AntiExample = { wrong: string; right: string; why: L3 };

export type ItemSeed = {
  /** Short key unique inside the lesson; the full id is `${lesson.slug}.${key}`. */
  key: string;
  chunk: string;
  kind: ChunkKind;
  meaning: L3;
  examples: string[];
  anti?: AntiExample[];
  register?: "neutral" | "informal" | "formal";
  /** Offset from the lesson difficulty, −60…+60. */
  shift?: number;
};

/**
 * Hand-written exercises. `item` points to an ItemSeed key, so a wrong answer can be
 * traced back to a chunk (SRS lapse, mistake bank). More exercises are derived from the
 * items themselves (match, listen, spot the error, speak) — see src/lib/learning/exercises.ts.
 */
export type Exercise =
  | { type: "choice"; prompt: string; options: string[]; answer: number; why?: L3; item?: string }
  /** Fill the gap ("___") by typing. */
  | { type: "gap"; prompt: string; answer: string; accept?: string[]; hint?: L3; item?: string }
  /** Pick the verb/word that goes with the chunk: "___ a photo" → take. */
  | { type: "collocate"; prompt: string; options: string[]; answer: number; why?: L3; item?: string }
  /** Build the sentence from shuffled words; `hint` is the translation. */
  | { type: "order"; answer: string; hint?: L3; item?: string }
  | { type: "translate"; from: L3; answer: string; accept?: string[]; item?: string }
  /** Tap the wrong word(s): `wrong` is the exact substring of `sentence`. */
  | { type: "spot"; sentence: string; wrong: string; right: string; why: L3; item?: string }
  /** Choose the best reply in a short dialogue. */
  | { type: "dialogue"; line: string; options: string[]; answer: number; why?: L3; item?: string }
  | { type: "match"; items: string[] }
  | { type: "listen"; text: string; accept?: string[]; item?: string }
  | { type: "speak"; text: string; item?: string };

export type ExerciseType = Exercise["type"];

export type MissionGoal = {
  id: string;
  text: L3;
  /** Any of these (lower-case) phrases in the learner's message counts the goal as done. */
  keywords: string[];
};

/** The role-play at the end of a lesson. */
export type Mission = {
  /** Who the AI plays, in English: "a waiter in a chaikhana in Tashkent". */
  role: string;
  scene: L3;
  opener: string;
  goals: MissionGoal[];
  /** Offline replies used without an AI model, in order. */
  script: string[];
};

export type LessonSeed = {
  slug: string;
  level: Level;
  icon: string;
  title: L3;
  situation: L3;
  canDo: L3;
  items: ItemSeed[];
  exercises: Exercise[];
  mission: Mission;
  minTier?: "FREE" | "PLUS" | "PRO";
};

/** Elo baseline for a level: A1 400 … C2 900. */
export const levelRating = (level: string) => 400 + 100 * Math.max(0, ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(level));
