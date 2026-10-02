import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/plans";
import { ensurePlan, topicTitle } from "@/lib/learning";
import { PathView } from "@/components/app/PathView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("path") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const pro = can(user, "path");
  const units = pro ? await ensurePlan(user) : [];
  const topics = await db.topic.findMany();
  const bySlug = new Map(topics.map((t) => [t.slug, t]));

  const demo = topics
    .filter((t) => t.level === "A1" || t.level === "A2")
    .slice(0, 6)
    .map((t, i) => ({ id: t.slug, title: topicTitle(t, locale), icon: t.icon, level: t.level, status: i < 2 ? "done" : i === 2 ? "current" : "locked", stars: i < 2 ? 3 - i : 0 }));

  return (
    <PathView
      pro={pro}
      units={
        pro
          ? units.map((u) => {
              const tp = bySlug.get(u.topicSlug);
              return {
                id: u.id,
                title: tp ? topicTitle(tp, locale) : u.topicSlug,
                icon: tp?.icon ?? "BookOpen",
                level: u.level,
                status: u.status,
                stars: u.stars,
              };
            })
          : demo
      }
    />
  );
}
