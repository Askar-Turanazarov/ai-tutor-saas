import { NextResponse } from "next/server";
import { clickPrepare, readClickParams } from "@/lib/billing/providers/click";

/** Click SHOP API, action=0. */
export async function POST(req: Request) {
  return NextResponse.json(await clickPrepare(await readClickParams(req)));
}
