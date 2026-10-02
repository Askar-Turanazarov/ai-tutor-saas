import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { progressState } from "@/lib/gamification";
import { ProgressView } from "@/components/progress/ProgressView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("progress") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  return <ProgressView state={await progressState(user)} plan={user.plan} />;
}
