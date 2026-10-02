import type { Transition, Variants } from "framer-motion";

/** Shared motion language: short, springy, purposeful (HIG › Motion: brief and precise). */
export const spring: Transition = { type: "spring", stiffness: 420, damping: 30, mass: 0.8 };
export const softSpring: Transition = { type: "spring", stiffness: 260, damping: 26 };
export const ease = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
};

export const stagger = (delay = 0.06): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

/** Icon micro-animations, triggered by the parent's `hover` / `tap` variants. */
export const iconAnims: Record<string, Variants> = {
  wiggle: { hover: { rotate: [0, -12, 10, -6, 0], transition: { duration: 0.5 } } },
  bounce: { hover: { y: [0, -4, 0], transition: { duration: 0.4 } } },
  spin: { hover: { rotate: 180, transition: softSpring } },
  pop: { hover: { scale: 1.18, transition: spring }, tap: { scale: 0.9 } },
  nudge: { hover: { x: 3, transition: spring } },
  tilt: { hover: { rotate: -10, scale: 1.08, transition: spring } },
  none: {},
};
