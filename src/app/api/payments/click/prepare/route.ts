import { NextResponse } from "next/server";
import { handleClickCallback } from "@/lib/billing/click-callback";

export const dynamic = "force-dynamic";

/** Click SHOP API: Prepare (action=0). Configure this URL in the Click merchant cabinet. */
export async function POST(req: Request) {
  return NextResponse.json(await handleClickCallback("0", new URLSearchParams(await req.text())));
}
