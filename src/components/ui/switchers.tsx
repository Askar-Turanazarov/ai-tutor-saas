"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Segmented } from "./primitives";
import { saveLocale } from "@/app/actions/user";
import { cn } from "@/lib/cn";

export function ThemeSwitcher({ size = "md", showLabels = true }: { size?: "sm" | "md"; showLabels?: boolean }) {
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ic = "size-[14px]";
  return (
    <Segmented
      size={size}
      label={t("theme")}
      value={(mounted ? theme : "system") as "system" | "light" | "dark"}
      onChange={setTheme}
      options={[
        { value: "system", label: showLabels ? t("themeSystem") : null, icon: <Monitor className={ic} aria-label={t("themeSystem")} /> },
        { value: "light", label: showLabels ? t("themeLight") : null, icon: <Sun className={ic} aria-label={t("themeLight")} /> },
        { value: "dark", label: showLabels ? t("themeDark") : null, icon: <Moon className={ic} aria-label={t("themeDark")} /> },
      ]}
    />
  );
}

export function LocaleSwitcher({ size = "md", persist }: { size?: "sm" | "md"; persist?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale() as "ru" | "en" | "uz";
  const router = useRouter();
  const pathname = usePathname();
  const [, start] = useTransition();
  return (
    <Segmented
      size={size}
      label={t("language")}
      value={locale}
      onChange={(next) =>
        start(async () => {
          if (persist) await saveLocale(next);
          router.replace(pathname + (typeof window !== "undefined" ? window.location.search : ""), { locale: next });
        })
      }
      options={[
        { value: "ru", label: "RU" },
        { value: "uz", label: "UZ" },
        { value: "en", label: "EN" },
      ]}
    />
  );
}

const THEME_CYCLE = ["system", "light", "dark"] as const;
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };
const LOCALE_CYCLE = ["ru", "uz", "en"] as const;

/** Compact icon button that cycles Auto → Light → Dark. For tight spaces like the mobile top bar. */
export function ThemeCycleButton({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = (mounted && THEME_CYCLE.includes(theme as never) ? theme : "system") as (typeof THEME_CYCLE)[number];
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];
  const Icon = THEME_ICON[current];
  const label = { system: t("themeSystem"), light: t("themeLight"), dark: t("themeDark") };
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onClick={() => setTheme(next)}
      aria-label={`${t("theme")}: ${label[current]}`}
      title={`${t("theme")}: ${label[current]}`}
      className={cn(
        "grid size-9 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill hover:text-label",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current}
          initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          <Icon className="size-[18px]" />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/** Compact text button that cycles RU → UZ → EN and remembers the choice for the account. */
export function LocaleCycleButton({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale() as (typeof LOCALE_CYCLE)[number];
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const next = LOCALE_CYCLE[(LOCALE_CYCLE.indexOf(locale) + 1) % LOCALE_CYCLE.length];
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await saveLocale(next);
          router.replace(pathname + window.location.search, { locale: next });
        })
      }
      aria-label={`${t("language")}: ${locale.toUpperCase()}`}
      title={t("language")}
      className={cn(
        "grid h-9 min-w-9 place-items-center rounded-full px-2 text-[13px] font-semibold uppercase tracking-wide text-label-2 transition-colors hover:bg-fill hover:text-label disabled:opacity-50",
        className,
      )}
    >
      {locale}
    </motion.button>
  );
}
