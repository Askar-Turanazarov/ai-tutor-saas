import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { lastBillingRun } from "@/lib/billing/scheduler";
import { AdminTitle } from "@/components/admin/AdminShell";
import { BillingAdmin } from "@/components/admin/BillingAdmin";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const since = new Date(Date.now() - 30 * 86_400_000);
  const user = { select: { name: true, email: true } };
  const [revenue, active, pastDue, badReceipts, subs, invoices, txs, hooks, receipts] = await Promise.all([
    db.invoice.aggregate({ where: { status: "paid", paidAt: { gte: since } }, _sum: { amount: true } }),
    db.subscription.count({ where: { status: "active" } }),
    db.subscription.count({ where: { status: "past_due" } }),
    db.receipt.count({ where: { fiscalStatus: "failed" } }),
    db.subscription.findMany({ where: { status: { not: "pending" } }, orderBy: { updatedAt: "desc" }, take: 50, include: { user, card: true } }),
    db.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user } }),
    db.transaction.findMany({ orderBy: { updatedAt: "desc" }, take: 50, include: { invoice: { select: { number: true } } } }),
    db.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    db.receipt.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { invoice: { select: { number: true } } } }),
  ]);
  const iso = (d: Date | null) => d?.toISOString() ?? null;

  return (
    <>
      <AdminTitle title={t("billing")} hint={t("testTools")} />
      <BillingAdmin
        lastRun={lastBillingRun()}
        stats={{ revenue: (revenue._sum.amount ?? 0) / 100, active, pastDue, badReceipts }}
        subs={subs.map((s) => ({
          id: s.id,
          user: s.user.name,
          email: s.user.email,
          provider: s.provider,
          months: s.months,
          status: s.status,
          autoRenew: s.autoRenew,
          card: s.card?.maskedPan ?? null,
          end: iso(s.currentPeriodEnd),
        }))}
        invoices={invoices.map((i) => ({
          id: i.id,
          number: i.number,
          user: i.user.email,
          kind: i.kind,
          provider: i.provider,
          months: i.months,
          amount: i.amount / 100,
          status: i.status,
          createdAt: i.createdAt.toISOString(),
        }))}
        txs={txs.map((x) => ({
          id: x.id,
          invoice: x.invoice.number,
          provider: x.provider,
          providerTxId: x.providerTxId,
          state: x.state,
          amount: x.amount / 100,
          error: x.error,
          at: x.updatedAt.toISOString(),
        }))}
        hooks={hooks.map((h) => ({ id: h.id, provider: h.provider, type: h.type, ok: h.ok, error: h.error, at: h.createdAt.toISOString(), payload: h.payload }))}
        receipts={receipts.map((r) => ({
          id: r.id,
          invoice: r.invoice.number,
          provider: r.fiscalProvider,
          status: r.fiscalStatus,
          sign: r.fiscalSign,
          total: r.total / 100,
          error: r.error,
          at: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
