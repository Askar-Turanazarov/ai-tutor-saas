"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";
import { cn } from "@/lib/cn";

/*
 * Learning primitives. English material is set in Literata (`font-lesson`), the interface in Onest,
 * so the learner always sees which text is "the language I'm learning".
 */

import type { ChunkKind } from "@/lib/content/types";
export type { ChunkKind };

const KIND_CLASS: Record<ChunkKind, string> = {
  collocation: "bg-chunk-collocation-soft text-chunk-collocation",
  phrasal: "bg-chunk-phrasal-soft text-chunk-phrasal",
  idiom: "bg-chunk-idiom-soft text-chunk-idiom",
  fixed: "bg-chunk-fixed-soft text-chunk-fixed",
  word: "bg-chunk-word-soft text-chunk-word",
};

/** Colour label of a lexical chunk type; the same colours in cards, vocabulary and corrections. */
export function ChunkTag({ kind, className }: { kind: ChunkKind; className?: string }) {
  const t = useTranslations("learn.kinds");
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em]", KIND_CLASS[kind], className)}>
      {t(kind)}
    </span>
  );
}

/* ───────────── Speech ───────────── */

/** Tracks one utterance at a time across the page. */
function useSpeaker(text: string, rate?: number) {
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  playingRef.current = playing;
  // Stop our own utterance if the component unmounts mid-speech.
  useEffect(() => () => {
    if (playingRef.current) window.speechSynthesis?.cancel();
  }, []);
  const toggle = () => {
    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    speak(text, rate, () => setPlaying(false));
  };
  return { playing, toggle };
}

/** Live voice bars: animated while TTS plays or the mic records, flat otherwise. */
export function Waveform({ active, bars = 5, className }: { active: boolean; bars?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex h-4 items-center gap-[2px]", className)}>
      {Array.from({ length: bars }, (_, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-current"
          initial={false}
          animate={active ? { height: ["30%", "100%", "45%", "80%", "30%"] } : { height: "30%" }}
          transition={active ? { duration: 0.9, repeat: Infinity, delay: i * 0.11, ease: "easeInOut" } : { duration: 0.2 }}
        />
      ))}
    </span>
  );
}

/** Round speak button; shows the waveform while speaking. */
export function SpeakButton({ text, rate, className }: { text: string; rate?: number; className?: string }) {
  const t = useTranslations("learn");
  const { playing, toggle } = useSpeaker(text, rate);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      aria-label={playing ? t("stop") : `${t("listen")}: ${text}`}
      aria-pressed={playing}
      className={cn(
        "inline-grid size-8 shrink-0 place-items-center rounded-full transition-colors",
        playing ? "bg-accent-solid text-on-accent" : "bg-accent-soft text-accent hover:bg-accent/15",
        className,
      )}
    >
      {playing ? <Waveform active bars={4} className="h-3.5" /> : <Volume2 className="size-4" />}
    </motion.button>
  );
}

/* ───────────── Phrase ───────────── */

/**
 * English text set as lesson material, with an optional speak button.
 * `highlight` marks chunks inside the text with the ochre marker (case-insensitive, first match each).
 */
export function Phrase({
  text,
  highlight = [],
  speakable = true,
  size = "md",
  className,
}: {
  text: string;
  highlight?: string[];
  speakable?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "text-[15px]", md: "text-[17px]", lg: "text-[22px] leading-snug" };
  return (
    <span className={cn("inline-flex items-start gap-2.5", className)}>
      <span lang="en" className={cn("font-lesson text-label", sizes[size])}>
        {markChunks(text, highlight)}
      </span>
      {speakable && <SpeakButton text={text} className={size === "lg" ? "mt-0.5" : "-mt-0.5"} />}
    </span>
  );
}

function markChunks(text: string, chunks: string[]): ReactNode {
  const list = chunks.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!list.length) return text;
  const esc = list.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${esc.join("|")})`, "i"));
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="marker bg-transparent text-inherit">
        {p}
      </mark>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

/* ───────────── Correction ───────────── */

/**
 * A teacher's pen correction: the wrong phrase struck through, the right one written next to it,
 * and a short rule as a footnote. Same look in chat, exercises, the mistake bank and anti-examples.
 */
export function Correction({
  wrong,
  right,
  note,
  kind,
  layout = "inline",
  className,
}: {
  wrong: string;
  right: string;
  note?: ReactNode;
  kind?: ChunkKind;
  layout?: "inline" | "stacked";
  className?: string;
}) {
  const t = useTranslations("learn");
  return (
    <div className={cn("text-label", className)}>
      <div className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", layout === "stacked" && "flex-col gap-y-1.5")}>
        <span lang="en" className="font-lesson text-[16px] text-danger line-through decoration-danger/70 decoration-[1.5px]">
          <span className="sr-only">{t("wrong")}: </span>
          {wrong}
        </span>
        {layout === "inline" && (
          <span aria-hidden className="text-label-3">
            →
          </span>
        )}
        <span lang="en" className="font-lesson text-[17px] italic text-teal">
          <span className="sr-only">{t("right")}: </span>
          {right}
        </span>
        {kind && <ChunkTag kind={kind} className="self-center" />}
      </div>
      {note && <p className="mt-1.5 border-l-2 border-gold/50 pl-2.5 text-[13px] leading-snug text-label-2">{note}</p>}
    </div>
  );
}

/* ───────────── Word card ───────────── */

/**
 * A study card that flips: front — the English chunk; back — meaning and an example.
 * Click, Enter or Space flips it.
 */
export function WordCard({
  chunk,
  kind,
  meaning,
  example,
  anti,
  className,
}: {
  chunk: string;
  kind: ChunkKind;
  meaning: string;
  example?: string;
  anti?: { wrong: string; why: string };
  className?: string;
}) {
  const t = useTranslations("learn");
  const [flipped, setFlipped] = useState(false);
  const face = "absolute inset-0 flex flex-col rounded-card border border-separator bg-elevated p-5 shadow-card [backface-visibility:hidden]";
  return (
    <div className={cn("relative h-56 [perspective:1200px]", className)}>
      <motion.div
        className="relative size-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <div className={face} aria-hidden={flipped}>
          <ChunkTag kind={kind} className="self-start" />
          <p lang="en" className="mt-auto font-lesson text-[26px] leading-tight text-label">
            {chunk}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <SpeakButton text={chunk} />
            <FlipButton label={t("flip")} onClick={() => setFlipped(true)} disabled={flipped} />
          </div>
        </div>
        <div className={cn(face, "[transform:rotateY(180deg)]")} aria-hidden={!flipped}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-label-3">{t("meaning")}</p>
          <p className="mt-1 text-[17px] font-semibold text-label">{meaning}</p>
          {example && (
            <p lang="en" className="mt-3 font-lesson text-[15px] italic text-label-2">
              {markChunks(example, [chunk])}
            </p>
          )}
          {anti && <Correction wrong={anti.wrong} right={chunk} note={anti.why} className="mt-3" />}
          <div className="mt-auto flex justify-end pt-3">
            <FlipButton label={t("flip")} onClick={() => setFlipped(false)} disabled={!flipped} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FlipButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={disabled ? -1 : 0}
      className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent-soft"
    >
      {label} ↻
    </button>
  );
}
