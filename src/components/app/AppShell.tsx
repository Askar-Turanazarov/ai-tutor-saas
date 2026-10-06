"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AudioLines, ChevronsUpDown, Crown, House, Layers, LayoutGrid, Medal, MessageCircle, PenLine, Route, Settings, Shield, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo, LogoMark } from "@/components/ui/brand";
import { Badge } from "@/components/ui/primitives";
import { AccountMenu, Avatar, PrefsMenu } from "@/components/shell/menus";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { iconAnims, spring } from "@/components/ui/motion";
import { stopImpersonating } from "@/app/actions/auth";
import { tierLabel } from "@/lib/billing/catalog";
import { cn } from "@/lib/cn";
import { Celebrations } from "@/components/progress/Celebrations";
import { useUsage } from "./usage";
import { NotificationBell, type ShellNotification } from "./Notifications";

/** `tab: false` — sidebar only; the phone tab bar keeps five items (topics open from the chat, mistakes from the deck). */
type NavItem = { href: string; icon: LucideIcon; key: string; anim: keyof typeof iconAnims; pro?: boolean; tab?: false };

const NAV: NavItem[] = [
  { href: "/app", icon: House, key: "home", anim: "bounce" },
  { href: "/app/chat", icon: MessageCircle, key: "chat", anim: "wiggle" },
  { href: "/app/topics", icon: LayoutGrid, key: "topics", anim: "spin", tab: false },
  { href: "/app/path", icon: Route, key: "path", anim: "tilt" },
  { href: "/app/vocab", icon: Layers, key: "vocab", anim: "tilt" },
  { href: "/app/mistakes", icon: PenLine, key: "mistakes", anim: "wiggle", tab: false },
  { href: "/app/progress", icon: Trophy, key: "progress", anim: "bounce", tab: false },
  { href: "/app/league", icon: Medal, key: "league", anim: "pop", tab: false },
  { href: "/app/pronunciation", icon: AudioLines, key: "pronunciation", anim: "bounce", pro: true },
];

export type ShellUser = { name: string; plan: string; level: string; role: string; xp: number; streak: number; guest?: boolean };

export { Avatar };

export function AppShell({
  user,
  impersonating,
  celebrations,
  notifications,
  children,
}: {
  user: ShellUser;
  impersonating: boolean;
  celebrations: { achievements: string[]; level: number | null };
  notifications: ShellNotification[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  // Path and pronunciation open from Plus; the upsell card is for Free only.
  const pro = user.plan !== "FREE";
  // Quizzes are a focused, full-screen flow: no tab bar competing with the answer buttons.
  const focus = /^\/app\/(quiz\/|learn\/|vocab\/review|mistakes\/train)/.test(pathname);

  return (
    <div className="min-h-dvh">
      {impersonating && <ImpersonationBar name={user.name} />}
      <Sidebar user={user} isActive={isActive} pro={pro} notifications={notifications} />
      <MobileTopBar user={user} notifications={notifications} />
      <main className={cn("lg:pb-10 lg:pl-[276px]", focus ? "pb-6" : "pb-28")}>
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 lg:pt-10">{children}</div>
      </main>
      {!focus && <TabBar isActive={isActive} />}
      <Celebrations {...celebrations} paused={focus} />
    </div>
  );
}

function Sidebar({ user, isActive, pro, notifications }: { user: ShellUser; isActive: (h: string) => boolean; pro: boolean; notifications: ShellNotification[] }) {
  const t = useTranslations();
  return (
    <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-[252px] flex-col rounded-[26px] border px-3.5 py-5 shadow-card lg:flex">
      <Link href="/" className="shrink-0 px-3" aria-label="Ustoz AI">
        <Logo />
      </Link>
      {/* Only the menu scrolls on short screens; account, language and theme stay pinned below. */}
      <nav className="-mx-1.5 mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-1.5 pb-2 [scrollbar-width:thin]" aria-label={t("common.menu")}>
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

      <div className="shrink-0 space-y-3 pt-2">
        {!pro && (
          <Link href="/app/plans" className="block [@media(max-height:820px)]:hidden">
            <motion.div
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-accent-solid to-teal-solid p-4 text-white"
            >
              <motion.span variants={iconAnims.tilt} className="inline-flex">
                <Sparkles className="size-5" />
              </motion.span>
              <div className="mt-2 text-[15px] font-semibold">{t("dashboard.upsellTitle")}</div>
              <div className="mt-0.5 text-[12px] leading-snug text-white/80">{t("dashboard.upsellText")}</div>
            </motion.div>
          </Link>
        )}
        <div className="flex items-center gap-1 border-t border-separator pt-3">
          <AccountMenu
            user={user}
            where="app"
            placement="top start"
            className="min-w-0 flex-1 rounded-[14px]"
            trigger={
              <span className="flex min-w-0 items-center gap-2.5 rounded-[14px] p-1.5 text-left transition-colors hover:bg-fill">
                <Avatar name={user.name} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-label">{user.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <Badge tone={user.plan === "FREE" ? "neutral" : "accent"} className="px-1.5 py-0 text-[11px]">
                      {tierLabel(user.plan)}
                    </Badge>
                    <span className="text-[12px] text-label-2">{user.level}</span>
                  </span>
                </span>
                <ChevronsUpDown className="size-4 shrink-0 text-label-3" />
              </span>
            }
          />
          <NotificationBell items={notifications} />
        </div>
        <PrefsMenu persist className="w-full justify-center" />
      </div>
    </aside>
  );
}

function MobileTopBar({ user, notifications }: { user: ShellUser; notifications: ShellNotification[] }) {
  const { remaining } = useUsage();
  const t = useTranslations();
  return (
    <SiteHeader
      className="lg:hidden"
      brandHref="/app"
      brand={<LogoMark size={28} />}
      right={
        <>
          {remaining !== null && (
            <Badge tone={remaining < 120 ? "gold" : "neutral"}>{t("dashboard.minutesLeft", { n: Math.ceil(remaining / 60) })}</Badge>
          )}
          <PrefsMenu persist className="px-2" />
          <NotificationBell items={notifications} />
          <AccountMenu user={user} where="app" />
        </>
      }
    />
  );
}

function TabBar({ isActive }: { isActive: (h: string) => boolean }) {
  const t = useTranslations("nav");
  return (
    <nav
      className="glass-thick glass-refract fixed inset-x-3 bottom-3 z-40 flex h-[64px] items-center justify-around rounded-[22px] border px-1 lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV.filter((item) => item.tab !== false).map((item) => {
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
    <div className="relative z-50 flex items-center justify-center gap-3 bg-gold-solid px-4 py-2 text-[13px] font-medium text-on-solid">
      {t("impersonating", { name })}
      <form action={stopImpersonating}>
        <button type="submit" className="rounded-full bg-black/15 px-3 py-1 font-semibold hover:bg-black/25">
          {t("returnToAdmin")}
        </button>
      </form>
    </div>
  );
}
