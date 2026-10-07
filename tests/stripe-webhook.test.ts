import { describe, expect, test } from "vitest";
import { stripe } from "@/lib/billing/providers/stripe";
import { POST } from "@/app/api/payments/stripe/webhook/route";

// Signed locally with the test webhook secret: no request reaches Stripe.
const send = (body: string, signature: string) =>
  POST(new Request("http://localhost/api/payments/stripe/webhook", { method: "POST", headers: { "stripe-signature": signature }, body }));

describe("Stripe webhook", () => {
  test("rejects a bad signature", async () => {
    const res = await send(JSON.stringify({ id: "evt_bad", type: "ping" }), "t=1,v1=deadbeef");
    expect(res.status).toBe(400);
  });

  test("accepts a signed event once, then reports a duplicate", async () => {
    const body = JSON.stringify({ id: `evt_test_${Date.now()}`, object: "event", type: "customer.created", data: { object: {} } });
    const signature = stripe().webhooks.generateTestHeaderString({ payload: body, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    expect(await (await send(body, signature)).json()).toEqual({ received: true });
    expect(await (await send(body, signature)).json()).toEqual({ received: true, duplicate: true });
  });
});
