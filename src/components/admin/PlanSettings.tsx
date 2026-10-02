"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { saveSettings } from "@/app/actions/admin";
import { LIMIT_KEYS, PAID_TIERS, PERIODS, TIERS, discountSettingKey, limitSettingKey, priceSettingKey, tierLabel } from "@/lib/billing/catalog";

/** Limits and prices of every plan. An empty limit means "unlimited", 0 means "not included". */
export function PlanSettings({ settings }: { settings: Record<string, string> }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  // USD prices are stored in cents and edited in dollars.
  const toForm = (k: string) => {
    const v = settings[k];
    if (v === "unlimited") return "";
    return k.endsWith(".USD") ? (Number(v) / 100).toFixed(2) : v;
  };
  const [form, setForm] = useState<Record<string, string>>(() => {
    const keys = [
      ...TIERS.flatMap((tier) => LIMIT_KEYS.map((k) => limitSettingKey(tier, k))),
      ...PAID_TIERS.flatMap((tier) => [priceSettingKey(tier, "UZS"), priceSettingKey(tier, "USD")]),
      ...PERIODS.map(discountSettingKey),
      "billing.trialDays",
      "billing.graceDays",
    ];
    return Object.fromEntries(keys.map((k) => [k, toForm(k)]));
  });

  const set = (k: string, v: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v.replace(/[^\d.]/g, "") }));
  };

  const save = () =>
    start(async () => {
      const entries = Object.entries(form).map(([k, v]) => {
        if (k.startsWith("limit.")) return [k, v === "" ? "unlimited" : v] as const;
        if (k.endsWith(".USD")) return [k, String(Math.round(Number(v || 0) * 100))] as const;
        return [k, v || "0"] as const;
      });
      await saveSettings(entries.map(([key, value]) => ({ key, value })));
      setSaved(true);
    });

  const input = (k: string, label: string, placeholder = "") => (
    <input
      value={form[k]}
      onChange={(e) => set(k, e.target.value)}
      inputMode="decimal"
      placeholder={placeholder}
      aria-label={label}
      className="h-9 w-full min-w-[64px] rounded-[10px] bg-fill px-2.5 text-center tabular-nums outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]"
    />
  );

  return (
    <div className="surface max-w-3xl rounded-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold">{t("plansTitle")}</h2>
          <p className="mt-0.5 text-[13px] text-label-2">{t("plansHint")}</p>
        </div>
        <Button size="sm" loading={pending} icon={saved ? Check : undefined} onClick={save}>
          {saved ? tc("saved") : tc("save")}
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] text-[14px]">
          <thead>
            <tr className="text-label-2">
              <th className="py-2 text-left font-medium">{t("limits")}</th>
              {TIERS.map((tier) => (
                <th key={tier} className="px-1 py-2 font-semibold text-label">
                  {tierLabel(tier)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIMIT_KEYS.map((k) => (
              <tr key={k}>
                <td className="py-1.5 pr-3 text-label-2">{t(`limit_${k}`)}</td>
                {TIERS.map((tier) => (
                  <td key={tier} className="px-1 py-1.5">
                    {input(limitSettingKey(tier, k), `${t(`limit_${k}`)} · ${tierLabel(tier)}`, "∞")}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="pb-1.5 pr-3 pt-4 font-medium text-label-2">{t("pricesUzs")}</td>
              <td className="px-1 pb-1.5 pt-4 text-center text-label-3">0</td>
              {PAID_TIERS.map((tier) => (
                <td key={tier} className="px-1 pb-1.5 pt-4">
                  {input(priceSettingKey(tier, "UZS"), `${t("pricesUzs")} · ${tierLabel(tier)}`)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-1.5 pr-3 font-medium text-label-2">{t("pricesUsd")}</td>
              <td className="px-1 py-1.5 text-center text-label-3">0</td>
              {PAID_TIERS.map((tier) => (
                <td key={tier} className="px-1 py-1.5">
                  {input(priceSettingKey(tier, "USD"), `${t("pricesUsd")} · ${tierLabel(tier)}`)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PERIODS.filter((p) => p > 1).map((p) => (
          <label key={p} className="text-[13px] text-label-2">
            {t("discount", { n: p })}
            <div className="mt-1">{input(discountSettingKey(p), t("discount", { n: p }))}</div>
          </label>
        ))}
        <label className="text-[13px] text-label-2">
          {t("trialDays")}
          <div className="mt-1">{input("billing.trialDays", t("trialDays"))}</div>
        </label>
        <label className="text-[13px] text-label-2">
          {t("graceDays")}
          <div className="mt-1">{input("billing.graceDays", t("graceDays"))}</div>
        </label>
      </div>
    </div>
  );
}
