import { getTranslations, setRequestLocale } from "next-intl/server";
import { smtpConfigured } from "@/lib/messaging/mail";
import { ForgotForm } from "@/components/auth/AccountForms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "account" });
  return { title: t("forgotTitle") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <ForgotForm smtp={smtpConfigured()} />;
}
