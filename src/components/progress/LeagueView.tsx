"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Clock, Gem, X } from "lucide-react";
import { Avatar } from "@/components/shell/menus";
import { spring } from "@/components/ui/motion";
import { dismissLeagueResult } from "@/app/actions/progress";
import type { LeagueState } from "@/lib/gamification/league";
import { cn } from "@/lib/cn";

const KEYS = ["bronze", "silver", "gold", "lapis", "turquoise"] as const;
/** Each division is a stone; colours stay readable in both themes. */
export const LEAGUE_COLOR: Record<string, string> = { bronze: "#B0703C", silver: "#8E99AB", gold: "var(--ochre)", lapis: "var(--accent)", turquoise: "var(--turquoise)" };

export function LeagueStone({ league, size = 64, dim }: { league: string; size?: number; dim?: boolean }) {
  const c = LEAGUE_COLOR[league];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={cn(dim && "opacity-35")}>
      <path d="M32 3 56 15v20c0 13-10 22-24 26C18 57 8 48 8 35V15Z" fill={c} opacity="0.16" />
      <path d="M32 3 56 15v20c0 13-10 22-24 26C18 57 8 48 8 35V15Z" fill="none" stroke={c} strokeWidth="2.5" />
      <path d="M32 17 43 28 32 47 21 28Z" fill={c} />
      <path d="M21 28h22M32 17l-4 11 4 19 4-19Z" fill="none" stroke="var(--bg)" strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}

/** The weekly league: this division's table with promotion and demotion zones. */
export function LeagueView({ state: s }: { state: LeagueState }) {
  const t = useTranslations("league");
  const locale = useLocale();
  const [note, setNote] = useState(s.last);
  const top = s.league === KEYS.length - 1;
  const bottom = s.league === 0;

  return (
    <div className="space-y-6">
      <div className="surface flex items-center gap-4 rounded-sheet p-5">
        <motion.span initial={{ scale: 0.6, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={spring}>
          <LeagueStone league={s.key} size={76} />
        </motion.span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-bold leading-tight">{t(`names.${s.key}`)}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] text-label-2">
            <Clock className="size-4 shrink-0" /> {t("endsIn", { d: s.endsIn.days, h: s.endsIn.hours })}
          </p>
          <div className="mt-2.5 flex gap-1" aria-label={t("ladder")}>
            {KEYS.map((k, i) => (
              <span key={k} title={t(`names.${k}`)} className={cn("h-1.5 flex-1 rounded-full", i <= s.league ? "" : "bg-fill-2")} style={i <= s.league ? { background: LEAGUE_COLOR[k] } : undefined} />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {note && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="relative flex items-center gap-3 rounded-card bg-fill p-4 pr-11">
            <LeagueStone league={KEYS[note.to]} size={40} />
            <p className="text-[15px] leading-snug">
              {note.to > note.from ? t("promoted", { league: t(`names.${KEYS[note.to]}`) }) : note.to < note.from ? t("demoted", { league: t(`names.${KEYS[note.to]}`) }) : t("stayed")}
              {note.rank > 0 && <span className="text-label-2"> · {t("lastRank", { n: note.rank })}</span>}
            </p>
            <button
              onClick={() => {
                setNote(null);
                void dismissLeagueResult();
              }}
              aria-label={t("dismiss")}
              className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-label-3 hover:bg-fill-2"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[14px] text-label-2">{top ? t("rulesTop") : bottom ? t("rulesBottom") : t("rules")}</p>

      <ol className="overflow-hidden rounded-card border border-separator bg-elevated">
        {s.rows.map((r, i) => {
          const rank = i + 1;
          const up = !top && rank <= 3;
          const down = !bottom && rank > s.size - 3;
          return (
            <li key={r.id}>
              {rank === 4 && !top && <Divider tone="teal" label={t("upZone")} icon={<ChevronUp className="size-3.5" />} />}
              {rank === s.size - 2 && !bottom && <Divider tone="danger" label={t("downZone")} icon={<ChevronDown className="size-3.5" />} />}
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.03 }}
                className={cn("flex items-center gap-3 px-4 py-2.5", r.me && "bg-accent-soft", !r.me && up && "bg-teal-soft/40", !r.me && down && "bg-danger-soft/40")}
              >
                <span className={cn("w-6 shrink-0 text-center text-[15px] font-bold tabular-nums", up ? "text-teal" : down ? "text-danger" : "text-label-3")}>{rank}</span>
                <Avatar name={r.name} size={34} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[15px]", r.me ? "font-bold text-accent" : "font-medium")}>{r.me ? t("you") : r.name}</span>
                  {r.demo && <span className="text-[11px] font-medium uppercase tracking-wide text-label-3">{t("demo")}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[14px] font-semibold tabular-nums">
                  <Gem className="size-3.5" style={{ color: LEAGUE_COLOR[s.key] }} /> {r.xp.toLocaleString(locale)} XP
                </span>
              </motion.div>
            </li>
          );
        })}
      </ol>
      <p className="text-center text-[12px] text-label-3">{t("demoNote")}</p>
    </div>
  );
}

function Divider({ tone, label, icon }: { tone: "teal" | "danger"; label: string; icon: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-2 px-4 py-1 text-[11px] font-semibold uppercase tracking-wide", tone === "teal" ? "text-teal" : "text-danger")}>
      <span className="h-px flex-1 bg-current opacity-30" />
      {icon} {label}
      <span className="h-px flex-1 bg-current opacity-30" />
    </div>
  );
}
