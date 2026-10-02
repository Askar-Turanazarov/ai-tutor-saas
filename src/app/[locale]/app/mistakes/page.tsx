import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/plans";
import { MistakesView } from "@/components/learn/MistakesView";

/** Free sees only the latest mistakes; the full bank comes with training. */
const FREE_VISIBLE = 10;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("mistakes") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const full = can(user, "mistakeTraining");
  const [rows, active, resolved] = await Promise.all([
    db.mistake.findMany({ where: { userId: user.id }, orderBy: [{ resolvedAt: "asc" }, { updatedAt: "desc" }], take: full ? 300 : FREE_VISIBLE }),
    db.mistake.count({ where: { userId: user.id, resolvedAt: null } }),
    db.mistake.count({ where: { userId: user.id, resolvedAt: { not: null } } }),
  ]);
  return (
    <MistakesView
      rows={rows.map((m) => ({ id: m.id, original: m.original, corrected: m.corrected, explanation: m.explanation, category: m.category, source: m.source, hits: m.hits, streak: m.streak, resolved: !!m.resolvedAt }))}
      active={active}
      resolved={resolved}
      canTrain={full}
      limited={!full && active + resolved > FREE_VISIBLE}
    />
  );
}
