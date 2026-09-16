import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function authorised(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  return Boolean(secret && auth?.startsWith("Bearer ") && auth.slice(7).trim() === secret);
}

function ids(value: string | null) {
  return (value ?? "").split(",").map((id) => id.trim()).filter(Boolean);
}

/** A deliberately small, scrubbed review surface. Raw rows can contain
 * reporter contact data, so the browser receives normalized operational
 * fields only; the original workbook remains in the private imports bucket. */
export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  const url = new URL(req.url);
  const ngoId = url.searchParams.get("ngoId") ?? "";
  const batchIds = ids(url.searchParams.get("batchIds"));
  if (!ngoId || !batchIds.length) return NextResponse.json({ error: "Choose staged import batches." }, { status: 400 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  const { data: batches, error: batchError } = await supa.from("import_batches").select("id").eq("ngo_id", ngoId).in("id", batchIds);
  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });
  if ((batches ?? []).length !== batchIds.length) return NextResponse.json({ error: "Those staged rows do not belong to this organisation." }, { status: 403 });
  const { data, error, count } = await supa.from("import_rows")
    .select("id,source_row_number,source_subrecord,classification,decision,matched_dog_id,normalized,error", { count: "exact" })
    .in("batch_id", batchIds).neq("decision", "skip").order("source_row_number").limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [], total: count ?? data?.length ?? 0, limited: (count ?? 0) > 100 });
}

export async function PATCH(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  const { ngoId, rowId, decision, matchedDogId } = await req.json().catch(() => ({}));
  if (typeof ngoId !== "string" || typeof rowId !== "string" || !["new", "merge", "review", "skip"].includes(decision)) {
    return NextResponse.json({ error: "Invalid review decision." }, { status: 400 });
  }
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  const { data: row, error: rowError } = await supa.from("import_rows")
    .select("id,batch:import_batches!inner(ngo_id)").eq("id", rowId).maybeSingle();
  if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });
  if (!row || (row as any).batch?.ngo_id !== ngoId) return NextResponse.json({ error: "That source row is outside this organisation." }, { status: 403 });
  if (matchedDogId) {
    const { data: dog } = await supa.from("dogs").select("id").eq("id", matchedDogId).eq("ngo_id", ngoId).maybeSingle();
    if (!dog) return NextResponse.json({ error: "The selected animal is outside this organisation." }, { status: 403 });
  }
  const { error } = await supa.from("import_rows").update({ decision, matched_dog_id: matchedDogId || null }).eq("id", rowId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
