"use client";

import { useState, type ReactNode } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo, LogoMark } from "@/components/ui/brand";
import { spring } from "@/components/ui/motion";
import { cn } from "@/lib/cn";

export type HeaderLink = { href: string; label: string; active?: boolean; icon?: ReactNode };

/**
 * The one header for the site, auth, app (phones) and admin. At the top of the page it sits
 * flat; once the page scrolls it lifts into a floating glass capsule.
 */
export function SiteHeader({
  brand,
  brandHref = "/",
  links,
  right,
  className,
}: {
  brand?: ReactNode;
  brandHref?: string;
  links?: HeaderLink[];
  right?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("shell");
  const { scrollY } = useScroll();
  const [lifted, setLifted] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setLifted(y > 12));

  return (
    <header className={cn("sticky top-0 z-40 px-2 pt-2 sm:px-3", className)} style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
      <div
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border px-2.5 transition-[background-color,box-shadow,border-color] duration-300 sm:px-3",
          lifted ? "glass-thick glass-refract" : "border-transparent",
        )}
      >
        <Link href={brandHref} aria-label="Ustoz AI" className="flex shrink-0 items-center gap-2 rounded-full pl-1 pr-1.5">
          {brand ?? (
            <>
              <span className="inline-flex sm:hidden">
                <LogoMark size={30} />
              </span>
              <span className="hidden sm:inline-flex">
                <Logo />
              </span>
            </>
          )}
        </Link>
        {links && links.length > 0 && (
          <nav aria-label={t("mainNav")} className="ml-2 hidden min-w-0 items-center gap-0.5 overflow-x-auto md:flex">
            {links.map((l) => {
              const external = l.href.startsWith("#");
              const cls = cn(
                "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium transition-colors",
                l.active ? "text-accent" : "text-label-2 hover:text-label",
              );
              const inner = (
                <>
                  {l.active && <motion.span layoutId="header-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent-soft" />}
                  {l.icon && <span className="relative inline-flex [&_svg]:size-4">{l.icon}</span>}
                  <span className="relative">{l.label}</span>
                </>
              );
              return external ? (
                <a key={l.href} href={l.href} className={cls}>
                  {inner}
                </a>
              ) : (
                <Link key={l.href} href={l.href} aria-current={l.active ? "page" : undefined} className={cls}>
                  {inner}
                </Link>
              );
            })}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-1.5">{right}</div>
      </div>
    </header>
  );
}
