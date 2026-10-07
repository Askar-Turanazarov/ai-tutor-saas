// After deploy: points the bot at APP_URL — webhook with the secret, commands and the Mini App menu button.
import { env, tg } from "./tg-env.mjs";

const app = env("APP_URL").replace(/\/$/, "");
const secret = env("TELEGRAM_WEBHOOK_SECRET");
if (!app.startsWith("https://") || !secret) {
  console.error("Needs APP_URL (https://…) and TELEGRAM_WEBHOOK_SECRET");
  process.exit(1);
}
await tg("setWebhook", { url: `${app}/api/telegram/webhook`, secret_token: secret, allowed_updates: ["message", "callback_query"] });
await tg("setMyCommands", { commands: [{ command: "start", description: "Ustoz AI" }] });
await tg("setChatMenuButton", { menu_button: { type: "web_app", text: "Ustoz", web_app: { url: `${app}/ru/tg` } } });
console.log("Webhook:", (await tg("getWebhookInfo")).url);
console.log("Menu button → Mini App:", `${app}/ru/tg`);
