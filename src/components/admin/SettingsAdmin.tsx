"use client";

import { useState, useTransition } from "react";
import { Reorder } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { saveSetting } from "@/app/actions/admin";
import type { SettingKey } from "@/lib/settings";
import { Switch } from "./Switch";

export function SettingsAdmin({ settings }: { settings: Record<string, string> }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [, start] = useTransition();
  const [order, setOrder] = useState(settings["ai.providerOrder"].split(",").map((s) => s.trim()).filter(Boolean));
  const [saved, setSaved] = useState<string | null>(null);

  const save = (key: SettingKey, value: string) =>
    start(async () => {
      await saveSetting(key, value);
      setSaved(key);
      setTimeout(() => setSaved((s) => (s === key ? null : s)), 1500);
    });

  return (
    <div className="surface max-w-2xl divide-y divide-separator rounded-card">
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
