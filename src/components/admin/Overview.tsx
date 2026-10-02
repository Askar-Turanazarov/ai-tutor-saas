"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Bot, CheckCircle2, Crown, GraduationCap, MessageSquare, Shuffle, Users, WifiOff, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Stagger, StaggerItem } from "@/components/ui/primitives";
import { setUserPlan } from "@/app/actions/admin";
import { cn } from "@/lib/cn";

type Stats = { users: number; pro: number; messages: number; quizzes: number; calls: number; ok: number; fallbacks: number; mock: number };

export function Overview({
  stats,
  requests,
  models,
}: {
  stats: Stats;
  requests: { id: string; name: string; email: string }[];
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
          <h2 className="text-[17px] font-semibold">{t("upgradeRequests")}</h2>
          {requests.length === 0 ? (
            <p className="mt-3 text-[14px] text-label-3">{t("empty")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-separator">
              {requests.map((r) => (
                <RequestRow key={r.id} {...r} />
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

function RequestRow({ id, name, email }: { id: string; name: string; email: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{name}</div>
        <div className="truncate text-[13px] text-label-2">{email}</div>
      </div>
      <Button size="sm" variant="tinted" icon={Crown} loading={pending} onClick={() => start(() => setUserPlan(id, "PRO"))}>
        {t("makePro")}
      </Button>
    </li>
  );
}
