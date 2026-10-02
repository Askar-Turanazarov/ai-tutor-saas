import type { Level } from "../levels";

export const PLACEMENT = [
  { prompt: "My sister ___ a doctor.", options: ["are", "is", "am", "be"], answer: 1 },
  { prompt: "We ___ to the cinema last Saturday.", options: ["go", "goes", "went", "gone"], answer: 2 },
  { prompt: "There aren't ___ eggs in the fridge.", options: ["some", "any", "much", "a"], answer: 1 },
  { prompt: "I ___ in Tashkent since 2019.", options: ["live", "am living", "have lived", "lived"], answer: 2 },
  { prompt: "If I ___ rich, I would travel the world.", options: ["am", "were", "will be", "be"], answer: 1 },
  { prompt: "The new metro line ___ next year.", options: ["will be opened", "opens yesterday", "has opened", "is opening yesterday"], answer: 0 },
  { prompt: "By the time we arrived, the film ___.", options: ["started", "has started", "had started", "was start"], answer: 2 },
  { prompt: "Rarely ___ such a convincing argument.", options: ["I have heard", "have I heard", "I heard", "did I heard"], answer: 1 },
];

export function levelFromScore(correct: number): Level {
  if (correct <= 1) return "A1";
  if (correct <= 3) return "A2";
  if (correct <= 5) return "B1";
  if (correct === 6) return "B2";
  if (correct === 7) return "C1";
  return "C2";
}
