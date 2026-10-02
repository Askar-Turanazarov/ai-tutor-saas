"use client";

/** Thin wrappers around the Web Speech API (TTS everywhere, recognition in Chromium browsers). */

export function speak(text: string, rate = 0.95, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang === "en-US" && /natural|google|samantha|aria|jenny/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  if (onEnd) u.onend = u.onerror = () => onEnd();
  window.speechSynthesis.speak(u);
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function createRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "en-US";
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  return r;
}

export function recognitionSupported() {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}
