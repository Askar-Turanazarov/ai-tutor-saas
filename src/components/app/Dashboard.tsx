"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, AudioLines, ChevronRight, Clock, Crown, Layers, MessageCircle, PenLine, Play, Sparkles, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge, Card, ProgressBar, Stagger, StaggerItem } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { TopicIcon, LEVEL_TINT } from "@/components/ui/TopicIcon";
import { iconAnims } from "@/components/ui/motion";
import { GoalRing, LevelBar, QuestList, StreakBadge } from "@/components/progress/parts";
import { LeagueStone } from "@/components/progress/LeagueView";
import type { ProgressState } from "@/lib/gamification";
import { cn } from "@/lib/cn";
import { useUsage } from "./usage";

type Quota = { used: number; max: number } | null;
type Props = {
  greeting: "morning" | "afternoon" | "evening";
  name: string;
  level: string;
  progress: ProgressState;
  lesson: { slug: string; icon: string; level: string; title: string; canDo: string; started: boolean } | undefined;
  due: number;
  mistakes: number;
  league: { key: string; rank: number; size: number; xp: number; endsIn: { days: number; hours: number } };
  /** Today's quotas for Free and Plus; null for Pro. */
  limits: { plan: string; minutes: Quota; lessons: Quota; reviews: Quota } | null;
  speaking: boolean;
};

/** "Today": the goal, what to do next, quests and the league at a glance. */
export function Dashboard({ greeting, name, level, progress: p, lesson, due, mistakes, league, limits, speaking }: Props) {
  const t = useTranslations("dashboard");
  const tl = useTranslations("league");

  return (
    <Stagger className="space-y-6">
      <StaggerItem>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-label-3">{t("today")}</p>
        <h1 className="mt-1 text-[clamp(1.75rem,4vw,2.25rem)] font-bold leading-tight">{t(greeting, { name })}</h1>
      </StaggerItem>

      <StaggerItem>
        <Card className="overflow-hidden">
          <div className="flex items-center gap-4 p-5">
            <GoalRing xp={p.xpToday} goal={p.goal} size={88} />
            <div className="min-w-0 flex-1 space-y-3">
              <StreakBadge streak={p.streak.streak} freezes={p.streak.freezes} atRisk={p.streak.atRisk} />
              <p className="text-[14px] text-label-2">{p.xpToday >= p.goal ? t("goalReached") : t("goalLeft", { n: p.goal - p.xpToday })}</p>
            </div>
          </div>
          {lesson ? (
            <Link href={`/app/learn/${lesson.slug}`} className="group flex items-center gap-4 border-t border-separator bg-accent-soft/50 p-5 transition-colors hover:bg-accent-soft">
              <span className={cn("grid size-12 shrink-0 place-items-center rounded-[14px]", LEVEL_TINT[lesson.level]?.bg, LEVEL_TINT[lesson.level]?.fg)}>
                <TopicIcon name={lesson.icon} className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-accent">{lesson.started ? t("continue") : t("next")} · {lesson.level}</span>
                <span className="block truncate text-[17px] font-semibold">{lesson.title}</span>
                <span className="block truncate text-[13px] text-label-2">{lesson.canDo}</span>
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-solid text-white transition-transform group-hover:scale-105">
                <Play className="size-5 translate-x-px" fill="currentColor" />
              </span>
            </Link>
          ) : (
            <Link href="/app/path" className="flex items-center gap-3 border-t border-separator p-5 text-[15px] font-semibold text-accent">
              {t("allDone")} <ArrowRight className="size-4" />
            </Link>
          )}
        </Card>
      </StaggerItem>

      <StaggerItem className="grid grid-cols-2 gap-3">
        <Tile href="/app/vocab" icon={Layers} tone="bg-teal-soft text-teal" title={t("review")} value={due} text={due ? t("dueCards", { n: due }) : t("noDue")} />
        <Tile href="/app/mistakes" icon={PenLine} tone="bg-danger-soft text-danger" title={t("mistakes")} value={mistakes} text={mistakes ? t("openMistakes", { n: mistakes }) : t("noMistakes")} />
      </StaggerItem>

      <StaggerItem>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[20px] font-semibold">{t("quests")}</h2>
          <Link href="/app/progress" className="flex items-center text-[14px] font-medium text-accent">
            {t("allProgress")} <ChevronRight className="size-4" />
          </Link>
        </div>
        <QuestList quests={p.quests} />
      </StaggerItem>

      <div className="grid gap-4 md:grid-cols-2">
        <StaggerItem>
          <Link href="/app/league" className="block h-full">
            <Card interactive className="flex h-full items-center gap-4 p-5">
              <LeagueStone league={league.key} size={56} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-label-2">{t("league")}</p>
                <p className="truncate text-[17px] font-semibold">{tl(`names.${league.key}`)}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[13px] text-label-2">
                  {t("place", { n: league.rank, of: league.size })} · {league.xp} XP
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-label-3">
                  <Clock className="size-3.5" /> {tl("endsIn", { d: league.endsIn.days, h: league.endsIn.hours })}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-label-3" />
            </Card>
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Card className="h-full p-5">
            <LevelBar level={p.level.level} into={p.level.into} need={p.level.need} />
            <p className="mt-3 text-[13px] text-label-2">{t("levelNote", { level })}</p>
          </Card>
        </StaggerItem>
      </div>

      {limits && <Limits {...limits} />}

      <StaggerItem className="grid gap-3 sm:grid-cols-2">
        <Action href="/app/chat" icon={MessageCircle} title={t("talk")} text={t("talkText")} iconClass="bg-accent-soft text-accent" anim="wiggle" />
        <Action href="/app/pronunciation" icon={AudioLines} title={t("pronounce")} text={t("pronounceText")} locked={!speaking} iconClass="bg-gold-soft text-gold" anim="bounce" />
      </StaggerItem>
    </Stagger>
  );
}

function Tile({ href, icon: Icon, tone, title, value, text }: { href: string; icon: LucideIcon; tone: string; title: string; value: number; text: string }) {
  return (
    <Link href={href} className="block">
      <Card interactive className="h-full p-4">
        <div className="flex items-center justify-between">
          <span className={cn("grid size-10 place-items-center rounded-[12px]", tone)}>
            <Icon className="size-5" />
          </span>
          <span className="text-[24px] font-bold tabular-nums">{value}</span>
        </div>
        <p className="mt-3 text-[15px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-label-2">{text}</p>
      </Card>
    </Link>
  );
}

/** What's left of today's quotas, with a way up. */
function Limits({ plan, minutes, lessons, reviews }: { plan: string; minutes: Quota; lessons: Quota; reviews: Quota }) {
  const t = useTranslations("dashboard");
  const { remaining } = useUsage();
  // The heartbeat keeps the minutes live while the learner is in the app.
  const mins = minutes && remaining !== null ? { ...minutes, used: Math.max(0, minutes.max - Math.ceil(remaining / 60)) } : minutes;
  const rows = [
    ["minutes", mins],
    ["lessons", lessons],
    ["reviews", reviews],
  ] as const;
  const shown = rows.filter(([, q]) => q);
  if (!shown.length) return null;
  return (
    <StaggerItem>
      <Card className="p-5">
        <h2 className="text-[17px] font-semibold">{t("limits")}</h2>
        <div className="mt-4 space-y-3.5">
          {shown.map(([key, q]) => (
            <div key={key}>
              <p className="flex justify-between text-[14px]">
                <span className="text-label-2">{t(`limit.${key}`)}</span>
                <span className="font-semibold tabular-nums">{t("left", { n: Math.max(0, q!.max - q!.used), max: q!.max })}</span>
              </p>
              <ProgressBar value={q!.used / q!.max} className="mt-1.5 h-1.5" color={q!.used >= q!.max ? "bg-gold" : "bg-teal-solid"} label={t(`limit.${key}`)} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-[14px] bg-gold-soft/60 p-3.5">
          <Sparkles className="size-5 shrink-0 text-gold" />
          <p className="min-w-0 flex-1 text-[13px] leading-snug">{plan === "FREE" ? t("upsellFree") : t("upsellPlus")}</p>
          <ButtonLink href="/app/plans" size="sm" variant="primary">
            {plan === "FREE" ? "Plus" : "Pro"}
          </ButtonLink>
        </div>
      </Card>
    </StaggerItem>
  );
}

function Action({
  href,
  icon: Icon,
  title,
  text,
  locked,
  iconClass,
  anim,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  text: string;
  locked?: boolean;
  iconClass: string;
  anim: keyof typeof iconAnims;
}) {
  return (
    <Link href={locked ? "/app/plans" : href} className="block">
      <Card interactive className="relative flex h-full items-center gap-4 p-4">
        <motion.span variants={iconAnims[anim]} className={cn("grid size-12 shrink-0 place-items-center rounded-[16px]", iconClass)}>
          <Icon className="size-6" />
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">{title}</span>
          <span className="block text-[13px] text-label-2">{text}</span>
        </span>
        {locked ? (
          <Badge tone="gold">
            <Crown className="size-3" /> Plus
          </Badge>
        ) : (
          <ChevronRight className="size-5 shrink-0 text-label-3" />
        )}
      </Card>
    </Link>
  );
}
