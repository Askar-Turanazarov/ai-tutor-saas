"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { FastForward, Gift, Play, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";
import { refundInvoice, runRenewalsNow, setUserPlan, timeTravel } from "@/app/actions/admin";
import { TIERS, tierLabel } from "@/lib/billing/catalog";

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
  graceUntil: string | null;
  cancelAtPeriodEnd: boolean;
  pendingTier: string | null;
  card: string | null;
};

type Inv = { id: string; name: string; tier: string; period: number; amount: string; provider: string; kind: string; status: string; reason: string | null; date: string };

const STATUS_TONE: Record<string, "success" | "gold" | "danger" | "neutral"> = { active: "success", trialing: "gold", past_due: "danger" };

/** Subscriptions and payments, plus test tools: time travel, renewals, refunds, manual grants. */
export function BillingAdmin({ subs, invoices }: { subs: Sub[]; invoices: Inv[] }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const renew = () =>
    start(async () => {
      const r = await runRenewalsNow();
      setResult(t("renewResult", r));
    });

  return (
    <div className="space-y-8">
      <div className="surface flex flex-wrap items-center gap-3 rounded-card p-4">
        <Button icon={Play} loading={pending} onClick={renew}>
          {t("runRenewals")}
        </Button>
        <p className="min-w-0 flex-1 text-[14px] text-label-2">{result ?? t("runRenewalsHint")}</p>
      </div>

      <section>
        <h2 className="mb-3 text-[19px] font-semibold">{t("subscriptions")}</h2>
        {subs.length === 0 ? (
          <p className="text-label-3">{t("empty")}</p>
        ) : (
          <ul className="grid gap-3">
            {subs.map((s, i) => (
              <motion.li key={s.userId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}>
                <SubCard s={s} />
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[19px] font-semibold">{t("invoices")}</h2>
        <div className="surface overflow-x-auto rounded-card">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead>
              <tr className="border-b border-separator text-left text-label-2">
                {["time", "name", "plan", "amount", "provider", "status", ""].map((k) => (
                  <th key={k} className="p-3 font-medium">
                    {k && t(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-separator">
              {invoices.map((i) => (
                <InvoiceRow key={i.id} i={i} />
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <p className="p-4 text-label-3">{t("empty")}</p>}
        </div>
      </section>
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

  return (
    <div className="surface rounded-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{s.name}</span>
            <Badge tone={s.tier === "PRO" ? "gold" : "teal"}>{tierLabel(s.tier)}</Badge>
            <Badge tone={s.live ? (STATUS_TONE[s.status] ?? "neutral") : "neutral"}>{s.status}</Badge>
            {s.cancelAtPeriodEnd && s.live && <Badge tone="neutral">{t("cancelsAtEnd")}</Badge>}
            {s.pendingTier && <Badge tone="accent">→ {tierLabel(s.pendingTier)}</Badge>}
          </div>
          <div className="truncate text-[13px] text-label-2">{s.email}</div>
          <div className="mt-1 text-[13px] text-label-3">
            {s.provider} · {s.period} {t("monthsShort")} · {t("periodEnd")}: {date(s.periodEnd)}
            {s.graceUntil && ` · ${t("graceUntil")}: ${date(s.graceUntil)}`}
            {s.card && ` · ${s.card}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.live && s.status !== "past_due" && (
            <Button size="sm" variant="secondary" icon={FastForward} loading={pending} onClick={() => run(() => timeTravel(s.userId, "periodEnd"))}>
              {t("travelPeriod")}
            </Button>
          )}
          {s.live && s.status === "past_due" && (
            <Button size="sm" variant="secondary" icon={FastForward} loading={pending} onClick={() => run(() => timeTravel(s.userId, "graceEnd"))}>
              {t("travelGrace")}
            </Button>
          )}
        </div>
      </div>
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
          <label className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={730}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(730, Number(e.target.value) || 1)))}
              className="h-9 w-20 rounded-[10px] bg-fill px-2.5 tabular-nums outline-none"
            />
            {t("days")}
          </label>
        )}
        <Button size="sm" variant="tinted" icon={Gift} loading={pending} onClick={() => run(() => setUserPlan(s.userId, tier as "FREE" | "PLUS" | "PRO", days))}>
          {t("apply")}
        </Button>
      </div>
    </div>
  );
}

function InvoiceRow({ i }: { i: Inv }) {
  const t = useTranslations("admin");
  const f = useFormatter();
  const [pending, start] = useTransition();
  return (
    <tr>
      <td className="whitespace-nowrap p-3 text-label-2">{f.dateTime(new Date(i.date), { dateStyle: "short", timeStyle: "short" })}</td>
      <td className="p-3 font-medium">{i.name}</td>
      <td className="p-3">
        {tierLabel(i.tier)} · {i.period} {t("monthsShort")} <span className="text-label-3">· {i.kind}</span>
      </td>
      <td className="whitespace-nowrap p-3 font-semibold tabular-nums">{i.amount}</td>
      <td className="p-3">{i.provider}</td>
      <td className="p-3">
        <Badge tone={i.status === "paid" ? "success" : i.status === "failed" ? "danger" : "neutral"}>{i.status}</Badge>
        {i.reason && (
          <div className="mt-0.5 max-w-[180px] truncate text-[12px] text-label-3" title={i.reason}>
            {i.reason}
          </div>
        )}
      </td>
      <td className="p-3 text-right">
        {i.status === "paid" && (
          <Button size="sm" variant="ghost" icon={Undo2} loading={pending} onClick={() => start(() => refundInvoice(i.id))}>
            {t("refund")}
          </Button>
        )}
      </td>
    </tr>
  );
}
