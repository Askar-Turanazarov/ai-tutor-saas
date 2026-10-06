import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/billing/catalog";
import { fiscalSettings, type ReceiptItem } from "@/lib/billing/fiscal";
import { ReceiptView } from "@/components/billing/ReceiptView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({
    locale: (await params).locale,
    namespace: "receipt",
  });
  return { title: t("title") };
}

const PROVIDER: Record<string, string> = {
  card: "Uzcard / HUMO",
  click: "Click",
  stripe: "Visa / Mastercard (Stripe)",
};

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const r = await db.receipt.findFirst({
    where: {
      id,
      invoice: user.role === "ADMIN" ? undefined : { userId: user.id },
    },
    include: { invoice: true },
  });
  if (!r) notFound();

  const seller = await fiscalSettings();
  const items = JSON.parse(r.items) as ReceiptItem[];
  const money = (n: number) => formatMoney(n, "UZS", locale);
  const dt = new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn" : locale, {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Tashkent",
  });
  // A real OFD gives a soliq.uz check link; the test receipt points back to this page.
  const h = await headers();
  const self = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/${locale}/app/billing/receipt/${r.id}`;
  const qr = await QRCode.toString(r.qrUrl ?? self, {
    type: "svg",
    margin: 0,
    color: { dark: "#1c1c1e", light: "#ffffff" },
  });

  return (
    <ReceiptView
      test={r.fiscalProvider !== "click-ofd"}
      seller={{ name: seller.sellerName, tin: seller.sellerTin }}
      number={r.invoice.number}
      date={dt.format(r.fiscalizedAt ?? r.createdAt)}
      items={items.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: money(i.price),
        sum: money(i.price * i.qty),
        mxik: i.mxik,
        packageCode: i.packageCode,
      }))}
      total={money(r.total)}
      vat={{
        percent: items[0]?.vatPercent ?? seller.vatPercent,
        amount: money(r.vatAmount),
      }}
      paidBy={PROVIDER[r.invoice.provider] ?? r.invoice.provider}
      fiscal={{
        status: r.fiscalStatus,
        terminal: r.terminalId,
        receiptNo: r.receiptNo,
        sign: r.fiscalSign,
        error: r.error,
      }}
      invoiceId={r.invoiceId}
      qr={qr}
    />
  );
}
