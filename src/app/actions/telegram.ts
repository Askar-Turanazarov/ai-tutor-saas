"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isGuest } from "@/lib/auth";
import { issueToken } from "@/lib/account/tokens";
import { normalizePhone } from "@/lib/account/phone";
import { botConfigured, botUsername, emulatorChatId, handleUpdate } from "@/lib/messaging/telegram";

const LINK_TTL = 15 * 60_000;

async function member() {
  const user = await getCurrentUser();
  return user && !isGuest(user) ? user : null;
}

/** Starts linking: a one-time code goes into the bot's /start link (or into the emulator when there is no bot). */
export async function connectTelegram(): Promise<{ url: string; external: boolean } | { error: "guest" | "config" }> {
  const user = await member();
  if (!user) return { error: "guest" };
  if (botConfigured() && !botUsername()) return { error: "config" };
  const token = await issueToken(user.id, "tg_link", LINK_TTL);
  return botConfigured()
    ? { url: `https://t.me/${botUsername()}?start=${token}`, external: true }
    : { url: `/app/settings/telegram?start=${token}`, external: false };
}

export async function disconnectTelegram() {
  const user = await member();
  if (!user) return;
  await db.user.update({ where: { id: user.id }, data: { telegramChatId: null, telegramUsername: null, telegramLinkedAt: null } });
  revalidatePath("/", "layout");
}

export async function setTelegramNotify(on: boolean) {
  const user = await member();
  if (!user) return;
  await db.user.update({ where: { id: user.id }, data: { notifyTelegram: on } });
}

/** Saves the phone from settings; editing the number drops its Telegram confirmation. */
export async function updatePhone(input: string): Promise<{ ok: true; phone: string | null } | { error: "phone" | "guest" }> {
  const user = await member();
  if (!user) return { error: "guest" };
  const phone = input.trim() ? normalizePhone(input) : null;
  if (input.trim() && !phone) return { error: "phone" };
  if (phone !== user.phone) await db.user.update({ where: { id: user.id }, data: { phone, phoneVerifiedAt: null } });
  revalidatePath("/", "layout");
  return { ok: true, phone };
}

/* ───── Bot emulator (only without TELEGRAM_BOT_TOKEN): the same updates a real bot would get ───── */

async function emulator() {
  const user = await member();
  if (!user || botConfigured()) return null;
  const chatId = emulatorChatId(user.id);
  return { user, chatId, from: { id: chatId, username: user.email.split("@")[0], first_name: user.name } };
}

export async function emulatorSend(text: string) {
  const e = await emulator();
  if (!e) return;
  await handleUpdate({ message: { chat: { id: e.chatId }, from: e.from, text: text.slice(0, 200) } });
  revalidatePath("/[locale]/app/settings/telegram", "page");
}

export async function emulatorShareContact(phone: string) {
  const e = await emulator();
  if (!e) return;
  await handleUpdate({ message: { chat: { id: e.chatId }, from: e.from, contact: { phone_number: phone.replace(/[^\d+]/g, ""), user_id: e.chatId } } });
  revalidatePath("/[locale]/app/settings/telegram", "page");
}

export async function emulatorCallback(data: string) {
  const e = await emulator();
  if (!e) return;
  await handleUpdate({ callback_query: { id: "emu", from: e.from, data, message: { chat: { id: e.chatId } } } });
  revalidatePath("/[locale]/app/settings/telegram", "page");
}
