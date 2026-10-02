import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { isLive } from "@/lib/billing/subscription";
import { formatMoney } from "@/lib/billing/catalog";
import { AdminTitle } from "@/components/admin/AdminShell";
import { BillingAdmin } from "@/components/admin/BillingAdmin";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const [subs, invoices] = await Promise.all([
    db.subscription.findMany({
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { name: true, email: true } }, paymentMethod: true },
    }),
    db.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } } } }),
  ]);
  return (
    <>
      <AdminTitle title={t("billing")} hint={t("billingHint")} />
      <BillingAdmin
        subs={subs.map((s) => ({
          userId: s.userId,
          name: s.user.name,
          email: s.user.email,
          tier: s.tier,
          period: s.period,
          status: s.status,
          live: isLive(s),
          provider: s.provider,
          periodEnd: s.currentPeriodEnd.toISOString(),
          graceUntil: s.graceUntil?.toISOString() ?? null,
          cancelAtPeriodEnd: s.cancelAtPeriodEnd,
          pendingTier: s.pendingTier,
          card: s.paymentMethod ? `${s.paymentMethod.brand} •• ${s.paymentMethod.last4}` : null,
        }))}
        invoices={invoices.map((i) => ({
          id: i.id,
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
      />
    </>
  );
}
