"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { starPath } from "@/components/decor/motifs";

const GID = "ustoz-g";

/**
 * The logo gradient, defined once per page (in the root layout). A per-instance useId-based id could
 * differ between server and client (hydration mismatch), and a gradient inside one LogoMark breaks
 * the others when that copy sits in a display:none subtree.
 */
export function BrandDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <linearGradient id={GID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-solid)" />
          <stop offset="1" stopColor="var(--teal)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      whileHover={{ rotate: 45 }}
      transition={{ type: "spring", stiffness: 200, damping: 14 }}
      aria-hidden
    >
      <path d={starPath(16, 16, 15, 11)} fill={`url(#${GID})`} />
      <circle cx="16" cy="16" r="5.2" fill="var(--bg-elevated)" />
      <circle cx="16" cy="16" r="2.4" fill={`url(#${GID})`} />
    </motion.svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[19px] font-bold tracking-[-0.03em] text-label">
          Ustoz<span className="text-accent"> AI</span>
        </span>
      )}
    </span>
  );
}
