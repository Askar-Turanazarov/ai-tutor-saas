import type { AntiExample, ChunkKind, ItemSeed, L3, MissionGoal } from "../types";

export const l3 = (ru: string, en: string, uz: string): L3 => ({ ru, en, uz });

export const anti = (wrong: string, right: string, ru: string, en: string, uz: string): AntiExample => ({
  wrong,
  right,
  why: { ru, en, uz },
});

export function item(
  key: string,
  chunk: string,
  kind: ChunkKind,
  meaning: [ru: string, en: string, uz: string],
  examples: string[],
  extra: Partial<Pick<ItemSeed, "anti" | "register" | "shift">> = {},
): ItemSeed {
  return { key, chunk, kind, meaning: l3(...meaning), examples, ...extra };
}

export const goal = (id: string, text: [ru: string, en: string, uz: string], keywords: string[]): MissionGoal => ({
  id,
  text: l3(...text),
  keywords,
});
