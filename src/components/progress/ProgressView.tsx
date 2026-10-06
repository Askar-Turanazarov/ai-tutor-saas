"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Snowflake, Sparkles, Trophy } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { IslimiBorder } from "@/components/decor/motifs";
import { PageHeader } from "@/components/decor/PageHeader";
import { setDailyGoal } from "@/app/actions/progress";
import { DAILY_GOALS, goalName } from "@/lib/gamification/rules";
import type { ProgressState } from "@/lib/gamification";
import { cn } from "@/lib/cn";
import { GoalRing, LevelBar, Medal, QuestList, StreakBadge } from "./parts";

/** Profile level, streak with freezes, the daily goal, today's quests and the achievement wall. */
export function ProgressView({ state: s, plan }: { state: ProgressState; plan: string }) {
  const t = useTranslations("progress");
  const locale = useLocale();
  const [goal, setGoal] = useState(s.goal);
  const [, start] = useTransition();
  const unlocked = s.achievements.filter((a) => a.unlockedAt).length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={<Trophy />} tone="gold" />

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="surface space-y-4 rounded-sheet p-5">
          <LevelBar {...s.level} />
          <p className="text-[13px] text-label-3">{t("totalXp", { n: s.xp.toLocaleString(locale) })}</p>
        </section>
        <section className="surface space-y-3 rounded-sheet p-5">
          <StreakBadge streak={s.streak.streak} freezes={s.streak.freezes} atRisk={s.streak.atRisk} />
          <p className="text-[13px] leading-snug text-label-3">
            {t("best", { n: s.bestStreak })} ·{" "}
            {s.monthlyFreezes > 0 ? (
              t("freezeInfo", { n: s.monthlyFreezes })
            ) : (
              <Link href="/app/plans?tier=PLUS" className="inline-flex items-center gap-1 font-semibold text-accent">
                <Snowflake className="size-3.5" /> {t("freezeUpsell")}
              </Link>
            )}
          </p>
        </section>
      </div>

      <section className="surface flex flex-col gap-5 rounded-sheet p-5 sm:flex-row sm:items-center">
        <GoalRing xp={s.xpToday} goal={goal} size={88} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold">{t("goalTitle")}</h2>
          <p className="mt-0.5 text-[14px] text-label-2">{s.xpToday >= goal ? t("goalReached") : t("goalLeft", { n: goal - s.xpToday })}</p>
          <div role="radiogroup" aria-label={t("goalTitle")} className="mt-3 grid grid-cols-3 gap-1.5">
            {DAILY_GOALS.map((g) => (
              <button
                key={g}
                role="radio"
                aria-checked={goal === g}
                onClick={() => {
                  setGoal(g);
                  start(() => void setDailyGoal(g));
                }}
                className={cn("rounded-[12px] px-2 py-2 text-center transition-colors", goal === g ? "bg-accent-solid text-white" : "bg-fill text-label-2 hover:text-label")}
              >
                <span className="block text-[14px] font-bold">{g} XP</span>
                <span className={cn("block text-[11px]", goal === g ? "text-white/80" : "text-label-3")}>{t(`goals.${goalName(g)}` as "goals.light")}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-label-3">{t("questsTitle")}</h2>
        <QuestList quests={s.quests} />
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-[20px] font-bold">
            <Trophy className="size-5 text-gold" /> {t("achievements.title")}
          </h2>
          <span className="text-[14px] tabular-nums text-label-3">
            {unlocked}/{s.achievements.length}
          </span>
        </div>
        <IslimiBorder className="mt-2 text-gold opacity-60" />
        <ul className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-5">
          {s.achievements.map((a, i) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 5) * 0.04 }}
              className="flex flex-col items-center text-center"
            >
              <Medal id={a.id} icon={a.icon} unlocked={!!a.unlockedAt} size={72} />
              <span className={cn("mt-1.5 text-[13px] font-semibold leading-tight", !a.unlockedAt && "text-label-2")}>
                {t(`achievements.items.${a.id}.title` as "achievements.items.first-lesson.title")}
              </span>
              <span className="mt-0.5 text-[11px] leading-snug text-label-3">
                {a.unlockedAt ? t(`achievements.items.${a.id}.text` as "achievements.items.first-lesson.text") : `${a.value.toLocaleString(locale)}/${a.threshold.toLocaleString(locale)}`}
              </span>
            </motion.li>
          ))}
        </ul>
      </section>

      {plan === "FREE" && (
        <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-label-3">
          <Sparkles className="size-3.5 text-gold" /> {t("freeNote")}
        </p>
      )}
    </div>
  );
}
