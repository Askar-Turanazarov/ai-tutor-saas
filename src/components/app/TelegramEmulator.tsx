"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft, Bot, ExternalLink, Phone, Play } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/primitives";
import { PageHeader } from "@/components/decor/PageHeader";
import { emulatorCallback, emulatorSend, emulatorShareContact } from "@/app/actions/telegram";
import { maskPhoneInput } from "@/lib/account/phone";
import type { TgButton, TgMarkup } from "@/lib/messaging/telegram";

type Msg = { id: string; text: string; markup: string | null; at: string };

/** Telegram HTML (only <b>, <i>, <a>) to React; everything else is shown as text. */
function TgText({ text }: { text: string }) {
  const parts = text.split(/(<b>[\s\S]*?<\/b>)/g);
  const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  return (
    <p className="whitespace-pre-wrap break-words text-[14.5px] leading-snug">
      {parts.map((p, i) => (p.startsWith("<b>") ? <b key={i}>{unesc(p.slice(3, -4))}</b> : unesc(p)))}
    </p>
  );
}

export function TelegramEmulator({ start, phone, messages }: { start: string | null; phone: string; messages: Msg[] }) {
  const t = useTranslations("tgEmu");
  const format = useFormatter();
  const router = useRouter();
  const [pending, run] = useTransition();
  const [ph, setPh] = useState(phone);
  const [started, setStarted] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const parsed = messages.map((m) => ({ ...m, markup: m.markup ? (JSON.parse(m.markup) as TgMarkup) : null }));
  // The reply keyboard stays until a later message removes it, as in Telegram.
  const keyboard = [...parsed].reverse().find((m) => m.markup && ("keyboard" in m.markup || "remove_keyboard" in m.markup))?.markup;
  const askContact = !!keyboard && "keyboard" in keyboard;

  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect must not return one.
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const act = (fn: () => Promise<void>) =>
    run(async () => {
      await fn();
      router.refresh();
    });
  const press = (b: TgButton) => (b.url ? window.open(b.url, "_blank", "noopener") : b.callback_data && act(() => emulatorCallback(b.callback_data!)));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/app/settings" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:underline">
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={<Bot />} />

      <div className="surface overflow-hidden rounded-card">
        <div className="flex items-center gap-3 border-b border-separator px-4 py-3">
          <div className="grid size-9 place-items-center rounded-full bg-accent-solid text-white">
            <Bot className="size-5" />
          </div>
          <div className="font-semibold">{t("bot")}</div>
        </div>

        <div className="max-h-[55vh] min-h-56 space-y-3 overflow-y-auto bg-fill/40 p-4">
          {parsed.length === 0 && <p className="py-10 text-center text-[14px] text-label-2">{t("empty")}</p>}
          {parsed.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[85%]">
              <div className="rounded-[18px] rounded-bl-[6px] bg-bg px-4 py-2.5 shadow-sm">
                <TgText text={m.text} />
                <div className="mt-1 text-right text-[11px] text-label-3">{format.dateTime(new Date(m.at), { timeStyle: "short" })}</div>
              </div>
              {m.markup && "inline_keyboard" in m.markup && (
                <div className="mt-1.5 grid gap-1.5">
                  {m.markup.inline_keyboard.flat().map((b) => (
                    <Button key={b.text} size="sm" variant="tinted" disabled={pending} onClick={() => press(b)} iconRight={b.url ? ExternalLink : undefined}>
                      {b.text}
                    </Button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
          <div ref={end} />
        </div>

        <div className="space-y-3 border-t border-separator p-4">
          {askContact ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field label={t("phoneLabel")} type="tel" inputMode="tel" value={ph} onChange={(e) => setPh(maskPhoneInput(e.target.value))} />
              </div>
              <Button icon={Phone} loading={pending} onClick={() => act(() => emulatorShareContact(ph))}>
                {t("share")}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              icon={Play}
              loading={pending}
              disabled={started}
              onClick={() => {
                setStarted(true);
                act(() => emulatorSend(start ? `/start ${start}` : "/start"));
              }}
            >
              {t("start")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
