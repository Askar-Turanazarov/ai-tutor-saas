import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { autoRenews, isForever, isLive } from "@/lib/billing/subscription";
import { lastBillingRun } from "@/lib/billing/scheduler";
import { formatMoney } from "@/lib/billing/catalog";
import { AdminTitle } from "@/components/admin/AdminShell";
import { BillingAdmin } from "@/components/admin/BillingAdmin";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const now = new Date();
  const [subs, invoices, txs, hooks, receipts, revenue, badReceipts] = await Promise.all([
    db.subscription.findMany({
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { name: true, email: true } }, paymentMethod: true },
    }),
    db.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } } } }),
    db.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { invoice: { select: { number: true } } } }),
    db.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.receipt.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { invoice: { select: { number: true } } } }),
    db.invoice.aggregate({ _sum: { amount: true }, where: { status: "paid", paidAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } } }),
    db.receipt.count({ where: { fiscalStatus: { in: ["pending", "failed"] } } }),
  ]);
  const live = subs.filter((s) => isLive(s, now));
  const time = (d: Date | null) => d?.toISOString() ?? null;

  return (
    <>
      <AdminTitle title={t("billing")} hint={t("billingHint")} />
      <BillingAdmin
        lastRun={lastBillingRun()}
        stats={{
          revenue: formatMoney(revenue._sum.amount ?? 0, "UZS", locale),
          active: live.filter((s) => s.status !== "past_due").length,
          pastDue: live.filter((s) => s.status === "past_due").length,
          badReceipts,
        }}
        subs={subs.map((s) => ({
          userId: s.userId,
          name: s.user.name,
          email: s.user.email,
          tier: s.tier,
          period: s.period,
          status: s.status,
          live: isLive(s, now),
          provider: s.provider,
          periodEnd: s.currentPeriodEnd.toISOString(),
          forever: isForever(s),
          graceUntil: time(s.graceUntil),
          cancelAtPeriodEnd: s.cancelAtPeriodEnd,
          pendingTier: s.pendingTier,
          autoRenew: autoRenews(s),
          renewAttempts: s.renewAttempts,
          card: s.paymentMethod ? `${s.paymentMethod.brand} •• ${s.paymentMethod.last4}` : null,
        }))}
        invoices={invoices.map((i) => ({
          id: i.id,
          number: i.number,
          name: i.user.name,
          tier: i.tier,
          period: i.period,
          amount: formatMoney(i.amount, i.currency, locale),
          provider: i.provider,
          kind: i.kind,
          status: i.status,
          reason: i.failureReason,
          date: i.createdAt.toISOString(),
        }))}
        txs={txs.map((x) => ({
          id: x.id,
          invoice: x.invoice.number,
          provider: x.provider,
          providerTxId: x.providerTxId,
          state: x.state,
          amount: formatMoney(x.amount, "UZS", locale),
          error: x.error,
          at: x.updatedAt.toISOString(),
        }))}
        hooks={hooks.map((h) => ({ id: h.id, provider: h.provider, type: h.type, ok: h.ok, error: h.error, at: h.createdAt.toISOString(), payload: h.payload.slice(0, 600) }))}
        receipts={receipts.map((r) => ({
          id: r.id,
          invoice: r.invoice.number,
          provider: r.fiscalProvider,
          status: r.fiscalStatus,
          total: formatMoney(r.total, "UZS", locale),
          attempts: r.attempts,
          error: r.error,
          at: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
