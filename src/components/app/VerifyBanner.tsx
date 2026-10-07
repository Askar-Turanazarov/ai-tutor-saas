"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, MailWarning, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resendVerification } from "@/app/actions/account";

/** Shown in the app until the email address is confirmed; paying is blocked until then. */
export function VerifyBanner({ email }: { email: string }) {
  const t = useTranslations("account");
  const [note, setNote] = useState<"sent" | "wait" | null>(null);
  const [pending, start] = useTransition();
  const resend = () =>
    start(async () => {
      const r = await resendVerification();
      setNote("ok" in r || r.error === "done" ? "sent" : r.error === "wait" ? "wait" : null);
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 flex flex-col gap-3 rounded-card bg-gold-soft p-4 sm:flex-row sm:items-center"
      role="status"
    >
      <MailWarning className="size-5 shrink-0 text-gold" />
      <p className="min-w-0 flex-1 text-[14px]">
        {t("bannerText", { email })}
        {note && <span className="mt-0.5 block text-[13px] text-label-2">{t(note === "sent" ? "resent" : "wait")}</span>}
      </p>
      <Button size="sm" variant="secondary" loading={pending} icon={note === "sent" ? Check : Send} onClick={resend} className="shrink-0">
        {t("resend")}
      </Button>
    </motion.div>
  );
}
