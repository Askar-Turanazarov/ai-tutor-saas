import "server-only";
import nodemailer from "nodemailer";
import { db } from "../db";

const from = () => process.env.MAIL_FROM || "Ustoz AI <no-reply@ustoz.local>";
export const smtpConfigured = () => !!(process.env.SMTP_URL || "").trim();

/**
 * Sends an email and logs it to the outbox. With SMTP_URL it goes out through SMTP; without it the
 * message is only stored (status "emulated") and can be read in the admin outbox or by the recipient
 * in their settings. Throws when SMTP fails, after logging the failure.
 */
export async function sendMail(m: { to: string; subject: string; text: string; html: string; userId?: string }) {
  const log = (status: string, error?: string) =>
    db.outboxMessage.create({ data: { userId: m.userId, channel: "email", to: m.to, subject: m.subject, body: m.html, status, error } });
  if (!smtpConfigured()) {
    await log("emulated");
    return "emulated" as const;
  }
  try {
    await nodemailer.createTransport(process.env.SMTP_URL!.trim()).sendMail({ from: from(), to: m.to, subject: m.subject, text: m.text, html: m.html });
  } catch (e) {
    await log("failed", (e as Error).message.slice(0, 500));
    throw e;
  }
  await log("sent");
  return "sent" as const;
}
