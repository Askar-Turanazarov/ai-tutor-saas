import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../db";

export type TokenKind = "verify" | "reset" | "tg_link";

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Issues a one-time token (only its hash is stored); earlier unused tokens of the same kind stop working. */
export async function issueToken(userId: string, kind: TokenKind, ttlMs: number) {
  const raw = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, kind, usedAt: null } }),
    db.authToken.create({ data: { userId, kind, tokenHash: hash(raw), expiresAt: new Date(Date.now() + ttlMs) } }),
  ]);
  return raw;
}

/** The token's user id if it is valid, without using it up. */
export async function peekToken(raw: string, kind: TokenKind) {
  if (!raw) return null;
  const t = await db.authToken.findUnique({ where: { tokenHash: hash(raw) } });
  return t && t.kind === kind && !t.usedAt && t.expiresAt > new Date() ? t.userId : null;
}

/** Uses the token up and returns its user id, or null if it is unknown, used or expired. Safe against double use. */
export async function consumeToken(raw: string, kind: TokenKind) {
  if (!raw) return null;
  const tokenHash = hash(raw);
  const { count } = await db.authToken.updateMany({ where: { tokenHash, kind, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  if (!count) return null;
  return (await db.authToken.findUniqueOrThrow({ where: { tokenHash } })).userId;
}

/** True if a token of this kind was issued for the user within the last `ms` (simple resend throttle). */
export async function issuedRecently(userId: string, kind: TokenKind, ms = 60_000) {
  return !!(await db.authToken.findFirst({ where: { userId, kind, createdAt: { gt: new Date(Date.now() - ms) } } }));
}
