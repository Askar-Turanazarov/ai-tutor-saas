import { setRequestLocale } from "next-intl/server";
import { Landing } from "@/components/marketing/Landing";
import { getSession } from "@/lib/auth";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  return <Landing loggedIn={!!session} />;
}
