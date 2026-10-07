import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { issueToken } from "@/lib/account/tokens";
import { formatPhone, maskPhoneInput, normalizePhone } from "@/lib/account/phone";
import { emulatorChatId, handleUpdate, phoneCallback } from "@/lib/messaging/telegram";
import { notify } from "@/lib/billing/notify";
import { POST as webhook } from "@/app/api/telegram/webhook/route";
import { makeUser } from "./helpers";

describe("phone numbers", () => {
  test("normalizes to E.164 and formats Uzbek numbers", () => {
    expect(normalizePhone("90 123 45 67")).toBe("+998901234567");
    expect(normalizePhone("+998 (90) 123-45-67")).toBe("+998901234567");
    expect(normalizePhone("+998 90 123")).toBeNull();
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhone("12")).toBeNull();
    expect(formatPhone("+998901234567")).toBe("+998 90 123 45 67");
  });

  test("input mask keeps +998 XX XXX XX XX and lets the code be erased", () => {
    expect(maskPhoneInput("901234567")).toBe("+998 90 123 45 67");
    expect(maskPhoneInput("+998901234567999")).toBe("+998 90 123 45 67");
    expect(maskPhoneInput("+99")).toBe("+99");
    expect(maskPhoneInput("+7 999")).toBe("+7999");
  });
});

describe("Telegram bot (emulated)", () => {
  let u: User;
  let chat: string;
  const from = () => ({ id: chat, username: "qa" });
  const last = async () => (await db.outboxMessage.findFirstOrThrow({ where: { to: chat }, orderBy: { createdAt: "desc" } })).body;
  const reload = () => db.user.findUniqueOrThrow({ where: { id: u.id } });

  beforeAll(async () => {
    u = await makeUser({ phone: "+998901112233" });
    chat = emulatorChatId(u.id);
  });
  afterAll(async () => {
    await db.outboxMessage.deleteMany({ where: { to: chat } });
    await db.user.delete({ where: { id: u.id } });
  });

  test("/start with a one-time code links the chat; the code works once", async () => {
    const token = await issueToken(u.id, "tg_link", 60_000);
    await handleUpdate({ message: { chat: { id: chat }, from: from(), text: `/start ${token}` } });
    const linked = await reload();
    expect(linked.telegramChatId).toBe(chat);
    expect(linked.telegramUsername).toBe("qa");
    const welcome = await db.outboxMessage.findFirstOrThrow({ where: { to: chat } });
    expect(welcome.status).toBe("emulated");
    expect(JSON.parse(welcome.meta!).keyboard[0][0].request_contact).toBe(true);

    await handleUpdate({ message: { chat: { id: "emu-stranger" }, from: { id: "emu-stranger" }, text: `/start ${token}` } });
    expect(await db.user.count({ where: { telegramChatId: "emu-stranger" } })).toBe(0);
    await db.outboxMessage.deleteMany({ where: { to: "emu-stranger" } });
  });

  test("someone else's contact is refused; the same number is confirmed", async () => {
    await handleUpdate({ message: { chat: { id: chat }, from: from(), contact: { phone_number: "998901112233", user_id: "other" } } });
    expect((await reload()).phoneVerifiedAt).toBeNull();
    await handleUpdate({ message: { chat: { id: chat }, from: from(), contact: { phone_number: "998901112233", user_id: chat } } });
    expect((await reload()).phoneVerifiedAt).not.toBeNull();
  });

  test("a different number is offered with a signed button; a forged one does nothing", async () => {
    await handleUpdate({ message: { chat: { id: chat }, from: from(), contact: { phone_number: "+998905556677", user_id: chat } } });
    const offer = await db.outboxMessage.findFirstOrThrow({ where: { to: chat }, orderBy: { createdAt: "desc" } });
    const data = JSON.parse(offer.meta!).inline_keyboard[0][0].callback_data as string;
    expect(data).toBe(phoneCallback(chat, "+998905556677"));

    await handleUpdate({ callback_query: { id: "1", from: from(), data: "p:+998900000000:forgedforgedforg", message: { chat: { id: chat } } } });
    expect((await reload()).phone).toBe("+998901112233");
    await handleUpdate({ callback_query: { id: "2", from: from(), data, message: { chat: { id: chat } } } });
    expect((await reload()).phone).toBe("+998905556677");
    expect(await last()).toContain("+998 90 555 66 77");
  });

  test("notifications go to Telegram unless turned off", async () => {
    const count = () => db.outboxMessage.count({ where: { to: chat } });
    const before = await count();
    await notify(u.id, "sub_expired", { tier: "PLUS" });
    expect(await count()).toBe(before + 1);
    expect(await last()).toMatch(/^<b>/);
    await db.user.update({ where: { id: u.id }, data: { notifyTelegram: false } });
    await notify(u.id, "sub_expired", { tier: "PLUS" });
    expect(await count()).toBe(before + 1);
  });
});

describe("webhook", () => {
  test("is closed without a bot, and checks the secret header", async () => {
    const req = (secret?: string) =>
      new Request("http://x/api/telegram/webhook", { method: "POST", headers: secret ? { "x-telegram-bot-api-secret-token": secret } : {}, body: "{}" });
    expect((await webhook(req("s"))).status).toBe(404);
    process.env.TELEGRAM_BOT_TOKEN = "test";
    process.env.TELEGRAM_WEBHOOK_SECRET = "s3cret";
    try {
      expect((await webhook(req("wrong"))).status).toBe(403);
      expect((await webhook(req())).status).toBe(403);
      expect((await webhook(req("s3cret"))).status).toBe(200);
    } finally {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
    }
  });
});
