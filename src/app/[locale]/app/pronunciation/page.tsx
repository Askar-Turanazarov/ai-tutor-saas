import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/plans";
import { randomPhrase } from "@/lib/learning";
import type { Level } from "@/lib/levels";
import { PronunciationView } from "@/components/app/PronunciationView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("pronunciation") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  return <PronunciationView pro={can(user, "pronunciation")} initialPhrase={randomPhrase(user.level as Level)} />;
}
