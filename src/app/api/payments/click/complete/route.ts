import { NextResponse } from "next/server";
import { handleClickCallback } from "@/lib/billing/click-callback";

export const dynamic = "force-dynamic";

/** Click SHOP API: Complete (action=1). Configure this URL in the Click merchant cabinet. */
export async function POST(req: Request) {
  return NextResponse.json(await handleClickCallback("1", new URLSearchParams(await req.text())));
}
