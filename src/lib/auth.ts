import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { reconcileUser } from "./billing/subscription";

const COOKIE = "ustoz_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

type SessionPayload = { uid: string; imp?: string; sv: number };

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/** Signs the session cookie; it carries the user's sessionVersion, so a password reset ends older sessions. */
export async function createSession(uid: string, imp?: string) {
  const { sessionVersion: sv } = await db.user.findUniqueOrThrow({ where: { id: uid }, select: { sessionVersion: true } });
  const token = await new SignJWT({ uid, sv, ...(imp ? { imp } : {}) })
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
    return { uid: String(payload.uid), imp: payload.imp ? String(payload.imp) : undefined, sv: Number(payload.sv ?? 0) };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  const user = await db.user.findUnique({ where: { id: s.uid }, include: { subscription: true } });
  if (user && user.sessionVersion !== s.sv) return null;
  // Renewals and expiry are applied lazily, so the plan is always right without a cron job.
  return user ? reconcileUser(user) : null;
}

/** Guests are created by /api/guest so the app can be tried without signing up. */
export const GUEST_DOMAIN = "@guest.local";
export const isGuest = (u: { email: string }) => u.email.endsWith(GUEST_DOMAIN);

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
