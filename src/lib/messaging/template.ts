import "server-only";
import { createTranslator } from "next-intl";

export const LOCALES = ["ru", "en", "uz"] as const;
export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** A server-side translator for messages sent outside a request (emails, Telegram), in the user's language. */
export async function translatorFor(userLocale: string, namespace: string) {
  const locale = (LOCALES as readonly string[]).includes(userLocale) ? userLocale : "ru";
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  return { locale, t: createTranslator({ locale, messages, namespace, timeZone: "Asia/Tashkent" }) };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The common email layout: title, greeting, body, one button. Returns the plain-text and HTML versions. */
export function emailLayout(m: { title: string; hello: string; body: string; cta: string; link: string; footer: string }) {
  const text = `${m.hello}\n\n${m.body}\n\n${m.cta}: ${m.link}\n\n— Ustoz AI\n${m.footer}`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1d1d1f">
<h2 style="margin:0 0 12px">${esc(m.title)}</h2><p>${esc(m.hello)}</p><p style="line-height:1.5">${esc(m.body)}</p>
<p><a href="${esc(m.link)}" style="display:inline-block;background:#2f5bd3;color:#fff;padding:10px 18px;border-radius:12px;text-decoration:none">${esc(m.cta)}</a></p>
<p style="color:#86868b;font-size:12px">${esc(m.footer)}</p></div>`;
  return { text, html };
}
