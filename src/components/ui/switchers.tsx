"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Segmented } from "./primitives";
import { saveLocale } from "@/app/actions/user";

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
