"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, getSession, hashPassword, isGuest, verifyPassword } from "@/lib/auth";
import { sendVerifyEmail } from "@/lib/account/emails";
import { termsAccepted } from "@/lib/legal";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export type AuthState = { error?: string; fields?: Record<string, string> } | undefined;

const RegisterSchema = z.object({
  name: z.string().trim().min(1, "errName").max(60),
  email: z.string().trim().toLowerCase().email("errEmail"),
  password: z.string().min(6, "errShort"),
});

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { name: raw.name, email: raw.email } };
  const { name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "errExists", fields: { name, email } };
  const locale = await getLocale();
  const passwordHash = await hashPassword(password);
  // A guest who signs up keeps everything they've done so far.
  const current = await getCurrentUser();
  if (current && isGuest(current)) {
    const upgraded = await db.user.update({ where: { id: current.id }, data: { name, email, passwordHash, ...termsAccepted() } });
    await sendVerifyEmail(upgraded);
    redirect({ href: current.onboarded ? "/app" : "/onboarding", locale });
  }
  const user = await db.user.create({ data: { name, email, passwordHash, locale, ...termsAccepted() } });
  await sendVerifyEmail(user);
  await createSession(user.id);
  redirect({ href: "/onboarding", locale });
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "errInvalid", fields: { email } };
  await createSession(user.id);
  const locale = await getLocale();
  redirect({ href: user.role === "ADMIN" ? "/admin" : user.onboarded ? "/app" : "/onboarding", locale });
}

export async function logout() {
  await destroySession();
  redirect({ href: "/", locale: await getLocale() });
}

/** Ends an admin's "log in as" session and returns to the admin panel. */
export async function stopImpersonating() {
  const s = await getSession();
  if (s?.imp) await createSession(s.imp);
  redirect({ href: "/admin/users", locale: await getLocale() });
}
