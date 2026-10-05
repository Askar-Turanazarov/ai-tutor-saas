import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clickMode } from "@/lib/billing/config";
import { ClickEmulator } from "@/components/billing/ClickEmulator";

export const dynamic = "force-dynamic";

/** Stand-in for Click's hosted payment page while CLICK_MODE=emulator. */
export default async function Page({ params }: { params: Promise<{ locale: string; invoiceId: string }> }) {
  const { locale, invoiceId } = await params;
  setRequestLocale(locale);
  if (clickMode() !== "emulator") notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const inv = await db.invoice.findFirst({ where: { id: invoiceId, userId: user.id, provider: "click" } });
  if (!inv) notFound();
  return (
    <ClickEmulator
      invoiceId={inv.id}
      number={inv.number}
      amount={inv.amount / 100}
      months={inv.months}
      saveCard={inv.saveCard}
      paid={inv.status === "paid"}
    />
  );
}
