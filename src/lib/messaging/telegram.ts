import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { consumeToken } from "../account/tokens";
import { formatPhone, normalizePhone } from "../account/phone";
import { translatorFor } from "./template";

export const botConfigured = () => !!(process.env.TELEGRAM_BOT_TOKEN || "").trim();
export const botUsername = () => (process.env.TELEGRAM_BOT_USERNAME || "").trim().replace(/^@/, "");
/** Chats of the in-app bot emulator, used when no bot token is set. */
export const emulatorChatId = (userId: string) => `emu-${userId}`;
const isEmulated = (chatId: string) => chatId.startsWith("emu-") || !botConfigured();

export type TgButton = { text: string; url?: string; callback_data?: string };
export type TgMarkup =
  | { inline_keyboard: TgButton[][] }
  | { keyboard: { text: string; request_contact?: boolean }[][]; resize_keyboard?: boolean; one_time_keyboard?: boolean }
  | { remove_keyboard: true };

export async function telegramApi<T = unknown>(method: string, body: object): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN!.trim()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(json.description || `Telegram ${method} failed`);
  return json.result;
}

/**
 * Sends a bot message and logs it to the outbox (channel "telegram"). With TELEGRAM_BOT_TOKEN it goes
 * out through the Bot API; without it, it is only stored and shown in the bot emulator. Never throws.
 */
export async function sendTelegram(m: { chatId: string; text: string; userId?: string; markup?: TgMarkup }) {
  const log = (status: string, error?: string) =>
    db.outboxMessage.create({
      data: { userId: m.userId, channel: "telegram", to: m.chatId, body: m.text, meta: m.markup ? JSON.stringify(m.markup) : null, status, error },
    });
  if (isEmulated(m.chatId)) return void (await log("emulated"));
  try {
    await telegramApi("sendMessage", {
      chat_id: m.chatId,
      text: m.text,
      parse_mode: "HTML",
      reply_markup: m.markup,
      link_preview_options: { is_disabled: true },
    });
    await log("sent");
  } catch (e) {
    await log("failed", (e as Error).message.slice(0, 500));
  }
}

/** Telegram accepts URL buttons only for public addresses; on localhost the link goes into the text. */
export const publicUrl = (url: string) => /^https:\/\//.test(url) && !/\/\/(localhost|127\.0\.0\.1)/.test(url);

/* ───── Updates (webhook, polling and the emulator all end up here) ───── */

type TgUser = { id: number | string; username?: string; first_name?: string };
export type TgUpdate = {
  message?: { chat: { id: number | string }; from?: TgUser; text?: string; contact?: { phone_number: string; user_id?: number | string } };
  callback_query?: { id: string; from: TgUser; data?: string; message?: { chat: { id: number | string } } };
};

const secret = () => process.env.AUTH_SECRET || "dev-secret-change-me";
/** Callback data for "update the number in my profile": signed, so a client can't put any number in it. */
const phoneSig = (chatId: string, phone: string) => createHmac("sha256", secret()).update(`${chatId}:${phone}`).digest("base64url").slice(0, 16);
export const phoneCallback = (chatId: string, phone: string) => `p:${phone}:${phoneSig(chatId, phone)}`;
function readPhoneCallback(chatId: string, data: string) {
  const [kind, phone, sig] = data.split(":");
  if (kind !== "p" || !phone || !sig) return null;
  const want = Buffer.from(phoneSig(chatId, phone));
  return sig.length === want.length && timingSafeEqual(Buffer.from(sig), want) ? phone : null;
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

export async function handleUpdate(update: TgUpdate) {
  if (update.callback_query) return handleCallback(update.callback_query);
  const msg = update.message;
  if (!msg) return;
  const chatId = String(msg.chat.id);
  const linked = await db.user.findUnique({ where: { telegramChatId: chatId } });
  const { t } = await translatorFor(linked?.locale ?? "ru", "telegram");
  const reply = (text: string, markup?: TgMarkup, userId = linked?.id) => sendTelegram({ chatId, text, markup, userId });

  if (msg.text?.startsWith("/start")) {
    const token = msg.text.split(/\s+/)[1] ?? "";
    const userId = token ? await consumeToken(token, "tg_link") : null;
    if (!userId) return reply(linked ? t("alreadyLinked", { name: esc(linked.name) }) : t("linkExpired"));
    // One chat per account and one account per chat.
    await db.user.updateMany({ where: { telegramChatId: chatId, NOT: { id: userId } }, data: { telegramChatId: null, telegramLinkedAt: null } });
    const user = await db.user.update({
      where: { id: userId },
      data: { telegramChatId: chatId, telegramUsername: msg.from?.username ?? null, telegramLinkedAt: new Date(), notifyTelegram: true },
    });
    const tu = (await translatorFor(user.locale, "telegram")).t;
    return reply(
      tu("welcome", { name: esc(user.name) }),
      { keyboard: [[{ text: tu("shareButton"), request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
      user.id,
    );
  }

  if (msg.contact) {
    if (!linked) return reply(t("linkExpired"));
    // Only the sender's own contact proves the number belongs to them.
    if (msg.contact.user_id === undefined || String(msg.contact.user_id) !== String(msg.from?.id)) return reply(t("notOwnContact"), { remove_keyboard: true });
    const phone = normalizePhone(msg.contact.phone_number.startsWith("+") ? msg.contact.phone_number : `+${msg.contact.phone_number}`);
    if (!phone) return reply(t("notOwnContact"), { remove_keyboard: true });
    if (!linked.phone || linked.phone === phone) {
      await db.user.update({ where: { id: linked.id }, data: { phone, phoneVerifiedAt: new Date() } });
      return reply(t(linked.phone ? "phoneConfirmed" : "phoneSaved", { phone: formatPhone(phone) }), { remove_keyboard: true });
    }
    await reply(t("phoneDiffersNote"), { remove_keyboard: true });
    return reply(t("phoneDiffers", { phone: formatPhone(phone), profile: formatPhone(linked.phone) }), {
      inline_keyboard: [[{ text: t("updateButton"), callback_data: phoneCallback(chatId, phone) }]],
    });
  }

  return reply(linked ? t("help") : t("linkExpired"));
}

async function handleCallback(q: NonNullable<TgUpdate["callback_query"]>) {
  const chatId = String(q.message?.chat.id ?? q.from.id);
  const user = await db.user.findUnique({ where: { telegramChatId: chatId } });
  const phone = user && q.data ? readPhoneCallback(chatId, q.data) : null;
  if (!isEmulated(chatId)) await telegramApi("answerCallbackQuery", { callback_query_id: q.id }).catch(() => {});
  if (!user || !phone) return;
  await db.user.update({ where: { id: user.id }, data: { phone, phoneVerifiedAt: new Date() } });
  const { t } = await translatorFor(user.locale, "telegram");
  await sendTelegram({ chatId, userId: user.id, text: t("phoneUpdated", { phone: formatPhone(phone) }) });
}
