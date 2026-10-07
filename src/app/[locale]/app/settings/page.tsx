import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, isGuest } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/plans";
import { SettingsView } from "@/components/app/SettingsView";
import { botConfigured } from "@/lib/messaging/telegram";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("settings") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  // Demo inbox: the emails sent to this user (guests get none).
  const mail = isGuest(user) ? [] : await db.outboxMessage.findMany({ where: { userId: user.id, channel: "email" }, orderBy: { createdAt: "desc" }, take: 20 });
  return (
    <SettingsView
      name={user.name}
      email={user.email}
      level={user.level}
      pro={can(user, "allLevels")}
      plan={user.plan}
      phone={user.phone}
      phoneVerified={!!user.phoneVerifiedAt}
      telegram={user.telegramChatId ? { username: user.telegramUsername, since: user.telegramLinkedAt!.toISOString(), notify: user.notifyTelegram } : null}
      tgEmulator={!botConfigured()}
      mail={mail.map((m) => ({ id: m.id, channel: m.channel, to: m.to, subject: m.subject, body: m.body, status: m.status, error: m.error, at: m.createdAt.toISOString() }))}
    />
  );
}
