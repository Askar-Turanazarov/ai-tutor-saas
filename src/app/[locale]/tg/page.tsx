import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { TgMiniApp } from "@/components/telegram/TgMiniApp";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations({ locale: (await params).locale, namespace: "tg" });
  return { title: t("title") };
}

/** Telegram Mini App (bot menu button). `?dev=1` opens it in a normal browser with the site session, outside production. */
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ dev?: string }> }) {
  setRequestLocale((await params).locale);
  const dev = process.env.NODE_ENV !== "production" && (await searchParams).dev === "1";
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-4">
        <TgMiniApp dev={dev} />
      </main>
      <SiteFooter className="px-4" />
    </div>
  );
}
