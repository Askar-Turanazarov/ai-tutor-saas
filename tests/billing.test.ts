import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import * as S from "@/lib/billing/subscription";
import { limitsOf } from "@/lib/billing/limits";
import { makeUser, userWithSub } from "./helpers";

const past = () => new Date(Date.now() - 1000);

// One scenario in order: the steps share the user and the subscription.
describe("subscription lifecycle", () => {
  let u: User;
  beforeAll(async () => {
    u = await makeUser();
  });
  afterAll(async () => {
    await db.user.delete({ where: { id: u.id } });
  });

  test("trial gives Pro once, then expires to Free with the level clamped", async () => {
    expect((await limitsOf(u)).dailyMinutes).toBe(15);
    expect("ok" in (await S.startTrial(u.id))).toBe(true);
    let x = await userWithSub(u.id);
    expect(x.plan).toBe("PRO");
    expect((await limitsOf(x)).dailyMinutes).toBeNull();
    expect("error" in (await S.startTrial(u.id))).toBe(true);
    await db.subscription.update({ where: { userId: u.id }, data: { currentPeriodEnd: past() } });
    x = await S.reconcileUser(await userWithSub(u.id));
    expect(x).toMatchObject({ plan: "FREE", level: "A2" });
    expect(x.subscription?.status).toBe("expired");
  });

  test("paying, upgrading and cancelling", async () => {
    expect(await S.quote(u.id, "PLUS", 3, "UZS")).toMatchObject({ amount: 132000, kind: "new" });
    const inv = await S.createInvoice(u, { tier: "PLUS", period: 1, provider: "card", currency: "UZS" });
    await S.applyPaidInvoice(inv.id, { txId: "t1" });
    await S.applyPaidInvoice(inv.id, { txId: "t1" }); // idempotent
    let x = await userWithSub(u.id);
    expect(x.plan).toBe("PLUS");
    expect(x.subscription?.status).toBe("active");

    expect(await S.quote(u.id, "PRO", 1, "UZS")).toMatchObject({ kind: "upgrade", amount: 40000 });
    const endBefore = x.subscription!.currentPeriodEnd.getTime();
    await S.applyPaidInvoice((await S.createInvoice(u, { tier: "PRO", period: 12, provider: "card", currency: "UZS" })).id);
    x = await userWithSub(u.id);
    expect(x.plan).toBe("PRO");
    expect(x.subscription!.period).toBe(1);
    expect(x.subscription!.currentPeriodEnd.getTime()).toBe(endBefore);

    await S.setCancelAtPeriodEnd(u.id, true);
    await db.subscription.update({ where: { userId: u.id }, data: { currentPeriodEnd: past() } });
    expect((await S.reconcileUser(await userWithSub(u.id))).plan).toBe("FREE");
  });

  test("auto-renewal with a saved card keeps the card and anchor and applies a downgrade", async () => {
    const pm = await db.paymentMethod.create({ data: { userId: u.id, provider: "card", brand: "uzcard", last4: "4242", expMonth: 12, expYear: 2030, token: "tok" } });
    await S.applyPaidInvoice((await S.createInvoice(u, { tier: "PRO", period: 1, provider: "card", currency: "UZS" })).id, { paymentMethodId: pm.id });
    const oldEnd = past();
    await db.subscription.update({ where: { userId: u.id }, data: { currentPeriodEnd: oldEnd, pendingTier: "PLUS", pendingPeriod: 1 } });
    const x = await S.reconcileUser(await userWithSub(u.id));
    expect(x.plan).toBe("PLUS");
    expect(x.subscription).toMatchObject({ status: "active", paymentMethodId: pm.id });
    expect(x.subscription!.currentPeriodStart.getTime()).toBe(oldEnd.getTime());

    await db.subscription.update({ where: { userId: u.id }, data: { paymentMethodId: null } });
    await S.setCancelAtPeriodEnd(u.id, true);
    await db.subscription.update({ where: { userId: u.id }, data: { currentPeriodEnd: past() } });
    await S.reconcileUser(await userWithSub(u.id));
  });

  test("without a card: past_due with grace, then Free", async () => {
    await S.applyPaidInvoice((await S.createInvoice(u, { tier: "PRO", period: 1, provider: "click", currency: "UZS" })).id);
    await db.subscription.update({ where: { userId: u.id }, data: { currentPeriodEnd: past() } });
    let x = await S.reconcileUser(await userWithSub(u.id));
    expect(x.plan).toBe("PRO");
    expect(x.subscription?.status).toBe("past_due");
    await db.subscription.update({ where: { userId: u.id }, data: { graceUntil: past() } });
    x = await S.reconcileUser(await userWithSub(u.id));
    expect(x.plan).toBe("FREE");
    expect(x.subscription?.status).toBe("expired");
  });
});
