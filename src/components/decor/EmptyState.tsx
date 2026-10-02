import type { ReactNode } from "react";
import { SuzaniMedallion } from "./motifs";
import { cn } from "@/lib/cn";

/** Empty list placeholder: a small suzani medallion with the icon, a line of text and an optional action. */
export function EmptyState({
  icon,
  title,
  text,
  action,
  tone = "accent",
  className,
}: {
  icon?: ReactNode;
  title?: string;
  text: string;
  action?: ReactNode;
  tone?: "accent" | "teal" | "gold";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 py-2", className)}>
      <SuzaniMedallion size={64} tone={tone} className="opacity-90">
        {icon && <span className="[&_svg]:size-5">{icon}</span>}
      </SuzaniMedallion>
      <div className="min-w-0">
        {title && <p className="text-[15px] font-semibold">{title}</p>}
        <p className="text-[14px] leading-snug text-label-2">{text}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
