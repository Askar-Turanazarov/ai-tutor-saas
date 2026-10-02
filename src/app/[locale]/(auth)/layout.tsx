import type { ReactNode } from "react";
import { Ornament } from "@/components/ui/brand";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { PrefsMenu } from "@/components/shell/menus";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <Ornament className="absolute inset-0 h-full w-full text-accent opacity-[0.06]" />
      <SiteHeader right={<PrefsMenu />} />
      <main className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        {children}
      </main>
    </div>
  );
}
