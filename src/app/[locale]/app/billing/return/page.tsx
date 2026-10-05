import { setRequestLocale } from "next-intl/server";
import { PaymentReturn } from "@/components/billing/PaymentReturn";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invoice?: string; canceled?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { invoice, canceled } = await searchParams;
  return <PaymentReturn invoiceId={invoice ?? ""} canceled={canceled === "1"} />;
}
