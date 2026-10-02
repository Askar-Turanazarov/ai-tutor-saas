"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2, CircleSlash, KeyRound, PauseCircle, RefreshCw, Send, WifiOff, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";
import { pingAI, refreshModels, toggleModel } from "@/app/actions/admin";
import { cn } from "@/lib/cn";

type Model = { id: string; name: string; pro: boolean; disabled: boolean; pausedUntil: number | null; lastError: string | null; latencyMs: number | null };
type Provider = { id: string; label: string; configured: boolean; error: string | null; models: Model[] };
type Log = { id: string; task: string; provider: string; model: string; ok: boolean; latencyMs: number; attempt: number; error: string | null; createdAt: string };
type Ping = Awaited<ReturnType<typeof pingAI>>;

export function AIPanel({
  providers,
  logs,
  forceMock,
  includePro,
}: {
  providers: Provider[];
  logs: Log[];
  forceMock: boolean;
  includePro: boolean;
}) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const anyConfigured = providers.some((p) => p.configured);

  return (
    <div className="space-y-8">
      {(forceMock || !anyConfigured) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-card bg-warning-soft p-4 text-[14px]"
        >
          <WifiOff className="mt-0.5 size-5 shrink-0 text-warning" />
          <span>{forceMock ? t("forceMock") : t("keyHint")}</span>
        </motion.div>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[19px] font-semibold">{t("chain")}</h2>
          <Button size="sm" variant="secondary" icon={RefreshCw} iconAnim="spin" loading={pending} onClick={() => start(() => refreshModels())}>
            {t("refresh")}
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {providers.map((p, pi) => (
            <ProviderCard key={p.id} p={p} index={pi} includePro={includePro} />
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-[13px] text-label-2">
          <WifiOff className="size-4" /> mock / offline-tutor — {t("statMock")}
        </p>
      </section>

      <PingBox />

      <section>
        <h2 className="mb-3 text-[19px] font-semibold">{t("logs")}</h2>
        <LogTable logs={logs} />
      </section>
    </div>
  );
}

function ProviderCard({ p, index, includePro }: { p: Provider; index: number; includePro: boolean }) {
  const t = useTranslations("admin");
  const f = useFormatter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn("surface rounded-card p-4", !p.configured && "opacity-70")}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-fill text-[13px] font-bold">{index + 1}</span>
        <span className="flex-1 text-[16px] font-semibold">{p.label}</span>
        <Badge tone={p.configured ? "success" : "neutral"}>
          <KeyRound className="mr-1 inline size-3" />
          {p.configured ? t("configured") : t("notConfigured")}
        </Badge>
      </div>
      {p.error && <p className="mt-2 text-[12px] text-danger">{p.error}</p>}
      <ul className="mt-3 space-y-1.5">
        {p.models.map((m) => (
          <ModelRow key={m.id} m={m} skipped={m.pro && !includePro} format={(n) => f.dateTime(new Date(n), { timeStyle: "short" })} />
        ))}
        {p.configured && p.models.length === 0 && <li className="text-[13px] text-label-3">{t("empty")}</li>}
      </ul>
    </motion.div>
  );
}

function ModelRow({ m, skipped, format }: { m: Model; skipped: boolean; format: (n: number) => string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const Icon = m.disabled ? CircleSlash : m.pausedUntil ? PauseCircle : CheckCircle2;
  return (
    <li className={cn("flex items-center gap-2 rounded-[12px] bg-fill px-3 py-2", (m.disabled || skipped) && "opacity-55")}>
      <Icon className={cn("size-4 shrink-0", m.disabled ? "text-label-3" : m.pausedUntil ? "text-warning" : "text-success")} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[12.5px]" title={m.name}>
          {m.name} {m.pro && <span className="text-gold">· pro</span>}
          {m.latencyMs !== null && <span className="ml-1 text-label-3">~{(m.latencyMs / 1000).toFixed(1)} s</span>}
        </div>
        {m.pausedUntil && (
          <div className="truncate text-[11px] text-warning" title={m.lastError ?? ""}>
            {t("cooldown", { time: format(m.pausedUntil) })}
          </div>
        )}
      </div>
      <button
        onClick={() => start(() => toggleModel(m.id, m.disabled))}
        disabled={pending}
        className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium text-accent hover:bg-elevated disabled:opacity-50"
      >
        {m.disabled ? t("enable") : t("disable")}
      </button>
    </li>
  );
}

function PingBox() {
  const t = useTranslations("admin");
  const [text, setText] = useState("");
  const [res, setRes] = useState<Ping | null>(null);
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      setRes(null);
      setRes(await pingAI(text || t("pingPlaceholder").split(", ").pop() || "I has a cat"));
    });
  return (
    <section className="surface rounded-card p-5">
      <h2 className="text-[19px] font-semibold">{t("ping")}</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder={t("pingPlaceholder")}
          className="h-11 flex-1 rounded-control bg-fill px-4 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_4px_var(--accent-soft)]"
        />
        <Button icon={Send} iconAnim="nudge" loading={pending} onClick={run}>
          {t("run")}
        </Button>
      </div>
      <AnimatePresence>
        {res && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-4 space-y-2 rounded-[16px] bg-fill p-4 text-[14px]">
              <div className="flex flex-wrap items-center gap-2 text-label-2">
                <Badge tone={res.provider === "mock" ? "neutral" : "success"}>
                  {t("answeredBy", { provider: res.provider, model: res.model, n: res.attempts })}
                </Badge>
                <span className="tabular-nums">{res.ms} ms</span>
              </div>
              <p className="text-[15px]">{res.data.reply}</p>
              {res.data.corrections.map((c, i) => (
                <p key={i}>
                  <span className="text-danger line-through">{c.original}</span> → <b className="text-success">{c.corrected}</b>
                  <span className="text-label-2"> — {c.explanation}</span>
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function LogTable({ logs }: { logs: Log[] }) {
  const t = useTranslations("admin");
  const f = useFormatter();
  if (logs.length === 0) return <p className="text-[14px] text-label-3">{t("empty")}</p>;
  return (
    <div className="surface overflow-x-auto rounded-card">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="text-[12px] uppercase tracking-wide text-label-3">
          <tr>
            {["time", "task", "model", "status", "latency", "error"].map((k) => (
              <th key={k} className="px-4 py-3 font-semibold">
                {t(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-separator">
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-fill/60">
              <td className="whitespace-nowrap px-4 py-2 tabular-nums text-label-2">{f.dateTime(new Date(l.createdAt), { timeStyle: "medium" })}</td>
              <td className="px-4 py-2">{l.task}</td>
              <td className="px-4 py-2 font-mono text-[12px]">
                {l.provider}/{l.model}
                {l.attempt > 1 && <span className="ml-1 text-warning">#{l.attempt}</span>}
              </td>
              <td className="px-4 py-2">
                {l.ok ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-danger" />}
              </td>
              <td className="px-4 py-2 tabular-nums">{l.latencyMs} ms</td>
              <td className="max-w-[260px] truncate px-4 py-2 text-danger" title={l.error ?? ""}>
                {l.error}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
