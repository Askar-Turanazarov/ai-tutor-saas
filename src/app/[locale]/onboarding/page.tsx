import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/plans";
import { getCurrentUser } from "@/lib/auth";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { PLACEMENT } from "@/lib/content/placement";
import { OrnamentStage } from "@/components/decor/OrnamentStage";
import { SiteFooter } from "@/components/shell/SiteFooter";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/api/guest?locale=${locale}`);
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-4">
      <OrnamentStage tone="teal" />
      <div className="flex flex-1 items-start justify-center py-10 sm:items-center">
        <Onboarding
          name={user.name}
          isPro={can(user, "allLevels")}
          questions={PLACEMENT.map(({ prompt, options }) => ({ prompt, options }))}
        />
      </div>
      <SiteFooter className="relative" />
    </div>
  );
}
