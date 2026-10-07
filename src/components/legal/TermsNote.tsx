import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const link = "font-medium text-accent hover:underline";

/** "By signing up / paying you accept the offer…" line under the button that counts as acceptance. */
export function TermsNote({ kind, className }: { kind: "register" | "pay" | "gateway"; className?: string }) {
  const t = useTranslations("legal");
  const key = kind === "register" ? "acceptRegister" : kind === "pay" ? "acceptPay" : "acceptGateway";
  return (
    <p className={cn("text-center text-[12.5px] leading-snug text-label-2", className)}>
      {t.rich(key, {
        offer: (c) => (
          <Link href="/legal/offer" target="_blank" className={link}>
            {c}
          </Link>
        ),
        privacy: (c) => (
          <Link href="/legal/privacy" target="_blank" className={link}>
            {c}
          </Link>
        ),
        billing: (c) => (
          <Link href="/app/billing" className={link}>
            {c}
          </Link>
        ),
      })}
    </p>
  );
}
