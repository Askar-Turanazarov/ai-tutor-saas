import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, isGuest } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (user && !isGuest(user)) redirect({ href: user.onboarded ? "/app" : "/onboarding", locale });
  return <AuthForm mode="login" />;
}
