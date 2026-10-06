"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, Lock, Map as MapIcon, Play, Sparkles, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/primitives";
import { TopicIcon } from "@/components/ui/TopicIcon";
import { spring } from "@/components/ui/motion";
import { IslimiBorder, SuzaniMedallion } from "@/components/decor/motifs";
import { PageHeader } from "@/components/decor/PageHeader";
import { cn } from "@/lib/cn";
import type { LessonAccess } from "@/lib/learning/progress";
import { AiLessons, type PersonalLesson } from "./AiLessons";

export type MapLesson = {
  id: string;
  slug: string;
  level: string;
  icon: string;
  title: string;
  canDo: string;
  access: LessonAccess;
  done: boolean;
  started: boolean;
  stars: number;
  recommended: boolean;
};

/** The lesson path: levels as chapters, each lesson a majolica medallion on a winding road. */
export function LessonMap({ lessons, ai }: { lessons: MapLesson[]; ai: { allowed: boolean; level: string; lessons: PersonalLesson[] } }) {
  const t = useTranslations("path");
  const done = lessons.filter((l) => l.done).length;
  const next = lessons.find((l) => l.recommended);
  const levels = [...new Set(lessons.map((l) => l.level))];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={<MapIcon />} />

      {next && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="surface flex flex-col gap-4 rounded-sheet p-5 sm:flex-row sm:items-center">
          <SuzaniMedallion size={72} tone="accent">
            <TopicIcon name={next.icon} className="size-6 text-accent" />
          </SuzaniMedallion>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent">
              {t("recommended")} · {next.level}
            </p>
            <p className="mt-0.5 text-[19px] font-bold leading-snug">{next.title}</p>
            <p className="mt-1 text-[14px] leading-snug text-label-2">{next.canDo}</p>
          </div>
          <ButtonLink href={`/app/learn/${next.slug}`} icon={Play} className="sm:shrink-0">
            {next.started ? t("continue") : t("start")}
          </ButtonLink>
        </motion.div>
      )}

      <div className="surface flex items-center gap-4 rounded-card p-4">
        <span className="shrink-0 text-[14px] font-medium text-label-2">{t("progress", { done, total: lessons.length })}</span>
        <ProgressBar value={done / Math.max(1, lessons.length)} className="flex-1" color="bg-teal-solid" />
      </div>

      <AiLessons {...ai} />

      {levels.map((level) => {
        const group = lessons.filter((l) => l.level === level);
        const locked = group.every((l) => l.access !== "open");
        return (
          <section key={level} aria-labelledby={`lvl-${level}`} className="pt-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="text-[13px] font-bold tracking-wider text-accent">{level}</span>
                <h2 id={`lvl-${level}`} className="text-[20px] font-bold leading-tight">
                  {t.has(`levels.${level}`) ? t(`levels.${level}` as "levels.A1") : level}
                </h2>
              </div>
              {locked ? (
                <Link href="/app/plans?tier=PLUS" className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1.5 text-[13px] font-semibold text-gold">
                  <Sparkles className="size-3.5" /> {t("lockedTier", { tier: "Plus" })}
                </Link>
              ) : (
                <span className="text-[14px] tabular-nums text-label-3">{t("levelDone", { done: group.filter((l) => l.done).length, total: group.length })}</span>
              )}
            </div>
            <IslimiBorder className="mt-2 text-gold opacity-60" />
            <ol className="mx-auto flex max-w-md flex-col items-center py-4">
              {group.map((l, i) => (
                <Node key={l.id} lesson={l} offset={Math.round(Math.sin(i * 1.1) * 72)} delay={(i % 6) * 0.04} />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function Node({ lesson: l, offset, delay }: { lesson: MapLesson; offset: number; delay: number }) {
  const locked = l.access !== "open";
  const tone = l.done ? "teal" : l.recommended ? "accent" : "gold";
  return (
    <motion.li
      initial={{ opacity: 0, scale: 0.7 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ ...spring, delay }}
      style={{ x: offset }}
      className="my-1.5 w-40"
    >
      <Link href={`/app/learn/${l.slug}`} className="group flex flex-col items-center rounded-card p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <motion.span whileHover={locked ? undefined : { y: -3, scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={spring} className="relative">
          {l.recommended && <span className="absolute inset-2 rounded-full bg-accent-solid/40" style={{ animation: "pulse-ring 1.8s ease-out infinite" }} />}
          <SuzaniMedallion size={84} tone={tone} muted={locked}>
            {l.done ? (
              <Check className="size-7 text-teal" strokeWidth={3} />
            ) : locked ? (
              <Lock className="size-6" />
            ) : (
              <TopicIcon name={l.icon} className={cn("size-7", l.recommended ? "text-accent" : "text-label")} />
            )}
          </SuzaniMedallion>
        </motion.span>
        <span className="mt-1 flex gap-0.5" aria-label={`${l.stars}/3`}>
          {[0, 1, 2].map((s) => (
            <Star key={s} className={cn("size-3.5", s < l.stars ? "fill-gold text-gold" : "text-fill-2")} strokeWidth={2} />
          ))}
        </span>
        <span className={cn("mt-1 text-[14px] font-semibold leading-tight", locked ? "text-label-3" : "text-label")}>{l.title}</span>
      </Link>
    </motion.li>
  );
}
