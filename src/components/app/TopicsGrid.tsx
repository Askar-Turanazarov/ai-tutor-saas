"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge, Card, Segmented } from "@/components/ui/primitives";
import { TopicIcon, LEVEL_TINT } from "@/components/ui/TopicIcon";
import { iconAnims } from "@/components/ui/motion";
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
      <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold">{t("title")}</h1>
      <p className="mt-1 text-[16px] text-label-2">{t("subtitle")}</p>
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
                <Link href="/app/upgrade" className="block h-full">
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
    <Card interactive className={cn("flex h-full flex-col p-5", topic.locked && "opacity-75")}>
      <div className="flex items-start justify-between">
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
