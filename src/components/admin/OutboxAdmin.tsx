"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FlaskConical, Server } from "lucide-react";
import { Segmented } from "@/components/ui/primitives";
import { MessageList, type OutboxItem } from "@/components/messaging/MessageList";

type Channel = "all" | "email" | "telegram";

/** Admin outbox: every email and Telegram message, with the delivery mode on top. */
export function OutboxAdmin({ items, smtp }: { items: OutboxItem[]; smtp: boolean }) {
  const t = useTranslations("outbox");
  const [channel, setChannel] = useState<Channel>("all");
  const shown = channel === "all" ? items : items.filter((m) => m.channel === channel);
  const count = (c: Channel) => (c === "all" ? items.length : items.filter((m) => m.channel === c).length);

  return (
    <div className="space-y-5">
      <div className={smtp ? "surface flex items-start gap-3 rounded-card p-4" : "flex items-start gap-3 rounded-card bg-gold-soft p-4"}>
        {smtp ? <Server className="mt-0.5 size-5 shrink-0 text-success" /> : <FlaskConical className="mt-0.5 size-5 shrink-0 text-gold" />}
        <div>
          {!smtp && <div className="text-[15px] font-semibold">{t("emulationTitle")}</div>}
          <p className="text-[14px] text-label-2">{smtp ? t("smtpText") : t("emulationText")}</p>
        </div>
      </div>
      <Segmented
        value={channel}
        onChange={setChannel}
        label={t("channel")}
        options={(["all", "email", "telegram"] as const).map((c) => ({
          value: c,
          label: (
            <span className="whitespace-nowrap">
              {t(c)} <span className="text-label-3 tabular-nums">{count(c)}</span>
            </span>
          ),
        }))}
      />
      <MessageList items={shown} showTo />
    </div>
  );
}
