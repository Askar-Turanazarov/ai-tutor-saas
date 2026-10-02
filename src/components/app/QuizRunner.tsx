"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useAnimationControls } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, Mic, Square, Trophy, Volume2, X, Zap } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/primitives";
import { spring } from "@/components/ui/motion";
import { submitQuiz } from "@/app/actions/user";
import { celebrate } from "@/lib/celebrate";
import { createRecognition, recognitionSupported, speak } from "@/lib/speech";
import { cn } from "@/lib/cn";
import type { Question } from "@/lib/ai/schemas";

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Verdict = { ok: boolean; answer?: string; explanation?: string } | null;

export function QuizRunner({ quizId, title, questions }: { quizId: string; title: string; questions: Question[] }) {
  const t = useTranslations("quiz");
  const router = useRouter();
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [response, setResponse] = useState<unknown>(null);
  const [result, setResult] = useState<{ xp: number } | null>(null);
  const shake = useAnimationControls();
  const q = questions[index];

  const canCheck =
    response !== null &&
    response !== "" &&
    !(Array.isArray(response) && response.length === 0);

  function check() {
    if (!canCheck || verdict) return;
    let v: Verdict = null;
    if (q.type === "choice") v = { ok: response === q.answer, answer: q.options[q.answer], explanation: q.explanation };
    if (q.type === "order") v = { ok: norm((response as string[]).join(" ")) === norm(q.answer), answer: q.answer };
    if (q.type === "translate")
      v = { ok: [q.answer, ...(q.accept ?? [])].some((a) => norm(a) === norm(response as string)), answer: q.answer };
    if (q.type === "speak") {
      const target = norm(q.text).split(" ");
      const heard = new Set(norm(response as string).split(" "));
      const hit = target.filter((w) => heard.has(w)).length / target.length;
      v = { ok: hit >= 0.7, answer: q.text };
    }
    if (!v) return;
    setVerdict(v);
    if (v.ok) setScore((s) => s + 1);
    else shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
  }

  async function next(skip = false) {
    if (skip) setSkipped((s) => s + 1);
    setVerdict(null);
    setResponse(null);
    if (index + 1 < questions.length) return setIndex(index + 1);
    const total = questions.length - skipped - (skip ? 1 : 0);
    const res = await submitQuiz({ quizId, score, total: Math.max(1, total) });
    setResult(res);
    celebrate();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || result) return;
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (verdict) next();
      else check();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (result) {
    const total = Math.max(1, questions.length - skipped);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex max-w-md flex-col items-center py-12 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 12, delay: 0.1 }}
          className="grid size-28 place-items-center rounded-[32px] bg-gold-soft text-gold"
        >
          <Trophy className="size-14" />
        </motion.div>
        <h1 className="mt-6 text-[28px] font-bold">{t("finishTitle")}</h1>
        <p className="mt-2 text-[17px] text-label-2">{t("score", { score, total })}</p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent-soft px-5 py-2 text-[20px] font-bold text-accent"
        >
          <Zap className="size-5" /> {t("xpEarned", { xp: result.xp })}
        </motion.div>
        <div className="mt-10 grid w-full gap-3">
          <Button size="lg" onClick={() => router.push("/app/path")}>
            {t("backToPath")}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              setResult(null);
              setIndex(0);
              setScore(0);
              setSkipped(0);
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
    <div className="mx-auto flex min-h-[calc(100dvh-110px)] max-w-2xl flex-col overflow-x-clip lg:min-h-[calc(100dvh-100px)]">
      <div className="flex items-center gap-4">
        <Link
          href="/app/path"
          aria-label={t("quit")}
          className="grid size-10 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill"
        >
          <X className="size-6" />
        </Link>
        <ProgressBar value={(index + (verdict ? 1 : 0)) / questions.length} className="h-3 flex-1" color="bg-success-solid" />
      </div>
      <p className="mt-6 text-[13px] font-semibold uppercase tracking-wide text-label-3">{title}</p>

      <motion.div animate={shake} className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${round}-${index}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="pt-3"
          >
            {q.type === "choice" && (
              <ChoiceQ q={q} value={response as number | null} onChange={setResponse} locked={!!verdict} verdict={verdict} />
            )}
            {q.type === "order" && (
              <OrderQ q={q} seed={index + round * 7} value={(response as string[]) ?? []} onChange={setResponse} locked={!!verdict} />
            )}
            {q.type === "translate" && (
              <TranslateQ q={q} value={(response as string) ?? ""} onChange={setResponse} locked={!!verdict} />
            )}
            {q.type === "speak" && <SpeakQ q={q} value={(response as string) ?? ""} onChange={setResponse} locked={!!verdict} />}
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
              className={cn("rounded-[22px] p-4 sm:p-5", verdict.ok ? "bg-success-soft" : "bg-danger-soft")}
              role="status"
            >
              <div className="flex items-start gap-3">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  className={cn("grid size-9 shrink-0 place-items-center rounded-full text-on-solid", verdict.ok ? "bg-success-solid" : "bg-danger-solid")}
                >
                  {verdict.ok ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" strokeWidth={3} />}
                </motion.span>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[18px] font-bold", verdict.ok ? "text-success" : "text-danger")}>
                    {verdict.ok ? t("correct") : t("wrong")}
                  </div>
                  {!verdict.ok && verdict.answer && (
                    <p className="mt-0.5 text-[15px]">
                      <span className="text-label-2">{t("correctAnswer")}</span> <b>{verdict.answer}</b>
                    </p>
                  )}
                  {verdict.explanation && <p className="mt-1 text-[14px] text-label-2">{verdict.explanation}</p>}
                </div>
              </div>
              <Button
                size="lg"
                variant={verdict.ok ? "success" : "primary"}
                className={cn("mt-4 w-full", !verdict.ok && "!bg-danger-solid !text-on-solid")}
                onClick={() => next()}
                autoFocus
              >
                {t("continue")}
              </Button>
            </motion.div>
          ) : (
            <motion.div key="check" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-3">
              {q.type === "speak" && (
                <Button size="lg" variant="secondary" onClick={() => next(true)}>
                  {t("skip")}
                </Button>
              )}
              <Button size="lg" className="flex-1" disabled={!canCheck} onClick={check}>
                {t("check")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChoiceQ({
  q,
  value,
  onChange,
  locked,
  verdict,
}: {
  q: Extract<Question, { type: "choice" }>;
  value: number | null;
  onChange: (v: number) => void;
  locked: boolean;
  verdict: Verdict;
}) {
  const t = useTranslations("quiz");
  return (
    <>
      <p className="text-[13px] font-medium text-label-2">{t("chooseAnswer")}</p>
      <h2 className="mt-2 text-[24px] font-semibold leading-snug sm:text-[26px]">{q.prompt}</h2>
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {q.options.map((o, i) => {
          const selected = value === i;
          const isAnswer = locked && i === q.answer;
          const isWrong = locked && selected && !verdict?.ok;
          return (
            <motion.button
              key={i}
              whileTap={locked ? undefined : { scale: 0.97 }}
              whileHover={locked ? undefined : { y: -2 }}
              transition={spring}
              onClick={() => !locked && onChange(i)}
              aria-pressed={selected}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-[16px] border-2 px-4 py-3 text-left text-[17px] font-medium transition-colors",
                isAnswer
                  ? "border-success bg-success-soft"
                  : isWrong
                    ? "border-danger bg-danger-soft"
                    : selected
                      ? "border-accent-solid bg-accent-soft"
                      : "border-separator hover:bg-fill",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-[8px] border text-[13px] font-semibold",
                  selected ? "border-accent-solid text-accent" : "border-separator text-label-3",
                )}
              >
                {i + 1}
              </span>
              {o}
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

function OrderQ({
  q,
  seed,
  value,
  onChange,
  locked,
}: {
  q: Extract<Question, { type: "order" }>;
  seed: number;
  value: string[];
  onChange: (v: string[]) => void;
  locked: boolean;
}) {
  const t = useTranslations("quiz");
  const words = useMemo(
    () => shuffle(q.answer.replace(/[.?!]$/, "").split(/\s+/).map((w, i) => `${i}:${w}`), seed + q.answer.length),
    [q.answer, seed],
  );
  const picked = value;
  const pool = words.filter((w) => !picked.includes(w));
  const label = (w: string) => w.slice(w.indexOf(":") + 1);

  return (
    <LayoutGroup>
      <p className="text-[13px] font-medium text-label-2">{t("tapWords")}</p>
      <h2 className="mt-2 text-[22px] font-semibold leading-snug">{q.prompt}</h2>
      <div className="mt-6 flex min-h-[64px] flex-wrap content-start gap-2 border-b-2 border-separator pb-3">
        {picked.map((w) => (
          <motion.button
            layoutId={w}
            key={w}
            transition={spring}
            onClick={() => !locked && onChange(picked.filter((x) => x !== w))}
            className="rounded-[12px] border border-separator bg-elevated px-3.5 py-2 text-[17px] font-medium shadow-card"
          >
            {label(w)}
          </motion.button>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {pool.map((w) => (
          <motion.button
            layoutId={w}
            key={w}
            transition={spring}
            whileTap={{ scale: 0.94 }}
            onClick={() => !locked && onChange([...picked, w])}
            className="rounded-[12px] border border-separator bg-elevated px-3.5 py-2 text-[17px] font-medium shadow-card"
          >
            {label(w)}
          </motion.button>
        ))}
      </div>
    </LayoutGroup>
  );
}

function TranslateQ({
  q,
  value,
  onChange,
  locked,
}: {
  q: Extract<Question, { type: "translate" }>;
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
}) {
  const t = useTranslations("quiz");
  return (
    <>
      <p className="text-[13px] font-medium text-label-2">{t("translate")}</p>
      <h2 className="mt-2 text-[24px] font-semibold leading-snug">{q.prompt}</h2>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
        }}
        readOnly={locked}
        rows={3}
        autoFocus
        placeholder={t("typeHere")}
        aria-label={t("typeHere")}
        className="mt-6 w-full resize-none rounded-[16px] border-2 border-separator bg-elevated p-4 text-[18px] outline-none transition-colors placeholder:text-label-3 focus:border-accent"
      />
    </>
  );
}

function SpeakQ({
  q,
  value,
  onChange,
  locked,
}: {
  q: Extract<Question, { type: "speak" }>;
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
}) {
  const t = useTranslations("quiz");
  const tp = useTranslations("pron");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const rec = useRef<ReturnType<typeof createRecognition>>(null);
  useEffect(() => setSupported(recognitionSupported()), []);

  const toggle = () => {
    if (listening) return rec.current?.stop();
    const r = createRecognition();
    if (!r) return;
    rec.current = r;
    r.onresult = (e) => onChange(Array.from(e.results).map((x) => x[0].transcript).join(""));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    setListening(true);
  };

  return (
    <>
      <p className="text-[13px] font-medium text-label-2">{t("speak")}</p>
      <div className="mt-3 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => speak(q.text)}
          aria-label={t("listen")}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"
        >
          <Volume2 className="size-6" />
        </motion.button>
        <h2 className="text-[24px] font-semibold leading-snug">{q.text}</h2>
      </div>
      <div className="mt-10 flex flex-col items-center gap-4">
        {supported ? (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggle}
            disabled={locked}
            aria-label={listening ? tp("stop") : t("record")}
            className={cn(
              "relative grid size-24 place-items-center rounded-full text-white shadow-float",
              listening ? "bg-danger-solid" : "bg-accent-solid",
            )}
          >
            {listening && (
              <span className="absolute inset-0 rounded-full bg-danger-solid" style={{ animation: "pulse-ring 1.2s ease-out infinite" }} />
            )}
            {listening ? <Square className="relative size-8" fill="currentColor" /> : <Mic className="size-10" />}
          </motion.button>
        ) : (
          <p className="max-w-sm text-center text-[14px] text-label-2">{tp("unsupported")}</p>
        )}
        {listening && <p className="text-[14px] font-medium text-danger">{t("recording")}</p>}
        {value && (
          <p className="text-center text-[16px]">
            <span className="text-label-2">{t("heard")}</span> “{value}”
          </p>
        )}
      </div>
    </>
  );
}
