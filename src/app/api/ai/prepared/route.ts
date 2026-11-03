import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { allowUserRequest } from "@/lib/rate-limit";
import { preparedWork } from "@/sp3/ai/preparedWork";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Kaju's prepared work for the daily brief. Every read runs under the
   caller's own session (RLS); nothing is written here. The only actions
   returned are follow-up proposals a person confirms through /api/ai/act,
   with request IDs derived from the work so a repeat confirm replays. */
export async function GET(req: Request) {
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!c.ngoId) return NextResponse.json({ error: "An organisation workspace is required." }, { status: 403 });
  if (!(await allowUserRequest(c.db, "ai"))) return NextResponse.json({ error: "Kaju is busy for a moment. Try again shortly." }, { status: 429 });
  return NextResponse.json(await preparedWork(c.db, c.ngoId, c.userId), { headers: { "Cache-Control": "no-store" } });
}
