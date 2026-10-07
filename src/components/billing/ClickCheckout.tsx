"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FlaskConical, MessageSquareText } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { TermsNote } from "@/components/legal/TermsNote";
import { Field } from "@/components/ui/primitives";
import { cancelInvoice, clickEmulatePay } from "@/app/actions/billing";
import { CardFace, brandOf, formatExp, groupCard } from "./CardCheckout";

const TEST_CARDS = [
  { number: "8600 0000 0000 0001", ok: true },
  { number: "9860 0000 0000 0001", ok: true },
  { number: "8600 0000 0000 0002", ok: false },
];

/**
 * Stand-in for the my.click.uz payment page: card → SMS code → payment. "Pay" makes the server
 * play Click's part: it sends signed Prepare and Complete requests to our own SHOP API.
 */
export function ClickCheckout(props: { invoiceId: string; tier: string; period: number; amount: string; saveCard: boolean }) {
  const t = useTranslations("pay");
  const tb = useTranslations("billing");
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [sms, setSms] = useState("");
  const [save, setSave] = useState(props.saveCard);
  const [step, setStep] = useState<"card" | "sms">("card");
  const [error, setError] = useState<{ field: "number" | "exp" | "code" | "form"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const digits = number.replace(/\D/g, "");

  const next = () => {
    setError(null);
    if (!TEST_CARDS.some((c) => c.number.replace(/\s/g, "") === digits)) return setError({ field: "number", text: t("errClickCard") });
    if (!/^\d{2}\/\d{2}$/.test(exp)) return setError({ field: "exp", text: t("errExp") });
    setStep("sms");
  };

  const pay = () =>
    start(async () => {
      setError(null);
      const res = await clickEmulatePay({ invoiceId: props.invoiceId, card: digits, exp, sms, save });
      if ("invoiceId" in res) return router.replace(`/app/billing/${res.invoiceId}`);
      if (res.error === "code") return setError({ field: "code", text: t("errClickSms") });
      if (res.error === "card" || res.error === "exp") {
        setStep("card");
        return setError(res.error === "card" ? { field: "number", text: t("errClickCard") } : { field: "exp", text: t("errExp") });
      }
      setError({ field: "form", text: "note" in res && res.note ? res.note : t("errInvoice") });
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
            <div className="text-[20px] font-extrabold tracking-tight">click</div>
            <div className="mt-1 text-[15px] font-semibold">{t("order", { tier: props.tier, months: tb("months", { n: props.period }) })}</div>
            <div className="mt-3 text-[28px] font-bold tabular-nums">{props.amount}</div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait" initial={false}>
              {step === "card" ? (
                <motion.div key="card" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <CardFace number={number} exp={exp} brand={brandOf(digits)} />
                  <div className="mt-4 flex flex-wrap gap-1.5" aria-label={t("testCardsTitle")}>
                    {TEST_CARDS.map((c) => (
                      <button
                        key={c.number}
                        type="button"
                        onClick={() => {
                          setNumber(c.number);
                          if (!exp) setExp("12/29");
                          setError(null);
                        }}
                        className="rounded-full bg-fill px-2.5 py-1 font-mono text-[12px] tabular-nums text-label-2 transition-colors hover:bg-fill-2"
                      >
                        •• {c.number.slice(-4)} <span className={c.ok ? "text-success" : "text-danger"}>{c.ok ? "✓" : "✕"}</span>
                      </button>
                    ))}
                  </div>
                  <Field
                    className="mt-4"
                    label={t("cardNumber")}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="8600 0000 0000 0001"
                    value={number}
                    onChange={(e) => setNumber(groupCard(e.target.value))}
                    error={error?.field === "number" ? error.text : undefined}
                  />
                  <Field
                    className="mt-3"
                    label={t("exp")}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={t("expPlaceholder")}
                    value={exp}
                    onChange={(e) => setExp(formatExp(e.target.value))}
                    error={error?.field === "exp" ? error.text : undefined}
                  />
                  <label className="mt-4 flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--accent-solid)]" />
                    <span>
                      <span className="block text-[14px] font-medium">{t("saveCard")}</span>
                      <span className="block text-[12.5px] text-label-2">{t("saveCardHint")}</span>
                    </span>
                  </label>
                  <Button className="mt-5 w-full" size="lg" onClick={next} disabled={digits.length < 16 || exp.length < 5}>
                    {t("getCode")}
                  </Button>
                  <TermsNote kind="gateway" className="mt-3" />
                </motion.div>
              ) : (
                <motion.div key="sms" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <div className="grid size-12 place-items-center rounded-[16px] bg-accent-soft text-accent">
                    <MessageSquareText className="size-6" />
                  </div>
                  <h1 className="mt-4 text-[20px] font-bold">{t("smsTitle")}</h1>
                  <p className="mt-1 text-[14px] text-label-2">{t("smsSent", { phone: "+998 •• ••• 45 67" })}</p>
                  <p className="mt-3 rounded-[12px] bg-fill px-3 py-2 text-[13px] text-label-2">{t("clickSmsHint", { code: "666666" })}</p>
                  <Field
                    className="mt-4"
                    label={t("code")}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={sms}
                    onChange={(e) => setSms(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && sms.length === 6 && pay()}
                    error={error?.field === "code" ? error.text : undefined}
                    autoFocus
                  />
                  <Button className="mt-5 w-full" size="lg" loading={pending} onClick={pay} disabled={sms.length !== 6}>
                    {pending ? t("processing") : t("payNow", { amount: props.amount })}
                  </Button>
                  <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep("card")} disabled={pending}>
                    {t("changeCard")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            {error?.field === "form" && <p className="mt-4 text-center text-[13px] text-danger">{error.text}</p>}

            <ol className="mt-6 space-y-2 border-t border-separator pt-4 text-[12.5px] text-label-2">
              {[t("clickStep1"), t("clickStep2"), t("clickStep3")].map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-fill text-[11px] font-semibold text-label">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
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
