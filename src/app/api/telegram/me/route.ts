import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isGuest } from "@/lib/auth";
import { miniAppData, verifyInitData } from "@/lib/messaging/telegram-webapp";

/**
 * Data for the Telegram Mini App. The caller proves who they are with signed `initData`; the account is the one
 * whose linked chat is this Telegram user. In development `{ dev: true }` uses the site session instead.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { initData?: string; dev?: boolean };

  if (body.dev && process.env.NODE_ENV !== "production") {
    const user = await getCurrentUser();
    if (!user || isGuest(user)) return NextResponse.json({ linked: false });
    return NextResponse.json({ linked: true, data: await miniAppData(user.id) });
  }

  const tgUser = body.initData ? verifyInitData(body.initData, (process.env.TELEGRAM_BOT_TOKEN || "").trim()) : null;
  if (!tgUser) return NextResponse.json({ error: "auth" }, { status: 401 });
  const user = await db.user.findUnique({ where: { telegramChatId: String(tgUser.id) }, select: { id: true } });
  if (!user) return NextResponse.json({ linked: false });
  return NextResponse.json({ linked: true, data: await miniAppData(user.id) });
}
