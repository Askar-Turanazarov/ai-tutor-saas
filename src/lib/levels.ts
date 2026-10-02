export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];
export const FREE_LEVELS: Level[] = ["A1", "A2"];

export function levelIndex(l: string) {
  const i = LEVELS.indexOf(l as Level);
  return i < 0 ? 0 : i;
}
