"use client";

import { useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, FastForward, FileText, Gift, Play, Receipt, RotateCcw, Undo2, Users, Wallet, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Badge, Segmented, Stagger, StaggerItem } from "@/components/ui/primitives";
import { refundInvoice, retryReceipt, runRenewalsNow, setUserPlan, shiftSubscriptionEnd, timeTravel } from "@/app/actions/admin";
import { TIERS, tierLabel } from "@/lib/billing/catalog";
import { cn } from "@/lib/cn";

type Report = { checked: number; renewed: number; failed: number; expired: number; reminded: number; cleaned: number; receipts: number };
type Sub = {
  userId: string;
  name: string;
  email: string;
  tier: string;
  period: number;
  status: string;
  live: boolean;
  provider: string;
  periodEnd: string;
  forever: boolean;
  graceUntil: string | null;
  cancelAtPeriodEnd: boolean;
  pendingTier: string | null;
  autoRenew: boolean;
  renewAttempts: number;
  card: string | null;
};
type Inv = { id: string; number: string; name: string; tier: string; period: number; amount: string; provider: string; kind: string; status: string; reason: string | null; date: string };
type Tx = { id: string; invoice: string; provider: string; providerTxId: string | null; state: string; amount: string; error: string | null; at: string };
type Hook = { id: string; provider: string; type: string; ok: boolean; error: string | null; at: string; payload: string };
type Rcp = { id: string; invoice: string; provider: string; status: string; total: string; attempts: number; error: string | null; at: string };
type Tab = "subs" | "invoices" | "txs" | "hooks" | "receipts";

const TONE: Record<string, "success" | "danger" | "gold" | "neutral" | "accent"> = {
  active: "success",
  paid: "success",
  completed: "success",
  fiscalized: "success",
  trialing: "gold",
  past_due: "danger",
  failed: "danger",
  pending: "gold",
  prepared: "gold",
  created: "gold",
  refunded: "accent",
};

/** Revenue, the billing cycle, subscriptions with test tools, and the payment logs. */
export function BillingAdmin(p: {
  lastRun: { at: string; report: Report } | null;
  stats: { revenue: string; active: number; pastDue: number; badReceipts: number };
  subs: Sub[];
  invoices: Inv[];
  txs: Tx[];
  hooks: Hook[];
  receipts: Rcp[];
}) {
  const t = useTranslations("admin");
  const f = useFormatter();
  const [tab, setTab] = useState<Tab>("subs");
  const [report, setReport] = useState<Report | null>(p.lastRun?.report ?? null);
  const [pending, start] = useTransition();
  const time = (s: string) => f.dateTime(new Date(s), { dateStyle: "short", timeStyle: "short" });

  const cards = [
    { icon: Wallet, label: t("revenue30"), value: p.stats.revenue, tone: "bg-success-soft text-success" },
    { icon: Users, label: t("activeSubs"), value: p.stats.active, tone: "bg-accent-soft text-accent" },
    { icon: AlertTriangle, label: t("pastDueSubs"), value: p.stats.pastDue, tone: "bg-danger-soft text-danger" },
    { icon: Receipt, label: t("receiptsFailed"), value: p.stats.badReceipts, tone: "bg-gold-soft text-gold" },
  ];
  const tabs: { value: Tab; label: string; n: number }[] = [
    { value: "subs", label: t("subscriptions"), n: p.subs.length },
    { value: "invoices", label: t("invoices"), n: p.invoices.length },
    { value: "txs", label: t("transactions"), n: p.txs.length },
    { value: "hooks", label: t("webhooks"), n: p.hooks.length },
    { value: "receipts", label: t("receipts"), n: p.receipts.length },
  ];

  return (
    <div className="space-y-6">
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <StaggerItem key={c.label} className="surface rounded-card p-4">
            <span className={cn("grid size-9 place-items-center rounded-[11px]", c.tone)}>
              <c.icon className="size-[18px]" />
            </span>
            <div className="mt-3 text-[22px] font-bold tabular-nums">{c.value}</div>
            <div className="text-[13px] text-label-2">{c.label}</div>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="surface flex flex-wrap items-center gap-3 rounded-card p-4">
        <Button icon={Play} loading={pending} onClick={() => start(async () => setReport(await runRenewalsNow()))}>
          {t("runRenewals")}
        </Button>
        <motion.p
          key={report ? JSON.stringify(report) : "hint"}
          initial={{ opacity: 0.4, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="min-w-0 flex-1 text-[14px] text-label-2"
        >
          {report ? t("renewResult", report) : t("runRenewalsHint")}
        </motion.p>
        {p.lastRun && <span className="text-[12px] text-label-3">{t("lastRun", { time: time(p.lastRun.at) })}</span>}
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Segmented
          value={tab}
          onChange={setTab}
          label={t("billing")}
          options={tabs.map((x) => ({
            value: x.value,
            label: (
              <span className="whitespace-nowrap">
                {x.label} <span className="text-label-3 tabular-nums">{x.n}</span>
              </span>
            ),
          }))}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          {tab === "subs" &&
            (p.subs.length === 0 ? (
              <Empty />
            ) : (
              <ul className="grid gap-3">
                {p.subs.map((s, i) => (
                  <motion.li key={s.userId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}>
                    <SubCard s={s} />
                  </motion.li>
                ))}
              </ul>
            ))}

          {tab === "invoices" && (
            <Table head={[t("number"), t("time"), t("name"), t("plan"), t("amount"), t("provider"), t("status"), ""]} empty={p.invoices.length === 0}>
              {p.invoices.map((i) => (
                <InvoiceRow key={i.id} i={i} time={time(i.date)} />
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
                    {x.providerTxId ?? "—"}
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">{x.amount}</Td>
                  <Td>
                    <Badge tone={TONE[x.state] ?? "neutral"}>{x.state}</Badge>
                  </Td>
                  <Td className="max-w-[220px] truncate text-danger" title={x.error ?? ""}>
                    {x.error}
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums text-label-2">{time(x.at)}</Td>
                </tr>
              ))}
            </Table>
          )}

          {tab === "hooks" && (
            <Table head={[t("time"), t("provider"), t("type"), t("status"), t("error")]} empty={p.hooks.length === 0}>
              {p.hooks.map((h) => (
                <tr key={h.id} title={h.payload}>
                  <Td className="whitespace-nowrap tabular-nums text-label-2">{time(h.at)}</Td>
                  <Td>{h.provider}</Td>
                  <Td className="font-mono text-[12px]">{h.type}</Td>
                  <Td>{h.ok ? <CheckCircle2 className="size-4 text-success" aria-label="ok" /> : <XCircle className="size-4 text-danger" aria-label="error" />}</Td>
                  <Td className="max-w-[260px] truncate text-danger">{h.error}</Td>
                </tr>
              ))}
            </Table>
          )}

          {tab === "receipts" && (
            <Table head={[t("number"), t("provider"), t("status"), t("amount"), t("error"), t("time"), ""]} empty={p.receipts.length === 0}>
              {p.receipts.map((r) => (
                <ReceiptRow key={r.id} r={r} time={time(r.at)} />
              ))}
            </Table>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SubCard({ s }: { s: Sub }) {
  const t = useTranslations("admin");
  const f = useFormatter();
  const [pending, start] = useTransition();
  const [tier, setTier] = useState(s.tier);
  const [days, setDays] = useState(30);
  const date = (iso: string) => f.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
    });
  const canShift = s.live && !s.forever;

  return (
    <div className="surface rounded-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{s.name}</span>
            <Badge tone={s.tier === "PRO" ? "gold" : "teal"}>{tierLabel(s.tier)}</Badge>
            <Badge tone={s.live ? (TONE[s.status] ?? "neutral") : "neutral"}>{s.status}</Badge>
            {s.autoRenew && s.live && <Badge tone="accent">{t("autoRenew")}</Badge>}
            {s.cancelAtPeriodEnd && s.live && s.provider !== "admin" && <Badge tone="neutral">{t("cancelsAtEnd")}</Badge>}
            {s.pendingTier && <Badge tone="accent">→ {tierLabel(s.pendingTier)}</Badge>}
          </div>
          <div className="truncate text-[13px] text-label-2">{s.email}</div>
          <div className="mt-1 text-[13px] text-label-3">
            {s.provider} · {s.period} {t("monthsShort")} · {t("periodEnd")}: {s.forever ? t("forever") : date(s.periodEnd)}
            {s.graceUntil && ` · ${t("graceUntil")}: ${date(s.graceUntil)}`}
            {s.renewAttempts > 0 && ` · ${t("attempts", { n: s.renewAttempts })}`}
            {s.card && ` · ${s.card}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canShift && s.status !== "past_due" && (
            <Button size="sm" variant="secondary" icon={FastForward} loading={pending} onClick={() => run(() => timeTravel(s.userId, "periodEnd"))}>
              {t("travelPeriod")}
            </Button>
          )}
          {canShift && s.status === "past_due" && (
            <Button size="sm" variant="secondary" icon={FastForward} loading={pending} onClick={() => run(() => timeTravel(s.userId, "graceEnd"))}>
              {t("travelGrace")}
            </Button>
          )}
        </div>
      </div>
      {canShift && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px]">
          <span className="mr-1 text-label-2" title={t("shiftHint")}>
            {t("shift")}
          </span>
          {[
            [t("shiftSoon"), 2 * 24 * 60],
            [t("shiftRenew"), 2],
            [t("shiftPast"), -1],
          ].map(([label, minutes]) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.94 }}
              disabled={pending}
              onClick={() => run(() => shiftSubscriptionEnd(s.userId, minutes as number))}
              className="whitespace-nowrap rounded-full bg-fill px-2.5 py-1 font-medium tabular-nums transition-colors hover:bg-fill-2 disabled:opacity-50"
            >
              {label}
            </motion.button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-separator pt-3 text-[14px]">
        <span className="text-label-2">{t("grant")}</span>
        <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label={t("plan")} className="h-9 rounded-[10px] bg-fill px-2.5 font-medium outline-none">
          {TIERS.map((x) => (
            <option key={x} value={x}>
              {tierLabel(x)}
            </option>
          ))}
        </select>
        {tier !== "FREE" && (
          <label className="flex items-center gap-1.5" title={t("daysForever")}>
            <input
              type="number"
              min={0}
              max={730}
              value={days}
              onChange={(e) => setDays(Math.max(0, Math.min(730, Number(e.target.value) || 0)))}
              className="h-9 w-20 rounded-[10px] bg-fill px-2.5 tabular-nums outline-none"
            />
            {days === 0 ? t("forever") : t("days")}
          </label>
        )}
        <Button size="sm" variant="tinted" icon={Gift} loading={pending} onClick={() => run(() => setUserPlan(s.userId, tier as "FREE" | "PLUS" | "PRO", days))}>
          {t("apply")}
        </Button>
      </div>
    </div>
  );
}

function InvoiceRow({ i, time }: { i: Inv; time: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  return (
    <tr>
      <Td className="whitespace-nowrap font-mono text-[12px]">{i.number}</Td>
      <Td className="whitespace-nowrap tabular-nums text-label-2">{time}</Td>
      <Td className="font-medium">{i.name}</Td>
      <Td>
        {tierLabel(i.tier)} · {i.period} {t("monthsShort")} <span className="text-label-3">· {i.kind}</span>
      </Td>
      <Td className="whitespace-nowrap font-semibold tabular-nums">{i.amount}</Td>
      <Td>{i.provider}</Td>
      <Td>
        <Badge tone={TONE[i.status] ?? "neutral"}>{i.status}</Badge>
        {i.reason && (
          <div className="mt-0.5 max-w-[180px] truncate text-[12px] text-label-3" title={i.reason}>
            {i.reason}
          </div>
        )}
      </Td>
      <Td className="text-right">
        {i.status === "paid" && (
          <Button size="sm" variant="ghost" icon={Undo2} loading={pending} onClick={() => start(() => refundInvoice(i.id))}>
            {t("refund")}
          </Button>
        )}
      </Td>
    </tr>
  );
}

function ReceiptRow({ r, time }: { r: Rcp; time: string }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  return (
    <tr>
      <Td className="whitespace-nowrap font-mono text-[12px]">{r.invoice}</Td>
      <Td>{r.provider}</Td>
      <Td>
        <Badge tone={TONE[r.status] ?? "neutral"}>{r.status}</Badge>
        {r.attempts > 1 && <span className="ml-1 text-[12px] text-label-3">×{r.attempts}</span>}
      </Td>
      <Td className="whitespace-nowrap tabular-nums">{r.total}</Td>
      <Td className="max-w-[220px] truncate text-danger" title={r.error ?? ""}>
        {r.error}
      </Td>
      <Td className="whitespace-nowrap tabular-nums text-label-2">{time}</Td>
      <Td className="whitespace-nowrap text-right">
        <Link href={`/app/billing/receipt/${r.id}`} aria-label={t("receipts")} className="inline-grid size-8 place-items-center rounded-full text-accent hover:bg-accent-soft">
          <FileText className="size-4" />
        </Link>
        {(r.status === "failed" || r.status === "pending") && (
          <Button size="sm" variant="ghost" icon={RotateCcw} loading={pending} onClick={() => start(() => retryReceipt(r.id))}>
            {t("retry")}
          </Button>
        )}
      </Td>
    </tr>
  );
}

function Empty() {
  const t = useTranslations("admin");
  return <p className="surface rounded-card p-5 text-[14px] text-label-3">{t("empty")}</p>;
}

function Table({ head, empty, children }: { head: string[]; empty: boolean; children: ReactNode }) {
  if (empty) return <Empty />;
  return (
    <div className="surface overflow-x-auto rounded-card">
      <table className="w-full min-w-[760px] text-left text-[13.5px]">
        <thead className="text-[12px] uppercase tracking-wide text-label-3">
          <tr className="border-b border-separator">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-3 font-semibold">
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
    <td className={cn("px-3 py-2.5 align-middle", className)} title={title}>
      {children}
    </td>
  );
}
