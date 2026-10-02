import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { deck } from "@/lib/learning/deck";
import { VocabView } from "@/components/learn/VocabView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("vocab") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const [cards, mistakes] = await Promise.all([deck(user.id), db.mistake.count({ where: { userId: user.id, resolvedAt: null } })]);
  return <VocabView cards={cards} mistakes={mistakes} />;
}
