"use client";

import { motion } from "framer-motion";
import { spring } from "@/components/ui/motion";
import { cn } from "@/lib/cn";

/** iOS-style toggle. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[31px] w-[51px] shrink-0 rounded-full p-[2px] transition-colors duration-200 disabled:opacity-50",
        checked ? "bg-success-solid" : "bg-fill-2",
      )}
    >
      <motion.span
        layout
        transition={spring}
        className={cn("block size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)]", checked && "ml-auto")}
      />
    </button>
  );
}
