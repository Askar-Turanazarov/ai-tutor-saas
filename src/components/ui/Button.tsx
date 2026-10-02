"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { iconAnims, spring } from "./motion";

type Variant = "primary" | "secondary" | "tinted" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.01em] transition-colors disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-accent-solid text-white shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.14)] hover:brightness-[1.06]",
  secondary: "bg-fill text-label hover:bg-fill-2",
  tinted: "bg-accent-soft text-accent hover:bg-fill-2",
  ghost: "text-accent hover:bg-fill",
  danger: "bg-danger-soft text-danger hover:bg-fill-2",
  success: "bg-success text-white hover:brightness-[1.06]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-[10px] px-3.5 text-[14px]",
  md: "h-11 rounded-control px-5 text-[15px]",
  lg: "h-[52px] rounded-[14px] px-7 text-[17px]",
};

export type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  iconAnim?: keyof typeof iconAnims;
  children?: ReactNode;
};

function Inner({ loading, icon: Icon, iconRight: IconRight, iconAnim = "pop", children }: ButtonProps) {
  return (
    <>
      {loading ? (
        <Loader2 className="size-[1.1em] animate-spin" aria-hidden />
      ) : (
        Icon && (
          <motion.span variants={iconAnims[iconAnim]} className="inline-flex">
            <Icon className="size-[1.15em]" strokeWidth={2.2} aria-hidden />
          </motion.span>
        )
      )}
      {children}
      {IconRight && !loading && (
        <motion.span variants={iconAnims.nudge} className="inline-flex">
          <IconRight className="size-[1.1em]" strokeWidth={2.2} aria-hidden />
        </motion.span>
      )}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const { variant = "primary", size = "md", loading, icon, iconRight, iconAnim, className, children, disabled, ...rest } = props;
  return (
    <motion.button
      ref={ref}
      whileHover="hover"
      whileTap={{ scale: 0.97 }}
      transition={spring}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      <Inner {...{ loading, icon, iconRight, iconAnim, children }} />
    </motion.button>
  );
});

const MotionLink = motion.create(Link);
// DOM drag/animation handlers clash with framer-motion's gesture props of the same name.
type ConflictingProps = "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration";

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  iconAnim,
  className,
  children,
  ...rest
}: Omit<ComponentProps<typeof Link>, "children" | ConflictingProps> & {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  iconAnim?: keyof typeof iconAnims;
  children?: ReactNode;
}) {
  return (
    <MotionLink
      whileHover="hover"
      whileTap={{ scale: 0.97 }}
      transition={spring}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      <Inner {...{ icon, iconRight, iconAnim, children }} />
    </MotionLink>
  );
}
