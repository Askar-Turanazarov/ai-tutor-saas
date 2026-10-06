"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Trophy, Zap } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ExerciseRunner } from "@/components/learn/exercises/ExerciseRunner";
import { submitQuiz } from "@/app/actions/user";
import { celebrate } from "@/lib/celebrate";
import { IslimiBorder, SuzaniMedallion } from "@/components/decor/motifs";
import { fromQuestion, type RunExercise } from "@/lib/learning/exercises";
import type { Exercise } from "@/lib/content/types";
import type { Question } from "@/lib/ai/schemas";

/** A path quiz (AI or offline bank) played on the shared exercise engine. */
export function QuizRunner({ quizId, title, questions }: { quizId: string; title: string; questions: (Question | Exercise)[] }) {
  const t = useTranslations("quiz");
  const router = useRouter();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ xp: number; score: number; total: number } | null>(null);
  const steps = useMemo<RunExercise[]>(() => questions.map((q, i) => ({ key: `${round}-${i}`, ex: fromQuestion(q), difficulty: 0 })), [questions, round]);

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 12, delay: 0.1 }}
        >
          <SuzaniMedallion size={150} tone="gold">
            <Trophy className="size-9 text-gold" />
          </SuzaniMedallion>
        </motion.div>
        <h1 className="mt-6 text-[28px] font-bold">{t("finishTitle")}</h1>
        <p className="mt-2 text-[17px] text-label-2">{t("score", { score: result.score, total: result.total })}</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent-soft px-5 py-2 text-[20px] font-bold text-accent">
          <Zap className="size-5" /> {t("xpEarned", { xp: result.xp })}
        </div>
        <IslimiBorder className="mt-8 text-gold opacity-45" />
        <div className="mt-8 grid w-full gap-3">
          <Button size="lg" onClick={() => router.push("/app/path")}>
            {t("backToPath")}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              setResult(null);
              setRound((r) => r + 1);
            }}
          >
            {t("retry")}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <ExerciseRunner
      key={round}
      steps={steps}
      items={{}}
      quitHref="/app/path"
      title={title}
      onFinish={async (s) => {
        const total = Math.max(1, s.answers.filter((a) => !a.retry && !(a.type === "speak" && !a.ok && a.ms < 50)).length);
        const res = await submitQuiz({ quizId, score: s.correct, total });
        setResult({ xp: res.xp, score: s.correct, total });
        celebrate();
      }}
    />
  );
}
