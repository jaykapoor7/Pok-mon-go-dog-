import { NextResponse } from "next/server";
import { audit, caller } from "@/lib/connections/server";
import { isProvider } from "@/lib/connections/providers";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST { provider, allowed, allow_org_sharing }: organisation leads only. */
export async function POST(req: Request) {
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!c.ngoId || c.role !== "admin") return NextResponse.json({ error: "Only an organisation lead can change this." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!isProvider(String(b.provider))) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  const row = { ngo_id: c.ngoId, provider: b.provider, allowed: b.allowed !== false, allow_org_sharing: !!b.allow_org_sharing, updated_by: c.userId, updated_at: new Date().toISOString() };
  const a = getSupabaseAdmin()!;
  const { error } = await a.from("org_connection_policies").upsert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  /* Switching a provider off, or sharing off, withdraws existing shares at once. */
  if (!row.allowed || !row.allow_org_sharing) await a.from("connections").update({ share_with_org: false }).eq("ngo_id", c.ngoId).eq("provider", b.provider);
  await audit({ user_id: c.userId, ngo_id: c.ngoId, provider: b.provider, action: "policy_changed", detail: { allowed: row.allowed, allow_org_sharing: row.allow_org_sharing } });
  return NextResponse.json({ ok: true });
}
