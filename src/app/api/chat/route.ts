import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can, canAccessTopic, remainingSeconds, touchStreak } from "@/lib/plans";
import { recordActivity } from "@/lib/gamification";
import { missionReply, tutorReply } from "@/lib/ai/tutor";
import { missionGoalsByKeywords } from "@/lib/ai/mock";
import { consumeQuota, limit, usedToday } from "@/lib/billing/limits";
import { addMistake, lessonAccess, parseLesson } from "@/lib/learning/progress";
import { asLang, topicTitle } from "@/lib/learning";
import type { Level } from "@/lib/levels";

const Body = z.object({
  conversationId: z.string().optional(),
  text: z.string().trim().min(1).max(1500),
  locale: z.string().default("ru"),
});

/** Lesson mission (role-play): the client keeps the dialogue, nothing is stored but mistakes. */
const Scenario = z.object({
  mode: z.literal("scenario"),
  lesson: z.string(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1500) })).max(40),
  locale: z.string().default("ru"),
  /** The previous turn was played by the scripted partner. */
  scripted: z.boolean().default(false),
});

// Streaming tutor replies can take a while; Vercel stops a function after maxDuration seconds.
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  if (json?.mode === "scenario") return scenario(user, json);
  const parsed = Body.safeParse(json);
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
  await recordActivity(user, { source: "chat", xp: 2, chat: 1 });

  return NextResponse.json({
    conversationId: conv.id,
    title: conv.title || text.slice(0, 60),
    user: { id: userMsg.id, content: text, corrections: shownCorrections },
    assistant: { id: botMsg.id, content: reply, tips: withTips ? tips : [] },
    remaining: await remainingSeconds(user),
    topicTitle: topic ? topicTitle(topic, locale) : null,
  });
}

async function scenario(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, json: unknown) {
  const parsed = Scenario.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { history, locale } = parsed.data;
  const row = await db.lesson.findFirst({ where: { slug: parsed.data.lesson, OR: [{ ownerId: null }, { ownerId: user.id }] } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const lesson = parseLesson(row);
  if (lessonAccess(user, lesson) !== "open") return NextResponse.json({ error: "locked" }, { status: 403 });
  const remaining = await remainingSeconds(user);
  if (remaining !== null && remaining <= 0) return NextResponse.json({ limitReached: true, remaining: 0 });

  // A live AI partner costs one mission from the daily quota (taken on the first turn);
  // without it (Free, or Plus out of missions) the scripted partner plays the scene.
  const firstTurn = history.filter((m) => m.role === "user").length === 1;
  let live = can(user, "missions");
  if (live && firstTurn) live = (await consumeQuota(user, "missionsPerDay")).ok;
  else if (live) live = !parsed.data.scripted && ((await limit(user, "missionsPerDay")) === null || (await usedToday(user.id, "missionsPerDay")) > 0);
  const scripted = !live;
  const res = await missionReply({ userId: user.id, mission: lesson.mission, history, level: user.level as Level, lang: asLang(locale), scripted });
  const goalsDone = [...new Set([...res.data.goalsDone, ...missionGoalsByKeywords(lesson.mission, history)])].filter((id) => lesson.mission.goals.some((g) => g.id === id));
  const corrections = res.data.corrections.slice(0, 2);
  for (const c of corrections) await addMistake(user.id, { original: c.original, corrected: c.corrected, category: c.category ?? "grammar", explanation: c.explanation, source: "chat" });
  await touchStreak(user);
  return NextResponse.json({
    reply: res.data.reply,
    corrections,
    goalsDone,
    finished: res.data.finished || goalsDone.length === lesson.mission.goals.length,
    scripted: res.provider === "script" || res.provider === "mock",
    remaining: await remainingSeconds(user),
  });
}
