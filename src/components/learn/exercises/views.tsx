"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion, useAnimationControls } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Check, Mic, Snail, Square, Volume2 } from "lucide-react";
import { spring } from "@/components/ui/motion";
import { Phrase, SpeakButton, Waveform } from "@/components/learn/primitives";
import { createRecognition, recognitionSupported, speak } from "@/lib/speech";
import { pick, spotRange, words, type ItemInfo, type Response, type Verdict } from "@/lib/learning/exercises";
import { shuffle } from "@/lib/learning/adaptive";
import type { Exercise } from "@/lib/content/types";
import { cn } from "@/lib/cn";

export type ViewProps<T extends Exercise["type"] = Exercise["type"]> = {
  ex: Extract<Exercise, { type: T }>;
  value: Response | null;
  onChange: (r: Response | null) => void;
  locked: boolean;
  verdict: Verdict | null;
  items: Record<string, ItemInfo>;
  hint: boolean;
  seed: number;
};

/** Deterministic PRNG so shuffles survive re-renders but differ per step. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const promptCls = "text-[13px] font-semibold uppercase tracking-[0.05em] text-label-3";
const english = "font-lesson text-[24px] leading-snug sm:text-[27px]";
const field =
  "w-full rounded-[16px] border-2 border-separator bg-elevated px-4 py-3 font-lesson text-[19px] outline-none transition-colors placeholder:font-ui placeholder:text-[16px] placeholder:text-label-3 focus:border-accent-solid";

export function Prompt({ type }: { type: Exercise["type"] | "meaning" }) {
  const t = useTranslations("ex");
  return <p className={promptCls}>{t(`prompt.${type}`)}</p>;
}

/* ───────────── choice · collocate · dialogue ───────────── */

export function ChoiceView({ ex, value, onChange, locked, items }: ViewProps<"choice" | "collocate" | "dialogue">) {
  const locale = useLocale();
  const selected = value?.kind === "index" ? value.value : null;
  const meaningPrompt = ex.type === "choice" && !ex.prompt && ex.item ? pick(items[ex.item]?.meaning, locale) : null;

  return (
    <>
      <Prompt type={meaningPrompt ? "meaning" : ex.type} />
      {ex.type === "dialogue" ? (
        <div className="mt-4 flex items-end gap-2">
          <div lang="en" className="max-w-[88%] rounded-[20px] rounded-bl-md bg-fill px-4 py-3 font-lesson text-[20px] leading-snug">
            {ex.line}
          </div>
          {!ex.line.startsWith("(") && <SpeakButton text={ex.line} />}
        </div>
      ) : meaningPrompt ? (
        <h2 className="mt-3 text-[22px] font-semibold leading-snug">{meaningPrompt}</h2>
      ) : (
        <h2 lang="en" className={cn("mt-3", english)}>
          <Blank text={ex.prompt} fill={locked ? ex.options[ex.answer] : selected !== null ? ex.options[selected] : undefined} />
        </h2>
      )}
      <div className={cn("mt-7 grid gap-2.5", ex.type !== "dialogue" && "sm:grid-cols-2")}>
        {ex.options.map((o, i) => {
          const isAnswer = locked && i === ex.answer;
          const isWrong = locked && selected === i && i !== ex.answer;
          return (
            <motion.button
              key={i}
              whileTap={locked ? undefined : { scale: 0.97 }}
              transition={spring}
              onClick={() => !locked && onChange({ kind: "index", value: i })}
              aria-pressed={selected === i}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-[16px] border-2 px-4 py-3 text-left transition-colors",
                isAnswer
                  ? "border-teal bg-teal-soft"
                  : isWrong
                    ? "border-danger bg-danger-soft"
                    : selected === i
                      ? "border-accent-solid bg-accent-soft"
                      : "border-separator bg-elevated hover:bg-fill",
              )}
            >
              <kbd className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-separator font-ui text-[12px] font-semibold text-label-3">{i + 1}</kbd>
              <span lang="en" className="font-lesson text-[18px]">
                {o}
              </span>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

/** Renders "___" as a blank line, or the chosen word marked in ochre. */
function Blank({ text, fill }: { text: string; fill?: string }) {
  const parts = text.split("___");
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 &&
            (fill ? (
              <mark className="marker rounded-[4px] px-1 text-inherit">{fill}</mark>
            ) : (
              <span className="mx-1 inline-block w-16 border-b-2 border-label-3 align-baseline" aria-label="blank" />
            ))}
        </Fragment>
      ))}
    </>
  );
}

/* ───────────── gap ───────────── */

export function GapView({ ex, value, onChange, locked, hint }: ViewProps<"gap">) {
  const locale = useLocale();
  const [before, after = ""] = ex.prompt.split("___");
  const text = value?.kind === "text" ? value.value : "";
  return (
    <>
      <Prompt type="gap" />
      <p lang="en" className={cn("mt-4", english)}>
        {before}
        <input
          value={text}
          onChange={(e) => onChange({ kind: "text", value: e.target.value })}
          readOnly={locked}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="answer"
          style={{ width: `${Math.max(4, ex.answer.length + 2)}ch` }}
          className="mx-1 inline-block border-b-2 border-accent-solid bg-transparent px-1 text-center font-lesson text-accent outline-none"
        />
        {after}
      </p>
      {hint && (
        <p className="mt-4 border-l-2 border-gold/60 pl-3 text-[15px] text-label-2">{pick(ex.hint, locale) ?? `${ex.answer[0]}…`}</p>
      )}
    </>
  );
}

/* ───────────── translate ───────────── */

export function TranslateView({ ex, value, onChange, locked, hint }: ViewProps<"translate">) {
  const locale = useLocale();
  const t = useTranslations("ex");
  return (
    <>
      <Prompt type="translate" />
      <h2 className="mt-3 text-[23px] font-semibold leading-snug">{pick(ex.from, locale)}</h2>
      <textarea
        value={value?.kind === "text" ? value.value : ""}
        onChange={(e) => onChange({ kind: "text", value: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        readOnly={locked}
        rows={2}
        autoFocus
        lang="en"
        spellCheck={false}
        placeholder={t("typeHere")}
        aria-label={t("typeHere")}
        className={cn("mt-6 resize-none", field)}
      />
      {hint && <p className="mt-3 border-l-2 border-gold/60 pl-3 font-lesson text-[16px] text-label-2">{ex.answer.split(" ").slice(0, 2).join(" ")} …</p>}
    </>
  );
}

/* ───────────── order ───────────── */

export function OrderView({ ex, value, onChange, locked, hint, seed }: ViewProps<"order">) {
  const locale = useLocale();
  // Tokens are "index:word" so repeated words stay distinct; check() strips the prefix.
  const tokens = useMemo(() => shuffle(words(ex.answer).map((w, i) => `${i}:${w}`), seeded(seed + 7)), [ex.answer, seed]);
  const picked = value?.kind === "words" ? value.value : [];
  const set = (next: string[]) => onChange(next.length ? { kind: "words", value: next } : null);

  return (
    <LayoutGroup>
      <Prompt type="order" />
      {ex.hint && <h2 className="mt-3 text-[21px] font-semibold leading-snug">{pick(ex.hint, locale)}</h2>}
      <div lang="en" className="mt-6 flex min-h-[64px] flex-wrap content-start gap-2 border-b-2 border-separator pb-3">
        {picked.map((w) => (
          <Token key={w} id={w} onClick={() => !locked && set(picked.filter((x) => x !== w))} />
        ))}
      </div>
      <div lang="en" className="mt-6 flex flex-wrap justify-center gap-2">
        {tokens
          .filter((w) => !picked.includes(w))
          .map((w) => (
            <Token key={w} id={w} onClick={() => !locked && set([...picked, w])} />
          ))}
      </div>
      {hint && <p className="mt-4 text-center font-lesson text-[16px] text-label-2">{words(ex.answer)[0]} …</p>}
    </LayoutGroup>
  );
}

const label = (w: string) => w.slice(w.indexOf(":") + 1);

function Token({ id, onClick }: { id: string; onClick: () => void }) {
  return (
    <motion.button
      layoutId={id}
      transition={spring}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="rounded-[12px] border border-separator bg-elevated px-3.5 py-2 font-lesson text-[18px] shadow-card"
    >
      {label(id)}
    </motion.button>
  );
}

/* ───────────── spot the error ───────────── */

export function SpotView({ ex, value, onChange, locked }: ViewProps<"spot">) {
  const ws = words(ex.sentence);
  const picked = value?.kind === "spot" ? value.value : [];
  const range = spotRange(ex.sentence, ex.wrong);
  const toggle = (i: number) => {
    if (locked) return;
    const next = picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i];
    onChange(next.length ? { kind: "spot", value: next } : null);
  };
  return (
    <>
      <Prompt type="spot" />
      <p lang="en" className="mt-6 flex flex-wrap gap-x-1.5 gap-y-2 font-lesson text-[24px] leading-snug">
        {ws.map((w, i) => {
          const on = picked.includes(i);
          const wrong = locked && range.includes(i);
          return (
            <motion.button
              key={i}
              whileTap={locked ? undefined : { scale: 0.95 }}
              onClick={() => toggle(i)}
              aria-pressed={on}
              className={cn(
                "rounded-[10px] border-2 px-1.5 transition-colors",
                wrong ? "border-danger bg-danger-soft text-danger line-through decoration-danger/70" : on ? "border-accent-solid bg-accent-soft" : "border-transparent hover:bg-fill",
              )}
            >
              {w}
            </motion.button>
          );
        })}
      </p>
    </>
  );
}

/* ───────────── match pairs ───────────── */

export function MatchView({ ex, onChange, locked, items, seed }: ViewProps<"match">) {
  const locale = useLocale();
  const t = useTranslations("ex");
  const list = ex.items.map((id) => items[id]).filter(Boolean);
  const right = useMemo(() => shuffle(list, seeded(seed + 3)), [list.length, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [left, setLeft] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [bad, setBad] = useState<string | null>(null);
  const shake = useAnimationControls();

  const choose = async (id: string) => {
    if (locked || !left || done.includes(id)) return;
    if (id === left) {
      const next = [...done, id];
      setDone(next);
      setLeft(null);
      speak(items[id].chunk, 0.9);
      if (next.length === list.length) onChange({ kind: "match", mistakes });
    } else {
      setMistakes((m) => m + 1);
      setBad(id);
      await shake.start({ x: [0, -6, 6, -3, 0], transition: { duration: 0.3 } });
      setBad(null);
    }
  };

  const cell = "min-h-14 w-full rounded-[14px] border-2 px-3 py-2.5 text-left transition-colors";
  return (
    <>
      <Prompt type="match" />
      <motion.div animate={shake} className="mt-6 grid grid-cols-2 gap-2.5">
        <div className="grid content-start gap-2.5">
          {list.map((it) => (
            <button
              key={it.id}
              onClick={() => !locked && !done.includes(it.id) && setLeft(it.id)}
              disabled={done.includes(it.id)}
              lang="en"
              className={cn(
                cell,
                "font-lesson text-[17px]",
                done.includes(it.id) ? "border-teal/40 bg-teal-soft text-teal" : left === it.id ? "border-accent-solid bg-accent-soft" : "border-separator bg-elevated hover:bg-fill",
              )}
            >
              {it.chunk}
            </button>
          ))}
        </div>
        <div className="grid content-start gap-2.5">
          {right.map((it) => (
            <button
              key={it.id}
              onClick={() => choose(it.id)}
              disabled={done.includes(it.id)}
              className={cn(
                cell,
                "text-[14px] leading-snug",
                done.includes(it.id) ? "border-teal/40 bg-teal-soft text-teal" : bad === it.id ? "border-danger bg-danger-soft" : "border-separator bg-elevated hover:bg-fill",
              )}
            >
              {pick(it.meaning, locale)}
            </button>
          ))}
        </div>
      </motion.div>
      <p className="mt-4 text-center text-[13px] text-label-2">
        {done.length === list.length ? (
          <span className="inline-flex items-center gap-1 text-teal">
            <Check className="size-4" /> {t("matchDone")}
          </span>
        ) : (
          mistakes > 0 && t("mistakesInMatch", { n: mistakes })
        )}
      </p>
    </>
  );
}

/* ───────────── listen ───────────── */

export function ListenView({ ex, value, onChange, locked }: ViewProps<"listen">) {
  const t = useTranslations("ex");
  const [playing, setPlaying] = useState(false);
  const play = (rate: number) => {
    setPlaying(true);
    speak(ex.text, rate, () => setPlaying(false));
  };
  useEffect(() => {
    const id = setTimeout(() => play(0.95), 350);
    return () => clearTimeout(id);
  }, [ex.text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Prompt type="listen" />
      <div className="mt-6 flex items-center justify-center gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => play(0.95)}
          aria-label={t("prompt.listen")}
          className="flex h-16 items-center gap-3 rounded-full bg-accent-solid px-6 text-on-accent shadow-float"
        >
          <Volume2 className="size-6" />
          <Waveform active={playing} bars={7} className="h-5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => play(0.6)}
          aria-label={t("slower")}
          title={t("slower")}
          className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent"
        >
          <Snail className="size-5" />
        </motion.button>
      </div>
      <textarea
        value={value?.kind === "text" ? value.value : ""}
        onChange={(e) => onChange({ kind: "text", value: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        readOnly={locked}
        rows={2}
        lang="en"
        spellCheck={false}
        placeholder={t("typeHere")}
        aria-label={t("typeHere")}
        className={cn("mt-7 resize-none", field)}
      />
    </>
  );
}

/* ───────────── speak ───────────── */

export function SpeakView({ ex, value, onChange, locked }: ViewProps<"speak">) {
  const t = useTranslations("ex");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const rec = useRef<ReturnType<typeof createRecognition>>(null);
  useEffect(() => setSupported(recognitionSupported()), []);
  useEffect(() => () => rec.current?.stop(), []);

  const toggle = () => {
    if (listening) return rec.current?.stop();
    const r = createRecognition();
    if (!r) return;
    rec.current = r;
    r.onresult = (e) => onChange({ kind: "text", value: Array.from(e.results).map((x) => x[0].transcript).join("") });
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    setListening(true);
  };

  return (
    <>
      <Prompt type="speak" />
      <div className="mt-4">
        <Phrase text={ex.text} speakable size="lg" />
      </div>
      <div className="mt-10 flex flex-col items-center gap-4">
        {supported ? (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggle}
            disabled={locked}
            aria-label={listening ? t("stop") : t("record")}
            className={cn("relative grid size-24 place-items-center rounded-full text-white shadow-float", listening ? "bg-danger-solid" : "bg-accent-solid")}
          >
            {listening && <span className="absolute inset-0 rounded-full bg-danger-solid" style={{ animation: "pulse-ring 1.2s ease-out infinite" }} />}
            {listening ? <Square className="relative size-8" fill="currentColor" /> : <Mic className="size-10" />}
          </motion.button>
        ) : (
          <p className="max-w-sm text-center text-[14px] text-label-2">{t("noMic")}</p>
        )}
        {listening && <Waveform active bars={9} className="h-6 text-danger" />}
        {value?.kind === "text" && value.value && (
          <p className="text-center text-[15px]">
            <span className="text-label-2">{t("heard")}</span>{" "}
            <span lang="en" className="font-lesson text-[17px]">
              “{value.value}”
            </span>
          </p>
        )}
      </div>
    </>
  );
}
