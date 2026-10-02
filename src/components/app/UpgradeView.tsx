"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BookOpenCheck, Check, Clock, Crown, Infinity as InfinityIcon, Map, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/primitives";
import { Ornament } from "@/components/ui/brand";
import { requestUpgrade } from "@/app/actions/user";
import { celebrate } from "@/lib/celebrate";

const ICONS = [BookOpenCheck, InfinityIcon, Sparkles, Mic, Map];

export function UpgradeView({ pro, requested }: { pro: boolean; requested: boolean }) {
  const t = useTranslations("upgrade");
  const tl = useTranslations("landing");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(requested);
  const [pending, start] = useTransition();

  const features = [1, 2, 3, 4, 5].map((i) => tl(`proF${i}`));

  const cta = () =>
    start(async () => {
      await requestUpgrade();
      setDone(true);
      setOpen(true);
    });

  return (
    <div className="mx-auto max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-sheet bg-gradient-to-br from-accent-solid to-[color-mix(in_srgb,var(--accent-solid)_55%,var(--teal))] p-7 text-white shadow-float sm:p-9"
      >
        <Ornament className="pointer-events-none absolute -right-16 -top-16 size-64 text-white/10" />
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
          className="grid size-16 place-items-center rounded-[20px] bg-white/15 backdrop-blur"
        >
          <Crown className="size-8" />
        </motion.div>
        <h1 className="mt-5 text-[32px] font-bold">{t("title")}</h1>
        <p className="mt-1 text-[16px] text-white/80">{t("subtitle")}</p>
        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-[34px] font-bold tracking-tight">{tl("proPrice")}</span>
          <span className="text-white/75">{tl("perMonth")}</span>
        </div>
      </motion.div>

      <ul className="mt-6 space-y-2.5">
        {features.map((f, i) => {
          const Icon = ICONS[i] ?? Check;
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.35 }}
              className="surface flex items-center gap-3 rounded-[16px] p-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent">
                <Icon className="size-5" />
              </span>
              <span className="text-[16px] font-medium">{f}</span>
            </motion.li>
          );
        })}
      </ul>

      <div className="mt-7">
        {pro ? (
          <div className="flex items-center justify-center gap-2 rounded-[16px] bg-success-soft p-4 text-[16px] font-semibold text-success">
            <Check className="size-5" /> {t("alreadyPro")}
          </div>
        ) : (
          <Button size="lg" className="w-full" icon={done ? Clock : Sparkles} loading={pending} onClick={cta}>
            {done ? t("requested") : t("cta")}
          </Button>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} label={t("soonTitle")}>
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
            onAnimationComplete={() => celebrate()}
            className="mx-auto grid size-16 place-items-center rounded-[20px] bg-gold-soft text-gold"
          >
            <Clock className="size-8" />
          </motion.div>
          <h2 className="mt-4 text-[22px] font-bold">{t("soonTitle")}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-label-2">{t("soonText")}</p>
          <Button className="mt-6 w-full" onClick={() => setOpen(false)}>
            {tc("done")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
