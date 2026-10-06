"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpenCheck, Layers, Lock, MessageCircle, PenLine, Play, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/decor/EmptyState";
import { PageHeader } from "@/components/decor/PageHeader";
import { Correction } from "./primitives";
import { cn } from "@/lib/cn";

export type MistakeRow = {
  id: string;
  original: string;
  corrected: string;
  explanation: string;
  category: string;
  source: string;
  hits: number;
  streak: number;
  resolved: boolean;
};

const ORDER = ["grammar", "vocabulary", "spelling", "punctuation", "style"];
const SOURCE_ICON = { chat: MessageCircle, exercise: BookOpenCheck, review: Layers } as const;

/** The mistake bank: grouped by kind, each with how close it is to being fixed. */
export function MistakesView({ rows, active, resolved, canTrain, limited }: { rows: MistakeRow[]; active: number; resolved: number; canTrain: boolean; limited: boolean }) {
  const t = useTranslations("mistakes");
  const tp = useTranslations("paywall");
  const [showResolved, setShowResolved] = useState(false);
  const open = rows.filter((r) => !r.resolved);
  const fixed = rows.filter((r) => r.resolved);
  const groups = [...new Set(open.map((r) => r.category))].sort((a, b) => (ORDER.indexOf(a) + 99) % 99 - (ORDER.indexOf(b) + 99) % 99);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={<PenLine />} tone="teal" />

      {rows.length === 0 ? (
        <div className="surface rounded-card p-5">
          <EmptyState icon={<PenLine />} tone="teal" title={t("emptyTitle")} text={t("emptyText")} />
        </div>
      ) : (
        <>
          <div className="surface flex flex-col gap-4 rounded-sheet p-5 sm:flex-row sm:items-center">
            <div className="flex flex-1 gap-6">
              <Stat n={active} label={t("active")} className="text-danger" />
              <Stat n={resolved} label={t("resolved")} className="text-teal" />
            </div>
            {canTrain ? (
              active > 0 && (
                <ButtonLink href="/app/mistakes/train" icon={Play} className="sm:shrink-0">
                  {t("train")}
                </ButtonLink>
              )
            ) : (
              <div className="rounded-card bg-gold-soft p-3.5 sm:max-w-xs">
                <p className="flex items-center gap-1.5 text-[14px] font-semibold text-gold">
                  <Lock className="size-4" /> {t("lockedTitle")}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-label-2">{t("lockedText")}</p>
                <ButtonLink href="/app/plans?tier=PLUS" size="sm" icon={Sparkles} className="mt-2.5">
                  {tp("cta", { tier: "Plus" })}
                </ButtonLink>
              </div>
            )}
          </div>
          {canTrain && active > 0 && <p className="-mt-3 text-[13px] text-label-3">{t("trainText")}</p>}
          {limited && <p className="text-[13px] text-label-3">{t("freeNote")}</p>}

          {open.length === 0 && <p className="py-4 text-center text-[15px] text-label-2">{t("nothing")}</p>}
          {groups.map((g) => (
            <section key={g}>
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-label-3">{t.has(`categories.${g}`) ? t(`categories.${g}` as "categories.grammar") : g}</h2>
              <ul className="space-y-2">
                {open
                  .filter((r) => r.category === g)
                  .map((r) => (
                    <Row key={r.id} row={r} />
                  ))}
              </ul>
            </section>
          ))}

          {fixed.length > 0 && (
            <section>
              <button onClick={() => setShowResolved((v) => !v)} aria-expanded={showResolved} className="text-[14px] font-semibold text-accent">
                {t("showResolved", { n: fixed.length })}
              </button>
              {showResolved && (
                <ul className="mt-2 space-y-2 opacity-70">
                  {fixed.map((r) => (
                    <Row key={r.id} row={r} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ n, label, className }: { n: number; label: string; className?: string }) {
  return (
    <div>
      <div className={cn("text-[28px] font-bold leading-none tabular-nums", className)}>{n}</div>
      <div className="mt-1 text-[13px] text-label-2">{label}</div>
    </div>
  );
}

function Row({ row: r }: { row: MistakeRow }) {
  const t = useTranslations("mistakes");
  const Icon = SOURCE_ICON[r.source as keyof typeof SOURCE_ICON] ?? MessageCircle;
  const long = r.original.length + r.corrected.length > 34;
  return (
    <li className="rounded-card border border-separator bg-elevated p-4">
      <Correction wrong={r.original} right={r.corrected} note={r.explanation || undefined} layout={long ? "stacked" : "inline"} />
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-label-3">
        <span className="inline-flex items-center gap-1">
          <Icon className="size-3.5" /> {t.has(`source.${r.source}`) ? t(`source.${r.source}` as "source.chat") : r.source}
        </span>
        {r.hits > 1 && <span className="font-semibold text-danger">{t("hits", { n: r.hits })}</span>}
        {!r.resolved && (
          <span className="ml-auto inline-flex items-center gap-1.5" title={t("streak", { n: r.streak })}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn("size-2 rounded-full", i < r.streak ? "bg-teal-solid" : "bg-fill-2")} />
            ))}
            <span className="sr-only">{t("streak", { n: r.streak })}</span>
          </span>
        )}
      </div>
    </li>
  );
}
