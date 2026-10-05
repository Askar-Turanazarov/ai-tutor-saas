import { db } from "../db";
import { billingConfig, type PaymentProvider } from "./config";
import { cardTokenPayment } from "./click";
import { chargeStripeOffSession } from "./stripe";
import { retryFailedReceipts } from "./fiscal";
import { notify } from "./notify";
import { activatePaidInvoice, createInvoice, downgradeToFree, expireSubscription, failTransaction } from "./service";

const HOUR = 3_600_000;
/** Auto-renewal starts this long before the period ends. */
const RENEW_AHEAD_MS = 24 * HOUR;
const RENEW_RETRY_MS = 8 * HOUR;
const MAX_RENEW_ATTEMPTS = 3;

type Report = { renewed: number; renewFailed: number; reminded: number; expired: number; receipts: number; cleaned: number };

const g = globalThis as unknown as { __billingRunning?: boolean; __billingLastRun?: { at: string; report: Report } };

export const lastBillingRun = () => g.__billingLastRun ?? null;

/**
 * One pass of the billing engine. Safe to call any time and from several places
 * (timer, cron route, admin button): every step is idempotent.
 */
export async function runBillingCycle(): Promise<Report> {
  const report: Report = { renewed: 0, renewFailed: 0, reminded: 0, expired: 0, receipts: 0, cleaned: 0 };
  if (g.__billingRunning) return report;
  g.__billingRunning = true;
  try {
    const now = new Date();
    const cfg = await billingConfig();

    // 1. Auto-renewal with the saved card.
    const due = await db.subscription.findMany({
      where: {
        status: { in: ["active", "past_due"] },
        autoRenew: true,
        cardId: { not: null },
        currentPeriodEnd: { lte: new Date(now.getTime() + RENEW_AHEAD_MS) },
        renewAttempts: { lt: MAX_RENEW_ATTEMPTS },
        OR: [{ lastRenewAttemptAt: null }, { lastRenewAttemptAt: { lte: new Date(now.getTime() - RENEW_RETRY_MS) } }],
      },
      include: { card: true, user: true },
    });
    for (const sub of due) {
      if (!sub.card) continue;
      const amount = cfg.prices[sub.months as 1 | 3 | 12] * 100;
      const inv = await createInvoice({
        userId: sub.userId,
        subscriptionId: sub.id,
        kind: "renewal",
        provider: sub.provider as PaymentProvider,
        months: sub.months,
        amount,
        saveCard: false,
      });
      await db.subscription.update({ where: { id: sub.id }, data: { lastRenewAttemptAt: now, renewAttempts: { increment: 1 } } });
      try {
        let txId: string;
        if (sub.provider === "stripe") {
          if (!sub.user.stripeCustomerId) throw new Error("no Stripe customer");
          const pi = await chargeStripeOffSession({ customerId: sub.user.stripeCustomerId, paymentMethodId: sub.card.token, amount, invoiceId: inv.id, number: inv.number });
          if (pi.status !== "succeeded") throw new Error(`payment ${pi.status}`);
          txId = pi.id;
        } else {
          txId = (await cardTokenPayment(sub.card.token, amount, inv.id, sub.card.maskedPan)).paymentId;
        }
        await activatePaidInvoice(inv.id, { provider: sub.provider as PaymentProvider, providerTxId: txId });
        report.renewed++;
      } catch (e) {
        const error = (e as Error).message || "declined";
        await failTransaction({ invoiceId: inv.id, provider: sub.provider as PaymentProvider, providerTxId: `failed_${inv.id}`, error });
        await db.invoice.update({ where: { id: inv.id }, data: { status: "failed" } });
        await db.subscription.update({ where: { id: sub.id }, data: { status: "past_due" } });
        if (sub.renewAttempts === 0) {
          await notify(sub.userId, "payment_failed", { amount: amount / 100, until: sub.currentPeriodEnd!.toISOString() });
        }
        report.renewFailed++;
      }
    }

    // 2. Reminder before the end (also tells auto-renew users when and how much will be charged).
    const soon = await db.subscription.findMany({
      where: {
        status: { in: ["active", "past_due"] },
        notifiedSoonAt: null,
        currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + cfg.noticeDays * 24 * HOUR) },
      },
      include: { card: true },
    });
    for (const sub of soon) {
      const auto = sub.autoRenew && !!sub.card;
      await notify(sub.userId, "sub_expiring", {
        until: sub.currentPeriodEnd!.toISOString(),
        autoRenew: auto,
        amount: cfg.prices[sub.months as 1 | 3 | 12],
        months: sub.months,
        card: sub.card?.maskedPan ?? "",
      });
      await db.subscription.update({ where: { id: sub.id }, data: { notifiedSoonAt: now } });
      report.reminded++;
    }

    // 3. Expired subscriptions: back to Free, with a notification.
    const ended = await db.subscription.findMany({ where: { status: { in: ["active", "past_due"] }, currentPeriodEnd: { lte: now } } });
    for (const sub of ended) {
      await expireSubscription(sub.id);
      report.expired++;
    }
    // Pro with an end date but no running subscription (e.g. it was cancelled by hand).
    const orphans = await db.user.findMany({ where: { plan: "PRO", proUntil: { lte: now } } });
    for (const u of orphans) {
      await downgradeToFree(u.id);
      await notify(u.id, "sub_expired", {});
      report.expired++;
    }

    // 4. Abandoned checkouts.
    const stale = new Date(now.getTime() - 24 * HOUR);
    const voided = await db.invoice.updateMany({ where: { status: "open", createdAt: { lt: stale } }, data: { status: "void" } });
    const dropped = await db.subscription.updateMany({ where: { status: "pending", createdAt: { lt: stale } }, data: { status: "canceled", canceledAt: now } });
    report.cleaned = voided.count + dropped.count;

    // 5. Receipts that the OFD hasn't accepted yet.
    report.receipts = await retryFailedReceipts();

    g.__billingLastRun = { at: now.toISOString(), report };
    return report;
  } finally {
    g.__billingRunning = false;
  }
}
