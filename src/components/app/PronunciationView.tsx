"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Mic, RefreshCw, Snail, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressRing, TypingDots } from "@/components/ui/primitives";
import { spring } from "@/components/ui/motion";
import { nextPhrase, pronunciationCheck } from "@/app/actions/user";
import { createRecognition, recognitionSupported, speak } from "@/lib/speech";
import { cn } from "@/lib/cn";
import { Paywall } from "@/components/billing/Paywall";
import { useUsage } from "./usage";

type Result = Extract<NonNullable<Awaited<ReturnType<typeof pronunciationCheck>>>, { score: number }>;

export function PronunciationView({ pro, initialPhrase }: { pro: boolean; initialPhrase: string }) {
  const t = useTranslations("pron");
  const header = (
    <div>
      <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold">{t("title")}</h1>
      <p className="mt-1 text-[16px] text-label-2">{t("subtitle")}</p>
    </div>
  );
  if (!pro)
    return (
      <div className="space-y-6">
        {header}
        <Paywall feature="pronunciation" title={t("proTitle")} text={t("proText")} preview={<Trainer phrase={initialPhrase} demo />} />
      </div>
    );
  return (
    <div className="space-y-6">
      {header}
      <Trainer phrase={initialPhrase} />
    </div>
  );
}

function Trainer({ phrase: initial, demo }: { phrase: string; demo?: boolean }) {
  const t = useTranslations("pron");
  const { showQuota } = useUsage();
  const [phrase, setPhrase] = useState(initial);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [result, setResult] = useState<Result | null>(
    demo
      ? {
          words: initial.toLowerCase().replace(/[^a-z'\s]/g, "").split(/\s+/).map((w, i) => ({ word: w, ok: i % 4 !== 1 })),
          score: 78,
          summary: "",
          tips: [],
        }
      : null,
  );
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [loadingNext, startNext] = useTransition();
  const rec = useRef<ReturnType<typeof createRecognition>>(null);
  const heardRef = useRef("");

  useEffect(() => setSupported(recognitionSupported()), []);

  const analyze = (text: string) =>
    startAnalyze(async () => {
      const res = await pronunciationCheck({ target: phrase, heard: text });
      if (res && "limit" in res) showQuota("pronunciationPerDay", res.limit ?? 0);
      else if (res) setResult(res);
    });

  const toggle = () => {
    if (listening) return rec.current?.stop();
    const r = createRecognition();
    if (!r) return setSupported(false);
    rec.current = r;
    heardRef.current = "";
    setHeard("");
    setResult(null);
    setError(null);
    r.onresult = (e) => {
      heardRef.current = Array.from(e.results).map((x) => x[0].transcript).join("");
      setHeard(heardRef.current);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setError(t("micDenied"));
    };
    r.onend = () => {
      setListening(false);
      if (heardRef.current.trim()) analyze(heardRef.current);
    };
    r.start();
    setListening(true);
  };

  const another = () =>
    startNext(async () => {
      const p = await nextPhrase(phrase);
      setPhrase(p);
      setHeard("");
      setResult(null);
    });

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="surface flex flex-col items-center rounded-card p-6 text-center sm:p-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={phrase}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
            className="min-h-[72px] text-[clamp(1.4rem,3.5vw,1.9rem)] font-semibold leading-snug"
          >
            {result ? (
              <span>
                {result.words.map((w, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "mx-0.5 inline-block rounded-[8px] px-1",
                      w.ok ? "text-success" : "bg-danger-soft text-danger underline decoration-wavy underline-offset-4",
                    )}
                  >
                    {w.word}
                  </motion.span>
                ))}
              </span>
            ) : (
              phrase
            )}
          </motion.p>
        </AnimatePresence>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="tinted" icon={Volume2} iconAnim="wiggle" onClick={() => speak(phrase)}>
            {t("listen")}
          </Button>
          <Button variant="secondary" icon={Snail} iconAnim="nudge" onClick={() => speak(phrase, 0.6)}>
            {t("slow")}
          </Button>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          {supported ? (
            <>
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.04 }}
                transition={spring}
                onClick={toggle}
                disabled={analyzing || demo}
                aria-label={listening ? t("stop") : t("record")}
                className={cn(
                  "relative grid size-24 place-items-center rounded-full text-white shadow-float transition-colors",
                  listening ? "bg-danger-solid" : "bg-accent-solid",
                )}
              >
                {listening && (
                  <span className="absolute inset-0 rounded-full bg-danger-solid" style={{ animation: "pulse-ring 1.2s ease-out infinite" }} />
                )}
                {listening ? <Square className="relative size-8" fill="currentColor" /> : <Mic className="size-10" />}
              </motion.button>
              <span className="text-[14px] font-medium text-label-2">{listening ? t("stop") : t("record")}</span>
            </>
          ) : (
            <p className="max-w-sm text-[14px] text-label-2">{t("unsupported")}</p>
          )}
          {error && <p className="text-[14px] text-danger">{error}</p>}
          {heard && (
            <p className="max-w-md text-[15px]">
              <span className="text-label-2">{t("heard")}:</span> “{heard}”
            </p>
          )}
        </div>

        <Button variant="ghost" className="mt-6" icon={RefreshCw} iconAnim="spin" loading={loadingNext} onClick={another} disabled={demo}>
          {t("another")}
        </Button>
      </div>

      <div className="surface rounded-card p-6">
        <AnimatePresence mode="wait">
          {analyzing ? (
            <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center gap-3 py-10 text-label-2">
              <TypingDots label={t("analyzing")} />
              {t("analyzing")}
            </motion.div>
          ) : result ? (
            <motion.div key="r" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={result.score / 100}
                  size={88}
                  stroke={10}
                  color={result.score >= 80 ? "var(--success)" : result.score >= 50 ? "var(--warning)" : "var(--danger)"}
                >
                  <span className="text-[22px] font-bold">{result.score}%</span>
                </ProgressRing>
                <div>
                  <div className="text-[13px] font-semibold uppercase tracking-wide text-label-3">{t("accuracy")}</div>
                  {result.summary && <p className="mt-1 text-[15px] leading-relaxed">{result.summary}</p>}
                </div>
              </div>
              {result.tips.length > 0 && (
                <>
                  <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-wide text-label-3">{t("tips")}</h3>
                  <ul className="mt-2 space-y-2">
                    {result.tips.map((tip, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                        className="rounded-[14px] bg-fill p-3"
                      >
                        <button onClick={() => speak(tip.word, 0.7)} className="flex items-center gap-2 font-semibold hover:text-accent">
                          <Volume2 className="size-4" /> {tip.word}
                          {tip.ipa && <span className="font-normal text-label-2">{tip.ipa}</span>}
                        </button>
                        <p className="mt-1 text-[14px] text-label-2">{tip.tip}</p>
                      </motion.li>
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center text-label-2">
              <div className="grid size-14 place-items-center rounded-[18px] bg-teal-soft text-teal">
                <Mic className="size-7" />
              </div>
              <p className="max-w-[240px] text-[15px]">{t("subtitle")}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
