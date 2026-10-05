import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import { billingConfig } from "@/lib/billing/config";
import { isLifetimePro } from "@/lib/billing/service";
import { UpgradeView } from "@/components/app/UpgradeView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "upgrade" });
  return { title: t("title") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const cfg = await billingConfig();
  return (
    <UpgradeView
      prices={cfg.prices}
      providers={cfg.providers}
      lifetime={isLifetimePro(user)}
      activeUntil={isPro(user) && user.proUntil ? user.proUntil.toISOString() : null}
    />
  );
}
