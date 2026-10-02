import { NextResponse } from "next/server";
import { handleStripeEvent, stripe } from "@/lib/billing/providers/stripe";

/** Stripe webhook: the signature is checked against the raw body. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "not configured" }, { status: 400 });

  let event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (e) {
    console.error("[stripe] webhook", event.type, e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
