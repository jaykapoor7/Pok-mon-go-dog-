import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

/* Controlled maintenance endpoint. It is intentionally separate from all
 * visitor and case/import response paths: one invocation rebuilds at most a
 * small number of queued cities, never the national register. */
export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!secret || auth !== secret) return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  const { data, error } = await supa.from("spatial_refresh_queue").select("city").order("requested_at").limit(3);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const refreshed: Array<{ city: string; cells: number }> = [];
  for (const item of data ?? []) {
    const { data: cells, error: rebuildError } = await supa.rpc("rebuild_spatial_city", { p_city: item.city });
    if (rebuildError) return NextResponse.json({ error: rebuildError.message, refreshed }, { status: 500 });
    refreshed.push({ city: item.city, cells: Number(cells ?? 0) });
  }
  return NextResponse.json({ ok: true, refreshed });
}
