import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import { billingConfig } from "@/lib/billing/config";
import { currentSubscription, isLifetimePro } from "@/lib/billing/service";
import { BillingView } from "@/components/billing/BillingView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "billing" });
  return { title: t("title") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const [sub, cards, invoices, cfg] = await Promise.all([
    currentSubscription(user.id),
    db.paymentCard.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.invoice.findMany({
      where: { userId: user.id, status: { not: "void" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { receipts: { select: { id: true }, take: 1 } },
    }),
    billingConfig(),
  ]);

  return (
    <BillingView
      pro={isPro(user)}
      lifetime={isLifetimePro(user)}
      clickAvailable={cfg.providers.click}
      sub={
        sub && {
          status: sub.status,
          provider: sub.provider,
          months: sub.months,
          autoRenew: sub.autoRenew,
          end: sub.currentPeriodEnd?.toISOString() ?? null,
          price: cfg.prices[sub.months as 1 | 3 | 12],
          card: sub.card?.maskedPan ?? null,
        }
      }
      cards={cards.map((c) => ({ id: c.id, provider: c.provider, maskedPan: c.maskedPan, brand: c.brand, expire: c.expire }))}
      invoices={invoices.map((i) => ({
        id: i.id,
        number: i.number,
        kind: i.kind,
        provider: i.provider,
        months: i.months,
        amount: i.amount / 100,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
        periodEnd: i.periodEnd?.toISOString() ?? null,
        receiptId: i.receipts[0]?.id ?? null,
      }))}
    />
  );
}
