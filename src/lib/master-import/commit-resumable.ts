/*
 * Bounded, resumable master-import commit path.
 *
 * A commit invocation owns one small, keyset-ordered piece of one staged
 * batch. It never reads an entire workbook or the historic records created
 * by that workbook. `import_source_key` is a durable unique idempotency key
 * on canonical records, so a timeout between a write and progress update is
 * safe to retry.
 */

import { explicitWorkbookIdentity, isAccepted, workbookAnimalKey, type NormalizedImportRow } from "./pipeline";

export const MASTER_IMPORT_COMMIT_CHUNK_SIZE = 100;

type SourceRow = {
  id: string; batch_id: string; normalized: NormalizedImportRow; raw_row?: Record<string, unknown>;
  matched_dog_id: string | null; classification: string; decision: string;
  imported_dog_id: string | null; imported_case_id: string | null; error?: string | null;
};
type Batch = { id: string; status: string; rows_imported: number | null; rows_needing_review: number | null; commit_cursor: string | null };
type DogRecord = { id: string; import_source_key: string | null };
type CaseRecord = { id: string; dog_id: string | null; import_source_key: string | null };
type DogLinkedRecord = { id: string; dog_id: string | null; import_source_key: string | null };

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const label = (value: string) => value.replace(/_/g, " ");
const sourceKey = (batchId: string, fingerprint: string | null | undefined) => fingerprint ? `${batchId}:${fingerprint}` : null;
const rowKey = (row: SourceRow) => sourceKey(row.batch_id, row.normalized?.fingerprint);
const isCase = (row: NormalizedImportRow) => ["rescue", "adoption", "foster"].includes(row.classification);
const isMedical = (row: NormalizedImportRow) => ["treatment", "sterilisation", "vaccination"].includes(row.classification);
const kind = (row: NormalizedImportRow) => row.classification === "sterilisation" ? "sterilisation" : row.classification === "vaccination" ? "vaccination" : row.classification === "treatment" ? "treatment" : "rescue";
const statusFor = (row: NormalizedImportRow) => /injur|wound|fracture|maggot|tvt|mange|rta|skin/.test(`${row.condition ?? ""} ${row.status ?? ""}`.toLowerCase()) ? "injured" : "seen";

function animalKey(source: SourceRow) {
  const identity = explicitWorkbookIdentity(source.normalized);
  return `${source.batch_id}:animal:${identity || workbookAnimalKey(source.normalized)}`;
}

function neutralName(row: NormalizedImportRow, ngo: any) {
  const month = row.event_date ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(row.event_date)) : "undated";
  const species = clean(row.species || "animal").replace(/_/g, " ");
  return `${species.charAt(0).toUpperCase() + species.slice(1)} · ${row.locality || ngo.city || "Unknown locality"} · ${month}`;
}

function metadata(source: SourceRow, ngo: any) {
  return {
    import_batch_id: source.batch_id, source_workbook: "master_import_v2", source_sheet: source.normalized.source_sheet,
    source_row: source.normalized.source_row, source_subrecord: source.normalized.source_subrecord ?? null,
    row_fingerprint: source.normalized.fingerprint, imported_at: new Date().toISOString(), organisation: ngo.name,
    fields: source.raw_row ?? {}, normalized: source.normalized,
  };
}

function detail(row: NormalizedImportRow) {
  return [row.case_detail, row.treatment_update, row.rescue_plan, row.review, row.admit_date && `Admitted ${row.admit_date.slice(0, 10)}`, row.release_date && `Released ${row.release_date.slice(0, 10)}`].filter(Boolean).join("\n") || null;
}

async function updateRow(supa: any, source: SourceRow, patch: Record<string, unknown>) {
  const { error } = await supa.from("import_rows").update(patch).eq("id", source.id);
  if (error) throw new Error(error.message);
  Object.assign(source, patch);
}

async function cachedPoint(supa: any, row: NormalizedImportRow, ngo: any) {
  const key = [row.locality, ngo.city, ngo.state, "India"].filter(Boolean).join(", ").toLowerCase().replace(/\s+/g, " ").trim();
  const { data, error } = await supa.from("import_location_cache").select("lat,lng,precision").eq("normalized_query", key).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.precision !== "approximate" || data.lat === null || data.lng === null) throw new Error("Map publishing is blocked: locality preflight did not return an approximate point.");
  return data;
}

async function nextBatch(supa: any, batchIds: string[]) {
  const { data, error } = await supa.from("import_batches")
    .select("id,status,rows_imported,rows_needing_review,commit_cursor")
    .in("id", batchIds).order("created_at").limit(Math.min(64, Math.max(1, batchIds.length)));
  if (error) throw new Error(error.message);
  return ((data ?? []) as Batch[]).find((batch) => batch.status !== "imported") ?? null;
}

/* The recovery migration creates this RPC. It applies the pending-state
 * predicate and cursor in SQL, so PostgREST does not serially walk completed
 * rows to find a later chunk. */
async function pendingChunk(supa: any, batch: Batch, size: number) {
  const { data, error } = await supa.rpc("next_pending_import_rows", { p_batch_id: batch.id, p_after_id: batch.commit_cursor, p_limit: size });
  if (error) throw new Error(error.message);
  return (data ?? []) as SourceRow[];
}

async function byKeys<T>(supa: any, table: string, fields: string, keys: string[]) {
  if (!keys.length) return [] as T[];
  const { data, error } = await supa.from(table).select(fields).in("import_source_key", keys).limit(keys.length);
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

async function upsertOne<T>(supa: any, table: string, value: Record<string, unknown>, fields: string): Promise<T> {
  const { data, error } = await supa.from(table).upsert(value, { onConflict: "import_source_key", ignoreDuplicates: false }).select(fields).single();
  if (error || !data) throw new Error(error?.message ?? `Could not write imported ${table} record.`);
  return data as T;
}

function pendingFor(source: SourceRow) {
  const row = source.normalized;
  return Boolean(row && isAccepted(row) && source.decision !== "skip" && !source.error && (
    (isCase(row) && !source.imported_case_id) || ((isMedical(row) || row.classification === "follow_up") && !source.imported_dog_id)
  ));
}

export async function commitStagedChunk(supa: any, ngo: any, batchIds: string[], chunkSize = MASTER_IMPORT_COMMIT_CHUNK_SIZE) {
  if (!batchIds.length) throw new Error("Choose at least one staged import batch.");
  const batch = await nextBatch(supa, batchIds);
  if (!batch) return { completed: true, processedRows: 0, totalEligibleRows: 0, remainingRows: 0, casesCreated: 0, profilesCreated: 0, medicalEvents: 0, followUps: 0, rowsNeedingReview: 0, localityStatus: null };

  const size = Math.max(1, Math.min(chunkSize, MASTER_IMPORT_COMMIT_CHUNK_SIZE));
  const work = (await pendingChunk(supa, batch, size)).filter(pendingFor).slice(0, size);
  if (!work.length) {
    const { error } = await supa.from("import_batches").update({ status: "imported", completed_at: new Date().toISOString() }).eq("id", batch.id);
    if (error) throw new Error(error.message);
    // Only enqueue city/cell maintenance. The worker, not a visitor or this
    // request, performs the expensive spatial refresh.
    await supa.rpc("enqueue_spatial_refresh", { p_city: ngo.city ?? null }).catch(() => undefined);
    return { completed: true, processedRows: batch.rows_imported ?? 0, totalEligibleRows: 0, remainingRows: 0, casesCreated: 0, profilesCreated: 0, medicalEvents: 0, followUps: 0, rowsNeedingReview: batch.rows_needing_review ?? 0, localityStatus: null };
  }

  const rowKeys = work.map(rowKey).filter((key): key is string => Boolean(key));
  const animalKeys = [...new Set(work.map(animalKey))];
  const [dogs, cases, medical, followups, timelines] = await Promise.all([
    byKeys<DogRecord>(supa, "dogs", "id,import_source_key", animalKeys),
    byKeys<CaseRecord>(supa, "cases", "id,dog_id,import_source_key", rowKeys),
    byKeys<DogLinkedRecord>(supa, "medical_events", "id,dog_id,import_source_key", rowKeys),
    byKeys<DogLinkedRecord>(supa, "animal_followups", "id,dog_id,import_source_key", rowKeys),
    byKeys<{ id: string; import_source_key: string | null }>(supa, "animal_timeline_events", "id,import_source_key", rowKeys),
  ]);
  const dogByKey = new Map(dogs.map((item) => [item.import_source_key, item.id]));
  const caseByKey = new Map(cases.map((item) => [item.import_source_key, item]));
  const medicalByKey = new Map(medical.map((item) => [item.import_source_key, item]));
  const followupByKey = new Map(followups.map((item) => [item.import_source_key, item]));
  const timelineByKey = new Map(timelines.map((item) => [item.import_source_key, item.id]));
  let profilesCreated = 0, casesCreated = 0, medicalEvents = 0, followUps = 0, review = 0;

  for (const source of work) {
    const row = source.normalized;
    const key = rowKey(source);
    if (!key) { await updateRow(supa, source, { decision: "review", error: "Missing import provenance key; manual review required." }); review++; continue; }
    let dogId = source.imported_dog_id || source.matched_dog_id || dogByKey.get(animalKey(source)) || null;
    // Do not guess across historical records: an ambiguous, unidentified
    // care row stays for a human match instead of creating a duplicate dog.
    if (!dogId && !explicitWorkbookIdentity(row) && ["treatment", "follow_up"].includes(row.classification)) {
      await updateRow(supa, source, { decision: "review", error: "Treatment/follow-up has no stable animal identity; manual match required." }); review++; continue;
    }
    if (!dogId) {
      const point = await cachedPoint(supa, row, ngo);
      const created = await upsertOne<DogRecord>(supa, "dogs", {
        import_source_key: animalKey(source), ngo_id: ngo.id, code: row.animal_code || null, name: row.animal_name || neutralName(row, ngo),
        species: row.species || "animal", sex: row.sex, color: row.colour || "Unknown", zone: row.locality, lat: point.lat, lng: point.lng,
        location_precision: "approximate", status: statusFor(row), first_seen: row.event_date, last_seen: row.event_date,
        provenance: "imported_historical_record", import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
      }, "id,import_source_key");
      dogId = created.id;
      if (!dogByKey.has(animalKey(source))) profilesCreated++;
      dogByKey.set(animalKey(source), dogId);
    }

    if (row.classification === "follow_up") {
      if (!followupByKey.has(key)) {
        followupByKey.set(key, await upsertOne<DogLinkedRecord>(supa, "animal_followups", {
          import_source_key: key, ngo_id: ngo.id, dog_id: dogId, due_at: row.event_date, kind: "imported follow-up", note: detail(row),
          import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
        }, "id,dog_id,import_source_key"));
        followUps++;
      }
      await updateRow(supa, source, { decision: "merge", imported_dog_id: dogId, error: null });
      continue;
    }

    if (isMedical(row)) {
      if (!row.event_date) { await updateRow(supa, source, { decision: "review", error: "Medical record has no defensible event date." }); review++; continue; }
      if (!medicalByKey.has(key)) {
        medicalByKey.set(key, await upsertOne<DogLinkedRecord>(supa, "medical_events", {
          import_source_key: key, dog_id: dogId, kind: kind(row), event_date: row.event_date.slice(0, 10), notes: detail(row), performed_by: ngo.name,
          import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
        }, "id,dog_id,import_source_key"));
        medicalEvents++;
      }
      const updates: Record<string, unknown> = { last_seen: row.event_date };
      if (row.classification === "sterilisation") Object.assign(updates, { sterilised: true, sterilisation_status: "sterilised" });
      if (row.classification === "vaccination") Object.assign(updates, { vaccinated: true, vaccination_status: "vaccinated" });
      const { error } = await supa.from("dogs").update(updates).eq("id", dogId).eq("ngo_id", ngo.id);
      if (error) throw new Error(error.message);
      await updateRow(supa, source, { decision: "merge", imported_dog_id: dogId, error: null });
      continue;
    }

    if (!isCase(row)) { await updateRow(supa, source, { decision: "review", error: "Record requires manual import review." }); review++; continue; }
    let record = caseByKey.get(key);
    if (!record) {
      const point = await cachedPoint(supa, row, ngo);
      record = await upsertOne<CaseRecord>(supa, "cases", {
        import_source_key: key, dog_id: dogId, ngo_id: ngo.id, title: [row.condition || `${label(row.classification)} record`, row.locality].filter(Boolean).join(" · "),
        description: detail(row), zone: row.locality, lat: point.lat, lng: point.lng, category: row.classification === "rescue" ? "rescue" : "other",
        status: /closed|complete|released|recovered|healed/i.test(row.status ?? "") ? "closed" : "in_progress", condition_text: row.condition,
        provenance: "imported_historical_record", verification_state: "verified", source_event_at: row.event_date, imported_at: new Date().toISOString(),
        import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
      }, "id,dog_id,import_source_key");
      caseByKey.set(key, record); casesCreated++;
    }
    if (!timelineByKey.has(key)) {
      const event = await upsertOne<{ id: string; import_source_key: string | null }>(supa, "animal_timeline_events", {
        import_source_key: key, ngo_id: ngo.id, dog_id: dogId, case_id: record.id, event_type: `import:${row.classification}`,
        title: row.condition || `${label(row.classification)} record`, details: detail(row), occurred_at: row.event_date,
        provenance: "imported_historical_record", source_ref: metadata(source, ngo), visibility: "partner",
      }, "id,import_source_key");
      timelineByKey.set(key, event.id);
    }
    const { error } = await supa.from("dogs").update({ last_seen: row.event_date }).eq("id", dogId).eq("ngo_id", ngo.id);
    if (error) throw new Error(error.message);
    await updateRow(supa, source, { decision: "merge", imported_dog_id: dogId, imported_case_id: record.id, error: null });
  }

  const processedRows = (batch.rows_imported ?? 0) + work.length - review;
  const rowsNeedingReview = (batch.rows_needing_review ?? 0) + review;
  const { error: batchError } = await supa.from("import_batches").update({
    status: "reviewing", commit_cursor: work[work.length - 1].id, commit_started_at: new Date().toISOString(),
    rows_imported: processedRows, rows_needing_review: rowsNeedingReview,
  }).eq("id", batch.id);
  if (batchError) throw new Error(batchError.message);
  return { completed: false, processedRows, totalEligibleRows: 0, remainingRows: null, casesCreated, profilesCreated, medicalEvents, followUps, rowsNeedingReview, localityStatus: null };
}
