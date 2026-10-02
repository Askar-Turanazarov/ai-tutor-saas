"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  AudioLines,
  Crown,
  House,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Route,
  Settings,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo, LogoMark } from "@/components/ui/brand";
import { Badge } from "@/components/ui/primitives";
import { LocaleCycleButton, LocaleSwitcher, ThemeCycleButton, ThemeSwitcher } from "@/components/ui/switchers";
import { iconAnims, spring } from "@/components/ui/motion";
import { logout, stopImpersonating } from "@/app/actions/auth";
import { cn } from "@/lib/cn";
import { useUsage } from "./usage";

type NavItem = { href: string; icon: LucideIcon; key: string; anim: keyof typeof iconAnims; pro?: boolean };

const NAV: NavItem[] = [
  { href: "/app", icon: House, key: "home", anim: "bounce" },
  { href: "/app/chat", icon: MessageCircle, key: "chat", anim: "wiggle" },
  { href: "/app/topics", icon: LayoutGrid, key: "topics", anim: "spin" },
  { href: "/app/path", icon: Route, key: "path", anim: "tilt", pro: true },
  { href: "/app/pronunciation", icon: AudioLines, key: "pronunciation", anim: "bounce", pro: true },
];

export type ShellUser = { name: string; plan: string; level: string; role: string; xp: number; streak: number };

export function AppShell({
  user,
  impersonating,
  children,
}: {
  user: ShellUser;
  impersonating: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  // Path and pronunciation open from Plus; the upsell card is for Free only.
  const pro = user.plan !== "FREE";
  // Quizzes are a focused, full-screen flow: no tab bar competing with the answer buttons.
  const focus = pathname.startsWith("/app/quiz/");

  return (
    <div className="min-h-dvh">
      {impersonating && <ImpersonationBar name={user.name} />}
      <Sidebar user={user} isActive={isActive} pro={pro} />
      <MobileTopBar user={user} />
      <main className={cn("lg:pb-10 lg:pl-[264px]", focus ? "pb-6" : "pb-28")}>
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 lg:pt-10">{children}</div>
      </main>
      {!focus && <TabBar isActive={isActive} />}
    </div>
  );
}

function Sidebar({ user, isActive, pro }: { user: ShellUser; isActive: (h: string) => boolean; pro: boolean }) {
  const t = useTranslations();
  return (
    <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r px-4 py-6 lg:flex">
      <Link href="/" className="px-3" aria-label="Ustoz AI">
        <Logo />
      </Link>
      <nav className="mt-8 flex flex-col gap-1" aria-label={t("common.menu")}>
        {[...NAV, { href: "/app/settings", icon: Settings, key: "settings", anim: "spin" } as NavItem].map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              <motion.span
                whileHover="hover"
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-medium transition-colors",
                  active ? "text-accent" : "text-label-2 hover:text-label",
                )}
              >
                {active && (
                  <motion.span layoutId="side-pill" transition={spring} className="absolute inset-0 rounded-[12px] bg-accent-soft" />
                )}
                <motion.span variants={iconAnims[item.anim]} className="relative z-10 inline-flex">
                  <item.icon className="size-[20px]" strokeWidth={active ? 2.3 : 2} />
                </motion.span>
                <span className="relative z-10 flex-1">{t(`nav.${item.key}`)}</span>
                {item.pro && !pro && (
                  <span className="relative z-10">
                    <Crown className="size-3.5 text-gold" aria-label={t("common.locked")} />
                  </span>
                )}
              </motion.span>
            </Link>
          );
        })}
        {user.role === "ADMIN" && (
          <Link href="/admin" className="mt-1 flex h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-medium text-label-2 hover:bg-fill hover:text-label">
            <Shield className="size-[20px]" />
            {t("common.admin")}
          </Link>
        )}
      </nav>

      <div className="mt-auto space-y-3">
        {!pro && (
          <Link href="/app/plans" className="block">
            <motion.div
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-accent-solid to-teal p-4 text-white"
            >
              <motion.span variants={iconAnims.tilt} className="inline-flex">
                <Sparkles className="size-5" />
              </motion.span>
              <div className="mt-2 text-[15px] font-semibold">{t("dashboard.upsellTitle")}</div>
              <div className="mt-0.5 text-[12px] leading-snug text-white/80">{t("dashboard.upsellText")}</div>
            </motion.div>
          </Link>
        )}
        {/* Quiet, always-visible display prefs: no trip to Settings needed. */}
        <div className="flex items-center justify-between gap-1 border-t border-separator pt-3">
          <ThemeSwitcher size="sm" showLabels={false} />
          <LocaleSwitcher size="sm" persist />
        </div>
        <UserChip user={user} />
      </div>
    </aside>
  );
}

function UserChip({ user }: { user: ShellUser }) {
  const t = useTranslations("common");
  return (
    <div className="flex items-center gap-3 rounded-[14px] p-2">
      <Avatar name={user.name} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{user.name}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge tone={user.plan === "PRO" ? "accent" : "neutral"} className="px-1.5 py-0 text-[11px]">
            {user.plan === "PRO" ? "Pro" : "Free"}
          </Badge>
          <span className="text-[12px] text-label-2">{user.level}</span>
        </div>
      </div>
      <form action={logout}>
        <button
          type="submit"
          aria-label={t("logout")}
          title={t("logout")}
          className="grid size-9 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill hover:text-label"
        >
          <LogOut className="size-[18px]" />
        </button>
      </form>
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-solid/90 to-teal font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "U"}
    </span>
  );
}

function MobileTopBar({ user }: { user: ShellUser }) {
  const { remaining } = useUsage();
  const t = useTranslations();
  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 lg:hidden">
      <Link href="/app" aria-label="Ustoz AI">
        <LogoMark size={28} />
      </Link>
      <div className="flex-1" />
      <div className="-mr-1 flex items-center">
        <LocaleCycleButton />
        <ThemeCycleButton />
      </div>
      {remaining !== null && (
        <Badge tone={remaining < 120 ? "gold" : "neutral"}>{t("dashboard.minutesLeft", { n: Math.ceil(remaining / 60) })}</Badge>
      )}
      {user.role === "ADMIN" && (
        <Link href="/admin" aria-label={t("common.admin")} className="grid size-9 place-items-center rounded-full text-label-2 hover:bg-fill">
          <Shield className="size-5" />
        </Link>
      )}
      <Link href="/app/settings" aria-label={t("nav.settings")}>
        <Avatar name={user.name} size={32} />
      </Link>
    </header>
  );
}

function TabBar({ isActive }: { isActive: (h: string) => boolean }) {
  const t = useTranslations("nav");
  return (
    <nav
      className="glass fixed inset-x-3 bottom-3 z-40 flex h-[64px] items-center justify-around rounded-[22px] border px-1 shadow-float lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="relative flex h-full flex-1 flex-col items-center justify-center"
          >
            <motion.span whileTap={{ scale: 0.88 }} className="flex flex-col items-center gap-0.5">
              {active && (
                <motion.span layoutId="tab-pill" transition={spring} className="absolute inset-x-1.5 inset-y-1.5 rounded-[16px] bg-accent-soft" />
              )}
              <motion.span
                animate={active ? { y: -1, scale: 1.08 } : { y: 0, scale: 1 }}
                transition={spring}
                className={cn("relative z-10", active ? "text-accent" : "text-label-2")}
              >
                <item.icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.9} />
              </motion.span>
              <span className={cn("relative z-10 text-[10.5px] font-medium", active ? "text-accent" : "text-label-2")}>
                {t(item.key)}
              </span>
            </motion.span>
          </Link>
        );
      })}
    </nav>
  );
}

function ImpersonationBar({ name }: { name: string }) {
  const t = useTranslations("common");
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-gold px-4 py-2 text-[13px] font-medium text-white dark:text-black">
      {t("impersonating", { name })}
      <form action={stopImpersonating}>
        <button type="submit" className="rounded-full bg-black/15 px-3 py-1 font-semibold hover:bg-black/25">
          {t("returnToAdmin")}
        </button>
      </form>
    </div>
  );
}
