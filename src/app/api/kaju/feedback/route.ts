import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { allowUserRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* A person's rating of one Kaju answer, for the pilot. Written with their own session: row-level security allows it
   only for an answer logged as theirs. Words are optional and stay inside StrayPaw. */
const REASONS = new Set(["wrong", "not_useful", "incomplete", "slow", "unsafe", "great", "saved_time", "other"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!(await allowUserRequest(c.db, "ai"))) return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  const b = await req.json().catch(() => null) as { turnId?: unknown; rating?: unknown; reason?: unknown; comment?: unknown; minutesSaved?: unknown } | null;
  if (!b || typeof b.turnId !== "string" || !UUID.test(b.turnId) || (b.rating !== 1 && b.rating !== -1)) return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  const reason = typeof b.reason === "string" && REASONS.has(b.reason) ? b.reason : null;
  const comment = typeof b.comment === "string" && b.comment.trim() ? b.comment.trim().slice(0, 1000) : null;
  const minutes = typeof b.minutesSaved === "number" && Number.isFinite(b.minutesSaved) ? Math.max(0, Math.min(600, Math.round(b.minutesSaved))) : null;
  /* A second rating of the same answer changes the first (only the rating's own columns can be updated). */
  const fields = { rating: b.rating, reason, comment, minutes_saved: minutes };
  const add = await c.db.from("kaju_feedback").insert({ turn_id: b.turnId, user_id: c.userId, ...fields });
  if (add.error?.code === "23505") {
    const upd = await c.db.from("kaju_feedback").update({ ...fields, updated_at: new Date().toISOString() }).eq("turn_id", b.turnId).eq("user_id", c.userId);
    if (upd.error) return NextResponse.json({ error: "Your feedback could not be saved." }, { status: 400 });
  } else if (add.error) return NextResponse.json({ error: "Your feedback could not be saved." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
