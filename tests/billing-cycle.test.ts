import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { Subscription, User } from "@prisma/client";
import { db } from "@/lib/db";
import { runBillingCycle } from "@/lib/billing/scheduler";
import { reconcile } from "@/lib/billing/subscription";
import { makeUser } from "./helpers";

const H = 3_600_000;

// One scenario in order: the steps share the subscription and the clock.
describe("billing cycle with a moving clock", () => {
  let u: User;
  let sub: Subscription;
  let cardId: string;
  const end = new Date(Date.now() + 48 * H);
  const at = (h: number, from = end) => new Date(from.getTime() + h * H);
  const fresh = () => db.subscription.findUniqueOrThrow({ where: { id: sub.id } });
  const count = (type: string) => db.notification.count({ where: { userId: u.id, type } });

  beforeAll(async () => {
    u = await makeUser({ plan: "PLUS" });
    // Mock card …1111 declines renewals, …4417 goes through.
    cardId = (await db.paymentMethod.create({ data: { userId: u.id, provider: "card", brand: "uzcard", last4: "1111", expMonth: 12, expYear: 2030, token: "t" } })).id;
    sub = await db.subscription.create({
      data: { userId: u.id, tier: "PLUS", period: 1, status: "active", provider: "card", currentPeriodStart: at(-30 * 24), currentPeriodEnd: end, paymentMethodId: cardId },
    });
  });
  afterAll(async () => {
    await db.user.delete({ where: { id: u.id } });
  });

  test("reminder before charging, saying it will auto-renew", async () => {
    const r = await runBillingCycle(at(-47));
    const s = await fresh();
    expect(r.reminded).toBeGreaterThanOrEqual(1);
    expect(s.notifiedSoonAt).not.toBeNull();
    expect(s.renewAttempts).toBe(0);
    const n = await db.notification.findFirstOrThrow({ where: { userId: u.id, type: "sub_expiring" } });
    expect(JSON.parse(n.params).autoRenew).toBe(true);
  });

  test("declined card: past_due, one notification, retry waits", async () => {
    await runBillingCycle(at(-23));
    let s = await fresh();
    expect(s).toMatchObject({ status: "past_due", renewAttempts: 1 });
    expect(s.graceUntil).not.toBeNull();
    expect(await count("payment_failed")).toBe(1);
    await runBillingCycle(at(-20));
    s = await fresh();
    expect(s.renewAttempts).toBe(1);
  });

  test("a working card renews from the old end, with a fiscal receipt", async () => {
    await db.paymentMethod.update({ where: { id: cardId }, data: { last4: "4417" } });
    await runBillingCycle(at(-14));
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

  test("cancelled: no charge, expires to Free with one notice", async () => {
    await db.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
    const end2 = (await fresh()).currentPeriodEnd;
    await runBillingCycle(at(-10, end2));
    expect(await db.invoice.count({ where: { userId: u.id } })).toBe(2);
    await runBillingCycle(at(1, end2));
    expect((await fresh()).status).toBe("expired");
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).plan).toBe("FREE");
    expect(await count("sub_expired")).toBe(1);
  });

  test("no card: grace, then expired", async () => {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "active", cancelAtPeriodEnd: false, paymentMethodId: null, notifiedEndAt: null } });
    const s0 = await fresh();
    let s = await reconcile(s0, at(1, s0.currentPeriodEnd));
    expect(s.status).toBe("past_due");
    expect(s.graceUntil).not.toBeNull();
    s = await reconcile(s, at(1, s.graceUntil!));
    expect(s.status).toBe("expired");
  });
});
