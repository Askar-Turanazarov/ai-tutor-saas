/** Starts the billing timer (renewals, reminders, expiry) inside the Node.js server process. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.BILLING_TIMER === "off") return;
  const g = globalThis as unknown as { __billingTimer?: ReturnType<typeof setInterval> };
  if (g.__billingTimer) return;
  const { runBillingCycle } = await import("./lib/billing/scheduler");
  const tick = () => runBillingCycle().catch((e) => console.error("[billing] cycle failed:", e));
  g.__billingTimer = setInterval(tick, 5 * 60_000);
  setTimeout(tick, 15_000);
}
