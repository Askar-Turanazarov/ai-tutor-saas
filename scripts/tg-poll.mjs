// Local bot without a public URL: long-polls Telegram and forwards each update to the dev server's
// webhook, like scripts/stripe-listen.mjs does for Stripe. Removes a webhook set by tg:setup, if any.
import { env, tg } from "./tg-env.mjs";

const secret = env("TELEGRAM_WEBHOOK_SECRET");
if (!secret) {
  console.error("Set TELEGRAM_WEBHOOK_SECRET in .env (any random string)");
  process.exit(1);
}
const target = `http://localhost:${process.env.PORT || "3000"}/api/telegram/webhook`;
await tg("deleteWebhook");
const me = await tg("getMe");
console.log(`@${me.username}: forwarding updates to ${target} (Ctrl+C to stop)`);

let offset = 0;
for (;;) {
  try {
    const updates = await tg("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] });
    for (const u of updates) {
      offset = u.update_id + 1;
      const res = await fetch(target, {
        method: "POST",
        headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret },
        body: JSON.stringify(u),
      });
      console.log(
        new Date().toLocaleTimeString(),
        u.message?.text ?? (u.message?.contact ? "[contact]" : u.callback_query ? "[button]" : "[update]"),
        "→",
        res.status,
      );
    }
  } catch (e) {
    console.error(e.message);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
