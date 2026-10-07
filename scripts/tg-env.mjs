// Reads TELEGRAM_* (and APP_URL) from the environment or .env, for the bot scripts.
import { existsSync, readFileSync } from "node:fs";

const file = existsSync(".env")
  ? Object.fromEntries(
      readFileSync(".env", "utf8")
        .split(/\r?\n/)
        .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]]),
    )
  : {};
export const env = (name) => (process.env[name] || file[name] || "").trim();

export const token = env("TELEGRAM_BOT_TOKEN");
if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN (from @BotFather) in .env");
  process.exit(1);
}
export async function tg(method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}
