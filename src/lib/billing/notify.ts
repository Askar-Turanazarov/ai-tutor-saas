import "server-only";
import { db } from "../db";
import { sendMail } from "../messaging/mail";
import { appUrl, emailLayout, translatorFor } from "../messaging/template";
import { bodyKey, notifyValues, type NotifyParams, type NotifyType } from "./notify-format";

/** In-app notification plus an email in the user's language (guests get no email). Never throws. */
export async function notify(userId: string, type: NotifyType, params: NotifyParams = {}) {
  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const n = await db.notification.create({ data: { userId, type, params: JSON.stringify(params) } });
    if (user.email.endsWith("@guest.local")) return;

    const { locale, t } = await translatorFor(user.locale, "notify");
    const title = t(`${type}.title`, notifyValues(params));
    const { text, html } = emailLayout({
      title,
      hello: t("email.hello", { name: user.name }),
      body: t(`${type}.${bodyKey(type, params)}`, notifyValues(params)),
      cta: t("email.cta"),
      link: `${appUrl()}/${locale}/app/billing`,
      footer: t("email.footer"),
    });
    await sendMail({ to: user.email, subject: `Ustoz AI · ${title}`, text, html, userId });
    await db.notification.update({ where: { id: n.id }, data: { emailSentAt: new Date() } });
  } catch (e) {
    console.error("[notify]", type, (e as Error).message);
  }
}
