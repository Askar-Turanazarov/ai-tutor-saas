import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/brand";
import { IslimiBorder } from "@/components/decor/motifs";
import { cn } from "@/lib/cn";

/** The one footer of every page: copyright line and the legal documents. `full` adds the logo and ornament (landing). */
export function SiteFooter({ full = false, className }: { full?: boolean; className?: string }) {
  const t = useTranslations("footer");
  const links = (
    <nav aria-label={t("legal")} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <Link href="/legal/offer" className="hover:text-label hover:underline">
        {t("offer")}
      </Link>
      <span aria-hidden className="text-label-3">
        ·
      </span>
      <Link href="/legal/privacy" className="hover:text-label hover:underline">
        {t("privacy")}
      </Link>
    </nav>
  );
  return (
    <footer className={cn("relative text-[12.5px] text-label-2 print:hidden", className)}>
      {full && <IslimiBorder className="mx-auto max-w-6xl px-6 text-accent/25" />}
      <div className={cn("mx-auto flex max-w-6xl flex-col items-center gap-2 text-center sm:flex-row sm:gap-4 sm:text-left", full ? "px-4 py-10 sm:px-6" : "py-6")}>
        {full && <Logo />}
        <p className={cn(full && "sm:ml-auto")}>{t("copyright")}</p>
        <div className={cn(!full && "sm:ml-auto")}>{links}</div>
      </div>
    </footer>
  );
}
