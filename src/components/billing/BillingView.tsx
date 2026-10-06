"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CreditCard, Crown, FileText, Receipt, Sparkles, Trash2, Wallet } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Sheet, Stagger, StaggerItem } from "@/components/ui/primitives";
import { cancelSubscription, removeCard, resumeSubscription, scheduleDowngrade } from "@/app/actions/billing";
import { formatMoney, tierLabel } from "@/lib/billing/catalog";
import type { BillingData } from "@/lib/billing/overview";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/decor/EmptyState";
import { PageHeader } from "@/components/decor/PageHeader";
import { SuzaniMedallion, TileBand } from "@/components/decor/motifs";

const PROVIDER: Record<string, string> = { card: "Uzcard / HUMO", click: "Click", stripe: "Stripe", trial: "Trial", admin: "Ustoz" };
const CHIP: Record<string, string> = { uzcard: "UZ", humo: "HUMO", visa: "VISA", mastercard: "MC" };

export function BillingView({ data }: { data: BillingData }) {
  const t = useTranslations("manage");
  const tb = useTranslations("billing");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const fmt = new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn" : locale, { day: "numeric", month: "long", year: "numeric" });
  const d = (iso: string) => fmt.format(new Date(iso));
  const sub = data.sub?.live ? data.sub : null;

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const status = !sub
    ? { tone: "neutral" as const, label: t("statusFree") }
    : sub.status === "trialing"
      ? { tone: "gold" as const, label: t("statusTrial") }
      : sub.status === "past_due"
        ? { tone: "danger" as const, label: t("statusPastDue") }
        : sub.cancelAtPeriodEnd
          ? { tone: "neutral" as const, label: t("statusCanceled") }
          : { tone: "success" as const, label: t("statusActive") };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={<Wallet />} tone="gold" />

      <Stagger className="space-y-5">
        <StaggerItem>
          <Card className="relative overflow-hidden p-6 pt-8">
            <TileBand className={cn("absolute inset-x-0 top-0 opacity-40", sub ? "text-gold" : "text-label-3")} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <SuzaniMedallion size={60} tone="gold" muted={!sub}>
                  {sub ? <Crown className="size-5 text-gold" /> : <Sparkles className="size-5" />}
                </SuzaniMedallion>
                <div>
                  <div className="flex items-center gap-2 text-[20px] font-bold">
                    {tierLabel(data.tier)}
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  {sub && (
                    <div className="text-[14px] text-label-2">
                      {tb("months", { n: sub.period })} · {PROVIDER[sub.provider] ?? sub.provider}
                    </div>
                  )}
                </div>
              </div>
              <ButtonLink href="/app/plans" variant={sub ? "secondary" : "primary"} size="sm" icon={sub ? undefined : Sparkles}>
                {sub ? t("changePlan") : t("choosePlan")}
              </ButtonLink>
            </div>

            {sub && (
              <dl className="mt-5 grid gap-3 rounded-[16px] bg-fill p-4 text-[14px] sm:grid-cols-2">
                <div>
                  <dt className="text-label-2">{sub.cancelAtPeriodEnd || sub.status === "trialing" ? t("accessUntil") : t("periodEnds")}</dt>
                  <dd className="mt-0.5 font-semibold">{d(sub.periodEnd)}</dd>
                </div>
                <div>
                  <dt className="text-label-2">{t("nextCharge")}</dt>
                  <dd className="mt-0.5 font-semibold">
                    {data.next ? `${formatMoney(data.next.amount, data.next.currency, locale)} · ${d(data.next.date)}` : t("noCharge")}
                  </dd>
                </div>
              </dl>
            )}

            {sub?.status === "past_due" && (
              <div className="mt-4 flex gap-2.5 rounded-[14px] bg-danger-soft p-3.5 text-[14px] text-danger">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  {t("pastDueText", { date: d(sub.graceUntil ?? sub.periodEnd) })}{" "}
                  <Link href="/app/plans" className="font-semibold underline">
                    {t("payNow")}
                  </Link>
                </div>
              </div>
            )}
            {sub?.pendingTier && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-accent-soft p-3.5 text-[14px] text-accent">
                <span>
                  {t("pendingChange", {
                    tier: tierLabel(sub.pendingTier),
                    months: tb("months", { n: sub.pendingPeriod ?? sub.period }),
                    date: d(sub.periodEnd),
                  })}
                </span>
                <button
                  className="font-semibold underline"
                  disabled={pending}
                  onClick={() => run(() => scheduleDowngrade({ tier: sub.tier, period: sub.period }))}
                >
                  {t("undo")}
                </button>
              </div>
            )}
            {sub?.status === "trialing" && <p className="mt-4 text-[14px] text-label-2">{t("trialText", { date: d(sub.periodEnd) })}</p>}
            {sub?.provider === "click" && !sub.cancelAtPeriodEnd && <p className="mt-4 text-[14px] text-label-2">{t("clickText")}</p>}

            {sub && sub.status !== "trialing" && sub.provider !== "admin" && (
              <div className="mt-5 flex flex-wrap gap-2">
                {sub.cancelAtPeriodEnd ? (
                  <Button size="sm" loading={pending} onClick={() => run(resumeSubscription)}>
                    {t("resume")}
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => setConfirmCancel(true)}>
                    {t("cancel")}
                  </Button>
                )}
              </div>
            )}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold">
              <CreditCard className="size-5 text-label-2" /> {t("cards")}
            </h2>
            {data.cards.length === 0 ? (
              <EmptyState className="mt-3" tone="teal" icon={<CreditCard />} text={t("noCards")} />
            ) : (
              <ul className="mt-3 divide-y divide-separator">
                {data.cards.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-3">
                    <span className="grid h-8 w-12 place-items-center rounded-[7px] bg-gradient-to-br from-[#1d4f91] to-[#2a7ab8] text-[10px] font-bold text-white">
                      {CHIP[c.brand] ?? c.brand.slice(0, 4).toUpperCase()}
                    </span>
                    <span className="flex-1 text-[15px]">
                      •• {c.last4} <span className="text-[13px] text-label-3">{c.exp}</span>
                      {sub?.method?.id === c.id && <span className="ml-2 text-[12px] font-medium text-teal">{t("autoRenewCard")}</span>}
                    </span>
                    <button
                      aria-label={t("removeCard")}
                      disabled={pending}
                      onClick={() => run(() => removeCard(c.id))}
                      className="grid size-9 place-items-center rounded-full text-label-3 hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold">
              <Receipt className="size-5 text-label-2" /> {t("history")}
            </h2>
            {data.invoices.length === 0 ? (
              <EmptyState className="mt-3" tone="gold" icon={<Receipt />} text={t("noInvoices")} />
            ) : (
              <ul className="mt-2 divide-y divide-separator">
                {data.invoices.map((i, n) => (
                  <motion.li key={i.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: n * 0.02 }}>
                    <Link href={`/app/billing/${i.id}`} className="-mx-2 flex items-center gap-3 rounded-[12px] px-2 py-3 hover:bg-fill">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium">
                          {tierLabel(i.tier)} · {tb("months", { n: i.period })} <span className="text-label-3">· {t(`kind_${i.kind}`)}</span>
                        </span>
                        <span className="block text-[13px] text-label-2">
                          {d(i.date)} · {PROVIDER[i.provider] ?? i.provider} · <span className="tabular-nums">{i.number}</span>
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[15px] font-semibold tabular-nums">{formatMoney(i.amount, i.currency, locale)}</span>
                        <Badge tone={i.status === "paid" ? "success" : i.status === "failed" ? "danger" : "neutral"}>{t(`inv_${i.status}`)}</Badge>
                      </span>
                    </Link>
                    {i.receiptId && (
                      <Link
                        href={`/app/billing/receipt/${i.receiptId}`}
                        className="-mt-1 mb-2 ml-auto flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-medium text-accent hover:bg-accent-soft"
                      >
                        <FileText className="size-3.5" /> {t("receiptLink")}
                      </Link>
                    )}
                  </motion.li>
                ))}
              </ul>
            )}
          </Card>
        </StaggerItem>
      </Stagger>

      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} label={t("cancelTitle")}>
        <h2 className="text-[22px] font-bold">{t("cancelTitle")}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-label-2">{sub && t("cancelText", { date: d(sub.periodEnd) })}</p>
        <div className="mt-6 grid gap-2">
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
            {t("keep")}
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              run(async () => {
                await cancelSubscription();
                setConfirmCancel(false);
              })
            }
          >
            {t("cancelConfirm")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
