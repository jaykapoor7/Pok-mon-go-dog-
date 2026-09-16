import { hasDefensibleIdentity, isAccepted, type NormalizedImportRow } from "./pipeline";

export type LocalityStatus = { recordsFound: number; successfullyGeocoded: number; unresolved: number; geocoderConfigured: boolean; requiredEnv: "MAPBOX_ACCESS_TOKEN" | null };

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const same = (value: string | null | undefined) => clean(value).toLowerCase();
const label = (value: string) => value.replace(/_/g, " ");

async function page<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const result: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await load(from, from + 499);
    if (error) throw new Error(error.message);
    result.push(...(data ?? []));
    if (!data || data.length < 500) return result;
  }
}
function token() { return process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null; }
function localityKey(row: NormalizedImportRow, ngo: any) { return [row.locality, ngo.city, ngo.state, "India"].filter(Boolean).join(", ").toLowerCase().replace(/\s+/g, " ").trim(); }
async function locality(supa: any, row: NormalizedImportRow, ngo: any) {
  if (!row.locality) return null;
  const key = localityKey(row, ngo);
  const { data: cached } = await supa.from("import_location_cache").select("lat,lng,precision").eq("normalized_query", key).maybeSingle();
  if (cached?.precision === "approximate" && cached.lat !== null && cached.lng !== null) return cached;
  const accessToken = token();
  if (!accessToken) return null;
  const query = [row.locality, ngo.city, ngo.state, "India"].filter(Boolean).join(", ");
  try {
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(accessToken)}&country=in&limit=1`, { signal: AbortSignal.timeout(8_000) });
    const center = (await response.json()).features?.[0]?.center;
    if (!Array.isArray(center) || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) return null;
    const result = { normalized_query: key, locality: row.locality, city: ngo.city, state: ngo.state, lat: center[1], lng: center[0], provider: "mapbox", precision: "approximate" };
    await supa.from("import_location_cache").upsert(result, { onConflict: "normalized_query" });
    return result;
  } catch { return null; }
}

export async function assessLocalities(supa: any, rows: NormalizedImportRow[], ngo: any): Promise<LocalityStatus> {
  const groups = new Map<string, { row: NormalizedImportRow; records: number }>();
  for (const row of rows) {
    if (!isAccepted(row) || !row.locality) continue;
    const key = localityKey(row, ngo); const group = groups.get(key);
    if (group) group.records++; else groups.set(key, { row, records: 1 });
  }
  const recordsFound = [...groups.values()].reduce((sum, group) => sum + group.records, 0);
  if (!recordsFound) return { recordsFound: 0, successfullyGeocoded: 0, unresolved: 0, geocoderConfigured: Boolean(token()), requiredEnv: null };
  if (!token()) return { recordsFound, successfullyGeocoded: 0, unresolved: recordsFound, geocoderConfigured: false, requiredEnv: "MAPBOX_ACCESS_TOKEN" };
  let successfullyGeocoded = 0;
  for (const group of groups.values()) if (await locality(supa, group.row, ngo)) successfullyGeocoded += group.records;
  return { recordsFound, successfullyGeocoded, unresolved: recordsFound - successfullyGeocoded, geocoderConfigured: true, requiredEnv: null };
}
function requireMapped(status: LocalityStatus) {
  if (!status.recordsFound) return;
  if (!status.geocoderConfigured) throw new Error(`Map publishing is blocked: set ${status.requiredEnv} in the production server environment, then redeploy and re-run the preview.`);
  if (status.unresolved) throw new Error(`Map publishing is blocked: ${status.unresolved.toLocaleString()} locality records could not be geocoded. Correct those localities in the review step and re-run the preview.`);
}
function kind(row: NormalizedImportRow) { return row.classification === "sterilisation" ? "sterilisation" : row.classification === "vaccination" ? "vaccination" : row.classification === "treatment" ? "treatment" : "rescue"; }
function statusFor(row: NormalizedImportRow) { return /injur|wound|fracture|maggot|tvt|mange|rta|skin/.test(`${row.condition ?? ""} ${row.status ?? ""}`.toLowerCase()) ? "injured" : "seen"; }

export async function commitStaged(supa: any, ngo: any, batchIds: string[]) {
  const rows = await page<any>((from, to) => supa.from("import_rows").select("id,batch_id,normalized,matched_dog_id,classification,decision,imported_dog_id,imported_case_id").in("batch_id", batchIds).order("id").range(from, to));
  const dogs = await page<any>((from, to) => supa.from("dogs").select("id,code,name,zone,sex,color").eq("ngo_id", ngo.id).order("id").range(from, to));
  const pending = rows.filter((source) => !source.imported_case_id && !source.imported_dog_id && source.decision !== "skip").map((source) => source.normalized as NormalizedImportRow).filter((row) => row && isAccepted(row));
  const localityStatus = await assessLocalities(supa, pending, ngo); requireMapped(localityStatus);
  let casesCreated = 0, profilesCreated = 0, review = 0, medical = 0;
  const campaigns = new Map<string, number>();
  for (const source of rows) {
    const row = source.normalized as NormalizedImportRow;
    if (!row || !isAccepted(row) || source.decision === "skip" || source.imported_case_id || source.imported_dog_id) continue;
    let dogId = source.matched_dog_id as string | null;
    if (!dogId && hasDefensibleIdentity(row)) {
      const match = dogs.find((dog) =>
        (row.animal_code && same(dog.code) === same(row.animal_code)) ||
        (!row.animal_code && same(dog.name) === same(row.animal_name) && same(dog.zone) === same(row.locality) &&
          ((row.sex && same(dog.sex) === same(row.sex)) || (row.colour && same(dog.color) === same(row.colour))))
      );
      dogId = match?.id ?? null;
      if (!dogId) {
        const point = await locality(supa, row, ngo);
        if (!point) throw new Error("Map publishing is blocked: locality preflight did not return an approximate point.");
        const { data, error } = await supa.from("dogs").insert({ ngo_id: ngo.id, code: row.animal_code || null, name: row.animal_name, species: "dog", sex: row.sex, color: row.colour || "Unknown", zone: row.locality, lat: point.lat, lng: point.lng, location_precision: "approximate", status: statusFor(row), first_seen: row.event_date, last_seen: row.event_date, provenance: "imported_historical_record", source_metadata: { source: "master_import_v2", fingerprint: row.fingerprint } }).select("id,code,name,zone,sex,color").single();
        if (error || !data) throw new Error(error?.message ?? "Could not create identified animal profile.");
        dogId = data.id; dogs.push(data); profilesCreated++;
      }
    }
    if (row.classification === "sterilisation") campaigns.set(row.source_sheet, (campaigns.get(row.source_sheet) ?? 0) + 1);
    if (["treatment", "follow_up", "sterilisation", "vaccination"].includes(row.classification)) {
      if (!dogId || !row.event_date) { review++; continue; }
      if (row.classification === "follow_up") {
        const { error } = await supa.from("animal_followups").insert({ ngo_id: ngo.id, dog_id: dogId, due_at: row.event_date, kind: "imported follow-up", note: [row.treatment_update, row.review, row.case_detail].filter(Boolean).join("\n") || null }); if (error) throw new Error(error.message);
      } else {
        const { error } = await supa.from("medical_events").insert({ dog_id: dogId, kind: kind(row), event_date: row.event_date.slice(0, 10), notes: [row.case_detail, row.treatment_update, row.review].filter(Boolean).join("\n") || null, performed_by: ngo.name }); if (error) throw new Error(error.message); medical++;
        if (row.classification === "sterilisation") await supa.from("dogs").update({ sterilised: true, sterilisation_status: "sterilised", last_seen: row.event_date }).eq("id", dogId).eq("ngo_id", ngo.id);
        if (row.classification === "vaccination") await supa.from("dogs").update({ vaccinated: true, vaccination_status: "vaccinated", last_seen: row.event_date }).eq("id", dogId).eq("ngo_id", ngo.id);
      }
      await supa.from("import_rows").update({ decision: "merge", imported_dog_id: dogId }).eq("id", source.id); continue;
    }
    if (!["rescue", "adoption", "foster"].includes(row.classification)) { review++; continue; }
    const point = await locality(supa, row, ngo);
    const { data: record, error } = await supa.from("cases").insert({ dog_id: dogId, ngo_id: ngo.id, title: [row.condition || `${label(row.classification)} record`, row.locality].filter(Boolean).join(" · "), description: [row.case_detail, row.treatment_update, row.rescue_plan, row.review].filter(Boolean).join("\n") || null, zone: row.locality, lat: point?.lat ?? null, lng: point?.lng ?? null, category: row.classification === "rescue" ? "rescue" : "other", status: /closed|complete|released|recovered|healed/i.test(row.status ?? "") ? "closed" : "in_progress", condition_text: row.condition, provenance: "imported_historical_record", verification_state: "verified", source_event_at: row.event_date, imported_at: new Date().toISOString() }).select("id").single();
    if (error || !record) throw new Error(error?.message ?? "Could not create case."); casesCreated++;
    if (dogId && row.event_date) {
      const { error: timelineError } = await supa.from("animal_timeline_events").insert({ ngo_id: ngo.id, dog_id: dogId, case_id: record.id, event_type: `import:${row.classification}`, title: row.condition || `${label(row.classification)} record`, details: [row.case_detail, row.treatment_update, row.rescue_plan, row.review].filter(Boolean).join("\n") || null, occurred_at: row.event_date, provenance: "imported_historical_record", source_ref: { import_row_id: source.id, fingerprint: row.fingerprint }, visibility: "partner" }); if (timelineError) throw new Error(timelineError.message);
      await supa.from("dogs").update({ last_seen: row.event_date }).eq("id", dogId).eq("ngo_id", ngo.id);
    }
    await supa.from("import_rows").update({ decision: dogId ? "merge" : "review", imported_dog_id: dogId, imported_case_id: record.id }).eq("id", source.id);
  }
  for (const [name, count] of campaigns) {
    const campaign = { ngo_id: ngo.id, name, kind: "sterilisation", zone: ngo.city, source_rows_count: count, public_visibility: "summary", public_summary: `${count} validated sterilisation records from this completed drive.`, published_at: new Date().toISOString(), archived_at: new Date().toISOString() };
    const { data: exists } = await supa.from("campaigns").select("id").eq("ngo_id", ngo.id).eq("name", name).maybeSingle(); const write = exists ? await supa.from("campaigns").update(campaign).eq("id", exists.id) : await supa.from("campaigns").insert(campaign); if (write.error) throw new Error(write.error.message);
  }
  await supa.from("import_batches").update({ status: review ? "reviewing" : "imported", rows_imported: casesCreated + medical, rows_needing_review: review, completed_at: new Date().toISOString() }).in("id", batchIds);
  return { casesCreated, profilesCreated, medicalEvents: medical, rowsNeedingReview: review, localityStatus };
}
