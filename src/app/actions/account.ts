"use server";

import { z } from "zod";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { createSession, getCurrentUser, hashPassword, isGuest } from "@/lib/auth";
import { consumeToken, issuedRecently } from "@/lib/account/tokens";
import { sendResetEmail, sendVerifyEmail } from "@/lib/account/emails";
import { redirect } from "@/i18n/navigation";

export type ForgotState = { error?: "errEmail"; sent?: boolean; email?: string } | undefined;
export type ResetState = { error?: "errShort" | "invalid" } | undefined;

/**
 * Sends a reset link. The answer is the same whether or not the account exists, so the form
 * can't be used to find out who is registered; at most one email a minute per account.
 */
export async function requestPasswordReset(_: ForgotState, form: FormData): Promise<ForgotState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "errEmail", email };
  const user = await db.user.findUnique({ where: { email } });
  if (user && !isGuest(user) && !(await issuedRecently(user.id, "reset"))) await sendResetEmail(user);
  return { sent: true, email };
}

/** Sets a new password from a reset link, ends every other session and signs in. */
export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 6) return { error: "errShort" };
  const userId = await consumeToken(String(form.get("token") ?? ""), "reset");
  if (!userId) return { error: "invalid" };
  const user = await db.user.update({
    where: { id: userId },
    // The link came by email, so the address is confirmed too.
    data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 }, emailVerifiedAt: new Date() },
  });
  await db.authToken.deleteMany({ where: { userId, kind: "reset", usedAt: null } });
  await createSession(user.id);
  redirect({ href: user.role === "ADMIN" ? "/admin" : user.onboarded ? "/app" : "/onboarding", locale: await getLocale() });
}

/** Sends the confirmation email again (once a minute). */
export async function resendVerification(): Promise<{ ok: true } | { error: "wait" | "done" | "guest" }> {
  const user = await getCurrentUser();
  if (!user || isGuest(user)) return { error: "guest" };
  if (user.emailVerifiedAt) return { error: "done" };
  if (await issuedRecently(user.id, "verify")) return { error: "wait" };
  await sendVerifyEmail(user);
  return { ok: true };
}
