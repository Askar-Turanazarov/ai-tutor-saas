import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { atLeast, canAccessTopic, dailyLimitSeconds, usageToday } from "@/lib/plans";
import { tashkentHour } from "@/lib/time";
import { topicDesc, topicTitle } from "@/lib/learning";
import { levelIndex } from "@/lib/levels";
import { Dashboard } from "@/components/app/Dashboard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("home") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });

  const [used, limit, mistakes, topics] = await Promise.all([
    usageToday(user.id),
    dailyLimitSeconds(user),
    db.mistake.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.topic.findMany({ orderBy: { order: "asc" } }),
  ]);
  const hour = tashkentHour();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const li = levelIndex(user.level);
  const recommended = topics
    .filter((t) => canAccessTopic(user, t) && Math.abs(levelIndex(t.level) - li) <= 1)
    .sort((a, b) => Math.abs(levelIndex(a.level) - li) - Math.abs(levelIndex(b.level) - li))
    .slice(0, 3);

  return (
    <Dashboard
      greeting={greeting}
      user={{ name: user.name, level: user.level, xp: user.xp, streak: user.streak, pro: atLeast(user, "PLUS") }}
      usedSeconds={used}
      limitSeconds={limit}
      mistakes={mistakes.map((m) => ({ id: m.id, original: m.original, corrected: m.corrected, explanation: m.explanation }))}
      topics={recommended.map((t) => ({
        slug: t.slug,
        icon: t.icon,
        level: t.level,
        title: topicTitle(t, locale),
        desc: topicDesc(t, locale),
      }))}
    />
  );
}
