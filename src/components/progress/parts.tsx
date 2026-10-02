"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Brain,
  Check,
  CheckCheck,
  Crown,
  Drama,
  Flame,
  Gem,
  GraduationCap,
  Layers,
  Library,
  Lock,
  MessageCircle,
  PenLine,
  Snowflake,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { ProgressBar, ProgressRing } from "@/components/ui/primitives";
import { SuzaniMedallion } from "@/components/decor/motifs";
import { spring } from "@/components/ui/motion";
import { cn } from "@/lib/cn";

const ICONS: Record<string, LucideIcon> = { BookOpen, Brain, CheckCheck, Crown, Drama, Flame, Gem, GraduationCap, Layers, Library, MessageCircle, PenLine, Sparkles, Star, Zap };

export function GameIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Star;
  return <Icon {...props} />;
}

/** Today's XP against the daily goal. */
export function GoalRing({ xp, goal, size = 76 }: { xp: number; goal: number; size?: number }) {
  const t = useTranslations("progress");
  const done = xp >= goal;
  return (
    <ProgressRing value={xp / goal} size={size} stroke={size / 9} color={done ? "var(--turquoise)" : "var(--ochre)"}>
      <span className="flex flex-col items-center leading-none">
        {done ? <Check className="size-6 text-teal" strokeWidth={3} /> : <span className="text-[17px] font-bold tabular-nums">{xp}</span>}
        <span className="mt-0.5 text-[10px] font-medium text-label-3">{done ? t("goalDone") : `/ ${goal} XP`}</span>
      </span>
    </ProgressRing>
  );
}

export type QuestView = { key: string; target: number; progress: number; xp: number; done: boolean };
export const QUEST_ICON: Record<string, string> = { xp: "Zap", lesson: "BookOpen", correct: "CheckCheck", review: "Layers", chat: "MessageCircle", mission: "Drama", perfect: "Star" };

export function QuestList({ quests }: { quests: QuestView[] }) {
  const t = useTranslations("progress");
  return (
    <ul className="space-y-2.5">
      {quests.map((q) => (
        <li key={q.key} className={cn("flex items-center gap-3 rounded-card border border-separator bg-elevated p-3.5", q.done && "border-teal/30 bg-teal-soft/40")}>
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", q.done ? "bg-teal-soft text-teal" : "bg-gold-soft text-gold")}>
            {q.done ? <Check className="size-5" strokeWidth={3} /> : <GameIcon name={QUEST_ICON[q.key]} className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className={cn("text-[15px] font-semibold leading-snug", q.done && "text-label-2")}>{t(`quests.${q.key}` as "quests.xp", { n: q.target })}</span>
              <span className="shrink-0 text-[12px] font-bold text-gold">+{q.xp} XP</span>
            </span>
            <span className="mt-1.5 flex items-center gap-2">
              <ProgressBar value={q.progress / q.target} className="h-1.5 flex-1" color={q.done ? "bg-teal-solid" : "bg-gold"} label={t(`quests.${q.key}` as "quests.xp", { n: q.target })} />
              <span className="text-[12px] tabular-nums text-label-3">
                {q.progress}/{q.target}
              </span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** An achievement as a majolica medallion; locked ones are grey with how far along the learner is. */
export function Medal({ id, icon, unlocked, size = 76 }: { id: string; icon: string; unlocked: boolean; size?: number }) {
  const t = useTranslations("progress.achievements");
  const tone = id.startsWith("streak") ? "gold" : id.startsWith("xp") || id.startsWith("perfect") ? "accent" : "teal";
  return (
    <SuzaniMedallion size={size} tone={tone} muted={!unlocked}>
      {unlocked ? (
        <GameIcon name={icon} style={{ width: size * 0.3, height: size * 0.3 }} className={tone === "gold" ? "text-gold" : tone === "teal" ? "text-teal" : "text-accent"} />
      ) : (
        <Lock style={{ width: size * 0.2, height: size * 0.2 }} className="text-label-3" aria-label={t("locked")} />
      )}
    </SuzaniMedallion>
  );
}

export function StreakBadge({ streak, freezes, atRisk }: { streak: number; freezes: number; atRisk: boolean }) {
  const t = useTranslations("progress");
  return (
    <div className="flex items-center gap-3">
      <motion.span
        animate={streak > 0 ? { scale: [1, 1.12, 1] } : undefined}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2 }}
        className={cn("grid size-12 place-items-center rounded-[14px]", streak > 0 ? "bg-gold-soft text-gold" : "bg-fill text-label-3")}
      >
        <Flame className="size-6" />
      </motion.span>
      <div>
        <p className="text-[22px] font-bold leading-none tabular-nums">{t("streakDays", { n: streak })}</p>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-label-2">
          <Snowflake className="size-3.5 text-accent" /> {t("freezes", { n: freezes })}
          {atRisk && <span className="ml-1 font-semibold text-gold">· {t("atRisk")}</span>}
        </p>
      </div>
    </div>
  );
}

export function LevelBar({ level, into, need }: { level: number; into: number; need: number }) {
  const t = useTranslations("progress");
  return (
    <div className="flex items-center gap-3">
      <motion.span initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={spring} className="shrink-0">
        <SuzaniMedallion size={56} tone="accent">
          <span className="text-[18px] font-bold text-accent">{level}</span>
        </SuzaniMedallion>
      </motion.span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between text-[14px]">
          <span className="font-semibold">{t("level", { n: level })}</span>
          <span className="tabular-nums text-label-3">
            {into}/{need} XP
          </span>
        </p>
        <ProgressBar value={into / need} className="mt-1.5" label={t("level", { n: level })} />
      </div>
    </div>
  );
}
