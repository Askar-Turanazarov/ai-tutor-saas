"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FlaskConical, Lock, MessageSquareText } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { TermsNote } from "@/components/legal/TermsNote";
import { Field } from "@/components/ui/primitives";
import { cancelInvoice, cardConfirm, cardSendCode } from "@/app/actions/billing";
import { cn } from "@/lib/cn";

export type Brand = "uzcard" | "humo" | "visa" | "mastercard";

export function brandOf(digits: string): Brand | null {
  if (digits.length < 4) return null;
  if (digits.startsWith("9860")) return "humo";
  if (digits.startsWith("8600") || digits.startsWith("5614")) return "uzcard";
  if (digits.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  return "uzcard";
}

const BRAND_LABEL: Record<Brand, string> = { uzcard: "UZCARD", humo: "HUMO", visa: "VISA", mastercard: "Mastercard" };

/** Card face colours echo the real schemes without copying their marks. */
const BRAND_FACE: Record<Brand, string> = {
  uzcard: "from-[#1d4f91] to-[#2a7ab8]",
  humo: "from-[#0f5c4c] to-[#1f8a6e]",
  visa: "from-[#23305e] to-[#3b4d8f]",
  mastercard: "from-[#3a2a22] to-[#7a4a2a]",
};

export const groupCard = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();

export const formatExp = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export function CardCheckout(props: { invoiceId: string; tier: string; period: number; amount: string; saveCard: boolean }) {
  const t = useTranslations("pay");
  const tb = useTranslations("billing");
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [save, setSave] = useState(props.saveCard);
  const [step, setStep] = useState<"card" | "sms">("card");
  const [verify, setVerify] = useState<{ id: string; code: string; phone: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ field: "number" | "exp" | "code" | "form"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const digits = number.replace(/\D/g, "");
  const brand = brandOf(digits);

  const sendCode = () =>
    start(async () => {
      setError(null);
      const res = await cardSendCode({ invoiceId: props.invoiceId, number: digits, exp, saveCard: save });
      if ("error" in res) {
        if (res.error === "number") return setError({ field: "number", text: t("errNumber") });
        if (res.error === "exp") return setError({ field: "exp", text: t("errExp") });
        return setError({ field: "form", text: t("errInvoice") });
      }
      setVerify({ id: res.verifyId, code: res.code, phone: res.phone });
      setStep("sms");
    });

  const confirm = () =>
    start(async () => {
      setError(null);
      if (!verify) return;
      const res = await cardConfirm({ verifyId: verify.id, code });
      if ("ok" in res) return router.replace(`/app/billing/${res.invoiceId}`);
      if (res.error === "code") return setError({ field: "code", text: t("errCode") });
      if (res.error === "declined") return router.replace(`/app/billing/${res.invoiceId}`);
      if (res.error === "expired") {
        setStep("card");
        return setError({ field: "form", text: t("errExpired") });
      }
      setError({ field: "form", text: t("errInvoice") });
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
            <div className="font-semibold">{t("gatewayTitle")}</div>
            <div className="mt-0.5 opacity-90">{t("gatewayNote")}</div>
          </div>
        </div>

        <div className="surface overflow-hidden rounded-sheet">
          <div className="flex items-center justify-between border-b border-separator px-6 py-4">
            <div>
              <div className="text-[12px] text-label-3">{t("merchant")}</div>
              <div className="text-[15px] font-semibold">
                {t("order", { tier: props.tier, months: tb("months", { n: props.period }) })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[12px] text-label-3">{t("amount")}</div>
              <div className="text-[17px] font-bold tabular-nums">{props.amount}</div>
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait" initial={false}>
              {step === "card" ? (
                <motion.div key="card" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <CardFace number={number} exp={exp} brand={brand} />
                  <Field
                    className="mt-5"
                    label={t("cardNumber")}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="8600 0000 0000 0000"
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
                    <input
                      type="checkbox"
                      checked={save}
                      onChange={(e) => setSave(e.target.checked)}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--accent-solid)]"
                    />
                    <span>
                      <span className="block text-[14px] font-medium">{t("saveCard")}</span>
                      <span className="block text-[12.5px] text-label-2">{t("saveCardHint")}</span>
                    </span>
                  </label>
                  <Button className="mt-5 w-full" size="lg" loading={pending} onClick={sendCode} disabled={digits.length < 16 || exp.length < 5}>
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
                  <p className="mt-1 text-[14px] text-label-2">{t("smsSent", { phone: verify?.phone ?? "" })}</p>
                  <p className="mt-3 rounded-[12px] bg-fill px-3 py-2 text-[13px] text-label-2">{t("testCode", { code: verify?.code ?? "" })}</p>
                  <Field
                    className="mt-4"
                    label={t("code")}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && code.length === 6 && confirm()}
                    error={error?.field === "code" ? error.text : undefined}
                    autoFocus
                  />
                  <Button className="mt-5 w-full" size="lg" loading={pending} onClick={confirm} disabled={code.length !== 6}>
                    {pending ? t("processing") : t("payNow", { amount: props.amount })}
                  </Button>
                  <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep("card")} disabled={pending}>
                    {t("changeCard")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {error?.field === "form" && <p className="mt-4 text-center text-[13px] text-danger">{error.text}</p>}
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-label-3">
          <Lock className="size-3.5" />
          {t("secure")}
        </p>
        <p className="mt-2 text-center text-[12px] leading-snug text-label-3">{t("testCards")}</p>
        <div className="mt-3 text-center">
          <button onClick={cancel} disabled={pending} className="text-[14px] font-medium text-label-2 hover:text-label">
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CardFace({ number, exp, brand }: { number: string; exp: string; brand: Brand | null }) {
  const shown = (number.replace(/\s/g, "") + "•".repeat(16)).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  return (
    <div
      className={cn(
        "relative aspect-[1.586] w-full overflow-hidden rounded-[18px] bg-gradient-to-br p-5 text-white shadow-float transition-colors duration-500",
        brand ? BRAND_FACE[brand] : "from-[#5b6170] to-[#8a8f9c]",
      )}
    >
      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 -left-6 size-44 rounded-full bg-white/[0.06]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="h-7 w-10 rounded-[6px] bg-gradient-to-br from-[#e8d7a8] to-[#b99b5a]" />
          <AnimatePresence mode="wait">
            {brand && (
              <motion.span
                key={brand}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="text-[15px] font-bold tracking-wider"
              >
                {BRAND_LABEL[brand]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="whitespace-nowrap font-mono text-[clamp(15px,4.6vw,19px)] tracking-[0.1em] tabular-nums">{shown}</div>
        <div className="text-right font-mono text-[14px] tabular-nums opacity-85">{exp || "MM/YY"}</div>
      </div>
    </div>
  );
}
