"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownRight, Check, ChevronDown, Crown, Gift, Minus, Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Segmented, Sheet } from "@/components/ui/primitives";
import { Ornament } from "@/components/ui/brand";
import { scheduleDowngrade, startTrialAction } from "@/app/actions/billing";
import { PERIODS, TIER_RANK, formatMoney, tierLabel, type PaidTier, type Period, type Tier } from "@/lib/billing/catalog";
import type { PlansData } from "@/lib/billing/overview";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/cn";
import { CheckoutSheet } from "./CheckoutSheet";

type Cell = string | boolean;

export function PlansView({ data, focus }: { data: PlansData; focus?: string }) {
  const t = useTranslations("plans");
  const tb = useTranslations("billing");
  const locale = useLocale();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>((data.sub?.live && (PERIODS as readonly number[]).includes(data.sub.period) ? data.sub.period : 1) as Period);
  const [checkout, setCheckout] = useState<PaidTier | null>(null);
  const [downgrade, setDowngrade] = useState<PaidTier | null>(null);
  const [compare, setCompare] = useState(false);
  const [pending, start] = useTransition();
  const [trialError, setTrialError] = useState(false);

  const sub = data.sub?.live ? data.sub : null;
  const paid = sub && sub.status !== "trialing" && sub.provider !== "admin" ? sub : null;
  const money = (n: number, cur: "UZS" | "USD" = "UZS") => formatMoney(n, cur, locale);
  const dateFmt = new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn" : locale, { day: "numeric", month: "long" });

  const n = (v: number | null, unit: (x: number) => string): Cell => (v === null ? t("unlimited") : v === 0 ? false : unit(v));
  const L = data.limits;
  const rows: { label: string; cells: Record<Tier, Cell> }[] = [
    { label: t("rowLevels"), cells: { FREE: "A1–A2", PLUS: "A1–C2", PRO: "A1–C2" } },
    { label: t("rowMinutes"), cells: { FREE: n(L.FREE.dailyMinutes, (x) => t("minPerDay", { n: x })), PLUS: n(L.PLUS.dailyMinutes, (x) => t("minPerDay", { n: x })), PRO: n(L.PRO.dailyMinutes, (x) => t("minPerDay", { n: x })) } },
    { label: t("rowLessons"), cells: { FREE: n(L.FREE.lessonsPerDay, (x) => t("perDay", { n: x })), PLUS: n(L.PLUS.lessonsPerDay, (x) => t("perDay", { n: x })), PRO: n(L.PRO.lessonsPerDay, (x) => t("perDay", { n: x })) } },
    { label: t("rowReviews"), cells: { FREE: n(L.FREE.reviewsPerDay, (x) => t("perDay", { n: x })), PLUS: n(L.PLUS.reviewsPerDay, (x) => t("perDay", { n: x })), PRO: n(L.PRO.reviewsPerDay, (x) => t("perDay", { n: x })) } },
    { label: t("rowFeedback"), cells: { FREE: t("feedbackShort"), PLUS: t("feedbackFull"), PRO: t("feedbackPro") } },
    { label: t("rowPath"), cells: { FREE: false, PLUS: true, PRO: true } },
    { label: t("rowMistakes"), cells: { FREE: t("mistakesView"), PLUS: t("mistakesTrain"), PRO: t("mistakesTrain") } },
    { label: t("rowMissions"), cells: { FREE: n(L.FREE.missionsPerDay, (x) => t("perDay", { n: x })), PLUS: n(L.PLUS.missionsPerDay, (x) => t("perDay", { n: x })), PRO: n(L.PRO.missionsPerDay, (x) => t("perDay", { n: x })) } },
    { label: t("rowPron"), cells: { FREE: n(L.FREE.pronunciationPerDay, (x) => t("phrasesPerDay", { n: x })), PLUS: n(L.PLUS.pronunciationPerDay, (x) => t("phrasesPerDay", { n: x })), PRO: n(L.PRO.pronunciationPerDay, (x) => t("phrasesPerDay", { n: x })) } },
    { label: t("rowAiLessons"), cells: { FREE: false, PLUS: false, PRO: true } },
    { label: t("rowFreeze"), cells: { FREE: n(L.FREE.streakFreezesPerMonth, (x) => t("perMonth", { n: x })), PLUS: n(L.PLUS.streakFreezesPerMonth, (x) => t("perMonth", { n: x })), PRO: n(L.PRO.streakFreezesPerMonth, (x) => t("perMonth", { n: x })) } },
  ];
  // Short list on the cards: what each tier adds on top of the previous one.
  const highlights: Record<Tier, number[]> = { FREE: [0, 1, 3, 4], PLUS: [0, 1, 5, 6, 8], PRO: [1, 4, 7, 9, 10] };

  const trial = () =>
    start(async () => {
      const res = await startTrialAction();
      if ("ok" in res) {
        celebrate();
        router.refresh();
      } else setTrialError(true);
    });

  const confirmDowngrade = () =>
    start(async () => {
      if (!downgrade) return;
      await scheduleDowngrade({ tier: downgrade, period });
      setDowngrade(null);
      router.refresh();
    });

  function action(tier: Tier) {
    const current = data.tier === tier && (tier === "FREE" || sub?.status !== "trialing");
    if (tier === "FREE") {
      if (data.tier === "FREE") return <Button variant="secondary" className="w-full" disabled>{t("current")}</Button>;
      return paid && !paid.cancelAtPeriodEnd ? (
        <ButtonLink href="/app/billing" variant="secondary" className="w-full">{t("cancelHint")}</ButtonLink>
      ) : (
        <Button variant="secondary" className="w-full" disabled>{t("freeAfter", { date: dateFmt.format(new Date(sub!.periodEnd)) })}</Button>
      );
    }
    if (current && paid?.provider === "stripe")
      return <ButtonLink href="/app/billing" variant="secondary" className="w-full">{t("manage")}</ButtonLink>;
    if (current)
      return (
        <Button variant="tinted" className="w-full" onClick={() => setCheckout(tier)}>
          {t("extend")}
        </Button>
      );
    if (paid && TIER_RANK[tier] < TIER_RANK[paid.tier as Tier]) {
      const scheduled = paid.pendingTier === tier;
      return (
        <Button variant="secondary" className="w-full" icon={ArrowDownRight} disabled={scheduled} onClick={() => setDowngrade(tier)}>
          {scheduled ? t("downgradeScheduled", { date: dateFmt.format(new Date(paid.periodEnd)) }) : t("downgrade")}
        </Button>
      );
    }
    const q = data.quotes[tier as PaidTier][period].UZS;
    return (
      <Button className="w-full" icon={tier === "PRO" ? Crown : Sparkles} onClick={() => setCheckout(tier as PaidTier)}>
        {q.kind === "upgrade" ? t("upgradeTo", { tier: tierLabel(tier) }) : t("choose", { tier: tierLabel(tier) })}
      </Button>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="relative text-center">
        <Ornament className="pointer-events-none absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 text-accent/[0.06]" />
        <h1 className="relative text-[clamp(1.8rem,4vw,2.4rem)] font-bold">{t("title")}</h1>
        <p className="relative mx-auto mt-2 max-w-xl text-[16px] text-label-2">{t("subtitle")}</p>
        <div className="relative mt-6 flex justify-center">
          <Segmented
            size="sm"
            label={t("period")}
            value={String(period)}
            onChange={(v) => setPeriod(Number(v) as Period)}
            options={PERIODS.map((p) => ({
              value: String(p),
              label: (
                <span className="whitespace-nowrap">
                  {t("periodShort", { n: p })}
                  {data.discounts[p] > 0 && <span className="ml-1.5 rounded-full bg-teal-soft px-1.5 text-[11px] font-bold text-teal">−{data.discounts[p]}%</span>}
                </span>
              ),
            }))}
          />
        </div>
      </header>

      {sub && <StatusLine data={data} />}

      {data.trial.available && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 grid grid-cols-[auto_1fr] items-center gap-4 rounded-card bg-gold-soft p-4 sm:flex sm:p-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-gold text-white">
            <Gift className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold">{t("trialTitle", { n: data.trial.days })}</div>
            <div className="text-[14px] text-label-2">{trialError ? t("trialError") : t("trialText")}</div>
          </div>
          <Button variant="primary" className="col-span-2 sm:col-auto" loading={pending} onClick={trial}>
            {t("trialCta")}
          </Button>
        </motion.div>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        {(["FREE", "PLUS", "PRO"] as Tier[]).map((tier, i) => {
          const featured = tier === "PRO";
          const price = tier === "FREE" ? null : data.prices[tier][period].UZS;
          const isCurrent = data.tier === tier;
          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "surface relative flex flex-col rounded-card p-6",
                featured && "ring-2 ring-accent-solid/60",
                focus === tier && !featured && "ring-2 ring-teal/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[22px] font-bold">{tierLabel(tier)}</h2>
                {isCurrent ? <Badge tone="teal">{t("yourPlan")}</Badge> : featured && <Badge tone="accent">{t("popular")}</Badge>}
              </div>
              <p className="mt-1 text-[14px] text-label-2">{t(`desc${tier}`)}</p>
              <div className="mt-5 min-h-[64px]">
                {price ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <motion.span key={`${tier}${period}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-[30px] font-bold tracking-[-0.03em] tabular-nums">
                        {money(price.monthly)}
                      </motion.span>
                      <span className="text-[14px] text-label-2">{t("mo")}</span>
                    </div>
                    <div className="text-[13px] text-label-3">
                      {period > 1 ? t("billedTotal", { total: money(price.total), months: tb("months", { n: period }) }) : t("billedMonthly")}
                    </div>
                  </>
                ) : (
                  <div className="text-[30px] font-bold tracking-[-0.03em]">{money(0)}</div>
                )}
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {highlights[tier].map((r) => {
                  const cell = rows[r].cells[tier];
                  return (
                    <li key={r} className="flex items-start gap-2.5 text-[14px]">
                      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", cell ? (featured ? "bg-accent-solid text-white" : "bg-teal-soft text-teal") : "bg-fill text-label-3")}>
                        {cell ? <Check className="size-3" strokeWidth={3} /> : <Minus className="size-3" strokeWidth={3} />}
                      </span>
                      <span className={cn(!cell && "text-label-3")}>
                        {rows[r].label}
                        {typeof cell === "string" && <span className="text-label-2"> · {cell}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6">{action(tier)}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6">
        <button
          onClick={() => setCompare((v) => !v)}
          aria-expanded={compare}
          className="mx-auto flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-medium text-accent hover:bg-fill"
        >
          {t("compare")}
          <ChevronDown className={cn("size-4 transition-transform", compare && "rotate-180")} />
        </button>
        {compare && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="surface mt-3 overflow-x-auto rounded-card">
            <table className="w-full min-w-[520px] text-[14px]">
              <thead>
                <tr className="border-b border-separator text-left">
                  <th className="p-4 font-medium text-label-2" />
                  {(["FREE", "PLUS", "PRO"] as Tier[]).map((tier) => (
                    <th key={tier} className="p-4 text-center font-semibold">{tierLabel(tier)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-separator">
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td className="p-4 text-label-2">{r.label}</td>
                    {(["FREE", "PLUS", "PRO"] as Tier[]).map((tier) => {
                      const c = r.cells[tier];
                      return (
                        <td key={tier} className="p-4 text-center">
                          {c === true ? <Check className="mx-auto size-4 text-teal" strokeWidth={3} /> : c === false ? <Minus className="mx-auto size-4 text-label-3" /> : c}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-[13px] leading-relaxed text-label-3">{t("footnote")}</p>

      <CheckoutSheet data={data} tier={checkout} period={period} onClose={() => setCheckout(null)} />

      <Sheet open={!!downgrade} onClose={() => setDowngrade(null)} label={t("downgradeTitle")}>
        <h2 className="text-[22px] font-bold">{t("downgradeTitle")}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-label-2">
          {paid &&
            downgrade &&
            t("downgradeText", { tier: tierLabel(downgrade), current: tierLabel(paid.tier), date: dateFmt.format(new Date(paid.periodEnd)), months: tb("months", { n: period }) })}
        </p>
        <Button className="mt-6 w-full" loading={pending} onClick={confirmDowngrade}>
          {t("downgradeConfirm")}
        </Button>
      </Sheet>
    </div>
  );
}

function StatusLine({ data }: { data: PlansData }) {
  const t = useTranslations("plans");
  const locale = useLocale();
  const sub = data.sub!;
  const date = new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn" : locale, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(sub.status === "past_due" && sub.graceUntil ? sub.graceUntil : sub.periodEnd),
  );
  const text =
    sub.status === "trialing"
      ? t("statusTrial", { date })
      : sub.status === "past_due"
        ? t("statusPastDue", { date })
        : sub.cancelAtPeriodEnd
          ? t("statusEnds", { tier: tierLabel(sub.tier), date })
          : t("statusActive", { tier: tierLabel(sub.tier), date });
  return (
    <div
      className={cn(
        "mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-[14px]",
        sub.status === "past_due" ? "bg-danger-soft text-danger" : "bg-fill text-label-2",
      )}
    >
      {text}
    </div>
  );
}
