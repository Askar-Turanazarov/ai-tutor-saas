"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { BellRing, Link2Off, MessageCircle, Send } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { connectTelegram, disconnectTelegram, setTelegramNotify } from "@/app/actions/telegram";
import { cn } from "@/lib/cn";

export type TelegramState = { username: string | null; since: string; notify: boolean } | null;

/** Connect / connected @username / notifications switch. */
export function TelegramSettings({ telegram, emulator }: { telegram: TelegramState; emulator: boolean }) {
  const t = useTranslations("settings");
  const format = useFormatter();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(false);
  const [notify, setNotify] = useState(telegram?.notify ?? true);

  // After the bot link opens in Telegram, pick up the new state when the user comes back.
  useEffect(() => {
    if (!waiting || telegram) return;
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 4000);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, [waiting, telegram, router]);

  const connect = () =>
    start(async () => {
      const r = await connectTelegram();
      if ("error" in r) return setError(true);
      if (!r.external) return router.push(r.url);
      window.open(r.url, "_blank", "noopener");
      setWaiting(true);
    });

  const toggle = () => {
    setNotify(!notify);
    start(() => setTelegramNotify(!notify));
  };

  if (!telegram)
    return (
      <div className="space-y-3">
        <p className="text-[14px] text-label-2">{t("telegramHint")}</p>
        <Button onClick={connect} loading={pending} icon={Send}>
          {t("tgConnect")}
        </Button>
        {emulator && <p className="text-[13px] text-label-3">{t("tgEmulator")}</p>}
        {waiting && <p className="text-[13px] text-label-2">{t("tgWaiting")}</p>}
        {error && <p className="text-[13px] text-danger">{t("tgConfigError")}</p>}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Send className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold">{t("tgConnected", { username: telegram.username ? `@${telegram.username}` : "" })}</div>
            <div className="text-[13px] text-label-2">{t("tgSince", { date: format.dateTime(new Date(telegram.since), { dateStyle: "medium" }) })}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {emulator && (
            <ButtonLink href="/app/settings/telegram" variant="secondary" size="sm" icon={MessageCircle}>
              {t("tgOpenChat")}
            </ButtonLink>
          )}
          <Button variant="ghost" size="sm" icon={Link2Off} loading={pending} onClick={() => start(() => disconnectTelegram())}>
            {t("tgDisconnect")}
          </Button>
        </div>
      </div>
      <div className="h-px bg-separator" />
      <button type="button" role="switch" aria-checked={notify} onClick={toggle} className="flex w-full items-center gap-3 text-left">
        <BellRing className="size-5 text-label-2" />
        <span className="flex-1 text-[15px] font-medium">{t("tgNotify")}</span>
        <span className={cn("relative h-7 w-12 rounded-full transition-colors", notify ? "bg-accent-solid" : "bg-fill-2")}>
          <motion.span layout className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow", notify ? "right-0.5" : "left-0.5")} />
        </span>
      </button>
    </div>
  );
}
