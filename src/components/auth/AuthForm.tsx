"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/brand";
import { login, register, type AuthState } from "@/app/actions/auth";
import { spring } from "@/components/ui/motion";

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
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      className="surface w-full max-w-[420px] rounded-sheet p-7 sm:p-9"
    >
      <motion.div
        animate={err ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        key={err ?? "ok"}
      >
        <LogoMark size={44} />
        <h1 className="mt-5 text-[28px] font-bold">{mode === "login" ? t("loginTitle") : t("registerTitle")}</h1>
        <p className="mt-1.5 text-[15px] text-label-2">{mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}</p>
      </motion.div>
      <form action={action} className="mt-7 space-y-4" noValidate>
        {mode === "register" && (
          <Field label={t("name")} name="name" autoComplete="name" defaultValue={state?.fields?.name} error={fieldErr("name")} required />
        )}
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
        <Field
          label={t("password")}
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          error={fieldErr("password")}
          required
        />
        <Button type="submit" size="lg" className="mt-2 w-full" loading={pending} iconRight={ArrowRight}>
          {mode === "login" ? tc("login") : tc("register")}
        </Button>
        <ButtonLink href="/app" variant="secondary" size="lg" className="w-full" icon={Sparkles}>
          {t("guest")}
        </ButtonLink>
      </form>
      <p className="mt-6 text-center text-[14px] text-label-2">
        {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={mode === "login" ? "/register" : "/login"} className="font-semibold text-accent hover:underline">
          {mode === "login" ? tc("register") : tc("login")}
        </Link>
      </p>
      {mode === "login" && <p className="mt-3 text-center text-[12px] text-label-3">{t("demoHint")}</p>}
    </motion.div>
  );
}
