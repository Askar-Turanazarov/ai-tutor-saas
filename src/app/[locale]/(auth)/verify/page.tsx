import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { consumeToken } from "@/lib/account/tokens";
import { VerifyResult } from "@/components/auth/AccountForms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "account" });
  return { title: t("verifyTitle"), robots: { index: false } };
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  setRequestLocale((await params).locale);
  const userId = await consumeToken((await searchParams).token ?? "", "verify");
  if (userId) await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  const me = await getCurrentUser();
  return <VerifyResult ok={!!userId} signedIn={!!me} />;
}
