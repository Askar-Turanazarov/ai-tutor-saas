import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, isGuest } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/account/phone";
import { botConfigured, emulatorChatId } from "@/lib/messaging/telegram";
import { TelegramEmulator } from "@/components/app/TelegramEmulator";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "tgEmu" });
  return { title: t("title") };
}

/** In-app stand-in for the Telegram chat with the bot, while TELEGRAM_BOT_TOKEN is not set. */
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ start?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  if (isGuest(user) || botConfigured()) return redirect({ href: "/app/settings", locale });
  const messages = await db.outboxMessage.findMany({
    where: { channel: "telegram", to: emulatorChatId(user.id) },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return (
    <TelegramEmulator
      start={(await searchParams).start ?? null}
      phone={user.phone ? formatPhone(user.phone) : "+998 90 123 45 67"}
      messages={messages.map((m) => ({ id: m.id, text: m.body, markup: m.meta, at: m.createdAt.toISOString() }))}
    />
  );
}
