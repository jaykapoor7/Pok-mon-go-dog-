import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Master editor — full edit access to any dog (service role). Same admin auth.
//   GET  /api/admin/dogs            → dogs (needs-help first)
//   POST /api/admin/dogs  { id, patch: { status?, needs_help?, vaccinated?,
//                                        sterilised?, is_friendly? } }
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

const ALLOWED = ["status", "needs_help", "vaccinated", "sterilised", "is_friendly", "ear_notch"] as const;

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
    .from("dogs")
    .select("id, name, zone, status, needs_help, vaccinated, sterilised, is_friendly, ear_notch, cover_photo, last_seen")
    .order("needs_help", { ascending: false })
    .order("last_seen", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dogs: data ?? [], count: data?.length ?? 0 });
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

  let body: { id?: string; patch?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id || !body.patch || typeof body.patch !== "object") {
    return NextResponse.json({ error: "Provide { id, patch }" }, { status: 400 });
  }

  // Whitelist the editable fields.
  const update: Record<string, unknown> = {};
  for (const k of ALLOWED) {
    if (k in body.patch) update[k] = body.patch[k];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No editable fields supplied." }, { status: 400 });
  }

  const { error } = await supa.from("dogs").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
