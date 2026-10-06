import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, tierLabel } from "@/lib/billing/catalog";
import { BillingResult } from "@/components/billing/BillingResult";
import { syncCheckoutSession } from "@/lib/billing/providers/stripe";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "billing" });
  return { title: t("receipt") };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; invoiceId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale, invoiceId } = await params;
  const { session_id } = await searchParams;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId: user.id } });
  if (!invoice) return redirect({ href: "/app/plans", locale });
  // Stripe returns here before (or without) the webhook: confirm the session through the API.
  if (invoice.status === "pending" && invoice.provider === "stripe" && session_id) {
    await syncCheckoutSession(session_id, invoice.id).catch((e) => console.error("[stripe] sync", e));
    Object.assign(invoice, await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } }));
  }
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  const slip = await db.receipt.findFirst({ where: { invoiceId: invoice.id, kind: "sale" }, select: { id: true } });
  const fmt = new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn" : locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tashkent" });
  return (
    <BillingResult
      status={invoice.status as "pending" | "paid" | "failed" | "canceled" | "refunded"}
      reason={invoice.failureReason}
      tier={tierLabel(invoice.tier)}
      until={sub ? fmt.format(sub.currentPeriodEnd) : ""}
      receipt={{
        no: invoice.number,
        amount: formatMoney(invoice.amount, invoice.currency, locale),
        date: fmt.format(invoice.paidAt ?? invoice.createdAt),
        provider: invoice.provider,
        period: invoice.period,
        receiptId: slip?.id ?? null,
      }}
    />
  );
}
