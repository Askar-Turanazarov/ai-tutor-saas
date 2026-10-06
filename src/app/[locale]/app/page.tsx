import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { atLeast, usageToday } from "@/lib/plans";
import { tashkentHour } from "@/lib/time";
import { lessonAccess, lessonMap, overallRating, skills } from "@/lib/learning/progress";
import { suggestLesson } from "@/lib/learning/adaptive";
import { dueCount } from "@/lib/learning/deck";
import { progressState } from "@/lib/gamification";
import { leagueState } from "@/lib/gamification/league";
import { limitsOf, usedToday } from "@/lib/billing/limits";
import { autoRenews, isForever, isLive } from "@/lib/billing/subscription";
import { tierLabel } from "@/lib/billing/catalog";
import { getSetting } from "@/lib/settings";
import type { L3 } from "@/lib/content/types";
import { Dashboard } from "@/components/app/Dashboard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("home") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });

  const [progress, league, rows, s, due, mistakes, limits, seconds, lessons, reviews, noticeDays] = await Promise.all([
    progressState(user),
    leagueState(user),
    lessonMap(user.id),
    skills(user),
    dueCount(user.id),
    db.mistake.count({ where: { userId: user.id, resolvedAt: null } }),
    limitsOf(user),
    usageToday(user.id),
    usedToday(user.id, "lessonsPerDay"),
    usedToday(user.id, "reviewsPerDay"),
    getSetting("billing.noticeDays"),
  ]);
  // A failed renewal, or a plan that ends soon without auto-renewal.
  const sub = user.subscription;
  const soon = sub && sub.currentPeriodEnd.getTime() - Date.now() < (Number(noticeDays) || 3) * 86_400_000;
  const alert =
    sub && isLive(sub) && sub.status === "past_due" && sub.graceUntil
      ? { kind: "past_due" as const, tier: tierLabel(sub.tier), date: sub.graceUntil.toISOString() }
      : sub && isLive(sub) && soon && !autoRenews(sub) && !isForever(sub)
        ? { kind: "expiring" as const, tier: tierLabel(sub.tier), date: sub.currentPeriodEnd.toISOString() }
        : null;
  const pick = (l: L3) => l[locale as keyof L3] ?? l.en;
  const open = rows.filter((r) => lessonAccess(user, r) === "open").map((r) => ({ ...r, done: r.progress?.status === "done" }));
  const started = open.find((r) => r.progress?.status === "started");
  const next = started ?? suggestLesson(open, overallRating(s));
  const hour = tashkentHour();
  const me = league.rows.find((r) => r.me);

  return (
    <Dashboard
      greeting={hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}
      name={user.name.split(" ")[0]}
      level={user.level}
      progress={progress}
      lesson={
        next && {
          slug: next.slug,
          icon: next.icon,
          level: next.level,
          title: pick({ ru: next.titleRu, en: next.titleEn, uz: next.titleUz }),
          canDo: pick(JSON.parse(next.canDo) as L3),
          started: next.progress?.status === "started",
        }
      }
      due={due}
      mistakes={mistakes}
      league={{ key: league.key, rank: league.rank, size: league.size, xp: me?.xp ?? 0, endsIn: league.endsIn }}
      limits={
        atLeast(user, "PRO")
          ? null
          : {
              plan: user.plan,
              minutes: limits.dailyMinutes === null ? null : { used: Math.floor(seconds / 60), max: limits.dailyMinutes },
              lessons: limits.lessonsPerDay === null ? null : { used: lessons, max: limits.lessonsPerDay },
              reviews: limits.reviewsPerDay === null ? null : { used: reviews, max: limits.reviewsPerDay },
            }
      }
      speaking={atLeast(user, "PLUS")}
      alert={alert}
    />
  );
}
