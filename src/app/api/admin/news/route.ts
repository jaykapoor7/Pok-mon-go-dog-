import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Admin-curated news. Same auth as the other admin routes.
//   GET  /api/admin/news                → all items (published + drafts)
//   POST /api/admin/news  { action: "create"|"update"|"delete"|"toggle", ... }
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
    .from("news")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ news: data ?? [] });
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = body.action;

  if (action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supa.from("news").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "toggle") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supa
      .from("news")
      .update({ is_published: Boolean(body.is_published) })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // create / update share the same payload shape.
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const row = {
    title,
    summary: body.summary?.trim() || null,
    source_name: body.source_name?.trim() || null,
    source_url: body.source_url?.trim() || null,
    category: body.category || "other",
    image_url: body.image_url?.trim() || null,
    published_at: body.published_at || null,
    is_published: body.is_published ?? true,
  };

  if (action === "update") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supa.from("news").update(row).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // create
  const { data, error } = await supa.from("news").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}
