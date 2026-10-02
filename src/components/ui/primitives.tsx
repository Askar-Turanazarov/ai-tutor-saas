"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, type HTMLMotionProps } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { fadeUp, spring, stagger } from "./motion";

/* ───────────── Card ───────────── */

export function Card({
  interactive,
  className,
  children,
  ...rest
}: HTMLMotionProps<"div"> & { interactive?: boolean }) {
  return (
    <motion.div
      whileHover={interactive ? "hover" : undefined}
      whileTap={interactive ? "tap" : undefined}
      variants={
        interactive
          ? { hover: { y: -3, boxShadow: "var(--shadow-float)", transition: spring }, tap: { scale: 0.985 } }
          : undefined
      }
      className={cn("surface rounded-card", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ───────────── Reveal / Stagger ───────────── */

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeUp}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className, delay = 0.06 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger(delay)} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={fadeUp} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

/* ───────────── Badge ───────────── */

const badgeTones = {
  accent: "bg-accent-soft text-accent",
  teal: "bg-teal-soft text-teal",
  gold: "bg-gold-soft text-gold",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-fill text-label-2",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold tracking-[0.01em]",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ───────────── Segmented control ───────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-[11px] bg-fill p-[3px]", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-[9px] font-medium transition-colors",
              size === "sm" ? "h-7 px-2.5 text-[13px]" : "h-8 px-3.5 text-[14px]",
              active ? "text-label" : "text-label-2 hover:text-label",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className="absolute inset-0 rounded-[9px] bg-elevated shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:bg-fill-2"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Progress ring (Activity-style) ───────────── */

export function ProgressRing({
  value,
  size = 64,
  stroke = 8,
  color = "var(--accent)",
  track = "var(--fill)",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: inView ? c * (1 - v) : c }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

/* ───────────── Progress bar ───────────── */

export function ProgressBar({ value, className, color = "bg-accent-solid" }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-fill", className)}>
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={spring}
      />
    </div>
  );
}

/* ───────────── Sheet (modal) ───────────── */

export function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={label}>
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={spring}
            className="relative m-3 w-full max-w-md rounded-sheet bg-elevated p-6 shadow-float sm:p-7"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-fill text-label-2 transition-colors hover:bg-fill-2"
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ───────────── Field ───────────── */

export function Field({
  label,
  error,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-label-2">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "h-12 w-full rounded-control border bg-fill px-4 text-[16px] text-label outline-none transition-all placeholder:text-label-3",
          "focus:border-accent focus:bg-elevated focus:shadow-[0_0_0_4px_var(--accent-soft)]",
          error ? "border-danger" : "border-transparent",
        )}
        aria-invalid={!!error}
        {...rest}
      />
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 text-[13px] text-danger"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────── Typing indicator ───────────── */

export function TypingDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1" role="status" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-label-2"
          style={{ animation: `typing-dot 1.2s ${i * 0.15}s infinite ease-in-out` }}
        />
      ))}
    </span>
  );
}
