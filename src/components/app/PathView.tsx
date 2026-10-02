"use client";

import { Fragment, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, Lock, Play, RotateCcw, Star } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { ProgressBar } from "@/components/ui/primitives";
import { TopicIcon } from "@/components/ui/TopicIcon";
import { spring } from "@/components/ui/motion";
import { createQuiz } from "@/app/actions/user";
import { cn } from "@/lib/cn";
import { ProLock } from "./ProLock";

type Unit = { id: string; title: string; icon: string; level: string; status: string; stars: number };

export function PathView({ pro, units }: { pro: boolean; units: Unit[] }) {
  const t = useTranslations("path");
  const done = units.filter((u) => u.status === "done").length;

  const header = (
    <div>
      <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold">{t("title")}</h1>
      <p className="mt-1 text-[16px] text-label-2">{t("subtitle")}</p>
    </div>
  );

  if (!pro)
    return (
      <div className="space-y-6">
        {header}
        <ProLock title={t("proTitle")} text={t("proText")} preview={<Path units={units} interactive={false} />} />
      </div>
    );

  return (
    <div className="space-y-6">
      {header}
      <div className="surface flex items-center gap-4 rounded-card p-4">
        <span className="text-[14px] font-medium text-label-2">{t("progress", { done, total: units.length })}</span>
        <ProgressBar value={done / Math.max(1, units.length)} className="flex-1" color="bg-teal" />
      </div>
      <Path units={units} interactive />
    </div>
  );
}

function Path({ units, interactive }: { units: Unit[]; interactive: boolean }) {
  const t = useTranslations("path");
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(units.find((u) => u.status === "current")?.id ?? null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [, start] = useTransition();

  const begin = (u: Unit) =>
    start(async () => {
      setLoadingId(u.id);
      const res = await createQuiz(u.id);
      if ("id" in res && res.id) router.push(`/app/quiz/${res.id}`);
      else setLoadingId(null);
    });

  return (
    <div className="relative mx-auto flex max-w-md flex-col items-center py-6">
      {units.map((u, i) => {
        const offset = Math.sin(i * 0.9) * 70;
        const newLevel = i === 0 || units[i - 1].level !== u.level;
        const open = openId === u.id && interactive;
        return (
          <Fragment key={u.id}>
            {newLevel && (
              <div className="my-6 flex w-full items-center gap-3 text-[13px] font-semibold uppercase tracking-wider text-label-3">
                <span className="h-px flex-1 bg-separator" />
                {u.level}
                <span className="h-px flex-1 bg-separator" />
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: (i % 6) * 0.04 }}
              style={{ x: offset }}
              className="relative my-2 flex flex-col items-center"
            >
              <Node unit={u} onClick={() => interactive && u.status !== "locked" && setOpenId(open ? null : u.id)} />
              <div className="mt-1.5 flex gap-0.5" aria-label={`${u.stars}/3`}>
                {[0, 1, 2].map((s) => (
                  <Star
                    key={s}
                    className={cn("size-3.5", s < u.stars ? "fill-gold text-gold" : "text-fill-2")}
                    strokeWidth={2}
                  />
                ))}
              </div>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    transition={spring}
                    style={{ x: -offset }}
                    className="absolute top-[100px] z-20 w-64 rounded-[20px] bg-elevated p-4 text-center shadow-float"
                  >
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-label-3">{t("unit", { n: i + 1 })}</div>
                    <div className="mt-1 text-[16px] font-semibold">{u.title}</div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => begin(u)}
                      disabled={!!loadingId}
                      className={cn(
                        "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-semibold text-white",
                        u.status === "done" ? "bg-teal" : "bg-accent-solid",
                      )}
                    >
                      {loadingId === u.id ? (
                        <>
                          <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          {t("generating")}
                        </>
                      ) : u.status === "done" ? (
                        <>
                          <RotateCcw className="size-4" /> {t("review")}
                        </>
                      ) : (
                        <>
                          <Play className="size-4" fill="currentColor" /> {t("start")}
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </Fragment>
        );
      })}
    </div>
  );
}

function Node({ unit, onClick }: { unit: Unit; onClick: () => void }) {
  const current = unit.status === "current";
  const done = unit.status === "done";
  const locked = unit.status === "locked";
  return (
    <motion.button
      onClick={onClick}
      whileHover={locked ? undefined : { scale: 1.06, y: -2 }}
      whileTap={locked ? { x: [0, -4, 4, 0] } : { scale: 0.94, y: 3 }}
      transition={spring}
      aria-label={unit.title}
      aria-disabled={locked}
      className={cn(
        "relative grid size-[72px] place-items-center rounded-full",
        // The lower "lip" gives the node a pressable, tactile feel.
        done && "bg-teal text-white shadow-[0_6px_0_0_color-mix(in_srgb,var(--teal)_60%,black)]",
        current && "bg-accent-solid text-white shadow-[0_6px_0_0_color-mix(in_srgb,var(--accent-solid)_60%,black)]",
        locked && "bg-fill-2 text-label-3 shadow-[0_6px_0_0_var(--fill)]",
      )}
    >
      {current && (
        <span
          className="absolute inset-0 rounded-full bg-accent-solid"
          style={{ animation: "pulse-ring 1.8s ease-out infinite" }}
        />
      )}
      <span className="relative">
        {done ? (
          <Check className="size-8" strokeWidth={3} />
        ) : locked ? (
          <Lock className="size-6" />
        ) : (
          <TopicIcon name={unit.icon} className="size-8" />
        )}
      </span>
    </motion.button>
  );
}
