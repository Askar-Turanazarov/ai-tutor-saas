"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Cpu, Gauge, LayoutGrid, SlidersHorizontal, Users, Wallet, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/brand";
import { LocaleSwitcher, ThemeSwitcher } from "@/components/ui/switchers";
import { iconAnims, spring } from "@/components/ui/motion";
import { cn } from "@/lib/cn";

const TABS: { href: string; key: string; icon: LucideIcon; anim: keyof typeof iconAnims }[] = [
  { href: "/admin", key: "overview", icon: Gauge, anim: "tilt" },
  { href: "/admin/users", key: "users", icon: Users, anim: "bounce" },
  { href: "/admin/billing", key: "billing", icon: Wallet, anim: "pop" },
  { href: "/admin/ai", key: "ai", icon: Cpu, anim: "spin" },
  { href: "/admin/content", key: "content", icon: LayoutGrid, anim: "pop" },
  { href: "/admin/settings", key: "settings", icon: SlidersHorizontal, anim: "wiggle" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const isActive = (h: string) => (h === "/admin" ? pathname === "/admin" : pathname.startsWith(h));

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2" aria-label="Ustoz AI">
            <Logo compact />
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent">{t("title")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <LocaleSwitcher size="sm" />
            </div>
            <ThemeSwitcher size="sm" showLabels={false} />
            <Link
              href="/app"
              className="hidden h-8 items-center gap-1 rounded-full px-3 text-[14px] font-medium text-accent hover:bg-fill sm:inline-flex"
            >
              {t("toApp")} <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-5" aria-label={t("title")}>
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className="shrink-0">
                <motion.span
                  whileHover="hover"
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "relative flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium transition-colors",
                    active ? "text-accent" : "text-label-2 hover:text-label",
                  )}
                >
                  {active && <motion.span layoutId="admin-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent-soft" />}
                  <motion.span variants={iconAnims[tab.anim]} className="relative inline-flex">
                    <tab.icon className="size-4" />
                  </motion.span>
                  <span className="relative">{t(tab.key)}</span>
                </motion.span>
              </Link>
            );
          })}
        </nav>
      </header>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
      >
        {children}
      </motion.main>
    </div>
  );
}

export function AdminTitle({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold">{title}</h1>
        {hint && <p className="mt-1 max-w-2xl text-[14px] text-label-2">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
