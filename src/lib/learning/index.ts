import "server-only";
import { db } from "../db";
import { LEVELS, levelIndex } from "../levels";
import { PHRASES } from "../content/phrases";
import type { Level } from "../levels";

type Loc = "ru" | "en" | "uz";

export function topicTitle(t: { titleRu: string; titleEn: string; titleUz: string }, locale: string) {
  return locale === "en" ? t.titleEn : locale === "uz" ? t.titleUz : t.titleRu;
}

export function topicDesc(t: { descRu: string; descEn: string; descUz: string }, locale: string) {
  return locale === "en" ? t.descEn : locale === "uz" ? t.descUz : t.descRu;
}

/** Builds the Duolingo-style path: topics of the student's level and the next one. */
export async function ensurePlan(user: { id: string; level: string }) {
  const existing = await db.planUnit.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } });
  if (existing.length) return existing;
  const from = levelIndex(user.level);
  const levels = LEVELS.slice(from, from + 2);
  const topics = await db.topic.findMany({ where: { level: { in: [...levels] } }, orderBy: { order: "asc" } });
  await db.planUnit.createMany({
    data: topics.map((t, i) => ({
      userId: user.id,
      order: i,
      topicSlug: t.slug,
      level: t.level,
      status: i === 0 ? "current" : "locked",
    })),
  });
  return db.planUnit.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } });
}

export async function rebuildPlan(userId: string) {
  await db.planUnit.deleteMany({ where: { userId } });
}

export async function completeUnit(unitId: string, ratio: number) {
  const unit = await db.planUnit.findUnique({ where: { id: unitId } });
  if (!unit) return;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : 1;
  await db.planUnit.update({
    where: { id: unitId },
    data: { status: "done", stars: Math.max(stars, unit.stars) },
  });
  if (unit.status !== "done") {
    const next = await db.planUnit.findFirst({
      where: { userId: unit.userId, order: { gt: unit.order }, status: "locked" },
      orderBy: { order: "asc" },
    });
    if (next) await db.planUnit.update({ where: { id: next.id }, data: { status: "current" } });
  }
}

export function randomPhrase(level: Level, exclude?: string) {
  const list = PHRASES[level].filter((p) => p !== exclude);
  return list[Math.floor(Math.random() * list.length)];
}

export function asLang(locale: string): Loc {
  return locale === "en" || locale === "uz" ? locale : "ru";
}
