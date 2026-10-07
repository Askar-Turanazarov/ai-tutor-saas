import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { OrnamentStage } from "@/components/decor/OrnamentStage";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { PrefsMenu } from "@/components/shell/menus";
import { SiteFooter } from "@/components/shell/SiteFooter";

export default async function AuthLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <div className="relative flex min-h-dvh flex-col">
      <OrnamentStage />
      <SiteHeader right={<PrefsMenu />} />
      <main className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        {children}
      </main>
      <SiteFooter className="relative px-4" />
    </div>
  );
}
