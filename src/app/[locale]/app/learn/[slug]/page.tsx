import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/plans";
import { limit, usedToday } from "@/lib/billing/limits";
import { lessonAccess, lessonItems, lessonSession, overallRating, parseLesson, skills } from "@/lib/learning/progress";
import { suggestLesson } from "@/lib/learning/adaptive";
import { LessonPlayer } from "@/components/learn/LessonPlayer";
import type { L3 } from "@/lib/content/types";

const pick3 = (l: L3, locale: string) => l[locale as keyof L3] ?? l.en;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const user = await getCurrentUser();
  const l = await db.lesson.findFirst({ where: { slug, OR: [{ ownerId: null }, ...(user ? [{ ownerId: user.id }] : [])] }, select: { titleRu: true, titleEn: true, titleUz: true } });
  return { title: l ? pick3({ ru: l.titleRu, en: l.titleEn, uz: l.titleUz }, locale) : undefined };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const row = await db.lesson.findFirst({ where: { slug, OR: [{ ownerId: null }, { ownerId: user.id }] } });
  if (!row) notFound();
  const lesson = parseLesson(row);
  const access = lessonAccess(user, lesson);
  const title = pick3({ ru: row.titleRu, en: row.titleEn, uz: row.titleUz }, locale);

  const items = await lessonItems(lesson.itemIds);
  const s = await skills(user);
  const steps = access === "open" ? lessonSession(lesson, items, overallRating(s), can(user, "pronunciation")) : [];

  // Mission: live AI while the daily quota lasts, otherwise the scripted partner.
  const missionsLimit = can(user, "missions") ? await limit(user, "missionsPerDay") : 0;
  const live = missionsLimit === null || (missionsLimit > 0 && (await usedToday(user.id, "missionsPerDay")) < missionsLimit);

  // The next lesson to suggest at the end: same pool as the map, nearest to the learner's rating.
  const [others, progress] = await Promise.all([
    db.lesson.findMany({ where: { ownerId: null, id: { not: row.id } }, select: { slug: true, level: true, minTier: true, difficulty: true, order: true } }),
    db.lessonProgress.findMany({ where: { userId: user.id, status: "done" }, select: { lessonId: true, lesson: { select: { slug: true } } } }),
  ]);
  const done = new Set(progress.map((p) => p.lesson.slug));
  const next = suggestLesson(
    others.filter((o) => lessonAccess(user, o) === "open").map((o) => ({ ...o, id: o.slug, done: done.has(o.slug) })),
    overallRating(s),
  );

  return (
    <LessonPlayer
      slug={lesson.slug}
      title={title}
      level={lesson.level}
      icon={lesson.icon}
      access={access}
      situation={pick3(lesson.situation, locale)}
      canDo={pick3(lesson.canDo, locale)}
      items={items}
      steps={steps}
      mission={{
        role: lesson.mission.role,
        scene: pick3(lesson.mission.scene, locale),
        opener: lesson.mission.opener,
        goals: lesson.mission.goals.map((g) => ({ id: g.id, text: pick3(g.text, locale) })),
      }}
      missionMode={live ? "live" : can(user, "missions") ? "out" : "script"}
      nextSlug={next?.slug ?? null}
    />
  );
}
