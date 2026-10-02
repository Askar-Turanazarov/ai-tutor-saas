import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, getSession } from "@/lib/auth";
import { remainingSeconds } from "@/lib/plans";
import { getSetting } from "@/lib/settings";
import { AppShell } from "@/components/app/AppShell";
import { UsageProvider } from "@/components/app/usage";

export default async function AppLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [user, session] = await Promise.all([getCurrentUser(), getSession()]);
  // No account yet → start as a guest so the tutor can be tried instantly.
  if (!user) nextRedirect(`/api/guest?locale=${locale}`);
  if (!user.onboarded) return redirect({ href: "/onboarding", locale });
  const [remaining, limit] = await Promise.all([remainingSeconds(user), getSetting("free.dailyMinutes")]);
  return (
    <UsageProvider initial={remaining} limitMinutes={Number(limit)}>
      <AppShell
        user={{ name: user.name, plan: user.plan, level: user.level, role: user.role, xp: user.xp, streak: user.streak }}
        impersonating={!!session?.imp}
      >
        {children}
      </AppShell>
    </UsageProvider>
  );
}
