import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { billingConfig } from "@/lib/billing/config";
import type { ReceiptItem } from "@/lib/billing/fiscal";
import { ReceiptActions } from "@/components/billing/ReceiptActions";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const r = await db.receipt.findFirst({
    where: { id, invoice: user.role === "ADMIN" ? undefined : { userId: user.id } },
    include: { invoice: true, transaction: true },
  });
  if (!r) notFound();
  const [t, f, cfg] = await Promise.all([getTranslations("billing"), getFormatter(), billingConfig()]);
  const items = JSON.parse(r.items) as ReceiptItem[];
  const money = (tiyin: number) => f.number(tiyin / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const vatPercent = items[0]?.vatPercent ?? cfg.fiscal.vatPercent;
  const row = (k: string, v: string | null | undefined) =>
    v ? (
      <div className="flex justify-between gap-4">
        <span className="text-label-2">{k}</span>
        <span className="text-right">{v}</span>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-sm">
      <ReceiptActions back={t("back")} print={t("print")} />
      <article className="surface mt-4 rounded-card p-6 font-mono text-[13px] leading-relaxed print:shadow-none">
        {r.fiscalProvider !== "click-ofd" && (
          <p className="mb-4 rounded-[10px] bg-gold-soft p-2 text-center text-[11.5px] font-bold text-gold">{t("receiptTest")}</p>
        )}
        <h1 className="text-center text-[16px] font-bold">{t("receiptTitle")}</h1>
        <p className="text-center text-label-2">{cfg.fiscal.sellerName}</p>
        <p className="text-center text-label-2">
          {t("tin")}: {cfg.fiscal.sellerTin}
        </p>
        <hr className="my-4 border-dashed border-separator" />
        {row(t("number"), r.invoice.number)}
        {row(t("date"), f.dateTime(r.fiscalizedAt ?? r.createdAt, { dateStyle: "short", timeStyle: "medium" }))}
        <hr className="my-4 border-dashed border-separator" />
        {items.map((i, n) => (
          <div key={n} className="space-y-0.5">
            <div className="font-semibold">{i.name}</div>
            {row(`${i.qty} × ${money(i.price)}`, money(i.price * i.qty))}
            {row(t("mxik"), i.mxik)}
            {row(t("packageCode"), i.packageCode)}
          </div>
        ))}
        <hr className="my-4 border-dashed border-separator" />
        <div className="flex justify-between text-[16px] font-bold">
          <span>{t("total")}</span>
          <span>{money(r.total)}</span>
        </div>
        {row(t("vat", { n: vatPercent }), money(r.vatAmount))}
        {row(t("paidBy"), `${r.invoice.provider === "click" ? "Click" : "Stripe"} · UZS`)}
        <hr className="my-4 border-dashed border-separator" />
        {row(t("status"), t(`fiscal_${r.fiscalStatus}` as "fiscal_pending"))}
        {row(t("terminal"), r.terminalId)}
        {row(t("receiptNo"), r.receiptNo)}
        {row(t("fiscalSign"), r.fiscalSign)}
        {r.error && <p className="mt-2 text-danger">{r.error}</p>}
      </article>
    </div>
  );
}
