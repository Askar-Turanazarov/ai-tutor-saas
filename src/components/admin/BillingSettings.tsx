"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { saveSettings } from "@/app/actions/admin";
import { Switch } from "./Switch";

const PROVIDERS = ["click", "card", "stripe"] as const;
const FIELDS = [
  { key: "billing.noticeDays", numeric: true },
  { key: "billing.vatPercent", numeric: true },
  { key: "billing.mxik", numeric: true },
  { key: "billing.packageCode", numeric: true },
  { key: "billing.sellerName", numeric: false },
  { key: "billing.sellerTin", numeric: true },
] as const;

/** Payment methods, reminder timing and the seller data printed on fiscal receipts. */
export function BillingSettings({ settings }: { settings: Record<string, string> }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries([...FIELDS.map((f) => f.key), ...PROVIDERS.map((p) => `billing.${p}Enabled`)].map((k) => [k, settings[k] ?? ""])),
  );
  const set = (k: string, v: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const save = () =>
    start(async () => {
      await saveSettings(Object.entries(form).map(([key, value]) => ({ key, value })));
      setSaved(true);
    });

  return (
    <div className="surface max-w-3xl rounded-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold">{t("billingSettings")}</h2>
          <p className="mt-0.5 text-[13px] text-label-2">{t("billingSettingsHint")}</p>
        </div>
        <Button size="sm" loading={pending} icon={saved ? Check : undefined} onClick={save}>
          {saved ? tc("saved") : tc("save")}
        </Button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {PROVIDERS.map((p) => (
          <div key={p} className="flex items-center justify-between gap-3 rounded-[12px] bg-fill px-3.5 py-2.5">
            <span className="text-[14px] font-medium">{t(`method_${p}`)}</span>
            <Switch checked={form[`billing.${p}Enabled`] === "true"} label={t(`method_${p}`)} onChange={(v) => set(`billing.${p}Enabled`, String(v))} />
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className={f.key === "billing.sellerName" ? "col-span-2 text-[13px] text-label-2 sm:col-span-1" : "text-[13px] text-label-2"}>
            {t(`set_${f.key.slice(8)}`)}
            <input
              value={form[f.key]}
              onChange={(e) => set(f.key, f.numeric ? e.target.value.replace(/\D/g, "") : e.target.value)}
              inputMode={f.numeric ? "numeric" : "text"}
              className="mt-1 h-9 w-full rounded-[10px] bg-fill px-2.5 tabular-nums text-label outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
