import { setRequestLocale } from "next-intl/server";
import { Landing, type LandingPricing } from "@/components/marketing/Landing";
import { getSession } from "@/lib/auth";
import { priceFor } from "@/lib/billing/subscription";
import { limitsOf } from "@/lib/billing/limits";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [session, plus, pro, free, plusLimits, proLimits] = await Promise.all([
    getSession(),
    priceFor("PLUS", 1, "UZS"),
    priceFor("PRO", 1, "UZS"),
    limitsOf({ plan: "FREE" }),
    limitsOf({ plan: "PLUS" }),
    limitsOf({ plan: "PRO" }),
  ]);
  // Prices and quotas come from the admin settings, so the landing never disagrees with /app/plans.
  const pricing: LandingPricing = {
    FREE: { price: 0, limits: free },
    PLUS: { price: plus, limits: plusLimits },
    PRO: { price: pro, limits: proLimits },
  };
  return <Landing loggedIn={!!session} pricing={pricing} />;
}
