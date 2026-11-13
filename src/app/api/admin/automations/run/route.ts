import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/* The schedule behind automations: once a day the server runs every
   automation that is due. Each run is recorded by the database function,
   which also refuses to deliver the same period twice. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Automation store unavailable" }, { status: 503 });
  const due = await db.rpc("automation_due", { p_limit: 100 });
  /* Until the automations database change is applied there is nothing to run: say so plainly instead of failing every day. */
  if (due.error && /PGRST202|42883|does not exist|schema cache/i.test(`${due.error.code} ${due.error.message}`)) return NextResponse.json({ ran: 0, state: "awaiting the automations database change" }, { headers: { "Cache-Control": "no-store" } });
  if (due.error) return NextResponse.json({ error: "Could not read due automations" }, { status: 503 });
  const started = Date.now();
  let ran = 0, delivered = 0, skipped = 0, failed = 0;
  for (const { id } of (due.data ?? []) as { id: string }[]) {
    if (Date.now() - started > 45_000) break; /* the rest stay due and run on the next call */
    const r = await db.rpc("automation_run", { p_id: id, p_now: false });
    const status = r.error ? "failed" : (r.data as { status?: string } | null)?.status;
    ran++;
    if (status === "succeeded") delivered++; else if (status === "skipped") skipped++; else failed++;
  }
  return NextResponse.json({ due: due.data?.length ?? 0, ran, delivered, skipped, failed }, { status: failed ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
