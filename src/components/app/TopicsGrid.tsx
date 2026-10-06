"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Lock, MessagesSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge, Card, Segmented } from "@/components/ui/primitives";
import { TopicIcon, LEVEL_TINT } from "@/components/ui/TopicIcon";
import { iconAnims, spring } from "@/components/ui/motion";
import { starPath } from "@/components/decor/motifs";
import { PageHeader } from "@/components/decor/PageHeader";
import { startConversation } from "@/app/actions/user";
import { LEVELS } from "@/lib/levels";
import { cn } from "@/lib/cn";

type Topic = { slug: string; icon: string; level: string; title: string; desc: string; locked: boolean };

export function TopicsGrid({ topics, userLevel }: { topics: Topic[]; userLevel: string }) {
  const t = useTranslations("topics");
  const tc = useTranslations("common");
  const [filter, setFilter] = useState<string>(userLevel);
  const shown = filter === "all" ? topics : topics.filter((x) => x.level === filter);

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={<MessagesSquare />} tone="teal" />
      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-1">
        <Segmented
          value={filter}
          onChange={setFilter}
          label={tc("level")}
          options={[{ value: "all", label: t("all") }, ...LEVELS.map((l) => ({ value: l, label: l }))]}
        />
      </div>
      <motion.div layout className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((topic, i) => (
            <motion.div
              key={topic.slug}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.03 } }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {topic.locked ? (
                <Link href="/app/plans" className="block h-full">
                  <TopicCard topic={topic} cta={tc("locked")} />
                </Link>
              ) : (
                <form action={startConversation.bind(null, topic.slug)} className="h-full">
                  <button type="submit" className="block h-full w-full text-left">
                    <TopicCard topic={topic} cta={t("start")} />
                  </button>
                </form>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function TopicCard({ topic, cta }: { topic: Topic; cta: string }) {
  const tint = LEVEL_TINT[topic.level];
  return (
    <Card interactive className={cn("relative flex h-full flex-col overflow-hidden p-5", topic.locked && "opacity-75")}>
      <motion.svg
        viewBox="0 0 100 100"
        variants={{ hover: { rotate: 45, scale: 1.12, transition: spring } }}
        className={cn("pointer-events-none absolute -bottom-8 -right-8 size-28 opacity-[0.07]", tint.fg)}
        aria-hidden
      >
        <path d={starPath(50, 50, 48, 34)} fill="none" stroke="currentColor" strokeWidth="3" />
        <path d={starPath(50, 50, 24, 16)} fill="currentColor" />
      </motion.svg>
      <div className="relative flex items-start justify-between">
        <motion.span variants={iconAnims.tilt} className={cn("grid size-12 place-items-center rounded-[16px]", tint.bg, tint.fg)}>
          <TopicIcon name={topic.icon} className="size-6" />
        </motion.span>
        <Badge tone={topic.locked ? "gold" : "neutral"}>
          {topic.locked && <Lock className="size-3" />}
          {topic.level}
        </Badge>
      </div>
      <h3 className="mt-4 text-[17px] font-semibold">{topic.title}</h3>
      <p className="mt-1 flex-1 text-[14px] text-label-2">{topic.desc}</p>
      <div className={cn("mt-4 flex items-center gap-1 text-[14px] font-semibold", topic.locked ? "text-gold" : "text-accent")}>
        {cta}
        <motion.span variants={iconAnims.nudge} className="inline-flex">
          <ArrowRight className="size-4" />
        </motion.span>
      </div>
    </Card>
  );
}
