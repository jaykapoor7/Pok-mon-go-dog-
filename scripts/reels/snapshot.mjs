#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   Snapshot the public record a reel is cut from.

   Reels never carry hand-typed figures. This reads the same public city
   index the India map reads (/api/spatial?kind=cities) and the India
   outline the map is masked with, and writes one dated JSON file per
   run. A reel states the date of its snapshot on its end card, so a
   figure in a video can always be traced to when it was true.

   usage: node scripts/reels/snapshot.mjs [--base https://www.straypaw.org]
   ════════════════════════════════════════════════════════════════════ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "https://www.straypaw.org").replace(/\/$/, "");

/* The atlas's own evidence kinds (AtlasRegister.cityEvidence / kindOf). */
const kindOf = (city, cells) =>
  city === "Jamshedpur" ? "clinical" : city === "Ranchi" ? "campaign"
    : city === "Coimbatore" || city === "Lucknow" ? "rescue"
      : city === "Hyderabad" || city === "Delhi" ? "photo" : "register";

const res = await fetch(`${BASE}/api/spatial?kind=cities&v=4`);
if (!res.ok) { console.error(`snapshot: ${BASE} answered ${res.status}`); process.exit(1); }
const { cities = [] } = await res.json();
const rows = cities
  .filter((c) => typeof c.lat === "number" && typeof c.lng === "number")
  .map((c) => ({ name: c.city, state: c.state ?? "", kind: kindOf(c.city, c.cells), animals: c.animals ?? 0, sterilised: c.sterilised ?? 0, vaccinated: c.vaccinated ?? 0, cells: c.cells ?? 0, lat: c.lat, lng: c.lng }))
  .sort((a, b) => b.animals - a.animals);

/* India's outline, from the map's own mask: the holes of the world polygon. */
const mask = JSON.parse(fs.readFileSync(path.join(ROOT, "public/geo/india-mask.json"), "utf8"));
const geom = mask.type === "FeatureCollection" ? mask.features[0].geometry : mask.type === "Feature" ? mask.geometry : mask;
const polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
const india = polys.flatMap((p) => p.slice(1)).filter((r) => r.length > 40);

const snap = {
  fetchedAt: new Date().toISOString(),
  source: `${BASE}/api/spatial?kind=cities`,
  totals: {
    cities: rows.length,
    animals: rows.reduce((s, c) => s + c.animals, 0),
    streetProfiles: rows.filter((c) => c.kind !== "clinical").reduce((s, c) => s + c.animals, 0),
    clinical: rows.filter((c) => c.kind === "clinical").reduce((s, c) => s + c.animals, 0),
  },
  cities: rows,
  india,
};
const out = path.join(HERE, "data", "snapshot.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(snap));
console.log(`snapshot: ${rows.length} cities, ${snap.totals.animals.toLocaleString("en-IN")} records (${snap.totals.clinical.toLocaleString("en-IN")} clinical register), outline ${india.length} rings → ${path.relative(ROOT, out)}`);
