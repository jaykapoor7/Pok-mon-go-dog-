import { explicitWorkbookIdentity, isAccepted, type NormalizedImportRow } from "./pipeline";
import { assessLocalities, type LocalityStatus } from "./commit";

export const MASTER_IMPORT_COMMIT_CHUNK_SIZE = 100;

type SourceRow = {
  id: string;
  batch_id: string;
  normalized: NormalizedImportRow;
  raw_row?: Record<string, unknown>;
  matched_dog_id: string | null;
  classification: string;
  decision: string;
  imported_dog_id: string | null;
  imported_case_id: string | null;
  error?: string | null;
};

type ImportedDog = { id: string; explicit: string | null; locality: string; clinical: string; eventAt: number };
type CaseRecord = { id: string; dog_id: string | null };
type DogLinkedRecord = { id: string; dog_id: string | null };

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const normal = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const label = (value: string) => value.replace(/_/g, " ");
const sourceDate = (row: NormalizedImportRow) => row.event_date ? Date.parse(row.event_date) : Number.NaN;

async function page<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const result: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await load(from, from + 499);
    if (error) throw new Error(error.message);
    result.push(...(data ?? []));
    if (!data || data.length < 500) return result;
  }
}

function sourceKey(batchId: string | null | undefined, fingerprint: string | null | undefined) {
  return batchId && fingerprint ? `${batchId}:${fingerprint}` : null;
}

function metadataKey(value: any) {
  return sourceKey(value?.import_batch_id, value?.row_fingerprint);
}

function rowKey(source: SourceRow) {
  return sourceKey(source.batch_id, source.normalized?.fingerprint);
}

function clinicalKey(row: NormalizedImportRow) {
  const text = normal([row.condition, row.case_detail, row.treatment_update].filter(Boolean).join(" "));
  const match = text.match(/\b(tvt|mange|parvo|distemper|fracture|maggot|rabies|rta|wound|skin)\b/);
  return match?.[1] ?? "";
}

function candidate(dogId: string, row: NormalizedImportRow): ImportedDog {
  return { id: dogId, explicit: explicitWorkbookIdentity(row), locality: normal(row.locality), clinical: clinicalKey(row), eventAt: sourceDate(row) };
}

function neutralName(row: NormalizedImportRow, ngo: any) {
  const month = row.event_date ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(row.event_date)) : "undated";
  return `Dog · ${row.locality || ngo.city || "Unknown locality"} · ${month}`;
}

function metadata(source: SourceRow, ngo: any) {
  return {
    import_batch_id: source.batch_id,
    source_workbook: "master_import_v2",
    source_sheet: source.normalized.source_sheet,
    source_row: source.normalized.source_row,
    source_subrecord: source.normalized.source_subrecord ?? null,
    row_fingerprint: source.normalized.fingerprint,
    imported_at: new Date().toISOString(),
    organisation: ngo.name,
    fields: source.raw_row ?? {},
    normalized: source.normalized,
  };
}

function detail(row: NormalizedImportRow) {
  return [row.case_detail, row.treatment_update, row.rescue_plan, row.review, row.admit_date && `Admitted ${row.admit_date.slice(0, 10)}`, row.release_date && `Released ${row.release_date.slice(0, 10)}`].filter(Boolean).join("\n") || null;
}

function isCase(row: NormalizedImportRow) { return ["rescue", "adoption", "foster"].includes(row.classification); }
function isMedical(row: NormalizedImportRow) { return ["treatment", "sterilisation", "vaccination"].includes(row.classification); }
function kind(row: NormalizedImportRow) { return row.classification === "sterilisation" ? "sterilisation" : row.classification === "vaccination" ? "vaccination" : row.classification === "treatment" ? "treatment" : "rescue"; }
function statusFor(row: NormalizedImportRow) { return /injur|wound|fracture|maggot|tvt|mange|rta|skin/.test(`${row.condition ?? ""} ${row.status ?? ""}`.toLowerCase()) ? "injured" : "seen"; }

function complete(source: SourceRow) {
  const row = source.normalized;
  if (!row || !isAccepted(row) || source.decision === "skip") return true;
  if (isCase(row)) return Boolean(source.imported_case_id);
  if (isMedical(row) || row.classification === "follow_up") return Boolean(source.imported_dog_id);
  return false;
}

async function cachedPoint(supa: any, row: NormalizedImportRow, ngo: any) {
  const key = [row.locality, ngo.city, ngo.state, "India"].filter(Boolean).join(", ").toLowerCase().replace(/\s+/g, " ").trim();
  const { data, error } = await supa.from("import_location_cache").select("lat,lng,precision").eq("normalized_query", key).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.precision !== "approximate" || data.lat === null || data.lng === null) throw new Error("Map publishing is blocked: locality preflight did not return an approximate point.");
  return data;
}

async function updateRow(supa: any, source: SourceRow, patch: Record<string, unknown>) {
  const { error } = await supa.from("import_rows").update(patch).eq("id", source.id);
  if (error) throw new Error(error.message);
  Object.assign(source, patch);
}

export async function commitStagedChunk(supa: any, ngo: any, batchIds: string[], chunkSize = MASTER_IMPORT_COMMIT_CHUNK_SIZE) {
  const rows = await page<SourceRow>((from, to) => supa.from("import_rows")
    .select("id,batch_id,raw_row,normalized,matched_dog_id,classification,decision,imported_dog_id,imported_case_id,error")
    .in("batch_id", batchIds).order("id").range(from, to));

  const [dogs, cases, medicalEvents, followUps, timelineEvents] = await Promise.all([
    page<any>((from, to) => supa.from("dogs").select("id,import_batch_id,source_metadata").in("import_batch_id", batchIds).order("id").range(from, to)),
    page<any>((from, to) => supa.from("cases").select("id,dog_id,import_batch_id,source_metadata").in("import_batch_id", batchIds).order("id").range(from, to)),
    page<any>((from, to) => supa.from("medical_events").select("id,dog_id,import_batch_id,source_metadata").in("import_batch_id", batchIds).order("id").range(from, to)),
    page<any>((from, to) => supa.from("animal_followups").select("id,dog_id,import_batch_id,source_metadata").in("import_batch_id", batchIds).order("id").range(from, to)),
    page<any>((from, to) => supa.from("animal_timeline_events").select("id,case_id,event_type,source_ref").eq("ngo_id", ngo.id).eq("provenance", "imported_historical_record").order("id").range(from, to)),
  ]);

  const dogBySource = new Map<string, string>();
  const caseBySource = new Map<string, CaseRecord>();
  const medicalBySource = new Map<string, DogLinkedRecord>();
  const followUpBySource = new Map<string, DogLinkedRecord>();
  const timelineBySource = new Map<string, string>();

  for (const item of dogs) { const key = metadataKey(item.source_metadata); if (key) dogBySource.set(key, item.id); }
  for (const item of cases) { const key = metadataKey(item.source_metadata); if (key) caseBySource.set(key, { id: item.id, dog_id: item.dog_id ?? null }); }
  for (const item of medicalEvents) { const key = metadataKey(item.source_metadata); if (key) medicalBySource.set(key, { id: item.id, dog_id: item.dog_id ?? null }); }
  for (const item of followUps) { const key = metadataKey(item.source_metadata); if (key) followUpBySource.set(key, { id: item.id, dog_id: item.dog_id ?? null }); }
  for (const item of timelineEvents) { const key = metadataKey(item.source_ref); if (key && batchIds.includes(item.source_ref?.import_batch_id)) timelineBySource.set(key, item.id); }

  const ordered = [...rows].sort((a, b) => (sourceDate(a.normalized) || 0) - (sourceDate(b.normalized) || 0) || a.id.localeCompare(b.id));
  const imported: ImportedDog[] = [];
  const exact = new Map<string, ImportedDog>();

  for (const source of ordered) {
    const row = source.normalized;
    if (!row || !isAccepted(row) || source.decision === "skip") continue;
    const key = rowKey(source);
    const recoveredDog = source.imported_dog_id || (key ? dogBySource.get(key) : null) || (key ? caseBySource.get(key)?.dog_id : null) || (key ? medicalBySource.get(key)?.dog_id : null) || (key ? followUpBySource.get(key)?.dog_id : null);
    if (!recoveredDog || !complete(source)) continue;
    const item = candidate(recoveredDog, row);
    imported.push(item);
    if (item.explicit && !exact.has(item.explicit)) exact.set(item.explicit, item);
  }

  const pending = ordered.filter((source) => {
    const row = source.normalized;
    return Boolean(row && isAccepted(row) && source.decision !== "skip" && !source.error && !complete(source));
  });
  const work = pending.slice(0, Math.max(1, Math.min(chunkSize, MASTER_IMPORT_COMMIT_CHUNK_SIZE)));
  const localityStatus: LocalityStatus = await assessLocalities(supa, work.map((source) => source.normalized), ngo);
  if (localityStatus.recordsFound && (!localityStatus.geocoderConfigured || localityStatus.unresolved)) {
    throw new Error(!localityStatus.geocoderConfigured
      ? `Map publishing is blocked: set ${localityStatus.requiredEnv} in the production server environment, then redeploy and retry.`
      : `Map publishing is blocked: ${localityStatus.unresolved.toLocaleString()} locality records could not be geocoded.`);
  }

  for (const source of work) {
    const row = source.normalized;
    const key = rowKey(source);
    if (!key) { await updateRow(supa, source, { decision: "review", error: "Missing import provenance key; manual review required." }); continue; }

    const explicit = explicitWorkbookIdentity(row);
    const local = normal(row.locality);
    const clinical = clinicalKey(row);
    const eventAt = sourceDate(row);
    const existingDogId = dogBySource.get(key) || caseBySource.get(key)?.dog_id || medicalBySource.get(key)?.dog_id || followUpBySource.get(key)?.dog_id || null;
    let profile: ImportedDog | undefined = existingDogId ? candidate(existingDogId, row) : source.matched_dog_id ? candidate(source.matched_dog_id, row) : explicit ? exact.get(explicit) : undefined;

    if (!profile && !explicit && ["treatment", "follow_up"].includes(row.classification) && clinical) {
      const unique = new Map<string, ImportedDog>();
      for (const item of imported) {
        if (item.locality === local && item.clinical === clinical && Number.isFinite(eventAt) && Math.abs(item.eventAt - eventAt) <= 365 * 86400000) unique.set(item.id, item);
      }
      const candidates = [...unique.values()];
      if (candidates.length === 1) profile = candidates[0];
      if (candidates.length > 1) {
        await updateRow(supa, source, { decision: "review", error: "Ambiguous imported-animal match; manual review required." });
        continue;
      }
    }

    if (!profile) {
      const point = await cachedPoint(supa, row, ngo);
      const { data, error } = await supa.from("dogs").insert({
        ngo_id: ngo.id, code: row.animal_code || null, name: row.animal_name || neutralName(row, ngo), species: "dog", sex: row.sex,
        color: row.colour || "Unknown", zone: row.locality, lat: point.lat, lng: point.lng, location_precision: "approximate",
        status: statusFor(row), first_seen: row.event_date, last_seen: row.event_date, provenance: "imported_historical_record",
        import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
      }).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Could not create imported animal profile.");
      dogBySource.set(key, data.id);
      profile = candidate(data.id, row);
    }

    imported.push(profile);
    if (profile.explicit && !exact.has(profile.explicit)) exact.set(profile.explicit, profile);
    const dogId = profile.id;

    if (row.classification === "follow_up") {
      if (!followUpBySource.has(key)) {
        const { data, error } = await supa.from("animal_followups").insert({
          ngo_id: ngo.id, dog_id: dogId, due_at: row.event_date, kind: "imported follow-up", note: detail(row),
          import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
        }).select("id,dog_id").single();
        if (error || !data) throw new Error(error?.message ?? "Could not create imported follow-up.");
        followUpBySource.set(key, { id: data.id, dog_id: data.dog_id ?? dogId });
      }
      await updateRow(supa, source, { decision: "merge", imported_dog_id: dogId, error: null });
      continue;
    }

    if (isMedical(row)) {
      if (!row.event_date) { await updateRow(supa, source, { decision: "review", error: "Medical record has no defensible event date." }); continue; }
      if (!medicalBySource.has(key)) {
        const { data, error } = await supa.from("medical_events").insert({
          dog_id: dogId, kind: kind(row), event_date: row.event_date.slice(0, 10), notes: detail(row), performed_by: ngo.name,
          import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
        }).select("id,dog_id").single();
        if (error || !data) throw new Error(error?.message ?? "Could not create imported medical event.");
        medicalBySource.set(key, { id: data.id, dog_id: data.dog_id ?? dogId });
      }
      const updates: Record<string, unknown> = { last_seen: row.event_date };
      if (row.classification === "sterilisation") Object.assign(updates, { sterilised: true, sterilisation_status: "sterilised" });
      if (row.classification === "vaccination") Object.assign(updates, { vaccinated: true, vaccination_status: "vaccinated" });
      const { error: dogError } = await supa.from("dogs").update(updates).eq("id", dogId).eq("ngo_id", ngo.id);
      if (dogError) throw new Error(dogError.message);
      await updateRow(supa, source, { decision: "merge", imported_dog_id: dogId, error: null });
      continue;
    }

    if (!isCase(row)) {
      await updateRow(supa, source, { decision: "review", error: "Record requires manual import review." });
      continue;
    }

    const point = await cachedPoint(supa, row, ngo);
    let record = caseBySource.get(key);
    if (!record) {
      const { data, error } = await supa.from("cases").insert({
        dog_id: dogId, ngo_id: ngo.id, title: [row.condition || `${label(row.classification)} record`, row.locality].filter(Boolean).join(" · "),
        description: detail(row), zone: row.locality, lat: point.lat, lng: point.lng,
        category: row.classification === "rescue" ? "rescue" : "other", status: /closed|complete|released|recovered|healed/i.test(row.status ?? "") ? "closed" : "in_progress",
        condition_text: row.condition, provenance: "imported_historical_record", verification_state: "verified", source_event_at: row.event_date,
        imported_at: new Date().toISOString(), import_batch_id: source.batch_id, source_metadata: metadata(source, ngo),
      }).select("id,dog_id").single();
      if (error || !data) throw new Error(error?.message ?? "Could not create case.");
      record = { id: data.id, dog_id: data.dog_id ?? dogId };
      caseBySource.set(key, record);
    }

    if (!timelineBySource.has(key)) {
      const { data, error } = await supa.from("animal_timeline_events").insert({
        ngo_id: ngo.id, dog_id: dogId, case_id: record.id, event_type: `import:${row.classification}`,
        title: row.condition || `${label(row.classification)} record`, details: detail(row), occurred_at: row.event_date,
        provenance: "imported_historical_record", source_ref: metadata(source, ngo), visibility: "partner",
      }).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Could not create imported timeline event.");
      timelineBySource.set(key, data.id);
    }

    const { error: dogError } = await supa.from("dogs").update({ last_seen: row.event_date }).eq("id", dogId).eq("ngo_id", ngo.id);
    if (dogError) throw new Error(dogError.message);
    await updateRow(supa, source, { decision: "merge", imported_dog_id: dogId, imported_case_id: record.id, error: null });
  }

  const eligible = rows.filter((source) => source.normalized && isAccepted(source.normalized) && source.decision !== "skip");
  const remaining = eligible.filter((source) => !source.error && !complete(source));
  const reviewRows = eligible.filter((source) => Boolean(source.error) && !complete(source));
  const processedRows = eligible.length - remaining.length - reviewRows.length;
  const completed = remaining.length === 0;

  if (completed) {
    const campaigns = new Map<string, number>();
    for (const source of eligible) {
      if (source.normalized.classification === "sterilisation" && complete(source)) campaigns.set(source.normalized.source_sheet, (campaigns.get(source.normalized.source_sheet) ?? 0) + 1);
    }
    for (const [name, count] of campaigns) {
      const campaign = { ngo_id: ngo.id, name, kind: "sterilisation", zone: ngo.city, source_rows_count: count, public_visibility: "summary", public_summary: `${count} validated sterilisation records from this completed drive.`, published_at: new Date().toISOString(), archived_at: new Date().toISOString() };
      const { data: exists } = await supa.from("campaigns").select("id").eq("ngo_id", ngo.id).eq("name", name).maybeSingle();
      const write = exists ? await supa.from("campaigns").update(campaign).eq("id", exists.id) : await supa.from("campaigns").insert(campaign);
      if (write.error) throw new Error(write.error.message);
    }
  }

  const status = completed ? (reviewRows.length ? "reviewing" : "imported") : "reviewing";
  const batchPatch: Record<string, unknown> = { status, rows_imported: processedRows, rows_needing_review: reviewRows.length };
  if (completed) batchPatch.completed_at = new Date().toISOString();
  const { error: batchError } = await supa.from("import_batches").update(batchPatch).in("id", batchIds);
  if (batchError) throw new Error(batchError.message);

  return {
    completed,
    processedRows,
    totalEligibleRows: eligible.length,
    remainingRows: remaining.length,
    casesCreated: new Set([...caseBySource.values()].map((item) => item.id)).size,
    profilesCreated: new Set(dogBySource.values()).size,
    medicalEvents: new Set([...medicalBySource.values()].map((item) => item.id)).size,
    followUps: new Set([...followUpBySource.values()].map((item) => item.id)).size,
    rowsNeedingReview: reviewRows.length,
    localityStatus,
  };
}
