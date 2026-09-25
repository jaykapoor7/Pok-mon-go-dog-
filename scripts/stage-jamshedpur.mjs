#!/usr/bin/env node
/*
 * Repeatable, staging-only adapter for the HSI/Humane World Jamshedpur data.
 *
 * The clinical table contains stable individual dog IDs. The street files
 * contain observations without stable dog IDs, so they are reduced to real
 * route-survey aggregates. Neither dataset is published because the GitHub
 * repository has no explicit raw-data licence; clinical rows also have no
 * animal-level coordinates.
 *
 *   HSI_DPM_DIR=.cache/public-atlas/HSI_DPM node scripts/stage-jamshedpur.mjs --report
 *   HSI_DPM_DIR=.cache/public-atlas/HSI_DPM node scripts/stage-jamshedpur.mjs --emit-json clinical 0 500
 *   HSI_DPM_DIR=.cache/public-atlas/HSI_DPM node scripts/stage-jamshedpur.mjs --emit-json street 0 500
 *   HSI_DPM_DIR=.cache/public-atlas/HSI_DPM DATABASE_URL=... node scripts/stage-jamshedpur.mjs --stage
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import * as XLSX from "xlsx";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = process.env.HSI_DPM_DIR || path.join(projectRoot, ".cache", "public-atlas", "HSI_DPM");
const dataDir = path.join(sourceRoot, "data");
const sourceFiles = {
  clinical: path.join(dataDir, "clinical.csv"),
  clinicalDerived: path.join(dataDir, "clinical_data.csv"),
  streetTotals: path.join(dataDir, "total_count 2.csv"),
  streetDogs: path.join(dataDir, "dog_types.csv"),
  streetBodyCondition: path.join(dataDir, "bcs.csv"),
  streetSkin: path.join(dataDir, "skin_conditions.csv"),
};
for (const file of Object.values(sourceFiles)) {
  if (!fs.existsSync(file)) throw new Error(`Missing HSI_DPM source file: ${file}`);
}

const registry = JSON.parse(fs.readFileSync(path.join(projectRoot, "data-sources", "registry.json"), "utf8"));
const source = registry.sources.find((row) => row.slug === "hsi-jamshedpur-cnvr-2013-2017");
if (!source) throw new Error("Jamshedpur source is missing from data-sources/registry.json.");

const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fileSha = (file) => sha(fs.readFileSync(file));
const clean = (value) => {
  const text = String(value ?? "").trim();
  return !text || /^NA$/i.test(text) ? null : text;
};
const asNumber = (value) => {
  const text = clean(value);
  if (text === null) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};
const asFlag = (value) => {
  if (value === 1 || value === true || /^(1|true|yes)$/i.test(String(value ?? "").trim())) return true;
  if (value === 0 || value === false || /^(0|false|no)$/i.test(String(value ?? "").trim())) return false;
  return null;
};
const isoDate = (value) => {
  const text = String(value ?? "").trim();
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const dash = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const day = slash ? Number(slash[1]) : dash ? Number(dash[3]) : null;
  const month = slash ? Number(slash[2]) : dash ? Number(dash[2]) : null;
  const year = slash ? Number(slash[3]) : dash ? Number(dash[1]) : null;
  if (day === null || month === null || year === null) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return parsed.toISOString();
};
const isoTimestamp = (value) => {
  const text = clean(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : null;
};
const readCsv = (file) => {
  const book = XLSX.read(fs.readFileSync(file), { type: "buffer", raw: true });
  return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: null, raw: true });
};
const frequency = (rows, key) => Object.fromEntries(
  [...rows.reduce((map, row) => {
    const value = clean(row[key]) ?? "<missing>";
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map())].sort((a, b) => b[1] - a[1]),
);
const dateRange = (values) => {
  const valid = values.filter(Boolean).sort();
  return { from: valid.at(0)?.slice(0, 10) ?? null, to: valid.at(-1)?.slice(0, 10) ?? null };
};
const surveyKey = (row) => `${clean(row.route_no) ?? "missing"}:${clean(row.survey_no) ?? "missing"}`;
const groupBySurvey = (rows) => rows.reduce((map, row) => {
  const key = surveyKey(row);
  const group = map.get(key) ?? [];
  group.push(row);
  map.set(key, group);
  return map;
}, new Map());
const countFlag = (rows, key, expected) => rows.filter((row) => asFlag(row[key]) === expected).length;

const clinicalRows = readCsv(sourceFiles.clinical);
const derivedClinicalRows = readCsv(sourceFiles.clinicalDerived);
if (clinicalRows.length !== derivedClinicalRows.length) {
  throw new Error(`Clinical alignment failed: ${clinicalRows.length} source rows and ${derivedClinicalRows.length} derived rows.`);
}

const alignmentKeys = ["Female", "Adult", "distemper", "rabies", "venereal_cancer", "Pregnant"];
let derivedAlignmentMismatches = 0;
for (let index = 0; index < clinicalRows.length; index++) {
  const raw = clinicalRows[index];
  const derived = derivedClinicalRows[index];
  if (clean(raw.date_in) !== clean(derived.date_in) || alignmentKeys.some((key) => asFlag(raw[key]) !== asFlag(derived[key]))) {
    derivedAlignmentMismatches++;
  }
}
if (derivedAlignmentMismatches) {
  throw new Error(`Clinical alignment failed for ${derivedAlignmentMismatches} rows; mange cannot be joined safely.`);
}

const clinical = clinicalRows.map((row, index) => {
  const id = clean(row.IDno);
  const observedAt = isoDate(row.date_in);
  const female = asFlag(row.Female);
  const adult = asFlag(row.Adult);
  const owned = asFlag(row.Owned);
  const sexAgeCode = clean(row.sex_age)?.toLowerCase() ?? "";
  const reasons = ["raw_data_license_pending", "no_original_animal_coordinates"];
  if (!id) reasons.push("missing_source_record_id");
  if (!observedAt) reasons.push("missing_or_invalid_observation_date");
  if (owned === true) reasons.push("owned_dog_not_assumed_stray");
  const normalized = {
    record_type: "individual_clinical_record",
    source_record_id: id,
    observed_at: observedAt,
    released_at: isoDate(row.date_out),
    capture_method: clean(row.get),
    sex_age_raw: clean(row.sex_age),
    sex: female === true ? "female" : female === false ? "male" : null,
    life_stage: adult === true ? "adult" : sexAgeCode.includes("pup") ? "puppy" : adult === false ? "juvenile" : null,
    female,
    adult,
    owned,
    pregnant: asFlag(row.Pregnant),
    distemper: asFlag(row.distemper),
    mange: asFlag(derivedClinicalRows[index].mange),
    suspected_rabies: asFlag(row.rabies),
    venereal_cancer: asFlag(row.venereal_cancer),
    individual_sterilisation_status: null,
    individual_vaccination_status: null,
    weight: null,
    wounds: null,
    treatment: null,
    decision: "skip",
    skip_reasons: reasons,
  };
  return {
    source_row_number: index + 2,
    source_subrecord: "clinical",
    raw_row: row,
    normalized,
    decision: "skip",
    classification: "blocked_external_individual",
    row_fingerprint: sha(`${source.slug}:clinical:${id || index + 2}`),
  };
});

const streetTotalRows = readCsv(sourceFiles.streetTotals);
const streetDogRows = readCsv(sourceFiles.streetDogs);
const streetBodyConditionRows = readCsv(sourceFiles.streetBodyCondition);
const streetSkinRows = readCsv(sourceFiles.streetSkin);
const dogsBySurvey = groupBySurvey(streetDogRows);
const bodyConditionBySurvey = groupBySurvey(streetBodyConditionRows);
const skinBySurvey = groupBySurvey(streetSkinRows);
const streetCountMismatches = [];

const street = streetTotalRows.map((row, index) => {
  const route = clean(row.routeID) ?? clean(row.route_no);
  const survey = clean(row.survey_no);
  const key = surveyKey(row);
  const dogRows = dogsBySurvey.get(key) ?? [];
  const bodyRows = bodyConditionBySurvey.get(key) ?? [];
  const skinRows = skinBySurvey.get(key) ?? [];
  const observedIndividuals = asNumber(row.total_count);
  if (dogRows.length !== observedIndividuals || bodyRows.length !== observedIndividuals || skinRows.length !== observedIndividuals) {
    streetCountMismatches.push({ key, observed_individuals: observedIndividuals, dog_rows: dogRows.length, body_condition_rows: bodyRows.length, skin_rows: skinRows.length });
  }
  const lat = asNumber(row.Lat);
  const lng = asNumber(row.Lon);
  const hasCoordinates = lat !== null && lng !== null && lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98;
  const reasons = ["raw_data_license_pending", "aggregate_observations_without_stable_dog_ids"];
  if (!route || !survey) reasons.push("missing_route_or_survey_id");
  if (!isoTimestamp(row["survey.starting"]) && !isoDate(row.Date)) reasons.push("missing_or_invalid_observation_date");
  if (!hasCoordinates) reasons.push("missing_or_invalid_route_coordinates");
  const bodyConditionCounts = Object.fromEntries(["C1", "C2", "C3", "C4", "C5"].map((code) => [code, bodyRows.filter((item) => clean(item.bcs) === code).length]));
  const sterilisedCount = countFlag(dogRows, "Neutered", true);
  const normalized = {
    record_type: "route_survey_aggregate",
    source_record_id: route && survey ? `route:${route}:survey:${survey}` : null,
    route_id: route,
    route_number: clean(row.route_no),
    survey_number: survey,
    observed_at: isoTimestamp(row["survey.starting"]) ?? isoDate(row.Date),
    observed_individuals: observedIndividuals,
    male_count: countFlag(dogRows, "Female", false),
    female_count: countFlag(dogRows, "Female", true),
    sex_unknown_count: dogRows.filter((item) => asFlag(item.Female) === null).length,
    adult_count: countFlag(dogRows, "Adult", true),
    juvenile_count: countFlag(dogRows, "Adult", false),
    sterilised_count: sterilisedCount,
    vaccinated_at_least_once_count: sterilisedCount,
    lactating_female_count: countFlag(dogRows, "Lactating", true),
    visible_skin_condition_count: countFlag(skinRows, "SC", true),
    body_condition_counts: bodyConditionCounts,
    cnvr_treatment_group: asFlag(row.CNR),
    centroid_lat: hasCoordinates ? lat : null,
    centroid_lng: hasCoordinates ? lng : null,
    geographic_precision: hasCoordinates ? "source route reference point; not an animal location" : null,
    decision: "skip",
    skip_reasons: reasons,
  };
  return {
    source_row_number: index + 2,
    source_subrecord: "street_survey",
    raw_row: row,
    normalized,
    decision: "skip",
    classification: "blocked_external_aggregate",
    row_fingerprint: sha(`${source.slug}:street:${route || "missing"}:${survey || index + 2}`),
  };
});

const unexpectedStreetMismatches = streetCountMismatches.filter((row) => row.observed_individuals !== 0 || row.dog_rows !== 0 || row.body_condition_rows !== 0 || row.skin_rows !== 0);
if (unexpectedStreetMismatches.length) {
  throw new Error(`Street survey alignment failed for ${unexpectedStreetMismatches.length} non-empty route surveys.`);
}

const uniqueClinicalIds = new Set(clinical.map((row) => row.normalized.source_record_id).filter(Boolean));
const uniqueStreetIds = new Set(street.map((row) => row.normalized.source_record_id).filter(Boolean));
const repoCommit = (() => {
  try {
    return execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
})();
if (source.repository_commit && repoCommit !== source.repository_commit) {
  throw new Error(`Expected HSI_DPM commit ${source.repository_commit}, found ${repoCommit ?? "none"}.`);
}

const sourceFileReport = {
  clinical: { path: "data/clinical.csv", sha256: fileSha(sourceFiles.clinical) },
  clinical_derived: { path: "data/clinical_data.csv", sha256: fileSha(sourceFiles.clinicalDerived) },
  street_totals: { path: "data/total_count 2.csv", sha256: fileSha(sourceFiles.streetTotals) },
  street_dogs: { path: "data/dog_types.csv", sha256: fileSha(sourceFiles.streetDogs) },
  street_body_condition: { path: "data/bcs.csv", sha256: fileSha(sourceFiles.streetBodyCondition) },
  street_skin_conditions: { path: "data/skin_conditions.csv", sha256: fileSha(sourceFiles.streetSkin) },
};
const clinicalObservationDates = clinical.map((row) => row.normalized.observed_at);
const clinicalReleaseDates = clinical.map((row) => row.normalized.released_at);
const streetDates = street.map((row) => row.normalized.observed_at);
const healthKeys = ["distemper", "mange", "suspected_rabies", "venereal_cancer"];
const report = {
  source: source.slug,
  importer_version: source.importer_version,
  generated_at: new Date().toISOString(),
  source_repository: source.url,
  paper_url: source.paper_url,
  source_repository_commit: repoCommit,
  source_files: sourceFileReport,
  license: {
    article: "CC BY 4.0",
    repository: "No LICENSE or explicit raw-data licence found at the pinned commit",
    decision: "staging_only",
  },
  clinical: {
    discovered: clinical.length,
    staged: clinical.length,
    published_profiles: 0,
    unique_ids: uniqueClinicalIds.size,
    duplicate_ids: clinical.length - uniqueClinicalIds.size,
    observation_date_range: dateRange(clinicalObservationDates),
    release_date_range: dateRange(clinicalReleaseDates),
    valid_observation_dates: clinicalObservationDates.filter(Boolean).length,
    valid_release_dates: clinicalReleaseDates.filter(Boolean).length,
    rows_without_animal_coordinates: clinical.length,
    female_rows: clinical.filter((row) => row.normalized.sex === "female").length,
    male_rows: clinical.filter((row) => row.normalized.sex === "male").length,
    sex_unknown_rows: clinical.filter((row) => row.normalized.sex === null).length,
    adult_rows: clinical.filter((row) => row.normalized.life_stage === "adult").length,
    juvenile_rows: clinical.filter((row) => row.normalized.life_stage === "juvenile").length,
    puppy_rows: clinical.filter((row) => row.normalized.life_stage === "puppy").length,
    age_unknown_rows: clinical.filter((row) => row.normalized.life_stage === null).length,
    owned_rows: clinical.filter((row) => row.normalized.owned === true).length,
    free_roaming_or_unowned_rows: clinical.filter((row) => row.normalized.owned === false).length,
    pregnant_rows: clinical.filter((row) => row.normalized.pregnant === true).length,
    health_rows: clinical.filter((row) => healthKeys.some((key) => row.normalized[key] === true)).length,
    distemper_rows: clinical.filter((row) => row.normalized.distemper === true).length,
    mange_rows: clinical.filter((row) => row.normalized.mange === true).length,
    suspected_rabies_rows: clinical.filter((row) => row.normalized.suspected_rabies === true).length,
    venereal_cancer_rows: clinical.filter((row) => row.normalized.venereal_cancer === true).length,
    sex_age_values: frequency(clinicalRows, "sex_age"),
    capture_methods: frequency(clinicalRows, "get"),
    derived_alignment_mismatches: derivedAlignmentMismatches,
    unavailable_per_record_fields: ["animal coordinates", "weight", "in-season status", "sterilisation outcome", "vaccination outcome", "ivermectin treatment", "wounds", "images"],
    protocol_note: "The paper describes neutering, rabies vaccination and treatment as the clinic protocol, but the released row-level table does not expose those outcome fields, so StrayPaw does not infer them per dog.",
  },
  street_surveys: {
    discovered: street.length,
    staged: street.length,
    published_aggregates: 0,
    unique_route_surveys: uniqueStreetIds.size,
    routes: new Set(street.map((row) => row.normalized.route_id).filter(Boolean)).size,
    observation_date_range: dateRange(streetDates),
    with_route_reference_coordinates: street.filter((row) => row.normalized.centroid_lat !== null).length,
    zero_count_surveys: street.filter((row) => row.normalized.observed_individuals === 0).length,
    individual_observation_rows: streetDogRows.length,
    individual_observation_rows_without_stable_ids: streetDogRows.length,
    observed_dogs_sum: street.reduce((sum, row) => sum + (row.normalized.observed_individuals ?? 0), 0),
    female_observations: street.reduce((sum, row) => sum + row.normalized.female_count, 0),
    male_observations: street.reduce((sum, row) => sum + row.normalized.male_count, 0),
    juvenile_observations: street.reduce((sum, row) => sum + row.normalized.juvenile_count, 0),
    sterilised_and_vaccinated_observations: street.reduce((sum, row) => sum + row.normalized.sterilised_count, 0),
    lactating_female_observations: street.reduce((sum, row) => sum + row.normalized.lactating_female_count, 0),
    visible_skin_condition_observations: street.reduce((sum, row) => sum + row.normalized.visible_skin_condition_count, 0),
    surveys_with_detail_rows: dogsBySurvey.size,
    zero_surveys_without_detail_rows: street.filter((row) => row.normalized.observed_individuals === 0 && !dogsBySurvey.has(`${row.normalized.route_number}:${row.normalized.survey_number}`)).length,
    survey_count_alignment_mismatches: unexpectedStreetMismatches.length,
  },
  totals: {
    records_discovered: clinical.length + street.length,
    records_staged: clinical.length + street.length,
    profiles_published: 0,
    aggregate_rows_published: 0,
    skipped_from_publication: clinical.length + street.length,
    duplicates: clinical.length - uniqueClinicalIds.size + street.length - uniqueStreetIds.size,
    individual_records_with_coordinates: 0,
    aggregate_records_with_coordinates: street.filter((row) => row.normalized.centroid_lat !== null).length,
  },
  blockers: [
    "The GitHub repository has no explicit raw-data licence even though the CC BY article points to it in the data-availability statement.",
    "Clinical rows have no animal-level coordinates; route reference points cannot be assigned to individual dogs.",
    "Street observations have no stable dog IDs and may only be represented as route-survey aggregates.",
  ],
};

const reportPath = path.join(projectRoot, "reports", "public-atlas-jamshedpur.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const emitAt = process.argv.indexOf("--emit-json");
if (emitAt >= 0) {
  const kind = process.argv[emitAt + 1];
  const offset = Number(process.argv[emitAt + 2] ?? 0);
  const limit = Number(process.argv[emitAt + 3] ?? 500);
  const rows = kind === "clinical" ? clinical : kind === "street" ? street : null;
  if (!rows) throw new Error("--emit-json expects clinical or street.");
  process.stdout.write(JSON.stringify(rows.slice(offset, offset + limit)));
  process.exit(0);
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!process.argv.includes("--stage")) process.exit(0);

function env(name) {
  if (process.env[name]) return process.env[name];
  const file = path.join(projectRoot, ".env.local");
  if (!fs.existsSync(file)) return null;
  const line = fs.readFileSync(file, "utf8").split("\n").find((value) => value.trim().startsWith(`${name}=`));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}
const connectionString = env("SUPABASE_POOLER_URL") ?? env("DATABASE_URL");
if (!connectionString) throw new Error("DATABASE_URL or SUPABASE_POOLER_URL is required for --stage.");
const db = new pg.Client({ connectionString, ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false } });
const chunks = (rows, size = 250) => Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size));
const clinicalHash = sha(`${sourceFileReport.clinical.sha256}:${sourceFileReport.clinical_derived.sha256}`);
const streetHash = sha([sourceFileReport.street_totals.sha256, sourceFileReport.street_dogs.sha256, sourceFileReport.street_body_condition.sha256, sourceFileReport.street_skin_conditions.sha256].join(":"));

await db.connect();
try {
  await db.query("begin");
  const organization = (await db.query(`insert into public.ngos (name,slug,area,city,state,mission,about,website,verified,verified_at,partner_status,areas_of_work,config)
    values ('Humane World for Animals','humane-world-for-animals','Jamshedpur, Jharkhand','Jamshedpur','Jharkhand','Improving animal welfare through humane, evidence-led programmes.','Public Jamshedpur research records are attributed to Humane World for Animals, formerly Humane Society International.','https://www.humaneworld.org',true,now(),'data_source',array['Animal birth control','Anti-rabies vaccination','Research'],jsonb_build_object('directory_kind','data_source'))
    on conflict (slug) do update set name=excluded.name,area=excluded.area,city=excluded.city,state=excluded.state,website=excluded.website,config=public.ngos.config || excluded.config
    returning id`)).rows[0];
  const dataSource = (await db.query(`insert into public.data_sources (slug,source_type,source_name,source_dataset,organization_name,reporting_org_id,source_url,source_license,source_license_url,license_status,publication_status,attribution_requirements,restrictions,importer_version,geographic_precision,record_count,published_record_count,metadata,validated_at,published_at)
    values ($1,$2,'Humane World for Animals',$3,'Humane World for Animals',$4,$5,null,null,'pending','staged','Credit Humane World for Animals (formerly Humane Society International), the study authors, and the source repository.',$6,$7,'Clinical animals have no GPS; survey coordinates are route reference points, not animal locations.',$8,0,$9::jsonb,null,null)
    on conflict (slug) do update set reporting_org_id=excluded.reporting_org_id,source_name=excluded.source_name,source_dataset=excluded.source_dataset,organization_name=excluded.organization_name,source_url=excluded.source_url,source_license=null,source_license_url=null,license_status='pending',publication_status='staged',restrictions=excluded.restrictions,importer_version=excluded.importer_version,geographic_precision=excluded.geographic_precision,record_count=excluded.record_count,published_record_count=0,metadata=excluded.metadata,updated_at=now(),validated_at=null,published_at=null
    returning id`, [source.slug, source.source_type, source.dataset, organization.id, source.url, source.restrictions, source.importer_version, report.totals.records_staged, JSON.stringify({ paper_url: source.paper_url, repository_commit: repoCommit, source_files: sourceFileReport, clinical: report.clinical, street_surveys: report.street_surveys, blockers: report.blockers })])).rows[0];

  const upsertBatch = async ({ sheetName, filename, hash, rows, subrecord }) => {
    let batch = (await db.query(`select id from public.import_batches where data_source_id=$1 and sheet_name=$2 and status <> 'rolled_back' order by created_at desc limit 1`, [dataSource.id, sheetName])).rows[0];
    const mapping = JSON.stringify({ source_repository_commit: repoCommit, source_files: sourceFileReport, publication_rule: source.publication_rule });
    if (!batch) {
      batch = (await db.query(`insert into public.import_batches (ngo_id,data_source_id,source_filename,source_kind,sheet_name,mapping,status,rows_total,rows_imported,rows_needing_review,workbook_hash,preview)
        values ($1,$2,$3,'csv',$4,$5::jsonb,'reviewing',$6,0,$6,$7,$8::jsonb) returning id`, [organization.id, dataSource.id, filename, sheetName, mapping, rows.length, hash, JSON.stringify(report)])).rows[0];
    } else {
      await db.query(`update public.import_batches set ngo_id=$2,source_filename=$3,mapping=$4::jsonb,status='reviewing',rows_total=$5,rows_imported=0,rows_needing_review=$5,workbook_hash=$6,preview=$7::jsonb,completed_at=null where id=$1`, [batch.id, organization.id, filename, mapping, rows.length, hash, JSON.stringify(report)]);
    }
    for (const group of chunks(rows)) {
      await db.query(`insert into public.import_rows (batch_id,source_row_number,raw_row,normalized,decision,classification,row_fingerprint,source_subrecord)
        select $1,x.source_row_number,x.raw_row,x.normalized,x.decision,x.classification,x.row_fingerprint,x.source_subrecord
        from jsonb_to_recordset($2::jsonb) as x(source_row_number int,raw_row jsonb,normalized jsonb,decision text,classification text,row_fingerprint text,source_subrecord text)
        on conflict do nothing`, [batch.id, JSON.stringify(group)]);
      await db.query(`update public.import_rows r
        set raw_row=x.raw_row,normalized=x.normalized,decision=x.decision,classification=x.classification,row_fingerprint=x.row_fingerprint,source_subrecord=x.source_subrecord,error=null
        from jsonb_to_recordset($2::jsonb) as x(source_row_number int,raw_row jsonb,normalized jsonb,decision text,classification text,row_fingerprint text,source_subrecord text)
        where r.batch_id=$1 and r.source_row_number=x.source_row_number and coalesce(r.source_subrecord,'')=coalesce(x.source_subrecord,'')`, [batch.id, JSON.stringify(group)]);
    }
    const stagedCount = Number((await db.query(`select count(*)::int as count from public.import_rows where batch_id=$1 and source_subrecord=$2`, [batch.id, subrecord])).rows[0].count);
    if (stagedCount !== rows.length) throw new Error(`${sheetName} staging count mismatch: expected ${rows.length}, found ${stagedCount}.`);
    return batch.id;
  };

  await upsertBatch({ sheetName: "clinical", filename: "clinical.csv + clinical_data.csv", hash: clinicalHash, rows: clinical, subrecord: "clinical" });
  await upsertBatch({ sheetName: "street_surveys", filename: "total_count 2.csv + derived street tables", hash: streetHash, rows: street, subrecord: "street_survey" });
  await db.query("commit");
  process.stdout.write(`Staged ${clinical.length} clinical rows and ${street.length} route-survey aggregates; published 0 profiles and 0 map rows.\n`);
} catch (error) {
  await db.query("rollback");
  throw error;
} finally {
  await db.end();
}
