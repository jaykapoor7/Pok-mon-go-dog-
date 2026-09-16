import { explicitWorkbookIdentity, isAccepted, type NormalizedImportRow, workbookAnimalKey } from "./pipeline";

export type LocalityStatus = { recordsFound: number; successfullyGeocoded: number; unresolved: number; geocoderConfigured: boolean; requiredEnv: "MAPBOX_ACCESS_TOKEN" | null };
export type ImportPlan = {
  profilesToCreate: number; timelineEntries: number; cases: number; treatments: number;
  vaccinations: number; sterilisations: number; adoptions: number; fosters: number;
  followUps: number; approximateLocations: number; excludedRows: number; followUpsAttached: number; ambiguousRows: number;
};

type SourceRow = {
  id: string; batch_id: string; normalized: NormalizedImportRow; raw_row?: Record<string, unknown>;
  matched_dog_id: string | null; classification: string; decision: string;
  imported_dog_id: string | null; imported_case_id: string | null;
};
type ImportedDog = { id: string; key: string; explicit: string | null; locality: string; clinical: string; eventAt: number };

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const normal = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const label = (value: string) => value.replace(/_/g, " ");
const sourceDate = (row: NormalizedImportRow) => row.event_date ? Date.parse(row.event_date) : Number.NaN;
export const LOCALITY_GEOCODE_CONCURRENCY = 8;

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
  // `locality` always reads the cache before calling Mapbox. Resolve only the
  // unique locality groups, with a bounded worker pool so a large workbook
  // finishes previewing promptly without flooding the geocoder.
  const work = [...groups.values()];
  let successfullyGeocoded = 0;
  let next = 0;
  const worker = async () => {
    for (;;) {
      const index = next++;
      if (index >= work.length) return;
      const group = work[index];
      if (await locality(supa, group.row, ngo)) successfullyGeocoded += group.records;
    }
  };
  await Promise.all(Array.from({ length: Math.min(LOCALITY_GEOCODE_CONCURRENCY, work.length) }, worker));
  return { recordsFound, successfullyGeocoded, unresolved: recordsFound - successfullyGeocoded, geocoderConfigured: true, requiredEnv: null };
}
function requireMapped(status: LocalityStatus) {
  if (!status.recordsFound) return;
  if (!status.geocoderConfigured) throw new Error(`Map publishing is blocked: set ${status.requiredEnv} in the production server environment, then redeploy and re-run the preview.`);
  if (status.unresolved) throw new Error(`Map publishing is blocked: ${status.unresolved.toLocaleString()} locality records could not be geocoded. Correct those localities in the review step and re-run the preview.`);
}

function kind(row: NormalizedImportRow) { return row.classification === "sterilisation" ? "sterilisation" : row.classification === "vaccination" ? "vaccination" : row.classification === "treatment" ? "treatment" : "rescue"; }
function statusFor(row: NormalizedImportRow) { return /injur|wound|fracture|maggot|tvt|mange|rta|skin/.test(`${row.condition ?? ""} ${row.status ?? ""}`.toLowerCase()) ? "injured" : "seen"; }
function clinicalKey(row: NormalizedImportRow) {
  const text = normal([row.condition, row.case_detail, row.treatment_update].filter(Boolean).join(" "));
  const match = text.match(/\b(tvt|mange|parvo|distemper|fracture|maggot|rabies|rta|wound|skin)\b/);
  return match?.[1] ?? "";
}
function neutralName(row: NormalizedImportRow, ngo: any) {
  const month = row.event_date ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(row.event_date)) : "undated";
  return `Dog · ${row.locality || ngo.city || "Unknown locality"} · ${month}`;
}
function metadata(source: SourceRow, ngo: any) {
  return {
    import_batch_id: source.batch_id, source_workbook: "master_import_v2", source_sheet: source.normalized.source_sheet,
    source_row: source.normalized.source_row, source_subrecord: source.normalized.source_subrecord ?? null,
    row_fingerprint: source.normalized.fingerprint, imported_at: new Date().toISOString(), organisation: ngo.name,
    fields: source.raw_row ?? {}, normalized: source.normalized,
  };
}
function detail(row: NormalizedImportRow) { return [row.case_detail, row.treatment_update, row.rescue_plan, row.review, row.admit_date && `Admitted ${row.admit_date.slice(0, 10)}`, row.release_date && `Released ${row.release_date.slice(0, 10)}`].filter(Boolean).join("\n") || null; }
function isCase(row: NormalizedImportRow) { return ["rescue", "adoption", "foster"].includes(row.classification); }
function isMedical(row: NormalizedImportRow) { return ["treatment", "sterilisation", "vaccination"].includes(row.classification); }

/** Preview the exact same native profile-resolution rules used by commit. */
export function planImport(rows: Array<Pick<SourceRow, "normalized" | "matched_dog_id" | "decision" | "imported_dog_id" | "imported_case_id">>): ImportPlan {
  const imported: ImportedDog[] = [];
  const exact = new Map<string, ImportedDog>();
  let profilesToCreate = 0, cases = 0, treatments = 0, vaccinations = 0, sterilisations = 0, adoptions = 0, fosters = 0, followUps = 0, excludedRows = 0, followUpsAttached = 0, ambiguousRows = 0;
  for (const source of rows) {
    const row = source.normalized;
    if (!row || source.decision === "skip" || source.imported_dog_id || source.imported_case_id || !isAccepted(row)) { excludedRows++; continue; }
    const explicit = explicitWorkbookIdentity(row); const local = normal(row.locality); const clinical = clinicalKey(row); const eventAt = sourceDate(row);
    let profile = source.matched_dog_id ? { id: source.matched_dog_id, key: "manual", explicit: null, locality: local, clinical, eventAt } : explicit ? exact.get(explicit) : undefined;
    if (!profile && !explicit && ["treatment", "follow_up"].includes(row.classification) && clinical) {
      const candidates = imported.filter((candidate) => candidate.locality === local && candidate.clinical === clinical && Number.isFinite(eventAt) && Math.abs(candidate.eventAt - eventAt) <= 365 * 86400000);
      if (candidates.length === 1) profile = candidates[0];
      if (candidates.length > 1) ambiguousRows++;
    }
    if (!profile) {
      profile = { id: `preview-${profilesToCreate + 1}`, key: workbookAnimalKey(row), explicit, locality: local, clinical, eventAt };
      imported.push(profile); if (explicit) exact.set(explicit, profile); profilesToCreate++;
    } else if (row.classification === "follow_up" || row.classification === "treatment") followUpsAttached++;
    if (isCase(row)) { cases++; if (row.classification === "adoption") adoptions++; if (row.classification === "foster") fosters++; }
    if (isMedical(row)) { if (row.classification === "treatment") treatments++; if (row.classification === "vaccination") vaccinations++; if (row.classification === "sterilisation") sterilisations++; }
    if (row.classification === "follow_up") followUps++;
  }
  return { profilesToCreate, timelineEntries: cases + treatments + vaccinations + sterilisations + followUps, cases, treatments, vaccinations, sterilisations, adoptions, fosters, followUps, approximateLocations: profilesToCreate, excludedRows, followUpsAttached, ambiguousRows };
}

export async function commitStaged(supa: any, ngo: any, batchIds: string[]) {
  const rows = await page<SourceRow>((from, to) => supa.from("import_rows").select("id,batch_id,raw_row,normalized,matched_dog_id,classification,decision,imported_dog_id,imported_case_id").in("batch_id", batchIds).order("id").range(from, to));
  const pending = rows.filter((source) => !source.imported_case_id && !source.imported_dog_id && source.decision !== "skip").map((source) => source.normalized).filter((row) => row && isAccepted(row));
  const localityStatus = await assessLocalities(supa, pending, ngo); requireMapped(localityStatus);
  const imported: ImportedDog[] = [];
  const exact = new Map<string, ImportedDog>();
  let casesCreated = 0, profilesCreated = 0, review = 0, medical = 0, followups = 0;
  const campaigns = new Map<string, number>();
  const ordered = [...rows].sort((a, b) => (sourceDate(a.normalized) || 0) - (sourceDate(b.normalized) || 0) || a.id.localeCompare(b.id));
  for (const source of ordered) {
    const row = source.normalized;
    if (!row || !isAccepted(row) || source.decision === "skip" || source.imported_case_id || source.imported_dog_id) continue;
    const explicit = explicitWorkbookIdentity(row); const local = normal(row.locality); const clinical = clinicalKey(row); const eventAt = sourceDate(row);
    let profile: ImportedDog | undefined = source.matched_dog_id ? { id: source.matched_dog_id, key: "manual", explicit: null, locality: local, clinical, eventAt } : explicit ? exact.get(explicit) : undefined;
    if (!profile && !explicit && ["treatment", "follow_up"].includes(row.classification) && clinical) {
      const candidates = imported.filter((candidate) => candidate.locality === local && candidate.clinical === clinical && Number.isFinite(eventAt) && Math.abs(candidate.eventAt - eventAt) <= 365 * 86400000);
      if (candidates.length === 1) profile = candidates[0];
      if (candidates.length > 1) { review++; continue; }
    }
    if (!profile) {
      const point = await locality(supa, row, ngo);
      if (!point) throw new Error("Map publishing is blocked: locality preflight did not return an approximate point.");
      const { data, error } = await supa.from("dogs").insert({
        ngo_id: ngo.id, code: row.animal_code || null, name: row.animal_name || neutralName(row, ngo), species: "dog", sex: row.sex,
        color: row.colour || "Unknown", zone: row.locality, lat: point.lat, lng: point.lng, location_precision: "approximate",
        status: statusFor(row), first_seen: row.event_date, last_seen: row.event_date, provenance: "imported_historical_record",
        import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
      }).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Could not create imported animal profile.");
      profile = { id: data.id, key: workbookAnimalKey(row), explicit, locality: local, clinical, eventAt };
      imported.push(profile); if (explicit) exact.set(explicit, profile); profilesCreated++;
    }
    const dogId = profile.id;
    if (row.classification === "sterilisation") campaigns.set(row.source_sheet, (campaigns.get(row.source_sheet) ?? 0) + 1);
    if (row.classification === "follow_up") {
      const { error } = await supa.from("animal_followups").insert({ ngo_id: ngo.id, dog_id: dogId, due_at: row.event_date, kind: "imported follow-up", note: detail(row), import_batch_id: source.batch_id, source_metadata: metadata(source, ngo) });
      if (error) throw new Error(error.message); followups++;
      await supa.from("import_rows").update({ decision: "merge", imported_dog_id: dogId }).eq("id", source.id); continue;
    }
    if (isMedical(row)) {
      if (!row.event_date) { review++; continue; }
      const { error } = await supa.from("medical_events").insert({ dog_id: dogId, kind: kind(row), event_date: row.event_date.slice(0, 10), notes: detail(row), performed_by: ngo.name, import_batch_id: source.batch_id, source_metadata: metadata(source, ngo) });
      if (error) throw new Error(error.message); medical++;
      const updates: Record<string, unknown> = { last_seen: row.event_date };
      if (row.classification === "sterilisation") Object.assign(updates, { sterilised: true, sterilisation_status: "sterilised" });
      if (row.classification === "vaccination") Object.assign(updates, { vaccinated: true, vaccination_status: "vaccinated" });
      const { error: dogError } = await supa.from("dogs").update(updates).eq("id", dogId).eq("ngo_id", ngo.id);
      if (dogError) throw new Error(dogError.message);
      await supa.from("import_rows").update({ decision: "merge", imported_dog_id: dogId }).eq("id", source.id); continue;
    }
    if (!isCase(row)) { review++; continue; }
    const point = await locality(supa, row, ngo);
    const { data: record, error } = await supa.from("cases").insert({
      dog_id: dogId, ngo_id: ngo.id, title: [row.condition || `${label(row.classification)} record`, row.locality].filter(Boolean).join(" · "),
      description: detail(row), zone: row.locality, lat: point?.lat ?? null, lng: point?.lng ?? null,
      category: row.classification === "rescue" ? "rescue" : "other", status: /closed|complete|released|recovered|healed/i.test(row.status ?? "") ? "closed" : "in_progress",
      condition_text: row.condition, provenance: "imported_historical_record", verification_state: "verified", source_event_at: row.event_date,
      imported_at: new Date().toISOString(), import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
    }).select("id").single();
    if (error || !record) throw new Error(error?.message ?? "Could not create case."); casesCreated++;
    const { error: timelineError } = await supa.from("animal_timeline_events").insert({
      ngo_id: ngo.id, dog_id: dogId, case_id: record.id, event_type: `import:${row.classification}`,
      title: row.condition || `${label(row.classification)} record`, details: detail(row), occurred_at: row.event_date,
      provenance: "imported_historical_record", source_ref: metadata(source, ngo), visibility: "partner",
    });
    if (timelineError) throw new Error(timelineError.message);
    const { error: dogError } = await supa.from("dogs").update({ last_seen: row.event_date }).eq("id", dogId).eq("ngo_id", ngo.id);
    if (dogError) throw new Error(dogError.message);
    await supa.from("import_rows").update({ decision: "merge", imported_dog_id: dogId, imported_case_id: record.id }).eq("id", source.id);
  }
  for (const [name, count] of campaigns) {
    const campaign = { ngo_id: ngo.id, name, kind: "sterilisation", zone: ngo.city, source_rows_count: count, public_visibility: "summary", public_summary: `${count} validated sterilisation records from this completed drive.`, published_at: new Date().toISOString(), archived_at: new Date().toISOString() };
    const { data: exists } = await supa.from("campaigns").select("id").eq("ngo_id", ngo.id).eq("name", name).maybeSingle();
    const write = exists ? await supa.from("campaigns").update(campaign).eq("id", exists.id) : await supa.from("campaigns").insert(campaign);
    if (write.error) throw new Error(write.error.message);
  }
  await supa.from("import_batches").update({ status: review ? "reviewing" : "imported", rows_imported: casesCreated + medical + followups, rows_needing_review: review, completed_at: new Date().toISOString() }).in("id", batchIds);
  return { casesCreated, profilesCreated, medicalEvents: medical, followUps: followups, rowsNeedingReview: review, localityStatus };
}
