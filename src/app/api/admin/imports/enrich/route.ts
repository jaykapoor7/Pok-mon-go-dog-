import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  WORKBOOK_ENRICHMENT_VERSION,
  deriveCaseState,
  deriveHistoryEvents,
  deriveMedicalEvents,
  deriveProgrammes,
  latestHistoricalDate,
  shouldHaveRescueCase,
  strictVaccinationRecorded,
  type EnrichmentSource,
} from "@/lib/master-import/enrichment";

export const runtime = "nodejs";
export const maxDuration = 300;

const CHUNK_SIZE = 40;
const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

function authorised(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  return Boolean(secret && auth?.startsWith("Bearer ") && auth.slice(7).trim() === secret);
}

async function page<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await load(from, from + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

function sourceKey(batchId: string | null | undefined, fingerprint: string | null | undefined) {
  return batchId && fingerprint ? `${batchId}:${fingerprint}` : null;
}
function metadataKey(value: any) { return sourceKey(value?.import_batch_id, value?.row_fingerprint); }
function sourceMetadata(source: EnrichmentSource, derivedEventKey?: string) {
  return {
    import_batch_id: source.batch_id,
    source_workbook: "master_import_v2",
    source_sheet: source.normalized.source_sheet,
    source_row: source.normalized.source_row,
    source_subrecord: source.normalized.source_subrecord ?? null,
    row_fingerprint: source.normalized.fingerprint,
    normalized: source.normalized,
    enrichment_version: WORKBOOK_ENRICHMENT_VERSION,
    ...(derivedEventKey ? { derived_event_key: derivedEventKey } : {}),
  };
}
function detail(source: EnrichmentSource) {
  const row = source.normalized;
  return [row.case_detail, row.treatment_update, row.rescue_plan, row.review, row.admit_date && `Admitted ${row.admit_date.slice(0, 10)}`, row.release_date && `Released ${row.release_date.slice(0, 10)}`].filter(Boolean).join("\n") || null;
}
async function inChunks<T>(items: T[], size: number, run: (chunk: T[]) => Promise<void>) { for (let i = 0; i < items.length; i += size) await run(items.slice(i, i + size)); }
function rowTextSafe(source: EnrichmentSource) {
  const row = source.normalized;
  return clean([row.condition, row.status, row.case_detail, row.treatment_update, row.review, row.rescue_plan, ...Object.values(source.raw_row ?? {})].filter(Boolean).join(" "));
}

export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  let body: { ngoId?: string; mode?: "preview" | "apply" } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const ngoId = clean(body.ngoId);
  const mode = body.mode === "apply" ? "apply" : "preview";
  if (!ngoId) return NextResponse.json({ error: "Choose an organisation." }, { status: 400 });
  const { data: ngo } = await supa.from("ngos").select("id,name,city,state").eq("id", ngoId).maybeSingle();
  if (!ngo) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });

  try {
    const batches = await page<any>((from, to) => supa.from("import_batches").select("id,ngo_id,status,mapping,source_filename,sheet_name").eq("ngo_id", ngoId).in("status", ["imported", "reviewing", "staged"]).order("created_at", { ascending: false }).range(from, to));
    const master = batches.filter((batch) => batch.mapping?.master_import_v2 === true);
    const batchIds = master.map((batch) => batch.id);
    if (!batchIds.length) return NextResponse.json({ error: "No native master-import batch is available for this organisation." }, { status: 404 });

    const sources = await page<EnrichmentSource & { decision?: string; error?: string | null }>((from, to) => supa.from("import_rows").select("id,batch_id,raw_row,normalized,classification,decision,imported_dog_id,imported_case_id,error").in("batch_id", batchIds).order("id").range(from, to));
    const [cases, medical, timelines, dogs] = await Promise.all([
      page<any>((from, to) => supa.from("cases").select("id,dog_id,import_batch_id,source_metadata,status,created_at,last_activity_at").in("import_batch_id", batchIds).order("id").range(from, to)),
      page<any>((from, to) => supa.from("medical_events").select("id,dog_id,kind,import_batch_id,source_metadata").in("import_batch_id", batchIds).order("id").range(from, to)),
      page<any>((from, to) => supa.from("animal_timeline_events").select("id,dog_id,case_id,event_type,source_ref").eq("ngo_id", ngoId).eq("provenance", "imported_historical_record").order("id").range(from, to)),
      page<any>((from, to) => supa.from("dogs").select("id,lat,lng,zone,status,provenance,import_batch_id").in("import_batch_id", batchIds).order("id").range(from, to)),
    ]);

    const dogById = new Map(dogs.map((dog) => [dog.id, dog]));
    const caseBySource = new Map<string, any>();
    for (const item of cases) { const key = metadataKey(item.source_metadata); if (key) caseBySource.set(key, item); }
    const baseMedicalBySource = new Map<string, any>();
    const derivedMedical = new Set<string>();
    for (const item of medical) {
      const key = metadataKey(item.source_metadata);
      if (item.source_metadata?.derived_event_key) derivedMedical.add(item.source_metadata.derived_event_key);
      else if (key) baseMedicalBySource.set(key, item);
    }
    const derivedTimeline = new Set<string>();
    for (const item of timelines) if (item.source_ref?.derived_event_key) derivedTimeline.add(item.source_ref.derived_event_key);

    const animalSources = sources.filter((source) => source.normalized && source.imported_dog_id);
    const rescueSources = animalSources.filter(shouldHaveRescueCase);
    const caseMissing = rescueSources.filter((source) => { const key = sourceKey(source.batch_id, source.normalized.fingerprint); return !source.imported_case_id && !(key && caseBySource.has(key)); });
    const medicalCandidates = animalSources.flatMap((source) => deriveMedicalEvents(source).map((event) => ({ source, event })));
    const historyCandidates = animalSources.flatMap((source) => deriveHistoryEvents(source).map((event) => ({ source, event })));
    const missingMedical = medicalCandidates.filter(({ event }) => !derivedMedical.has(event.key));
    const missingHistory = historyCandidates.filter(({ event }) => !derivedTimeline.has(event.key));
    const falsePositiveVaccinations = animalSources.filter((source) => {
      if (!shouldHaveRescueCase(source) || source.classification !== "vaccination") return false;
      const key = sourceKey(source.batch_id, source.normalized.fingerprint);
      const existing = key ? baseMedicalBySource.get(key) : null;
      return Boolean(existing?.kind === "vaccination" && !strictVaccinationRecorded(source));
    });
    const programmes = deriveProgrammes(sources);
    const remainingSources = animalSources.filter((source) => source.normalized.enrichment_version !== WORKBOOK_ENRICHMENT_VERSION);
    const preview = { sourceRows: sources.length, animalRows: animalSources.length, rescueRows: rescueSources.length, missingRescueCases: caseMissing.length, derivedMedicalEvents: medicalCandidates.length, missingMedicalEvents: missingMedical.length, historicalFollowupEvents: historyCandidates.length, missingHistoricalFollowupEvents: missingHistory.length, falsePositiveVaccinations: falsePositiveVaccinations.length, rowsRemaining: remainingSources.length, programmes };
    if (mode === "preview") return NextResponse.json({ ok: true, ngo: ngo.name, preview });

    const work = remainingSources.slice(0, CHUNK_SIZE);
    let casesCreated = 0, casesUpdated = 0, careEventsCreated = 0, historyEventsCreated = 0, vaccinationCorrections = 0;
    for (const source of work) {
      const row = source.normalized;
      const dogId = source.imported_dog_id as string;
      const dog = dogById.get(dogId);
      const key = sourceKey(source.batch_id, row.fingerprint);
      if (!key || !dog) continue;
      let caseRecord = source.imported_case_id ? cases.find((item) => item.id === source.imported_case_id) : caseBySource.get(key);

      if (shouldHaveRescueCase(source)) {
        const state = deriveCaseState(source);
        const casePatch: Record<string, unknown> = { dog_id: dogId, ngo_id: ngoId, title: [row.condition || "Rescue record", row.locality].filter(Boolean).join(" · "), description: detail(source), zone: row.locality, category: state.category, status: state.status, severity: /critical|severe|unable to (?:move|stand)|profuse|massive bleeding/i.test(rowTextSafe(source)) ? "high" : "normal", resolution: state.resolution, outcome_note: state.outcomeNote, stage: state.stage, condition_text: row.condition, source_event_at: row.event_date, created_at: row.event_date, last_activity_at: state.lastActivityAt, updated_at: state.lastActivityAt, resolved_at: state.resolvedAt, provenance: "imported_historical_record", verification_state: "verified", import_batch_id: source.batch_id, source_metadata: sourceMetadata(source) };
        if (!caseRecord) {
          const { data, error } = await supa.from("cases").insert({ ...casePatch, lat: dog.lat, lng: dog.lng, imported_at: new Date().toISOString() }).select("id,dog_id").single();
          if (error || !data) throw new Error(error?.message ?? "Could not create a missing historical case.");
          caseRecord = data; caseBySource.set(key, data); casesCreated += 1;
        } else {
          const { error } = await supa.from("cases").update(casePatch).eq("id", caseRecord.id).eq("ngo_id", ngoId);
          if (error) throw new Error(error.message);
          casesUpdated += 1;
        }
      }

      const baseMedical = baseMedicalBySource.get(key);
      if (source.classification === "vaccination" && shouldHaveRescueCase(source) && baseMedical?.kind === "vaccination" && !strictVaccinationRecorded(source)) {
        const replacementKind = /treated|treatment|medicine|antibiotic|iv|drip|surgery|dressing|vincristine|chemo/i.test(rowTextSafe(source)) ? "treatment" : "rescue";
        const { error } = await supa.from("medical_events").update({ kind: replacementKind }).eq("id", baseMedical.id);
        if (error) throw new Error(error.message);
        baseMedical.kind = replacementKind; vaccinationCorrections += 1;
      }

      for (const event of deriveMedicalEvents(source)) {
        if (derivedMedical.has(event.key)) continue;
        // The original import already created one primary medical row for a
        // single-label medical source. Keep that row as the first event, then
        // add only distinct dated/secondary care from the richer source text.
        if (baseMedical?.kind === event.kind && source.classification === event.kind && event.eventDate === row.event_date?.slice(0, 10)) continue;
        const { error } = await supa.from("medical_events").insert({ dog_id: dogId, case_id: caseRecord?.id ?? null, kind: event.kind, event_date: event.eventDate, notes: event.note, performed_by: ngo.name, import_batch_id: source.batch_id, source_metadata: sourceMetadata(source, event.key) });
        if (error) throw new Error(error.message);
        derivedMedical.add(event.key); careEventsCreated += 1;
      }

      for (const event of deriveHistoryEvents(source)) {
        if (derivedTimeline.has(event.key)) continue;
        const { error } = await supa.from("animal_timeline_events").insert({ ngo_id: ngoId, dog_id: dogId, case_id: caseRecord?.id ?? null, event_type: event.eventType, title: event.title, details: event.details, occurred_at: event.occurredAt, provenance: "imported_historical_record", source_ref: sourceMetadata(source, event.key), visibility: "partner" });
        if (error) throw new Error(error.message);
        derivedTimeline.add(event.key); historyEventsCreated += 1;
      }

      const normalized = { ...row, enrichment_version: WORKBOOK_ENRICHMENT_VERSION };
      const { error: sourceError } = await supa.from("import_rows").update({ normalized, imported_case_id: caseRecord?.id ?? source.imported_case_id ?? null, error: null }).eq("id", source.id);
      if (sourceError) throw new Error(sourceError.message);
      source.normalized = normalized;
      source.imported_case_id = caseRecord?.id ?? source.imported_case_id ?? null;
    }

    const afterRemaining = Math.max(0, remainingSources.length - work.length);
    if (afterRemaining === 0) {
      const allDogSources = sources.filter((source) => source.imported_dog_id);
      const strictVaccinated = new Set(allDogSources.filter(strictVaccinationRecorded).map((source) => source.imported_dog_id as string));
      const affectedVaccination = [...new Set(allDogSources.filter((source) => shouldHaveRescueCase(source) && source.classification === "vaccination").map((source) => source.imported_dog_id as string))];
      const clearVaccination = affectedVaccination.filter((id) => !strictVaccinated.has(id));
      await inChunks(clearVaccination, 100, async (ids) => { const { error } = await supa.from("dogs").update({ vaccinated: false, vaccination_status: "unknown" }).in("id", ids).eq("ngo_id", ngoId); if (error) throw new Error(error.message); });
      await inChunks([...strictVaccinated], 100, async (ids) => { const { error } = await supa.from("dogs").update({ vaccinated: true, vaccination_status: "vaccinated" }).in("id", ids).eq("ngo_id", ngoId); if (error) throw new Error(error.message); });

      const latestByDog = new Map<string, EnrichmentSource>();
      for (const source of allDogSources.filter(shouldHaveRescueCase)) {
        const id = source.imported_dog_id as string;
        const current = latestByDog.get(id);
        if (!current || Date.parse(latestHistoricalDate(source)) >= Date.parse(latestHistoricalDate(current))) latestByDog.set(id, source);
      }
      const neutral: string[] = [], injured: string[] = [];
      for (const [id, source] of latestByDog) {
        const state = deriveCaseState(source);
        if (state.status === "resolved") neutral.push(id); else if (state.category === "injury") injured.push(id); else neutral.push(id);
      }
      await inChunks(neutral, 100, async (ids) => { const { error } = await supa.from("dogs").update({ status: "seen", needs_help: false }).in("id", ids).eq("ngo_id", ngoId); if (error) throw new Error(error.message); });
      await inChunks(injured, 100, async (ids) => { const { error } = await supa.from("dogs").update({ status: "injured" }).in("id", ids).eq("ngo_id", ngoId); if (error) throw new Error(error.message); });

      for (const programme of programmes) {
        const campaign = { ngo_id: ngoId, name: programme.name, kind: programme.kind, starts_on: programme.startsOn, ends_on: programme.endsOn, zone: ngo.city, notes: `${WORKBOOK_ENRICHMENT_VERSION}:${programme.key}`, source_rows_count: programme.count, public_visibility: "summary", public_summary: programme.publicSummary, published_at: new Date().toISOString(), archived_at: new Date().toISOString() };
        const { data: exists } = await supa.from("campaigns").select("id").eq("ngo_id", ngoId).eq("name", programme.name).maybeSingle();
        const write = exists ? await supa.from("campaigns").update(campaign).eq("id", exists.id) : await supa.from("campaigns").insert(campaign);
        if (write.error) throw new Error(write.error.message);
      }
    }

    return NextResponse.json({ ok: true, ngo: ngo.name, completed: afterRemaining === 0, processedThisRequest: work.length, remainingRows: afterRemaining, casesCreated, casesUpdated, careEventsCreated, historyEventsCreated, vaccinationCorrections, preview });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not enrich the imported workbook." }, { status: 500 });
  }
}
