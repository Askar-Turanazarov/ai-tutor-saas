import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { smtpConfigured } from "@/lib/messaging/mail";
import { AdminTitle } from "@/components/admin/AdminShell";
import { OutboxAdmin } from "@/components/admin/OutboxAdmin";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const rows = await db.outboxMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <AdminTitle title={t("outbox")} hint={t("outboxHint")} />
      <OutboxAdmin smtp={smtpConfigured()} items={rows.map((m) => ({ id: m.id, channel: m.channel, to: m.to, subject: m.subject, body: m.body, status: m.status, error: m.error, at: m.createdAt.toISOString() }))} />
    </>
  );
}
