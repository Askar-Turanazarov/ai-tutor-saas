"use client";

import { Switch as HeroSwitch } from "@heroui/react";
import { cn } from "@/lib/cn";

/** Toggle on HeroUI/React Aria (keyboard, focus ring, switch role). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <HeroSwitch
      isSelected={checked}
      onChange={onChange}
      isDisabled={disabled}
      aria-label={label}
      size="lg"
      className={cn("shrink-0 [--switch-control-bg-checked-hover:var(--accent-solid)] [--switch-control-bg-checked:var(--accent-solid)]", className)}
    >
      <HeroSwitch.Content>
        <HeroSwitch.Control>
          <HeroSwitch.Thumb />
        </HeroSwitch.Control>
      </HeroSwitch.Content>
    </HeroSwitch>
  );
}
