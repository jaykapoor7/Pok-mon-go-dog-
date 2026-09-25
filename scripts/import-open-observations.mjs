#!/usr/bin/env node
/*
 * Normalizes open public observation sources without treating a domestic-dog
 * occurrence as proof of a community dog. The default is validation only.
 * `--emit-json staging|dogs` is used by the production publisher so the same
 * normalization and deduplication logic drives staging and publication.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { latLngToCell } from "h3-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = path.join(root, ".cache", "public-atlas");
const reports = path.join(root, "reports");
fs.mkdirSync(cache, { recursive: true }); fs.mkdirSync(reports, { recursive: true });
const key = process.argv[2];
const registry = JSON.parse(fs.readFileSync(path.join(root, "data-sources", "registry.json"), "utf8"));
const source = registry.sources.find((row) => row.slug === ({ inaturalist: "inaturalist-india-domestic-dog-observations", commons: "wikimedia-commons-india-community-dogs" })[key]);
if (!source) throw new Error("Source must be inaturalist or commons.");
const sha = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const uuid = (value) => { const h = sha(value); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const clean = (value) => String(value ?? "").trim();
const openLicense = (value) => ["cc0", "cc-by", "cc-by-sa"].includes(clean(value).toLowerCase());
const validIndia = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98;
const stripHtml = (value) => clean(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const largePhoto = (url) => clean(url).replace(/\/(square|small|medium)\.(jpe?g|png)$/i, "/large.$2");
const inatPlaces = {
  "187143803": ["Alappuzha", "Alappuzha", "Kerala"], "201615072": ["New Delhi", "New Delhi", "Delhi"],
  "201615344": ["New Delhi", "New Delhi", "Delhi"], "259490094": ["Jabalpur", "Jabalpur", "Madhya Pradesh"],
  "293699078": ["Vijaynagar", "Sabar Kantha", "Gujarat"], "367604243": ["Secunderabad", "Hyderabad", "Telangana"],
};
const commonsPlaces = {
  "23467884": ["Varanasi", "Varanasi", "Uttar Pradesh"], "48048727": ["Karnal", "Karnal", "Haryana"],
  "74943708": ["Gangtok", "East Sikkim", "Sikkim"], "99908778": ["Leh", "Leh", "Ladakh"],
  "148640232": ["Delhi", "Central Delhi", "Delhi"], "148640233": ["Gurugram", "Gurugram", "Haryana"],
  "148640239": ["Delhi", "Central Delhi", "Delhi"], "148640244": ["Delhi", "South East Delhi", "Delhi"],
  "148640245": ["Delhi", "Central Delhi", "Delhi"], "148640247": ["Delhi", "Central Delhi", "Delhi"],
  "148640251": ["Delhi", "Central Delhi", "Delhi"], "148640252": ["Delhi", "Central Delhi", "Delhi"],
};

async function loadInaturalist() {
  const file = path.join(cache, "inaturalist-open.json");
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const researchCopy = "/tmp/straypaw-data/apis/inat-open.json";
  if (fs.existsSync(researchCopy)) return JSON.parse(fs.readFileSync(researchCopy, "utf8"));
  const results = [];
  for (let page = 1; page <= 2; page++) {
    const url = new URL("https://api.inaturalist.org/v1/observations");
    Object.entries({ taxon_id: "47144", place_id: "6681", photos: "true", geo: "true", captive: "false", license: "cc0,cc-by,cc-by-sa", photo_license: "cc0,cc-by,cc-by-sa", per_page: "200", page: String(page), order_by: "observed_on", order: "desc" }).forEach(([k,v]) => url.searchParams.set(k,v));
    const response = await fetch(url); if (!response.ok) throw new Error(`iNaturalist ${response.status}`);
    const body = await response.json(); results.push(...body.results);
    if (results.length >= body.total_results) break;
  }
  const payload = { total_results: results.length, results };
  fs.writeFileSync(file, JSON.stringify(payload)); return payload;
}

async function loadCommons() {
  const file = path.join(cache, "commons-open-expanded.json");
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const searches = ['"street dog" India', '"stray dog" India', '"street dogs" India', '"free-ranging dog" India', '"Indian pariah dog"'];
  const pages = new Map();
  for (const search of searches) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    Object.entries({ action: "query", generator: "search", gsrsearch: search, gsrnamespace: "6", gsrlimit: "500", prop: "coordinates|imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1200", format: "json", origin: "*" }).forEach(([k,v]) => url.searchParams.set(k,v));
    const response = await fetch(url, { headers: { "user-agent": "StrayPaw public-atlas importer/1.1 (https://straypaw.org)" } });
    if (!response.ok) throw new Error(`Commons ${response.status}`);
    const body = await response.json();
    for (const page of Object.values(body.query?.pages ?? {})) pages.set(String(page.pageid), page);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  const payload = { query: { pages: Object.fromEntries([...pages].map(([id, page]) => [id, page])) } };
  fs.writeFileSync(file, JSON.stringify(payload)); return payload;
}

const staging = [], dogs = [];
if (key === "inaturalist") {
  const payload = await loadInaturalist();
  for (let i = 0; i < payload.results.length; i++) {
    const row = payload.results[i], id = clean(row.id), description = clean(row.description);
    const coords = row.geojson?.coordinates ?? []; const lng = Number(coords[0]), lat = Number(coords[1]);
    const photo = (row.photos ?? []).find((p) => openLicense(p.license_code));
    const explicit = /\b(stray dog|feral dog|free[- ]?ranging dog|free dog|community dog|street dog)\b/i.test(description) && !/[?]|\bpet\b|\bowned\b/i.test(description);
    const reasons = [];
    if (!id) reasons.push("missing_observation_id"); if (!validIndia(lat,lng)) reasons.push("invalid_or_missing_gps");
    if (!row.observed_on) reasons.push("missing_observation_date"); if (!openLicense(row.license_code)) reasons.push("observation_license_not_open");
    if (!photo) reasons.push("no_open_licensed_photo"); if (!explicit) reasons.push("not_explicitly_identified_as_free_roaming");
    const decision = reasons.length ? "skip" : "new";
    const normalized = { source_record_id: id, observed_at: row.time_observed_at ?? row.observed_on ?? null, lat, lng, locality: row.place_guess ?? null, description: description || null, observation_license: row.license_code ?? null, photo_id: photo?.id ?? null, photo_license: photo?.license_code ?? null, decision, skip_reasons: reasons };
    staging.push({ sourceRowNumber: i + 1, fingerprint: sha(`${source.slug}:${id}`), normalized, decision });
    if (decision !== "new") continue;
    const observedAt = row.time_observed_at ?? `${row.observed_on}T12:00:00Z`;
    const [city, district, state] = inatPlaces[id] ?? [null, null, null];
    dogs.push({ id: uuid(`${source.slug}:${id}`), source_record_id: id, observed_at: observedAt, lat, lng, h3_r8: latLngToCell(lat,lng,8), zone: row.place_guess ?? "India", city, district, state, code: `iNat ${id}`, external_image_url: largePhoto(photo.url), source_metadata: { source_type: source.source_type, source_name: source.organization, source_dataset: source.dataset, source_record_id: id, source_url: row.uri, source_license: row.license_code, source_license_url: `https://creativecommons.org/licenses/${row.license_code === "cc0" ? "zero/1.0" : `${row.license_code.replace("cc-", "")}/4.0`}/`, original_observed_at: observedAt, imported_at: new Date().toISOString(), importer_version: "inaturalist-v2", photo_source_url: row.uri, photo_creator: row.user?.name || row.user?.login || null, photo_license: photo.license_code, external_image_url: largePhoto(photo.url), geographic_precision: row.positional_accuracy ? `source GPS; ${row.positional_accuracy}m stated accuracy` : "exact source GPS", original: { description, place_guess: row.place_guess, observation_id: row.id, photo_id: photo.id, attribution: photo.attribution } } });
  }
} else {
  const payload = await loadCommons(); const pages = Object.values(payload.query?.pages ?? {});
  for (let i = 0; i < pages.length; i++) {
    const row = pages[i], info = row.imageinfo?.[0] ?? {}, meta = info.extmetadata ?? {}, point = row.coordinates?.[0];
    const id = clean(row.pageid), license = clean(meta.LicenseShortName?.value), title = clean(row.title), lat = Number(point?.lat), lng = Number(point?.lon);
    const reasons = [];
    if (!/\b(street dog|street dogs|street puppies|stray dog|stray dogs|free[- ]ranging dog)\b/i.test(title) || /\bpet\b/i.test(title)) reasons.push("subject_not_explicitly_street_dog"); if (!validIndia(lat,lng)) reasons.push("invalid_or_missing_gps");
    if (!/^CC(0| BY| BY-SA)/i.test(license)) reasons.push("image_license_not_open"); if (!info.url) reasons.push("missing_image_url");
    const observed = clean(meta.DateTimeOriginal?.value || meta.DateTime?.value); if (!observed || !/\b(19|20)\d{2}\b/.test(observed)) reasons.push("missing_or_unparseable_observation_date");
    const decision = reasons.length ? "skip" : "new";
    const normalized = { source_record_id: id, title, observed_at: observed || null, lat, lng, photo_license: license || null, decision, skip_reasons: reasons };
    staging.push({ sourceRowNumber: i + 1, fingerprint: sha(`${source.slug}:${id}`), normalized, decision });
    if (decision !== "new") continue;
    const sourceUrl = `https://commons.wikimedia.org/?curid=${id}`, creator = stripHtml(meta.Artist?.value);
    const parsed = new Date(observed.includes("T") ? observed : observed.replace(" ", "T") + "Z");
    const observedAt = Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : `${observed.slice(0,10)}T12:00:00Z`;
    const [city, district, state] = commonsPlaces[id] ?? [null, null, null];
    dogs.push({ id: uuid(`${source.slug}:${id}`), source_record_id: id, observed_at: observedAt, lat, lng, h3_r8: latLngToCell(lat,lng,8), zone: title.replace(/^File:/i, "").replace(/\.[^.]+$/, ""), city, district, state, code: `Commons ${id}`, external_image_url: info.thumburl || info.url, source_metadata: { source_type: source.source_type, source_name: source.organization, source_dataset: source.dataset, source_record_id: id, source_url: sourceUrl, source_license: license, source_license_url: clean(meta.LicenseUrl?.value) || null, original_observed_at: observedAt, imported_at: new Date().toISOString(), importer_version: "commons-v2", photo_source_url: sourceUrl, photo_creator: creator || null, photo_license: license, external_image_url: info.thumburl || info.url, geographic_precision: "exact source GPS", original: { title, pageid: row.pageid } } });
  }
}

const report = { source: source.slug, generated_at: new Date().toISOString(), counts: { discovered: staging.length, staged: staging.length, imported: dogs.length, skipped: staging.length - dogs.length, duplicates: 0, with_photos: dogs.length, with_coordinates: staging.filter((r) => validIndia(r.normalized.lat, r.normalized.lng)).length, with_abc_status: 0, with_vaccination_status: 0, with_health_data: 0 }, publication_rule: source.notes };
fs.writeFileSync(path.join(reports, `public-atlas-${key}.json`), JSON.stringify(report, null, 2) + "\n");
const at = process.argv.indexOf("--emit-json");
if (at >= 0) {
  const kind = process.argv[at + 1], offset = Number(process.argv[at + 2] ?? 0), limit = Number(process.argv[at + 3] ?? 500);
  const rows = kind === "dogs" ? dogs : kind === "staging" ? staging : null; if (!rows) throw new Error("Use --emit-json dogs|staging.");
  process.stdout.write(JSON.stringify(rows.slice(offset, offset + limit)));
} else console.log(JSON.stringify(report, null, 2));
