"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Bot, CheckCircle2, Crown, GraduationCap, MessageSquare, Shuffle, Users, WifiOff, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge, Stagger, StaggerItem } from "@/components/ui/primitives";
import { tierLabel } from "@/lib/billing/catalog";
import { cn } from "@/lib/cn";

type Stats = { users: number; pro: number; messages: number; quizzes: number; calls: number; ok: number; fallbacks: number; mock: number };

export function Overview({
  stats,
  payments,
  models,
}: {
  stats: Stats;
  payments: { id: string; name: string; tier: string; amount: string; provider: string; status: string }[];
  models: { id: string; ok: number; fail: number; avg: number }[];
}) {
  const t = useTranslations("admin");
  const cards: { key: string; value: number; icon: LucideIcon; tone: string }[] = [
    { key: "statUsers", value: stats.users, icon: Users, tone: "bg-accent-soft text-accent" },
    { key: "statPro", value: stats.pro, icon: Crown, tone: "bg-gold-soft text-gold" },
    { key: "statMessages", value: stats.messages, icon: MessageSquare, tone: "bg-teal-soft text-teal" },
    { key: "statQuizzes", value: stats.quizzes, icon: GraduationCap, tone: "bg-success-soft text-success" },
    { key: "statAiCalls", value: stats.calls, icon: Bot, tone: "bg-accent-soft text-accent" },
    { key: "statAiOk", value: stats.ok, icon: CheckCircle2, tone: "bg-success-soft text-success" },
    { key: "statFallbacks", value: stats.fallbacks, icon: Shuffle, tone: "bg-warning-soft text-warning" },
    { key: "statMock", value: stats.mock, icon: WifiOff, tone: "bg-fill text-label-2" },
  ];
  const max = Math.max(1, ...models.map((m) => m.ok + m.fail));

  return (
    <div className="space-y-8">
      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <StaggerItem key={c.key}>
            <motion.div whileHover={{ y: -3 }} className="surface rounded-card p-4">
              <span className={cn("grid size-9 place-items-center rounded-[11px]", c.tone)}>
                <c.icon className="size-[18px]" />
              </span>
              <div className="mt-3 text-[28px] font-bold tabular-nums">{c.value.toLocaleString()}</div>
              <div className="text-[13px] text-label-2">{t(c.key)}</div>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface rounded-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold">{t("payments")}</h2>
            <Link href="/admin/billing" className="text-[14px] font-medium text-accent hover:underline">
              {t("billing")}
            </Link>
          </div>
          {payments.length === 0 ? (
            <p className="mt-3 text-[14px] text-label-3">{t("empty")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-separator">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5 text-[14px]">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-[13px] text-label-2">
                      {tierLabel(p.tier)} · {p.provider}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{p.amount}</div>
                    <Badge tone={p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "neutral"}>{p.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface rounded-card p-5">
          <h2 className="text-[17px] font-semibold">{t("statAiCalls")}</h2>
          {models.length === 0 ? (
            <p className="mt-3 text-[14px] text-label-3">{t("empty")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {models.map((m) => (
                <li key={m.id}>
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate font-mono">{m.id}</span>
                    <span className="shrink-0 tabular-nums text-label-2">
                      {m.ok}✓ {m.fail > 0 && <span className="text-danger">{m.fail}✗</span>} · {m.avg} ms
                    </span>
                  </div>
                  <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-fill">
                    <motion.div
                      className="h-full bg-success"
                      initial={{ width: 0 }}
                      animate={{ width: `${(m.ok / max) * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.div
                      className="h-full bg-danger"
                      initial={{ width: 0 }}
                      animate={{ width: `${(m.fail / max) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
