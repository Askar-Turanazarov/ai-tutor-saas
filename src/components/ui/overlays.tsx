"use client";

import type { ReactNode } from "react";
import { Dropdown, Toast, Tooltip } from "@heroui/react";
import { cn } from "@/lib/cn";

export type MenuItem = {
  id: string;
  label: ReactNode;
  /** Plain text for type-ahead and screen readers when `label` is not a string. */
  text?: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
};

/** Dropdown menu on HeroUI (keyboard, type-ahead, focus return). Account, language and theme menus. */
export function Menu({
  trigger,
  label,
  items,
  onAction,
  selected,
  placement = "bottom end",
  triggerClassName,
}: {
  trigger: ReactNode;
  label: string;
  items: MenuItem[];
  onAction: (id: string) => void;
  /** Marks one item as current (radio-style), e.g. the active language. */
  selected?: string;
  placement?: "bottom end" | "bottom start" | "top end" | "top start";
  triggerClassName?: string;
}) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={label}
        className={cn(
          "inline-flex items-center gap-2 rounded-full text-label-2 outline-none transition-colors hover:text-label data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-accent",
          triggerClassName,
        )}
      >
        {trigger}
      </Dropdown.Trigger>
      <Dropdown.Popover placement={placement} className="min-w-48 rounded-[16px] border border-(--glass-border) bg-(--glass-strong) shadow-float backdrop-blur-xl backdrop-saturate-150">
        <Dropdown.Menu
          aria-label={label}
          onAction={(key) => onAction(String(key))}
          selectionMode={selected ? "single" : undefined}
          selectedKeys={selected ? [selected] : undefined}
        >
          {items.map((it) => (
            <Dropdown.Item
              key={it.id}
              id={it.id}
              textValue={it.text ?? (typeof it.label === "string" ? it.label : it.id)}
              isDisabled={it.disabled}
              className={cn("gap-2.5 rounded-[10px] text-[14px]", it.danger ? "text-danger" : "text-label")}
            >
              {it.icon && <span className="inline-flex size-4 items-center justify-center">{it.icon}</span>}
              <span className="flex-1">{it.label}</span>
              {selected && <Dropdown.ItemIndicator />}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/** Short hint on hover/focus for icon-only controls. The child must be focusable. */
export function Hint({ content, children, placement = "top" }: { content: ReactNode; children: ReactNode; placement?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip delay={400} closeDelay={80}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content placement={placement} className="rounded-[8px] bg-label px-2 py-1 text-[12px] font-medium text-bg">
        {content}
      </Tooltip.Content>
    </Tooltip>
  );
}

/** Global toast region; call `notify.success("…")` anywhere on the client. */
export function ToastRegion() {
  return <Toast.Provider placement="bottom" />;
}

export const notify = Toast.toast;
