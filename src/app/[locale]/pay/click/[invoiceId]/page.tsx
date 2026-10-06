import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, tierLabel } from "@/lib/billing/catalog";
import { ClickCheckout } from "@/components/billing/ClickCheckout";

export const metadata = { title: "Click" };

export default async function Page({ params }: { params: Promise<{ locale: string; invoiceId: string }> }) {
  const { locale, invoiceId } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, userId: user.id, provider: "click" } });
  if (!invoice) return redirect({ href: "/app/plans", locale });
  if (invoice.status !== "pending") return redirect({ href: `/app/billing/${invoice.id}`, locale });
  return (
    <ClickCheckout
      invoiceId={invoice.id}
      tier={tierLabel(invoice.tier)}
      period={invoice.period}
      amount={formatMoney(invoice.amount, invoice.currency, locale)}
      saveCard={invoice.saveCard}
    />
  );
}
