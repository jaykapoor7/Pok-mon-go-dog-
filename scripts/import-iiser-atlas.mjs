#!/usr/bin/env node
/* Normalizes two open IISER Kolkata datasets. Territory/census rows publish
 * only as aggregate facts. Resting-site dogs remain staged because the file
 * has stable identifiers and dates but no source coordinates. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportDir = path.join(root, "reports"); fs.mkdirSync(reportDir, { recursive: true });
const territoryPath = process.env.IISER_TERRITORY_FILE || "/workspace/scratch/RDH_data_1.1.xlsx";
const restingPath = process.env.IISER_RESTING_FILE || "/workspace/scratch/resting_data.csv";
if (!fs.existsSync(territoryPath) || !fs.existsSync(restingPath)) throw new Error("IISER source files are missing.");
const sha = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const territoryBook = XLSX.read(fs.readFileSync(territoryPath), { type: "buffer", cellDates: true });
const census = XLSX.utils.sheet_to_json(territoryBook.Sheets.Census_data, { defval: null });
const groups = XLSX.utils.sheet_to_json(territoryBook.Sheets.RDH, { defval: null });
const isoDay = (value) => value instanceof Date && Number.isFinite(value.valueOf()) ? value.toISOString().slice(0, 10) : null;
const slug = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const metrics = census.map((row, i) => {
  const name = String(row.location ?? `site-${i + 1}`).trim();
  return {
    source_record_id: `census:${i + 1}:${slug(name)}`, state: /orissa/i.test(name) ? "Odisha" : "West Bengal", district: null, city: null,
    area_level: "site", area_code: null, area_name: name, observed_from: isoDay(row.date), observed_to: isoDay(row.date), census_year: row.date?.getFullYear?.() ?? null,
    observed_individuals: Number(row.dogs) || 0, male_count: Number(row.male) || 0, female_count: Number(row.female) || 0, puppy_count: Number(row.pups) || 0,
    density_per_sq_km: Number.isFinite(Number(row.dogs_ha)) ? Number(row.dogs_ha) * 100 : null,
    methodology: "Two-hour spot census; each road in the survey polygon traversed once.",
    geographic_precision: "named survey polygon without released point geometry",
    extra_metrics: { habitat: row["location_type "] ?? null, area_ha: row.area, juvenile_count: row.juv, resource_score: row.res_score, resource_density_per_ha: row.res_ha },
  };
});
for (let i = 0; i < groups.length; i++) {
  const row = groups[i], name = String(row.grp_n ?? `group-${i + 1}`).trim();
  metrics.push({
    source_record_id: `group:${i + 1}:${slug(name)}:${slug(row.season)}`, state: "West Bengal", district: null, city: String(row.plc ?? "").trim() || null,
    area_level: "site", area_code: name, area_name: `${name} — ${row.season}`,
    census_year: 2024, observed_individuals: Number(row.total_no) || 0, male_count: Number(row.male) || 0, female_count: Number(row.female) || 0, puppy_count: Number(row.pup) || 0,
    methodology: "At least 30 hours of behavioural observation per dog group and reproductive season.",
    geographic_precision: "named dog-group territory without released point geometry",
    extra_metrics: { habitat: row.plc_cat, season: row.season, territory_ha: row.ter_ha, juvenile_count: row.juvenile, resource_heterogeneity: row.het_g, resource_patch_richness: row.patch_r, resource_score: row.res_score, average_resource_distance_m: row.avg_dist },
  });
}
const restingBook = XLSX.read(fs.readFileSync(restingPath), { type: "buffer", raw: true });
const resting = XLSX.utils.sheet_to_json(restingBook.Sheets[restingBook.SheetNames[0]], { defval: null });
const parseDate = (value) => {
  const match = String(value ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/); if (!match) return null;
  return `20${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
};
const individuals = new Map();
for (let i = 0; i < resting.length; i++) {
  const row = resting[i], id = String(row.unq_id ?? "").trim(); if (!id) continue;
  const date = parseDate(row.recording_time); const prior = individuals.get(id);
  if (!prior) individuals.set(id, { source_row_number: i + 2, source_record_id: id, group_id: row.group_id, sex: row.sex, life_stage: row.life_stage, first_seen: date, last_seen: date, observation_count: 1 });
  else { prior.observation_count++; if (date && (!prior.first_seen || date < prior.first_seen)) prior.first_seen = date; if (date && (!prior.last_seen || date > prior.last_seen)) prior.last_seen = date; }
}
const staging = [...individuals.values()].map((row) => ({
  source_row_number: row.source_row_number, raw_row: row,
  normalized: { ...row, decision: "skip", skip_reasons: ["no_original_animal_coordinates"] },
  decision: "skip", row_fingerprint: sha(`iiser-kolkata-resting-sites-2019-2022:${row.source_record_id}`),
}));
const report = {
  generated_at: new Date().toISOString(), territory: { census_rows: census.length, group_season_rows: groups.length, aggregate_rows: metrics.length },
  resting: { observations: resting.length, source_identifiers: staging.length, groups: new Set(resting.map((row) => row.group_id)).size, published_profiles: 0, blocker: "No source coordinates" },
};
fs.writeFileSync(path.join(reportDir, "public-atlas-iiser.json"), JSON.stringify(report, null, 2) + "\n");
const at = process.argv.indexOf("--emit-json");
if (at >= 0) {
  const kind = process.argv[at + 1], offset = Number(process.argv[at + 2] ?? 0), limit = Number(process.argv[at + 3] ?? 1000);
  const rows = kind === "metrics" ? metrics : kind === "staging" ? staging : null; if (!rows) throw new Error("Use metrics or staging.");
  process.stdout.write(JSON.stringify(rows.slice(offset, offset + limit)));
} else console.log(JSON.stringify(report, null, 2));
