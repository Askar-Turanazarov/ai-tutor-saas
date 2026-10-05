"use client";

import { useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, FileText, Play, Receipt, Users, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, Segmented } from "@/components/ui/primitives";
import { Link } from "@/i18n/navigation";
import { retryReceipt, runBillingNow, shiftSubscriptionEnd } from "@/app/actions/admin";
import { cn } from "@/lib/cn";

type Report = { renewed: number; renewFailed: number; reminded: number; expired: number; receipts: number; cleaned: number };
type Sub = { id: string; user: string; email: string; provider: string; months: number; status: string; autoRenew: boolean; card: string | null; end: string | null };
type Inv = { id: string; number: string; user: string; kind: string; provider: string; months: number; amount: number; status: string; createdAt: string };
type Tx = { id: string; invoice: string; provider: string; providerTxId: string | null; state: string; amount: number; error: string | null; at: string };
type Hook = { id: string; provider: string; type: string; ok: boolean; error: string | null; at: string; payload: string };
type Rcp = { id: string; invoice: string; provider: string; status: string; sign: string | null; total: number; error: string | null; at: string };

const TONE: Record<string, "success" | "danger" | "gold" | "neutral" | "accent"> = {
  active: "success",
  paid: "success",
  completed: "success",
  fiscalized: "success",
  past_due: "danger",
  failed: "danger",
  canceled: "neutral",
  expired: "neutral",
  void: "neutral",
  open: "gold",
  prepared: "gold",
  created: "gold",
  pending: "gold",
  skipped: "neutral",
};

export function BillingAdmin(p: {
  lastRun: { at: string; report: Report } | null;
  stats: { revenue: number; active: number; pastDue: number; badReceipts: number };
  subs: Sub[];
  invoices: Inv[];
  txs: Tx[];
  hooks: Hook[];
  receipts: Rcp[];
}) {
  const t = useTranslations("admin");
  const f = useFormatter();
  const [tab, setTab] = useState<"subs" | "invoices" | "txs" | "hooks" | "receipts">("subs");
  const [report, setReport] = useState<Report | null>(p.lastRun?.report ?? null);
  const [pending, start] = useTransition();
  const money = (n: number) => f.number(n, { maximumFractionDigits: 0 });
  const time = (s: string | null) => (s ? f.dateTime(new Date(s), { dateStyle: "short", timeStyle: "short" }) : "—");

  const cards = [
    { icon: Wallet, label: t("revenue30"), value: `${money(p.stats.revenue)} UZS`, tone: "bg-success-soft text-success" },
    { icon: Users, label: t("activeSubs"), value: p.stats.active, tone: "bg-accent-soft text-accent" },
    { icon: AlertTriangle, label: t("pastDueSubs"), value: p.stats.pastDue, tone: "bg-danger-soft text-danger" },
    { icon: Receipt, label: t("receiptsFailed"), value: p.stats.badReceipts, tone: "bg-gold-soft text-gold" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="surface rounded-card p-4">
            <span className={cn("grid size-9 place-items-center rounded-[11px]", c.tone)}>
              <c.icon className="size-[18px]" />
            </span>
            <div className="mt-3 text-[22px] font-bold tabular-nums">{c.value}</div>
            <div className="text-[13px] text-label-2">{c.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="surface flex flex-wrap items-center gap-3 rounded-card p-4">
        <Button icon={Play} loading={pending} onClick={() => start(async () => setReport(await runBillingNow()))}>
          {t("runBilling")}
        </Button>
        <AnimatePresence mode="wait">
          {report && (
            <motion.span key={JSON.stringify(report)} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="text-[13.5px] text-label-2">
              {t("runResult", report)}
            </motion.span>
          )}
        </AnimatePresence>
        {p.lastRun && !pending && <span className="ml-auto text-[12px] text-label-3">{t("lastRun", { time: time(p.lastRun.at) })}</span>}
      </div>

      <div className="overflow-x-auto">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "subs", label: t("subscriptions") },
            { value: "invoices", label: t("invoices") },
            { value: "txs", label: t("transactions") },
            { value: "hooks", label: t("webhooks") },
            { value: "receipts", label: t("receipts") },
          ]}
        />
      </div>

      {tab === "subs" && (
        <Table head={[t("user"), t("provider"), t("period"), t("status"), t("autoRenew"), t("proUntil"), ""]} empty={p.subs.length === 0}>
          {p.subs.map((s) => (
            <tr key={s.id}>
              <Td>
                <div className="font-medium">{s.user}</div>
                <div className="text-[12px] text-label-3">{s.email}</div>
              </Td>
              <Td>{s.provider}</Td>
              <Td>{s.months}</Td>
              <Td>
                <Badge tone={TONE[s.status] ?? "neutral"}>{s.status}</Badge>
              </Td>
              <Td>{s.autoRenew ? `✓ ${s.card ?? ""}` : "—"}</Td>
              <Td className="whitespace-nowrap tabular-nums">{time(s.end)}</Td>
              <Td>{["active", "past_due"].includes(s.status) && <ShiftButtons id={s.id} />}</Td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "invoices" && (
        <Table head={[t("number"), t("user"), t("type"), t("provider"), t("amount"), t("status"), t("time")]} empty={p.invoices.length === 0}>
          {p.invoices.map((i) => (
            <tr key={i.id}>
              <Td className="font-mono text-[12px]">{i.number}</Td>
              <Td>{i.user}</Td>
              <Td>
                {i.kind} · {i.months}
              </Td>
              <Td>{i.provider}</Td>
              <Td className="tabular-nums">{money(i.amount)}</Td>
              <Td>
                <Badge tone={TONE[i.status] ?? "neutral"}>{i.status}</Badge>
              </Td>
              <Td className="whitespace-nowrap tabular-nums">{time(i.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "txs" && (
        <Table head={[t("number"), t("provider"), "ID", t("amount"), t("status"), t("error"), t("time")]} empty={p.txs.length === 0}>
          {p.txs.map((x) => (
            <tr key={x.id}>
              <Td className="font-mono text-[12px]">{x.invoice}</Td>
              <Td>{x.provider}</Td>
              <Td className="max-w-[160px] truncate font-mono text-[12px]" title={x.providerTxId ?? ""}>
                {x.providerTxId}
              </Td>
              <Td className="tabular-nums">{money(x.amount)}</Td>
              <Td>
                <Badge tone={TONE[x.state] ?? "neutral"}>{x.state}</Badge>
              </Td>
              <Td className="max-w-[220px] truncate text-danger" title={x.error ?? ""}>
                {x.error}
              </Td>
              <Td className="whitespace-nowrap tabular-nums">{time(x.at)}</Td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "hooks" && (
        <Table head={[t("time"), t("provider"), t("type"), t("status"), t("error")]} empty={p.hooks.length === 0}>
          {p.hooks.map((h) => (
            <tr key={h.id} title={h.payload.slice(0, 600)}>
              <Td className="whitespace-nowrap tabular-nums">{time(h.at)}</Td>
              <Td>{h.provider}</Td>
              <Td className="font-mono text-[12px]">{h.type}</Td>
              <Td>{h.ok ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-danger" />}</Td>
              <Td className="max-w-[260px] truncate text-danger">{h.error}</Td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "receipts" && (
        <Table head={[t("number"), t("provider"), t("status"), t("amount"), t("error"), ""]} empty={p.receipts.length === 0}>
          {p.receipts.map((r) => (
            <tr key={r.id}>
              <Td className="font-mono text-[12px]">{r.invoice}</Td>
              <Td>{r.provider}</Td>
              <Td>
                <Badge tone={TONE[r.status] ?? "neutral"}>{r.status}</Badge>
              </Td>
              <Td className="tabular-nums">{money(r.total)}</Td>
              <Td className="max-w-[220px] truncate text-danger" title={r.error ?? ""}>
                {r.error}
              </Td>
              <Td className="whitespace-nowrap">
                <Link href={`/app/billing/receipt/${r.id}`} className="mr-2 inline-flex items-center gap-1 text-accent">
                  <FileText className="size-3.5" />
                </Link>
                {(r.status === "failed" || r.status === "pending") && <RetryReceipt id={r.id} />}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function ShiftButtons({ id }: { id: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const b = (label: string, minutes: number) => (
    <button
      disabled={pending}
      onClick={() => start(() => shiftSubscriptionEnd(id, minutes))}
      className="whitespace-nowrap rounded-full bg-fill px-2.5 py-1 text-[12px] font-medium hover:bg-fill-2 disabled:opacity-50"
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-1">
      {b(t("shiftSoon"), 2 * 24 * 60)}
      {b(t("shiftRenew"), 2)}
      {b(t("shiftPast"), -1)}
    </div>
  );
}

function RetryReceipt({ id }: { id: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => retryReceipt(id))} className="text-[12px] font-medium text-accent disabled:opacity-50">
      {t("retry")}
    </button>
  );
}

function Table({ head, empty, children }: { head: string[]; empty: boolean; children: ReactNode }) {
  const t = useTranslations("admin");
  if (empty) return <p className="text-[14px] text-label-3">{t("empty")}</p>;
  return (
    <div className="surface overflow-x-auto rounded-card">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead className="text-[12px] uppercase tracking-wide text-label-3">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-separator">{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, className, title }: { children?: ReactNode; className?: string; title?: string }) {
  return (
    <td className={cn("px-4 py-2.5 align-middle", className)} title={title}>
      {children}
    </td>
  );
}
