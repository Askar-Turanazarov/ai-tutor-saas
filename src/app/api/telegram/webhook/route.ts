import { timingSafeEqual } from "node:crypto";
import { botConfigured, handleUpdate, type TgUpdate } from "@/lib/messaging/telegram";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Bot updates from Telegram (setWebhook with secret_token) or from `npm run tg:poll` locally. */
export async function POST(req: Request) {
  const secret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (!botConfigured() || !secret) return new Response("Telegram bot is not configured", { status: 404 });
  if (!same(req.headers.get("x-telegram-bot-api-secret-token") ?? "", secret)) return new Response("Forbidden", { status: 403 });
  let update: TgUpdate;
  try {
    update = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  try {
    await handleUpdate(update);
  } catch (e) {
    // Telegram retries non-200 answers forever; a broken update is logged and dropped.
    console.error("[telegram]", (e as Error).message);
  }
  return Response.json({ ok: true });
}
