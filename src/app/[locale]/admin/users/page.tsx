import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { tashkentDate } from "@/lib/time";
import { AdminTitle } from "@/components/admin/AdminShell";
import { UsersTable } from "@/components/admin/UsersTable";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const me = await getCurrentUser();
  const [users, usage] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" } }),
    db.dailyUsage.findMany({ where: { date: tashkentDate() } }),
  ]);
  const used = new Map(usage.map((u) => [u.userId, u.seconds]));

  return (
    <>
      <AdminTitle title={t("users")} />
      <UsersTable
        meId={me?.id ?? ""}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          plan: u.plan,
          level: u.level,
          xp: u.xp,
          seconds: used.get(u.id) ?? 0,
          requested: u.upgradeRequested,
          created: u.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
