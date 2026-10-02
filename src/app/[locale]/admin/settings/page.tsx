import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllSettings } from "@/lib/settings";
import { AdminTitle } from "@/components/admin/AdminShell";
import { SettingsAdmin } from "@/components/admin/SettingsAdmin";
import { PlanSettings } from "@/components/admin/PlanSettings";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const settings = await getAllSettings();
  return (
    <>
      <AdminTitle title={t("settings")} />
      <div className="space-y-6">
        <SettingsAdmin settings={settings} />
        <PlanSettings settings={settings} />
      </div>
    </>
  );
}
