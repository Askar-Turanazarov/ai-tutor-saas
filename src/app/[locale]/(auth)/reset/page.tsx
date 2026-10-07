import { getTranslations, setRequestLocale } from "next-intl/server";
import { peekToken } from "@/lib/account/tokens";
import { ResetForm, ResetInvalid } from "@/components/auth/AccountForms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "account" });
  return { title: t("resetTitle"), robots: { index: false } };
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  setRequestLocale((await params).locale);
  const token = (await searchParams).token ?? "";
  // The token is only checked here; it is used up when the new password is saved.
  return (await peekToken(token, "reset")) ? <ResetForm token={token} /> : <ResetInvalid />;
}
