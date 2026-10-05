import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, getSession } from "@/lib/auth";
import { isPro, remainingSeconds } from "@/lib/plans";
import { db } from "@/lib/db";
import { billingConfig } from "@/lib/billing/config";
import { currentSubscription } from "@/lib/billing/service";
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
  const [remaining, limit, notes, sub, cfg] = await Promise.all([
    remainingSeconds(user),
    getSetting("free.dailyMinutes"),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    currentSubscription(user.id),
    billingConfig(),
  ]);
  // Banner: a failed renewal, or Pro ending soon without auto-renewal.
  const end = sub?.currentPeriodEnd;
  const soon = !!end && end.getTime() - Date.now() < cfg.noticeDays * 86_400_000;
  const alert =
    sub && end && isPro(user)
      ? sub.status === "past_due"
        ? { kind: "past_due" as const, end: end.toISOString() }
        : soon && !sub.autoRenew
          ? { kind: "expiring" as const, end: end.toISOString() }
          : null
      : null;
  return (
    <UsageProvider initial={remaining} limitMinutes={Number(limit)}>
      <AppShell
        user={{ name: user.name, plan: isPro(user) ? "PRO" : "FREE", level: user.level, role: user.role, xp: user.xp, streak: user.streak }}
        impersonating={!!session?.imp}
        notifications={notes.map((n) => ({ id: n.id, type: n.type, params: n.params, createdAt: n.createdAt.toISOString(), read: !!n.readAt }))}
        alert={alert}
      >
        {children}
      </AppShell>
    </UsageProvider>
  );
}
