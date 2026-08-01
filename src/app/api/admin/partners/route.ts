import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// NGO partner-access requests. Same admin auth as the other admin routes.
//   GET  /api/admin/partners            → pending requests (+ requester email)
//   POST /api/admin/partners { action: "approve"|"reject", id }
// Approve inserts the user into ngo_members (via approve_partner_request RPC).
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
    .from("partner_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach the requester's account email (best-effort) so you can verify them.
  const requests = await Promise.all(
    (data ?? []).map(async (r: any) => {
      let email: string | null = null;
      try {
        const { data: u } = await supa.auth.admin.getUserById(r.user_id);
        email = u.user?.email ?? null;
      } catch {
        /* ignore */
      }
      return { ...r, email };
    })
  );

  return NextResponse.json({ requests });
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
    return NextResponse.json({ error: "Provide { action: 'approve' | 'reject', id }" }, { status: 400 });
  }

  if (body.action === "approve") {
    const { data, error } = await supa.rpc("approve_partner_request", { p_request_id: body.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const res = data as { ok?: boolean; error?: string } | null;
    if (!res?.ok) return NextResponse.json({ error: res?.error || "Approve failed." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supa.rpc("reject_partner_request", { p_request_id: body.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
