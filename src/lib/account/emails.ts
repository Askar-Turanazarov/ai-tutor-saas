import "server-only";
import { sendMail } from "../messaging/mail";
import { appUrl, emailLayout, translatorFor } from "../messaging/template";
import { issueToken } from "./tokens";

type Recipient = { id: string; email: string; name: string; locale: string };

export const VERIFY_TTL = 24 * 3_600_000;
export const RESET_TTL = 60 * 60_000;

async function send(user: Recipient, kind: "verify" | "reset") {
  const token = await issueToken(user.id, kind, kind === "verify" ? VERIFY_TTL : RESET_TTL);
  const { locale, t } = await translatorFor(user.locale, "account.mail");
  const greet = await translatorFor(user.locale, "notify.email");
  const link = `${appUrl()}/${locale}/${kind}?token=${token}`;
  const title = t(`${kind}Subject`);
  const { text, html } = emailLayout({
    title,
    hello: greet.t("hello", { name: user.name }),
    body: t(`${kind}Text`, { email: user.email }),
    cta: t(`${kind}Cta`),
    link,
    footer: greet.t("footer"),
  });
  await sendMail({ to: user.email, subject: `Ustoz AI · ${title}`, text, html, userId: user.id });
}

/** Email confirmation link, valid for 24 hours. */
export const sendVerifyEmail = (user: Recipient) => send(user, "verify");
/** Password reset link, valid for 60 minutes. */
export const sendResetEmail = (user: Recipient) => send(user, "reset");
