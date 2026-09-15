import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

async function actor(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const admin = getSupabaseAdmin();
  if (!admin || !token) return null;
  const { data: identity } = await admin.auth.getUser(token);
  if (!identity.user) return null;
  const { data: member } = await admin.from("ngo_members").select("ngo_id").eq("user_id", identity.user.id).maybeSingle();
  if (!member?.ngo_id) return null;
  const { data: ngo } = await admin.from("ngos").select("verified").eq("id", member.ngo_id).maybeSingle();
  return ngo?.verified ? { admin, ngoId: member.ngo_id as string } : null;
}

function clean(value: unknown, max = 600) { return String(value ?? "").trim().slice(0, max); }

export async function POST(request: Request) {
  const current = await actor(request);
  if (!current) return NextResponse.json({ error: "Verified partner access required." }, { status: 401 });
  const body = await request.json();
  const caseId = clean(body.caseId, 80);
  const title = clean(body.title, 120);
  const publicSummary = clean(body.publicSummary, 900);
  const locationLabel = clean(body.locationLabel, 120) || null;
  const stages = Array.isArray(body.stages) ? body.stages.slice(0, 7).flatMap((stage: any) => {
    const label = clean(stage?.label, 90); const date = clean(stage?.date, 40);
    return label ? [{ label, ...(date ? { date } : {}) }] : [];
  }) : [];
  if (!caseId || !title || !publicSummary) return NextResponse.json({ error: "Choose a case, add a title and write the public summary." }, { status: 400 });
  const { data: caseRecord } = await current.admin.from("cases").select("id,dog_id,status,zone").eq("id", caseId).eq("ngo_id", current.ngoId).maybeSingle();
  if (!caseRecord) return NextResponse.json({ error: "That case does not belong to your organisation." }, { status: 404 });
  if (!["resolved", "closed"].includes(caseRecord.status)) return NextResponse.json({ error: "Only resolved cases can be featured as a public story." }, { status: 400 });
  const { data, error } = await current.admin.from("case_stories").insert({
    ngo_id: current.ngoId, dog_id: caseRecord.dog_id, case_id: caseRecord.id,
    title, public_summary: publicSummary, location_label: locationLabel ?? caseRecord.zone ?? null,
    stages, published_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not publish story." }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
