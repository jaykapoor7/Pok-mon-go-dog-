import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { deleteIdChunks, updateBatchChunks } from "@/lib/master-import/cleanup";

export const runtime = "nodejs";

function permitted(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  return Boolean(secret && auth?.startsWith("Bearer ") && auth.slice(7).trim() === secret);
}
async function allRows(supa: any, table: string, select: string, apply: (query: any) => any) {
  const result: any[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await apply(supa.from(table).select(select)).order("id").range(from, from + 499);
    if (error) throw new Error(error.message);
    result.push(...(data ?? []));
    if (!data || data.length < 500) return result;
  }
}

export async function POST(req: Request) {
  if (!permitted(req)) return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  const { ngoId, execute, confirmation } = await req.json().catch(() => ({}));
  if (typeof ngoId !== "string" || !ngoId) return NextResponse.json({ error: "Choose an organisation." }, { status: 400 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  try {
    const batches = (await allRows(supa, "import_batches", "id,mapping,status", (q) => q.eq("ngo_id", ngoId)))
      .filter((batch) => batch.mapping?.master_import === true && batch.status !== "rolled_back");
    const batchIds = batches.map((batch) => batch.id);
    const importedRows = batchIds.length ? await allRows(supa, "import_rows", "id,imported_case_id", (q) => q.in("batch_id", batchIds)) : [];
    const caseIds = importedRows.map((row) => row.imported_case_id).filter(Boolean);
    const [dogs, events] = await Promise.all([
      allRows(supa, "dogs", "id,code,intake_notes", (q) => q.eq("ngo_id", ngoId).like("code", "HIST-%")),
      allRows(supa, "animal_timeline_events", "id", (q) => q.eq("ngo_id", ngoId).eq("provenance", "pawesome_master_import")),
    ]);
    // V1 wrote both this exact note and a HIST code. Requiring both keeps the
    // cleanup away from ordinary legacy identifiers and V2 records.
    const syntheticDogs = dogs.filter((dog) => dog.intake_notes === "Historic Pawesome record imported from the organisation workbook.");
    const plan = { batches: batchIds.length, sourceRows: importedRows.length, cases: caseIds.length, syntheticProfiles: syntheticDogs.length, syntheticTimelineEvents: events.length };
    if (!execute) return NextResponse.json({ ok: true, plan });
    if (confirmation !== "REMOVE_BROKEN_V1") return NextResponse.json({ error: "Read the exact cleanup preview, then confirm removal of the broken V1 records." }, { status: 400 });

    // This targets only the known broken V1 footprint: legacy master batches,
    // their imported cases, HIST codes, and the V1 provenance marker. It does
    // not touch community records or any pre-existing/ordinary NGO animal.
    const deletedTimelineEvents = events.length ? await deleteIdChunks(supa, "animal_timeline_events", events.map((event) => event.id)) : 0;
    const deletedCases = caseIds.length ? await deleteIdChunks(supa, "cases", caseIds) : 0;
    const deletedSyntheticProfiles = syntheticDogs.length ? await deleteIdChunks(supa, "dogs", syntheticDogs.map((dog) => dog.id)) : 0;
    // A failed chunk leaves batches eligible for a safe retry. Only a complete
    // successful run marks the exact V1 batches as rolled back.
    const rolledBackBatches = batchIds.length ? await updateBatchChunks(supa, batchIds, { status: "rolled_back", completed_at: new Date().toISOString() }) : 0;
    return NextResponse.json({ ok: true, cleaned: plan, deleted: { animal_timeline_events: deletedTimelineEvents, cases: deletedCases, synthetic_dogs: deletedSyntheticProfiles, import_batches: rolledBackBatches } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare import cleanup." }, { status: 500 });
  }
}
