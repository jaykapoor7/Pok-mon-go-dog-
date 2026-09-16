import { createHash } from "node:crypto";

type Row = {
  batch_id: string;
  source_row_number: number;
  normalized: Record<string, string | null>;
  imported_case_id: string | null;
};

type Batch = { id: string; sheet_name: string | null };

const tidy = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const keyPart = (value: unknown) => tidy(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const chunks = <T,>(items: T[], size = 250) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));

function occurredAt(value: string | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.valueOf()) ? parsed.toISOString() : new Date().toISOString();
}

function animalKey(row: Row, batch: Batch) {
  const n = row.normalized;
  const explicit = keyPart(n.animal_code || n.animal_name);
  if (explicit) return `named:${explicit}`;
  const location = keyPart(n.location);
  const sex = keyPart(n.sex);
  const colour = keyPart(n.colour);
  const condition = keyPart(n.condition);
  // A locality + sex + colour + condition is a usable historic match. If
  // any of those field cues is absent, preserve the source record as its own
  // animal record rather than merging two unrelated animals by guesswork.
  if (location && sex && colour && condition) return `field:${location}:${sex}:${colour}:${condition}`;
  return `source:${batch.id}:${row.source_row_number}`;
}

function profileCode(ngoId: string, key: string) {
  return `HIST-${ngoId.replace(/-/g, "").slice(0, 5).toUpperCase()}-${createHash("sha256").update(key).digest("hex").slice(0, 12).toUpperCase()}`;
}

function dogStatus(condition: string | null) {
  const value = tidy(condition).toLowerCase();
  if (/injur|wound|fracture|maggot|tvt|rta|mange|skin|bite/.test(value)) return "injured";
  if (/hungry|starv/.test(value)) return "hungry";
  return "seen";
}

export async function reconcileHistoricAnimals(supa: any, ngoId: string) {
  const { data: batches, error: batchError } = await supa
    .from("import_batches")
    .select("id,sheet_name")
    .eq("ngo_id", ngoId)
    .eq("status", "reviewing");
  if (batchError) throw new Error(batchError.message);
  const batchList = (batches ?? []) as Batch[];
  if (!batchList.length) return { profilesCreated: 0, timelinesCreated: 0, profilesTotal: 0 };

  const batchById = new Map(batchList.map((batch) => [batch.id, batch]));
  const rows: Row[] = [];
  for (const group of chunks(batchList.map((batch) => batch.id))) {
    const { data, error } = await supa.from("import_rows")
      .select("batch_id,source_row_number,normalized,imported_case_id")
      .in("batch_id", group);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
  }

  const profiles = new Map<string, { code: string; row: Row; batch: Batch; sourceRows: Row[] }>();
  for (const row of rows) {
    const batch = batchById.get(row.batch_id);
    if (!batch) continue;
    const key = animalKey(row, batch);
    const current = profiles.get(key);
    if (current) current.sourceRows.push(row);
    else profiles.set(key, { code: profileCode(ngoId, key), row, batch, sourceRows: [row] });
  }
  const profileList = [...profiles.values()];
  const existing = new Map<string, string>();
  for (const group of chunks(profileList.map((profile) => profile.code))) {
    const { data, error } = await supa.from("dogs").select("id,code").eq("ngo_id", ngoId).in("code", group);
    if (error) throw new Error(error.message);
    for (const dog of data ?? []) existing.set(dog.code, dog.id);
  }

  const missing = profileList.filter((profile) => !existing.has(profile.code));
  for (const group of chunks(missing)) {
    const dogs = group.map((profile) => {
      const n = profile.row.normalized;
      const sterilised = profile.sourceRows.some((row) => /sterili[sz]/i.test(batchById.get(row.batch_id)?.sheet_name ?? ""));
      const first = profile.sourceRows.map((row) => occurredAt(row.normalized.date)).sort()[0];
      const last = profile.sourceRows.map((row) => occurredAt(row.normalized.date)).sort().at(-1) ?? first;
      return {
        ngo_id: ngoId,
        code: profile.code,
        name: n.animal_name || `Recorded dog · ${n.location || "Pawesome"}`,
        species: "dog",
        zone: n.location || "Coimbatore",
        // A no-coordinate historic profile is intentionally unpinned. It is
        // still a real record/timeline, but never becomes a false map marker.
        lat: 0,
        lng: 0,
        status: dogStatus(n.condition),
        color: n.colour || "Unknown",
        needs_help: !sterilised && dogStatus(n.condition) === "injured",
        sterilised,
        sterilisation_status: sterilised ? "sterilised" : "unknown",
        vaccination_status: "unknown",
        trust_score: 70,
        sightings_count: profile.sourceRows.length,
        first_seen: first,
        last_seen: last,
        intake_notes: "Historic Pawesome record imported from the organisation workbook.",
      };
    });
    const { data, error } = await supa.from("dogs").insert(dogs).select("id,code");
    if (error) throw new Error(error.message);
    for (const dog of data ?? []) existing.set(dog.code, dog.id);
  }

  const refs = rows.map((row) => `import:${row.batch_id}:${row.source_row_number}`);
  const existingRefs = new Set<string>();
  // source_ref is jsonb, so fetch this import provenance once and normalise it
  // locally instead of comparing JSON values to text through PostgREST.
  const { data: previousEvents, error: previousEventsError } = await supa
    .from("animal_timeline_events")
    .select("source_ref")
    .eq("ngo_id", ngoId)
    .eq("provenance", "pawesome_master_import");
  if (previousEventsError) throw new Error(previousEventsError.message);
  for (const event of previousEvents ?? []) {
    const source = event.source_ref;
    if (typeof source === "string") existingRefs.add(source);
    else if (source && typeof source === "object" && typeof source.import_row === "string") existingRefs.add(source.import_row);
  }
  const caseLinks: Array<{ id: string; dog_id: string }> = [];
  const events = rows.flatMap((row) => {
    const batch = batchById.get(row.batch_id);
    if (!batch) return [];
    const profile = profiles.get(animalKey(row, batch));
    const dogId = profile ? existing.get(profile.code) : null;
    const sourceRef = `import:${row.batch_id}:${row.source_row_number}`;
    if (!dogId || existingRefs.has(sourceRef)) return [];
    const n = row.normalized;
    if (row.imported_case_id) caseLinks.push({ id: row.imported_case_id, dog_id: dogId });
    return [{
      ngo_id: ngoId, dog_id: dogId, case_id: row.imported_case_id,
      event_type: /sterili[sz]/i.test(batch.sheet_name ?? "") ? "sterilisation" : "historic_case",
      title: n.condition || `${batch.sheet_name ?? "Historic"} record`,
      details: [n.case_detail, n.treatment_update, n.review].filter(Boolean).join("\n") || null,
      occurred_at: occurredAt(n.date), provenance: "pawesome_master_import", source_ref: { import_row: sourceRef },
    }];
  });
  for (const group of chunks(events)) {
    const { error } = await supa.from("animal_timeline_events").insert(group);
    if (error) throw new Error(error.message);
  }
  // Cases are the operational view; attach each one to the same historic
  // animal record used by its timeline so NGO dashboards stay connected.
  for (const group of chunks(caseLinks)) {
    await Promise.all(group.map(async (link) => {
      const { error } = await supa.from("cases").update({ dog_id: link.dog_id }).eq("id", link.id).eq("ngo_id", ngoId);
      if (error) throw new Error(error.message);
    }));
  }

  // Repair earlier imports' public wording as well as newly uploaded files.
  for (const batch of batchList.filter((item) => /sterili[sz]/i.test(item.sheet_name ?? ""))) {
    const count = rows.filter((row) => row.batch_id === batch.id).length;
    const name = tidy(batch.sheet_name);
    if (!name || !count) continue;
    const { error } = await supa.from("campaigns")
      .update({ source_rows_count: count, public_summary: `${count} dogs sterilised through this Pawesome drive.` })
      .eq("ngo_id", ngoId)
      .eq("name", name);
    if (error) throw new Error(error.message);
  }
  return { profilesCreated: missing.length, timelinesCreated: events.length, profilesTotal: profileList.length };
}
