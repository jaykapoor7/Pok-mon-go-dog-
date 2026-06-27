import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Protected case-proof verification. Same auth as the other admin routes.
//   GET  /api/admin/cases            → resolved cases awaiting verification
//   POST /api/admin/cases  { action: "verify", id }
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
    .from("cases")
    .select(
      "id, title, zone, resolution, outcome_note, before_url, after_url, assignee_name, resolved_at, dog_id"
    )
    .eq("status", "resolved")
    .eq("proof_verified", false)
    .order("resolved_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  if (body.action !== "verify" || !body.id) {
    return NextResponse.json({ error: "Provide { action: 'verify', id }" }, { status: 400 });
  }

  const { data, error } = await supa.rpc("verify_case", { p_case_id: body.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, verified: data === true });
}
