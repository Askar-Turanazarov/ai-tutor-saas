import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can, canAccessTopic } from "@/lib/plans";
import { topicTitle } from "@/lib/learning";
import { levelIndex } from "@/lib/levels";
import { ChatView, type ChatMessage } from "@/components/app/ChatView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "nav" });
  return { title: t("chat") };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { locale } = await params;
  const { c } = await searchParams;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });

  const [conversations, active, topics] = await Promise.all([
    db.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, title: true, topicSlug: true, updatedAt: true },
    }),
    c
      ? db.conversation.findFirst({
          where: { id: c, userId: user.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : null,
    db.topic.findMany({ orderBy: { order: "asc" } }),
  ]);

  const topicMap = new Map(topics.map((t) => [t.slug, t]));
  const activeTopic = active?.topicSlug ? topicMap.get(active.topicSlug) : null;
  const li = levelIndex(user.level);
  const suggestions = topics
    .filter((t) => canAccessTopic(user, t) && levelIndex(t.level) === li)
    .slice(0, 4)
    .map((t) => ({ slug: t.slug, icon: t.icon, level: t.level, title: topicTitle(t, locale) }));

  const messages: ChatMessage[] =
    active?.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      corrections: m.corrections ? JSON.parse(m.corrections) : [],
      tips: m.tips ? JSON.parse(m.tips) : [],
    })) ?? [];

  return (
    <ChatView
      key={active?.id ?? "new"}
      pro={can(user, "detailedFeedback")}
      conversationId={active?.id ?? null}
      title={activeTopic ? topicTitle(activeTopic, locale) : active?.title || null}
      topicIcon={activeTopic?.icon ?? null}
      initialMessages={messages}
      conversations={conversations.map((cv) => {
        const tp = cv.topicSlug ? topicMap.get(cv.topicSlug) : null;
        return { id: cv.id, title: tp ? topicTitle(tp, locale) : cv.title, icon: tp?.icon ?? null };
      })}
      suggestions={suggestions}
    />
  );
}
