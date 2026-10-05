import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { isPro } from "@/lib/plans";
import { PLACEMENT } from "@/lib/content/placement";
import { Ornament } from "@/components/ui/brand";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/api/guest?locale=${locale}`);
  return (
    <div className="relative flex min-h-dvh items-start justify-center px-4 py-10 sm:items-center">
      <Ornament className="absolute inset-0 h-full w-full text-teal opacity-[0.06]" />
      <Onboarding
        name={user.name}
        isPro={isPro(user)}
        questions={PLACEMENT.map(({ prompt, options }) => ({ prompt, options }))}
      />
    </div>
  );
}
