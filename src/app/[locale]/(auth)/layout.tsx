import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Logo, Ornament } from "@/components/ui/brand";
import { LocaleSwitcher } from "@/components/ui/switchers";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <Ornament className="absolute inset-0 h-full w-full text-accent opacity-[0.06]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Ustoz AI">
          <Logo />
        </Link>
        <LocaleSwitcher size="sm" />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        {children}
      </main>
    </div>
  );
}
