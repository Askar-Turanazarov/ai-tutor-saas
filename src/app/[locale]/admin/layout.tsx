import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, isGuest } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "admin" });
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  if (user.role !== "ADMIN") return redirect({ href: "/app", locale });
  return <AdminShell user={{ name: user.name, plan: user.plan, role: user.role, guest: isGuest(user) }}>{children}</AdminShell>;
}
