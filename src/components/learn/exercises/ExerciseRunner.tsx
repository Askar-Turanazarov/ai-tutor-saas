"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Check, Flame, Lightbulb, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/primitives";
import { spring } from "@/components/ui/motion";
import { Correction, SpeakButton } from "@/components/learn/primitives";
import { answerLength, bankEntry, check, pick, type ItemInfo, type Response, type RunExercise, type Verdict } from "@/lib/learning/exercises";
import { gradeAnswer } from "@/lib/learning/srs";
import { cn } from "@/lib/cn";
import { ChoiceView, GapView, ListenView, MatchView, OrderView, SpeakView, SpotView, TranslateView, type ViewProps } from "./views";

export type AnswerEvent = {
  key: string;
  type: RunExercise["ex"]["type"];
  item?: string;
  difficulty: number;
  ok: boolean;
  ms: number;
  hinted: boolean;
  grade: number;
  /** A repeat of a step answered wrong earlier in the session; not scored again. */
  retry: boolean;
  /** For the mistake bank (wrong answers only): what the learner gave and what was expected. */
  given?: string;
  answer?: string;
};

export type RunSummary = { correct: number; total: number; maxCombo: number; answers: AnswerEvent[] };

const HINTABLE = new Set(["gap", "translate", "order"]);

/**
 * Plays a list of exercises: times each answer, gives instant feedback in the teacher's
 * "pen correction" style, keeps a combo counter and brings wrong steps back once at the end.
 */
export function ExerciseRunner({
  steps: initial,
  items,
  quitHref,
  title,
  onAnswer,
  onFinish,
  repeatMistakes = true,
}: {
  steps: RunExercise[];
  items: Record<string, ItemInfo>;
  quitHref: string;
  title?: ReactNode;
  onAnswer?: (a: AnswerEvent) => void;
  onFinish: (s: RunSummary) => void;
  repeatMistakes?: boolean;
}) {
  const t = useTranslations("ex");
  const locale = useLocale();
  const [steps, setSteps] = useState(initial);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState<Response | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hint, setHint] = useState(false);
  const [combo, setCombo] = useState(0);
  const answers = useRef<AnswerEvent[]>([]);
  const maxCombo = useRef(0);
  const started = useRef(Date.now());
  const retried = useRef(new Set<string>());
  // Buttons of the previous step stay in the DOM while they animate out; these refs make sure
  // each step is answered once and the run finishes once, whatever gets clicked meanwhile.
  const answered = useRef(-1);
  const finished = useRef(false);
  const shake = useAnimationControls();
  const step = steps[index];
  const firstRun = initial.length;
  const isRetry = index >= firstRun;

  useEffect(() => {
    started.current = Date.now();
  }, [index]);

  const submit = useCallback(
    (r: Response | null, skipped = false) => {
      if (verdict || !step || answered.current === index) return;
      answered.current = index;
      const v = skipped ? { ok: false } : check(step.ex, r ?? { kind: "text", value: "" });
      const ms = Date.now() - started.current;
      const grade = gradeAnswer({ correct: v.ok, ms, hinted: hint, answerLength: answerLength(step.ex) });
      const ev: AnswerEvent = { key: step.key, type: step.ex.type, item: step.item, difficulty: step.difficulty, ok: v.ok, ms, hinted: hint, grade, retry: isRetry, ...bankEntry(step.ex, v) };
      answers.current.push(ev);
      if (!skipped) onAnswer?.(ev);
      setVerdict(v);
      if (v.ok) {
        const c = combo + 1;
        setCombo(c);
        maxCombo.current = Math.max(maxCombo.current, c);
      } else {
        setCombo(0);
        shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
        if (repeatMistakes && !skipped && !isRetry && !retried.current.has(step.key) && step.ex.type !== "match" && step.ex.type !== "speak") {
          retried.current.add(step.key);
          setSteps((s) => [...s, step]);
        }
      }
    },
    [verdict, step, index, hint, isRetry, combo, onAnswer, shake, repeatMistakes],
  );

  const next = useCallback(() => {
    if (answered.current !== index || finished.current) return;
    if (index + 1 < steps.length) {
      setIndex(index + 1);
      setValue(null);
      setVerdict(null);
      setHint(false);
      return;
    }
    finished.current = true;
    const scored = answers.current.filter((a) => !a.retry);
    onFinish({ correct: scored.filter((a) => a.ok).length, total: scored.length, maxCombo: maxCombo.current, answers: answers.current });
  }, [index, steps.length, onFinish]);

  // Enter checks / continues; digits pick options.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (verdict) next();
        else if (value) submit(value);
        return;
      }
      const n = Number(e.key);
      const tag = (e.target as HTMLElement)?.tagName;
      if (!verdict && n >= 1 && n <= 5 && tag !== "INPUT" && tag !== "TEXTAREA" && step && "options" in step.ex && n <= step.ex.options.length)
        setValue({ kind: "index", value: n - 1 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [verdict, value, step, next, submit]);

  if (!step) return null;
  const ex = step.ex;
  const why = "why" in ex ? pick(ex.why, locale) : undefined;
  const view: ViewProps = { ex, value, onChange: setValue, locked: !!verdict, verdict, items, hint, seed: index + 1 };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-110px)] max-w-2xl flex-col overflow-x-clip lg:min-h-[calc(100dvh-100px)]">
      <div className="flex items-center gap-3">
        <Link href={quitHref} aria-label={t("quit")} className="grid size-10 shrink-0 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill">
          <X className="size-6" />
        </Link>
        <ProgressBar value={Math.min(1, (index + (verdict ? 1 : 0)) / steps.length)} className="h-3 flex-1" color="bg-teal-solid" label={t("progress", { n: index + 1, total: steps.length })} />
        <AnimatePresence>
          {combo >= 2 && (
            <motion.span
              key={combo}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-[13px] font-bold text-gold"
            >
              <Flame className="size-4" /> {t("combo", { n: combo })}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {title && <div className="mt-5 text-[13px] font-semibold text-label-2">{title}</div>}

      <motion.div animate={shake} className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="pt-5"
          >
            {(ex.type === "choice" || ex.type === "collocate" || ex.type === "dialogue") && <ChoiceView {...(view as ViewProps<"choice">)} />}
            {ex.type === "gap" && <GapView {...(view as ViewProps<"gap">)} />}
            {ex.type === "translate" && <TranslateView {...(view as ViewProps<"translate">)} />}
            {ex.type === "order" && <OrderView {...(view as ViewProps<"order">)} />}
            {ex.type === "spot" && <SpotView {...(view as ViewProps<"spot">)} />}
            {ex.type === "match" && <MatchView {...(view as ViewProps<"match">)} />}
            {ex.type === "listen" && <ListenView {...(view as ViewProps<"listen">)} />}
            {ex.type === "speak" && <SpeakView {...(view as ViewProps<"speak">)} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="pointer-events-none sticky bottom-0 -mx-4 mt-8 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-4 pt-6 sm:mx-0 sm:px-0 [&>*]:pointer-events-auto">
        <AnimatePresence mode="wait">
          {verdict ? (
            <motion.div
              key="verdict"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={spring}
              role="status"
              className={cn("rounded-[22px] border p-4 shadow-card sm:p-5", verdict.ok ? "border-teal/25 bg-teal-soft" : "border-danger/20 bg-elevated")}
            >
              <div className="flex items-start gap-3">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  className={cn("grid size-9 shrink-0 place-items-center rounded-full text-on-solid", verdict.ok ? "bg-teal-solid" : "bg-danger-solid")}
                >
                  {verdict.ok ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" strokeWidth={3} />}
                </motion.span>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[18px] font-bold", verdict.ok ? "text-teal" : "text-danger")}>{verdict.ok ? t("correct") : t("wrong")}</div>
                  <Feedback ex={ex} verdict={verdict} why={why} />
                </div>
              </div>
              <Button size="lg" className="mt-4 w-full" onClick={next} autoFocus>
                {t("continue")}
              </Button>
            </motion.div>
          ) : (
            <motion.div key="check" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2.5">
              {ex.type === "speak" && (
                <Button size="lg" variant="secondary" onClick={() => submit(null, true)}>
                  {t("skip")}
                </Button>
              )}
              {HINTABLE.has(ex.type) && !hint && (
                <Button size="lg" variant="secondary" onClick={() => setHint(true)} aria-label={t("hint")}>
                  <Lightbulb className="size-5 text-gold" />
                  <span className="hidden sm:inline">{t("hint")}</span>
                </Button>
              )}
              <Button size="lg" className="flex-1" disabled={!value} onClick={() => submit(value)}>
                {t("check")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Correct: the reason (if any). Wrong: a pen correction of what the learner wrote. */
function Feedback({ ex, verdict, why }: { ex: RunExercise["ex"]; verdict: Verdict; why?: string }) {
  const t = useTranslations("ex");
  if (ex.type === "spot") return <Correction className="mt-1.5" wrong={ex.wrong} right={ex.right} note={why} />;
  if (verdict.ok) {
    return (
      <>
        {why && <p className="mt-1 text-[14px] text-label-2">{why}</p>}
        {(ex.type === "listen" || ex.type === "translate" || ex.type === "order") && verdict.answer && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span lang="en" className="font-lesson text-[17px]">
              {verdict.answer}
            </span>
            <SpeakButton text={verdict.answer} />
          </div>
        )}
      </>
    );
  }
  if (!verdict.answer) return why ? <p className="mt-1 text-[14px] text-label-2">{why}</p> : null;
  return verdict.given ? (
    <Correction className="mt-1.5" wrong={verdict.given} right={verdict.answer} note={why} layout={verdict.answer.length > 28 ? "stacked" : "inline"} />
  ) : (
    <p className="mt-1 text-[15px]">
      <span className="text-label-2">{t("answer")}</span>{" "}
      <span lang="en" className="font-lesson text-[17px] italic text-teal">
        {verdict.answer}
      </span>
      {why && <span className="mt-1 block text-[14px] text-label-2">{why}</span>}
    </p>
  );
}
