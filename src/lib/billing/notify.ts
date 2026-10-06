import "server-only";
import { createTranslator } from "next-intl";
import { db } from "../db";
import { sendMail } from "./mail";
import { bodyKey, notifyValues, type NotifyParams, type NotifyType } from "./notify-format";

async function messagesFor(locale: string) {
  const l = ["ru", "en", "uz"].includes(locale) ? locale : "ru";
  return { locale: l, messages: (await import(`../../../messages/${l}.json`)).default };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** In-app notification plus an email in the user's language (guests get no email). Never throws. */
export async function notify(userId: string, type: NotifyType, params: NotifyParams = {}) {
  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const n = await db.notification.create({ data: { userId, type, params: JSON.stringify(params) } });
    if (user.email.endsWith("@guest.local")) return;

    const { locale, messages } = await messagesFor(user.locale);
    const t = createTranslator({ locale, messages, namespace: "notify", timeZone: "Asia/Tashkent" });
    const title = t(`${type}.title`, notifyValues(params));
    const body = t(`${type}.${bodyKey(type, params)}`, notifyValues(params));
    const hello = t("email.hello", { name: user.name });
    const link = `${appUrl()}/${locale}/app/billing`;
    const text = `${hello}\n\n${body}\n\n${t("email.cta")}: ${link}\n\n— Ustoz AI\n${t("email.footer")}`;
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1d1d1f">
<h2 style="margin:0 0 12px">${esc(title)}</h2><p>${esc(hello)}</p><p style="line-height:1.5">${esc(body)}</p>
<p><a href="${link}" style="display:inline-block;background:#2f5bd3;color:#fff;padding:10px 18px;border-radius:12px;text-decoration:none">${esc(t("email.cta"))}</a></p>
<p style="color:#86868b;font-size:12px">${esc(t("email.footer"))}</p></div>`;
    await sendMail(user.email, `Ustoz AI · ${title}`, text, html);
    await db.notification.update({ where: { id: n.id }, data: { emailSentAt: new Date() } });
  } catch (e) {
    console.error("[notify]", type, (e as Error).message);
  }
}
