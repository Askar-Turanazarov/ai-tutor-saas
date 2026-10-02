"use client";

import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Circle, Clock, Layers, Play, RotateCcw, Star, Target, Theater, X, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, TypingDots } from "@/components/ui/primitives";
import { TopicIcon } from "@/components/ui/TopicIcon";
import { spring } from "@/components/ui/motion";
import { MajolicaTile, SuzaniMedallion, TileBand } from "@/components/decor/motifs";
import { Paywall } from "@/components/billing/Paywall";
import { useUsage } from "@/components/app/usage";
import { Composer } from "@/components/app/ChatView";
import { Correction, SpeakButton, WordCard } from "./primitives";
import { ExerciseRunner, type RunSummary } from "./exercises/ExerciseRunner";
import { finishLesson, reportPractice, startLesson } from "@/app/actions/learn";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/cn";
import type { ItemInfo, RunExercise } from "@/lib/learning/exercises";
import type { LessonAccess } from "@/lib/learning/progress";

type Stage = "goal" | "cards" | "practice" | "mission" | "done";
const STAGES: Stage[] = ["goal", "cards", "practice", "mission"];

type MissionInfo = { role: string; scene: string; opener: string; goals: { id: string; text: string }[] };
type Result = { stars: number; percent: number; added: number; xp: number; missionDone: boolean };

/**
 * One lesson, start to finish: the real-life task and can-do goal, the new phrases as cards,
 * adaptive practice, a role-play mission, and a summary of what was earned.
 */
export function LessonPlayer(props: {
  slug: string;
  title: string;
  level: string;
  icon: string;
  access: LessonAccess;
  situation: string;
  canDo: string;
  items: ItemInfo[];
  steps: RunExercise[];
  mission: MissionInfo;
  missionMode: "live" | "out" | "script";
  nextSlug: string | null;
}) {
  const t = useTranslations("lesson");
  const [stage, setStage] = useState<Stage>("goal");
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const score = useRef({ correct: 0, total: 0 });

  const goal = <GoalStage {...props} onStart={() => setStage("cards")} />;
  if (props.access !== "open")
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <QuitBar title={props.title} />
        <Paywall feature="allLevels" title={t("lockedTitle", { tier: "Plus" })} text={t("lockedText")} preview={goal} />
      </div>
    );

  const finish = async (missionDone: boolean) => {
    const res = await finishLesson({ slug: props.slug, ...score.current, missionDone });
    if (!res) return;
    setResult({ ...res, missionDone });
    setStage("done");
    celebrate();
  };

  return (
    <div className="mx-auto max-w-xl px-4 pb-8 pt-4 sm:pt-6">
      {stage !== "practice" && stage !== "done" && (
        <>
          <QuitBar title={props.title} />
          <StageBar stage={stage} />
        </>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${stage}-${round}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
        >
          {stage === "goal" && goal}
          {stage === "cards" && <CardsStage items={props.items} onDone={() => setStage("practice")} />}
          {stage === "practice" && (
            <ExerciseRunner
              steps={props.steps}
              items={Object.fromEntries(props.items.map((i) => [i.id, i]))}
              quitHref="/app/path"
              title={props.title}
              onFinish={async (s: RunSummary) => {
                // A skipped speaking step (no microphone) doesn't count against the learner.
                const total = Math.max(1, s.answers.filter((a) => !a.retry && !(a.type === "speak" && !a.ok && a.ms < 50)).length);
                score.current = { correct: s.correct, total };
                setStage("mission");
                await reportPractice({ slug: props.slug, answers: s.answers }).catch(() => {});
              }}
            />
          )}
          {stage === "mission" && <MissionStage slug={props.slug} mission={props.mission} mode={props.missionMode} onFinish={finish} />}
          {stage === "done" && result && (
            <DoneStage
              result={result}
              score={score.current}
              nextSlug={props.nextSlug}
              onRetry={() => {
                setResult(null);
                setRound((r) => r + 1);
                setStage("cards");
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuitBar({ title }: { title: string }) {
  const t = useTranslations("lesson");
  return (
    <div className="mb-3 flex items-center gap-3">
      <Link href="/app/path" aria-label={t("quit")} className="grid size-9 shrink-0 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill">
        <X className="size-5" />
      </Link>
      <span className="truncate text-[15px] font-semibold text-label-2">{title}</span>
    </div>
  );
}

function StageBar({ stage }: { stage: Stage }) {
  const t = useTranslations("lesson.steps");
  const at = STAGES.indexOf(stage);
  return (
    <ol className="mb-6 grid grid-cols-4 gap-1.5">
      {STAGES.map((s, i) => (
        <li key={s} className="min-w-0">
          <div className={cn("h-1.5 rounded-full transition-colors", i < at ? "bg-teal-solid" : i === at ? "bg-accent-solid" : "bg-fill-2")} />
          <span className={cn("mt-1.5 block truncate text-[12px] font-medium", i === at ? "text-label" : "text-label-3")}>{t(s === "goal" ? "goal" : s)}</span>
        </li>
      ))}
    </ol>
  );
}

/* ───────────── 1. Goal ───────────── */

function GoalStage({ title, level, icon, situation, canDo, items, steps, slug, onStart }: Parameters<typeof LessonPlayer>[0] & { onStart: () => void }) {
  const t = useTranslations("lesson");
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const { showQuota } = useUsage();
  const minutes = Math.max(5, Math.round(items.length * 0.5 + steps.length * 0.4 + 3));

  const begin = () =>
    start(async () => {
      setError(false);
      try {
        const res = await startLesson(slug);
        if ("ok" in res) return onStart();
        if (res.error === "quota") showQuota("lessonsPerDay", res.limit);
        else setError(true);
      } catch {
        setError(true);
      }
    });

  return (
    <div>
      {/* The scene, framed like a majolica panel: the only decorated screen of the lesson. */}
      <div className="relative overflow-hidden rounded-sheet border border-separator bg-elevated shadow-card">
        <TileBand className="h-3 w-full opacity-70" />
        <div className="pointer-events-none absolute -right-8 -top-2 opacity-[0.18]">
          <MajolicaTile size={150} />
        </div>
        <div className="relative p-5 sm:p-7">
          <SuzaniMedallion size={84} tone="accent">
            <TopicIcon name={icon} className="size-7 text-accent" strokeWidth={2} />
          </SuzaniMedallion>
          <Badge tone="accent" className="mt-4">
            {level}
          </Badge>
          <h1 className="mt-2 text-[clamp(1.6rem,5vw,2rem)] font-bold leading-tight">{title}</h1>
          <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-label-3">{t("situation")}</p>
          <p className="mt-1 text-[16px] leading-relaxed text-label-2">{situation}</p>
        </div>
        <TileBand className="h-3 w-full rotate-180 opacity-70" />
      </div>

      <div className="mt-4 rounded-card border border-teal/25 bg-teal-soft p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-teal">
          <Target className="size-4" /> {t("canDo")}
        </p>
        <p className="mt-1 text-[16px] font-medium leading-snug text-label">{canDo}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-label-2">
        <span className="inline-flex items-center gap-1.5">
          <Layers className="size-4 text-gold" /> {t("chunks", { n: items.length })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4 text-label-3" /> {t("minutes", { n: minutes })}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.slice(0, 6).map((i) => (
          <span key={i.id} lang="en" className="rounded-full bg-fill px-3 py-1 font-lesson text-[14px] text-label">
            {i.chunk}
          </span>
        ))}
        {items.length > 6 && <span className="rounded-full px-2 py-1 text-[14px] text-label-3">+{items.length - 6}</span>}
      </div>

      {error && <p className="mt-4 text-[14px] text-danger">{t("error")}</p>}
      <Button size="lg" icon={Play} loading={pending} onClick={begin} className="mt-6 w-full">
        {t("start")}
      </Button>
    </div>
  );
}

/* ───────────── 2. Cards ───────────── */

function CardsStage({ items, onDone }: { items: ItemInfo[]; onDone: () => void }) {
  const t = useTranslations("lesson");
  const locale = useLocale() as "ru" | "en" | "uz";
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const item = items[i];
  const last = i === items.length - 1;
  const go = (d: number) => {
    setDir(d);
    setI((x) => Math.min(items.length - 1, Math.max(0, x + d)));
  };
  if (!item) return null;
  const anti = item.anti[0];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[22px] font-bold">{t("cardsTitle")}</h2>
        <span className="text-[14px] tabular-nums text-label-3">{t("cardOf", { n: i + 1, total: items.length })}</span>
      </div>
      <p className="mt-1 text-[14px] text-label-2">{t("cardsHint")}</p>

      <div className="relative mt-5 min-h-[18rem]">
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={item.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60, rotate: dir * 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: dir * -60, rotate: dir * -2 }}
            transition={spring}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70 && !last) go(1);
              else if (info.offset.x > 70 && i > 0) go(-1);
            }}
          >
            <WordCard
              chunk={item.chunk}
              kind={item.kind}
              meaning={item.meaning[locale] ?? item.meaning.en}
              example={item.examples[0]}
              anti={anti ? { wrong: anti.wrong, why: anti.why[locale] ?? anti.why.en } : undefined}
              className="h-72"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {item.examples[1] && (
        <p lang="en" className="mt-3 flex items-start gap-2 font-lesson text-[15px] italic text-label-2">
          <SpeakButton text={item.examples[1]} className="-mt-1 shrink-0" />
          {item.examples[1]}
        </p>
      )}

      <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
        {items.map((x, k) => (
          <span key={x.id} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-accent-solid" : k < i ? "w-1.5 bg-teal-solid" : "w-1.5 bg-fill-2")} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-[auto_1fr] gap-3">
        <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => go(-1)} disabled={i === 0} aria-label={t("prev")} />
        {last ? (
          <Button size="lg" iconRight={ArrowRight} onClick={onDone}>
            {t("toPractice")}
          </Button>
        ) : (
          <Button size="lg" variant="secondary" iconRight={ArrowRight} onClick={() => go(1)}>
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ───────────── 4. Mission ───────────── */

type Fix = { original: string; corrected: string; explanation: string };
type Msg = { role: "user" | "assistant"; content: string; corrections?: Fix[] };

function MissionStage({
  slug,
  mission,
  mode,
  onFinish,
}: {
  slug: string;
  mission: MissionInfo;
  mode: "live" | "out" | "script";
  onFinish: (missionDone: boolean) => Promise<void>;
}) {
  const t = useTranslations("lesson");
  const locale = useLocale();
  const { setRemaining, showLimit, remaining } = useUsage();
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: mission.opener }]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [scripted, setScripted] = useState(mode !== "live");
  const [closing, startClosing] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const left = mission.goals.length - done.length;

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (remaining !== null && remaining <= 0) return showLimit();
    const history = [...messages, { role: "user" as const, content: body }];
    setMessages(history);
    setText("");
    setSending(true);
    setError(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "scenario", lesson: slug, locale, scripted, history: history.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      if (data.limitReached) {
        setMessages(messages);
        setText(body);
        setRemaining(0);
        showLimit();
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], corrections: data.corrections };
        return [...copy, { role: "assistant", content: data.reply }];
      });
      setDone(data.goalsDone);
      if (data.finished) setFinished(true);
      if (data.scripted) setScripted(true);
      setRemaining(data.remaining);
    } catch {
      setMessages(messages);
      setText(body);
      setError(true);
    } finally {
      setSending(false);
      requestAnimationFrame(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    }
  };

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-gold-soft text-gold">
          <Theater className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-gold">{t("missionKicker")}</p>
          <p className="mt-0.5 text-[15px] leading-snug text-label">{mission.scene}</p>
        </div>
      </div>

      {/* Goals: the checklist the partner steers the learner through. */}
      <div className="mt-4 rounded-card border border-separator bg-elevated p-4">
        <p className="flex items-center justify-between text-[13px] font-semibold text-label-2">
          {t("goals")}
          <span className="font-medium text-label-3">{left ? t("goalsLeft", { n: left }) : t("missionDone")}</span>
        </p>
        <ul className="mt-2 space-y-1.5">
          {mission.goals.map((g) => {
            const ok = done.includes(g.id);
            return (
              <li key={g.id} className="flex items-start gap-2 text-[15px]">
                <motion.span initial={false} animate={{ scale: ok ? [1.3, 1] : 1 }} className={cn("mt-0.5 shrink-0", ok ? "text-teal" : "text-label-3")}>
                  {ok ? <Check className="size-[18px]" strokeWidth={3} /> : <Circle className="size-[18px]" />}
                </motion.span>
                <span className={cn(ok ? "text-label-2 line-through decoration-teal/50" : "text-label")}>{g.text}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {scripted && (
        <p className="mt-3 rounded-[12px] bg-fill px-3 py-2 text-[13px] leading-snug text-label-2">{mode === "out" ? t("scriptedOut") : t("scripted")}</p>
      )}

      <div className="mt-4 space-y-3" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
            {m.role === "assistant" && i === 0 && <span className="mb-1 text-[12px] text-label-3">{t("missionPartner")}</span>}
            <div
              lang="en"
              className={cn(
                "max-w-[88%] rounded-[20px] px-4 py-2.5 font-lesson text-[17px] leading-snug",
                m.role === "user" ? "rounded-br-[6px] bg-accent-solid text-on-accent" : "rounded-bl-[6px] bg-elevated text-label shadow-card",
              )}
            >
              {m.content}
              {m.role === "assistant" && <SpeakButton text={m.content} className="-mb-1 ml-1 inline-flex align-middle" />}
            </div>
            {m.corrections?.map((c, k) => (
              <Correction key={k} wrong={c.original} right={c.corrected} note={c.explanation} layout={c.original.length + c.corrected.length > 28 ? "stacked" : "inline"} className="mt-1.5 max-w-[88%]" />
            ))}
          </div>
        ))}
        {sending && <div className="w-16 rounded-[20px] rounded-bl-[6px] bg-elevated px-4 py-3 shadow-card"><TypingDots label="…" /></div>}
        <div ref={end} />
      </div>

      {error && <p className="mt-3 text-[14px] text-danger">{t("error")}</p>}

      {finished ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Button size="lg" icon={Check} loading={closing} onClick={() => startClosing(() => onFinish(true))} className="w-full">
            {t("finish")}
          </Button>
        </motion.div>
      ) : (
        <>
          <div className="-mx-3 mt-4 sm:-mx-4">
            <Composer value={text} onChange={setText} onSend={send} disabled={sending} limited={remaining !== null && remaining <= 0} placeholder={t("placeholder")} />
          </div>
          <button
            type="button"
            disabled={closing}
            onClick={() => startClosing(() => onFinish(false))}
            className="mx-auto mt-2 block rounded-full px-4 py-2 text-[14px] font-medium text-label-3 transition-colors hover:bg-fill hover:text-label-2"
          >
            {t("skipMission")}
          </button>
        </>
      )}
    </div>
  );
}

/* ───────────── 5. Done ───────────── */

function DoneStage({ result, score, nextSlug, onRetry }: { result: Result; score: { correct: number; total: number }; nextSlug: string | null; onRetry: () => void }) {
  const t = useTranslations("lesson");
  return (
    <div className="flex flex-col items-center pt-8 text-center">
      <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}>
        <SuzaniMedallion size={150} tone="gold">
          <div className="flex gap-0.5">
            {[0, 1, 2].map((s) => (
              <motion.span key={s} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.35 + s * 0.15 }}>
                <Star className={cn("size-6", s < result.stars ? "fill-gold text-gold" : "text-fill-2")} />
              </motion.span>
            ))}
          </div>
        </SuzaniMedallion>
      </motion.div>
      <h1 className="mt-5 text-[28px] font-bold">{t("doneTitle")}</h1>
      <p className="mt-1 text-[16px] text-label-2">
        {t("score", { percent: result.percent })} · {score.correct}/{score.total}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-1.5 text-[17px] font-bold text-accent">
          <Zap className="size-4" /> {t("xp", { xp: result.xp })}
        </span>
        {result.missionDone && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-4 py-1.5 text-[15px] font-semibold text-gold">
            <Theater className="size-4" /> {t("missionBadge")}
          </span>
        )}
      </div>
      <p className="mt-4 flex items-center gap-2 text-[15px] text-label-2">
        <Layers className="size-4 text-teal" />
        {result.added ? t("added", { n: result.added }) : t("addedNone")}
      </p>
      <div className="mt-8 grid w-full gap-3">
        {nextSlug && (
          <ButtonLink href={`/app/learn/${nextSlug}`} size="lg" iconRight={ArrowRight}>
            {t("nextLesson")}
          </ButtonLink>
        )}
        <ButtonLink href="/app/path" size="lg" variant={nextSlug ? "secondary" : "primary"}>
          {t("toMap")}
        </ButtonLink>
        <Button variant="ghost" icon={RotateCcw} onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
