"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Sheet } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { SuzaniMedallion } from "@/components/decor/motifs";
import { markCelebrated } from "@/app/actions/progress";
import { celebrate } from "@/lib/celebrate";
import { ACHIEVEMENTS } from "@/lib/gamification/rules";
import { Medal } from "./parts";

type Item = { kind: "level"; level: number } | { kind: "achievement"; id: string };

/**
 * New achievements and profile levels, shown one after another the next time the app renders
 * (they're earned on the server, in whatever action gave the XP).
 */
export function Celebrations({ achievements, level, paused }: { achievements: string[]; level: number | null; paused: boolean }) {
  const t = useTranslations("progress");
  const [queue, setQueue] = useState<Item[]>([]);
  const key = `${level}|${achievements.join(",")}`;

  useEffect(() => {
    const items: Item[] = [...(level ? [{ kind: "level", level } as const] : []), ...achievements.map((id) => ({ kind: "achievement", id }) as const)];
    if (!items.length) return;
    setQueue(items);
    void markCelebrated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = paused ? undefined : queue[0];
  useEffect(() => {
    if (current) celebrate();
  }, [current]);

  const next = () => setQueue((q) => q.slice(1));
  const def = current?.kind === "achievement" ? ACHIEVEMENTS.find((a) => a.id === current.id) : undefined;

  return (
    <Sheet open={!!current} onClose={next} label={t("celebrateLabel")}>
      {current && (
        <div className="flex flex-col items-center pt-2 text-center">
          <motion.div initial={{ scale: 0.4, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 12 }}>
            {current.kind === "level" ? (
              <SuzaniMedallion size={140} tone="accent">
                <span className="text-[44px] font-bold text-accent">{current.level}</span>
              </SuzaniMedallion>
            ) : (
              <Medal id={current.id} icon={def?.icon ?? "Star"} unlocked size={140} />
            )}
          </motion.div>
          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-gold">{current.kind === "level" ? t("levelUp") : t("newAchievement")}</p>
          <h2 className="mt-1 text-[24px] font-bold">
            {current.kind === "level" ? t("level", { n: current.level }) : t(`achievements.items.${current.id}.title` as "achievements.items.first-lesson.title")}
          </h2>
          <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-label-2">
            {current.kind === "level" ? t("levelUpText") : t(`achievements.items.${current.id}.text` as "achievements.items.first-lesson.text")}
          </p>
          {def && def.xp > 0 && <p className="mt-3 rounded-full bg-gold-soft px-3.5 py-1 text-[15px] font-bold text-gold">+{def.xp} XP</p>}
          <Button size="lg" onClick={next} className="mt-6 w-full">
            {queue.length > 1 ? t("next") : t("great")}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
