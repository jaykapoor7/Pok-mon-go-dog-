import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Feedback, for the moderation panel.
 *
 * The table has RLS on and no select policy, so this is the only way to
 * read it: the service role, behind ADMIN_SECRET, on the server. Same
 * shape as the content-reports route it sits beside.
 */
function authed(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  return bearer === secret || key === secret;
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  const { data, error } = await supa
    .from("feedback")
    .select("id, kind, message, page, email, status, resolution, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data ?? [] });
}

export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });

  let body: { id?: string; action?: "actioned" | "dismissed" | "open"; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id || !body.action) {
    return NextResponse.json({ error: "Provide id and action." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { status: body.action };
  if (body.action !== "open") {
    patch.resolution = body.note ?? null;
    patch.resolved_at = new Date().toISOString();
  } else {
    patch.resolution = null;
    patch.resolved_at = null;
  }

  /* Deliberately no automatic email back. "Your feedback has been
     reviewed" is a notification nobody wanted; the address is shown in
     the panel as a mailto: so somebody can write an actual reply. */
  const { error } = await supa.from("feedback").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
