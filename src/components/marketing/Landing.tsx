"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
  Gamepad2,
  Languages,
  MessagesSquare,
  Sparkles,
  SpellCheck,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Reveal } from "@/components/ui/primitives";
import { Logo, LogoMark, Ornament } from "@/components/ui/brand";
import { LocaleSwitcher, ThemeSwitcher } from "@/components/ui/switchers";
import { iconAnims, spring } from "@/components/ui/motion";
import { cn } from "@/lib/cn";

export function Landing({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="overflow-x-clip">
      <Header loggedIn={loggedIn} />
      <Hero />
      <Features />
      <How />
      <Pricing />
      <Faq />
      <Footer />
    </div>
  );
}

function Header({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations();
  const { scrollY } = useScroll();
  const border = useTransform(scrollY, [0, 40], ["rgba(0,0,0,0)", "var(--separator)"]);
  return (
    <motion.header style={{ borderBottomColor: border }} className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Ustoz AI">
          <Logo />
        </Link>
        <nav className="ml-6 hidden items-center gap-1 text-[14px] text-label-2 md:flex">
          {[
            ["#features", t("landing.featuresTitle")],
            ["#pricing", t("landing.pricingTitle")],
            ["#faq", t("landing.faqTitle")],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-3 py-1.5 transition-colors hover:bg-fill hover:text-label">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher size="sm" />
          <div className="hidden lg:block">
            <ThemeSwitcher size="sm" showLabels={false} />
          </div>
          {!loggedIn && (
            <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              {t("common.login")}
            </ButtonLink>
          )}
          <ButtonLink href="/app" size="sm">
            {loggedIn ? t("common.continue") : t("common.start")}
          </ButtonLink>
        </div>
      </div>
    </motion.header>
  );
}

function Hero() {
  const t = useTranslations("landing");
  return (
    <section className="relative">
      <Ornament className="absolute inset-x-0 -top-16 h-[620px] w-full text-accent opacity-[0.07] dark:opacity-[0.09]" />
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent-soft blur-[100px]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
        <div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge tone="teal" className="px-3 py-1 text-[13px]">
              <LogoMark size={14} /> {t("badge")}
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-[clamp(2.4rem,6vw,4.1rem)] font-bold leading-[1.04] tracking-[-0.035em]"
          >
            {t("title")}{" "}
            <span className="bg-gradient-to-r from-accent to-teal bg-clip-text text-transparent">{t("titleAccent")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-xl text-[clamp(1.05rem,2vw,1.25rem)] leading-relaxed text-label-2"
          >
            {t("subtitle")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <ButtonLink href="/app" size="lg" iconRight={ArrowRight}>
              {t("cta")}
            </ButtonLink>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            >
              {t("ctaSecondary")}
            </Button>
          </motion.div>
        </div>
        <HeroDemo />
      </div>
    </section>
  );
}

/** Looping mini-conversation that shows the core loop: write → tutor replies → mistake gets fixed. */
function HeroDemo() {
  const t = useTranslations("landing");
  const [step, setStep] = useState(0);
  useEffect(() => {
    const durations = [900, 1300, 1100, 4200];
    const id = setTimeout(() => setStep((s) => (s + 1) % 4), durations[step]);
    return () => clearTimeout(id);
  }, [step]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ ...spring, delay: 0.25 }}
      className="relative mx-auto w-full max-w-[420px]"
    >
      <div
        className="absolute -right-6 -top-6 size-20 rounded-3xl bg-teal-soft"
        style={{ animation: "float-slow 7s ease-in-out infinite" }}
      />
      <div
        className="absolute -bottom-8 -left-8 size-28 rounded-full bg-accent-soft"
        style={{ animation: "float-slow 9s ease-in-out infinite reverse" }}
      />
      <Card className="relative overflow-hidden p-0 shadow-float">
        <div className="flex items-center gap-3 border-b border-separator px-5 py-4">
          <LogoMark size={36} />
          <div>
            <div className="text-[15px] font-semibold">Ustoz</div>
            <div className="flex items-center gap-1.5 text-[12px] text-success">
              <span className="size-1.5 rounded-full bg-success" /> online · Tashkent
            </div>
          </div>
        </div>
        <div className="flex min-h-[300px] flex-col gap-3 p-5">
          <Bubble side="left">{"Hi! Tell me about your family 🙂"}</Bubble>
          <AnimatePresence>
            {step >= 1 && (
              <Bubble side="right" key="u">
                {t("demoUser")}
              </Bubble>
            )}
            {step >= 1 && (
              <motion.div
                key="fix"
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ ...spring, delay: 0.45 }}
                className="ml-auto max-w-[85%] rounded-2xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-[13px]"
              >
                <div className="flex items-center gap-1.5 font-semibold text-success">
                  <SpellCheck className="size-3.5" /> {t("demoFix")}
                </div>
                <div className="mt-0.5 text-label-2">{t("demoFixNote")}</div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1 px-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-2 rounded-full bg-label-3"
                    style={{ animation: `typing-dot 1.2s ${i * 0.15}s infinite` }}
                  />
                ))}
              </motion.div>
            )}
            {step >= 3 && (
              <Bubble side="left" key="b">
                {t("demoTutor")}
              </Bubble>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={spring}
      className={cn(
        "max-w-[85%] rounded-[20px] px-4 py-2.5 text-[15px] leading-snug",
        side === "left" ? "rounded-bl-md bg-fill" : "ml-auto rounded-br-md bg-accent-solid text-white",
      )}
    >
      {children}
    </motion.div>
  );
}

const FEATURES: { icon: LucideIcon; tone: string; anim: keyof typeof iconAnims; k: string }[] = [
  { icon: MessagesSquare, tone: "bg-accent-soft text-accent", anim: "wiggle", k: "f1" },
  { icon: SpellCheck, tone: "bg-success-soft text-success", anim: "pop", k: "f2" },
  { icon: AudioLines, tone: "bg-teal-soft text-teal", anim: "bounce", k: "f3" },
  { icon: Gamepad2, tone: "bg-gold-soft text-gold", anim: "tilt", k: "f4" },
  { icon: Target, tone: "bg-danger-soft text-danger", anim: "spin", k: "f5" },
  { icon: Languages, tone: "bg-accent-soft text-accent", anim: "wiggle", k: "f6" },
];

function Features() {
  const t = useTranslations("landing");
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <Reveal>
        <h2 className="text-center text-[clamp(1.9rem,4vw,2.75rem)] font-bold">{t("featuresTitle")}</h2>
      </Reveal>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.k} delay={i * 0.05}>
            <Card interactive className="h-full p-6">
              <motion.div variants={iconAnims[f.anim]} className={cn("grid size-12 place-items-center rounded-2xl", f.tone)}>
                <f.icon className="size-6" strokeWidth={2} />
              </motion.div>
              <h3 className="mt-5 text-[19px] font-semibold">{t(`${f.k}Title`)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-label-2">{t(`${f.k}Text`)}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function How() {
  const t = useTranslations("landing");
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Reveal>
        <h2 className="text-center text-[clamp(1.9rem,4vw,2.75rem)] font-bold">{t("howTitle")}</h2>
      </Reveal>
      <div className="relative mt-12 grid gap-6 md:grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-separator to-transparent md:block" />
        {(["how1", "how2", "how3"] as const).map((k, i) => (
          <Reveal key={k} delay={i * 0.1} className="relative text-center">
            <motion.div
              whileHover={{ scale: 1.08, rotate: -4 }}
              transition={spring}
              className="mx-auto grid size-14 place-items-center rounded-full bg-elevated text-[20px] font-bold text-accent shadow-card"
            >
              {i + 1}
            </motion.div>
            <p className="mx-auto mt-4 max-w-[240px] text-[17px] font-medium">{t(k)}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const plans = [
    { name: t("freeName"), price: t("freePrice"), desc: t("freeDesc"), features: ["freeF1", "freeF2", "freeF3", "freeF4"], pro: false },
    { name: t("proName"), price: t("proPrice"), desc: t("proDesc"), features: ["proF1", "proF2", "proF3", "proF4", "proF5"], pro: true },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-20 sm:px-6">
      <Reveal className="text-center">
        <h2 className="text-[clamp(1.9rem,4vw,2.75rem)] font-bold">{t("pricingTitle")}</h2>
        <p className="mt-3 text-[17px] text-label-2">{t("pricingSubtitle")}</p>
      </Reveal>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {plans.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.08}>
            <Card
              interactive
              className={cn("relative h-full p-7", p.pro && "ring-2 ring-accent-solid/70")}
            >
              {p.pro && (
                <Badge tone="accent" className="absolute right-6 top-7">
                  <Sparkles className="size-3" /> {t("popular")}
                </Badge>
              )}
              <h3 className="text-[22px] font-bold">{p.name}</h3>
              <p className="mt-1 text-[15px] text-label-2">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-[34px] font-bold tracking-[-0.03em]">{p.price}</span>
                {p.pro && <span className="text-label-2">{t("perMonth")}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px]">
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                        p.pro ? "bg-accent-solid text-white" : "bg-fill-2 text-label",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {t(f)}
                  </li>
                ))}
              </ul>
              <ButtonLink
                href={p.pro ? "/app/upgrade" : "/app"}
                variant={p.pro ? "primary" : "secondary"}
                className="mt-8 w-full"
              >
                {p.pro ? tc("upgrade") : tc("startFree")}
              </ButtonLink>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const t = useTranslations("landing");
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6">
      <Reveal>
        <h2 className="text-center text-[clamp(1.9rem,4vw,2.75rem)] font-bold">{t("faqTitle")}</h2>
      </Reveal>
      <div className="surface mt-10 divide-y divide-separator overflow-hidden rounded-card">
        {[1, 2, 3, 4].map((n, i) => (
          <div key={n}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center gap-4 px-6 py-5 text-left text-[17px] font-medium transition-colors hover:bg-fill/50"
            >
              <span className="flex-1">{t(`q${n}`)}</span>
              <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={spring} className="text-label-3">
                <ChevronDown className="size-5" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-[15px] leading-relaxed text-label-2">{t(`a${n}`)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const t = useTranslations("landing");
  return (
    <footer className="border-t border-separator">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 sm:flex-row sm:px-6">
        <Logo />
        <p className="text-[13px] text-label-2 sm:ml-4">{t("footer")}</p>
        <div className="sm:ml-auto">
          <ThemeSwitcher size="sm" />
        </div>
      </div>
    </footer>
  );
}
