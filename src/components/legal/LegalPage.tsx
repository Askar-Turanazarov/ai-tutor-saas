import { useLocale, useTranslations } from "next-intl";
import { FileText, GraduationCap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LEGAL_VERSION, legalDoc, type LegalKind } from "@/lib/legal";
import { PrintButton } from "./PrintButton";

/** Offer / privacy policy: training-version banner, edition date, contents, numbered clauses. */
export function LegalPage({ kind }: { kind: LegalKind }) {
  const t = useTranslations("legal");
  const locale = useLocale();
  const doc = legalDoc(kind, locale);
  const edition = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(LEGAL_VERSION));

  return (
    <article className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6 print:max-w-none print:p-0">
      <div role="note" className="flex gap-3 rounded-card bg-gold-soft p-4 text-[14px] leading-snug">
        <GraduationCap className="mt-0.5 size-5 shrink-0 text-gold" />
        <p>{t("banner")}</p>
      </div>

      <header className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-[28px] font-bold leading-tight sm:text-[34px]">{doc.title}</h1>
          <p className="mt-2 text-[14px] text-label-2">{t("edition", { date: edition })}</p>
        </div>
        <PrintButton label={t("print")} />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label={t("contents")} className="print:hidden lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-label-3">{t("contents")}</p>
          <ol className="space-y-1 text-[14px]">
            {doc.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex gap-2 rounded-[10px] px-2 py-1 text-label-2 hover:bg-fill hover:text-label">
                  <span className="tabular-nums text-label-3">{i + 1}.</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
          <Link
            href={kind === "offer" ? "/legal/privacy" : "/legal/offer"}
            className="mt-4 flex items-center gap-2 px-2 text-[14px] font-medium text-accent hover:underline"
          >
            <FileText className="size-4" />
            {t(`other.${kind}`)}
          </Link>
        </nav>

        <div className="glass rounded-card p-5 sm:p-8 print:border-0 print:bg-transparent print:p-0 print:shadow-none">
          <p className="text-[15px] leading-relaxed">{doc.lead}</p>
          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="mt-8 scroll-mt-24 break-inside-avoid-page">
              <h2 className="text-[19px] font-bold">
                {i + 1}. {s.title}
              </h2>
              <ol className="mt-3 space-y-2.5">
                {s.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-[15px] leading-relaxed">
                    <span className="shrink-0 tabular-nums text-label-3">
                      {i + 1}.{j + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
