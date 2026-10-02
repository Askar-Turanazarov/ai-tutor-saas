"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Hourglass, Sparkles } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";

type UsageCtx = {
  /** Seconds left today; null = unlimited (Pro). */
  remaining: number | null;
  setRemaining: (n: number | null) => void;
  showLimit: () => void;
};

const Ctx = createContext<UsageCtx>({ remaining: null, setRemaining: () => {}, showLimit: () => {} });
export const useUsage = () => useContext(Ctx);

const BEAT_MS = 20_000;
const IDLE_MS = 90_000;

/** Counts active practice time on learning screens and reports it to the server (Free daily limit). */
export function UsageProvider({
  initial,
  limitMinutes,
  children,
}: {
  initial: number | null;
  limitMinutes: number;
  children: ReactNode;
}) {
  const [remaining, setRemaining] = useState(initial);
  const [limitOpen, setLimitOpen] = useState(false);
  const pathname = usePathname();
  const lastInput = useRef(Date.now());
  const lastBeat = useRef(Date.now());
  const tracking = initial !== null && /\/app\/(chat|quiz|pronunciation)/.test(pathname);

  useEffect(() => {
    if (!tracking) return;
    const mark = () => (lastInput.current = Date.now());
    window.addEventListener("keydown", mark);
    window.addEventListener("pointerdown", mark);
    lastBeat.current = Date.now();
    const id = setInterval(async () => {
      const now = Date.now();
      const seconds = Math.round((now - lastBeat.current) / 1000);
      lastBeat.current = now;
      if (document.visibilityState !== "visible" || now - lastInput.current > IDLE_MS) return;
      const res = await fetch("/api/usage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seconds }),
      }).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { remaining: number | null };
      setRemaining(data.remaining);
      if (data.remaining === 0) setLimitOpen(true);
    }, BEAT_MS);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("pointerdown", mark);
    };
  }, [tracking]);

  const showLimit = useCallback(() => setLimitOpen(true), []);

  return (
    <Ctx.Provider value={{ remaining, setRemaining, showLimit }}>
      {children}
      <LimitSheet open={limitOpen} onClose={() => setLimitOpen(false)} minutes={limitMinutes} />
    </Ctx.Provider>
  );
}

function LimitSheet({ open, onClose, minutes }: { open: boolean; onClose: () => void; minutes: number }) {
  const t = useTranslations("chat");
  return (
    <Sheet open={open} onClose={onClose} label={t("limitTitle")}>
      <motion.div
        initial={{ rotate: -20, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 12 }}
        className="grid size-16 place-items-center rounded-[20px] bg-gold-soft text-gold"
      >
        <Hourglass className="size-8" />
      </motion.div>
      <h2 className="mt-5 text-[24px] font-bold">{t("limitTitle")}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-label-2">{t("limitText", { n: minutes })}</p>
      <ButtonLink href="/app/upgrade" size="lg" icon={Sparkles} className="mt-6 w-full" onClick={onClose}>
        {t("limitCta")}
      </ButtonLink>
    </Sheet>
  );
}
