"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Script from "next/script";
import { motion } from "framer-motion";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Bell, CreditCard, Crown, ExternalLink, Flame, Link2, Receipt, RefreshCw, Sparkles, Star } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/brand";
import { MajolicaField } from "@/components/decor/motifs";
import { formatMoney, tierLabel } from "@/lib/billing/catalog";
import { bodyKey, notifyValues, type NotifyType } from "@/lib/billing/notify-format";
import type { MiniAppData } from "@/lib/messaging/telegram-webapp";
import { cn } from "@/lib/cn";

type WebApp = {
  initData: string;
  colorScheme: "light" | "dark";
  ready: () => void;
  expand: () => void;
  openLink: (url: string) => void;
  onEvent: (e: "themeChanged", cb: () => void) => void;
  offEvent: (e: "themeChanged", cb: () => void) => void;
};
declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

type State = { kind: "loading" } | { kind: "outside" } | { kind: "unlinked" } | { kind: "error" } | { kind: "ok"; data: MiniAppData };

const webApp = () => (typeof window !== "undefined" && window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : null);

function Section({ title, icon: Icon, children, delay = 0 }: { title: string; icon: typeof Bell; children: ReactNode; delay?: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass rounded-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-label-2">
        <Icon className="size-4" />
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

/** Telegram Mini App: account, plan, receipts and recent notifications, signed in by Telegram initData. */
export function TgMiniApp({ dev }: { dev: boolean }) {
  const t = useTranslations("tg");
  const tm = useTranslations("manage");
  const tn = useTranslations("notify");
  const tl = useTranslations("levels");
  const f = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const locale = useLocale();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    const wa = webApp();
    if (!wa && !dev) return setState({ kind: "outside" });
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/telegram/me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(wa ? { initData: wa.initData } : { dev: true }),
      });
      if (!res.ok) return setState({ kind: "error" });
      const r = (await res.json()) as { linked: boolean; data?: MiniAppData };
      if (!r.linked || !r.data) return setState({ kind: "unlinked" });
      // Speak the account's language; Telegram keeps initData in sessionStorage across the reload.
      const want = r.data.profile.locale;
      if (wa && want !== locale && (routing.locales as readonly string[]).includes(want)) return router.replace("/tg", { locale: want });
      setState({ kind: "ok", data: r.data });
    } catch {
      setState({ kind: "error" });
    }
  }, [dev, locale, router]);

  const init = useCallback(() => {
    const wa = webApp();
    if (wa) {
      wa.ready();
      wa.expand();
      const sync = () => setTheme(wa.colorScheme);
      sync();
      wa.onEvent("themeChanged", sync);
    }
    void load();
  }, [load, setTheme]);

  // The script may already be there after a client-side navigation.
  useEffect(() => {
    if (window.Telegram?.WebApp || dev) init();
  }, [init, dev]);

  const open = (path: string) => {
    const url = `${window.location.origin}/${locale}${path}`;
    const wa = webApp();
    if (wa) wa.openLink(url);
    else window.open(url, "_blank", "noopener");
  };

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={() => {
          if (!dev) init();
        }}
      />
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="relative overflow-hidden rounded-card glass px-4 py-5">
          <MajolicaField className="absolute inset-0 h-full w-full opacity-60 [mask-image:linear-gradient(90deg,transparent,black)]" cell={56} />
          <div className="relative flex items-center gap-3">
            <LogoMark size={40} />
            <div className="min-w-0">
              <div className="font-semibold">Ustoz AI</div>
              <div className="text-[13px] text-label-2">{t("subtitle")}</div>
            </div>
            {dev && <span className="ml-auto rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold">dev</span>}
          </div>
        </div>

        {state.kind === "loading" && (
          <div className="space-y-4" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass h-28 animate-pulse rounded-card" />
            ))}
          </div>
        )}

        {state.kind !== "loading" && state.kind !== "ok" && (
          <div className="glass space-y-3 rounded-card p-5 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
              {state.kind === "error" ? <RefreshCw className="size-5" /> : <Link2 className="size-5" />}
            </div>
            <h1 className="text-[17px] font-semibold">{t(`${state.kind}Title`)}</h1>
            <p className="text-[14px] text-label-2">{t(`${state.kind}Text`)}</p>
            {state.kind === "error" ? (
              <Button icon={RefreshCw} onClick={() => void load()}>
                {t("retry")}
              </Button>
            ) : (
              <Button icon={ExternalLink} onClick={() => open(state.kind === "unlinked" ? "/app/settings" : "/app")}>
                {t(state.kind === "unlinked" ? "openSettings" : "openApp")}
              </Button>
            )}
          </div>
        )}

        {state.kind === "ok" && account(state.data)}
      </div>
    </>
  );

  function account(data: MiniAppData) {
    const { profile, sub, invoices, notifications } = data;
    const date = (iso: string) => f.dateTime(new Date(iso), { dateStyle: "medium" });
    const status =
      !sub || !sub.live
        ? "statusFree"
        : sub.status === "trialing"
          ? "statusTrial"
          : sub.status === "past_due"
            ? "statusPastDue"
            : sub.cancelAtPeriodEnd
              ? "statusCanceled"
              : "statusActive";
    const autoRenew = !!sub?.live && !sub.cancelAtPeriodEnd && !!sub.method && sub.status !== "trialing";
    return (
      <>
        <Section title={t("profile")} icon={Star}>
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-solid text-[18px] font-semibold text-white">
              {profile.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold">{profile.name}</div>
              <div className="text-[13px] text-label-2">
                {profile.level} · {tl(profile.level)}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
            <div className="rounded-xl bg-fill/60 px-3 py-2">
              <Sparkles className="mb-1 size-4 text-gold" />
              {t("xp", { n: profile.xp })}
            </div>
            <div className="rounded-xl bg-fill/60 px-3 py-2">
              <Flame className="mb-1 size-4 text-danger" />
              {t("streak", { n: profile.streak })}
            </div>
          </div>
        </Section>

        <Section title={tm("title")} icon={Crown} delay={0.05}>
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[22px] font-bold">{tierLabel(data.tier)}</div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                status === "statusPastDue" ? "bg-danger-soft text-danger" : status === "statusFree" ? "bg-fill text-label-2" : "bg-success-soft text-success",
              )}
            >
              {tm(status)}
            </span>
          </div>
          {sub?.live && (
            <dl className="mt-3 space-y-1.5 text-[14px]">
              <div className="flex justify-between gap-3">
                <dt className="text-label-2">{tm(autoRenew ? "periodEnds" : "accessUntil")}</dt>
                <dd className="font-medium">{date(sub.periodEnd)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-label-2">{t("autoRenew")}</dt>
                <dd className="font-medium">{t(autoRenew ? "on" : "off")}</dd>
              </div>
              {data.next && (
                <div className="flex justify-between gap-3">
                  <dt className="text-label-2">{tm("nextCharge")}</dt>
                  <dd className="font-medium">{formatMoney(data.next.amount, data.next.currency, locale)}</dd>
                </div>
              )}
              {sub.method && (
                <div className="flex justify-between gap-3">
                  <dt className="text-label-2">{t("card")}</dt>
                  <dd className="flex items-center gap-1.5 font-medium">
                    <CreditCard className="size-4 text-label-2" />
                    {sub.method.brand} •• {sub.method.last4}
                  </dd>
                </div>
              )}
            </dl>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="sm" icon={ExternalLink} onClick={() => open("/app")}>
              {t("openApp")}
            </Button>
            <Button size="sm" variant="secondary" icon={Crown} onClick={() => open("/app/plans")}>
              {t("plans")}
            </Button>
          </div>
        </Section>

        <Section title={tm("history")} icon={Receipt} delay={0.1}>
          {invoices.length === 0 ? (
            <p className="text-[14px] text-label-2">{tm("noInvoices")}</p>
          ) : (
            <ul className="divide-y divide-separator">
              {invoices.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">
                      {tierLabel(i.tier)} · {formatMoney(i.amount, i.currency, locale)}
                    </div>
                    <div className="text-[12.5px] text-label-2">
                      {date(i.date)} · {tm(`inv_${i.status}` as "inv_paid")}
                    </div>
                  </div>
                  {i.receiptId && (
                    <Button size="sm" variant="ghost" iconRight={ExternalLink} onClick={() => open(`/app/billing/receipt/${i.receiptId}`)}>
                      {tm("receiptLink")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("notifications")} icon={Bell} delay={0.15}>
          {notifications.length === 0 ? (
            <p className="text-[14px] text-label-2">{t("noNotifications")}</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li key={n.id} className="text-[14px]">
                  <div className="flex items-baseline gap-2">
                    {!n.read && <span className="size-2 shrink-0 rounded-full bg-accent-solid" aria-hidden />}
                    <span className="flex-1 font-medium">{tn(`${n.type}.title` as "payment_ok.title", notifyValues(n.params))}</span>
                    <span className="shrink-0 text-[12px] text-label-3">{f.relativeTime(new Date(n.createdAt), now)}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-label-2">
                    {tn(`${n.type}.${bodyKey(n.type as NotifyType, n.params)}` as "payment_ok.body", notifyValues(n.params))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </>
    );
  }
}
