"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, Crown, Lock, LogOut, Sparkles, UserPlus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Field, Reveal } from "@/components/ui/primitives";
import { LocaleSwitcher, ThemeSwitcher } from "@/components/ui/switchers";
import { spring } from "@/components/ui/motion";
import { updateProfile } from "@/app/actions/user";
import { logout } from "@/app/actions/auth";
import { LEVELS, FREE_LEVELS, type Level } from "@/lib/levels";
import { cn } from "@/lib/cn";
import { Avatar } from "./AppShell";

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <section>
        <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-label-3">{title}</h2>
        <div className="surface rounded-card p-5">{children}</div>
      </section>
    </Reveal>
  );
}

export function SettingsView({ name, email, level, pro }: { name: string; email: string; level: string; pro: boolean }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const tl = useTranslations("levels");
  const [n, setN] = useState(name);
  const [lv, setLv] = useState(level);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = n.trim() !== name || lv !== level;

  const save = () =>
    start(async () => {
      await updateProfile({ name: n, level: lv });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] font-bold">{t("title")}</h1>

      {email.endsWith("@guest.local") && (
        <Reveal>
          <div className="flex flex-col gap-4 rounded-card bg-accent-soft p-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="text-[17px] font-semibold">{t("guestTitle")}</div>
              <p className="mt-1 text-[14px] text-label-2">{t("guestText")}</p>
            </div>
            <ButtonLink href="/register" icon={UserPlus}>
              {t("guestCta")}
            </ButtonLink>
          </div>
        </Reveal>
      )}

      <Section title={t("profile")}>
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={n || name} size={56} />
          <div className="min-w-0">
            <div className="truncate text-[18px] font-semibold">{n || name}</div>
            <div className="truncate text-[14px] text-label-2">{email}</div>
          </div>
        </div>
        <Field label={t("name")} value={n} onChange={(e) => setN(e.target.value)} maxLength={60} />
        <div className="mt-5">
          <div className="mb-1.5 text-[13px] font-medium text-label-2">{t("level")}</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup" aria-label={t("level")}>
            {LEVELS.map((l) => {
              const locked = !pro && !FREE_LEVELS.includes(l as Level);
              const active = lv === l;
              return (
                <motion.button
                  key={l}
                  role="radio"
                  aria-checked={active}
                  aria-disabled={locked}
                  whileTap={locked ? { x: [0, -3, 3, 0] } : { scale: 0.95 }}
                  onClick={() => !locked && setLv(l)}
                  title={locked ? tc("locked") : tl(l)}
                  className={cn(
                    "relative flex h-14 flex-col items-center justify-center rounded-[14px] border-2 text-[16px] font-semibold transition-colors",
                    active ? "border-accent-solid bg-accent-soft text-accent" : "border-transparent bg-fill",
                    locked && "text-label-3",
                  )}
                >
                  {l}
                  {locked && <Lock className="absolute right-1.5 top-1.5 size-3" />}
                </motion.button>
              );
            })}
          </div>
          {!pro && <p className="mt-2 text-[13px] text-label-2">{t("levelProNote")}</p>}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={save} loading={pending} disabled={!dirty && !saved} icon={saved ? Check : undefined}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={saved ? "s" : "n"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {saved ? tc("saved") : tc("save")}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </Section>

      <Section title={t("appearance")} delay={0.05}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[15px] font-medium">{tc("theme")}</span>
            <ThemeSwitcher />
          </div>
          <div className="h-px bg-separator" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[15px] font-medium">{t("language")}</span>
            <LocaleSwitcher persist />
          </div>
        </div>
      </Section>

      <Section title={t("plan")} delay={0.1}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: -10, scale: 1.08 }}
              transition={spring}
              className={cn("grid size-12 place-items-center rounded-[16px]", pro ? "bg-gold-soft text-gold" : "bg-fill text-label-2")}
            >
              {pro ? <Crown className="size-6" /> : <Sparkles className="size-6" />}
            </motion.div>
            <div>
              <div className="text-[13px] text-label-2">{t("currentPlan")}</div>
              <div className="flex items-center gap-2 text-[18px] font-semibold">
                {pro ? tc("pro") : tc("free")}
                {pro && <Badge tone="gold">{tc("proBadge")}</Badge>}
              </div>
            </div>
          </div>
          <ButtonLink href="/app/upgrade" variant={pro ? "secondary" : "primary"} icon={pro ? undefined : Sparkles}>
            {pro ? t("manage") : tc("upgrade")}
          </ButtonLink>
        </div>
      </Section>

      <Section title={t("danger")} delay={0.15}>
        <form action={logout}>
          <Button type="submit" variant="danger" icon={LogOut} iconAnim="nudge">
            {tc("logout")}
          </Button>
        </form>
      </Section>
    </div>
  );
}
