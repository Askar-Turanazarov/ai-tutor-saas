"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, AudioLines, Crown, Flame, MessageCircle, Route, SpellCheck, Star, Zap, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge, Card, ProgressRing, Stagger, StaggerItem } from "@/components/ui/primitives";
import { TopicIcon, LEVEL_TINT } from "@/components/ui/TopicIcon";
import { iconAnims } from "@/components/ui/motion";
import { startConversation } from "@/app/actions/user";
import { cn } from "@/lib/cn";
import { useUsage } from "./usage";

type Props = {
  greeting: "morning" | "afternoon" | "evening";
  user: { name: string; level: string; xp: number; streak: number; pro: boolean };
  usedSeconds: number;
  limitSeconds: number | null;
  mistakes: { id: string; original: string; corrected: string; explanation: string }[];
  topics: { slug: string; icon: string; level: string; title: string; desc: string }[];
};

const DAILY_GOAL = 15 * 60;

export function Dashboard({ greeting, user, usedSeconds, limitSeconds, mistakes, topics }: Props) {
  const t = useTranslations("dashboard");
  const tl = useTranslations("levels");
  const { remaining } = useUsage();
  const used = limitSeconds !== null && remaining !== null ? limitSeconds - remaining : usedSeconds;
  const ringValue = used / (limitSeconds ?? DAILY_GOAL);

  return (
    <Stagger className="space-y-8">
      <StaggerItem>
        <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold">{t(greeting, { name: user.name.split(" ")[0] })}</h1>
        <p className="mt-1 text-[16px] text-label-2">{t("subtitle")}</p>
      </StaggerItem>

      <StaggerItem className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Stat icon={Flame} tone="text-gold bg-gold-soft" label={t("streak")} value={t("days", { n: user.streak })} anim="wiggle" />
        <Stat icon={Zap} tone="text-accent bg-accent-soft" label={t("xp")} value={user.xp.toLocaleString()} anim="pop" />
        <Stat
          icon={Star}
          tone="text-teal bg-teal-soft"
          label={tl(user.level)}
          value={user.level}
          anim="spin"
        />
        <Card className="flex items-center gap-3 p-4">
          <ProgressRing value={ringValue} size={52} stroke={7} color={limitSeconds !== null && ringValue >= 1 ? "var(--gold)" : "var(--teal)"}>
            <span className="text-[12px] font-semibold">{Math.floor(used / 60)}</span>
          </ProgressRing>
          <div className="min-w-0">
            <div className="text-[13px] text-label-2">{t("today")}</div>
            <div className="truncate text-[15px] font-semibold">
              {limitSeconds === null ? t("unlimited") : t("minutesLeft", { n: Math.ceil((remaining ?? 0) / 60) })}
            </div>
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <Action
          href="/app/chat"
          icon={MessageCircle}
          title={t("talk")}
          text={t("talkText")}
          className="bg-gradient-to-br from-accent-solid to-[#3f8fc0] text-white"
          iconClass="bg-white/20 text-white"
          textClass="text-white/80"
          anim="wiggle"
        />
        <Action href="/app/path" icon={Route} title={t("practice")} text={t("practiceText")} locked={!user.pro} iconClass="bg-teal-soft text-teal" anim="tilt" />
        <Action
          href="/app/pronunciation"
          icon={AudioLines}
          title={t("pronounce")}
          text={t("pronounceText")}
          locked={!user.pro}
          iconClass="bg-gold-soft text-gold"
          anim="bounce"
        />
      </StaggerItem>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <StaggerItem>
          <h2 className="mb-3 text-[20px] font-semibold">{t("mistakes")}</h2>
          <Card className="divide-y divide-separator overflow-hidden">
            {mistakes.length === 0 ? (
              <div className="flex items-start gap-3 p-5 text-[15px] text-label-2">
                <SpellCheck className="mt-0.5 size-5 shrink-0 text-success" />
                {t("noMistakes")}
              </div>
            ) : (
              mistakes.map((m) => (
                <div key={m.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[15px]">
                    <span className="text-danger line-through decoration-danger/50">{m.original}</span>
                    <ArrowRight className="size-3.5 text-label-3" />
                    <span className="font-semibold text-success">{m.corrected}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-label-2">{m.explanation}</p>
                </div>
              ))
            )}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <h2 className="mb-3 text-[20px] font-semibold">{t("recentTopics")}</h2>
          <div className="space-y-3">
            {topics.map((topic) => (
              <form key={topic.slug} action={startConversation.bind(null, topic.slug)}>
                <button type="submit" className="block w-full text-left">
                  <Card interactive className="flex items-center gap-4 p-4">
                    <motion.span
                      variants={iconAnims.pop}
                      className={cn("grid size-11 shrink-0 place-items-center rounded-[14px]", LEVEL_TINT[topic.level].bg, LEVEL_TINT[topic.level].fg)}
                    >
                      <TopicIcon name={topic.icon} className="size-5" />
                    </motion.span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">{topic.title}</div>
                      <div className="truncate text-[13px] text-label-2">{topic.desc}</div>
                    </div>
                    <Badge>{topic.level}</Badge>
                  </Card>
                </button>
              </form>
            ))}
          </div>
        </StaggerItem>
      </div>
    </Stagger>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  anim,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  anim: keyof typeof iconAnims;
}) {
  return (
    <Card interactive className="flex items-center gap-3 p-4">
      <motion.span variants={iconAnims[anim]} className={cn("grid size-[52px] shrink-0 place-items-center rounded-full", tone)}>
        <Icon className="size-6" />
      </motion.span>
      <div className="min-w-0">
        <div className="truncate text-[13px] text-label-2">{label}</div>
        <div className="truncate text-[17px] font-semibold">{value}</div>
      </div>
    </Card>
  );
}

function Action({
  href,
  icon: Icon,
  title,
  text,
  locked,
  className,
  iconClass,
  textClass = "text-label-2",
  anim,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  text: string;
  locked?: boolean;
  className?: string;
  iconClass: string;
  textClass?: string;
  anim: keyof typeof iconAnims;
}) {
  return (
    <Link href={locked ? "/app/plans" : href} className="block">
      <Card interactive className={cn("relative h-full p-5", className)}>
        <motion.span variants={iconAnims[anim]} className={cn("grid size-12 place-items-center rounded-[16px]", iconClass)}>
          <Icon className="size-6" />
        </motion.span>
        {locked && (
          <Badge tone="gold" className="absolute right-4 top-4">
            <Crown className="size-3" /> Pro
          </Badge>
        )}
        <div className="mt-4 text-[17px] font-semibold">{title}</div>
        <div className={cn("mt-1 text-[14px]", textClass)}>{text}</div>
      </Card>
    </Link>
  );
}
