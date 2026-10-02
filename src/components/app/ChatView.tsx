"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUp,
  AudioLines,
  BookOpen,
  ChevronDown,
  Crown,
  History,
  LayoutGrid,
  Mic,
  MessageCirclePlus,
  Square,
  Trash2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge, Sheet, TypingDots } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/brand";
import { TopicIcon, LEVEL_TINT } from "@/components/ui/TopicIcon";
import { iconAnims, spring } from "@/components/ui/motion";
import { deleteConversation, startConversation } from "@/app/actions/user";
import { createRecognition, recognitionSupported, speak } from "@/lib/speech";
import { cn } from "@/lib/cn";
import type { Correction as Fix, Tip } from "@/lib/ai/schemas";
import { Correction, Phrase, SpeakButton } from "@/components/learn/primitives";
import { useUsage } from "./usage";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  corrections?: Fix[];
  tips?: Tip[];
  fresh?: boolean;
};

type ConvItem = { id: string; title: string; icon: string | null };

export function ChatView(props: {
  pro: boolean;
  conversationId: string | null;
  title: string | null;
  topicIcon: string | null;
  initialMessages: ChatMessage[];
  conversations: ConvItem[];
  suggestions: { slug: string; icon: string; level: string; title: string }[];
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { remaining, setRemaining, showLimit } = useUsage();
  const [messages, setMessages] = useState(props.initialMessages);
  const [conversations, setConversations] = useState(props.conversations);
  const [convId, setConvId] = useState(props.conversationId);
  const [title, setTitle] = useState(props.title);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const limited = remaining !== null && remaining <= 0;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(content: string) {
    const body = content.trim();
    if (!body || sending) return;
    if (limited) return showLimit();
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, role: "user", content: body }]);
    setText("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: convId ?? undefined, text: body, locale }),
      });
      const data = await res.json();
      if (data.limitReached) {
        setMessages((m) => m.filter((x) => x.id !== tempId));
        setText(body);
        setRemaining(0);
        showLimit();
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [
        ...m.map((x) => (x.id === tempId ? { ...x, id: data.user.id, corrections: data.user.corrections } : x)),
        { id: data.assistant.id, role: "assistant", content: data.assistant.content, tips: data.assistant.tips, fresh: true },
      ]);
      setRemaining(data.remaining);
      if (!convId) {
        setConvId(data.conversationId);
        setTitle(data.title);
        setConversations((c) => [{ id: data.conversationId, title: data.title, icon: null }, ...c]);
        window.history.replaceState(null, "", `?c=${data.conversationId}`);
      }
    } catch {
      // Network failure: give the text back so nothing is lost.
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setText(body);
    } finally {
      setSending(false);
    }
  }

  const history = (
    <HistoryList
      items={conversations}
      activeId={convId}
      onDelete={async (id) => {
        await deleteConversation(id);
        setConversations((c) => c.filter((x) => x.id !== id));
      }}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-188px)] gap-5 lg:h-[calc(100dvh-80px)]">
      <aside className="hidden w-60 shrink-0 flex-col xl:flex">
        <NewChatButton />
        <div className="mt-4 px-1 text-[13px] font-semibold uppercase tracking-wide text-label-3">{t("history")}</div>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">{history}</div>
      </aside>

      <section className="surface flex min-w-0 flex-1 flex-col overflow-hidden rounded-card">
        <header className="flex items-center gap-3 border-b border-separator px-4 py-3 sm:px-5">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
            {props.topicIcon ? <TopicIcon name={props.topicIcon} className="size-[18px]" /> : <LogoMark size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{title || t("freeTalk")}</div>
            <div className="text-[12px] text-success">Ustoz · online</div>
          </div>
          <button
            onClick={() => setHistoryOpen(true)}
            aria-label={t("history")}
            className="grid size-9 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill xl:hidden"
          >
            <History className="size-5" />
          </button>
          <Link
            href="/app/topics"
            aria-label={t("chooseTopic")}
            title={t("chooseTopic")}
            className="grid size-9 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill"
          >
            <LayoutGrid className="size-5" />
          </Link>
          <form action={startConversation.bind(null, null)}>
            <button
              type="submit"
              aria-label={t("newChat")}
              title={t("newChat")}
              className="grid size-9 place-items-center rounded-full text-label-2 transition-colors hover:bg-fill"
            >
              <MessageCirclePlus className="size-5" />
            </button>
          </form>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          {messages.length === 0 && !sending ? (
            <EmptyState suggestions={props.suggestions} onPick={(s) => send(s)} />
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-3">
              {messages.map((m) =>
                m.role === "user" ? <UserMessage key={m.id} m={m} pro={props.pro} /> : <TutorMessage key={m.id} m={m} />,
              )}
              <AnimatePresence>
                {sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-fit rounded-[20px] rounded-bl-md bg-fill px-4 py-3.5"
                  >
                    <TypingDots label={t("typing")} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <Composer value={text} onChange={setText} onSend={() => send(text)} disabled={sending} limited={limited} />
      </section>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} label={t("history")}>
        <h2 className="text-[20px] font-bold">{t("history")}</h2>
        <div className="mt-4">
          <NewChatButton />
        </div>
        <div className="mt-4 max-h-[50dvh] overflow-y-auto">{history}</div>
      </Sheet>
    </div>
  );
}

function NewChatButton() {
  const t = useTranslations("chat");
  return (
    <form action={startConversation.bind(null, null)}>
      <motion.button
        type="submit"
        whileHover="hover"
        whileTap={{ scale: 0.97 }}
        className="flex h-11 w-full items-center gap-2.5 rounded-[12px] bg-accent-soft px-3.5 text-[15px] font-semibold text-accent transition-colors hover:bg-fill-2"
      >
        <motion.span variants={iconAnims.pop} className="inline-flex">
          <MessageCirclePlus className="size-5" />
        </motion.span>
        {t("newChat")}
      </motion.button>
    </form>
  );
}

function HistoryList({ items, activeId, onDelete }: { items: ConvItem[]; activeId: string | null; onDelete: (id: string) => void }) {
  const t = useTranslations("chat");
  if (!items.length) return <p className="px-1 py-3 text-[14px] text-label-3">{t("noHistory")}</p>;
  return (
    <ul className="space-y-0.5">
      <AnimatePresence initial={false}>
        {items.map((c) => (
          <motion.li
            key={c.id}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="group relative"
          >
            <Link
              href={`/app/chat?c=${c.id}`}
              className={cn(
                "flex h-10 items-center gap-2.5 rounded-[10px] pl-3 pr-9 text-[14px] transition-colors",
                c.id === activeId ? "bg-fill font-semibold text-label" : "text-label-2 hover:bg-fill hover:text-label",
              )}
            >
              {c.icon ? <TopicIcon name={c.icon} className="size-4 shrink-0" /> : <BookOpen className="size-4 shrink-0 opacity-60" />}
              <span className="truncate">{c.title || "…"}</span>
            </Link>
            <button
              onClick={() => onDelete(c.id)}
              aria-label="Delete"
              className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-label-3 opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function EmptyState({
  suggestions,
  onPick,
}: {
  suggestions: { slug: string; icon: string; level: string; title: string }[];
  onPick: (s: string) => void;
}) {
  const t = useTranslations("chat");
  const starters = ["Hi! How are you today?", "Can you help me practise small talk?", "Let's talk about my weekend."];
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
      >
        <LogoMark size={64} />
      </motion.div>
      <h2 className="mt-5 text-[24px] font-bold">{t("emptyTitle")}</h2>
      <p className="mt-1.5 text-[15px] text-label-2">{t("emptyText")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {starters.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onPick(s)}
            className="rounded-full bg-fill px-4 py-2 text-[14px] font-medium transition-colors hover:bg-fill-2"
          >
            {s}
          </motion.button>
        ))}
      </div>
      {suggestions.length > 0 && (
        <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
          {suggestions.map((s, i) => (
            <form key={s.slug} action={startConversation.bind(null, s.slug)}>
              <motion.button
                type="submit"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                whileHover="hover"
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center gap-3 rounded-[14px] border border-separator p-3 text-left text-[14px] font-medium transition-colors hover:bg-fill"
              >
                <motion.span
                  variants={iconAnims.pop}
                  className={cn("grid size-9 place-items-center rounded-[10px]", LEVEL_TINT[s.level].bg, LEVEL_TINT[s.level].fg)}
                >
                  <TopicIcon name={s.icon} className="size-[18px]" />
                </motion.span>
                {s.title}
              </motion.button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMessage({ m, pro }: { m: ChatMessage; pro: boolean }) {
  const t = useTranslations("chat");
  const corrections = m.corrections ?? [];
  return (
    <div className="flex flex-col items-end gap-1.5">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
        lang="en"
        className="max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-br-md bg-accent-solid px-4 py-2.5 font-lesson text-[16px] leading-snug text-on-accent"
      >
        {m.content}
      </motion.div>
      <AnimatePresence>
        {corrections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring, delay: 0.1 }}
            className="w-full max-w-[85%] space-y-2"
          >
            {corrections.map((c, i) => (
              <CorrectionCard key={i} c={c} />
            ))}
            {!pro && (
              <Link href="/app/plans" className="flex items-center justify-end gap-1 text-[12px] font-medium text-gold hover:underline">
                <Crown className="size-3" /> {t("proFeedback")}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A teacher's pen correction under the learner's message; rule and examples fold out. */
function CorrectionCard({ c }: { c: Fix }) {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const detailed = !!(c.rule || c.examples?.length);
  return (
    <div className="rounded-[16px] border border-separator bg-elevated px-4 py-3 text-[14px] shadow-card">
      {c.category && <Badge className="mb-1.5 px-2 py-0 text-[11px]">{c.category}</Badge>}
      <Correction wrong={c.original} right={c.corrected} note={c.explanation} layout={c.original.length > 28 ? "stacked" : "inline"} />
      {detailed && (
        <>
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-accent"
          >
            {t("rule")}
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring} className="inline-flex">
              <ChevronDown className="size-3.5" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {c.rule && <p className="mt-1.5 text-label">{c.rule}</p>}
                {!!c.examples?.length && (
                  <ul className="mt-2 space-y-1.5">
                    {c.examples.map((e) => (
                      <li key={e}>
                        <Phrase text={e} size="sm" highlight={[c.corrected]} />
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function TutorMessage({ m }: { m: ChatMessage }) {
  const words = m.content.split(/(\s+)/);
  const [shown, setShown] = useState(m.fresh ? 0 : words.length);
  useEffect(() => {
    if (shown >= words.length) return;
    const id = setTimeout(() => setShown((s) => s + 2), 28);
    return () => clearTimeout(id);
  }, [shown, words.length]);
  const done = shown >= words.length;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
        lang="en"
        className="group relative max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-bl-md bg-fill px-4 py-2.5 pr-12 font-lesson text-[17px] leading-snug"
      >
        {words.slice(0, shown).join("")}
        <SpeakButton text={m.content} className="absolute bottom-1.5 right-1.5" />
      </motion.div>
      {done && !!m.tips?.length && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex max-w-[85%] flex-wrap gap-1.5">
          {m.tips.map((tip) => (
            <button
              key={tip.word}
              onClick={() => speak(tip.word, 0.75)}
              title={tip.tip}
              className="flex items-center gap-1.5 rounded-full bg-teal-soft px-3 py-1 text-[13px] text-teal transition-colors hover:bg-fill-2"
            >
              <AudioLines className="size-3.5" />
              <span className="font-semibold">{tip.word}</span>
              <span className="opacity-80">{tip.ipa}</span>
            </button>
          ))}
          <p className="w-full text-[12px] text-label-2">{m.tips[0]?.tip}</p>
        </motion.div>
      )}
    </div>
  );
}

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  limited,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  limited: boolean;
  placeholder?: string;
}) {
  const t = useTranslations("chat");
  const ref = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const recRef = useRef<ReturnType<typeof createRecognition>>(null);

  useEffect(() => setMicOk(recognitionSupported()), []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const toggleMic = () => {
    if (listening) return recRef.current?.stop();
    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    const base = value ? value.trimEnd() + " " : "";
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      onChange(base + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  };

  return (
    <div className="border-t border-separator p-3 sm:p-4">
      <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-[22px] bg-fill p-1.5 pl-4 transition-shadow focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        <textarea
          ref={ref}
          value={value}
          rows={1}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder ?? t("placeholder")}
          aria-label={placeholder ?? t("placeholder")}
          disabled={limited}
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[16px] leading-snug outline-none placeholder:text-label-3 disabled:opacity-50"
        />
        {micOk && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleMic}
            aria-label={listening ? t("micStop") : t("mic")}
            title={listening ? t("micStop") : t("mic")}
            disabled={limited}
            className={cn(
              "relative grid size-10 shrink-0 place-items-center rounded-full transition-colors",
              listening ? "bg-danger-solid text-on-solid" : "text-label-2 hover:bg-fill-2",
            )}
          >
            {listening && (
              <span className="absolute inset-0 rounded-full bg-danger-solid" style={{ animation: "pulse-ring 1.2s ease-out infinite" }} />
            )}
            {listening ? <Square className="relative size-4" fill="currentColor" /> : <Mic className="size-5" />}
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.88 }}
          animate={{ scale: value.trim() ? 1 : 0.92, opacity: value.trim() ? 1 : 0.5 }}
          transition={spring}
          onClick={onSend}
          disabled={!value.trim() || disabled || limited}
          aria-label={t("send")}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-solid text-white"
        >
          <ArrowUp className="size-5" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
