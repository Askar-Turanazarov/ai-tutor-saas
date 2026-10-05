"use client";

import { useOptimistic, useTransition } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { TopicIcon, LEVEL_TINT } from "@/components/ui/TopicIcon";
import { toggleTopicPro } from "@/app/actions/admin";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";

type T = { id: string; slug: string; title: string; icon: string; level: string; proOnly: boolean };

export function TopicsAdmin({ topics }: { topics: T[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((tp, i) => (
        <motion.div key={tp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.02 }}>
          <Row tp={tp} />
        </motion.div>
      ))}
    </div>
  );
}

function Row({ tp }: { tp: T }) {
  const t = useTranslations("admin");
  const [, start] = useTransition();
  const [pro, setPro] = useOptimistic(tp.proOnly);
  return (
    <div className="surface flex items-center gap-3 rounded-[16px] p-3">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", LEVEL_TINT[tp.level]?.bg, LEVEL_TINT[tp.level]?.fg)}>
        <TopicIcon name={tp.icon} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{tp.title}</div>
        <div className="text-[12px] text-label-3">
          {tp.level} · {tp.slug}
        </div>
      </div>
      <label className="flex items-center gap-2 text-[12px] text-label-2">
        <Crown className={cn("size-3.5", pro ? "text-gold" : "text-label-3")} aria-hidden />
        <span className="sr-only">{t("topicProOnly")}</span>
        <Switch
          checked={pro}
          label={t("topicProOnly")}
          onChange={(v) =>
            start(async () => {
              setPro(v);
              await toggleTopicPro(tp.id, v);
            })
          }
        />
      </label>
    </div>
  );
}
