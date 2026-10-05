"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, CreditCard, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/Switch";
import { saveSetting } from "@/app/actions/admin";
import type { SettingKey } from "@/lib/settings";

const PRICE_KEYS = ["billing.price1", "billing.price3", "billing.price12"] as const;
const FISCAL_KEYS = ["billing.mxik", "billing.packageCode", "billing.vatPercent", "billing.sellerName", "billing.sellerTin"] as const;
const label = (k: string) => k.replace("billing.", "");

export function BillingSettings({ settings, stripeReady, clickMode }: { settings: Record<SettingKey, string>; stripeReady: boolean; clickMode: "emulator" | "live" }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [values, setValues] = useState(() => Object.fromEntries([...PRICE_KEYS, ...FISCAL_KEYS, "billing.noticeDays"].map((k) => [k, settings[k as SettingKey]])));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const saveAll = (keys: readonly string[]) =>
    start(async () => {
      for (const k of keys) if (values[k] !== settings[k as SettingKey]) await saveSetting(k as SettingKey, values[k]);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });

  const input = (k: string, mono = false) => (
    <label key={k} className="block">
      <span className="mb-1 block text-[13px] text-label-2">{t(label(k) as "price1")}</span>
      <input
        value={values[k]}
        onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
        className={`h-10 w-full rounded-[10px] bg-fill px-3 text-[15px] outline-none focus:shadow-[0_0_0_4px_var(--accent-soft)] ${mono ? "font-mono" : ""}`}
      />
    </label>
  );

  return (
    <div className="surface max-w-2xl divide-y divide-separator rounded-card">
      <div className="space-y-1 p-5">
        <ProviderToggle
          icon={Wallet}
          name={t("clickEnabled")}
          badge={clickMode === "live" ? t("clickModeLive") : t("clickModeEmu")}
          ready
          initial={settings["billing.clickEnabled"] === "true"}
          onChange={(v) => start(() => saveSetting("billing.clickEnabled", String(v)))}
        />
        <ProviderToggle
          icon={CreditCard}
          name={t("stripeEnabled")}
          badge={stripeReady ? "test" : t("notConfiguredShort")}
          ready={stripeReady}
          initial={settings["billing.stripeEnabled"] === "true"}
          onChange={(v) => start(() => saveSetting("billing.stripeEnabled", String(v)))}
        />
        <p className="pt-1 text-[12.5px] text-label-3">{t("envHint")}</p>
      </div>

      <div className="p-5">
        <div className="mb-3 text-[15px] font-medium">{t("prices")}</div>
        <div className="grid gap-3 sm:grid-cols-4">
          {PRICE_KEYS.map((k) => input(k))}
          {input("billing.noticeDays")}
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center gap-2 text-[15px] font-medium">
          <Receipt className="size-4 text-label-2" /> {t("fiscalTitle")}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">{FISCAL_KEYS.map((k) => input(k, k !== "billing.sellerName"))}</div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" loading={pending} icon={saved ? Check : undefined} onClick={() => saveAll([...PRICE_KEYS, ...FISCAL_KEYS, "billing.noticeDays"])}>
            {saved ? tc("saved") : tc("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProviderToggle({
  icon: Icon,
  name,
  badge,
  ready,
  initial,
  onChange,
}: {
  icon: typeof Wallet;
  name: string;
  badge: string;
  ready: boolean;
  initial: boolean;
  onChange: (v: boolean) => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="grid size-9 place-items-center rounded-[11px] bg-fill">
        <Icon className="size-[18px] text-label-2" />
      </span>
      <span className="flex-1 text-[15px] font-medium">
        {name} <Badge tone={ready ? "success" : "neutral"}>{badge}</Badge>
      </span>
      <Switch
        checked={v}
        label={name}
        onChange={(n) => {
          setV(n);
          onChange(n);
        }}
      />
    </div>
  );
}
