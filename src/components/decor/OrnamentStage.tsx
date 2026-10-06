"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { MajolicaTile, SuzaniMedallion, TileBand } from "./motifs";
import { cn } from "@/lib/cn";

/** Moves a layer with the pointer (depth in px) and drifts it up on scroll. */
function useLayer(px: MotionValue<number>, py: MotionValue<number>, scrollY: MotionValue<number>, depth: number, drift: number) {
  const x = useTransform(px, (v) => v * depth);
  const y = useTransform([py, scrollY], ([p, s]: number[]) => p * depth - s * drift);
  return { x, y };
}

/**
 * Ornamental stage behind a centred card (auth, onboarding, payment result): a large slowly
 * turning suzani medallion and a few tiles that follow the pointer and scroll at different depths.
 * Static with reduced motion.
 */
export function OrnamentStage({ tone = "accent", className }: { tone?: "accent" | "teal" | "gold"; className?: string }) {
  const reduce = !!useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, { stiffness: 50, damping: 18 });
  const py = useSpring(rawY, { stiffness: 50, damping: 18 });
  const { scrollY } = useScroll();
  const still = useMotionValue(0);
  const s = reduce ? still : scrollY;

  useEffect(() => {
    if (reduce) return;
    const move = (e: PointerEvent) => {
      rawX.set(e.clientX / window.innerWidth - 0.5);
      rawY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduce, rawX, rawY]);

  const back = useLayer(px, py, s, -14, 0.08);
  const mid = useLayer(px, py, s, 28, 0.2);
  const front = useLayer(px, py, s, 48, 0.35);

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <motion.div style={back} className="absolute left-1/2 top-1/2 -ml-[300px] -mt-[300px]">
        <motion.div animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 240, repeat: Infinity, ease: "linear" }}>
          <SuzaniMedallion size={600} tone={tone} className="opacity-[0.09] dark:opacity-[0.07]" />
        </motion.div>
      </motion.div>
      <motion.div style={mid} className="absolute left-[6%] top-[14%] hidden sm:block">
        <MajolicaTile size={110} className="-rotate-12 opacity-[0.35] dark:opacity-[0.22]" />
      </motion.div>
      <motion.div style={mid} className="absolute bottom-[10%] right-[7%] hidden sm:block">
        <MajolicaTile size={86} className="rotate-6 opacity-[0.3] dark:opacity-[0.2]" />
      </motion.div>
      <motion.div style={front} className="absolute right-[14%] top-[18%] hidden md:block">
        <SuzaniMedallion size={72} tone={tone === "teal" ? "gold" : "teal"} className="opacity-[0.4] dark:opacity-[0.26]" />
      </motion.div>
      <motion.div style={front} className="absolute bottom-[16%] left-[12%] hidden md:block">
        <SuzaniMedallion size={52} tone="gold" className="opacity-[0.35] dark:opacity-[0.22]" />
      </motion.div>
    </div>
  );
}

/** Glass card for the stage, with an ochre tile band along the top edge. */
export function StageCard({ children, className, ...rest }: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={cn("glass-thick relative w-full overflow-hidden rounded-sheet border", className)}
      {...rest}
    >
      <TileBand className="absolute inset-x-0 top-0 text-gold opacity-40" />
      {children as React.ReactNode}
    </motion.div>
  );
}

/** Medallion with the logo or a value inside; spins in on mount. */
export function Crest({
  children,
  size = 76,
  tone = "accent",
  className,
}: {
  children: React.ReactNode;
  size?: number;
  tone?: "accent" | "teal" | "gold";
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { scale: 0.4, rotate: -90, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.08 }}
      className={cn("inline-block", className)}
    >
      <SuzaniMedallion size={size} tone={tone}>
        {children}
      </SuzaniMedallion>
    </motion.div>
  );
}
