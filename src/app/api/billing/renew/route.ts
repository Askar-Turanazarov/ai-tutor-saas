import { NextResponse } from "next/server";
import { runRenewals } from "@/lib/billing/subscription";

/** Batch renewal for an external scheduler: `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runRenewals());
}
