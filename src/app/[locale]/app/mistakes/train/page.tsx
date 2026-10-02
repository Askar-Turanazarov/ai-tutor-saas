import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/plans";
import { PracticeSession } from "@/components/learn/PracticeSession";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "mistakes" });
  return { title: t("train") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  if (!can(user, "mistakeTraining")) return redirect({ href: "/app/mistakes", locale });
  return <PracticeSession kind="mistakes" />;
}
