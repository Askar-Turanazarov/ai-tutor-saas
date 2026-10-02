"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Hourglass, Sparkles } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";

type QuotaKey = "lessonsPerDay" | "pronunciationPerDay" | "reviewsPerDay" | "missionsPerDay";

type UsageCtx = {
  /** Seconds left today; null = unlimited. */
  remaining: number | null;
  setRemaining: (n: number | null) => void;
  showLimit: () => void;
  /** A daily quota (lessons, pronunciation…) is used up. */
  showQuota: (key: QuotaKey, limit: number) => void;
};

const Ctx = createContext<UsageCtx>({ remaining: null, setRemaining: () => {}, showLimit: () => {}, showQuota: () => {} });
export const useUsage = () => useContext(Ctx);

const BEAT_MS = 20_000;
const IDLE_MS = 90_000;

/** Time until the next midnight in Tashkent (UTC+5, no DST), when daily limits reset. */
function untilReset() {
  const now = Date.now();
  const tashkent = new Date(now + 5 * 3600_000);
  const next = Date.UTC(tashkent.getUTCFullYear(), tashkent.getUTCMonth(), tashkent.getUTCDate() + 1) - 5 * 3600_000;
  const mins = Math.max(1, Math.round((next - now) / 60_000));
  return { h: Math.floor(mins / 60), m: mins % 60 };
}

type Limit = { kind: "minutes"; n: number } | { kind: QuotaKey; n: number };

/** Counts active practice time on learning screens and reports it to the server (daily time limit). */
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
  const [shown, setShown] = useState<Limit | null>(null);
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
      if (data.remaining === 0) setShown({ kind: "minutes", n: limitMinutes });
    }, BEAT_MS);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("pointerdown", mark);
    };
  }, [tracking, limitMinutes]);

  const showLimit = useCallback(() => setShown({ kind: "minutes", n: limitMinutes }), [limitMinutes]);
  const showQuota = useCallback((kind: QuotaKey, n: number) => setShown({ kind, n }), []);

  return (
    <Ctx.Provider value={{ remaining, setRemaining, showLimit, showQuota }}>
      {children}
      <LimitSheet limit={shown} onClose={() => setShown(null)} />
    </Ctx.Provider>
  );
}

function LimitSheet({ limit, onClose }: { limit: Limit | null; onClose: () => void }) {
  const t = useTranslations("quota");
  const reset = untilReset();
  return (
    <Sheet open={!!limit} onClose={onClose} label={t("title")}>
      <motion.div
        initial={{ rotate: -20, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 12 }}
        className="grid size-16 place-items-center rounded-[20px] bg-gold-soft text-gold"
      >
        <Hourglass className="size-8" />
      </motion.div>
      <h2 className="mt-5 text-[24px] font-bold">{t("title")}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-label-2">{limit && t(limit.kind, { n: limit.n })}</p>
      <p className="mt-3 rounded-[12px] bg-fill px-3.5 py-2.5 text-[14px] text-label-2">{t("reset", { h: reset.h, m: reset.m })}</p>
      <ButtonLink href="/app/plans" size="lg" icon={Sparkles} className="mt-6 w-full" onClick={onClose}>
        {t("cta")}
      </ButtonLink>
    </Sheet>
  );
}
