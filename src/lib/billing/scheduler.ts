import "server-only";
import { db } from "../db";
import { getAllSettings } from "../settings";
import { tierLabel, type PaidTier, type Period } from "./catalog";
import { notify } from "./notify";
import { RENEW_AHEAD, autoRenews, isForever, priceFor, reconcile, syncUserPlan } from "./subscription";

const HOUR = 60 * 60 * 1000;

export type BillingReport = { checked: number; renewed: number; failed: number; expired: number; reminded: number; cleaned: number; receipts: number };

const g = globalThis as unknown as { __billingRunning?: boolean; __billingLastRun?: { at: string; report: BillingReport } };

export const lastBillingRun = () => g.__billingLastRun ?? null;

/**
 * One pass of the billing engine: auto-renewals (from 24 h before the end), reminders,
 * expiry, abandoned checkouts. Runs from the timer in instrumentation.ts, GET /api/cron/billing
 * and the admin button; every step is idempotent, and a pass already running is skipped.
 */
export async function runBillingCycle(now = new Date()): Promise<BillingReport> {
  const report: BillingReport = { checked: 0, renewed: 0, failed: 0, expired: 0, reminded: 0, cleaned: 0, receipts: 0 };
  if (g.__billingRunning) return report;
  g.__billingRunning = true;
  try {
    const s = await getAllSettings();

    // 1. Renewals and expiry.
    const due = await db.subscription.findMany({
      where: { status: { in: ["active", "trialing", "past_due"] }, currentPeriodEnd: { lte: new Date(now.getTime() + RENEW_AHEAD) } },
    });
    for (const sub of due) {
      report.checked++;
      const after = await reconcile(sub, now, { early: true });
      if (after.currentPeriodEnd > sub.currentPeriodEnd) report.renewed++;
      else if (after.status === "expired") report.expired++;
      else if (after.renewAttempts > sub.renewAttempts && after.status === "past_due") report.failed++;
      await syncUserPlan(sub.userId);
    }

    // 2. Reminder before the end: when and how much will be charged, or that access is about to end.
    const noticeDays = Number(s["billing.noticeDays"]) || 3;
    const soon = await db.subscription.findMany({
      where: {
        status: { in: ["active", "trialing", "past_due"] },
        notifiedSoonAt: null,
        currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + noticeDays * 24 * HOUR) },
      },
      include: { paymentMethod: true },
    });
    for (const sub of soon) {
      if (isForever(sub)) continue;
      const tier = (sub.pendingTier ?? sub.tier) as PaidTier;
      const months = (sub.pendingPeriod ?? sub.period) as Period;
      await notify(sub.userId, "sub_expiring", {
        tier: tierLabel(sub.tier),
        until: sub.currentPeriodEnd.toISOString(),
        trial: sub.status === "trialing",
        autoRenew: autoRenews(sub),
        amount: await priceFor(tier, months),
        months,
        card: sub.paymentMethod ? `•• ${sub.paymentMethod.last4}` : "",
      });
      await db.subscription.update({ where: { id: sub.id }, data: { notifiedSoonAt: now } });
      report.reminded++;
    }

    // 3. Checkouts abandoned for a day are no longer payable.
    const stale = new Date(now.getTime() - 24 * HOUR);
    const voided = await db.invoice.updateMany({ where: { status: "pending", createdAt: { lt: stale } }, data: { status: "canceled" } });
    await db.transaction.updateMany({ where: { state: { in: ["created", "prepared"] }, createdAt: { lt: stale } }, data: { state: "canceled" } });
    report.cleaned = voided.count;

    g.__billingLastRun = { at: now.toISOString(), report };
    return report;
  } finally {
    g.__billingRunning = false;
  }
}
