import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can, canAccessTopic, remainingSeconds, touchStreak } from "@/lib/plans";
import { tutorReply } from "@/lib/ai/tutor";
import { asLang, topicTitle } from "@/lib/learning";
import type { Level } from "@/lib/levels";

const Body = z.object({
  conversationId: z.string().optional(),
  text: z.string().trim().min(1).max(1500),
  locale: z.string().default("ru"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { text, locale } = parsed.data;

  const remaining = await remainingSeconds(user);
  if (remaining !== null && remaining <= 0) return NextResponse.json({ limitReached: true, remaining: 0 });

  let conv = parsed.data.conversationId
    ? await db.conversation.findFirst({ where: { id: parsed.data.conversationId, userId: user.id } })
    : null;
  if (!conv) conv = await db.conversation.create({ data: { userId: user.id, title: text.slice(0, 60) } });
  else if (!conv.title) await db.conversation.update({ where: { id: conv.id }, data: { title: text.slice(0, 60) } });

  const topic = conv.topicSlug ? await db.topic.findUnique({ where: { slug: conv.topicSlug } }) : null;
  if (topic && !canAccessTopic(user, topic)) return NextResponse.json({ error: "locked" }, { status: 403 });

  const history = await db.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { role: true, content: true },
  });

  const detailed = can(user, "detailedFeedback");
  const withTips = can(user, "chatTips");
  const res = await tutorReply({
    userId: user.id,
    history: [...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })), { role: "user", content: text }],
    level: user.level as Level,
    lang: asLang(locale),
    pro: detailed,
    topic: topic ? { slug: topic.slug, title: topic.titleEn } : null,
  });
  const { reply, corrections, tips } = res.data;
  // Free users get the simple review even if a model returns more.
  const shownCorrections = detailed ? corrections : corrections.map(({ rule: _r, examples: _e, ...c }) => c);

  const userMsg = await db.message.create({
    data: {
      conversationId: conv.id,
      role: "user",
      content: text,
      corrections: shownCorrections.length ? JSON.stringify(shownCorrections) : null,
    },
  });
  const botMsg = await db.message.create({
    data: {
      conversationId: conv.id,
      role: "assistant",
      content: reply,
      tips: withTips && tips.length ? JSON.stringify(tips) : null,
      provider: res.provider,
      model: res.model,
    },
  });
  await db.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });
  if (corrections.length)
    await db.mistake.createMany({
      data: corrections.slice(0, 3).map((c) => ({
        userId: user.id,
        category: c.category ?? "grammar",
        original: c.original,
        corrected: c.corrected,
        explanation: c.explanation,
      })),
    });
  await db.user.update({ where: { id: user.id }, data: { xp: { increment: 2 } } });
  await touchStreak(user);

  return NextResponse.json({
    conversationId: conv.id,
    title: conv.title || text.slice(0, 60),
    user: { id: userMsg.id, content: text, corrections: shownCorrections },
    assistant: { id: botMsg.id, content: reply, tips: withTips ? tips : [] },
    remaining: await remainingSeconds(user),
    topicTitle: topic ? topicTitle(topic, locale) : null,
  });
}
