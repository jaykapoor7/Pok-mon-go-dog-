import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasDefensibleIdentity, isAccepted, parseMasterWorkbook, type NormalizedImportRow } from "@/lib/master-import/pipeline";
import { assessLocalities as assessImportLocalities, commitStaged as commitImport } from "@/lib/master-import/commit";

export const runtime = "nodejs";
export const maxDuration = 60;
export type LocalityStatus = {
  recordsFound: number;
  successfullyGeocoded: number;
  unresolved: number;
  geocoderConfigured: boolean;
  requiredEnv: "MAPBOX_ACCESS_TOKEN" | null;
};

function authorised(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  return Boolean(secret && auth?.startsWith("Bearer ") && auth.slice(7).trim() === secret);
}
const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

async function page<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const result: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await load(from, from + 499);
    if (error) throw new Error(error.message);
    result.push(...(data ?? []));
    if (!data || data.length < 500) return result;
  }
}

function same(value: string | null | undefined) { return clean(value).toLowerCase(); }
function eventKind(row: NormalizedImportRow) {
  if (row.classification === "sterilisation") return "sterilisation";
  if (row.classification === "vaccination") return "vaccination";
  if (row.classification === "treatment") return "treatment";
  return "rescue";
}
function statusFor(row: NormalizedImportRow) {
  const text = `${row.condition ?? ""} ${row.status ?? ""}`.toLowerCase();
  if (/injur|wound|fracture|maggot|tvt|mange|rta|skin/.test(text)) return "injured";
  return "seen";
}

function geocoderToken() {
  return process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null;
}
function localityKey(row: NormalizedImportRow, ngo: any) {
  return [row.locality, ngo.city, ngo.state, "India"].filter(Boolean).join(", ").toLowerCase().replace(/\s+/g, " ").trim();
}

async function locality(supa: any, row: NormalizedImportRow, ngo: any) {
  if (!row.locality) return null;
  const query = [row.locality, ngo.city, ngo.state, "India"].filter(Boolean).join(", ");
  const key = localityKey(row, ngo);
  const { data: cached } = await supa.from("import_location_cache").select("lat,lng,precision").eq("normalized_query", key).maybeSingle();
  if (cached?.precision === "approximate" && cached.lat !== null && cached.lng !== null) return cached;
  const token = geocoderToken();
  if (!token) { await supa.from("import_location_cache").upsert({ normalized_query: key, locality: row.locality, city: ngo.city, state: ngo.state, precision: "unresolved" }, { onConflict: "normalized_query" }); return null; }
  try {
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(token)}&country=in&limit=1`, { signal: AbortSignal.timeout(8_000) });
    const payload = await response.json(); const center = payload.features?.[0]?.center;
    if (!Array.isArray(center) || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) throw new Error("not found");
    const result = { normalized_query: key, locality: row.locality, city: ngo.city, state: ngo.state, lat: center[1], lng: center[0], provider: "mapbox", precision: "approximate" };
    await supa.from("import_location_cache").upsert(result, { onConflict: "normalized_query" });
    return result;
  } catch { await supa.from("import_location_cache").upsert({ normalized_query: key, locality: row.locality, city: ngo.city, state: ngo.state, precision: "unresolved" }, { onConflict: "normalized_query" }); return null; }
}

/** Geocode every unique locality before a commit. It makes a missing key or
 * an ambiguous/unresolved locality a hard stop rather than silently creating
 * an unmapped "public" record. Counts are record counts, not animal counts. */
async function assessLocalities(supa: any, rows: NormalizedImportRow[], ngo: any): Promise<LocalityStatus> {
  const groups = new Map<string, { row: NormalizedImportRow; records: number }>();
  for (const row of rows) {
    if (!isAccepted(row) || !row.locality) continue;
    const key = localityKey(row, ngo);
    const current = groups.get(key);
    if (current) current.records++;
    else groups.set(key, { row, records: 1 });
  }
  const recordsFound = [...groups.values()].reduce((sum, group) => sum + group.records, 0);
  if (!recordsFound) return { recordsFound: 0, successfullyGeocoded: 0, unresolved: 0, geocoderConfigured: Boolean(geocoderToken()), requiredEnv: null };
  if (!geocoderToken()) return { recordsFound, successfullyGeocoded: 0, unresolved: recordsFound, geocoderConfigured: false, requiredEnv: "MAPBOX_ACCESS_TOKEN" };
  let successfullyGeocoded = 0;
  for (const group of groups.values()) {
    if (await locality(supa, group.row, ngo)) successfullyGeocoded += group.records;
  }
  return { recordsFound, successfullyGeocoded, unresolved: recordsFound - successfullyGeocoded, geocoderConfigured: true, requiredEnv: null };
}

function requireMappedLocalities(status: LocalityStatus) {
  if (!status.recordsFound) return;
  if (!status.geocoderConfigured) throw new Error(`Map publishing is blocked: set ${status.requiredEnv} in the production server environment, then redeploy and re-run the preview.`);
  if (status.unresolved) throw new Error(`Map publishing is blocked: ${status.unresolved.toLocaleString()} locality records could not be geocoded. Correct those localities in the review step and re-run the preview.`);
}

async function commitStaged(supa: any, ngo: any, batchIds: string[]) {
  const rows = await page<any>((from, to) => supa.from("import_rows").select("id,batch_id,normalized,matched_dog_id,classification,decision,imported_dog_id,imported_case_id").in("batch_id", batchIds).order("id").range(from, to));
  const dogs = await page<any>((from, to) => supa.from("dogs").select("id,code,name,zone,sex,color").eq("ngo_id", ngo.id).order("id").range(from, to));
  const pendingRows = rows
    .filter((source) => !source.imported_case_id && !source.imported_dog_id && source.decision !== "skip")
    .map((source) => source.normalized as NormalizedImportRow)
    .filter((row) => Boolean(row && isAccepted(row)));
  const localityStatus = await assessLocalities(supa, pendingRows, ngo);
  requireMappedLocalities(localityStatus);
  let casesCreated = 0; let profilesCreated = 0; let review = 0; let medical = 0;
  const campaignTotals = new Map<string, number>();
  for (const source of rows) {
    const row = source.normalized as NormalizedImportRow;
    // Commits are retry-safe: an already-created case/medical record is never
    // written again. A still-unmatched row remains reviewable for a later
    // human link without duplicating its original event.
    if (!row || !isAccepted(row) || source.decision === "skip" || source.imported_case_id || source.imported_dog_id) continue;
    let dogId = source.matched_dog_id as string | null;
    if (!dogId && hasDefensibleIdentity(row)) {
      const candidate = dogs.find((dog) =>
        (row.animal_code && same(dog.code) === same(row.animal_code)) ||
        (!row.animal_code && same(dog.name) === same(row.animal_name) && same(dog.zone) === same(row.locality) && ((row.sex && same(dog.sex) === same(row.sex)) || (row.colour && same(dog.color) === same(row.colour)))));
      dogId = candidate?.id ?? null;
      if (!dogId) {
        const point = await locality(supa, row, ngo);
        if (point) {
          const { data: dog, error } = await supa.from("dogs").insert({ ngo_id: ngo.id, code: row.animal_code || null, name: row.animal_name, species: "dog", sex: row.sex, color: row.colour || "Unknown", zone: row.locality, lat: point.lat, lng: point.lng, location_precision: "approximate", status: statusFor(row), first_seen: row.event_date, last_seen: row.event_date, provenance: "imported_historical_record", source_metadata: { source: "master_import_v2", fingerprint: row.fingerprint } }).select("id,code,name,zone,sex,color").single();
          if (error || !dog) throw new Error(error?.message ?? "Could not create identified animal profile.");
          dogId = dog.id; dogs.push(dog); profilesCreated++;
        }
      }
    }
    if (row.classification === "sterilisation") { campaignTotals.set(row.source_sheet, (campaignTotals.get(row.source_sheet) ?? 0) + 1); }
    if (row.classification === "treatment" || row.classification === "follow_up" || row.classification === "sterilisation" || row.classification === "vaccination") {
      if (!dogId || !row.event_date) { review++; continue; }
      if (row.classification === "follow_up") {
        const { error } = await supa.from("animal_followups").insert({ ngo_id: ngo.id, dog_id: dogId, due_at: row.event_date, kind: "imported follow-up", note: [row.treatment_update, row.review, row.case_detail].filter(Boolean).join("\n") || null });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supa.from("medical_events").insert({ dog_id: dogId, kind: eventKind(row), event_date: row.event_date.slice(0, 10), notes: [row.case_detail, row.treatment_update, row.review].filter(Boolean).join("\n") || null, performed_by: ngo.name });
        if (error) throw new Error(error.message); medical++;
        if (row.classification === "sterilisation") {
          const { error: dogError } = await supa.from("dogs").update({ sterilised: true, sterilisation_status: "sterilised", last_seen: row.event_date }).eq("id", dogId).eq("ngo_id", ngo.id);
          if (dogError) throw new Error(dogError.message);
        }
        if (row.classification === "vaccination") {
          const { error: dogError } = await supa.from("dogs").update({ vaccinated: true, vaccination_status: "vaccinated", last_seen: row.event_date }).eq("id", dogId).eq("ngo_id", ngo.id);
          if (dogError) throw new Error(dogError.message);
        }
      }
      await supa.from("import_rows").update({ decision: "merge", imported_dog_id: dogId }).eq("id", source.id);
      continue;
    }
    if (row.classification !== "rescue" && row.classification !== "adoption" && row.classification !== "foster") { review++; continue; }
    const point = await locality(supa, row, ngo);
    const { data: record, error } = await supa.from("cases").insert({ dog_id: dogId, ngo_id: ngo.id, title: [row.condition || `${label(row.classification)} record`, row.locality].filter(Boolean).join(" · "), description: [row.case_detail, row.treatment_update, row.rescue_plan, row.review].filter(Boolean).join("\n") || null, zone: row.locality, lat: point?.lat ?? null, lng: point?.lng ?? null, category: row.classification === "rescue" ? "rescue" : "other", status: /closed|complete|released|recovered|healed/i.test(row.status ?? "") ? "closed" : "in_progress", condition_text: row.condition, provenance: "imported_historical_record", verification_state: "verified", source_event_at: row.event_date, imported_at: new Date().toISOString() }).select("id").single();
    if (error || !record) throw new Error(error?.message ?? "Could not create case.");
    casesCreated++;
    if (dogId && row.event_date) {
      const { error: timelineError } = await supa.from("animal_timeline_events").insert({
        ngo_id: ngo.id, dog_id: dogId, case_id: record.id, event_type: `import:${row.classification}`,
        title: row.condition || `${label(row.classification)} record`,
        details: [row.case_detail, row.treatment_update, row.rescue_plan, row.review].filter(Boolean).join("\n") || null,
        occurred_at: row.event_date, provenance: "imported_historical_record",
        source_ref: { import_row_id: source.id, fingerprint: row.fingerprint }, visibility: "partner",
      });
      if (timelineError) throw new Error(timelineError.message);
      const { error: dogError } = await supa.from("dogs").update({ last_seen: row.event_date }).eq("id", dogId).eq("ngo_id", ngo.id);
      if (dogError) throw new Error(dogError.message);
    }
    await supa.from("import_rows").update({ decision: dogId ? "merge" : "review", imported_dog_id: dogId, imported_case_id: record.id }).eq("id", source.id);
  }
  for (const [name, count] of campaignTotals) {
    const campaign = { ngo_id: ngo.id, name, kind: "sterilisation", zone: ngo.city, source_rows_count: count, public_visibility: "summary", public_summary: `${count} validated sterilisation records from this completed drive.`, published_at: new Date().toISOString(), archived_at: new Date().toISOString() };
    const { data: exists } = await supa.from("campaigns").select("id").eq("ngo_id", ngo.id).eq("name", name).maybeSingle();
    const write = exists ? await supa.from("campaigns").update(campaign).eq("id", exists.id) : await supa.from("campaigns").insert(campaign);
    if (write.error) throw new Error(write.error.message);
  }
  await supa.from("import_batches").update({ status: review ? "reviewing" : "imported", rows_imported: casesCreated + medical, rows_needing_review: review, completed_at: new Date().toISOString() }).in("id", batchIds);
  return { casesCreated, profilesCreated, medicalEvents: medical, rowsNeedingReview: review, localityStatus };
}
function label(value: string) { return value.replace(/_/g, " "); }

export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  const body = await req.formData();
  const action = clean(body.get("action")) || "preview";
  const ngoId = clean(body.get("ngoId"));
  const file = body.get("file");
  if (!ngoId) return NextResponse.json({ error: "Choose an organisation." }, { status: 400 });
  const { data: ngo } = await supa.from("ngos").select("id,name,city,state").eq("id", ngoId).maybeSingle();
  if (!ngo) return NextResponse.json({ error: "That organisation was not found." }, { status: 404 });
  if (action === "commit") {
    const batchIds = JSON.parse(clean(body.get("batchIds")) || "[]");
    if (!Array.isArray(batchIds) || !batchIds.every((id) => typeof id === "string")) return NextResponse.json({ error: "No staged batches were selected." }, { status: 400 });
    const { data: batches, error: batchError } = await supa.from("import_batches").select("id,ngo_id,status").in("id", batchIds);
    if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });
    if ((batches ?? []).length !== batchIds.length || (batches ?? []).some((batch) => batch.ngo_id !== ngoId || !["staged", "reviewing"].includes(batch.status))) {
      return NextResponse.json({ error: "Only this organisation's staged import batches can be committed." }, { status: 403 });
    }
    try { return NextResponse.json({ ok: true, ...(await commitImport(supa, ngo, batchIds)) }); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not commit staged import." }, { status: 500 }); }
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an organisation and workbook." }, { status: 400 });
  if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Use an Excel or CSV file below 25 MB." }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const preview = parseMasterWorkbook(buffer, file.name);
  if (action === "preview") {
    const localityStatus = await assessImportLocalities(supa, preview.sheets.flatMap((sheet) => sheet.rows.map((row) => row.normalized)), ngo);
    return NextResponse.json({ ngo: ngo.name, preview: { ...preview, localityStatus, sheets: preview.sheets.map((sheet) => ({ name: sheet.name, headerRow: sheet.headerRow, rows: sheet.rows.slice(0, 12) })) } });
  }
  if (action !== "stage") return NextResponse.json({ error: "Analyse a workbook before staging it." }, { status: 400 });

  const { data: already } = await supa.from("import_batches")
    .select("id,status,rows_total")
    .eq("ngo_id", ngoId).eq("workbook_hash", preview.workbookHash);
  if (already?.length) return NextResponse.json({ ok: true, alreadyStaged: true, batchIds: already.map((batch) => batch.id), rowsStaged: already.reduce((total, batch) => total + (batch.rows_total ?? 0), 0), preview });

  const storagePath = `${ngoId}/master/${preview.workbookHash}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const uploaded = await supa.storage.from("imports").upload(storagePath, Buffer.from(buffer), { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploaded.error) return NextResponse.json({ error: `Workbook could not be stored privately: ${uploaded.error.message}` }, { status: 500 });

  const batchIds: string[] = [];
  for (const sheet of preview.sheets) {
    const { data: batch, error } = await supa.from("import_batches").insert({
      ngo_id: ngoId, source_filename: file.name, source_kind: file.name.split(".").pop()?.toLowerCase() ?? "xlsx",
      source_storage_path: storagePath, sheet_name: sheet.name, workbook_hash: preview.workbookHash,
      mapping: { master_import_v2: true }, preview: { counts: preview.counts, accepted: sheet.rows.filter((row) => isAccepted(row.normalized)).length },
      status: "staged", rows_total: sheet.rows.length, rows_needing_review: sheet.rows.filter((row) => isAccepted(row.normalized)).length,
    }).select("id").single();
    if (error || !batch) return NextResponse.json({ error: error?.message ?? "Could not stage import batch." }, { status: 500 });
    batchIds.push(batch.id);
    const rows = sheet.rows.map((row) => ({
      batch_id: batch.id, source_row_number: row.sourceRowNumber, source_subrecord: row.normalized.source_subrecord ?? null,
      raw_row: row.raw, normalized: { ...row.normalized, city: ngo.city ?? null }, row_fingerprint: row.normalized.fingerprint,
      classification: row.normalized.classification, decision: isAccepted(row.normalized) ? "review" : "skip",
      error: isAccepted(row.normalized) ? null : row.normalized.classification_reason,
    }));
    for (let start = 0; start < rows.length; start += 250) {
      const write = await supa.from("import_rows").insert(rows.slice(start, start + 250));
      if (write.error) return NextResponse.json({ error: `Rows could not be staged: ${write.error.message}` }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, ngo: ngo.name, batchIds, rowsStaged: preview.totalRows, preview });
}
