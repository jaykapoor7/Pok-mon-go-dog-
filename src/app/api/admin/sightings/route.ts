import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Protected moderation endpoint (no UI). Authenticate with the ADMIN_SECRET
// env via:  Authorization: Bearer <ADMIN_SECRET>   or   ?key=<ADMIN_SECRET>
//
//   GET  /api/admin/sightings            → list pending sightings
//   POST /api/admin/sightings            → { action: "approve"|"reject", id }
// ─────────────────────────────────────────────────────────────

type AuthState = "ok" | "unset" | "bad";

function authState(req: Request): AuthState {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset"; // not configured on the server
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  return bearer === secret || key === secret ? "ok" : "bad";
}

/** Distinct responses so a missing env var doesn't masquerade as a bad password. */
function authReject(state: AuthState) {
  if (state === "unset") {
    return NextResponse.json(
      {
        error:
          "Admin login isn't configured on the server. Set ADMIN_SECRET in Vercel → Settings → Environment Variables (Production) and redeploy.",
      },
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
    return NextResponse.json(
      { error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }
  const { data, error } = await supa
    .from("sightings")
    .select("id, reporter_name, zone, nickname, photo_url, notes, mood_tags, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pending: data ?? [], count: data?.length ?? 0 });
}

export async function POST(req: Request) {
  const state = authState(req);
  if (state !== "ok") return authReject(state);
  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  let body: { action?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json(
      { error: "Provide { action: 'approve' | 'reject', id }" },
      { status: 400 }
    );
  }

  if (body.action === "approve") {
    const { data, error } = await supa.rpc("approve_sighting", {
      p_sighting_id: body.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, result: data });
  }

  const { data, error } = await supa.rpc("reject_sighting", {
    p_sighting_id: body.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rejected: data === true });
}
