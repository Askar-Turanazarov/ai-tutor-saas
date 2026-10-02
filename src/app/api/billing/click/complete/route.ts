import { NextResponse } from "next/server";
import { clickComplete, readClickParams } from "@/lib/billing/providers/click";

/** Click SHOP API, action=1. */
export async function POST(req: Request) {
  return NextResponse.json(await clickComplete(await readClickParams(req)));
}
