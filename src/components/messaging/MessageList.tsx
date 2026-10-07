"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronDown, Inbox, Mail, Send } from "lucide-react";
import { EmptyState } from "@/components/decor/EmptyState";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export type OutboxItem = { id: string; channel: string; to: string; subject: string | null; body: string; status: string; error: string | null; at: string };

const TONE: Record<string, "success" | "danger" | "gold"> = { sent: "success", emulated: "gold", failed: "danger" };

/** Outbox messages as an accordion: an email opens in a sandboxed frame (no scripts), a Telegram message as text. */
export function MessageList({ items, showTo = false }: { items: OutboxItem[]; showTo?: boolean }) {
  const t = useTranslations("outbox");
  const f = useFormatter();
  const [open, setOpen] = useState<string | null>(null);

  if (items.length === 0)
    return (
      <div className="surface rounded-card p-5">
        <EmptyState tone="gold" icon={<Inbox />} text={t("empty")} />
      </div>
    );

  return (
    <ul className="surface divide-y divide-separator overflow-hidden rounded-card">
      {items.map((m) => {
        const expanded = open === m.id;
        const Icon = m.channel === "telegram" ? Send : Mail;
        return (
          <li key={m.id}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : m.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fill"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-accent-soft text-accent">
                <Icon className="size-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-medium">{m.subject || (m.channel === "telegram" ? m.body : t("noSubject"))}</span>
                <span className="block truncate text-[12.5px] text-label-2">
                  {showTo && `${m.to} · `}
                  {f.dateTime(new Date(m.at), { dateStyle: "short", timeStyle: "short" })}
                </span>
              </span>
              <Badge tone={TONE[m.status] ?? "gold"} className="shrink-0">
                {t(m.status === "sent" || m.status === "failed" ? m.status : "emulated")}
              </Badge>
              <ChevronDown className={cn("size-4 shrink-0 text-label-3 transition-transform", expanded && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-4 pb-4">
                    {m.error && <p className="mb-2 text-[13px] text-danger">{m.error}</p>}
                    {m.channel === "email" ? (
                      <iframe title={m.subject ?? t("preview")} sandbox="" srcDoc={m.body} className="h-[360px] w-full rounded-[14px] border border-separator bg-white" />
                    ) : (
                      <p className="whitespace-pre-wrap rounded-[14px] bg-fill p-3 text-[14px]">{m.body}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
