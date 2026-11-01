import { NextResponse } from "next/server";
import { audit, caller, disconnect, policy } from "@/lib/connections/server";
import { isProvider, PROVIDERS } from "@/lib/connections/providers";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* DELETE: disconnect (revoke at the provider where it allows, then remove our copy). */
export async function DELETE(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const ok = await disconnect(c, provider);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not connected." }, { status: 404 });
}

/* PATCH { share }: share this connection with the organisation, only where its policy allows. */
export async function PATCH(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const share = !!body.share;
  if (share && !(await policy(c.ngoId, provider)).allow_org_sharing) return NextResponse.json({ error: `Your organisation does not allow sharing ${PROVIDERS[provider].name} connections.` }, { status: 403 });
  const { data, error } = await getSupabaseAdmin()!.from("connections").update({ share_with_org: share, updated_at: new Date().toISOString() }).eq("user_id", c.userId).eq("provider", provider).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not connected." }, { status: 404 });
  await audit({ connection_id: data.id, user_id: c.userId, ngo_id: c.ngoId, provider, action: share ? "shared_with_org" : "unshared" });
  return NextResponse.json({ ok: true });
}
