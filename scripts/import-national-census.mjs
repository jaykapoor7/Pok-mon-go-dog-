#!/usr/bin/env node
/* Official 20th Livestock Census district stray-dog importer.
 * This emits only aggregate area facts; it can never create dog profiles. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "data-sources", "registry.json"), "utf8"));
const source = registry.sources.find((row) => row.slug === "india-20th-livestock-census-stray-dogs-2019");
if (!source?.download_url || source.license_status !== "verified") throw new Error("Verified national census source is required.");
const cacheDir = path.join(root, ".cache", "public-atlas");
const reportDir = path.join(root, "reports");
fs.mkdirSync(cacheDir, { recursive: true }); fs.mkdirSync(reportDir, { recursive: true });
const file = path.join(cacheDir, "20th-livestock-census-district-stray-dogs.xlsx");
if (!fs.existsSync(file)) {
  const response = await fetch(source.download_url);
  if (!response.ok) throw new Error(`Census download failed: ${response.status}`);
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}
const bytes = fs.readFileSync(file);
const workbookHash = crypto.createHash("sha256").update(bytes).digest("hex");
const workbook = XLSX.read(bytes, { type: "buffer" });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
// The official workbook declares an erroneous XEQ column extent; the data are A:F.
sheet["!ref"] = "A1:F711";
const raw = XLSX.utils.sheet_to_json(sheet, { defval: null });
const districts = raw.filter((row) => row.ref_state_id && row.ref_district_id && row.state_name && row.district_name && Number.isFinite(Number(row.Total_stray_dog)));
const metrics = districts.map((row) => ({
  source_record_id: `district:${row.ref_state_id}:${row.ref_district_id}`,
  state: String(row.state_name).trim(), district: String(row.district_name).trim(), city: null,
  area_level: "district", area_code: String(row.ref_district_id), area_name: String(row.district_name).trim(),
  census_year: 2019, estimated_population: Number(row.Total_stray_dog), observed_individuals: null,
  methodology: "20th Livestock Census complete enumeration; official district stray-dog table.",
  geographic_precision: "district aggregate; no source point geometry",
  extra_metrics: { ref_state_id: Number(row.ref_state_id), ref_district_id: Number(row.ref_district_id) },
}));
const byState = new Map();
for (const row of metrics) {
  const item = byState.get(row.state) ?? { total: 0, districts: 0 };
  item.total += row.estimated_population; item.districts++; byState.set(row.state, item);
}
for (const [state, item] of byState) metrics.push({
  source_record_id: `state:${state.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  state, district: null, city: null, area_level: "state", area_code: null, area_name: state,
  census_year: 2019, estimated_population: item.total, observed_individuals: null,
  methodology: "Derived sum of the official 20th Livestock Census district stray-dog rows.",
  geographic_precision: "state aggregate; no source point geometry", extra_metrics: { district_count: item.districts },
});
const report = {
  source: source.slug, generated_at: new Date().toISOString(), workbook_sha256: workbookHash,
  counts: { discovered: districts.length, staged: districts.length, imported: metrics.length, skipped: raw.length - districts.length, duplicates: 0 },
  district_rows: districts.length, state_rows: byState.size,
  population_total: districts.reduce((sum, row) => sum + Number(row.Total_stray_dog), 0),
  publication_rule: source.publication_rule,
};
fs.writeFileSync(path.join(reportDir, "public-atlas-national-census.json"), JSON.stringify(report, null, 2) + "\n");
const at = process.argv.indexOf("--emit-json");
if (at >= 0) {
  const offset = Number(process.argv[at + 1] ?? 0), limit = Number(process.argv[at + 2] ?? 1000);
  process.stdout.write(JSON.stringify(metrics.slice(offset, offset + limit)));
} else console.log(JSON.stringify(report, null, 2));

