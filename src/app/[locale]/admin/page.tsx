import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/billing/catalog";
import { AdminTitle } from "@/components/admin/AdminShell";
import { Overview } from "@/components/admin/Overview";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const since = new Date(Date.now() - 24 * 3600_000);

  const [users, pro, messages, quizzes, calls, ok, mock, payments, byModel] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { plan: { not: "FREE" } } }),
    db.message.count(),
    db.quizAttempt.count(),
    db.aILog.count({ where: { createdAt: { gte: since } } }),
    db.aILog.count({ where: { createdAt: { gte: since }, ok: true, NOT: { provider: "mock" } } }),
    db.aILog.count({ where: { createdAt: { gte: since }, provider: "mock" } }),
    db.invoice.findMany({
      where: { status: { not: "pending" } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
    db.aILog.groupBy({
      by: ["provider", "model", "ok"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _avg: { latencyMs: true },
    }),
  ]);
  // A fallback is any answer that wasn't produced on the first attempt.
  const fallbacks = await db.aILog.count({ where: { createdAt: { gte: since }, ok: true, attempt: { gt: 1 } } });

  const models = new Map<string, { id: string; ok: number; fail: number; avg: number }>();
  for (const r of byModel) {
    const id = `${r.provider}/${r.model}`;
    const m = models.get(id) ?? { id, ok: 0, fail: 0, avg: 0 };
    if (r.ok) {
      m.ok += r._count._all;
      m.avg = Math.round(r._avg.latencyMs ?? 0);
    } else m.fail += r._count._all;
    models.set(id, m);
  }

  return (
    <>
      <AdminTitle title={t("overview")} />
      <Overview
        stats={{ users, pro, messages, quizzes, calls, ok, fallbacks, mock }}
        payments={payments.map((p) => ({
          id: p.id,
          name: p.user.name,
          tier: p.tier,
          amount: formatMoney(p.amount, p.currency, locale),
          provider: p.provider,
          status: p.status,
        }))}
        models={[...models.values()].sort((a, b) => b.ok + b.fail - (a.ok + a.fail))}
      />
    </>
  );
}
