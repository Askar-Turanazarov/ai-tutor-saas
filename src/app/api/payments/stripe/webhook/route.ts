import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyStripeEvent, type Stripe } from "@/lib/billing/stripe";
import { completeStripeSession, failTransaction } from "@/lib/billing/service";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. The raw body is verified against `stripe-signature` (STRIPE_WEBHOOK_SECRET);
 * every event id is stored, so a redelivered event is acknowledged without being applied twice.
 * Locally: `stripe listen --forward-to localhost:3000/api/payments/stripe/webhook`.
 */
export async function POST(req: Request) {
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = verifyStripeEvent(body, req.headers.get("stripe-signature"));
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${(e as Error).message}` }, { status: 400 });
  }

  const eventId = `stripe:${event.id}`;
  if (await db.webhookEvent.findUnique({ where: { eventId } })) return NextResponse.json({ received: true, duplicate: true });
  const log = await db.webhookEvent.create({ data: { provider: "stripe", eventId, type: event.type, payload: body.slice(0, 20_000) } });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object;
        if (s.payment_status === "paid") await completeStripeSession(s);
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const s = event.data.object;
        const invoiceId = s.metadata?.invoiceId;
        if (invoiceId) await failTransaction({ invoiceId, provider: "stripe", providerTxId: s.id, error: event.type });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const invoiceId = pi.metadata?.invoiceId;
        // Renewals record their own failure synchronously; this covers declines inside Checkout.
        if (invoiceId && pi.metadata?.kind !== "renewal") {
          await failTransaction({ invoiceId, provider: "stripe", providerTxId: pi.id, error: pi.last_payment_error?.message ?? "payment failed" });
        }
        break;
      }
    }
    await db.webhookEvent.update({ where: { id: log.id }, data: { processedAt: new Date() } });
  } catch (e) {
    // 500 makes Stripe retry later; the log row is removed so the retry isn't taken for a duplicate.
    console.error(`[stripe] ${event.type} ${event.id}:`, (e as Error).message);
    await db.webhookEvent.delete({ where: { id: log.id } }).catch(() => {});
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
