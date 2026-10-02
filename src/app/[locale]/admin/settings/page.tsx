import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllSettings } from "@/lib/settings";
import { AdminTitle } from "@/components/admin/AdminShell";
import { SettingsAdmin } from "@/components/admin/SettingsAdmin";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <AdminTitle title={t("settings")} />
      <SettingsAdmin settings={await getAllSettings()} />
    </>
  );
}
