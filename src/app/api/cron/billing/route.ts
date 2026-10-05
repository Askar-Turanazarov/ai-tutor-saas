import { NextResponse } from "next/server";
import { runBillingCycle } from "@/lib/billing/scheduler";

export const dynamic = "force-dynamic";

/** For an external scheduler (Vercel Cron, crontab + curl): `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runBillingCycle());
}
