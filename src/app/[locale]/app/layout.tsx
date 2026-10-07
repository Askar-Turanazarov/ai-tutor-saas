import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, getSession, isGuest } from "@/lib/auth";
import { remainingSeconds } from "@/lib/plans";
import { limit } from "@/lib/billing/limits";
import { pendingCelebrations } from "@/lib/gamification";
import { AppShell } from "@/components/app/AppShell";
import { UsageProvider } from "@/components/app/usage";
import { VerifyBanner } from "@/components/app/VerifyBanner";

export default async function AppLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [user, session] = await Promise.all([getCurrentUser(), getSession()]);
  // No account yet → start as a guest so the tutor can be tried instantly.
  if (!user) nextRedirect(`/api/guest?locale=${locale}`);
  if (!user.onboarded) return redirect({ href: "/onboarding", locale });
  const [remaining, minutes, celebrations, notes] = await Promise.all([
    remainingSeconds(user),
    limit(user, "dailyMinutes"),
    pendingCelebrations(user),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <UsageProvider initial={remaining} limitMinutes={minutes ?? 0}>
      <AppShell
        user={{ name: user.name, plan: user.plan, level: user.level, role: user.role, xp: user.xp, streak: user.streak, guest: isGuest(user) }}
        impersonating={!!session?.imp}
        celebrations={celebrations}
        notifications={notes.map((n) => ({ id: n.id, type: n.type, params: n.params, createdAt: n.createdAt.toISOString(), read: !!n.readAt }))}
      >
        {!isGuest(user) && !user.emailVerifiedAt && !session?.imp && <VerifyBanner email={user.email} />}
        {children}
      </AppShell>
    </UsageProvider>
  );
}
