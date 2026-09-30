import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

/* Controlled maintenance endpoint. It is intentionally separate from all
 * visitor and case/import response paths: one invocation rebuilds a bounded
 * number of queued cities, never the national register.
 *
 * POST  — an operator drains the queue by hand (Authorization: ADMIN_SECRET).
 * GET   — the scheduled drain (Vercel Cron) keeps the map rollups fresh after
 *         imports and edits, authorised by CRON_SECRET. Without a matching
 *         secret the endpoint is closed, so it is never a public lever. */

const BATCH = 15;

async function drain(): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const supa = getSupabaseAdmin();
  if (!supa) return { ok: false, status: 500, body: { error: "Service role not configured." } };
  const { data, error } = await supa
    .from("spatial_refresh_queue")
    .select("city")
    .order("requested_at")
    .limit(BATCH);
  if (error) return { ok: false, status: 500, body: { error: error.message } };
  const refreshed: Array<{ city: string; cells: number }> = [];
  for (const item of data ?? []) {
    const { data: cells, error: rebuildError } = await supa.rpc("rebuild_spatial_city", { p_city: item.city });
    if (rebuildError) return { ok: false, status: 500, body: { error: rebuildError.message, refreshed } };
    refreshed.push({ city: item.city, cells: Number(cells ?? 0) });
  }
  return { ok: true, status: 200, body: { ok: true, refreshed } };
}

function authorised(req: Request, secret: string | undefined) {
  const s = secret?.trim();
  if (!s) return false;
  const given =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    new URL(req.url).searchParams.get("key")?.trim() ||
    "";
  return given === s;
}

export async function POST(req: Request) {
  if (!authorised(req, process.env.ADMIN_SECRET)) {
    return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  }
  const r = await drain();
  return NextResponse.json(r.body, { status: r.status });
}

export async function GET(req: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>; an operator may also
  // pass ADMIN_SECRET the same way.
  if (!authorised(req, process.env.CRON_SECRET) && !authorised(req, process.env.ADMIN_SECRET)) {
    return NextResponse.json({ error: "Scheduled access required." }, { status: 401 });
  }
  const r = await drain();
  return NextResponse.json(r.body, { status: r.status });
}
