import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Reviewing offices for the moderation console (StrayPaw staff only).
     GET  /api/admin/offices                              → offices, their reviewers
     POST { action: "create", name, city }                → a new reviewing office
     POST { action: "rename", officeId, name, city }      → correct its name or city
     POST { action: "addReviewer", officeId, email }      → give an existing account reviewer access
     POST { action: "removeReviewer", officeId, userId }  → take it away

   A reviewer sees a package only after an organisation submits it to their
   office, and may query, accept or return it; the database enforces that.
   Adding someone requires their StrayPaw account to exist (they sign in once
   first), so access is never granted to an address nobody controls. Every
   change is written to operational_audit_log. */

function authorised(req: Request): "ok" | "unset" | "bad" {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset";
  const auth = req.headers.get("authorization");
  const given = (auth?.startsWith("Bearer ") ? auth.slice(7) : new URL(req.url).searchParams.get("key") ?? "").trim();
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "bad";
}
function refuse(state: "unset" | "bad") {
  return state === "unset"
    ? NextResponse.json({ error: "Set ADMIN_SECRET in Vercel and redeploy to use the moderation tools." }, { status: 503 })
    : NextResponse.json({ error: "Wrong password." }, { status: 401 });
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OfficeRow = { id: string; name: string; city: string | null; created_at: string; reviewers: { user_id: string; email: string | null; name: string | null; added_at: string }[]; packages: number };

export async function GET(req: Request) {
  const state = authorised(req);
  if (state !== "ok") return refuse(state);
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });
  const [o, m, p] = await Promise.all([
    supa.from("review_offices").select("id,name,city,created_at").order("name"),
    supa.from("review_office_members").select("office_id,user_id,created_at"),
    supa.from("report_packages").select("office_id,status"),
  ]);
  const err = o.error ?? m.error ?? p.error;
  if (err) return NextResponse.json({ error: /does not exist|schema cache/i.test(err.message) ? "Reviewing offices are not set up in this database yet." : err.message }, { status: 500 });
  const ids = [...new Set((m.data ?? []).map((x) => x.user_id))];
  const people = new Map<string, { email: string | null; name: string | null }>();
  await Promise.all(ids.map(async (id) => {
    const { data } = await supa.auth.admin.getUserById(id);
    const u = data?.user;
    people.set(id, { email: u?.email ?? null, name: (u?.user_metadata?.name as string | undefined) ?? (u?.user_metadata?.full_name as string | undefined) ?? null });
  }));
  const offices: OfficeRow[] = (o.data ?? []).map((x) => ({
    ...x,
    reviewers: (m.data ?? []).filter((r) => r.office_id === x.id).map((r) => ({ user_id: r.user_id, added_at: r.created_at, ...(people.get(r.user_id) ?? { email: null, name: null }) })),
    packages: (p.data ?? []).filter((k) => k.office_id === x.id && k.status !== "draft").length,
  }));
  return NextResponse.json({ offices });
}

export async function POST(req: Request) {
  const state = authorised(req);
  if (state !== "ok") return refuse(state);
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });
  let body: { action?: string; name?: string; city?: string; officeId?: string; email?: string; userId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const name = String(body.name ?? "").trim().slice(0, 160), city = String(body.city ?? "").trim().slice(0, 80) || null;
  const audit = (entity_id: string | null, action: string, after: object) =>
    supa.from("operational_audit_log").insert({ ngo_id: null, actor_id: null, entity_type: "review_office", entity_id, action, after_data: { ...after, by: "StrayPaw moderation console" } });

  if (body.action === "create") {
    if (name.length < 3) return NextResponse.json({ error: "Give the office its full name" }, { status: 400 });
    const { data, error } = await supa.from("review_offices").insert({ name, city }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await audit(data.id, "review_office_created", { name, city });
    return NextResponse.json({ ok: true, id: data.id });
  }
  if (!UUID.test(String(body.officeId ?? ""))) return NextResponse.json({ error: "Choose an office" }, { status: 400 });
  const officeId = String(body.officeId);
  const { data: office } = await supa.from("review_offices").select("id,name").eq("id", officeId).maybeSingle();
  if (!office) return NextResponse.json({ error: "That office no longer exists" }, { status: 404 });

  if (body.action === "rename") {
    if (name.length < 3) return NextResponse.json({ error: "Give the office its full name" }, { status: 400 });
    const { error } = await supa.from("review_offices").update({ name, city }).eq("id", officeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await audit(officeId, "review_office_renamed", { before: office.name, name, city });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "addReviewer") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter their email address" }, { status: 400 });
    const { data: uid, error: le } = await supa.rpc("admin_user_id_by_email", { p_email: email });
    if (le) return NextResponse.json({ error: le.message }, { status: 500 });
    if (!uid) return NextResponse.json({ error: "No StrayPaw account uses that email yet. Ask them to sign in once at straypaw.org/sign-in, then add them." }, { status: 404 });
    const { error } = await supa.from("review_office_members").insert({ office_id: officeId, user_id: uid });
    if (error) return NextResponse.json({ error: /duplicate/i.test(error.message) ? "They already review for this office" : error.message }, { status: 400 });
    await audit(officeId, "reviewer_added", { email, user_id: uid });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "removeReviewer") {
    if (!UUID.test(String(body.userId ?? ""))) return NextResponse.json({ error: "Choose a reviewer" }, { status: 400 });
    const { error, count } = await supa.from("review_office_members").delete({ count: "exact" }).eq("office_id", officeId).eq("user_id", String(body.userId));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!count) return NextResponse.json({ error: "They were not a reviewer here" }, { status: 404 });
    await audit(officeId, "reviewer_removed", { user_id: body.userId });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
