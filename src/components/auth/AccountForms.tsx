"use client";

import { useActionState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, KeyRound, MailCheck, MailX, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/primitives";
import { IslimiBorder } from "@/components/decor/motifs";
import { Crest, StageCard } from "@/components/decor/OrnamentStage";
import { requestPasswordReset, resetPassword, type ForgotState, type ResetState } from "@/app/actions/account";

function Card({ icon, title, subtitle, shake, children }: { icon: ReactNode; title: string; subtitle: string; shake?: string; children: ReactNode }) {
  return (
    <StageCard className="max-w-[420px] p-6 pt-9 sm:p-9 sm:pt-11">
      <motion.div animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }} key={shake ?? "ok"}>
        <Crest size={72}>{icon}</Crest>
        <h1 className="mt-4 text-[28px] font-bold">{title}</h1>
        <p className="mt-1.5 text-[15px] text-label-2">{subtitle}</p>
      </motion.div>
      <IslimiBorder className="mt-5 text-gold opacity-45" />
      {children}
    </StageCard>
  );
}

function BackToLogin() {
  const t = useTranslations("account");
  return (
    <p className="mt-6 text-center text-[14px]">
      <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline">
        <ArrowLeft className="size-4" />
        {t("backToLogin")}
      </Link>
    </p>
  );
}

/** "Forgot password": always answers the same way, see requestPasswordReset. */
export function ForgotForm({ smtp }: { smtp: boolean }) {
  const t = useTranslations("account");
  const ta = useTranslations("auth");
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, undefined);
  return (
    <Card icon={<KeyRound className="size-7 text-accent" />} title={t("forgotTitle")} subtitle={t("forgotSubtitle")} shake={state?.error}>
      <AnimatePresence mode="wait" initial={false}>
        {state?.sent ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-3">
            <div className="flex gap-3 rounded-[16px] bg-success-soft p-4 text-[14.5px]">
              <MailCheck className="mt-0.5 size-5 shrink-0 text-success" />
              <p>{t("forgotSent", { email: state.email ?? "" })}</p>
            </div>
            {!smtp && <p className="text-[13px] text-label-2">{t("forgotDemo")}</p>}
          </motion.div>
        ) : (
          <motion.form key="form" action={action} noValidate className="mt-5 space-y-4" exit={{ opacity: 0, y: -6 }}>
            <Field
              label={ta("email")}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              defaultValue={state?.email}
              error={state?.error ? ta(state.error) : undefined}
              required
            />
            <Button type="submit" size="lg" className="w-full px-4!" loading={pending} icon={Send}>
              {t("forgotSubmit")}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
      <BackToLogin />
    </Card>
  );
}

/** New password from a reset link. */
export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("account");
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, undefined);
  if (state?.error === "invalid") return <ResetInvalid />;
  return (
    <Card icon={<KeyRound className="size-7 text-accent" />} title={t("resetTitle")} subtitle={t("resetSubtitle")} shake={state?.error}>
      <form action={action} noValidate className="mt-5 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field
          label={t("newPassword")}
          name="password"
          type="password"
          autoComplete="new-password"
          error={state?.error === "errShort" ? t("errShort") : undefined}
          required
        />
        <Button type="submit" size="lg" className="w-full px-4!" loading={pending} iconRight={ArrowRight}>
          {t("resetSubmit")}
        </Button>
      </form>
      <BackToLogin />
    </Card>
  );
}

export function ResetInvalid() {
  const t = useTranslations("account");
  return (
    <Card icon={<MailX className="size-7 text-danger" />} title={t("linkBadTitle")} subtitle={t("resetInvalid")}>
      <ButtonLink href="/forgot" size="lg" className="mt-5 w-full px-4!" icon={Send}>
        {t("requestNew")}
      </ButtonLink>
      <BackToLogin />
    </Card>
  );
}

/** Result of opening an email confirmation link. */
export function VerifyResult({ ok, signedIn }: { ok: boolean; signedIn: boolean }) {
  const t = useTranslations("account");
  return (
    <Card
      icon={ok ? <MailCheck className="size-7 text-success" /> : <MailX className="size-7 text-danger" />}
      title={ok ? t("verifyOkTitle") : t("linkBadTitle")}
      subtitle={ok ? t("verifyOkText") : t("verifyBadText")}
    >
      <ButtonLink href={signedIn ? "/app" : "/login"} size="lg" className="mt-5 w-full px-4!" iconRight={ArrowRight}>
        {signedIn ? t("toApp") : t("toLogin")}
      </ButtonLink>
    </Card>
  );
}
