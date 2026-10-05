"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft, FlaskConical, Lock, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/primitives";
import { clickEmulatorPay } from "@/app/actions/billing";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
const fmtExpire = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/**
 * Test double of Click's hosted checkout. The server action behind "Pay" sends signed
 * Prepare/Complete callbacks to our own /api/payments/click/* routes, like Click would.
 */
export function ClickEmulator(p: { invoiceId: string; number: string; amount: number; months: number; saveCard: boolean; paid: boolean }) {
  const t = useTranslations("billing");
  const f = useFormatter();
  const router = useRouter();
  const [card, setCard] = useState("");
  const [expire, setExpire] = useState("");
  const [sms, setSms] = useState("");
  const [step, setStep] = useState<"card" | "sms">("card");
  const [save, setSave] = useState(p.saveCard);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const back = `/app/billing/return?invoice=${p.invoiceId}`;

  const errorText = (code: string) =>
    ["card_not_found", "bad_sms", "bad_expire", "insufficient_funds", "already_paid", "cancelled"].includes(code)
      ? t(`err_${code}` as "err_bad_sms")
      : t("err_generic", { code });

  const next = () => {
    setError(null);
    if (card.replace(/\D/g, "").length !== 16) return setError(t("err_card_not_found"));
    if (!/^\d{2}\/\d{2}$/.test(expire)) return setError(t("err_bad_expire"));
    setStep("sms");
  };

  const pay = () =>
    start(async () => {
      setError(null);
      const r = await clickEmulatorPay({ invoiceId: p.invoiceId, card, expire, sms, save });
      if ("ok" in r) return router.push(back);
      if (r.error === "bad_sms") return setError(errorText(r.error));
      // A declined payment is final for this attempt: show the result page like Click does.
      if (r.error === "insufficient_funds") return router.push(`${back}&canceled=1`);
      setError(errorText(r.error));
    });

  return (
    <div className="flex min-h-dvh items-start justify-center bg-bg px-4 py-10 sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[22px] font-extrabold tracking-tight text-teal">click</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-semibold text-gold">
            <FlaskConical className="size-3.5" /> {t("emuBadge")}
          </span>
        </div>

        <div className="surface rounded-sheet p-6 shadow-float">
          <div className="text-[13px] text-label-2">{t("emuMerchant", { number: p.number })}</div>
          <div className="mt-1 text-[30px] font-bold tabular-nums">{t("sum", { price: f.number(p.amount, { maximumFractionDigits: 0 }) })}</div>
          <div className="text-[14px] text-label-2">Ustoz AI Pro · {t("months", { n: p.months })}</div>

          {p.paid ? (
            <p className="mt-6 rounded-[14px] bg-success-soft p-4 text-[15px] font-medium text-success">{t("emuPaid")}</p>
          ) : (
            <div className="mt-6">
              <AnimatePresence mode="wait" initial={false}>
                {step === "card" ? (
                  <motion.div key="card" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-3">
                    <Field label={t("cardNumber")} inputMode="numeric" autoComplete="off" placeholder="8600 0000 0000 0001" value={card} onChange={(e) => setCard(fmtCard(e.target.value))} />
                    <Field label={t("expire")} inputMode="numeric" autoComplete="off" placeholder="12/29" value={expire} onChange={(e) => setExpire(fmtExpire(e.target.value))} />
                    <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-[14px]">
                      <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="size-[18px] accent-[var(--accent-solid)]" />
                      {t("saveCard")}
                    </label>
                    <Button className="mt-2 w-full" icon={MessageSquareText} onClick={next}>
                      {t("sendCode")}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="sms" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-3">
                    <p className="text-[14px] text-label-2">{t("smsSent", { phone: "+998 ** *** 45 67" })}</p>
                    <Field
                      label={t("smsCode")}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="666666"
                      value={sms}
                      onChange={(e) => setSms(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(e) => e.key === "Enter" && sms.length === 6 && pay()}
                      autoFocus
                    />
                    <Button className="mt-2 w-full" icon={Lock} loading={pending} disabled={sms.length !== 6} onClick={pay}>
                      {t("emuPay")}
                    </Button>
                    <button onClick={() => setStep("card")} className="flex items-center gap-1 text-[14px] text-accent">
                      <ArrowLeft className="size-4" /> {t("back")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 text-[14px] text-danger">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <p className={cn("mt-4 rounded-[14px] bg-fill p-3.5 text-[12.5px] leading-relaxed text-label-2")}>{t("emuHint")}</p>
        <button onClick={() => router.push(p.paid ? back : `${back}&canceled=1`)} className="mt-4 w-full text-center text-[15px] font-medium text-accent">
          {p.paid ? t("back") : t("cancel")}
        </button>
      </motion.div>
    </div>
  );
}
