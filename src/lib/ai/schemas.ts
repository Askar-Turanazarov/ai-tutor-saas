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
