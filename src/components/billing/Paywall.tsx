"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/Button";
import { requiredTier, type Feature } from "@/lib/billing/entitlements";
import { tierLabel } from "@/lib/billing/catalog";
import { SuzaniMedallion, TileBand } from "@/components/decor/motifs";

/** Contextual paywall: a blurred preview of the feature and a way straight to the plan that unlocks it. */
export function Paywall({ feature, title, text, preview }: { feature: Feature; title: string; text: string; preview: ReactNode }) {
  const t = useTranslations("paywall");
  const tier = requiredTier(feature);
  return (
    <div className="relative overflow-hidden rounded-card">
      <div aria-hidden inert className="pointer-events-none select-none opacity-60 blur-[6px]">
        {preview}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-bg/60 to-bg p-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
          className="glass-thick relative max-w-sm overflow-hidden rounded-sheet border p-7 pt-9 text-center"
        >
          <TileBand className="absolute inset-x-0 top-0 text-gold opacity-40" />
          <SuzaniMedallion size={76} tone="gold">
            <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }} className="text-gold">
              <Lock className="size-6" />
            </motion.span>
          </SuzaniMedallion>
          <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-gold">{t("from", { tier: tierLabel(tier) })}</div>
          <h2 className="mt-1 text-[21px] font-bold">{title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-label-2">{text}</p>
          <ButtonLink href={`/app/plans?tier=${tier}`} icon={Sparkles} className="mt-6 w-full">
            {t("cta", { tier: tierLabel(tier) })}
          </ButtonLink>
        </motion.div>
      </div>
    </div>
  );
}
