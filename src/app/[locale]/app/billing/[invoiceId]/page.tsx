import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, tierLabel } from "@/lib/billing/catalog";
import { BillingResult } from "@/components/billing/BillingResult";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "billing" });
  return { title: t("receipt") };
}

export default async function Page({ params }: { params: Promise<{ locale: string; invoiceId: string }> }) {
  const { locale, invoiceId } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId: user.id } });
  if (!invoice) return redirect({ href: "/app/plans", locale });
  const sub = user.subscription;
  const fmt = new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn" : locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tashkent" });
  return (
    <BillingResult
      status={invoice.status as "pending" | "paid" | "failed" | "canceled" | "refunded"}
      reason={invoice.failureReason}
      tier={tierLabel(invoice.tier)}
      until={sub ? fmt.format(sub.currentPeriodEnd) : ""}
      receipt={{
        no: invoice.id.slice(-8).toUpperCase(),
        amount: formatMoney(invoice.amount, invoice.currency, locale),
        date: fmt.format(invoice.paidAt ?? invoice.createdAt),
        provider: invoice.provider,
        period: invoice.period,
      }}
    />
  );
}
