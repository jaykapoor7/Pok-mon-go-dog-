/* ════════════════════════════════════════════════════════════════════
   NGO register import: writing one chunk of records.

   Server only, service role, after membership has been checked. A chunk
   is at most CHUNK records and is safe to send twice: every record and
   every animal carries an `import_source_key` scoped to the organisation
   and built from the row's content, and anything that already exists is
   left alone. Re-importing a register, or next month's longer copy,
   therefore adds only what is new.

   What a row becomes:
     rescue      a case (+ its timeline entry) on the animal
     treatment   a care record (the database adds the timeline entry)
     vaccination / sterilisation   a care record, and the animal's status
     follow_up   an upcoming follow-up when it is ahead, otherwise history
     adoption    a closed case
     animal      the animal's profile only
   Rows with an animal ID (or a name in a locality) join one profile, also
   across imports and with animals the team created by hand under the same
   ID. Rows without one are one animal each.

   Location: register GPS; else the locality, geocoded once and cached
   (and only accepted inside the city); else the city centre. Nothing is
   ever refused for want of a place.
   ════════════════════════════════════════════════════════════════════ */

import { CITIES, cityAt } from "@/lib/geo/cities";
import { animalIdentity, type ImportRecord, type RecordKind } from "./read";

export const CHUNK = 50;
export const IMPORTER = "ngo-workspace-v3";

type Supa = any;
export type Org = { id: string; name: string; city: string | null; state: string | null };
export type Actor = { id: string; label: string | null };
export type RowResult = { key: string; sheet: string; row: number; outcome: "created" | "added" | "already" | "held"; reason?: string };
export type ChunkResult = { animals: number; cases: number; care: number; followUps: number; already: number; held: number; rows: RowResult[] };

const KINDS: RecordKind[] = ["rescue", "treatment", "vaccination", "sterilisation", "follow_up", "adoption", "animal"];
const PRIVATE = /informer|caller|call via|reporter|reported by|contact|phone|mobile|whats ?app|e-?mail|owner|caretaker|aadhaar/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown, lim: number) => (typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= lim && v !== 0 ? v : null);
const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Never trust the browser: keep only known fields, in their shapes. */
export function sanitize(input: unknown): ImportRecord | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const key = str(r.key, 40), sheet = str(r.sheet, 120), kind = r.kind as RecordKind;
  if (!key || !/^[a-z0-9-]+$/.test(key) || !sheet || !KINDS.includes(kind) || typeof r.row !== "number") return null;
  const day = (v: unknown) => (typeof v === "string" && DAY.test(v) ? v : null);
  const raw: Record<string, string> = {};
  if (r.raw && typeof r.raw === "object") for (const [k, v] of Object.entries(r.raw as Record<string, unknown>).slice(0, 60)) if (!PRIVATE.test(k) && typeof v === "string") raw[k.slice(0, 80)] = v.slice(0, 500);
  let lat = num(r.lat, 90), lng = num(r.lng, 180);
  if ((lat == null) !== (lng == null)) lat = lng = null;
  return {
    key, sheet, row: Math.max(0, Math.floor(r.row as number)), kind, date: day(r.date), followUp: day(r.followUp),
    code: str(r.code, 80), name: str(r.name, 80), sex: r.sex === "male" || r.sex === "female" ? r.sex : null, age: str(r.age, 40), colour: str(r.colour, 120),
    locality: str(r.locality, 160), city: str(r.city, 80), lat, lng,
    condition: str(r.condition, 200), detail: str(r.detail, 2000), status: str(r.status, 120), outcome: str(r.outcome, 2000),
    sterilised: typeof r.sterilised === "boolean" ? r.sterilised : null, vaccinated: typeof r.vaccinated === "boolean" ? r.vaccinated : null,
    closed: r.closed === "recovered" || r.closed === "died" || r.closed === "closed" ? r.closed : null,
    raw, notes: Array.isArray(r.notes) ? r.notes.filter((n): n is string => typeof n === "string").slice(0, 5).map((n) => n.slice(0, 200)) : [],
  };
}

export const recordKey = (org: Org, r: ImportRecord) => `ngo:${org.id}:rec:${r.key}`;
export const animalKey = (org: Org, r: ImportRecord) => `ngo:${org.id}:animal:${animalIdentity(r) ?? `rec:${r.key}`}`;

/* ── Places ─────────────────────────────────────────────────────────── */

const cityCentre = (name: string | null) => (name ? CITIES.find((c) => norm(c.name) === norm(name)) ?? null : null);
const km = (a: number, b: number, c: number, d: number) => { const r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r * Math.cos(((a + c) / 2) * r); return Math.sqrt(x * x + y * y) * 6371; };
type Point = { lat: number; lng: number; precision: "exact" | "approximate"; how: string };

async function geocode(supa: Supa, locality: string, city: string, state: string | null): Promise<Point | null> {
  const key = [locality, city, state, "India"].filter(Boolean).join(", ").toLowerCase().replace(/\s+/g, " ").trim();
  const { data: cached } = await supa.from("import_location_cache").select("lat,lng,precision").eq("normalized_query", key).maybeSingle();
  const centre = cityCentre(city);
  const inside = (lat: number, lng: number) => !centre || km(lat, lng, centre.lat, centre.lng) <= 45;
  if (cached?.lat != null && cached?.lng != null) return inside(cached.lat, cached.lng) ? { lat: cached.lat, lng: cached.lng, precision: "approximate", how: `Locality: ${locality}` } : null;
  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const near = centre ? `&proximity=${centre.lng},${centre.lat}` : "";
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent([locality, city, state, "India"].filter(Boolean).join(", "))}.json?access_token=${encodeURIComponent(token)}&country=in&limit=1&types=neighborhood,locality,place,district,poi,address${near}`, { signal: AbortSignal.timeout(6000) });
    const c = (await res.json())?.features?.[0]?.center;
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || !inside(c[1], c[0])) return null;
    await supa.from("import_location_cache").upsert({ normalized_query: key, locality, city, state, lat: c[1], lng: c[0], provider: "mapbox", precision: "approximate" }, { onConflict: "normalized_query" });
    return { lat: c[1], lng: c[0], precision: "approximate", how: `Locality: ${locality}` };
  } catch { return null; }
}

/** One place per distinct locality in the chunk, at most six lookups at once. */
async function places(supa: Supa, org: Org, records: ImportRecord[]) {
  const out = new Map<string, Point & { city: string | null }>();
  const jobs = new Map<string, { locality: string; city: string }>();
  for (const r of records) {
    if (r.lat != null && r.lng != null) continue;
    const city = r.city || org.city;
    if (r.locality && city) jobs.set(`${norm(r.locality)}|${norm(city)}`, { locality: r.locality, city });
  }
  const found = new Map<string, Point | null>();
  const list = [...jobs];
  await Promise.all(Array.from({ length: Math.min(6, list.length) }, async (_, w) => {
    for (let i = w; i < list.length; i += 6) found.set(list[i][0], await geocode(supa, list[i][1].locality, list[i][1].city, org.state));
  }));
  for (const r of records) {
    if (r.lat != null && r.lng != null) { out.set(r.key, { lat: r.lat, lng: r.lng, precision: "exact", how: "GPS in the register", city: r.city || cityAt(r.lat, r.lng) || org.city }); continue; }
    const city = r.city || org.city;
    const geo = r.locality && city ? found.get(`${norm(r.locality)}|${norm(city)}`) : null;
    if (geo) { out.set(r.key, { ...geo, city }); continue; }
    const centre = cityCentre(city) ?? cityCentre(org.city);
    if (centre) out.set(r.key, { lat: centre.lat, lng: centre.lng, precision: "approximate", how: r.locality ? `City centre: "${r.locality}" was not placed` : "City centre: the register gives no locality", city: centre.name });
  }
  return out;
}

async function cellOf(lat: number, lng: number) { const { latLngToCell } = await import("h3-js"); return latLngToCell(lat, lng, 8); }

/* ── Writing ────────────────────────────────────────────────────────── */

async function existingKeys(supa: Supa, table: string, keys: string[], fields = "import_source_key") {
  if (!keys.length) return [] as any[];
  const { data, error } = await supa.from(table).select(fields).in("import_source_key", keys).limit(keys.length * 2);
  if (error) throw new Error(`Could not check ${table}: ${error.message}`);
  return (data ?? []) as any[];
}

const caseStatus = (r: ImportRecord) => (r.closed || r.kind === "adoption" ? "resolved" : "in_progress");
const category = (r: ImportRecord) => {
  const t = `${r.condition ?? ""} ${r.detail ?? ""}`.toLowerCase();
  if (r.kind === "adoption") return "other";
  if (/rta|accident|hit by|injur|wound|maggot|fracture|bite|bleed|tvt|mange|skin/.test(t)) return "injury";
  return "rescue";
};
const title = (r: ImportRecord) => {
  const what = r.kind === "adoption" ? "Adoption" : r.condition || (r.kind === "rescue" ? "Rescue" : "Imported record");
  return [what, r.locality].filter(Boolean).join(" · ").slice(0, 200);
};
const detail = (r: ImportRecord) => [r.detail, r.outcome, r.status && !r.outcome?.includes(r.status) ? `Status: ${r.status}` : null].filter(Boolean).join("\n") || null;
const careKind = (k: RecordKind) => (k === "vaccination" ? "vaccination" : k === "sterilisation" ? "sterilisation" : "treatment");

export async function writeChunk(supa: Supa, org: Org, actor: Actor, batchId: string, input: unknown[], today = new Date()): Promise<ChunkResult> {
  const res: ChunkResult = { animals: 0, cases: 0, care: 0, followUps: 0, already: 0, held: 0, rows: [] };
  const all = input.slice(0, CHUNK).map(sanitize);
  const records: ImportRecord[] = [];
  all.forEach((r, i) => {
    if (!r) { res.held++; res.rows.push({ key: `bad-${i}`, sheet: "", row: 0, outcome: "held", reason: "The row could not be read" }); return; }
    if (r.notes.some((n) => n.startsWith("Not a dog"))) { res.held++; res.rows.push({ key: r.key, sheet: r.sheet, row: r.row, outcome: "held", reason: r.notes[0] }); return; }
    records.push(r);
  });
  if (!records.length) return res;

  // 1. What this organisation already has from earlier imports.
  const recKeys = records.map((r) => recordKey(org, r));
  const [cases, care, follows, history, rows, animals] = await Promise.all([
    existingKeys(supa, "cases", recKeys), existingKeys(supa, "medical_events", recKeys), existingKeys(supa, "animal_followups", recKeys), existingKeys(supa, "animal_timeline_events", recKeys),
    (async () => { const { data, error } = await supa.from("import_rows").select("row_fingerprint").eq("batch_id", batchId).in("row_fingerprint", records.map((r) => r.key)); if (error) throw new Error(error.message); return (data ?? []) as any[]; })(),
    existingKeys(supa, "dogs", [...new Set(records.map((r) => animalKey(org, r)))], "id,import_source_key"),
  ]);
  const done = new Set([...cases, ...care, ...follows, ...history].map((x) => x.import_source_key));
  const staged = new Set(rows.map((x) => x.row_fingerprint));
  const dogByKey = new Map<string, string>(animals.map((d) => [d.import_source_key, d.id]));
  // Animals the team already keeps under the same ID.
  const codes = [...new Set(records.filter((r) => r.code).map((r) => r.code as string))];
  if (codes.length) {
    const { data, error } = await supa.from("dogs").select("id,code").eq("ngo_id", org.id).in("code", codes).limit(codes.length * 3);
    if (error) throw new Error(error.message);
    for (const d of data ?? []) for (const r of records) if (r.code && norm(r.code) === norm(d.code) && !dogByKey.has(animalKey(org, r))) dogByKey.set(animalKey(org, r), d.id);
  }
  const fresh = records.filter((r) => !done.has(recordKey(org, r)));
  for (const r of records) if (done.has(recordKey(org, r))) { res.already++; res.rows.push({ key: r.key, sheet: r.sheet, row: r.row, outcome: "already" }); }
  if (!fresh.length) return res;

  // 2. Places, for new animals and cases.
  const where = await places(supa, org, fresh.filter((r) => !dogByKey.has(animalKey(org, r)) || r.kind === "rescue" || r.kind === "adoption"));

  // 3. New animal profiles, one per animal key, carrying what the rows say.
  const newDogs = new Map<string, Record<string, unknown>>();
  for (const r of fresh) {
    const k = animalKey(org, r);
    if (dogByKey.has(k)) continue;
    const p = where.get(r.key);
    if (!p) { continue; }
    const prev = newDogs.get(k);
    const seen = r.date ?? null;
    if (prev) {
      if (r.sterilised) Object.assign(prev, { sterilised: true, sterilisation_status: "sterilised" });
      if (r.vaccinated) Object.assign(prev, { vaccinated: true, vaccination_status: "vaccinated" });
      if (seen && (!prev.last_seen || seen > (prev.last_seen as string))) prev.last_seen = seen;
      if (seen && (!prev.first_seen || seen < (prev.first_seen as string))) prev.first_seen = seen;
      continue;
    }
    const injured = r.kind === "rescue" && !r.closed && /rta|accident|injur|wound|maggot|fracture|bleed|tvt/.test(`${r.condition ?? ""} ${r.detail ?? ""}`.toLowerCase());
    newDogs.set(k, {
      import_source_key: k, ngo_id: org.id, name: r.name, code: r.code, species: "dog", sex: r.sex, color: r.colour || "Unknown",
      zone: r.locality ?? "", city: p.city, state: org.state, lat: p.lat, lng: p.lng, h3_r8: await cellOf(p.lat, p.lng),
      location_precision: p.precision, geographic_precision: p.how, status: r.closed === "died" ? "seen" : injured ? "injured" : "seen",
      needs_help: false, sterilised: r.sterilised === true, sterilisation_status: r.sterilised === true ? "sterilised" : r.sterilised === false ? "not_sterilised" : "unknown",
      vaccinated: r.vaccinated === true, vaccination_status: r.vaccinated === true ? "vaccinated" : r.vaccinated === false ? "not_vaccinated" : "unknown",
      first_seen: seen, last_seen: seen, original_observed_at: seen, observed_date_precision: seen ? "day" : "unknown",
      provenance: "imported_historical_record", importer_version: IMPORTER, import_batch_id: batchId, identity_state: animalIdentity(r) ? "confirmed" : "provisional",
      created_by_id: actor.id, created_by_name: actor.label,
      source_metadata: { importer: IMPORTER, import_batch_id: batchId, source_sheet: r.sheet, source_row: r.row, organisation: org.name },
    });
  }
  if (newDogs.size) {
    const { data, error } = await supa.from("dogs").upsert([...newDogs.values()], { onConflict: "import_source_key", ignoreDuplicates: false }).select("id,import_source_key");
    if (error) throw new Error(`Animal profiles could not be saved: ${error.message}`);
    for (const d of data ?? []) { if (!dogByKey.has(d.import_source_key)) res.animals++; dogByKey.set(d.import_source_key, d.id); }
  }
  // Existing animals learn their new care status.
  const existing = (flag: "sterilised" | "vaccinated") => [...new Set(fresh.filter((r) => r[flag] === true && !newDogs.has(animalKey(org, r))).map((r) => dogByKey.get(animalKey(org, r))).filter(Boolean))] as string[];
  for (const [flag, ids] of [["sterilised", existing("sterilised")], ["vaccinated", existing("vaccinated")]] as const) {
    if (!ids.length) continue;
    const patch = flag === "sterilised" ? { sterilised: true, sterilisation_status: "sterilised" } : { vaccinated: true, vaccination_status: "vaccinated" };
    const { error } = await supa.from("dogs").update(patch).eq("ngo_id", org.id).in("id", ids);
    if (error) throw new Error(error.message);
  }

  // 4. The records themselves.
  const todayDay = today.toISOString().slice(0, 10);
  const caseRows: Record<string, unknown>[] = [], careRows: Record<string, unknown>[] = [], followRows: Record<string, unknown>[] = [], pastRows: Record<string, unknown>[] = [];
  /* History with no record of its own (a past review, care without a date)
     still lands on the animal's timeline. */
  const past = (r: ImportRecord, dogId: string, what: string, at: string | null) => pastRows.push({
    import_source_key: recordKey(org, r), ngo_id: org.id, dog_id: dogId, event_type: "imported_record", title: [what, r.condition].filter(Boolean).join(" · ").slice(0, 200),
    details: detail(r), occurred_at: at ?? r.date ?? today.toISOString(), actor_id: actor.id, actor_name: actor.label, provenance: "imported_historical_record",
    source_ref: { importer: IMPORTER, import_batch_id: batchId, source_sheet: r.sheet, source_row: r.row }, visibility: "partner",
  });
  const meta = (r: ImportRecord) => ({ importer: IMPORTER, import_batch_id: batchId, source_sheet: r.sheet, source_row: r.row, fields: r.raw });
  const outcome = new Map<string, RowResult>();
  for (const r of fresh) {
    const dogId = dogByKey.get(animalKey(org, r));
    if (!dogId) { outcome.set(r.key, { key: r.key, sheet: r.sheet, row: r.row, outcome: "held", reason: "No city to place this animal: add a City column or set the organisation's city" }); continue; }
    const key = recordKey(org, r), p = where.get(r.key), isNew = newDogs.has(animalKey(org, r));
    if (r.kind === "rescue" || r.kind === "adoption") {
      caseRows.push({
        import_source_key: key, dog_id: dogId, ngo_id: org.id, title: title(r), description: detail(r), zone: r.locality, city: p?.city ?? r.city ?? org.city,
        lat: p?.lat ?? null, lng: p?.lng ?? null, h3_r8: p ? await cellOf(p.lat, p.lng) : null, location_precision: p?.precision ?? null,
        category: category(r), species: "dog", status: caseStatus(r), status_class: caseStatus(r) === "resolved" ? "closed" : "in_progress",
        closure_reason: caseStatus(r) === "resolved" ? (r.closed === "died" ? "died" : r.closed === "recovered" ? "recovered" : "unspecified") : null,
        resolved_at_source: caseStatus(r) === "resolved" ? "import_derived" : null,
        condition_text: r.condition, follow_up_at: r.followUp, provenance: "imported_historical_record",
        verification_state: "source_record", source_event_at: r.date, imported_at: today.toISOString(),
        import_batch_id: batchId, source_metadata: meta(r),
      });
    } else if (r.kind === "treatment" || r.kind === "vaccination" || r.kind === "sterilisation") {
      if (r.date) careRows.push({ import_source_key: key, dog_id: dogId, kind: careKind(r.kind), event_date: r.date, notes: [r.condition, detail(r)].filter(Boolean).join("\n") || null, performed_by: org.name, created_by_id: actor.id, import_batch_id: batchId, source_metadata: meta(r) });
      else past(r, dogId, r.kind === "vaccination" ? "Vaccinated (date not recorded)" : r.kind === "sterilisation" ? "Sterilised (date not recorded)" : "Treatment (date not recorded)", null);
    } else if (r.kind === "animal") past(r, dogId, "Added from the register", r.date);
    const due = r.kind === "follow_up" ? r.followUp ?? r.date : r.followUp;
    if (r.kind === "follow_up" && (!due || due < todayDay)) past(r, dogId, "Review", due);
    if (due && due >= todayDay) followRows.push({ import_source_key: r.kind === "follow_up" ? key : `${key}:follow`, ngo_id: org.id, dog_id: dogId, due_at: due, kind: "imported review", note: [r.condition, r.detail].filter(Boolean).join(" · ") || "From the imported register. Confirm before acting.", created_by: actor.id, import_batch_id: batchId, source_metadata: meta(r) });
    outcome.set(r.key, { key: r.key, sheet: r.sheet, row: r.row, outcome: isNew ? "created" : "added" });
  }
  // Follow-ups attached to other rows are keyed apart; drop any already there.
  const followDone = new Set((await existingKeys(supa, "animal_followups", followRows.map((f) => f.import_source_key as string))).map((x) => x.import_source_key));
  const insert = async (table: string, rows: Record<string, unknown>[], fields = "id,import_source_key") => {
    if (!rows.length) return [] as any[];
    const { data, error } = await supa.from(table).insert(rows).select(fields);
    if (error) throw new Error(`Records could not be saved (${table}): ${error.message}`);
    return (data ?? []) as any[];
  };
  const savedCases = await insert("cases", caseRows, "id,import_source_key,dog_id,title,description,source_event_at");
  res.cases = savedCases.length;
  res.care = (await insert("medical_events", careRows)).length;
  res.followUps = (await insert("animal_followups", followRows.filter((f) => !followDone.has(f.import_source_key)))).length;
  // Cases have no timeline trigger; care and follow-ups do.
  await insert("animal_timeline_events", savedCases.map((c) => ({
    import_source_key: c.import_source_key, ngo_id: org.id, dog_id: c.dog_id, case_id: c.id, event_type: "imported_record",
    title: c.title, details: c.description, occurred_at: c.source_event_at ?? today.toISOString(), actor_id: actor.id, actor_name: actor.label,
    provenance: "imported_historical_record", source_ref: { importer: IMPORTER, import_batch_id: batchId }, visibility: "partner",
  })), "id");
  await insert("animal_timeline_events", pastRows, "id");
  const caseByKey = new Map(savedCases.map((c) => [c.import_source_key, c.id]));

  // 5. The audit ledger: one line per source row, scrubbed of contacts.
  const ledger = fresh.filter((r) => !staged.has(r.key)).map((r) => {
    const o = outcome.get(r.key)!;
    const { raw, ...normalized } = r;
    return {
      batch_id: batchId, source_row_number: r.row, raw_row: raw, normalized: { ...normalized, importer: IMPORTER }, classification: r.kind, row_fingerprint: r.key,
      decision: o.outcome === "held" ? "review" : o.outcome === "created" ? "new" : "merge", error: o.reason ?? null,
      imported_dog_id: dogByKey.get(animalKey(org, r)) ?? null, imported_case_id: caseByKey.get(recordKey(org, r)) ?? null,
    };
  });
  if (ledger.length) { const { error } = await supa.from("import_rows").insert(ledger); if (error) throw new Error(`The import ledger could not be saved: ${error.message}`); }
  for (const r of fresh) { const o = outcome.get(r.key)!; if (o.outcome === "held") res.held++; res.rows.push(o); }
  return res;
}
