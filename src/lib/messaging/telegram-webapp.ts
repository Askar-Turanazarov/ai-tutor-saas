import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { billingData } from "../billing/overview";

export type WebAppUser = { id: number; username?: string; first_name?: string; language_code?: string };

/**
 * Checks Telegram.WebApp.initData: secret = HMAC("WebAppData", botToken), hash = HMAC(secret, data_check_string),
 * where data_check_string is the sorted `key=value` pairs without `hash`, joined by "\n". Data older than maxAge is refused.
 */
export function verifyInitData(initData: string, botToken: string, maxAgeSec = 86_400, now = Date.now()): WebAppUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !botToken) return null;
  params.delete("hash");
  const check = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const want = Buffer.from(createHmac("sha256", secret).update(check).digest("hex"));
  if (hash.length !== want.length || !timingSafeEqual(Buffer.from(hash), want)) return null;
  const authDate = Number(params.get("auth_date"));
  if (!authDate || now / 1000 - authDate > maxAgeSec) return null;
  try {
    const user = JSON.parse(params.get("user") || "null") as WebAppUser | null;
    return user && typeof user.id === "number" ? user : null;
  } catch {
    return null;
  }
}

/** Everything the Mini App shows, as plain JSON. */
export async function miniAppData(userId: string) {
  const [user, billing, notes] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    billingData(userId),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return {
    profile: { name: user.name, email: user.email, level: user.level, xp: user.xp, streak: user.streak, locale: user.locale },
    tier: billing.tier,
    sub: billing.sub,
    next: billing.next,
    invoices: billing.invoices.slice(0, 5),
    notifications: notes.map((n) => ({ id: n.id, type: n.type, params: n.params, createdAt: n.createdAt.toISOString(), read: !!n.readAt })),
  };
}

export type MiniAppData = Awaited<ReturnType<typeof miniAppData>>;
