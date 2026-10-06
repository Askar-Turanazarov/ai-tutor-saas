"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, FlaskConical, Printer } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";
import { TileBand } from "@/components/decor/motifs";
import { cn } from "@/lib/cn";

type Props = {
  test: boolean;
  seller: { name: string; tin: string };
  number: string;
  date: string;
  items: {
    name: string;
    qty: number;
    price: string;
    sum: string;
    mxik: string;
    packageCode: string;
  }[];
  total: string;
  vat: { percent: number; amount: string };
  paidBy: string;
  fiscal: {
    status: string;
    terminal: string | null;
    receiptNo: string | null;
    sign: string | null;
    error: string | null;
  };
  invoiceId: string;
  qr: string;
};

const STATUS_TONE: Record<string, "success" | "danger" | "neutral"> = {
  fiscalized: "success",
  failed: "danger",
};

/** Fiscal receipt as a slip of paper: torn edge, dashed rules, QR. Printable on its own. */
export function ReceiptView(p: Props) {
  const t = useTranslations("receipt");
  const reduce = useReducedMotion();

  const Row = ({ k, v, strong }: { k: string; v: string | null | undefined; strong?: boolean }) =>
    v ? (
      <div className={cn("flex justify-between gap-4", strong && "text-[17px] font-bold text-label")}>
        <span className={strong ? undefined : "text-label-2"}>{k}</span>
        <span className="text-right tabular-nums">{v}</span>
      </div>
    ) : null;
  const Rule = () => <hr className="my-4 border-dashed border-separator" />;

  return (
    <div className="mx-auto max-w-[400px] py-2">
      <div className="flex items-center justify-between print:hidden">
        <ButtonLink href={`/app/billing/${p.invoiceId}`} variant="ghost" size="sm" icon={ArrowLeft}>
          {t("back")}
        </ButtonLink>
        <Button size="sm" variant="secondary" icon={Printer} onClick={() => window.print()}>
          {t("print")}
        </Button>
      </div>

      <motion.article
        initial={reduce ? false : { opacity: 0, y: -24, rotate: -1.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="print-area mt-4 drop-shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
      >
        <div className="receipt-paper bg-elevated px-6 pb-10 font-mono text-[12.5px] leading-relaxed">
          <TileBand className="-mx-6 w-[calc(100%+3rem)] text-gold/70" />
          {p.test && (
            <p className="mt-4 flex items-center justify-center gap-1.5 rounded-[10px] bg-gold-soft px-2 py-1.5 text-center font-sans text-[11.5px] font-bold uppercase tracking-wide text-gold">
              <FlaskConical className="size-3.5" /> {t("test")}
            </p>
          )}
          <h1 className="mt-5 text-center font-lesson text-[19px] font-semibold not-italic text-label">{t("title")}</h1>
          <p className="mt-1 text-center text-label-2">{p.seller.name}</p>
          <p className="text-center text-label-2">
            {t("tin")}: {p.seller.tin}
          </p>
          <Rule />
          <Row k={t("number")} v={p.number} />
          <Row k={t("date")} v={p.date} />
          <Rule />
          {p.items.map((i, n) => (
            <div key={n} className="space-y-0.5">
              <div className="font-semibold text-label">{i.name}</div>
              <Row k={`${i.qty} × ${i.price}`} v={i.sum} />
              <Row k={t("mxik")} v={i.mxik} />
              <Row k={t("packageCode")} v={i.packageCode} />
            </div>
          ))}
          <Rule />
          <Row k={t("total")} v={p.total} strong />
          <Row k={t("vat", { n: p.vat.percent })} v={p.vat.amount} />
          <Row k={t("paidBy")} v={p.paidBy} />
          <Rule />
          <div className="flex items-center justify-between gap-4">
            <span className="text-label-2">{t("status")}</span>
            <Badge tone={STATUS_TONE[p.fiscal.status] ?? "neutral"}>{t(`status_${p.fiscal.status}` as "status_pending")}</Badge>
          </div>
          <Row k={t("terminal")} v={p.fiscal.terminal} />
          <Row k={t("receiptNo")} v={p.fiscal.receiptNo} />
          <Row k={t("fiscalSign")} v={p.fiscal.sign} />
          {p.fiscal.error && <p className="mt-2 text-danger">{p.fiscal.error}</p>}
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="size-[132px] rounded-[10px] bg-white p-2.5 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: p.qr }} />
            <span className="text-center text-[11px] text-label-3">{t("qrHint")}</span>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
