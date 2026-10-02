import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { lessonAccess, lessonMap, overallRating, skills } from "@/lib/learning/progress";
import { suggestLesson } from "@/lib/learning/adaptive";
import { LessonMap, type MapLesson } from "@/components/learn/LessonMap";
import { personalLessons } from "@/lib/learning/ai-lessons";
import { can } from "@/lib/plans";
import type { L3 } from "@/lib/content/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("path") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const aiAllowed = can(user, "aiLessons");
  const [rows, s, mine] = await Promise.all([lessonMap(user.id), skills(user), aiAllowed ? personalLessons(user.id) : []]);
  const pick = (l: L3) => l[locale as keyof L3] ?? l.en;

  const lessons = rows.map((r) => {
    const access = lessonAccess(user, r);
    return {
      id: r.id,
      slug: r.slug,
      level: r.level,
      order: r.order,
      icon: r.icon,
      difficulty: r.difficulty,
      title: pick({ ru: r.titleRu, en: r.titleEn, uz: r.titleUz }),
      canDo: pick(JSON.parse(r.canDo) as L3),
      access,
      done: r.progress?.status === "done",
      started: r.progress?.status === "started",
      stars: r.progress?.stars ?? 0,
    };
  });
  const started = lessons.find((l) => l.started && l.access === "open");
  const next = started ?? suggestLesson(lessons.filter((l) => l.access === "open"), overallRating(s));

  return (
    <LessonMap
      lessons={lessons.map((l): MapLesson => ({ ...l, recommended: l.id === next?.id }))}
      ai={{
        allowed: aiAllowed,
        level: user.level,
        lessons: mine.map((l) => ({
          slug: l.slug,
          title: pick({ ru: l.titleRu, en: l.titleEn, uz: l.titleUz }),
          level: l.level,
          icon: l.icon,
          done: l.progress?.status === "done",
          stars: l.progress?.stars ?? 0,
        })),
      }}
    />
  );
}
