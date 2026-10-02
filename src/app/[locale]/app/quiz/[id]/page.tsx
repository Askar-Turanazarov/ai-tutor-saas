import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { QuizSchema } from "@/lib/ai/schemas";
import { QuizRunner } from "@/components/app/QuizRunner";

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const quiz = await db.quiz.findFirst({ where: { id, userId: user.id } });
  if (!quiz) notFound();
  const parsed = QuizSchema.shape.questions.safeParse(JSON.parse(quiz.questions));
  if (!parsed.success) notFound();
  return <QuizRunner quizId={quiz.id} title={quiz.title} questions={parsed.data} />;
}
