"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Ban, CircleCheck, CircleX, FileText, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { TileBand } from "@/components/decor/motifs";
import { Crest } from "@/components/decor/OrnamentStage";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/cn";

type Status = "pending" | "paid" | "failed" | "canceled" | "refunded";

const PROVIDER_LABEL: Record<string, string> = { card: "Uzcard / HUMO", click: "Click", stripe: "Stripe" };

export function BillingResult({
  status,
  reason,
  tier,
  until,
  receipt,
}: {
  status: Status;
  reason: string | null;
  tier: string;
  until: string;
  receipt: { no: string; amount: string; date: string; provider: string; period: number; receiptId: string | null };
}) {
  const t = useTranslations("billing");
  const router = useRouter();

  useEffect(() => {
    if (status === "paid") celebrate();
    if (status !== "pending") return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [status, router]);

  const view = {
    paid: { icon: CircleCheck, crest: "teal" as const, tone: "text-success", title: t("successTitle"), text: t("successText", { tier, date: until }) },
    pending: { icon: Loader2, crest: "accent" as const, tone: "text-accent", title: t("pendingTitle"), text: t("pendingText") },
    failed: { icon: CircleX, crest: "gold" as const, tone: "text-danger", title: t("failedTitle"), text: reason ? `${reason}. ${t("failedText")}` : t("failedText") },
    canceled: { icon: Ban, crest: "gold" as const, tone: "text-label-2", title: t("canceledTitle"), text: t("failedText") },
    refunded: { icon: Ban, crest: "gold" as const, tone: "text-label-2", title: t("canceledTitle"), text: "" },
  }[status];

  return (
    <div className="mx-auto max-w-md py-6">
      <Card className="relative overflow-hidden p-7 pt-9 text-center">
        <TileBand className="absolute inset-x-0 top-0 text-gold opacity-40" />
        <Crest size={104} tone={view.crest}>
          <view.icon className={cn("size-8", view.tone, status === "pending" && "animate-spin")} />
        </Crest>
        <h1 className="mt-5 text-[24px] font-bold">{view.title}</h1>
        {view.text && <p className="mt-2 text-[15px] leading-relaxed text-label-2">{view.text}</p>}

        <motion.dl
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 space-y-2 rounded-[16px] bg-fill p-4 text-left text-[14px]"
        >
          {[
            [t("invoiceNo"), receipt.no],
            [tier, t("months", { n: receipt.period })],
            [t("method"), PROVIDER_LABEL[receipt.provider] ?? receipt.provider],
            [t("paidAt"), receipt.date],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-label-2">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-separator pt-2 text-[15px]">
            <dt className="font-semibold">{t("receipt")}</dt>
            <dd className="font-bold tabular-nums">{receipt.amount}</dd>
          </div>
        </motion.dl>

        <div className="mt-6 grid gap-2">
          {receipt.receiptId && (
            <ButtonLink href={`/app/billing/receipt/${receipt.receiptId}`} variant="secondary" size="lg" icon={FileText} className="w-full">
              {t("openReceipt")}
            </ButtonLink>
          )}
          {status === "paid" || status === "pending" ? (
            <ButtonLink href="/app" size="lg" className="w-full">
              {t("toApp")}
            </ButtonLink>
          ) : (
            <ButtonLink href="/app/plans" size="lg" className="w-full">
              {t("tryAgain")}
            </ButtonLink>
          )}
        </div>
      </Card>
    </div>
  );
}
