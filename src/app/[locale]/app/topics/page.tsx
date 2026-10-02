import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessTopic } from "@/lib/plans";
import { topicDesc, topicTitle } from "@/lib/learning";
import { TopicsGrid } from "@/components/app/TopicsGrid";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("topics") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const topics = await db.topic.findMany({ orderBy: { order: "asc" } });
  return (
    <TopicsGrid
      userLevel={user.level}
      topics={topics.map((t) => ({
        slug: t.slug,
        icon: t.icon,
        level: t.level,
        title: topicTitle(t, locale),
        desc: topicDesc(t, locale),
        locked: !canAccessTopic(user, t),
      }))}
    />
  );
}
