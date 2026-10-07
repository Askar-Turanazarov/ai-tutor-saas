import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/messaging/mail";
import { notify } from "@/lib/billing/notify";
import { makeUser } from "./helpers";

const PAID = { number: "UST-TEST-1", amount: 49000, tier: "Plus", until: "2026-11-07T00:00:00.000Z" };

describe("mail outbox (no SMTP_URL: emulation)", () => {
  let u: User;
  beforeAll(async () => {
    u = await makeUser();
  });
  afterAll(async () => {
    await db.user.delete({ where: { id: u.id } });
  });

  test("an email is stored, not sent", async () => {
    expect(await sendMail({ to: u.email, subject: "Hi", text: "Hello", html: "<p>Hello</p>", userId: u.id })).toBe("emulated");
    const m = await db.outboxMessage.findFirstOrThrow({ where: { userId: u.id } });
    expect(m).toMatchObject({ channel: "email", to: u.email, subject: "Hi", body: "<p>Hello</p>", status: "emulated" });
  });

  test("notify writes the bell entry and the email", async () => {
    await notify(u.id, "payment_ok", PAID);
    const n = await db.notification.findFirstOrThrow({ where: { userId: u.id, type: "payment_ok" } });
    expect(n.emailSentAt).not.toBeNull();
    expect(await db.outboxMessage.count({ where: { userId: u.id } })).toBe(2);
  });

  test("guests get the bell entry only", async () => {
    const g = await makeUser({ email: `g-${Date.now()}@guest.local` });
    await notify(g.id, "payment_ok", PAID);
    expect(await db.notification.count({ where: { userId: g.id } })).toBe(1);
    expect(await db.outboxMessage.count({ where: { userId: g.id } })).toBe(0);
    await db.user.delete({ where: { id: g.id } });
  });
});
