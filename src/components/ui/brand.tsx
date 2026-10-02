"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Eight-point star from Uzbek girih tilework — the brand mark. */
function starPath(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  // Unique per instance: a shared id breaks when the first copy sits in a display:none subtree.
  const gid = `ustoz-g-${useId().replace(/:/g, "")}`;
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
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-solid)" />
          <stop offset="1" stopColor="var(--teal)" />
        </linearGradient>
      </defs>
      <path d={starPath(16, 16, 15, 11)} fill={`url(#${gid})`} />
      <circle cx="16" cy="16" r="5.2" fill="var(--bg-elevated)" />
      <circle cx="16" cy="16" r="2.4" fill={`url(#${gid})`} />
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

/** Soft girih ornament used behind hero sections. Decorative only. */
export function Ornament({ className }: { className?: string }) {
  return (
    <svg className={cn("pointer-events-none select-none", className)} aria-hidden>
      <defs>
        <pattern id="girih" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d={starPath(28, 28, 13, 9)} fill="none" stroke="currentColor" strokeWidth="1" />
          <path d={starPath(0, 0, 6, 4)} fill="none" stroke="currentColor" strokeWidth="1" />
          <path d={starPath(56, 0, 6, 4)} fill="none" stroke="currentColor" strokeWidth="1" />
          <path d={starPath(0, 56, 6, 4)} fill="none" stroke="currentColor" strokeWidth="1" />
          <path d={starPath(56, 56, 6, 4)} fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
        <radialGradient id="girih-fade">
          <stop offset="0" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="girih-mask">
          <rect width="100%" height="100%" fill="url(#girih-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#girih)" mask="url(#girih-mask)" />
    </svg>
  );
}
