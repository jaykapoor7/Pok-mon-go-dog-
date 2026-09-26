#!/usr/bin/env node
/*
 * The Kind Hour Foundation rescue register importer, version 2.
 *
 * The source is an encounter-and-expense ledger, not an animal registry.
 * Each legitimate, distinct ledger line therefore becomes one historical
 * encounter. Only Chachi is linked across lines because the source explicitly
 * repeats that animal name. Every other identity remains unresolved: those
 * encounters have no dog_id and do not inflate the unique-animal total.
 *
 * Caretaker/contact details are not transcribed. Financial cells are retained
 * verbatim as restricted provenance, never interpreted as treatment or outcome.
 * A blank address means Lucknow city-level, not a withheld encounter.
 *
 * Usage:
 *   node scripts/import-kind-hour.mjs --audit
 *   node scripts/import-kind-hour.mjs --sql-only > kind-hour-v2.sql
 *   DATABASE_URL=... node scripts/import-kind-hour.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { latLngToCell } from "h3-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "scripts", "kind-hour");
const ORG_SLUG = "the-kind-hour-foundation";
const SOURCE_SLUG = "kind-hour-rescue-register-2024-2026";
const IMPORTER = "kind-hour-register-v2";
const SOURCE_SHA256 = "601d207f26466dc83f2d9b3113b471e2dd3e80e78037ccf3ba4c2fd8631434d6";
const SOURCE_FILE_ID = "1dXXZFtooM2yRZVGaK9Ouai-k2OsD6SS8";
const SHEET = "Rescue (Kind Hour register)";
const DUPLICATE_IDS = new Set(["KH-RR-037", "KH-RR-084"]);
const NO_ANIMAL_EVIDENCE = new Set(["KH-RR-106"]);
const CANONICAL_IDS = new Set(["KH-RR-001", "KH-RR-002"]);

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c !== ""));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const sourceLines = parseCsv(fs.readFileSync(path.join(dir, "rescue-register.csv"), "utf8"));
const ledgerValues = JSON.parse(fs.readFileSync(path.join(dir, "ledger-values.json"), "utf8"));
const { city, places } = JSON.parse(fs.readFileSync(path.join(dir, "places.json"), "utf8"));

const clean = (value) => value?.trim() || null;
const zoneOf = (placeKey) => placeKey
  ? places[placeKey].zone.replace(/ \(as recorded\)$/, "")
  : `${city.name} (city-level; source address blank)`;
const locationOf = (placeKey) => {
  const place = placeKey ? places[placeKey] : null;
  if (place?.precision === "locality") {
    return {
      zone: zoneOf(placeKey), lat: place.lat, lng: place.lng, precision: "approximate",
      explanation: `Named locality only (${place.osm_kind}, OSM ${place.osm}); the source provides no street address or GPS.`,
    };
  }
  return {
    zone: zoneOf(placeKey), lat: city.lat, lng: city.lng, precision: "city",
    explanation: place
      ? `Lucknow city centroid (OSM ${city.osm}); "${place.as_recorded.join('", "')}" was not confidently resolved to a locality.`
      : "Lucknow city centroid; the source address cell is blank.",
  };
};
const speciesOf = (line) => {
  if (clean(line.species)) return line.species.toLowerCase();
  const value = clean(line.description_as_recorded)?.toLowerCase() ?? "";
  if (/\b(cat|kitten)\b/.test(value)) return "cat";
  if (/\b(pigeon|kabutar|eagle|bird)\b/.test(value)) return "bird";
  if (/\b(dog|puppy|pups)\b/.test(value)) return "dog";
  return "unknown";
};
const conditionOf = (line) => clean(line.condition_as_recorded) || clean(line.description_as_recorded);

const rows = sourceLines.map((line) => {
  const location = locationOf(clean(line.place_key));
  const duplicate = DUPLICATE_IDS.has(line.kh_record_id);
  const sourceOnly = NO_ANIMAL_EVIDENCE.has(line.kh_record_id);
  const canonical = CANONICAL_IDS.has(line.kh_record_id);
  const encounter = !duplicate && !sourceOnly;
  const species = speciesOf(line);
  const description = clean(line.description_as_recorded);
  return {
    n: Number(line.line),
    id: line.kh_record_id,
    date: line.date,
    dateRecorded: line.date_as_recorded,
    dischargeDate: clean(line.discharge_date),
    dischargeRecorded: clean(line.discharge_as_recorded),
    address: clean(line.address_as_recorded),
    description,
    sourceName: clean(line.dog_name),
    species,
    sex: clean(line.sex),
    colour: clean(line.colour),
    lifeStage: clean(line.life_stage),
    condition: conditionOf(line),
    opd: line.opd === "yes",
    admission: line.admission === "yes",
    medicalExpense: line.medical_expense_recorded === "yes",
    paymentDone: line.payment_marked_done === "yes",
    mediaLabel: clean(line.media_label),
    ledgerValue: ledgerValues[line.kh_record_id] ?? null,
    duplicate,
    sourceOnly,
    encounter,
    canonical,
    canonicalFirst: line.kh_record_id === "KH-RR-001",
    duplicateOf: line.kh_record_id === "KH-RR-037" ? "KH-RR-036" : line.kh_record_id === "KH-RR-084" ? "KH-RR-079" : null,
    location,
    h3: latLngToCell(location.lat, location.lng, 8),
  };
});

const encounterRows = rows.filter((row) => row.encounter);
const reviewRows = rows.filter((row) => !row.canonical && !row.duplicate);
const sourceOnlyRows = rows.filter((row) => row.sourceOnly);
const duplicateRows = rows.filter((row) => row.duplicate);
const cityLevelRows = encounterRows.filter((row) => row.location.precision === "city");
const medicalRows = encounterRows.filter((row) => row.medicalExpense);
const speciesCounts = encounterRows.reduce((counts, row) => {
  counts[row.species] = (counts[row.species] ?? 0) + 1;
  return counts;
}, {});

const audit = {
  source_rows: rows.length,
  exact_duplicates: duplicateRows.length,
  distinct_rows: rows.length - duplicateRows.length,
  encounter_records: encounterRows.length,
  source_only_rows_needing_review: sourceOnlyRows.length,
  canonical_animal_profiles: 1,
  canonical_profile_name: "Chachi",
  provisional_or_unmatched_rows: reviewRows.length,
  encounters_at_city_level: cityLevelRows.length,
  encounters_at_named_locality: encounterRows.length - cityLevelRows.length,
  medical_expense_markers: medicalRows.length,
  species_as_supported_by_source: speciesCounts,
};

const expected = {
  source_rows: 145,
  exact_duplicates: 2,
  distinct_rows: 143,
  encounter_records: 142,
  source_only_rows_needing_review: 1,
  canonical_animal_profiles: 1,
  provisional_or_unmatched_rows: 141,
};
for (const [key, value] of Object.entries(expected)) {
  if (audit[key] !== value) throw new Error(`Audit failed: ${key} is ${audit[key]}, expected ${value}`);
}
for (const row of rows) {
  if (!row.date || !row.id) throw new Error(`Incomplete source row ${row.n}`);
  if (row.medicalExpense && row.n >= 49 && !row.ledgerValue && !["KH-RR-105", "KH-RR-106"].includes(row.id)) {
    throw new Error(`Missing ledger value for ${row.id}`);
  }
}

const sourceMeta = {
  source_file: "Rescue - Yearly.pdf",
  source_file_id: SOURCE_FILE_ID,
  source_sha256: SOURCE_SHA256,
  source_kind: "encounter_and_expense_ledger",
  source_access: "Shared by The Kind Hour Foundation with StrayPaw; contains restricted caretaker/contact and financial context.",
  register_span: { from: rows[0].date, to: rows.at(-1).date },
  audit,
  interpretation: "One legitimate distinct line is one encounter. The register does not prove one unique animal per line.",
  identity_policy: "Only Chachi is canonical because that exact Dog Name is repeated on two source lines. All other encounter dog_id values are null.",
  location_policy: "A blank address is represented at Lucknow city level. Named localities are approximate; unresolved names also use the Lucknow centroid. No street address or GPS is inferred.",
  financial_policy: "Source financial cells are retained verbatim in restricted provenance. Values are not summed or interpreted. 'done' is payment context only.",
  duplicate_policy: "KH-RR-037 duplicates KH-RR-036; KH-RR-084 duplicates KH-RR-079. Duplicate rows remain auditable import rows and do not become encounters.",
  no_animal_evidence: "KH-RR-106 (19/4/26) is retained for review but is not published as an animal encounter because the source has no confident animal identity or description.",
  redacted_fields: ["owner/caretaker name", "phone/contact details", "media links"],
  not_inferred: ["unique animal identity", "treatment type", "outcome", "sterilisation", "vaccination", "exact location", "species where not explicit"],
};

const payloadRows = rows.map((row) => ({
  n: row.n, id: row.id, d: row.date, dr: row.dateRecorded,
  dd: row.dischargeDate, ddr: row.dischargeRecorded, addr: row.address,
  desc: row.description, sname: row.sourceName, sp: row.species, sex: row.sex,
  col: row.colour, stage: row.lifeStage, cond: row.condition, opd: row.opd,
  adm: row.admission, med: row.medicalExpense, done: row.paymentDone,
  media: row.mediaLabel, ledger: row.ledgerValue, duplicate: row.duplicate,
  sourceOnly: row.sourceOnly, encounter: row.encounter, canonical: row.canonical,
  canonicalFirst: row.canonicalFirst, duplicateOf: row.duplicateOf,
  zone: row.location.zone, lat: row.location.lat, lng: row.location.lng,
  precision: row.location.precision, geo: row.location.explanation, h3: row.h3,
}));
const payload = { rows: payloadRows, meta: sourceMeta };

const lit = (value) => `'${String(value).replace(/'/g, "''")}'`;
const stableId = (valueSql) => `md5(${lit(`straypaw:${SOURCE_SLUG}:`)} || ${valueSql})::uuid`;
const ORG = `(select id from ngos where slug = ${lit(ORG_SLUG)})`;
const SRC = stableId("'source'");
const BATCH = stableId("'batch:v2'");
const CHACHI = stableId("'animal:chachi'");
const noon = (column) => `(${column} || 'T00:00:00Z')::timestamptz`;
const json = JSON.stringify(payload);
if (json.includes("$kh$")) throw new Error("Payload contains the SQL dollar-quote tag.");

const sql = `begin;

create temp table kh_payload on commit drop as select $kh$${json}$kh$::jsonb as j;
create temp table kh_rows on commit drop as
select r.*, jsonb_strip_nulls(jsonb_build_object(
    'source_sheet', ${lit(SHEET)}, 'source_row', r.n, 'kh_record_id', r.id,
    'event_date', r.d || 'T00:00:00.000Z', 'locality', r.zone, 'city', ${lit(city.name)},
    'animal_name', r.sname, 'species', nullif(r.sp, 'unknown'), 'sex', r.sex,
    'colour', r.col, 'condition', r.cond,
    'admit_date', case when r.adm then r.d || 'T00:00:00.000Z' end,
    'release_date', case when r.dd is not null then r.dd || 'T00:00:00.000Z' end
  )) as norm,
  jsonb_strip_nulls(jsonb_build_object(
    'Kind Hour line', r.id, 'Date of rescue/admission', r.dr,
    'Date of discharge', r.ddr, 'Address as recorded', r.addr,
    'Animal identification as recorded', r."desc", 'Animal name as recorded', r.sname,
    'OPD marker', case when r.opd then 'yes' end,
    'Admission marker', case when r.adm then 'yes' end,
    'Medical expense marker', case when r.med then 'yes' end,
    'Financial cells as recorded', r.ledger,
    'Payment context as recorded', case when r.done then 'done' end,
    'Media label (link withheld)', r.media
  )) as raw
from kh_payload, jsonb_to_recordset(j -> 'rows') as r(
  n int, id text, d text, dr text, dd text, ddr text, addr text, "desc" text,
  sname text, sp text, sex text, col text, stage text, cond text, opd boolean,
  adm boolean, med boolean, done boolean, media text, ledger text,
  duplicate boolean, "sourceOnly" boolean, encounter boolean, canonical boolean,
  "canonicalFirst" boolean, "duplicateOf" text, zone text, lat double precision,
  lng double precision, precision text, geo text, h3 text
);
update kh_rows
set norm = norm || jsonb_build_object(
  'fingerprint', encode(sha256(convert_to(norm::text, 'UTF8')), 'hex')
);
alter table kh_rows add column ref jsonb;
update kh_rows set ref = jsonb_build_object(
  'import_batch_id', ${BATCH}, 'source_workbook', ${lit(SOURCE_SLUG)},
  'source_row', n, 'row_fingerprint', norm ->> 'fingerprint', 'kh_record_id', id
);

-- Replace only prior imports from this exact data source.
create temp table kh_old_batches on commit drop as
select id from import_batches
where data_source_id = ${SRC} or (ngo_id = ${ORG} and source_filename = 'Rescue - Yearly .pdf');
create temp table kh_old_dogs on commit drop as
select id from dogs
where data_source_id = ${SRC} or import_batch_id in (select id from kh_old_batches);
create temp table kh_old_cases on commit drop as
select id from cases
where import_batch_id in (select id from kh_old_batches)
   or dog_id in (select id from kh_old_dogs);
delete from medical_events
where import_batch_id in (select id from kh_old_batches)
   or dog_id in (select id from kh_old_dogs)
   or case_id in (select id from kh_old_cases);
delete from animal_timeline_events
where dog_id in (select id from kh_old_dogs)
   or case_id in (select id from kh_old_cases);
delete from import_rows where batch_id in (select id from kh_old_batches);
delete from cases where id in (select id from kh_old_cases);
delete from dogs where id in (select id from kh_old_dogs);
delete from import_batches where id in (select id from kh_old_batches);

update ngos
set city = coalesce(city, ${lit(city.name)}), state = coalesce(state, ${lit(city.state)})
where slug = ${lit(ORG_SLUG)};

insert into data_sources (
  id, slug, source_type, source_name, source_dataset, organization_name,
  reporting_org_id, source_url, source_license, license_status,
  publication_status, attribution_requirements, restrictions, importer_version,
  geographic_precision, record_count, published_record_count, metadata,
  validated_at, published_at
)
select ${SRC}, ${lit(SOURCE_SLUG)}, 'organisation_register',
  'Kind Hour rescue register', 'Rescue – Yearly register, January 2024 to August 2026',
  'The Kind Hour Foundation', ${ORG}, ${lit(`urn:google-drive:file:${SOURCE_FILE_ID}`)},
  'Shared by The Kind Hour Foundation with StrayPaw for publication on the public record',
  'verified', 'published',
  'Credit The Kind Hour Foundation. These are imported historical encounters, not live StrayPaw reports.',
  'Caretaker/contact details and media links are redacted. Financial context is restricted provenance. No exact locations.',
  ${lit(IMPORTER)},
  'named locality when supported; otherwise Lucknow city centroid; no address or GPS inferred',
  ${audit.source_rows}, ${audit.encounter_records}, j -> 'meta', now(), now()
from kh_payload
on conflict (slug) do update set
  source_name = excluded.source_name,
  source_dataset = excluded.source_dataset,
  reporting_org_id = excluded.reporting_org_id,
  source_url = excluded.source_url,
  restrictions = excluded.restrictions,
  importer_version = excluded.importer_version,
  geographic_precision = excluded.geographic_precision,
  record_count = excluded.record_count,
  published_record_count = excluded.published_record_count,
  metadata = excluded.metadata,
  validated_at = excluded.validated_at,
  published_at = excluded.published_at,
  updated_at = now();

insert into import_batches (
  id, ngo_id, source_filename, source_kind, sheet_name, mapping, status,
  rows_total, rows_imported, rows_needing_review, workbook_hash,
  data_source_id, completed_at, preview
)
values (
  ${BATCH}, ${ORG}, 'Rescue - Yearly.pdf', 'csv', ${lit(SHEET)},
  ${lit(JSON.stringify({
    importer: IMPORTER,
    unit: "encounter row",
    date: "Date of rescue/admission",
    locality: "Address (blank = Lucknow city-level)",
    identity: "Dog Name only; Chachi is the sole canonical animal",
    redacted: ["Owner/Caretaker", "contact details", "media links"],
  }))}::jsonb,
  'imported', ${audit.source_rows}, ${audit.encounter_records},
  ${audit.provisional_or_unmatched_rows}, ${lit(SOURCE_SHA256)}, ${SRC}, now(),
  ${lit(JSON.stringify(audit))}::jsonb
);

insert into dogs (
  id, ngo_id, name, species, sex, color, zone, lat, lng, h3_r8,
  location_precision, geographic_precision, status, needs_help,
  sterilisation_status, vaccination_status, first_seen, last_seen,
  original_observed_at, observed_date_precision, provenance, import_batch_id,
  data_source_id, source_record_id, importer_version, source_metadata,
  identity_state
)
select ${CHACHI}, ${ORG}, 'Chachi', 'dog', null,
  coalesce(max(col) filter (where canonical), 'White and brown'),
  max(zone) filter (where "canonicalFirst"),
  max(lat) filter (where "canonicalFirst"),
  max(lng) filter (where "canonicalFirst"),
  max(h3) filter (where "canonicalFirst"),
  'approximate',
  max(geo) filter (where "canonicalFirst"),
  'seen', false, 'unknown', 'unknown',
  min(${noon("d")}) filter (where canonical),
  max(${noon("d")}) filter (where canonical),
  min(${noon("d")}) filter (where canonical),
  'day', 'imported_historical_record', ${BATCH}, ${SRC},
  'KH-RR-001', ${lit(IMPORTER)},
  jsonb_build_object(
    'kh_record_ids', jsonb_agg(id order by n) filter (where canonical),
    'identity_basis', 'The source explicitly repeats the Dog Name Chachi.',
    'import_batch_id', ${BATCH}
  ),
  'confirmed'
from kh_rows;

insert into cases (
  id, dog_id, ngo_id, title, zone, lat, lng, h3_r8, species, category,
  status, condition_text, provenance, verification_state, source_event_at,
  imported_at, import_batch_id, source_metadata, location_precision
)
select ${stableId("'case:' || id")},
  case when canonical then ${CHACHI} end,
  ${ORG},
  'Kind Hour encounter · ' || id,
  zone, lat, lng, h3, case when sp = 'unknown' then 'other' else sp end, 'rescue', null,
  cond, 'imported_historical_record', 'verified', ${noon("d")}, now(),
  ${BATCH},
  ref || jsonb_build_object(
    'source_description', "desc",
    'source_species_evidence', sp,
    'source_name', sname,
    'source_discharge_date', ddr,
    'source_financial_cells', ledger,
    'payment_context', case when done then 'done' end,
    'location_explanation', geo,
    'identity_state', case when canonical then 'confirmed' else 'unresolved' end
  ),
  precision
from kh_rows
where encounter;

insert into animal_timeline_events (
  id, ngo_id, dog_id, case_id, event_type, title, details, occurred_at,
  provenance, source_ref, visibility
)
select ${stableId("'timeline:' || id")}, ${ORG}, ${CHACHI},
  ${stableId("'case:' || id")}, 'import:encounter',
  case when adm then 'Admission recorded by Kind Hour'
       when opd then 'OPD encounter recorded by Kind Hour'
       else 'Encounter recorded by Kind Hour' end,
  case when med then 'A medical expense is recorded; no treatment or outcome is inferred.' end,
  ${noon("d")}, 'imported_historical_record', ref, 'partner'
from kh_rows where canonical;

insert into medical_events (
  id, dog_id, case_id, kind, event_date, notes, performed_by,
  import_batch_id, source_metadata
)
select ${stableId("'medical:' || id")},
  case when canonical then ${CHACHI} end,
  ${stableId("'case:' || id")}, 'treatment', d::date,
  'A medical expense is marked in the source ledger. The treatment and outcome are not itemised or inferred'
    || case when ledger is not null then '; financial cells as recorded: ' || ledger else '' end || '.',
  'The Kind Hour Foundation', ${BATCH},
  ref || jsonb_build_object(
    'event_kind', 'medical_expense_recorded',
    'source_financial_cells', ledger,
    'payment_context', case when done then 'done' end
  )
from kh_rows where encounter and med;

insert into import_rows (
  id, batch_id, source_row_number, raw_row, normalized, decision,
  imported_dog_id, imported_case_id, error, classification, row_fingerprint
)
select ${stableId("'row:' || id")}, ${BATCH}, n, raw, norm,
  case
    when duplicate then 'skip'
    when "sourceOnly" then 'review'
    when "canonicalFirst" then 'new'
    when canonical then 'merge'
    else 'review'
  end,
  case when canonical then ${CHACHI} end,
  case when encounter then ${stableId("'case:' || id")} end,
  case
    when duplicate then 'Exact duplicate of ' || "duplicateOf" || '; retained for source audit only.'
    when "sourceOnly" then 'No confident animal identity or description in the source; retained for review only.'
    when not canonical then 'Encounter published without a canonical animal identity.'
  end,
  case when encounter then 'rescue' else 'review' end,
  norm ->> 'fingerprint'
from kh_rows;

commit;
`;

if (process.argv.includes("--audit")) {
  process.stdout.write(`${JSON.stringify({ ...audit, checks: "passed" }, null, 2)}\n`);
} else if (process.argv.includes("--apply")) {
  const { default: pg } = await import("pg");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required with --apply.");
    process.exit(1);
  }
  const client = new pg.Client({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString)
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();
  try { await client.query(sql); } finally { await client.end(); }
  console.error(`Imported Kind Hour register: ${audit.encounter_records} encounters, 1 canonical animal.`);
} else {
  process.stdout.write(sql);
  if (!process.argv.includes("--sql-only")) {
    console.error(`Kind Hour v2 dry run: ${audit.encounter_records} encounters; 1 canonical animal; ${audit.exact_duplicates} duplicates; ${audit.source_only_rows_needing_review} source-only review row.`);
  }
}
