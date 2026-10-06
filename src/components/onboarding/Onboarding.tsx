"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Briefcase, GraduationCap, Heart, Lock, Plane, type LucideIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/primitives";
import { IslimiBorder, SuzaniMedallion } from "@/components/decor/motifs";
import { Crest, StageCard } from "@/components/decor/OrnamentStage";
import { LogoMark } from "@/components/ui/brand";
import { completeOnboarding } from "@/app/actions/user";
import { iconAnims, spring } from "@/components/ui/motion";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/cn";

const GOALS: { id: string; icon: LucideIcon; key: string }[] = [
  { id: "travel", icon: Plane, key: "goalTravel" },
  { id: "work", icon: Briefcase, key: "goalWork" },
  { id: "study", icon: GraduationCap, key: "goalStudy" },
  { id: "fun", icon: Heart, key: "goalFun" },
];

type Step = "goal" | "test" | "result";

export function Onboarding({ name, isPro, questions }: { name: string; isPro: boolean; questions: { prompt: string; options: string[] }[] }) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const tl = useTranslations("levels");
  const router = useRouter();
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<{ measured: string; level: string } | null>(null);
  const [pending, start] = useTransition();
  const q = answers.length;

  const finishTest = (all: (number | null)[]) =>
    start(async () => {
      const res = await completeOnboarding({ goal: goal ?? "fun", answers: all });
      setResult(res);
      setStep("result");
      celebrate();
    });

  const answer = (a: number | null) => {
    const next = [...answers, a];
    setAnswers(next);
    if (next.length >= questions.length) finishTest(next);
  };

  return (
    <StageCard layout className="max-w-[520px] p-6 pt-9 sm:p-9 sm:pt-11">
      <AnimatePresence mode="wait" initial={false}>
        {step === "goal" && (
          <Slide key="goal">
            <Crest size={72} tone="teal">
              <LogoMark size={26} />
            </Crest>
            <h1 className="mt-4 text-[28px] font-bold">{t("welcome", { name })}</h1>
            <p className="mt-1.5 text-[15px] text-label-2">{t("welcomeText")}</p>
            <IslimiBorder className="mt-5 text-gold opacity-45" />
            <h2 className="mt-5 text-[17px] font-semibold">{t("goalTitle")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <motion.button
                  key={g.id}
                  whileHover="hover"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setGoal(g.id)}
                  aria-pressed={goal === g.id}
                  className="relative flex flex-col items-start gap-3 rounded-[16px] bg-fill p-4 text-left text-[15px] font-medium transition-colors hover:bg-fill-2"
                >
                  {goal === g.id && (
                    <motion.span
                      layoutId="goal-pick"
                      transition={spring}
                      className="absolute inset-0 rounded-[16px] border-2 border-accent-solid bg-accent-soft"
                    />
                  )}
                  <motion.span
                    variants={iconAnims.tilt}
                    className={cn(
                      "relative grid size-10 place-items-center rounded-[12px] bg-elevated shadow-card",
                      goal === g.id ? "text-accent" : "text-label-2",
                    )}
                  >
                    <g.icon className="size-5" />
                  </motion.span>
                  <span className="relative">{t(g.key)}</span>
                </motion.button>
              ))}
            </div>
            <Button size="lg" className="mt-7 w-full" disabled={!goal} iconRight={ArrowRight} onClick={() => setStep("test")}>
              {tc("continue")}
            </Button>
          </Slide>
        )}

        {step === "test" && (
          <Slide key="test">
            <div className="flex items-center justify-between text-[13px] font-medium text-label-2">
              <span>{t("testTitle")}</span>
              <span>{t("question", { n: Math.min(q + 1, questions.length), total: questions.length })}</span>
            </div>
            <ProgressBar value={q / questions.length} className="mt-3" />
            <AnimatePresence mode="wait">
              {q < questions.length && !pending ? (
                <motion.div
                  key={q}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                >
                  {q === 0 && <p className="mt-5 text-[14px] text-label-2">{t("testText")}</p>}
                  <p className="mt-6 font-lesson text-[24px] font-medium leading-snug">{questions[q].prompt}</p>
                  <div className="mt-5 grid gap-2.5">
                    {questions[q].options.map((o, i) => (
                      <motion.button
                        key={o}
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ x: 3 }}
                        transition={spring}
                        onClick={() => answer(i)}
                        className="rounded-[14px] bg-fill px-4 py-3.5 text-left font-lesson text-[17px] transition-colors hover:bg-fill-2"
                      >
                        {o}
                      </motion.button>
                    ))}
                  </div>
                  <button onClick={() => answer(null)} className="mt-4 w-full py-2 text-[14px] font-medium text-label-2 transition-colors hover:text-label">
                    {t("dontKnow")}
                  </button>
                  {q === 0 && (
                    <button onClick={() => finishTest([])} className="w-full py-1 text-[13px] text-label-3 transition-colors hover:text-label-2">
                      {t("skipTest")}
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-60 place-items-center">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                    <SuzaniMedallion size={64} tone="teal" />
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </Slide>
        )}

        {step === "result" && result && (
          <Slide key="result" className="text-center">
            <Crest size={128} tone="gold">
              <span className="text-[30px] font-bold text-accent">{result.measured}</span>
            </Crest>
            <h1 className="mt-5 text-[26px] font-bold">{t("resultTitle", { level: `${result.measured} · ${tl(result.measured)}` })}</h1>
            <p className="mt-2 text-[15px] text-label-2">{t("resultText")}</p>
            <IslimiBorder className="mt-5 text-gold opacity-45" />
            {!isPro && result.measured !== result.level && (
              <div className="mt-5 flex items-start gap-3 rounded-[16px] bg-gold-soft p-4 text-left text-[14px]">
                <Lock className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>{t("freeCapped", { level: result.measured, free: result.level })}</span>
              </div>
            )}
            <Button size="lg" className="mt-7 w-full" iconRight={ArrowRight} onClick={() => router.push("/app")}>
              {t("finish")}
            </Button>
          </Slide>
        )}
      </AnimatePresence>
    </StageCard>
  );
}

function Slide({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
