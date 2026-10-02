"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/Button";

/** Friendly paywall: shows a blurred preview of the feature with a clear way forward. */
export function ProLock({ title, text, preview }: { title: string; text: string; preview: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className="relative overflow-hidden rounded-card">
      <div aria-hidden className="pointer-events-none select-none opacity-60 blur-[6px]">
        {preview}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-bg/60 to-bg p-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
          className="surface max-w-sm rounded-sheet p-7 text-center"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}
            className="mx-auto grid size-14 place-items-center rounded-[18px] bg-gold-soft text-gold"
          >
            <Crown className="size-7" />
          </motion.div>
          <h2 className="mt-4 text-[21px] font-bold">{title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-label-2">{text}</p>
          <ButtonLink href="/app/upgrade" icon={Sparkles} className="mt-6 w-full">
            {t("upgrade")}
          </ButtonLink>
        </motion.div>
      </div>
    </div>
  );
}
