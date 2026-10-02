import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

const COOKIE = "ustoz_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

type SessionPayload = { uid: string; imp?: string };

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(uid: string, imp?: string) {
  const token = await new SignJWT({ uid, ...(imp ? { imp } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { uid: String(payload.uid), imp: payload.imp ? String(payload.imp) : undefined };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  return db.user.findUnique({ where: { id: s.uid } });
}

/** Guests are created by /api/guest so the app can be tried without signing up. */
export const GUEST_DOMAIN = "@guest.local";
export const isGuest = (u: { email: string }) => u.email.endsWith(GUEST_DOMAIN);

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
