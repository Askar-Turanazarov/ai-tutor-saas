import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import { PROVIDERS, breakerState, latencyState, providerModels } from "@/lib/ai/router";
import { isProTier } from "@/lib/ai/rank";
import { AdminTitle } from "@/components/admin/AdminShell";
import { AIPanel } from "@/components/admin/AIPanel";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const s = await getAllSettings();
  const disabled = new Set(s["ai.disabledModels"].split(",").map((x) => x.trim()).filter(Boolean));
  const order = s["ai.providerOrder"].split(",").map((x) => x.trim());
  const breakers = breakerState();
  const speed = latencyState();
  const now = Date.now();

  const providers = await Promise.all(
    [...PROVIDERS]
      .sort((a, b) => rank(order, a.id) - rank(order, b.id))
      .map(async (p) => {
        const configured = p.isConfigured();
        const cache = configured ? await providerModels(p) : { models: [] as string[], error: undefined };
        return {
          id: p.id,
          label: p.label,
          configured,
          error: cache.error ?? null,
          models: cache.models.map((m) => {
            const key = `${p.id}/${m}`;
            const b = breakers[key];
            return {
              id: key,
              name: m,
              pro: isProTier(m),
              disabled: disabled.has(key),
              pausedUntil: b && b.openUntil > now ? b.openUntil : null,
              lastError: b?.lastError ?? null,
              latencyMs: speed[key] ?? null,
            };
          }),
        };
      }),
  );

  const logs = await db.aILog.findMany({ orderBy: { createdAt: "desc" }, take: 60 });

  return (
    <>
      <AdminTitle title={t("ai")} hint={t("chainHint")} />
      <AIPanel
        forceMock={s["ai.forceMock"] === "true"}
        includePro={s["ai.includePro"] === "true"}
        providers={providers}
        logs={logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
      />
    </>
  );
}

function rank(order: string[], id: string) {
  const i = order.indexOf(id);
  return i < 0 ? 99 : i;
}
