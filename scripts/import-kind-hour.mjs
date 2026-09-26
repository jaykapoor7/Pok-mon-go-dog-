#!/usr/bin/env node
/*
 * Kind Hour's rescue register, onto the record.
 *
 * The source is The Kind Hour Foundation's "Rescue – Yearly" Google Sheet,
 * supplied to StrayPaw as a PDF export (sha256 601d207f…434d6). It is a
 * visit-and-expense ledger, not an animal register: one line per visit,
 * repeated across days for the same animal, with no animal IDs, no GPS, and
 * caretakers' names on every line. scripts/kind-hour/rescue-register.csv is
 * the line-by-line transcription with those names, the amounts and the
 * Drive media links removed. Which lines are the same animal is decided
 * there, line by line (same place, same description, same caretaker, within
 * a few weeks), and written down as `animal_key`. Each line keeps a Kind Hour
 * line id (KH-RR-001…145, in register order): the source has none of its own.
 *
 * What becomes what:
 *   - a line naming a place    → an import row, and part of one animal profile
 *                                with one case (a rescue, outcome not recorded)
 *                                and one timeline entry per line;
 *   - a medical expense line   → one care event ("treatment"), never a named
 *                                procedure: the register does not itemise it;
 *   - a line with no place     → an import row marked skip, counted in the
 *                                source's aggregate metadata, never a profile;
 *   - an exact duplicate line  → an import row marked skip.
 * Nothing is inferred: sex only where the register says female, "puppy" only
 * where it says puppy; no sterilisation, vaccination, age or outcome.
 *
 * Place: scripts/kind-hour/places.json. A locality is drawn only where
 * OpenStreetMap holds the locality itself; otherwise the Lucknow city
 * centroid, labelled city-level. Each animal carries its H3 r8 cell, as
 * every other animal does; public views never place it finer than that.
 *
 * The output is one transaction: a compact payload and set-based inserts
 * into the same tables every other import writes (data_sources,
 * import_batches, import_rows, dogs, cases, medical_events,
 * animal_timeline_events). Every id is md5 of the Kind Hour line id or
 * animal key, so running it twice changes nothing.
 *
 * Usage:
 *   node scripts/import-kind-hour.mjs > kind-hour.sql          (review, then run the SQL)
 *   DATABASE_URL=... node scripts/import-kind-hour.mjs --apply  (run it directly)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { latLngToCell } from "h3-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "scripts", "kind-hour");

const ORG_SLUG = "the-kind-hour-foundation";
const SOURCE_SLUG = "kind-hour-rescue-register-2024-2026";
const IMPORTER = "kind-hour-register-v1";
const SOURCE_SHA256 = "601d207f26466dc83f2d9b3113b471e2dd3e80e78037ccf3ba4c2fd8631434d6";
const SHEET = "Rescue (Kind Hour register)";

/* ── input ──────────────────────────────────────────────────────────── */
function parseCsv(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c !== ""));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}
const lines = parseCsv(fs.readFileSync(path.join(dir, "rescue-register.csv"), "utf8"));
const { city, places } = JSON.parse(fs.readFileSync(path.join(dir, "places.json"), "utf8"));

/* ── where, and what to call it ─────────────────────────────────────── */
const month = (iso) => new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const zoneOf = (key) => places[key].zone.replace(/ \(as recorded\)$/, "");
function where(key) {
  const p = places[key];
  if (!p) throw new Error(`No place entry for ${key}`);
  return p.precision === "locality"
    ? { lat: p.lat, lng: p.lng, geo: `named locality (${p.osm_kind}, OSM ${p.osm}); the register gives a locality name only, no address or GPS` }
    : { lat: city.lat, lng: city.lng, geo: `Lucknow city centroid (OSM ${city.osm}); the register names "${p.as_recorded.join('", "')}", which could not be resolved to an OpenStreetMap locality` };
}
/** The register's own name for the animal when it has one; otherwise what it looked like, where and when. */
function nameFor(a) {
  if (a.dog_name) return a.dog_name;
  const what = a.species === "bird" ? (/kabutar/i.test(a.description_as_recorded) ? "Pigeon" : cap(a.description_as_recorded.trim().toLowerCase()))
    : cap(`${a.colour ? `${a.colour.toLowerCase()} ` : ""}${a.life_stage === "puppy" ? "puppy" : "dog"}`);
  return `${what} · ${zoneOf(a.place_key)} · ${month(a.date)}`;
}

/* ── the payload ────────────────────────────────────────────────────── */
const groups = new Map();
for (const l of lines) if (l.disposition === "profile") groups.set(l.animal_key, [...(groups.get(l.animal_key) ?? []), l]);
const animals = [...groups].map(([k, ls]) => {
  ls.sort((a, b) => a.date.localeCompare(b.date) || Number(a.line) - Number(b.line));
  const f = ls[0], w = where(f.place_key);
  return {
    k, name: nameFor(f), sp: f.species, sex: f.sex || null, col: f.colour || "Unknown", stage: f.life_stage || null,
    cond: f.condition_as_recorded || "unknown", zone: zoneOf(f.place_key), lat: w.lat, lng: w.lng, h3: latLngToCell(w.lat, w.lng, 8), geo: w.geo,
    first: f.kh_record_id, from: f.date, to: ls.at(-1).date, ids: ls.map((l) => l.kh_record_id),
  };
});
const firstOf = new Map(animals.map((a) => [a.k, a.first]));
const payloadLines = lines.map((l) => ({
  n: Number(l.line), id: l.kh_record_id, d: l.date, dr: l.date_as_recorded, dd: l.discharge_date || null, ddr: l.discharge_as_recorded || null,
  addr: l.address_as_recorded || null, desc: l.description_as_recorded || null, name: l.dog_name || null,
  sp: l.species || null, sex: l.sex || null, col: l.colour || null, cond: l.condition_as_recorded || null,
  opd: l.opd === "yes", adm: l.admission === "yes", exp: l.medical_expense_recorded === "yes", paid: l.payment_marked_done === "yes",
  media: l.media_label || null, k: l.animal_key || null, first: l.animal_key ? firstOf.get(l.animal_key) === l.kh_record_id : false,
  zone: l.place_key ? zoneOf(l.place_key) : null, disp: l.disposition, note: l.note || null,
}));

/* Aggregate facts, including about the lines that cannot become profiles. */
const withheld = lines.filter((l) => l.disposition === "withheld");
const byYear = (ls) => ls.reduce((m, l) => ({ ...m, [l.date.slice(0, 4)]: (m[l.date.slice(0, 4)] ?? 0) + 1 }), {});
const atLocality = animals.filter((a) => places[groups.get(a.k)[0].place_key].precision === "locality").length;
const dates = lines.map((l) => l.date).sort();
const sourceMeta = {
  source_file: "Rescue - Yearly .pdf (Google Sheets export, 3 pages)", source_sha256: SOURCE_SHA256,
  source_access: "Private. Shared by The Kind Hour Foundation with StrayPaw; not publicly downloadable.",
  transcription: "scripts/kind-hour/rescue-register.csv", places: "scripts/kind-hour/places.json",
  register_lines: lines.length, register_span: { from: dates[0], to: dates.at(-1) }, lines_by_year: byYear(lines),
  profile_lines: lines.filter((l) => l.disposition === "profile").length, profiles: animals.length,
  profiles_at_locality: atLocality, profiles_at_city_centroid: animals.length - atLocality,
  species: animals.reduce((m, a) => ({ ...m, [a.sp]: (m[a.sp] ?? 0) + 1 }), {}),
  duplicate_lines: lines.filter((l) => l.disposition === "duplicate").length,
  withheld_lines: withheld.length, withheld_lines_by_year: byYear(withheld),
  withheld_reason: "No place is recorded on these lines (every line from April 2025 onwards, and one 2024 line). A profile needs a place; none is inferred.",
  withheld_lines_with_medical_expense: withheld.filter((l) => l.medical_expense_recorded === "yes").length,
  withheld_lines_with_discharge_date: withheld.filter((l) => l.discharge_as_recorded).length,
  identity_rule: "Lines are one animal when the place, the description and the caretaker match within a few weeks. Caretaker names were used for that match only and are not stored.",
  omitted_fields: ["owner/caretaker name", "rescue charge", "medical expense amount", "paid", "balance", "media links"],
  photo_policy: "Not republished. The register's media links point to three Drive files, one of them linked from several different animals' lines, and no photo permission was given.",
  location_policy: "Named locality only where OpenStreetMap holds the locality (place node or named area); otherwise the Lucknow city centroid. Never an address. Public views round to the H3 r8 cell.",
  not_inferred: ["sterilisation", "vaccination", "treatment type", "age", "sex (except where the register says female)", "outcome"],
  geocoder: "OpenStreetMap via Nominatim and Photon, ODbL 1.0",
};
const cache = Object.values(places).filter((p) => p.precision === "locality").map((p) => ({ q: `${p.zone}, ${city.name}, ${city.state}, india`.toLowerCase(), zone: p.zone, lat: p.lat, lng: p.lng }));
/* Keys that are null or false are left out: jsonb_to_recordset reads a
   missing key as null, and every test below treats null as false. */
const lean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== false));
const payload = { lines: payloadLines.map(lean), animals: animals.map(lean), cache, meta: sourceMeta };

/* ── the SQL ────────────────────────────────────────────────────────── */
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
const id = (key) => `md5(${lit(`straypaw:${SOURCE_SLUG}:`)} || ${key})::uuid`;
const ORG = `(select id from ngos where slug = ${lit(ORG_SLUG)})`;
const SRC = id(`'source'`), BATCH = id(`'batch'`);
const noon = (col) => `(${col} || 'T00:00:00Z')::timestamptz`;
const json = JSON.stringify(payload);
if (json.includes("$kh$")) throw new Error("payload contains the dollar-quote tag");

const sql = `begin;

create temp table kh_payload on commit drop as select $kh$${json}$kh$::jsonb as j;

create temp table kh_lines on commit drop as
select l.*, jsonb_strip_nulls(jsonb_build_object(
    'source_sheet', ${lit(SHEET)}, 'source_row', l.n, 'classification', 'rescue',
    'classification_reason', 'Kind Hour rescue/admission register line',
    'event_date', l.d || 'T00:00:00.000Z', 'locality', l.zone, 'city', case when l.zone is not null then ${lit(city.name)} end,
    'animal_name', l.name, 'species', l.sp, 'sex', l.sex, 'colour', l.col, 'condition', l.cond,
    'admit_date', case when l.adm then l.d || 'T00:00:00.000Z' end,
    'release_date', case when l.dd is not null then l.dd || 'T00:00:00.000Z' end,
    'kh_record_id', l.id)) as norm,
  jsonb_strip_nulls(jsonb_build_object(
    'Kind Hour line', l.id, 'Date of rescue/admission', l.dr, 'Date of discharge', l.ddr, 'Address', l.addr,
    'Dog identification', l.desc, 'Dog name', l.name, 'OPD', case when l.opd then 'yes' end, 'Admission', case when l.adm then 'yes' end,
    'Medical expense recorded', case when l.exp then 'yes' end, 'Payment marked done', case when l.paid then 'yes' end,
    'Media label', l.media)) as raw
from kh_payload, jsonb_to_recordset(j -> 'lines') as l(n int, id text, d text, dr text, dd text, ddr text, addr text, "desc" text, name text,
  sp text, sex text, col text, cond text, opd boolean, adm boolean, exp boolean, paid boolean, media text, k text, "first" boolean, zone text, disp text, note text);
update kh_lines set norm = norm || jsonb_build_object('fingerprint', encode(sha256(convert_to(norm::text, 'UTF8')), 'hex'));
alter table kh_lines add column ref jsonb;
update kh_lines set ref = jsonb_build_object('import_batch_id', ${BATCH}, 'source_workbook', ${lit(SOURCE_SLUG)}, 'source_row', n, 'row_fingerprint', norm ->> 'fingerprint', 'kh_record_id', id);

create temp table kh_animals on commit drop as
select a.* from kh_payload, jsonb_to_recordset(j -> 'animals') as a(k text, name text, sp text, sex text, col text, stage text, cond text, zone text,
  lat double precision, lng double precision, h3 text, geo text, "first" text, "from" text, "to" text, ids jsonb);

-- Every place the register names is in Lucknow.
update ngos set city = coalesce(city, ${lit(city.name)}), state = coalesce(state, ${lit(city.state)}) where slug = ${lit(ORG_SLUG)};

insert into data_sources (id, slug, source_type, source_name, source_dataset, organization_name, reporting_org_id, source_url, source_license,
  license_status, publication_status, attribution_requirements, restrictions, importer_version, geographic_precision, record_count,
  published_record_count, metadata, validated_at, published_at)
select ${SRC}, ${lit(SOURCE_SLUG)}, 'organisation_register', 'Kind Hour rescue register', 'Rescue – Yearly register, January 2024 to August 2026',
  'The Kind Hour Foundation', ${ORG}, ${lit(`urn:straypaw:source:${SOURCE_SLUG}`)},
  'Shared by The Kind Hour Foundation with StrayPaw for publication on the public record', 'verified', 'published',
  'Credit The Kind Hour Foundation. Imported historical records, not live StrayPaw reports.',
  'Caretaker names, amounts, payment status and media links are withheld. Lines with no place are not published as profiles. No photographs.',
  ${lit(IMPORTER)}, 'named locality where resolvable; otherwise Lucknow city centroid; no address or GPS in source',
  ${lines.length}, ${animals.length}, j -> 'meta', now(), now()
from kh_payload
on conflict (slug) do update set record_count = excluded.record_count, published_record_count = excluded.published_record_count,
  metadata = excluded.metadata, reporting_org_id = excluded.reporting_org_id, updated_at = now();

insert into import_batches (id, ngo_id, source_filename, source_kind, sheet_name, mapping, status, rows_total, rows_imported, rows_needing_review,
  workbook_hash, data_source_id, completed_at, preview)
values (${BATCH}, ${ORG}, 'Rescue - Yearly .pdf', 'csv', ${lit(SHEET)},
  ${lit(JSON.stringify({ importer: IMPORTER, transcription: sourceMeta.transcription, date: "Date of rescue/admission", locality: "Address", colour: "Dog identification", name: "Dog name, only where it is not a person", withheld: sourceMeta.omitted_fields }))}::jsonb,
  'imported', ${lines.length}, ${sourceMeta.profile_lines}, 0, ${lit(SOURCE_SHA256)}, ${SRC}, now(),
  ${lit(JSON.stringify({ profiles: animals.length, withheld: withheld.length, duplicates: sourceMeta.duplicate_lines }))}::jsonb)
on conflict (id) do nothing;

insert into import_location_cache (normalized_query, locality, city, state, country, lat, lng, provider, precision)
select c.q, c.zone, ${lit(city.name)}, ${lit(city.state)}, 'India', c.lat, c.lng, 'openstreetmap', 'approximate'
from kh_payload, jsonb_to_recordset(j -> 'cache') as c(q text, zone text, lat double precision, lng double precision)
on conflict (normalized_query) do nothing;

insert into dogs (id, ngo_id, name, species, sex, color, zone, lat, lng, h3_r8, location_precision, geographic_precision, status, needs_help,
  sterilisation_status, vaccination_status, first_seen, last_seen, original_observed_at, observed_date_precision, provenance, import_batch_id,
  data_source_id, source_record_id, importer_version, source_metadata, identity_state)
select ${id("'animal:' || a.k")}, ${ORG}, a.name, a.sp, a.sex, a.col, a.zone, a.lat, a.lng, a.h3, 'approximate', a.geo, 'seen', false, 'unknown', 'unknown',
  ${noon("a.from")}, ${noon("a.to")}, ${noon("a.from")}, 'day', 'imported_historical_record', ${BATCH}, ${SRC}, a.first, ${lit(IMPORTER)},
  l.ref || jsonb_build_object('kh_record_ids', a.ids, 'register_lines', jsonb_array_length(a.ids), 'life_stage', a.stage), 'confirmed'
from kh_animals a join kh_lines l on l.id = a.first
where not exists (select 1 from dogs d where d.id = ${id("'animal:' || a.k")} or (d.data_source_id = ${SRC} and d.source_record_id = a.first));

insert into cases (id, dog_id, ngo_id, title, zone, lat, lng, h3_r8, species, category, status, condition_text, provenance, verification_state,
  source_event_at, imported_at, import_batch_id, source_metadata, location_precision)
select ${id("'case:' || a.k")}, ${id("'animal:' || a.k")}, ${ORG}, 'Kind Hour rescue register · ' || a.zone, a.zone, a.lat, a.lng, a.h3, a.sp, 'rescue', null,
  a.cond, 'imported_historical_record', 'verified', ${noon("a.from")}, now(), ${BATCH}, l.ref, 'approximate'
from kh_animals a join kh_lines l on l.id = a.first
on conflict (id) do nothing;

insert into animal_timeline_events (id, ngo_id, dog_id, case_id, event_type, title, details, occurred_at, provenance, source_ref, visibility)
select ${id("'timeline:' || l.id")}, ${ORG}, ${id("'animal:' || l.k")}, ${id("'case:' || l.k")},
  case when l.adm then 'import:admission' else 'import:rescue' end,
  case when l.adm then 'Admitted (the register marks an admission)' when l.opd then 'Seen at OPD (the register marks OPD)'
       when l.first then 'Entered in Kind Hour''s rescue register' else 'Further visit in Kind Hour''s rescue register' end,
  case when l.exp then 'A medical expense is recorded for this visit; the treatment is not itemised.' end,
  ${noon("l.d")}, 'imported_historical_record', l.ref, 'partner'
from kh_lines l where l.disp = 'profile'
on conflict (id) do nothing;

insert into medical_events (id, dog_id, case_id, kind, event_date, notes, performed_by, import_batch_id, source_metadata)
select ${id("'care:' || l.id")}, ${id("'animal:' || l.k")}, ${id("'case:' || l.k")}, 'treatment', l.d::date,
  'Veterinary expense recorded in Kind Hour''s rescue register; the treatment itself is not itemised.', 'The Kind Hour Foundation', ${BATCH}, l.ref
from kh_lines l where l.disp = 'profile' and l.exp
on conflict (id) do nothing;

-- Every register line is an import row, whatever became of it.
insert into import_rows (id, batch_id, source_row_number, raw_row, normalized, decision, imported_dog_id, imported_case_id, error, classification, row_fingerprint)
select ${id("'row:' || l.id")}, ${BATCH}, l.n, l.raw, l.norm,
  case when l.disp <> 'profile' then 'skip' when l.first then 'new' else 'merge' end,
  case when l.disp = 'profile' then ${id("'animal:' || l.k")} end,
  case when l.disp = 'profile' and l.first then ${id("'case:' || l.k")} end,
  case when l.disp = 'withheld' then 'No place recorded on this line; not published as a profile.' when l.disp = 'duplicate' then l.note end,
  case when l.disp = 'profile' then 'rescue' else 'skip' end, l.norm ->> 'fingerprint'
from kh_lines l
on conflict (id) do nothing;

commit;
`;

if (process.argv.includes("--apply")) {
  const { default: pg } = await import("pg");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error("DATABASE_URL is required with --apply."); process.exit(1); }
  const client = new pg.Client({ connectionString, ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false } });
  await client.connect();
  try { await client.query(sql); } finally { await client.end(); }
} else process.stdout.write(sql);
console.error(`Kind Hour register: ${animals.length} profiles (${atLocality} at a locality) from ${lines.length} lines; ${withheld.length} withheld, ${sourceMeta.duplicate_lines} duplicate.`);
