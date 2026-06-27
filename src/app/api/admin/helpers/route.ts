import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Protected read of "Can you help?" sign-ups (volunteers + NGOs).
// Same auth as /api/admin/sightings:  Authorization: Bearer <ADMIN_SECRET>
//   GET /api/admin/helpers → { volunteers: [...], ngos: [...] }
// ─────────────────────────────────────────────────────────────

type AuthState = "ok" | "unset" | "bad";

function authState(req: Request): AuthState {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset";
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  return bearer === secret || key === secret ? "ok" : "bad";
}

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
    .from("helpers")
    .select(
      "id, name, contact, message, is_ngo, ngo_name, dog_id, zone, created_at, acknowledged"
    )
    .order("acknowledged", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    // Most likely cause: helpers.sql / helpers-acknowledge.sql hasn't been run.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  return NextResponse.json({
    volunteers: rows.filter((r) => !r.is_ngo),
    ngos: rows.filter((r) => r.is_ngo),
  });
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
  if (!body.id || (body.action !== "acknowledge" && body.action !== "unacknowledge")) {
    return NextResponse.json(
      { error: "Provide { action: 'acknowledge' | 'unacknowledge', id }" },
      { status: 400 }
    );
  }

  const ack = body.action === "acknowledge";
  const { error } = await supa
    .from("helpers")
    .update({ acknowledged: ack, acknowledged_at: ack ? new Date().toISOString() : null })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, acknowledged: ack });
}
