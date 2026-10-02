import { levelRating, type Exercise, type LessonSeed } from "../types";
import { A1_LESSONS } from "./a1";
import { A2_LESSONS } from "./a2";

export const LESSONS: LessonSeed[] = [...A1_LESSONS, ...A2_LESSONS];

const KIND_SHIFT = { fixed: -20, word: -10, collocation: 0, phrasal: 20, idiom: 40 } as const;

/** Turns the hand-written bank into DB rows. Item keys become global ids `${slug}.${key}`. */
export function lessonRows(lessons: LessonSeed[] = LESSONS) {
  const items = [];
  const rows = [];
  const orderInLevel: Record<string, number> = {};
  for (const l of lessons) {
    const order = (orderInLevel[l.level] = (orderInLevel[l.level] ?? -1) + 1);
    const difficulty = levelRating(l.level) + order * 8;
    const id = (key: string) => `${l.slug}.${key}`;
    for (const it of l.items) {
      items.push({
        id: id(it.key),
        chunk: it.chunk,
        kind: it.kind,
        level: l.level,
        difficulty: difficulty + (it.shift ?? KIND_SHIFT[it.kind]),
        meaningRu: it.meaning.ru,
        meaningEn: it.meaning.en,
        meaningUz: it.meaning.uz,
        examples: JSON.stringify(it.examples),
        antiExamples: JSON.stringify(it.anti ?? []),
        register: it.register ?? "neutral",
        tags: l.slug,
      });
    }
    const exercises = l.exercises.map((e): Exercise =>
      e.type === "match" ? { ...e, items: e.items.map(id) } : "item" in e && e.item ? { ...e, item: id(e.item) } : e,
    );
    rows.push({
      slug: l.slug,
      level: l.level,
      order,
      difficulty,
      icon: l.icon,
      titleRu: l.title.ru,
      titleEn: l.title.en,
      titleUz: l.title.uz,
      situation: JSON.stringify(l.situation),
      canDo: JSON.stringify(l.canDo),
      itemIds: JSON.stringify(l.items.map((it) => id(it.key))),
      exercises: JSON.stringify(exercises),
      mission: JSON.stringify(l.mission),
      minTier: l.minTier ?? "FREE",
    });
  }
  return { items, rows };
}
