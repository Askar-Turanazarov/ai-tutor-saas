"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, Hourglass, Layers, PenLine, Sparkles, Zap } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { SuzaniMedallion } from "@/components/decor/motifs";
import { ExerciseRunner, type RunSummary } from "./exercises/ExerciseRunner";
import { reportMistakeTraining, reportReview, startMistakeTraining, startReview } from "@/app/actions/learn";
import { celebrate } from "@/lib/celebrate";
import type { ItemInfo, RunExercise } from "@/lib/learning/exercises";

type State =
  | { phase: "loading" }
  | { phase: "empty" }
  | { phase: "quota"; limit: number }
  | { phase: "run"; steps: RunExercise[]; items: Record<string, ItemInfo> }
  | { phase: "done"; correct: number; total: number; xp: number; resolved?: number };

/**
 * A short practice run outside lessons: SRS review of due cards, or training from the mistake bank.
 * The session is built on the server when the page opens (that's when the review quota is taken).
 */
export function PracticeSession({ kind }: { kind: "review" | "mistakes" }) {
  const t = useTranslations(kind === "review" ? "vocab" : "mistakes");
  const tv = useTranslations("vocab");
  const tp = useTranslations("paywall");
  const [state, setState] = useState<State>({ phase: "loading" });
  const started = useRef(false);
  const back = kind === "review" ? "/app/vocab" : "/app/mistakes";

  useEffect(() => {
    // Strict mode runs effects twice in development; the session (and its quota) must start once.
    if (started.current) return;
    started.current = true;
    (async () => {
      const res = kind === "review" ? await startReview() : await startMistakeTraining();
      if ("error" in res) return setState(res.error === "quota" ? { phase: "quota", limit: res.limit } : { phase: "empty" });
      if (!res.steps.length) return setState({ phase: "empty" });
      setState({ phase: "run", steps: res.steps, items: Object.fromEntries(res.items.map((i) => [i.id, i])) });
    })().catch(() => setState({ phase: "empty" }));
  }, [kind]);

  const finish = async (s: RunSummary) => {
    const answers = s.answers;
    const res: { xp: number; resolved?: number } = kind === "review" ? await reportReview({ answers }) : await reportMistakeTraining({ answers });
    setState({ phase: "done", correct: s.correct, total: s.total, xp: res.xp, resolved: res.resolved });
    if (s.correct > 0) celebrate();
  };

  if (state.phase === "loading")
    return (
      <div className="grid min-h-[60vh] place-items-center text-[15px] text-label-2">
        <span className="flex items-center gap-2">
          <span className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" /> {tv("review.loading")}
        </span>
      </div>
    );

  if (state.phase === "run")
    return (
      <div className="mx-auto max-w-xl px-4 pt-4 sm:pt-6">
        <ExerciseRunner steps={state.steps} items={state.items} quitHref={back} title={kind === "review" ? tv("review.title") : t("train")} onFinish={finish} />
      </div>
    );

  const Icon = kind === "review" ? Layers : PenLine;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center">
      <SuzaniMedallion size={128} tone={state.phase === "done" ? "teal" : state.phase === "quota" ? "gold" : "accent"}>
        {state.phase === "done" ? <Check className="size-9 text-teal" strokeWidth={3} /> : state.phase === "quota" ? <Hourglass className="size-8 text-gold" /> : <Icon className="size-8 text-accent" />}
      </SuzaniMedallion>
      {state.phase === "done" && (
        <>
          <h1 className="mt-5 text-[26px] font-bold">{kind === "review" ? tv("review.doneTitle") : t("doneTitle")}</h1>
          <p className="mt-1 text-[16px] text-label-2">{tv("review.doneText", { correct: state.correct, total: state.total })}</p>
          {state.xp > 0 && (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-1.5 text-[17px] font-bold text-accent">
              <Zap className="size-4" /> +{state.xp} XP
            </span>
          )}
          {state.resolved !== undefined && (
            <p className="mt-4 max-w-xs text-[15px] text-label-2">{state.resolved ? t("doneResolved", { n: state.resolved }) : t("doneNone")}</p>
          )}
        </>
      )}
      {state.phase === "empty" && <p className="mt-5 max-w-xs text-[16px] text-label-2">{kind === "review" ? tv("review.nothing") : t("nothing")}</p>}
      {state.phase === "quota" && (
        <>
          <h1 className="mt-5 text-[24px] font-bold">{tv("review.quota")}</h1>
          <p className="mt-2 max-w-xs text-[15px] text-label-2">{tv("review.quotaText", { n: state.limit })}</p>
          <ButtonLink href="/app/plans?tier=PLUS" icon={Sparkles} className="mt-6 w-full">
            {tp("cta", { tier: "Plus" })}
          </ButtonLink>
        </>
      )}
      <ButtonLink href={back} size="lg" variant={state.phase === "quota" ? "secondary" : "primary"} className="mt-8 w-full">
        {kind === "review" ? tv("review.back") : t("back")}
      </ButtonLink>
    </motion.div>
  );
}
