import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { Subscription, User } from "@prisma/client";
import { db } from "@/lib/db";
import { runBillingCycle } from "@/lib/billing/scheduler";
import { reconcile } from "@/lib/billing/subscription";
import { makeUser } from "./helpers";

const H = 3_600_000;
const DAY = 24 * H;

// One scenario in order: the steps share the subscription and the clock. The cron runs daily at 05:00 UTC
// (10:00 in Tashkent); the period ends at 14:00 UTC (19:00 in Tashkent) on day 10. Reminders: 3 days.
describe("billing cycle with a daily cron", () => {
  let u: User;
  let sub: Subscription;
  let cardId: string;
  const day0 = new Date();
  day0.setUTCHours(5, 0, 0, 0);
  if (day0.getTime() <= Date.now()) day0.setTime(day0.getTime() + DAY);
  const run = (day: number, hours = 0) => new Date(day0.getTime() + day * DAY + hours * H);
  const end = run(10, 9);
  const fresh = () => db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
  const count = (type: string) => db.notification.count({ where: { userId: u.id, type } });
  const last = async (type: string) => JSON.parse((await db.notification.findFirstOrThrow({ where: { userId: u.id, type }, orderBy: { createdAt: "desc" } })).params);

  beforeAll(async () => {
    u = await makeUser({ plan: "PLUS" });
    // Mock card …1111 declines renewals, …4417 goes through.
    cardId = (await db.paymentMethod.create({ data: { userId: u.id, provider: "card", brand: "uzcard", last4: "1111", expMonth: 12, expYear: 2030, token: "t" } })).id;
    sub = await db.subscription.create({
      data: { userId: u.id, tier: "PLUS", period: 1, status: "active", provider: "card", currentPeriodStart: new Date(end.getTime() - 30 * DAY), currentPeriodEnd: end, paymentMethodId: cardId },
    });
  });
  afterAll(async () => {
    await db.user.delete({ where: { id: u.id } });
  });

  test("the reminder comes on the first run within 3–4 days, saying it will auto-renew", async () => {
    await runBillingCycle(run(6)); // 4 d 9 h left
    expect(await count("sub_expiring")).toBe(0);
    await runBillingCycle(run(7)); // 3 d 9 h left: no later than 3 days before
    expect(await count("sub_expiring")).toBe(1);
    expect((await last("sub_expiring")).autoRenew).toBe(true);
    await runBillingCycle(run(8)); // 2 d 9 h: not charged yet, no second reminder
    const s = await fresh();
    expect(s.renewAttempts).toBe(0);
    expect(await count("sub_expiring")).toBe(1);
  });

  test("declined card: first try 1–2 days before, past_due, one notification", async () => {
    await runBillingCycle(run(9)); // 1 d 9 h left
    const s = await fresh();
    expect(s).toMatchObject({ status: "past_due", renewAttempts: 1 });
    expect(s.graceUntil).not.toBeNull();
    expect(await count("payment_failed")).toBe(1);
  });

  test("tries are at least 20 h apart; the second one is on the last day", async () => {
    await runBillingCycle(run(9, 3));
    expect((await fresh()).renewAttempts).toBe(1);
    await runBillingCycle(run(10)); // 9 h left
    expect((await fresh()).renewAttempts).toBe(2);
    expect(await count("payment_failed")).toBe(1);
    // A card will be charged again, so no "access ends today" notice.
    expect(await count("sub_ending")).toBe(0);
  });

  test("in grace a working card renews from the old end, with a fiscal receipt", async () => {
    await db.paymentMethod.update({ where: { id: cardId }, data: { last4: "4417" } });
    await runBillingCycle(run(11)); // 15 h after the end
    const s = await fresh();
    expect(s).toMatchObject({ status: "active", renewAttempts: 0, notifiedSoonAt: null, graceUntil: null });
    expect(s.currentPeriodEnd.getTime()).toBeGreaterThan(end.getTime());
    expect(await count("renewed")).toBe(1);

    const inv = await db.invoice.findFirstOrThrow({ where: { userId: u.id, status: "paid" }, include: { transactions: true } });
    expect(inv.number.startsWith("UST-")).toBe(true);
    expect(inv.transactions[0]?.state).toBe("completed");
    expect(inv.periodStart?.getTime()).toBe(end.getTime());
    const rc = await db.receipt.findFirstOrThrow({ where: { invoiceId: inv.id } });
    expect(rc).toMatchObject({ fiscalStatus: "fiscalized", total: inv.amount, transactionId: inv.transactions[0].id, vatAmount: Math.round((inv.amount * 12) / 112) });
    expect(rc.fiscalSign).toBeTruthy();
    expect(JSON.parse(rc.items)[0].name.startsWith("Ustoz AI Plus, 1")).toBe(true);
  });

  test("cancelled: reminder, then 'ends today at…' on the last run, then Free with one notice", async () => {
    await db.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
    const end2 = (await fresh()).currentPeriodEnd;
    const lastRun = Math.floor((end2.getTime() - day0.getTime()) / DAY); // the run on the day of the end, at 05:00 UTC
    await runBillingCycle(run(lastRun - 3));
    expect(await count("sub_expiring")).toBe(2);
    expect((await last("sub_expiring")).autoRenew).toBe(false);

    await runBillingCycle(run(lastRun - 1));
    expect(await count("sub_ending")).toBe(0);
    await runBillingCycle(run(lastRun));
    expect(await count("sub_ending")).toBe(1);
    expect(await last("sub_ending")).toMatchObject({ when: "today", until: end2.toISOString() });
    await runBillingCycle(run(lastRun, 2));
    expect(await count("sub_ending")).toBe(1);
    expect(await db.invoice.count({ where: { userId: u.id } })).toBe(3);

    await runBillingCycle(run(lastRun + 1));
    expect((await fresh()).status).toBe("expired");
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).plan).toBe("FREE");
    expect(await count("sub_expired")).toBe(1);
  });

  test("no card: grace, then expired", async () => {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "active", cancelAtPeriodEnd: false, paymentMethodId: null, notifiedEndAt: null } });
    const s0 = await fresh();
    let s = await reconcile(s0, new Date(s0.currentPeriodEnd.getTime() + H));
    expect(s.status).toBe("past_due");
    expect(s.graceUntil).not.toBeNull();
    s = await reconcile(s, new Date(s.graceUntil!.getTime() + H));
    expect(s.status).toBe("expired");
  });
});
