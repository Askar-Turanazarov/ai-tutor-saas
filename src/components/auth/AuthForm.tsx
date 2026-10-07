"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Stagger, StaggerItem } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/brand";
import { IslimiBorder } from "@/components/decor/motifs";
import { Crest, StageCard } from "@/components/decor/OrnamentStage";
import { login, register, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, undefined);
  const err = state?.error;
  const fieldErr = (f: string) => {
    if (!err) return undefined;
    if (f === "name" && err === "errName") return t(err);
    if (f === "email" && ["errEmail", "errExists"].includes(err)) return t(err);
    if (f === "password" && ["errShort", "errInvalid"].includes(err)) return t(err);
    return undefined;
  };

  return (
    <StageCard className="max-w-[420px] p-6 pt-9 sm:p-9 sm:pt-11">
      <motion.div animate={err ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }} key={err ?? "ok"}>
        <Crest size={72}>
          <LogoMark size={26} />
        </Crest>
        <h1 className="mt-4 text-[28px] font-bold">{mode === "login" ? t("loginTitle") : t("registerTitle")}</h1>
        <p className="mt-1.5 text-[15px] text-label-2">{mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}</p>
      </motion.div>
      <IslimiBorder className="mt-5 text-gold opacity-45" />
      <form action={action} noValidate>
        <Stagger className="mt-5 space-y-4" delay={0.05}>
          {mode === "register" && (
            <StaggerItem>
              <Field label={t("name")} name="name" autoComplete="name" defaultValue={state?.fields?.name} error={fieldErr("name")} required />
            </StaggerItem>
          )}
          <StaggerItem>
            <Field
              label={t("email")}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              defaultValue={state?.fields?.email}
              error={fieldErr("email")}
              required
            />
          </StaggerItem>
          <StaggerItem>
            <Field
              label={t("password")}
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              error={fieldErr("password")}
              required
            />
            {mode === "login" && (
              <Link href="/forgot" className="mt-2 inline-block px-1 text-[13.5px] font-medium text-accent hover:underline">
                {t("forgot")}
              </Link>
            )}
          </StaggerItem>
          <StaggerItem className="space-y-3 pt-2">
            <Button type="submit" size="lg" className="w-full px-4!" loading={pending} iconRight={ArrowRight}>
              {mode === "login" ? tc("login") : tc("register")}
            </Button>
            <ButtonLink href="/app" variant="secondary" size="lg" className="w-full px-4! max-sm:text-[15px]" icon={Sparkles}>
              {t("guest")}
            </ButtonLink>
          </StaggerItem>
        </Stagger>
      </form>
      <p className="mt-6 text-center text-[14px] text-label-2">
        {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={mode === "login" ? "/register" : "/login"} className="font-semibold text-accent hover:underline">
          {mode === "login" ? tc("register") : tc("login")}
        </Link>
      </p>
      {mode === "login" && <p className="mt-3 text-center text-[12px] text-label-3">{t("demoHint")}</p>}
    </StageCard>
  );
}
