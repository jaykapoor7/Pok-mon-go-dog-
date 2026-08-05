import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Moderation for NGO fundraisers (money-adjacent, so a takedown path matters).
//   GET  /api/admin/fundraisers        → all campaigns, newest first
//   POST /api/admin/fundraisers { action: "delete", id }
function authState(req: Request): "ok" | "unset" | "bad" {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset";
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  return bearer === secret || key === secret ? "ok" : "bad";
}

function authReject(state: "unset" | "bad") {
  if (state === "unset") {
    return NextResponse.json(
      { error: "Admin login isn't configured on the server. Set ADMIN_SECRET and redeploy." },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: "Wrong password." }, { status: 401 });
}

export async function GET(req: Request) {
  const state = authState(req);
  if (state !== "ok") return authReject(state);
  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  }
  const { data, error } = await supa
    .from("fundraisers")
    .select("id, title, category, goal_amount, raised_reported, donate_url, created_by_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fundraisers: data ?? [] });
}

export async function POST(req: Request) {
  const state = authState(req);
  if (state !== "ok") return authReject(state);
  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  }
  let body: { action?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.action !== "delete" || !body.id) {
    return NextResponse.json({ error: "Provide { action: 'delete', id }" }, { status: 400 });
  }
  const { error } = await supa.from("fundraisers").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
