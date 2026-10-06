import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { handleStripeEvent, stripe } from "@/lib/billing/providers/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. The raw body is verified against `stripe-signature` (STRIPE_WEBHOOK_SECRET);
 * every event id is stored, so a redelivered event is acknowledged without being applied twice.
 * Locally: `npm run stripe:listen`.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const eventId = `stripe:${event.id}`;
  if (await db.webhookEvent.findUnique({ where: { eventId } })) return NextResponse.json({ received: true, duplicate: true });
  const log = await db.webhookEvent.create({ data: { provider: "stripe", eventId, type: event.type, payload: body.slice(0, 20_000) } });

  try {
    await handleStripeEvent(event);
    await db.webhookEvent.update({ where: { id: log.id }, data: { processedAt: new Date() } });
  } catch (e) {
    // 500 makes Stripe retry later; the log row is removed so the retry isn't taken for a duplicate.
    console.error(`[stripe] ${event.type} ${event.id}:`, (e as Error).message);
    await db.webhookEvent.delete({ where: { id: log.id } }).catch(() => null);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
