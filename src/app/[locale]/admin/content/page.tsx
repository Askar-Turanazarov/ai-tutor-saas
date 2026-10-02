import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { topicTitle } from "@/lib/learning";
import { levelIndex } from "@/lib/levels";
import { AdminTitle } from "@/components/admin/AdminShell";
import { TopicsAdmin } from "@/components/admin/TopicsAdmin";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const topics = await db.topic.findMany({ orderBy: { order: "asc" } });
  topics.sort((a, b) => levelIndex(a.level) - levelIndex(b.level) || a.order - b.order);
  return (
    <>
      <AdminTitle title={t("content")} />
      <TopicsAdmin
        topics={topics.map((tp) => ({ id: tp.id, slug: tp.slug, title: topicTitle(tp, locale), icon: tp.icon, level: tp.level, proOnly: tp.proOnly }))}
      />
    </>
  );
}
