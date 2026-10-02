"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { Dropdown, Header, Separator } from "@heroui/react";
import { Check, CreditCard, Crown, Home, Languages, LogIn, LogOut, Monitor, Moon, Settings, Shield, Sparkles, Sun } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { logout } from "@/app/actions/auth";
import { saveLocale } from "@/app/actions/user";
import { tierLabel } from "@/lib/billing/catalog";
import { cn } from "@/lib/cn";

const LOCALES = [
  { id: "ru", label: "Русский" },
  { id: "uz", label: "Oʻzbekcha" },
  { id: "en", label: "English" },
] as const;

const popover = "glass-thick min-w-56 rounded-[18px] border p-1.5";
const item = "flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[14px] text-label outline-none data-[focused=true]:bg-fill data-[hovered=true]:bg-fill";
const sectionTitle = "px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-label-3";

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-solid/90 to-teal-solid font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "U"}
    </span>
  );
}

/** One menu for interface language and theme. `persist` also saves the language to the account. */
export function PrefsMenu({ persist, className }: { persist?: boolean; className?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [, start] = useTransition();
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme ?? "system" : "system";
  const ThemeIcon = current === "dark" ? Moon : current === "light" ? Sun : Monitor;

  const onAction = (key: string) => {
    const [kind, value] = key.split(":");
    if (kind === "theme") return setTheme(value);
    if (value === locale) return;
    start(async () => {
      if (persist) await saveLocale(value as "ru" | "en" | "uz");
      router.replace(pathname + window.location.search, { locale: value as "ru" | "en" | "uz" });
    });
  };

  const themes = [
    { id: "system", label: t("common.themeSystem"), icon: Monitor },
    { id: "light", label: t("common.themeLight"), icon: Sun },
    { id: "dark", label: t("common.themeDark"), icon: Moon },
  ];

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={t("shell.preferences")}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-label-2 outline-none transition-colors hover:bg-fill hover:text-label data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-accent",
          className,
        )}
      >
        <Languages className="size-[17px]" />
        <span className="uppercase">{locale}</span>
        <span className="mx-0.5 h-4 w-px bg-separator" />
        <ThemeIcon className="size-[16px]" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className={popover}>
        <Dropdown.Menu aria-label={t("shell.preferences")} onAction={(k) => onAction(String(k))}>
          <Dropdown.Section>
            <Header className={sectionTitle}>{t("common.language")}</Header>
            {LOCALES.map((l) => (
              <Dropdown.Item key={l.id} id={`locale:${l.id}`} textValue={l.label} className={item}>
                <span lang={l.id} className="flex-1">
                  {l.label}
                </span>
                {l.id === locale && <Check className="size-4 text-accent" aria-label="✓" />}
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
          <Separator className="my-1 bg-separator" />
          <Dropdown.Section>
            <Header className={sectionTitle}>{t("common.theme")}</Header>
            {themes.map((th) => (
              <Dropdown.Item key={th.id} id={`theme:${th.id}`} textValue={th.label} className={item}>
                <th.icon className="size-4 text-label-2" />
                <span className="flex-1">{th.label}</span>
                {th.id === current && <Check className="size-4 text-accent" aria-label="✓" />}
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export type AccountUser = { name: string; plan: string; role: string; guest?: boolean; level?: string };

type Entry = { id: string; label: string; icon: typeof Home; href?: string; danger?: boolean };

/**
 * Avatar menu with the account destinations. `where` hides the link to the current area.
 * `trigger` replaces the plain avatar (the desktop sidebar shows a full user chip).
 */
export function AccountMenu({
  user,
  where,
  trigger,
  placement = "bottom end",
  className,
}: {
  user: AccountUser;
  where: "app" | "admin" | "site";
  trigger?: ReactNode;
  placement?: "bottom end" | "top start" | "top end";
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();

  const entries: Entry[] = [
    ...(where !== "app" ? [{ id: "app", label: t("shell.toApp"), icon: Sparkles, href: "/app" }] : []),
    { id: "settings", label: t("nav.settings"), icon: Settings, href: "/app/settings" },
    ...(user.guest
      ? []
      : [
          { id: "billing", label: t("shell.subscription"), icon: CreditCard, href: "/app/billing" },
          { id: "plans", label: t("shell.plans"), icon: Crown, href: "/app/plans" },
        ]),
    ...(user.role === "ADMIN" && where !== "admin" ? [{ id: "admin", label: t("shell.admin"), icon: Shield, href: "/admin" }] : []),
    ...(where !== "site" ? [{ id: "site", label: t("shell.toSite"), icon: Home, href: "/" }] : []),
    user.guest
      ? { id: "register", label: t("shell.saveProgress"), icon: LogIn, href: "/register" }
      : { id: "logout", label: t("common.logout"), icon: LogOut, danger: true },
  ];

  const onAction = (id: string) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    if (e.href) return router.push(e.href);
    if (id === "logout") start(() => logout());
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`${t("shell.account")}: ${user.name}`}
        isDisabled={pending}
        className={cn("rounded-full outline-none data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-accent", className)}
      >
        {trigger ?? <Avatar name={user.name} size={34} />}
      </Dropdown.Trigger>
      <Dropdown.Popover placement={placement} className={popover}>
        <div className="flex items-center gap-3 px-2.5 pb-2.5 pt-1.5">
          <Avatar name={user.name} size={38} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-label">{user.name}</div>
            <div className="text-[12px] text-label-2">
              {user.guest ? t("shell.guest") : tierLabel(user.plan)}
              {user.level && ` · ${user.level}`}
            </div>
          </div>
        </div>
        <Separator className="mb-1 bg-separator" />
        <Dropdown.Menu aria-label={t("shell.account")} onAction={(k) => onAction(String(k))}>
          {entries.map((e) => (
            <Dropdown.Item key={e.id} id={e.id} textValue={e.label} className={cn(item, e.danger && "text-danger")}>
              <e.icon className={cn("size-4", e.danger ? "text-danger" : "text-label-2")} />
              {e.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
