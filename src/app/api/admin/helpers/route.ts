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

  /* routed_ngo_id arrives with release-2-0-volunteer-isolation.sql; before that
     migration the column is absent, so read without it rather than fail. */
  const base = "id, name, contact, message, is_ngo, ngo_name, dog_id, zone, created_at, acknowledged";
  const read = (cols: string) => supa.from("helpers").select(cols)
    .order("acknowledged", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  let { data, error } = await read(`${base}, routed_ngo_id`);
  if (error && /routed_ngo_id/.test(error.message)) ({ data, error } = await read(base));

  if (error) {
    // Most likely cause: helpers.sql / helpers-acknowledge.sql hasn't been run.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as { is_ngo: boolean }[];
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

  let body: { action?: string; id?: string; ngoId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  /* Route a general volunteer sign-up to one organisation (or clear it). The
     database function is service-role only; it is the one designed way an
     organisation comes to see a sign-up that is not about its own animal. */
  if (body.action === "route" && body.id) {
    const ngo = typeof body.ngoId === "string" && body.ngoId.trim() ? body.ngoId.trim() : null;
    const { data, error } = await supa.rpc("route_helper", { p_helper: body.id, p_ngo: ngo });
    if (error) return NextResponse.json({ error: /route_helper/.test(error.message) ? "Routing needs the release-2-0 database migration." : error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: "No volunteer sign-up with that id (NGO registrations cannot be routed)." }, { status: 404 });
    return NextResponse.json({ ok: true, routed: ngo });
  }
  if (!body.id || (body.action !== "acknowledge" && body.action !== "unacknowledge")) {
    return NextResponse.json(
      { error: "Provide { action: 'acknowledge' | 'unacknowledge' | 'route', id }" },
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
