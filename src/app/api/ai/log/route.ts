import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set(["open_case", "add_note", "schedule_followup", "record_care"]);

/* Optional structured log of confirmed StrayPaw AI actions, written with the
   caller's own session (RLS). The table is proposed, not applied
   (supabase/proposed/ai_action_log.sql); until it exists this answers
   not_deployed and the record's own history remains the audit trail. */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!token || !url || !anon) return NextResponse.json({ logged: false, reason: "unauthorised" }, { status: 401 });
  let body: { kind?: string; ok?: boolean; target?: string | null; summary?: string | null };
  try { body = await req.json(); } catch { return NextResponse.json({ logged: false, reason: "invalid" }, { status: 400 }); }
  if (!body.kind || !KINDS.has(body.kind)) return NextResponse.json({ logged: false, reason: "invalid" }, { status: 400 });
  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: ngo } = await db.rpc("my_ngo");
  const { error } = await db.from("ai_action_log").insert({ kind: body.kind, ok: !!body.ok, target: body.target?.slice(0, 200) ?? null, summary: body.summary?.slice(0, 200) ?? null, ngo_id: typeof ngo === "string" ? ngo : null });
  if (error) return NextResponse.json({ logged: false, reason: /does not exist|42P01|PGRST205/.test(`${error.code} ${error.message}`) ? "not_deployed" : "error" }, { status: 200 });
  return NextResponse.json({ logged: true });
}
