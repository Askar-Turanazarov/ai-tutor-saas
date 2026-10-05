"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { BookOpenCheck, Check, CreditCard, Crown, FlaskConical, Infinity as InfinityIcon, Lock, Map, Mic, RefreshCw, Sparkles, Wallet } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Ornament } from "@/components/ui/brand";
import { Switch } from "@/components/ui/Switch";
import { startCheckout } from "@/app/actions/billing";
import { spring } from "@/components/ui/motion";
import { cn } from "@/lib/cn";

const ICONS = [BookOpenCheck, InfinityIcon, Sparkles, Mic, Map];
const PERIODS = [1, 3, 12] as const;
type Period = (typeof PERIODS)[number];
type Provider = "click" | "stripe";

export type UpgradeProps = {
  prices: Record<Period, number>;
  providers: Record<Provider, boolean>;
  lifetime: boolean;
  activeUntil: string | null;
};

export function UpgradeView({ prices, providers, lifetime, activeUntil }: UpgradeProps) {
  const t = useTranslations("upgrade");
  const tb = useTranslations("billing");
  const tl = useTranslations("landing");
  const f = useFormatter();
  const available = (["click", "stripe"] as const).filter((p) => providers[p]);
  const [months, setMonths] = useState<Period>(3);
  const [provider, setProvider] = useState<Provider | null>(available[0] ?? null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const money = (n: number) => f.number(n, { maximumFractionDigits: 0 });
  const saving = (m: Period) => Math.max(0, Math.round((1 - prices[m] / (prices[1] * m)) * 100));
  const features = [1, 2, 3, 4, 5].map((i) => tl(`proF${i}`));

  const pay = () =>
    start(async () => {
      if (!provider) return;
      setError(null);
      const r = await startCheckout({ months, provider, autoRenew });
      if ("url" in r && r.url) window.location.href = r.url;
      else setError(tb(`err_${"error" in r ? r.error : "checkout_failed"}` as "err_checkout_failed"));
    });

  return (
    <div className="mx-auto max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-sheet bg-gradient-to-br from-accent-solid to-[color-mix(in_srgb,var(--accent-solid)_55%,var(--teal))] p-7 text-white shadow-float sm:p-9"
      >
        <Ornament className="pointer-events-none absolute -right-16 -top-16 size-64 text-white/10" />
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
          className="grid size-16 place-items-center rounded-[20px] bg-white/15 backdrop-blur"
        >
          <Crown className="size-8" />
        </motion.div>
        <h1 className="mt-5 text-[32px] font-bold">{t("title")}</h1>
        <p className="mt-1 text-[16px] text-white/80">{t("subtitle")}</p>
        {!lifetime && (
          <div className="mt-5 flex items-baseline gap-2">
            <motion.span key={months} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[34px] font-bold tracking-tight">
              {tb("sum", { price: money(prices[months]) })}
            </motion.span>
            <span className="text-white/75">/ {tb("months", { n: months })}</span>
          </div>
        )}
      </motion.div>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {features.map((feat, i) => {
          const Icon = ICONS[i] ?? Check;
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.35 }}
              className={cn("surface flex items-center gap-3 rounded-[16px] p-3.5", i === 4 && "sm:col-span-2")}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-accent-soft text-accent">
                <Icon className="size-[18px]" />
              </span>
              <span className="text-[15px] font-medium">{feat}</span>
            </motion.li>
          );
        })}
      </ul>

      {lifetime ? (
        <div className="mt-7 flex items-center justify-center gap-2 rounded-[16px] bg-success-soft p-4 text-center text-[16px] font-semibold text-success">
          <Check className="size-5 shrink-0" /> {tb("lifetime")}
        </div>
      ) : (
        <div className="mt-8 space-y-7">
          {activeUntil && (
            <div className="flex items-start gap-3 rounded-[16px] bg-success-soft p-4 text-[15px]">
              <Check className="mt-0.5 size-5 shrink-0 text-success" />
              <div>
                <div className="font-semibold text-success">{tb("activeUntil", { date: new Date(activeUntil) })}</div>
                <div className="text-label-2">{tb("activeExtend")}</div>
              </div>
            </div>
          )}

          <section>
            <h2 className="mb-3 text-[17px] font-semibold">{tb("periodTitle")}</h2>
            <div role="radiogroup" className="grid grid-cols-3 gap-2.5">
              {PERIODS.map((m) => {
                const active = m === months;
                const off = saving(m);
                return (
                  <motion.button
                    key={m}
                    role="radio"
                    aria-checked={active}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setMonths(m)}
                    className={cn(
                      "relative rounded-[18px] border-2 p-3 text-left transition-colors sm:p-4",
                      active ? "border-accent bg-accent-soft" : "surface border-transparent hover:border-separator",
                    )}
                  >
                    {off > 0 && (
                      <span className="absolute -top-2.5 right-2 rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-white">
                        {tb("save", { n: off })}
                      </span>
                    )}
                    <div className={cn("text-[15px] font-semibold", active && "text-accent")}>{tb("months", { n: m })}</div>
                    <div className="mt-1 text-[16px] font-bold tabular-nums sm:text-[18px]">{money(prices[m])}</div>
                    <div className="text-[11.5px] text-label-2 sm:text-[12px]">{tb("perMonth", { price: money(Math.round(prices[m] / m)) })}</div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[17px] font-semibold">{tb("methodTitle")}</h2>
            {available.length === 0 ? (
              <p className="rounded-[16px] bg-warning-soft p-4 text-[14px]">{tb("noMethods")}</p>
            ) : (
              <div role="radiogroup" className="space-y-2">
                {available.map((p) => {
                  const active = p === provider;
                  const Icon = p === "click" ? Wallet : CreditCard;
                  return (
                    <motion.button
                      key={p}
                      role="radio"
                      aria-checked={active}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => setProvider(p)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[16px] border-2 p-3.5 text-left transition-colors",
                        active ? "border-accent bg-accent-soft" : "surface border-transparent hover:border-separator",
                      )}
                    >
                      <span className={cn("grid size-10 place-items-center rounded-[12px]", p === "click" ? "bg-teal-soft text-teal" : "bg-fill text-label")}>
                        <Icon className="size-5" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-[15px] font-semibold">{tb(p)}</span>
                        <span className="block text-[13px] text-label-2">{tb(`${p}Desc`)}</span>
                      </span>
                      <span className={cn("grid size-6 place-items-center rounded-full border-2", active ? "border-accent bg-accent-solid text-white" : "border-separator")}>
                        {active && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="surface flex items-center gap-3 rounded-[16px] p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent">
              <RefreshCw className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{tb("autoRenew")}</div>
              <div className="text-[13px] leading-snug text-label-2">{tb("autoRenewDesc", { price: money(prices[months]) })}</div>
            </div>
            <Switch checked={autoRenew} onChange={setAutoRenew} label={tb("autoRenew")} />
          </section>

          <div>
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 text-center text-[14px] text-danger">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <Button size="lg" className="w-full" icon={Lock} loading={pending} disabled={!provider} onClick={pay}>
              {tb("pay", { price: money(prices[months]) })}
            </Button>
            <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[12.5px] leading-snug text-label-3">
              <FlaskConical className="mt-px size-3.5 shrink-0" /> {tb("testNote")}
            </p>
          </div>
        </div>
      )}

      {(lifetime || activeUntil) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={spring} className="mt-5 text-center">
          <ButtonLink href="/app/billing" variant="ghost" size="sm">
            {tb("toBilling")}
          </ButtonLink>
        </motion.div>
      )}
    </div>
  );
}
