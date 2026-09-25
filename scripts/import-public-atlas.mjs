#!/usr/bin/env node
/*
 * Repeatable public-atlas importer.
 *
 * Default mode only downloads, normalizes and writes a quality report.
 * --stage preserves every usable and skipped source row in the existing
 * import_batches/import_rows review architecture.  --publish additionally
 * upserts only validated individual observations and ward coverage facts.
 *
 *   npm run import:atlas -- ranchi
 *   DATABASE_URL=... npm run import:atlas -- ranchi --stage
 *   DATABASE_URL=... npm run import:atlas -- ranchi --stage --publish
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import * as XLSX from "xlsx";
import { latLngToCell } from "h3-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "data-sources", "registry.json"), "utf8"));
const key = process.argv[2];
const stage = process.argv.includes("--stage");
const publish = process.argv.includes("--publish");
if (key !== "ranchi") {
  console.error("Supported source: ranchi");
  process.exit(1);
}

const source = registry.sources.find((row) => row.slug === "mission-rabies-ranchi-2014-2015");
if (!source || source.license_status !== "verified") throw new Error("Ranchi registry entry is missing or not license-verified.");
const version = source.importer_version;
const cacheDir = path.join(root, ".cache", "public-atlas");
const reportDir = path.join(root, "reports");
fs.mkdirSync(cacheDir, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });
const workbookPath = path.join(cacheDir, "mission-rabies-ranchi.xlsx");
if (!fs.existsSync(workbookPath)) {
  const response = await fetch(source.download_url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  fs.writeFileSync(workbookPath, Buffer.from(await response.arrayBuffer()));
}
const bytes = fs.readFileSync(workbookPath);
const workbookHash = crypto.createHash("sha256").update(bytes).digest("hex");
const book = XLSX.read(bytes, { type: "buffer", cellDates: true });

const clean = (value) => String(value ?? "").trim();
const asNumber = (value) => typeof value === "number" ? value : Number(value);
const iso = (value) => value instanceof Date && Number.isFinite(value.valueOf()) ? value.toISOString() : null;
const validIndia = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98;
const uuid = (value) => {
  const h = crypto.createHash("sha256").update(value).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");

function sheetRows(name) {
  const rows = XLSX.utils.sheet_to_json(book.Sheets[name], { defval: null, raw: true });
  return rows.filter((row) => Object.values(row).some((value) => value !== null && clean(value)));
}

const rawVacc = sheetRows("Vacc dataset");
const rawSurvey = sheetRows("Survey data");
const counters = { discovered: rawVacc.length, staged: rawVacc.length, imported: 0, skipped: 0, duplicates: 0, with_photos: 0, with_coordinates: 0, with_abc_status: 0, with_vaccination_status: 0, with_health_data: 0 };
const seen = new Set();
const stagedRows = [];
const dogs = [];
for (let index = 0; index < rawVacc.length; index++) {
  const row = rawVacc[index];
  const recordId = clean(row.DogId);
  const lat = asNumber(row.Lat), lng = asNumber(row.Long);
  const observedAt = iso(row.Date_Created);
  const ownership = clean(row.Ownership);
  const hasCoordinates = validIndia(lat, lng);
  const reasons = [];
  if (!recordId) reasons.push("missing_source_record_id");
  if (!observedAt) reasons.push("missing_observation_date");
  if (!hasCoordinates) reasons.push("missing_or_invalid_original_gps");
  if (ownership !== "Free Roaming") reasons.push(ownership === "Owner Present" ? "owner_present_not_assumed_stray" : "ownership_not_free_roaming");
  if (recordId && seen.has(recordId)) reasons.push("duplicate_source_record_id");
  if (recordId) seen.add(recordId);
  const decision = reasons.length ? "skip" : "new";
  if (reasons.includes("duplicate_source_record_id")) counters.duplicates++;
  if (decision === "skip") counters.skipped++;
  if (hasCoordinates) counters.with_coordinates++;
  if (clean(row.Neuter_Status)) counters.with_abc_status++;
  counters.with_vaccination_status++;
  if (clean(row.Health) || clean(row.BCS) || clean(row["skin score"])) counters.with_health_data++;
  const normalized = {
    source_record_id: recordId || null, observed_at: observedAt, lat: hasCoordinates ? lat : null, lng: hasCoordinates ? lng : null,
    ward: clean(row["GPS Ward Number"] ?? row["Manual ward"]) || null, ownership: ownership || null,
    sex: clean(row.Sex) || null, age: clean(row.Age) || null, neuter_status: clean(row.Neuter_Status) || null,
    action: clean(row.Action) || null, health: clean(row.Health) || null, body_condition: clean(row.BCS) || null,
    skin_score: clean(row["skin score"]) || null, decision, skip_reasons: reasons,
  };
  stagedRows.push({ sourceRowNumber: index + 2, fingerprint: sha(`${source.slug}:${recordId || index + 2}`), raw: row, normalized, decision });
  if (decision !== "new") continue;
  const neuter = clean(row.Neuter_Status).toLowerCase();
  const healthText = `${clean(row.Health)} ${clean(row.BCS)}`.toLowerCase();
  const skin = Number(row["skin score"]);
  const needsHelp = /sick|injur|emaciated|underweight|tvt|wound|lame|rabies/.test(healthText) || (Number.isFinite(skin) && skin >= 3);
  const ward = clean(row["GPS Ward Number"] ?? row["Manual ward"]);
  dogs.push({
    id: uuid(`${source.slug}:${recordId}`), source_record_id: recordId, observed_at: observedAt,
    lat, lng, h3_r8: latLngToCell(lat, lng, 8), zone: ward ? `Ward ${ward}` : "Ranchi",
    code: recordId, sex: clean(row.Sex) || null, size: /puppy/i.test(clean(row.Age)) ? "puppy" : "medium",
    sterilisation_status: /neutered/i.test(neuter) ? "sterilised" : /entire/i.test(neuter) ? "not_sterilised" : "unknown",
    vaccinated: true, vaccination_status: "vaccinated", needs_help: needsHelp, status: needsHelp ? "injured" : "vaccinated",
    source_metadata: {
      source_type: source.source_type, source_name: source.organization, source_dataset: source.dataset,
      source_record_id: recordId, source_url: source.url, source_license: source.license,
      source_license_url: source.license_url, original_observed_at: observedAt, imported_at: new Date().toISOString(),
      importer_version: version, photo_source_url: null, photo_creator: null, photo_license: null,
      external_image_url: null, geographic_precision: "exact_source_gps", partner_organizations: source.partners,
      original: { ward_manual: row["Manual ward"], ward_gps: row["GPS Ward Number"], vaccination_round: row["Vaccination round"], ownership: row.Ownership, sex: row.Sex, age: row.Age, neuter_status: row.Neuter_Status, action: row.Action, health: row.Health, body_condition: row.BCS, skin_score: row["skin score"] },
    },
  });
}
counters.imported = dogs.length;

const wardMap = new Map();
for (const dog of dogs) {
  const ward = dog.zone.replace(/^Ward\s+/i, "") || "Unknown";
  const item = wardMap.get(ward) ?? { ward, n: 0, lat: 0, lng: 0, male: 0, female: 0, puppy: 0, sterilised: 0, vaccinated: 0, health: 0 };
  item.n++; item.lat += dog.lat; item.lng += dog.lng; item.male += /^male$/i.test(dog.sex ?? "") ? 1 : 0; item.female += /^female$/i.test(dog.sex ?? "") ? 1 : 0;
  item.puppy += dog.size === "puppy" ? 1 : 0; item.sterilised += dog.sterilisation_status === "sterilised" ? 1 : 0; item.vaccinated += dog.vaccinated ? 1 : 0; item.health += dog.needs_help ? 1 : 0;
  wardMap.set(ward, item);
}
const wards = [...wardMap.values()].map((w) => ({ ...w, centroid_lat: w.lat / w.n, centroid_lng: w.lng / w.n, sterilisation_percent: Math.round(w.sterilised / w.n * 10000) / 100, vaccination_percent: Math.round(w.vaccinated / w.n * 10000) / 100 }));

/* Machine output used by deployment tooling when a direct database URL is
   deliberately unavailable. It is the same normalized data -- never a
   second importer -- and stays off stdout during normal validation. */
const emitAt = process.argv.indexOf("--emit-json");
if (emitAt >= 0) {
  const kind = process.argv[emitAt + 1];
  const offset = Number(process.argv[emitAt + 2] ?? 0);
  const limit = Number(process.argv[emitAt + 3] ?? 250);
  const compactStage = stagedRows.map((row) => ({ ...row, raw: {
    DogId: row.normalized.source_record_id,
    Date_Created: row.normalized.observed_at,
    Lat: row.normalized.lat,
    Long: row.normalized.lng,
    Ward: row.normalized.ward,
    Ownership: row.normalized.ownership,
    Sex: row.normalized.sex,
    Age: row.normalized.age,
    Neuter_Status: row.normalized.neuter_status,
    Action: row.normalized.action,
    Health: row.normalized.health,
    BCS: row.normalized.body_condition,
    skin_score: row.normalized.skin_score,
  } }));
  const rows = kind === "dogs" ? dogs : kind === "staging" ? stagedRows : kind === "staging-compact" ? compactStage : kind === "wards" ? wards : null;
  if (!rows) throw new Error("--emit-json expects dogs, staging, staging-compact or wards.");
  process.stdout.write(JSON.stringify(rows.slice(offset, offset + limit)));
  process.exit(0);
}

const report = {
  source: source.slug, importer_version: version, generated_at: new Date().toISOString(), workbook_sha256: workbookHash,
  sheets: { vaccination_rows: rawVacc.length, survey_observations_aggregate_only: rawSurvey.length },
  profile_rule: source.publication_rule, counts: counters, aggregate_wards: wards.length,
  exclusions: { owner_present: stagedRows.filter((r) => r.normalized.skip_reasons.includes("owner_present_not_assumed_stray")).length, invalid_or_missing_gps: stagedRows.filter((r) => r.normalized.skip_reasons.includes("missing_or_invalid_original_gps")).length },
};
fs.writeFileSync(path.join(reportDir, "public-atlas-ranchi.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));

if (!stage && !publish) process.exit(0);
function env(name) {
  if (process.env[name]) return process.env[name];
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return null;
  const line = fs.readFileSync(file, "utf8").split("\n").find((value) => value.trim().startsWith(`${name}=`));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}
const connectionString = env("SUPABASE_POOLER_URL") ?? env("DATABASE_URL");
if (!connectionString) throw new Error("DATABASE_URL or SUPABASE_POOLER_URL is required for --stage/--publish.");
const db = new pg.Client({ connectionString, ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false } });
await db.connect();
const chunks = (rows, n = 250) => Array.from({ length: Math.ceil(rows.length / n) }, (_, i) => rows.slice(i * n, (i + 1) * n));
try {
  await db.query("begin");
  const org = (await db.query(`insert into ngos (name, slug, area, city, state, mission, about, website, verified, verified_at, partner_status, areas_of_work, config)
    values ('Mission Rabies','mission-rabies','Ranchi, Jharkhand','Ranchi','Jharkhand','Eliminating dog-mediated rabies through evidence-led vaccination.','Public dog records on StrayPaw are attributed to Mission Rabies from the Ranchi mass-vaccination dataset.','https://missionrabies.com',true,now(),'data_source',array['Anti-rabies vaccination','Research'],jsonb_build_object('directory_kind','data_source'))
    on conflict (slug) do update set name=excluded.name, city=excluded.city, state=excluded.state, website=excluded.website, config=ngos.config || excluded.config
    returning id`)).rows[0];
  const src = (await db.query(`insert into data_sources (slug,source_type,source_name,source_dataset,organization_name,reporting_org_id,source_url,source_license,source_license_url,license_status,publication_status,attribution_requirements,importer_version,geographic_precision,record_count,published_record_count,metadata,validated_at,published_at)
    values ($1,$2,$3,$4,$3,$5,$6,$7,$8,'verified',$9,'Credit Mission Rabies and the study partners.',$10,'exact source GPS',$11,$12,$13::jsonb,now(),case when $9='published' then now() end)
    on conflict (slug) do update set reporting_org_id=excluded.reporting_org_id,license_status=excluded.license_status,publication_status=excluded.publication_status,record_count=excluded.record_count,published_record_count=excluded.published_record_count,metadata=excluded.metadata,updated_at=now(),validated_at=now(),published_at=excluded.published_at
    returning id`, [source.slug, source.source_type, source.organization, source.dataset, org.id, source.url, source.license, source.license_url, publish ? "published" : "validated", version, rawVacc.length, publish ? dogs.length : 0, JSON.stringify({ partners: source.partners, download_url: source.download_url, workbook_sha256: workbookHash, survey_rows: rawSurvey.length })])).rows[0];
  let batch = (await db.query(`select id from import_batches where ngo_id=$1 and workbook_hash=$2 and coalesce(sheet_name,'')='Vacc dataset' and status <> 'rolled_back' limit 1`, [org.id, workbookHash])).rows[0];
  if (!batch) batch = (await db.query(`insert into import_batches (ngo_id,data_source_id,source_filename,source_kind,sheet_name,mapping,status,rows_total,workbook_hash,preview)
    values ($1,$2,'mission-rabies-ranchi.xlsx','xlsx','Vacc dataset',$3::jsonb,'reviewing',$4,$5,$6::jsonb) returning id`, [org.id, src.id, JSON.stringify({ profile_rule: source.publication_rule }), rawVacc.length, workbookHash, JSON.stringify(report)])).rows[0];
  for (const group of chunks(stagedRows)) {
    await db.query(`insert into import_rows (batch_id,source_row_number,raw_row,normalized,decision,classification,row_fingerprint,source_subrecord)
      select $1,x.source_row_number,x.raw_row,x.normalized,x.decision,'public_individual_observation',x.row_fingerprint,'dog'
      from jsonb_to_recordset($2::jsonb) as x(source_row_number int,raw_row jsonb,normalized jsonb,decision text,row_fingerprint text)
      on conflict do nothing`, [batch.id, JSON.stringify(group.map((r) => ({ source_row_number: r.sourceRowNumber, raw_row: r.raw, normalized: r.normalized, decision: r.decision, row_fingerprint: r.fingerprint }))) ]);
  }
  if (publish) {
    for (const group of chunks(dogs)) {
      await db.query(`insert into dogs (id,name,zone,lat,lng,status,cover_photo,size,color,is_friendly,needs_help,sterilised,vaccinated,trust_score,sightings_count,feed_count,first_seen,last_seen,city,district,state,species,ngo_id,code,sex,provenance,source_metadata,identity_state,location_precision,import_batch_id,h3_r8,sterilisation_status,vaccination_status,data_source_id,source_record_id,original_observed_at,observed_date_precision,importer_version,geographic_precision)
        select x.id,null,x.zone,x.lat,x.lng,x.status,null,x.size,'',false,x.needs_help,(x.sterilisation_status='sterilised'),x.vaccinated,100,1,0,x.observed_at,x.observed_at,'Ranchi','Ranchi','Jharkhand','dog',$2,x.code,x.sex,'public_dataset',x.source_metadata,'verified','exact',$3,x.h3_r8,x.sterilisation_status,x.vaccination_status,$4,x.source_record_id,x.observed_at,'day',$5,'exact_source_gps'
        from jsonb_to_recordset($1::jsonb) as x(id uuid,zone text,lat float8,lng float8,status text,size text,needs_help boolean,vaccinated boolean,sterilisation_status text,vaccination_status text,observed_at timestamptz,h3_r8 text,code text,sex text,source_record_id text,source_metadata jsonb)
        on conflict (data_source_id,source_record_id) where data_source_id is not null and source_record_id is not null
        do update set last_seen=excluded.last_seen,status=excluded.status,needs_help=excluded.needs_help,sterilised=excluded.sterilised,vaccinated=excluded.vaccinated,sterilisation_status=excluded.sterilisation_status,vaccination_status=excluded.vaccination_status,source_metadata=excluded.source_metadata,importer_version=excluded.importer_version,h3_r8=excluded.h3_r8`, [JSON.stringify(group), org.id, batch.id, src.id, version]);
    }
    for (const group of chunks(wards, 100)) {
      await db.query(`insert into atlas_area_metrics (data_source_id,reporting_org_id,source_record_id,state,district,city,area_level,area_code,area_name,centroid_lat,centroid_lng,observed_from,observed_to,census_year,observed_individuals,male_count,female_count,puppy_count,sterilised_count,sterilisation_percent,vaccinated_count,vaccination_percent,treatment_count,methodology,geographic_precision,extra_metrics,publication_status,importer_version)
        select $2,$3,'ward:'||x.ward,'Jharkhand','Ranchi','Ranchi','ward',x.ward,'Ward '||x.ward,x.centroid_lat,x.centroid_lng,'2014-12-05','2015-04-15',2015,x.n,x.male,x.female,x.puppy,x.sterilised,x.sterilisation_percent,x.vaccinated,x.vaccination_percent,x.health,'Complete count of validated free-roaming vaccination records with original GPS; centroid is the mean of source observations, not a ward boundary.','aggregate centroid of exact source GPS',jsonb_build_object('health_flags',x.health),'published',$4
        from jsonb_to_recordset($1::jsonb) as x(ward text,n int,male int,female int,puppy int,sterilised int,vaccinated int,health int,centroid_lat float8,centroid_lng float8,sterilisation_percent numeric,vaccination_percent numeric)
        on conflict (data_source_id,source_record_id) do update set observed_individuals=excluded.observed_individuals,male_count=excluded.male_count,female_count=excluded.female_count,puppy_count=excluded.puppy_count,sterilised_count=excluded.sterilised_count,sterilisation_percent=excluded.sterilisation_percent,vaccinated_count=excluded.vaccinated_count,vaccination_percent=excluded.vaccination_percent,extra_metrics=excluded.extra_metrics,imported_at=now(),importer_version=excluded.importer_version`, [JSON.stringify(group), src.id, org.id, version]);
    }
    await db.query(`update import_rows r set imported_dog_id=d.id, decision='new' from dogs d where r.batch_id=$1 and d.data_source_id=$2 and d.source_record_id=r.normalized->>'source_record_id'`, [batch.id, src.id]);
    await db.query(`update import_batches set status='imported',rows_imported=$2,rows_needing_review=0,completed_at=now() where id=$1`, [batch.id, dogs.length]);
  }
  await db.query("commit");
  console.log(`${publish ? "Published" : "Staged"} ${dogs.length} validated profiles; ${wards.length} ward coverage rows.`);
} catch (error) {
  await db.query("rollback");
  throw error;
} finally {
  await db.end();
}
