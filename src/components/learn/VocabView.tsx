"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Layers, PenLine, Play, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/decor/EmptyState";
import { PageHeader } from "@/components/decor/PageHeader";
import { ChunkTag, Correction, SpeakButton } from "./primitives";
import { cn } from "@/lib/cn";
import type { DeckCard } from "@/lib/learning/deck";

type Filter = "all" | "due" | "learned" | "collocation" | "phrasal" | "idiom";
const FILTERS: Filter[] = ["all", "due", "learned", "collocation", "phrasal", "idiom"];
const LEARNED_DAYS = 21;

const strength = (c: DeckCard) => (c.intervalDays >= LEARNED_DAYS ? "strong" : c.reps >= 2 ? "learning" : "new");

/** Relative "in 3 days" in the interface language. */
function useWhen() {
  const locale = useLocale();
  const t = useTranslations("vocab");
  return (iso: string) => {
    const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
    if (days <= 0 && new Date(iso).getTime() <= Date.now()) return t("now");
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.max(0, days), "day");
  };
}

/** The learner's deck: what's due, how strong each phrase is, and a way into a review session. */
export function VocabView({ cards, mistakes }: { cards: DeckCard[]; mistakes: number }) {
  const t = useTranslations("vocab");
  const locale = useLocale() as "ru" | "en" | "uz";
  const when = useWhen();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const now = Date.now();
  const isDue = (c: DeckCard) => new Date(c.due).getTime() <= now;
  const due = cards.filter(isDue);
  const learned = cards.filter((c) => strength(c) === "strong");

  const q = query.trim().toLowerCase();
  const shown = cards.filter((c) => {
    if (filter === "due" && !isDue(c)) return false;
    if (filter === "learned" && strength(c) !== "strong") return false;
    if ((filter === "collocation" || filter === "phrasal" || filter === "idiom") && c.item.kind !== filter) return false;
    if (!q) return true;
    return c.item.chunk.toLowerCase().includes(q) || (c.item.meaning[locale] ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={<Layers />} tone="teal" />

      {cards.length === 0 ? (
        <div className="surface rounded-card p-5">
          <EmptyState
            icon={<Layers />}
            title={t("emptyTitle")}
            text={t("emptyText")}
            action={
              <ButtonLink href="/app/path" size="sm">
                {t("toLessons")}
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="surface flex flex-col justify-between gap-4 rounded-sheet p-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-[19px] font-bold">{due.length ? t("reviewCount", { n: due.length }) : t("allDone")}</p>
                {!due.length && cards[0] && <p className="mt-0.5 text-[14px] text-label-2">{t("nextReview", { when: when(cards[0].due) })}</p>}
              </div>
              {due.length > 0 && (
                <ButtonLink href="/app/vocab/review" icon={Play} className="sm:shrink-0">
                  {t("reviewNow")}
                </ButtonLink>
              )}
            </div>
            <Link href="/app/mistakes" className="surface group flex items-center gap-3 rounded-sheet p-5 transition-transform hover:-translate-y-0.5">
              <span className="grid size-11 place-items-center rounded-[14px] bg-danger-soft text-danger">
                <PenLine className="size-5" />
              </span>
              <span>
                <span className="block text-[16px] font-semibold">{t("mistakesLink")}</span>
                <span className="block text-[13px] text-label-2">{t("mistakesLinkText", { n: mistakes })}</span>
              </span>
            </Link>
          </div>

          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              [t("total"), cards.length, "text-label"],
              [t("due"), due.length, "text-accent"],
              [t("learned"), learned.length, "text-teal"],
            ].map(([label, n, cls]) => (
              <div key={label as string} className="rounded-card bg-fill px-2 py-3">
                <dd className={cn("text-[24px] font-bold tabular-nums", cls as string)}>{n}</dd>
                <dt className="text-[12px] text-label-2">{label}</dt>
              </div>
            ))}
          </dl>

          <div className="space-y-3">
            <label className="flex h-11 items-center gap-2 rounded-control bg-fill px-3.5 focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
              <Search className="size-4 shrink-0 text-label-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-label-3"
              />
            </label>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={cn(
                    "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                    filter === f ? "bg-accent-solid text-white" : "bg-fill text-label-2 hover:text-label",
                  )}
                >
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="py-8 text-center text-[15px] text-label-3">{t("nothingFound")}</p>
          ) : (
            <ul className="divide-y divide-separator overflow-hidden rounded-card border border-separator bg-elevated">
              {shown.map((c) => {
                const s = strength(c);
                const expanded = open === c.id;
                const anti = c.item.anti[0];
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setOpen(expanded ? null : c.id)}
                      aria-expanded={expanded}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-fill/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span lang="en" className="block truncate font-lesson text-[17px] text-label">
                          {c.item.chunk}
                        </span>
                        <span className="block truncate text-[13px] text-label-2">{c.item.meaning[locale] ?? c.item.meaning.en}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Strength level={s} label={t(`strength.${s}`)} />
                        <span className={cn("text-[12px]", isDue(c) ? "font-semibold text-accent" : "text-label-3")}>{when(c.due)}</span>
                      </span>
                      <ChevronDown className={cn("size-4 shrink-0 text-label-3 transition-transform", expanded && "rotate-180")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 px-4 pb-4">
                            <div className="flex items-center gap-2">
                              <ChunkTag kind={c.item.kind} />
                              <SpeakButton text={c.item.chunk} />
                            </div>
                            {c.item.examples.slice(0, 2).map((e) => (
                              <p key={e} lang="en" className="font-lesson text-[15px] italic text-label-2">
                                {e}
                              </p>
                            ))}
                            {anti && <Correction wrong={anti.wrong} right={anti.right} note={anti.why[locale] ?? anti.why.en} layout="stacked" />}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Strength({ level, label }: { level: "new" | "learning" | "strong"; label: string }) {
  const n = level === "strong" ? 3 : level === "learning" ? 2 : 1;
  return (
    <span className="flex items-center gap-1" title={label} aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-3 rounded-full",
            i < n ? (level === "strong" ? "bg-teal-solid" : level === "learning" ? "bg-gold" : "bg-accent-solid") : "bg-fill-2",
          )}
        />
      ))}
    </span>
  );
}
