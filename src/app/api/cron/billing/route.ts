import { NextResponse } from "next/server";
import { runBillingCycle } from "@/lib/billing/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron (vercel.json, daily 05:00 UTC = 10:00 Tashkent) or any external cron: GET with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runBillingCycle());
}
