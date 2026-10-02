import { z } from "zod";

export const CorrectionSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  explanation: z.string(),
  category: z.string().optional().default("grammar"),
  rule: z.string().optional(),
  examples: z.array(z.string()).optional(),
});
export type Correction = z.infer<typeof CorrectionSchema>;

export const TipSchema = z.object({
  word: z.string(),
  ipa: z.string().optional().default(""),
  tip: z.string(),
});
export type Tip = z.infer<typeof TipSchema>;

export const ChatOutSchema = z.object({
  reply: z.string().min(1),
  corrections: z.array(CorrectionSchema).optional().default([]),
  tips: z.array(TipSchema).optional().default([]),
});
export type ChatOut = z.infer<typeof ChatOutSchema>;

export const QuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("choice"),
    prompt: z.string(),
    options: z.array(z.string()).min(2).max(5),
    answer: z.number().int().min(0),
    explanation: z.string().optional(),
  }),
  z.object({
    type: z.literal("order"),
    prompt: z.string(),
    answer: z.string(),
  }),
  z.object({
    type: z.literal("translate"),
    prompt: z.string(),
    answer: z.string(),
    accept: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("speak"),
    text: z.string(),
  }),
]);
export type Question = z.infer<typeof QuestionSchema>;

export const QuizSchema = z.object({
  title: z.string(),
  questions: z
    .array(QuestionSchema)
    .min(4)
    .refine((qs) => qs.every((q) => q.type !== "choice" || q.answer < q.options.length), "answer out of range"),
});
export type QuizData = z.infer<typeof QuizSchema>;

export const PronunciationOutSchema = z.object({
  summary: z.string(),
  tips: z.array(TipSchema).default([]),
});
export type PronunciationOut = z.infer<typeof PronunciationOutSchema>;

export const PingSchema = z.object({ reply: z.string() });

/* ───────────── Lessons (bank shape, also what AI-generated lessons must match) ───────────── */

const L3Schema = z.object({ ru: z.string(), en: z.string(), uz: z.string() });
const ref = { item: z.string().optional() };

export const ExerciseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("choice"), prompt: z.string(), options: z.array(z.string()).min(2).max(5), answer: z.number().int().min(0), why: L3Schema.optional(), ...ref }),
  z.object({ type: z.literal("gap"), prompt: z.string().includes("___"), answer: z.string(), accept: z.array(z.string()).optional(), hint: L3Schema.optional(), ...ref }),
  z.object({ type: z.literal("collocate"), prompt: z.string().includes("___"), options: z.array(z.string()).min(2).max(5), answer: z.number().int().min(0), why: L3Schema.optional(), ...ref }),
  z.object({ type: z.literal("order"), answer: z.string(), hint: L3Schema.optional(), ...ref }),
  z.object({ type: z.literal("translate"), from: L3Schema, answer: z.string(), accept: z.array(z.string()).optional(), ...ref }),
  z.object({ type: z.literal("spot"), sentence: z.string(), wrong: z.string(), right: z.string(), why: L3Schema, ...ref }),
  z.object({ type: z.literal("dialogue"), line: z.string(), options: z.array(z.string()).min(2).max(4), answer: z.number().int().min(0), why: L3Schema.optional(), ...ref }),
  z.object({ type: z.literal("match"), items: z.array(z.string()).min(3) }),
  z.object({ type: z.literal("listen"), text: z.string(), accept: z.array(z.string()).optional(), ...ref }),
  z.object({ type: z.literal("speak"), text: z.string(), ...ref }),
]);

export const LessonSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: L3Schema,
  icon: z.string().default("Sparkles"),
  situation: L3Schema,
  canDo: L3Schema,
  items: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9-]+$/),
        chunk: z.string(),
        kind: z.enum(["collocation", "phrasal", "idiom", "fixed", "word"]),
        meaning: L3Schema,
        examples: z.array(z.string()).min(1),
        anti: z.array(z.object({ wrong: z.string(), right: z.string(), why: L3Schema })).optional(),
        register: z.enum(["neutral", "informal", "formal"]).optional(),
      }),
    )
    .min(6)
    .max(14),
  exercises: z.array(ExerciseSchema).min(6),
  mission: z.object({
    role: z.string(),
    scene: L3Schema,
    opener: z.string(),
    goals: z.array(z.object({ id: z.string(), text: L3Schema, keywords: z.array(z.string()) })).min(2).max(5),
    script: z.array(z.string()).default([]),
  }),
});
export type LessonData = z.infer<typeof LessonSchema>;
