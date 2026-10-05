import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllSettings } from "@/lib/settings";
import { AdminTitle } from "@/components/admin/AdminShell";
import { SettingsAdmin } from "@/components/admin/SettingsAdmin";
import { BillingSettings } from "@/components/admin/BillingSettings";
import { clickMode, stripeConfigured } from "@/lib/billing/config";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const settings = await getAllSettings();
  return (
    <>
      <AdminTitle title={t("settings")} />
      <SettingsAdmin settings={settings} />
      <h2 className="mb-3 mt-10 text-[22px] font-bold">{t("billingSettings")}</h2>
      <BillingSettings settings={settings} stripeReady={stripeConfigured()} clickMode={clickMode()} />
    </>
  );
}
