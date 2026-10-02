import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addUsage, remainingSeconds } from "@/lib/plans";

/** Heartbeat from active learning screens; counts practice time toward the Free daily limit. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { seconds?: number };
  const seconds = Math.max(0, Math.min(Math.round(body.seconds ?? 0), 30));
  const before = await remainingSeconds(user);
  if (before !== null && seconds > 0) await addUsage(user.id, seconds);
  return NextResponse.json({ remaining: before === null ? null : Math.max(0, before - seconds) });
}
