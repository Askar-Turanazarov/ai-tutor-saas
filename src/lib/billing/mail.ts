import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

const from = () => process.env.MAIL_FROM || "Ustoz AI <no-reply@ustoz.local>";

/**
 * Sends an email through SMTP_URL. Without it (development) the message is written
 * as a real .eml file to `.mail/` so it can be opened in any mail client.
 */
export async function sendMail(to: string, subject: string, text: string, html: string) {
  const smtp = (process.env.SMTP_URL || "").trim();
  if (smtp) {
    await nodemailer.createTransport(smtp).sendMail({ from: from(), to, subject, text, html });
    return "smtp";
  }
  const info = await nodemailer
    .createTransport({ streamTransport: true, buffer: true, newline: "unix" })
    .sendMail({ from: from(), to, subject, text, html });
  const dir = path.join(process.cwd(), ".mail");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${to.replace(/[^a-z0-9@.-]/gi, "_")}.eml`);
  await writeFile(file, info.message as Buffer);
  console.log(`[mail] ${to}: ${subject} → ${path.relative(process.cwd(), file)}`);
  return "file";
}
