"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { GirihField, MajolicaField, MajolicaTile, SuzaniMedallion } from "./motifs";
import { cn } from "@/lib/cn";

/** Focus screens: lesson, exercises, review, payment. The ornament almost disappears there. */
const QUIET = /^\/(ru|en|uz)\/(app\/(quiz|learn|review|vocab\/review|mistakes\/train)|pay)(\/|$)/;

/**
 * Global page background: colour washes, a majolica tile panel along the edges, a faint girih lattice and a few tiles,
 * moving at different speeds on scroll. Static with reduced motion; dimmed on focus screens.
 */
export function Backdrop() {
  const pathname = usePathname() ?? "";
  const quiet = QUIET.test(pathname);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const slow = useTransform(scrollY, [0, 2000], [0, reduce ? 0 : -120]);
  const mid = useTransform(scrollY, [0, 2000], [0, reduce ? 0 : -260]);
  const fast = useTransform(scrollY, [0, 2000], [0, reduce ? 0 : -420]);

  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-opacity duration-500", quiet ? "opacity-35" : "opacity-100")}>
      {/* Colour washes in the palette: lapis top-left, turquoise right, ochre bottom. */}
      <motion.div style={{ y: slow }} className="absolute inset-0">
        <div className="absolute -left-[12%] -top-[18%] size-[62vmax] rounded-full bg-[radial-gradient(closest-side,var(--ornament),transparent)]" />
        <div className="absolute -right-[18%] top-[22%] size-[52vmax] rounded-full bg-[radial-gradient(closest-side,var(--ornament-2),transparent)]" />
        <div className="absolute -bottom-[30%] left-[18%] size-[58vmax] rounded-full bg-[radial-gradient(closest-side,var(--ornament-3),transparent)]" />
      </motion.div>

      {/* Majolica wall panel: at the side edges on wide screens, along the top on phones; the reading column stays clear. */}
      <motion.div style={{ y: slow }} className={cn("absolute inset-x-0 -top-24 h-[150vh]", quiet && "hidden")}>
        <div className="absolute inset-0 hidden opacity-70 [mask-image:linear-gradient(90deg,#000_0%,#000_5%,transparent_27%,transparent_73%,#000_95%,#000_100%)] md:block dark:opacity-45">
          <MajolicaField className="h-full w-full" />
        </div>
        <div className="absolute inset-x-0 top-0 h-[46vh] opacity-60 [mask-image:linear-gradient(180deg,#000_20%,transparent)] md:hidden dark:opacity-40">
          <MajolicaField className="h-full w-full" cell={64} />
        </div>
      </motion.div>

      {/* Girih lattice. */}
      <motion.div style={{ y: mid }} className={cn("absolute inset-x-0 -top-24 h-[140vh]", quiet && "hidden")}>
        <GirihField className="h-full w-full text-accent opacity-[0.07] dark:opacity-[0.07]" cell={64} />
      </motion.div>

      {/* A few tiles drifting at the edges, outside the reading column. */}
      <motion.div style={{ y: fast }} className={cn("absolute inset-0 hidden xl:block", quiet && "xl:hidden")}>
        <MajolicaTile size={120} className="absolute right-[4%] top-[18vh] rotate-12 opacity-[0.22] dark:opacity-[0.16]" />
        <SuzaniMedallion size={150} tone="teal" className="absolute -left-10 top-[70vh] opacity-[0.18] dark:opacity-[0.12]" />
        <MajolicaTile size={84} className="absolute right-[10%] top-[120vh] -rotate-6 opacity-[0.18] dark:opacity-[0.12]" />
      </motion.div>

      {/* Fine glaze grain, light theme only. */}
      <div className="paper-grain absolute inset-0 opacity-[0.035] mix-blend-multiply dark:hidden" />
    </div>
  );
}

/**
 * SVG displacement filter for the refracting glass edge. Chromium is the only engine that
 * applies url() filters inside backdrop-filter, so the class is set only there.
 */
export function LiquidGlassFilter() {
  useEffect(() => {
    const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands ?? [];
    const chromium = brands.some((b) => /Chromium/i.test(b.brand));
    const reduced = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
    if (chromium && !reduced) document.documentElement.classList.add("lg-refract");
  }, []);
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <filter id="lg-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="18" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
