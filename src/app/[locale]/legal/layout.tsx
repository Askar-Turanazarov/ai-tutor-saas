import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { PrefsMenu } from "@/components/shell/menus";
import { SiteFooter } from "@/components/shell/SiteFooter";

export default async function LegalLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <SiteHeader right={<PrefsMenu />} className="print:hidden" />
      <main className="flex-1">{children}</main>
      <SiteFooter className="px-4" />
    </div>
  );
}
