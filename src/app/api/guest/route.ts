import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { createSession, getCurrentUser, GUEST_DOMAIN, hashPassword } from "@/lib/auth";
import { routing } from "@/i18n/routing";

const GUEST_NAME: Record<string, string> = { ru: "Гость", en: "Guest", uz: "Mehmon" };

/**
 * Try-it-now entry: signs the visitor in as a fresh guest account (Free plan),
 * so nobody has to register before talking to the tutor.
 */
export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("locale") ?? "";
  const locale = (routing.locales as readonly string[]).includes(param) ? param : routing.defaultLocale;

  const existing = await getCurrentUser();
  if (existing) {
    const to = existing.role === "ADMIN" ? "admin" : existing.onboarded ? "app" : "onboarding";
    return NextResponse.redirect(new URL(`/${locale}/${to}`, req.url));
  }

  const id = randomBytes(6).toString("hex");
  const user = await db.user.create({
    data: {
      name: GUEST_NAME[locale] ?? "Guest",
      email: `guest-${id}${GUEST_DOMAIN}`,
      passwordHash: await hashPassword(randomBytes(16).toString("hex")),
      locale,
    },
  });
  await createSession(user.id);
  return NextResponse.redirect(new URL(`/${locale}/onboarding`, req.url));
}
