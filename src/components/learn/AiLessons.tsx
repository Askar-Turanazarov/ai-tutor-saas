"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, Lock, Play, Sparkles, Star, Trash2, Wand2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TopicIcon } from "@/components/ui/TopicIcon";
import { SuzaniMedallion } from "@/components/decor/motifs";
import { createAiLesson, deleteAiLesson } from "@/app/actions/learn";
import { LEVELS } from "@/lib/levels";
import { cn } from "@/lib/cn";

export type PersonalLesson = { slug: string; title: string; level: string; icon: string; done: boolean; stars: number };

const PRESETS = ["salary", "conference", "interview", "complaint", "debate", "pitch"] as const;

/** Pro: lessons written for the learner's own situation, including C1–C2. Others see what it is and where it unlocks. */
export function AiLessons({ allowed, level, lessons }: { allowed: boolean; level: string; lessons: PersonalLesson[] }) {
  const t = useTranslations("aiLessons");

  if (!allowed)
    return (
      <section className="surface flex flex-col gap-4 rounded-sheet p-5 sm:flex-row sm:items-center">
        <SuzaniMedallion size={64} tone="gold">
          <Wand2 className="size-6 text-gold" />
        </SuzaniMedallion>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-gold">
            <Lock className="size-3.5" /> {t("lockedBadge")}
          </p>
          <p className="mt-0.5 text-[18px] font-bold leading-snug">{t("title")}</p>
          <p className="mt-1 text-[14px] leading-snug text-label-2">{t("lockedText")}</p>
        </div>
        <ButtonLink href="/app/plans?tier=PRO" icon={Sparkles} className="sm:shrink-0">
          {t("lockedCta")}
        </ButtonLink>
      </section>
    );

  return (
    <section aria-labelledby="ai-lessons" className="surface space-y-4 rounded-sheet p-5">
      <div>
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-gold">
          <Wand2 className="size-3.5" /> Pro
        </p>
        <h2 id="ai-lessons" className="mt-0.5 text-[20px] font-bold leading-tight">
          {t("title")}
        </h2>
        <p className="mt-1 text-[14px] leading-snug text-label-2">{t("subtitle")}</p>
      </div>
      <Composer initialLevel={level} />
      {lessons.length > 0 && (
        <ul className="divide-y divide-separator overflow-hidden rounded-card border border-separator bg-elevated">
          {lessons.map((l) => (
            <Row key={l.slug} lesson={l} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Composer({ initialLevel }: { initialLevel: string }) {
  const t = useTranslations("aiLessons");
  const router = useRouter();
  const [level, setLevel] = useState(initialLevel);
  const [situation, setSituation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adapted, setAdapted] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await createAiLesson({ level, situation });
      if ("error" in res) return setError(res.error === "quota" ? t("quota", { n: res.limit ?? 0 }) : t("invalid"));
      if (res.fallback) setAdapted(res.slug);
      else router.push(`/app/learn/${res.slug}`);
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Writing />;
  if (adapted)
    return (
      <div className="rounded-card bg-gold-soft p-4">
        <p className="text-[15px] font-semibold">{t("adaptedTitle")}</p>
        <p className="mt-1 text-[14px] leading-snug text-label-2">{t("adaptedText")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href={`/app/learn/${adapted}`} size="sm" icon={Play}>
            {t("open")}
          </ButtonLink>
          <Button size="sm" variant="secondary" onClick={() => setAdapted(null)}>
            {t("another")}
          </Button>
        </div>
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (situation.trim().length >= 3) void submit();
      }}
      className="space-y-3"
    >
      <div role="radiogroup" aria-label={t("level")} className="flex flex-wrap gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={level === l}
            onClick={() => setLevel(l)}
            className={cn(
              "h-8 min-w-11 rounded-full px-3 text-[13px] font-bold tabular-nums transition-colors",
              level === l ? "bg-accent-solid text-white" : "bg-fill text-label-2 hover:text-label",
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="sr-only">{t("situation")}</span>
        <textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value.slice(0, 200))}
          rows={2}
          placeholder={t("placeholder")}
          className="w-full resize-none rounded-control bg-fill px-3.5 py-2.5 text-[16px] leading-snug outline-none placeholder:text-label-3 focus:shadow-[0_0_0_3px_var(--accent-soft)]"
        />
      </label>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSituation(t(`presets.${p}`))}
            className="h-8 shrink-0 rounded-full border border-separator px-3 text-[13px] text-label-2 transition-colors hover:bg-fill hover:text-label"
          >
            {t(`presets.${p}`)}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-[14px] text-danger">
          {error}
        </p>
      )}
      <Button type="submit" icon={Wand2} disabled={situation.trim().length < 3} className="w-full sm:w-auto">
        {t("create")}
      </Button>
    </form>
  );
}

/** Generation takes 10–40 s: say what is happening instead of a bare spinner. */
function Writing() {
  const t = useTranslations("aiLessons");
  const steps = [t("writing.0"), t("writing.1"), t("writing.2"), t("writing.3")];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 6000);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-4 rounded-card bg-accent-soft p-4">
      <motion.span animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} className="shrink-0">
        <SuzaniMedallion size={52} tone="accent">
          <Wand2 className="size-5 text-accent" />
        </SuzaniMedallion>
      </motion.span>
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-[15px] font-medium text-accent">
          {steps[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function Row({ lesson: l }: { lesson: PersonalLesson }) {
  const t = useTranslations("aiLessons");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", pending && "opacity-50")}>
      <Link href={`/app/learn/${l.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", l.done ? "bg-teal-soft text-teal" : "bg-accent-soft text-accent")}>
          {l.done ? <Check className="size-5" strokeWidth={3} /> : <TopicIcon name={l.icon} className="size-5" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{l.title}</span>
          <span className="flex items-center gap-1.5 text-[12px] text-label-3">
            <span className="font-bold text-accent">{l.level}</span>
            {l.done &&
              [0, 1, 2].map((s) => <Star key={s} className={cn("size-3", s < l.stars ? "fill-gold text-gold" : "text-fill-2")} />)}
          </span>
        </span>
      </Link>
      <button
        onClick={() => (confirm ? start(async () => void (await deleteAiLesson(l.slug))) : setConfirm(true))}
        onBlur={() => setConfirm(false)}
        aria-label={t("delete")}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold transition-colors",
          confirm ? "bg-danger-soft text-danger" : "text-label-3 hover:bg-fill hover:text-label",
        )}
      >
        <Trash2 className="size-4" />
        {confirm && t("deleteConfirm")}
      </button>
    </li>
  );
}
