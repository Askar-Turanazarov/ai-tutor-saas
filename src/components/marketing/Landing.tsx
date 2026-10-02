"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, ChevronDown, Crown, Flag, Layers, MessagesSquare, Sparkles, Target } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Reveal } from "@/components/ui/primitives";
import { Logo, LogoMark } from "@/components/ui/brand";
import { spring } from "@/components/ui/motion";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { PrefsMenu } from "@/components/shell/menus";
import { ChunkTag, Correction, Phrase, WordCard, type ChunkKind } from "@/components/learn/primitives";
import { GirihField, IslimiBorder, MajolicaTile, TileBand } from "@/components/decor/motifs";
import { formatMoney, type LimitKey, type Tier } from "@/lib/billing/catalog";
import { cn } from "@/lib/cn";

export type LandingPricing = Record<Tier, { price: number; limits: Record<LimitKey, number | null> }>;

export function Landing({ loggedIn, pricing }: { loggedIn: boolean; pricing: LandingPricing }) {
  return (
    <div className="overflow-x-clip">
      <Header loggedIn={loggedIn} />
      <Hero />
      <LessonSection />
      <ReviewSection />
      <Points />
      <Pricing pricing={pricing} />
      <Faq />
      <Footer />
    </div>
  );
}

function Header({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations();
  return (
    <SiteHeader
      links={[
        { href: "#lesson", label: t("landing.lessonKicker") },
        { href: "#pricing", label: t("landing.pricingTitle") },
        { href: "#faq", label: t("landing.faqTitle") },
      ]}
      right={
        <>
          <PrefsMenu />
          {!loggedIn && (
            <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              {t("common.login")}
            </ButtonLink>
          )}
          <ButtonLink href="/app" size="sm">
            {loggedIn ? t("common.continue") : t("common.start")}
          </ButtonLink>
        </>
      }
    />
  );
}

/* ───────────── Hero: the core loop on a real sentence ───────────── */

function Hero() {
  const t = useTranslations("landing");
  return (
    <section className="relative">
      <GirihField className="absolute inset-x-0 -top-20 h-[640px] w-full text-accent opacity-[0.07] dark:opacity-[0.09]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28">
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
            className="mt-5 text-[clamp(2.3rem,5.6vw,3.9rem)] font-bold leading-[1.05] tracking-[-0.035em]"
          >
            {t("title")} <span className="font-lesson font-medium italic tracking-[-0.01em] text-accent">{t("titleAccent")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-xl text-[clamp(1.05rem,2vw,1.2rem)] leading-relaxed text-label-2"
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
            <Button size="lg" variant="secondary" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
              {t("ctaSecondary")}
            </Button>
          </motion.div>
        </div>
        <HeroScene />
      </div>
    </section>
  );
}

const DECK = ["go for a walk", "look forward to", "make a decision"];

/**
 * Looping scene: the learner writes a sentence with a typical mistake, the tutor corrects it
 * with a pen, and the right chunk drops into the review deck.
 */
function HeroScene() {
  const t = useTranslations("landing");
  const [step, setStep] = useState(0);
  useEffect(() => {
    const durations = [1100, 1500, 2200, 1500, 3600];
    const id = setTimeout(() => setStep((s) => (s + 1) % durations.length), durations[step]);
    return () => clearTimeout(id);
  }, [step]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.25 }}
      className="relative mx-auto w-full max-w-[440px]"
      aria-hidden
    >
      <LayoutGroup>
        <div className="glass-thick relative overflow-hidden rounded-[28px] border">
          <div className="flex items-center gap-3 border-b border-separator px-5 py-3.5">
            <LogoMark size={32} />
            <div>
              <div className="text-[15px] font-semibold">Ustoz</div>
              <div className="flex items-center gap-1.5 text-[12px] text-success">
                <span className="size-1.5 rounded-full bg-success-solid" /> online · Tashkent
              </div>
            </div>
          </div>
          <div className="flex min-h-[318px] flex-col gap-3 p-5">
            <Bubble side="left">How was your weekend in Samarkand?</Bubble>
            <AnimatePresence>
              {step >= 1 && (
                <Bubble side="right" key="u">
                  I made a lot of photos of the Registan!
                </Bubble>
              )}
              {step >= 2 && (
                <motion.div
                  key="fix"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  className="max-w-[92%] rounded-[18px] rounded-bl-md bg-elevated px-4 py-3 shadow-card"
                >
                  <Correction wrong="made a lot of photos" right="took a lot of photos" note={t("demoWhy")} />
                  {step === 2 && (
                    <motion.span layoutId="hero-chunk" className="mt-2.5 inline-flex rounded-full bg-marker px-2.5 py-0.5 font-lesson text-[14px] text-label">
                      take a photo
                    </motion.span>
                  )}
                </motion.div>
              )}
              {step >= 4 && (
                <Bubble side="left" key="b">
                  Wonderful! Which photo is your favourite?
                </Bubble>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* The review deck under the chat. */}
        <div className="relative mx-6 -mt-3 h-[92px]">
          {DECK.map((c, i) => (
            <div
              key={c}
              className="absolute inset-x-0 rounded-[18px] border border-separator bg-elevated px-4 py-3 shadow-card"
              style={{ top: 18 + i * 9, transform: `scale(${1 - (DECK.length - i) * 0.035})`, opacity: 0.55 + i * 0.15 }}
            >
              <span className="font-lesson text-[15px] text-label-2">{c}</span>
            </div>
          ))}
          {step >= 3 && (
            <motion.div
              layoutId="hero-chunk"
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="absolute inset-x-0 top-[48px] flex items-center justify-between gap-2 rounded-[18px] border border-gold/40 bg-elevated px-4 py-3 shadow-float"
            >
              <span className="font-lesson text-[16px] text-label">take a photo</span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gold">
                <Layers className="size-3.5" /> {step >= 4 ? t("demoNext") : t("demoAdded")}
              </span>
            </motion.div>
          )}
        </div>
      </LayoutGroup>
      <MajolicaTile size={86} className="absolute -right-8 -top-10 -z-10 rotate-12 opacity-60 max-sm:hidden" />
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
      lang="en"
      className={cn(
        "max-w-[86%] rounded-[20px] px-4 py-2.5 font-lesson text-[16px] leading-snug",
        side === "left" ? "rounded-bl-md bg-fill text-label" : "ml-auto rounded-br-md bg-accent-solid text-on-accent",
      )}
    >
      {children}
    </motion.div>
  );
}

/* ───────────── A lesson is a situation ───────────── */

const LESSON_CHUNKS: { text: string; kind: ChunkKind }[] = [
  { text: "Could I have the plov, please?", kind: "fixed" },
  { text: "go for the lamb", kind: "phrasal" },
  { text: "a pot of green tea", kind: "collocation" },
  { text: "Could we get the bill?", kind: "fixed" },
];

function LessonSection() {
  const t = useTranslations("landing");
  const steps = [
    { icon: Target, title: t("step1"), text: t("step1Text") },
    { icon: Layers, title: t("step2"), text: t("step2Text") },
    { icon: Check, title: t("step3"), text: t("step3Text") },
    { icon: Flag, title: t("step4"), text: t("step4Text") },
  ];
  return (
    <section id="lesson" className="relative scroll-mt-24">
      <IslimiBorder className="mx-auto max-w-6xl px-6 text-ochre/40" />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-gold">{t("lessonKicker")}</p>
          <h2 className="mt-3 text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-tight">{t("lessonTitle")}</h2>
          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-label-2">{t("lessonText")}</p>
          <ol className="mt-8 space-y-5">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-separator bg-elevated font-lesson text-[17px] text-accent">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[16px] font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-[14px] leading-snug text-label-2">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative rounded-[30px] border-2 border-ochre/35 p-2">
            <div className="surface overflow-hidden rounded-[22px]">
              <div className="flex items-center gap-4 border-b border-separator bg-gold-soft/60 px-5 py-4">
                <MajolicaTile size={52} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">A1</Badge>
                    <span className="text-[12px] text-label-3">~12 min</span>
                  </div>
                  <p className="mt-1 text-[18px] font-bold">{t("lessonSituation")}</p>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="flex items-start gap-2 text-[14px] leading-snug text-label-2">
                  <Target className="mt-0.5 size-4 shrink-0 text-accent" /> {t("lessonCanDo")}
                </p>
                <ul className="mt-4 divide-y divide-separator">
                  {LESSON_CHUNKS.map((c) => (
                    <li key={c.text} className="flex flex-col items-start gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <Phrase text={c.text} size="sm" />
                      <ChunkTag kind={c.kind} className="shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-3 border-t border-separator px-5 py-3.5">
                <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
                  <MessagesSquare className="size-[18px]" />
                </span>
                <p className="text-[14px] font-medium">{t("lessonMission")}</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────── Spaced repetition on a real card ───────────── */

function ReviewSection() {
  const t = useTranslations("landing");
  const steps = [t("day1"), t("day3"), t("day8"), t("day21")];
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:items-center lg:gap-16">
      <Reveal className="order-2 lg:order-1">
        <div className="mx-auto max-w-[360px]">
          <WordCard
            chunk="take a photo"
            kind="collocation"
            meaning={t("srsCardMeaning")}
            example="Could you take a photo of us, please?"
            anti={{ wrong: "make a photo", why: t("srsCardWhy") }}
            className="h-[280px]"
          />
          <p className="mt-3 text-center text-[13px] text-label-3">{t("srsTry")}</p>
        </div>
      </Reveal>
      <Reveal className="order-1 lg:order-2" delay={0.05}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-teal">{t("srsKicker")}</p>
        <h2 className="mt-3 text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold leading-tight">{t("srsTitle")}</h2>
        <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-label-2">{t("srsText")}</p>
        {/* Intervals grow after each correct review. */}
        <div className="mt-8 flex items-end gap-2 sm:gap-3" aria-hidden>
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-2">
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: 18 + i * 22 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.12, ...spring }}
                className="w-full rounded-t-[10px] bg-gradient-to-t from-teal-soft to-teal/30"
              />
              <span className="text-[12px] font-medium text-label-2">{s}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────── What else ───────────── */

function Points() {
  const t = useTranslations("landing");
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <h2 className="text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold">{t("pointsTitle")}</h2>
      </Reveal>
      <div className="mt-8 grid border-t border-separator md:grid-cols-2">
        {[1, 2, 3, 4].map((n, i) => (
          <Reveal key={n} delay={i * 0.05} className={cn("flex gap-5 border-b border-separator py-7 md:px-2", i % 2 === 0 && "md:border-r md:pr-8", i % 2 === 1 && "md:pl-8")}>
            <span className="font-lesson text-[34px] leading-none text-ochre">{String(n).padStart(2, "0")}</span>
            <div>
              <h3 className="text-[18px] font-semibold">{t(`p${n}Title`)}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-label-2">{t(`p${n}Text`)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Pricing from the live catalog ───────────── */

function Pricing({ pricing }: { pricing: LandingPricing }) {
  const t = useTranslations("landing");
  const tp = useTranslations("plans");
  const tc = useTranslations("common");
  const locale = useLocale();
  const n = (v: number | null) => v ?? 0;

  const features = (tier: Tier): string[] => {
    const l = pricing[tier].limits;
    const list = [
      l.dailyMinutes === null ? t("pUnlimited") : t("pMinutes", { n: l.dailyMinutes }),
      tier === "FREE" ? t("pLevelsBasic") : t("pLevelsAll"),
    ];
    if (tier === "FREE") {
      list.push(t("pLessons", { n: n(l.lessonsPerDay) }), t("pReviews", { n: n(l.reviewsPerDay) }), t("pMistakesShort"));
    } else {
      list.push(t("pMistakesFull"));
      list.push(l.missionsPerDay === null ? t("pMissionsUnl") : t("pMissions", { n: l.missionsPerDay }));
      if (l.pronunciationPerDay) list.push(t("pPron", { n: l.pronunciationPerDay }));
    }
    if (tier === "PRO") list.push(t("pAiLessons"));
    return list;
  };

  const tiers: Tier[] = ["FREE", "PLUS", "PRO"];
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
      <Reveal className="text-center">
        <h2 className="text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold">{t("pricingTitle")}</h2>
        <p className="mt-3 text-[17px] text-label-2">{t("pricingSubtitle")}</p>
      </Reveal>
      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-3">
        {tiers.map((tier, i) => {
          const featured = tier === "PLUS";
          return (
            <Reveal key={tier} delay={i * 0.06}>
              <div className={cn("surface relative flex h-full flex-col rounded-card p-6 pt-8", featured && "ring-2 ring-accent-solid/60")}>
                <div className={cn("absolute inset-x-6 top-2.5 opacity-50", tier === "PRO" ? "text-ochre" : tier === "PLUS" ? "text-turquoise" : "text-label-3")}>
                  <TileBand />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[22px] font-bold">{tier === "FREE" ? "Free" : tier === "PLUS" ? "Plus" : "Pro"}</h3>
                  {featured && (
                    <Badge tone="accent">
                      <Sparkles className="size-3" /> {t("popular")}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-[14px] text-label-2">{tp(`desc${tier}`)}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-[30px] font-bold tracking-[-0.03em] tabular-nums">{formatMoney(pricing[tier].price, "UZS", locale)}</span>
                  {tier !== "FREE" && <span className="text-[14px] text-label-2">{t("perMonth")}</span>}
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {features(tier).map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px]">
                      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", featured ? "bg-accent-solid text-on-accent" : "bg-teal-soft text-teal")}>
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                {tier === "PRO" && <p className="mt-4 text-[13px] font-medium text-gold">{t("pTrial")}</p>}
                <ButtonLink
                  href={tier === "FREE" ? "/app" : `/app/plans?tier=${tier}`}
                  variant={featured ? "primary" : "secondary"}
                  icon={tier === "PRO" ? Crown : undefined}
                  className="mt-6 w-full"
                >
                  {tier === "FREE" ? tc("startFree") : t("choose", { tier: tier === "PLUS" ? "Plus" : "Pro" })}
                </ButtonLink>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Faq() {
  const t = useTranslations("landing");
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:px-6">
      <Reveal>
        <h2 className="text-center text-[clamp(1.8rem,3.6vw,2.6rem)] font-bold">{t("faqTitle")}</h2>
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
    <footer>
      <IslimiBorder className="mx-auto max-w-6xl px-6 text-accent/25" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:px-6">
        <Logo />
        <p className="text-[13px] text-label-2 sm:ml-auto">{t("footer")}</p>
      </div>
    </footer>
  );
}
