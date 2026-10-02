import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, getSession, isGuest } from "@/lib/auth";
import { remainingSeconds } from "@/lib/plans";
import { limit } from "@/lib/billing/limits";
import { pendingCelebrations } from "@/lib/gamification";
import { AppShell } from "@/components/app/AppShell";
import { UsageProvider } from "@/components/app/usage";

export default async function AppLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [user, session] = await Promise.all([getCurrentUser(), getSession()]);
  // No account yet → start as a guest so the tutor can be tried instantly.
  if (!user) nextRedirect(`/api/guest?locale=${locale}`);
  if (!user.onboarded) return redirect({ href: "/onboarding", locale });
  const [remaining, minutes, celebrations] = await Promise.all([remainingSeconds(user), limit(user, "dailyMinutes"), pendingCelebrations(user)]);
  return (
    <UsageProvider initial={remaining} limitMinutes={minutes ?? 0}>
      <AppShell
        user={{ name: user.name, plan: user.plan, level: user.level, role: user.role, xp: user.xp, streak: user.streak, guest: isGuest(user) }}
        impersonating={!!session?.imp}
        celebrations={celebrations}
      >
        {children}
      </AppShell>
    </UsageProvider>
  );
}
