"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, FlaskConical, Smartphone } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { cancelInvoice, clickEmulatePay } from "@/app/actions/billing";

/** Stand-in for the my.click.uz payment page: the user "pays" here and we play Click's server calls. */
export function ClickCheckout(props: { invoiceId: string; tier: string; period: number; amount: string }) {
  const t = useTranslations("pay");
  const tb = useTranslations("billing");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [running, setRunning] = useState<"success" | "insufficient" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pay = (outcome: "success" | "insufficient") =>
    start(async () => {
      setRunning(outcome);
      setError(null);
      const res = await clickEmulatePay({ invoiceId: props.invoiceId, outcome });
      if ("invoiceId" in res) return router.replace(`/app/billing/${res.invoiceId}`);
      setRunning(null);
      setError("note" in res && res.note ? res.note : t("errInvoice"));
    });

  const cancel = () =>
    start(async () => {
      await cancelInvoice(props.invoiceId);
      router.replace("/app/plans");
    });

  return (
    <div className="flex min-h-dvh items-start justify-center bg-bg px-4 py-8 sm:items-center">
      <div className="w-full max-w-[420px]">
        <div className="mb-4 flex items-start gap-2.5 rounded-[14px] bg-warning-soft px-3.5 py-3 text-[13px] leading-snug text-warning">
          <FlaskConical className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">{t("clickTitle")}</div>
            <div className="mt-0.5 opacity-90">{t("clickNote")}</div>
          </div>
        </div>

        <div className="surface overflow-hidden rounded-sheet">
          <div className="bg-gradient-to-br from-[#1b4e9b] to-[#2f74d0] px-6 py-5 text-white">
            <div className="text-[12px] uppercase tracking-wider text-white/70">Click</div>
            <div className="mt-1 text-[15px] font-semibold">
              {t("order", { tier: props.tier, months: tb("months", { n: props.period }) })}
            </div>
            <div className="mt-3 text-[28px] font-bold tabular-nums">{props.amount}</div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 rounded-[14px] bg-fill p-3.5">
              <div className="grid size-10 place-items-center rounded-[12px] bg-accent-soft text-accent">
                <Smartphone className="size-5" />
              </div>
              <div className="text-[14px] leading-snug">
                <div className="font-medium">{t("clickWallet")}</div>
                <div className="text-label-2">+998 •• ••• •• 47</div>
              </div>
            </div>

            <ol className="mt-5 space-y-2 text-[13px] text-label-2">
              {[t("clickStep1"), t("clickStep2"), t("clickStep3")].map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex gap-2.5"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-fill text-[11px] font-semibold text-label">{i + 1}</span>
                  {s}
                </motion.li>
              ))}
            </ol>

            <Button className="mt-6 w-full" size="lg" loading={running === "success"} disabled={pending} onClick={() => pay("success")}>
              {running === "success" ? t("processing") : t("payNow", { amount: props.amount })}
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              icon={ArrowLeftRight}
              loading={running === "insufficient"}
              disabled={pending}
              onClick={() => pay("insufficient")}
            >
              {t("clickDecline")}
            </Button>
            {error && <p className="mt-4 text-center text-[13px] text-danger">{error}</p>}
          </div>
        </div>

        <div className="mt-4 text-center">
          <button onClick={cancel} disabled={pending} className="text-[14px] font-medium text-label-2 hover:text-label">
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
