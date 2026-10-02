"use client";

import { useState, useTransition } from "react";
import { Reorder, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, GripVertical, Minus, Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { saveSetting } from "@/app/actions/admin";
import type { SettingKey } from "@/lib/settings";
import { Switch } from "./Switch";

export function SettingsAdmin({ settings }: { settings: Record<SettingKey, string> }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [pending, start] = useTransition();
  const [minutes, setMinutes] = useState(Number(settings["free.dailyMinutes"]) || 15);
  const [order, setOrder] = useState(settings["ai.providerOrder"].split(",").map((s) => s.trim()).filter(Boolean));
  const [saved, setSaved] = useState<string | null>(null);

  const save = (key: SettingKey, value: string) =>
    start(async () => {
      await saveSetting(key, value);
      setSaved(key);
      setTimeout(() => setSaved((s) => (s === key ? null : s)), 1500);
    });

  const row = "flex flex-wrap items-center justify-between gap-4 p-5";

  return (
    <div className="surface max-w-2xl divide-y divide-separator rounded-card">
      <div className={row}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[12px] bg-accent-soft text-accent">
            <Timer className="size-5" />
          </span>
          <span className="text-[15px] font-medium">{t("freeMinutes")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-[12px] bg-fill p-1">
            <button aria-label="-" onClick={() => setMinutes((m) => Math.max(1, m - 1))} className="grid size-8 place-items-center rounded-[9px] hover:bg-elevated">
              <Minus className="size-4" />
            </button>
            <motion.span key={minutes} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-10 text-center text-[17px] font-semibold tabular-nums">
              {minutes}
            </motion.span>
            <button aria-label="+" onClick={() => setMinutes((m) => Math.min(240, m + 1))} className="grid size-8 place-items-center rounded-[9px] hover:bg-elevated">
              <Plus className="size-4" />
            </button>
          </div>
          <Button size="sm" loading={pending && saved === null} icon={saved === "free.dailyMinutes" ? Check : undefined} onClick={() => save("free.dailyMinutes", String(minutes))}>
            {saved === "free.dailyMinutes" ? tc("saved") : tc("save")}
          </Button>
        </div>
      </div>

      <Toggle label={t("forceMock")} initial={settings["ai.forceMock"] === "true"} onChange={(v) => save("ai.forceMock", String(v))} />
      <Toggle label={t("includePro")} initial={settings["ai.includePro"] === "true"} onChange={(v) => save("ai.includePro", String(v))} />

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-medium">{t("providerOrder")}</span>
          <Button size="sm" variant="tinted" icon={saved === "ai.providerOrder" ? Check : undefined} onClick={() => save("ai.providerOrder", order.join(","))}>
            {saved === "ai.providerOrder" ? tc("saved") : tc("save")}
          </Button>
        </div>
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="mt-3 space-y-2">
          {order.map((p, i) => (
            <Reorder.Item
              key={p}
              value={p}
              whileDrag={{ scale: 1.03, boxShadow: "var(--shadow-float)" }}
              className="flex cursor-grab items-center gap-3 rounded-[12px] bg-fill px-3 py-2.5 active:cursor-grabbing"
            >
              <span className="grid size-6 place-items-center rounded-full bg-elevated text-[12px] font-bold">{i + 1}</span>
              <span className="flex-1 font-medium capitalize">{p}</span>
              <GripVertical className="size-4 text-label-3" />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>
    </div>
  );
}

function Toggle({ label, initial, onChange }: { label: string; initial: boolean; onChange: (v: boolean) => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <span className="text-[15px] font-medium">{label}</span>
      <Switch
        checked={v}
        label={label}
        onChange={(next) => {
          setV(next);
          onChange(next);
        }}
      />
    </div>
  );
}
