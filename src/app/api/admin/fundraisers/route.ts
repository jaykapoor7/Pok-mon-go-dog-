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
    .select("id, title, category, goal_amount, raised_reported, donate_url, created_by_id, created_by_name, status, featured, created_at")
    .order("featured", { ascending: false })
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
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Curate a reputable rescue's existing campaign (no partner onboarding needed).
  if (body.action === "create") {
    const title = (body.title ?? "").trim();
    const orgName = (body.orgName ?? "").trim();
    let donateUrl = (body.donateUrl ?? "").trim();
    if (!title || !orgName || !donateUrl) {
      return NextResponse.json(
        { error: "Title, organisation name and donation link are required." },
        { status: 400 }
      );
    }
    if (!/^https?:\/\//i.test(donateUrl)) donateUrl = `https://${donateUrl}`;
    const { data, error } = await supa
      .from("fundraisers")
      .insert({
        title,
        created_by_name: orgName,
        donate_url: donateUrl,
        category: body.category || "other",
        story: body.story?.trim() || null,
        goal_amount: body.goalAmount ?? null,
        cover_photo: body.coverPhoto?.trim() || null,
        featured: true,
        status: "active",
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  }

  if (body.action === "feature") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supa
      .from("fundraisers")
      .update({ featured: Boolean(body.featured) })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete" && body.id) {
    const { error } = await supa.from("fundraisers").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Provide a valid action." }, { status: 400 });
}
