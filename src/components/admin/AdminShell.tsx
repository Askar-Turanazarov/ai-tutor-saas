"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Cpu, Gauge, LayoutGrid, SlidersHorizontal, Users, Wallet, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/brand";
import { AccountMenu, PrefsMenu, type AccountUser } from "@/components/shell/menus";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { iconAnims, spring } from "@/components/ui/motion";
import { PageHeader } from "@/components/decor/PageHeader";
import { cn } from "@/lib/cn";

const TABS: { href: string; key: string; icon: LucideIcon; anim: keyof typeof iconAnims }[] = [
  { href: "/admin", key: "overview", icon: Gauge, anim: "tilt" },
  { href: "/admin/users", key: "users", icon: Users, anim: "bounce" },
  { href: "/admin/billing", key: "billing", icon: Wallet, anim: "pop" },
  { href: "/admin/ai", key: "ai", icon: Cpu, anim: "spin" },
  { href: "/admin/content", key: "content", icon: LayoutGrid, anim: "pop" },
  { href: "/admin/settings", key: "settings", icon: SlidersHorizontal, anim: "wiggle" },
];

export function AdminShell({ user, children }: { user: AccountUser; children: ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const isActive = (h: string) => (h === "/admin" ? pathname === "/admin" : pathname.startsWith(h));

  return (
    <div className="min-h-dvh">
      <SiteHeader
        brandHref="/admin"
        brand={
          <span className="flex items-center gap-2">
            <Logo compact />
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent">{t("title")}</span>
          </span>
        }
        right={
          <>
            <PrefsMenu />
            <AccountMenu user={user} where="admin" />
          </>
        }
      />
      <nav className="mx-auto mt-2 flex max-w-6xl gap-1 overflow-x-auto px-3 sm:px-5" aria-label={t("title")}>
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
  const pathname = usePathname();
  const tab = [...TABS].reverse().find((x) => (x.href === "/admin" ? pathname === "/admin" : pathname.startsWith(x.href)));
  const Icon = tab?.icon ?? Gauge;
  return <PageHeader className="mb-6" title={title} subtitle={hint} icon={<Icon />} action={children} />;
}
