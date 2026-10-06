"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { IslimiBorder, SuzaniMedallion } from "./motifs";
import { ease } from "@/components/ui/motion";
import { cn } from "@/lib/cn";

type Tone = "accent" | "teal" | "gold";

/**
 * Page title for app screens: an icon medallion, title and subtitle that rise in, an islimi
 * border that draws itself, and a large medallion behind that drifts and turns on scroll.
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  tone = "accent",
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = !!useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 30]);
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease, delay },
  });

  return (
    <header ref={ref} className={cn("relative", className)}>
      <motion.div style={{ y, rotate }} aria-hidden className="pointer-events-none absolute -right-2 -top-14 hidden sm:block">
        <SuzaniMedallion size={170} tone={tone} className="opacity-[0.14] dark:opacity-[0.1]" />
      </motion.div>
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {icon && (
            <motion.div
              initial={reduce ? false : { scale: 0.5, rotate: -60, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 16 }}
              className="hidden shrink-0 sm:block"
            >
              <SuzaniMedallion size={60} tone={tone}>
                <span className="[&_svg]:size-5">{icon}</span>
              </SuzaniMedallion>
            </motion.div>
          )}
          <div className="min-w-0">
            <motion.h1 {...rise(0)} className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold leading-tight">
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p {...rise(0.06)} className="mt-1 max-w-xl text-[16px] text-label-2">
                {subtitle}
              </motion.p>
            )}
          </div>
        </div>
        {action && <motion.div {...rise(0.1)}>{action}</motion.div>}
      </div>
      <motion.div
        initial={reduce ? false : { scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease, delay: 0.12 }}
        className="relative mt-4 origin-left"
      >
        <IslimiBorder className={cn("opacity-45", tone === "teal" ? "text-teal" : "text-gold")} />
      </motion.div>
    </header>
  );
}
