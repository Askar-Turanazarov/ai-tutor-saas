// Forwards Stripe test webhooks to the local dev server, using STRIPE_SECRET_KEY from .env (no `stripe login` needed).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const key = process.env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_test_")) {
  console.error("Set a test key (sk_test_…) in STRIPE_SECRET_KEY in .env");
  process.exit(1);
}
const port = process.env.PORT || "3000";
// winget installs here; a shell opened before the install doesn't have it on PATH yet.
const winget = join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Links", "stripe.exe");
const bin = process.platform === "win32" && existsSync(winget) ? `"${winget}"` : "stripe";
// The events handled in src/app/api/payments/stripe/webhook/route.ts.
const events = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
].join(",");
const child = spawn(bin, ["listen", "--events", events, "--forward-to", `localhost:${port}/api/payments/stripe/webhook`], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, STRIPE_API_KEY: key },
});
child.on("exit", (code) => process.exit(code ?? 0));
