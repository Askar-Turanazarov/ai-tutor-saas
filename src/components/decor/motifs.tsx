"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/*
 * Uzbek ornament motifs as plain SVG. They frame the content (backgrounds, borders, empty states,
 * medallions) and never carry meaning, so every one is aria-hidden and uses currentColor/tokens.
 */

/** Star polygon with n points (girih uses 8). */
export function starPath(cx: number, cy: number, R: number, r: number, n = 8) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** Petal (vesica) from the centre outward, rotated by `deg`. */
function petal(cx: number, cy: number, len: number, w: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const ex = cx + len * Math.sin(a);
  const ey = cy - len * Math.cos(a);
  const nx = Math.cos(a) * w;
  const ny = Math.sin(a) * w;
  const mx = (cx + ex) / 2;
  const my = (cy + ey) / 2;
  return `M${cx},${cy}Q${(mx + nx).toFixed(2)},${(my + ny).toFixed(2)} ${ex.toFixed(2)},${ey.toFixed(2)}Q${(mx - nx).toFixed(2)},${(my - ny).toFixed(2)} ${cx},${cy}Z`;
}

const sid = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");

/** Girih lattice that fades out from the centre. Background of hero sections. */
export function GirihField({ className, cell = 56 }: { className?: string; cell?: number }) {
  const id = sid(useId());
  const c = cell / 2;
  return (
    <svg className={cn("pointer-events-none select-none", className)} aria-hidden>
      <defs>
        <pattern id={`g-${id}`} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <path d={starPath(c, c, cell * 0.232, cell * 0.16)} fill="none" stroke="currentColor" strokeWidth="1" />
          {[
            [0, 0],
            [cell, 0],
            [0, cell],
            [cell, cell],
          ].map(([x, y]) => (
            <path key={`${x}-${y}`} d={starPath(x, y, cell * 0.107, cell * 0.071)} fill="none" stroke="currentColor" strokeWidth="1" />
          ))}
          <path d={`M${c},0V${c * 0.54}M${c},${cell}V${cell - c * 0.54}M0,${c}H${c * 0.54}M${cell},${c}H${cell - c * 0.54}`} stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
        </pattern>
        <radialGradient id={`f-${id}`}>
          <stop offset="0" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`m-${id}`}>
          <rect width="100%" height="100%" fill={`url(#f-${id})`} />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill={`url(#g-${id})`} mask={`url(#m-${id})`} />
    </svg>
  );
}

/** Majolica tile: eight-point star with turquoise petals inside an ochre square. */
export function MajolicaTile({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" className={cn("pointer-events-none select-none", className)} aria-hidden>
      <rect x="3" y="3" width="90" height="90" rx="10" fill="none" stroke="var(--ochre)" strokeOpacity="0.55" strokeWidth="1.5" />
      <rect x="9" y="9" width="78" height="78" rx="6" fill="none" stroke="var(--ochre)" strokeOpacity="0.3" strokeWidth="1" />
      <path d={starPath(48, 48, 36, 26)} fill="var(--accent-soft)" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="1.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
        <path key={d} d={petal(48, 48, 22, 6, d)} fill="var(--teal-soft)" stroke="var(--turquoise)" strokeOpacity="0.6" strokeWidth="0.9" />
      ))}
      <circle cx="48" cy="48" r="5" fill="var(--ochre)" fillOpacity="0.75" />
      {[
        [9, 9],
        [87, 9],
        [9, 87],
        [87, 87],
      ].map(([x, y]) => (
        <path key={`${x}${y}`} d={starPath(x, y, 6, 3)} fill="var(--ochre)" fillOpacity="0.45" />
      ))}
    </svg>
  );
}

/**
 * Suzani medallion: concentric rosette. Achievement badges, empty states, celebration screens.
 * `tone` picks the leading colour; `muted` renders a locked/grey version.
 */
export function SuzaniMedallion({
  size = 120,
  tone = "accent",
  muted,
  className,
  children,
}: {
  size?: number;
  tone?: "accent" | "teal" | "gold";
  muted?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const main = muted ? "var(--label-3)" : tone === "teal" ? "var(--turquoise)" : tone === "gold" ? "var(--ochre)" : "var(--accent)";
  const second = muted ? "var(--label-3)" : tone === "gold" ? "var(--accent)" : "var(--ochre)";
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" className="absolute inset-0" aria-hidden>
        <circle cx="60" cy="60" r="57" fill="var(--bg-elevated)" stroke={main} strokeOpacity={muted ? 0.3 : 0.5} strokeWidth="1.5" />
        <circle cx="60" cy="60" r="51" fill="none" stroke={second} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 4" />
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={petal(60, 60, 49, 9, i * 30)} fill={main} fillOpacity={muted ? 0.08 : 0.13} stroke={main} strokeOpacity={muted ? 0.25 : 0.45} strokeWidth="0.9" />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <circle
            key={i}
            cx={(60 + 44 * Math.sin(((i * 30 + 15) * Math.PI) / 180)).toFixed(2)}
            cy={(60 - 44 * Math.cos(((i * 30 + 15) * Math.PI) / 180)).toFixed(2)}
            r="2.2"
            fill={second}
            fillOpacity={muted ? 0.3 : 0.6}
          />
        ))}
        <circle cx="60" cy="60" r="30" fill="var(--bg-elevated)" stroke={main} strokeOpacity={muted ? 0.3 : 0.55} strokeWidth="1.2" />
        {!children && <path d={starPath(60, 60, 18, 12)} fill={main} fillOpacity={muted ? 0.25 : 0.8} />}
      </svg>
      {children && <span className={cn("relative grid size-[44%] place-items-center", muted ? "text-label-3" : "text-label")}>{children}</span>}
    </span>
  );
}

/** Islimi vine: a horizontal scroll with leaves. Section dividers. */
export function IslimiBorder({ className }: { className?: string }) {
  const id = sid(useId());
  return (
    <svg className={cn("pointer-events-none h-4 w-full select-none", className)} aria-hidden>
      <defs>
        <pattern id={`i-${id}`} width="48" height="16" patternUnits="userSpaceOnUse">
          <path d="M0,8 C8,0 16,0 24,8 S40,16 48,8" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d={petal(12, 4.5, 5, 2, 60)} fill="currentColor" opacity="0.7" />
          <path d={petal(36, 11.5, 5, 2, 240)} fill="currentColor" opacity="0.7" />
          <circle cx="24" cy="8" r="1.3" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="16" fill={`url(#i-${id})`} />
    </svg>
  );
}

/** Small tile band: repeated stars between rules. Tops of cards, plan columns, certificates. */
export function TileBand({ className }: { className?: string }) {
  const id = sid(useId());
  return (
    <svg className={cn("pointer-events-none h-3 w-full select-none", className)} aria-hidden>
      <defs>
        <pattern id={`t-${id}`} width="24" height="12" patternUnits="userSpaceOnUse">
          <path d={starPath(12, 6, 5, 2.6)} fill="currentColor" />
          <circle cx="0" cy="6" r="1.2" fill="currentColor" opacity="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill={`url(#t-${id})`} />
    </svg>
  );
}
