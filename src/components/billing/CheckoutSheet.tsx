"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, Globe, Lock, Smartphone, Zap, type LucideIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/primitives";
import { payWithSavedCard, startCheckout } from "@/app/actions/billing";
import { formatMoney, tierLabel, type PaidTier, type Period } from "@/lib/billing/catalog";
import type { PlansData } from "@/lib/billing/overview";
import { cn } from "@/lib/cn";

type Method = { key: string; provider: string; icon: LucideIcon; title: string; hint: string; cardId?: string };

/** Checkouts that can tokenize the card for auto-renewal. */
const SAVES_CARD = new Set(["card", "stripe"]);

const BRAND: Record<string, string> = { uzcard: "Uzcard", humo: "HUMO", visa: "Visa", mastercard: "Mastercard" };

/** Payment method choice and the amount due right now (incl. upgrade proration). */
export function CheckoutSheet({ data, tier, period, onClose }: { data: PlansData; tier: PaidTier | null; period: Period; onClose: () => void }) {
  const t = useTranslations("plans");
  const tb = useTranslations("billing");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState(true);

  const enabled = new Set(data.providers);
  const methods: Method[] = [
    ...data.cards
      .filter((c) => enabled.has(c.provider))
      .map((c) => ({
        key: `saved:${c.id}`,
        provider: c.provider,
        icon: Zap,
        title: `${BRAND[c.brand] ?? c.brand} •• ${c.last4}`,
        hint: t("savedHint"),
        cardId: c.id,
      })),
    { key: "card", provider: "card", icon: CreditCard, title: "Uzcard / HUMO", hint: t("cardHint") },
    { key: "click", provider: "click", icon: Smartphone, title: "Click", hint: t("clickHint") },
    { key: "stripe", provider: "stripe", icon: Globe, title: "Visa / Mastercard", hint: t("stripeHint") },
  ].filter((m) => enabled.has(m.provider)) as Method[];

  const [choice, setChoice] = useState(methods[0]?.key);
  useEffect(() => {
    if (tier) {
      setChoice(methods[0]?.key);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  if (!tier) return <Sheet open={false} onClose={onClose} label="">{null}</Sheet>;
  const method = methods.find((m) => m.key === choice) ?? methods[0];
  const q = data.quotes[tier][period];
  const money = (n: number) => formatMoney(n, "UZS", locale);
  const dateFmt = new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn" : locale, { day: "numeric", month: "long", year: "numeric" });

  const pay = () =>
    start(async () => {
      setError(null);
      if (method.cardId) {
        const res = await payWithSavedCard({ tier, period, methodId: method.cardId });
        if ("invoiceId" in res) return router.push(`/app/billing/${res.invoiceId}`);
        return setError(t("checkoutError"));
      }
      const res = await startCheckout({ tier, period, provider: method.provider, saveCard: SAVES_CARD.has(method.key) && save });
      if ("redirectUrl" in res && res.redirectUrl) {
        // Stripe Checkout lives on another origin; our own gateway pages keep the locale prefix.
        window.location.assign(res.redirectUrl);
        return;
      }
      setError(res.error === "guest" ? t("guestError") : t("checkoutError"));
    });

  return (
    <Sheet open onClose={onClose} label={t("checkoutTitle")}>
      <h2 className="pr-8 text-[22px] font-bold">
        {tierLabel(tier)} · {tb("months", { n: q.period })}
      </h2>

      <div className="mt-4 rounded-[16px] bg-fill p-4 text-[14px]">
        {q.kind === "upgrade" ? (
          <>
            <div className="flex justify-between gap-3 text-label-2">
              <span>{t("listPrice", { months: tb("months", { n: q.period }) })}</span>
              <span className="tabular-nums line-through">{money(q.list)}</span>
            </div>
            <p className="mt-1.5 text-[13px] leading-snug text-label-2">{t("upgradeNote", { date: dateFmt.format(new Date(q.until!)) })}</p>
          </>
        ) : q.kind === "renewal" ? (
          <p className="text-[13px] leading-snug text-label-2">{t("renewalNote", { date: dateFmt.format(new Date(data.sub!.periodEnd)) })}</p>
        ) : (
          <p className="text-[13px] leading-snug text-label-2">{t("newNote", { months: tb("months", { n: q.period }) })}</p>
        )}
        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-separator pt-3">
          <span className="font-semibold">{t("dueNow")}</span>
          <motion.span key={q.amount} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="whitespace-nowrap text-[22px] font-bold tabular-nums">
            {money(q.amount)}
          </motion.span>
        </div>
      </div>

      <div role="radiogroup" aria-label={t("method")} className="mt-4 space-y-2">
        {methods.map((m) => {
          const active = m.key === method.key;
          return (
            <button
              key={m.key}
              role="radio"
              aria-checked={active}
              onClick={() => setChoice(m.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition-colors",
                active ? "border-accent bg-accent-soft/50" : "border-separator hover:bg-fill",
              )}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", active ? "bg-accent-solid text-white" : "bg-fill text-label-2")}>
                <m.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{m.title}</span>
                <span className="block text-[12.5px] text-label-2">{m.hint}</span>
              </span>
              <span className={cn("grid size-5 place-items-center rounded-full border-2", active ? "border-accent" : "border-label-3/50")}>
                {active && <motion.span layoutId="pay-dot" className="size-2.5 rounded-full bg-accent-solid" />}
              </span>
            </button>
          );
        })}
      </div>

      {SAVES_CARD.has(method.key) && (
        <label className="mt-3 flex cursor-pointer items-start gap-3 px-1">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--accent-solid)]" />
          <span className="text-[13.5px] leading-snug">
            <span className="font-medium">{t("autoRenew")}</span>
            <span className="block text-label-2">{t("autoRenewHint")}</span>
          </span>
        </label>
      )}
      {method.provider === "click" && <p className="mt-3 px-1 text-[13px] leading-snug text-label-2">{t("clickRenewNote")}</p>}

      <Button size="lg" className="mt-5 w-full" icon={Lock} loading={pending} onClick={pay}>
        {t("payAmount", { amount: money(q.amount) })}
      </Button>
      {error && <p className="mt-3 text-center text-[13px] text-danger">{error}</p>}
      <p className="mt-3 text-center text-[12px] text-label-3">{t("testMode")}</p>
    </Sheet>
  );
}
