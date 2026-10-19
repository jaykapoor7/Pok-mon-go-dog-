/* ════════════════════════════════════════════════════════════════════
   Bakes the real geography the homepage mural is painted on.

   One neighbourhood (Ganapathy, Coimbatore, a locality with requests on
   the public record), read from OpenStreetMap vector tiles (OpenFreeMap)
   and stored in z16 Web Mercator pixels relative to its centre, so the
   painting and the live map share one coordinate system and the painted
   streets can resolve exactly onto the map's roads.

   node scripts/bake-mural.mjs  →  public/mural/ganapathy.json
   ════════════════════════════════════════════════════════════════════ */

import { writeFileSync, mkdirSync } from "node:fs";
import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader as Pbf } from "pbf";

const CENTRE = [76.9746, 11.0389], NAME = "Ganapathy", CITY = "Coimbatore";
const Z = 16, HALF = 720, TZ = 14;
const TILE = 512, WORLD = (z) => 256 * 2 ** z;

const merc = ([lng, lat], z) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return [((lng + 180) / 360) * WORLD(z), (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD(z)];
};
const [cx, cy] = merc(CENTRE, Z);
const local = ([lng, lat]) => { const [x, y] = merc([lng, lat], Z); return [x - cx, y - cy]; };

/* Douglas-Peucker in local pixels */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const inside = ([x, y], m = 0) => Math.abs(x) <= HALF + m && Math.abs(y) <= HALF + m;
/* clip a polyline to the window (keeps runs that touch it, with one point of margin) */
function clipLine(pts) {
  const out = []; let run = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], near = inside(p, 60) || (pts[i + 1] && inside(pts[i + 1], 60)) || (pts[i - 1] && inside(pts[i - 1], 60));
    if (near) run.push(p); else if (run.length) { if (run.length > 1) out.push(run); run = []; }
  }
  if (run.length > 1) out.push(run);
  return out;
}
const q = (pts) => pts.map(([x, y]) => [Math.round(x * 2) / 2, Math.round(y * 2) / 2]);

/* tiles covering the window */
const tl = merc(CENTRE, TZ), span = HALF / 4 + 40; // z16 px → z14 px
const T = 2 ** TZ;
const tx0 = Math.floor((tl[0] - span) / 256), tx1 = Math.floor((tl[0] + span) / 256);
const ty0 = Math.floor((tl[1] - span) / 256), ty1 = Math.floor((tl[1] + span) / 256);
const tj = await (await fetch("https://tiles.openfreemap.org/planet")).json();
const url = tj.tiles[0];

const roads = [], water = [], rivers = [], parks = [], buildings = [], pois = [], places = [], rail = [];
for (let x = tx0; x <= tx1; x++) for (let y = ty0; y <= ty1; y++) {
  const buf = Buffer.from(await (await fetch(url.replace("{z}", TZ).replace("{x}", x).replace("{y}", y))).arrayBuffer());
  const vt = new VectorTile(new Pbf(buf));
  const toLngLat = (f) => f.toGeoJSON(x, y, TZ);
  const each = (layer, fn) => { const l = vt.layers[layer]; if (!l) return; for (let i = 0; i < l.length; i++) fn(l.feature(i)); };
  const lines = (g) => (g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []);
  const polys = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
  each("transportation", (f) => {
    const c = f.properties.class, g = toLngLat(f).geometry;
    const rank = { motorway: 4, trunk: 4, primary: 3, secondary: 3, tertiary: 2, minor: 1 }[c];
    if (c === "rail" || c === "transit") { for (const l of lines(g)) for (const r of clipLine(simplify(l.map(local), 1))) rail.push(q(r)); return; }
    if (rank === undefined) return;
    for (const l of lines(g)) for (const r of clipLine(simplify(l.map(local), 0.8))) roads.push({ k: rank, p: q(r) });
  });
  each("water", (f) => { for (const p of polys(toLngLat(f).geometry)) { const r = simplify(p[0].map(local), 1.2); if (r.some((pt) => inside(pt, 200))) water.push(q(r)); } });
  each("waterway", (f) => { const g = toLngLat(f).geometry; for (const l of lines(g)) for (const r of clipLine(simplify(l.map(local), 1))) rivers.push({ k: f.properties.class === "river" ? 2 : f.properties.class === "canal" ? 1 : 0, p: q(r) }); });
  each("park", (f) => { for (const p of polys(toLngLat(f).geometry)) { const r = simplify(p[0].map(local), 1.5); if (r.some((pt) => inside(pt, 100))) parks.push(q(r)); } });
  each("landcover", (f) => { if (!["wood", "grass", "farmland", "scrub"].includes(f.properties.class)) return; for (const p of polys(toLngLat(f).geometry)) { const r = simplify(p[0].map(local), 2); if (r.some((pt) => inside(pt, 100))) parks.push(q(r)); } });
  each("building", (f) => {
    for (const p of polys(toLngLat(f).geometry)) {
      const r = p[0].map(local); let ax = 0, ay = 0, A = 0;
      for (let i = 0; i < r.length - 1; i++) { const c = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; A += c; ax += (r[i][0] + r[i + 1][0]) * c; ay += (r[i][1] + r[i + 1][1]) * c; }
      A /= 2; if (Math.abs(A) < 1) continue;
      const c = [ax / (6 * A), ay / (6 * A)]; if (inside(c, 20)) buildings.push([Math.round(c[0]), Math.round(c[1]), Math.round(Math.abs(A))]);
    }
  });
  each("poi", (f) => {
    const g = toLngLat(f).geometry; if (g.type !== "Point") return;
    const p = local(g.coordinates); if (!inside(p)) return;
    const cls = f.properties.class, sub = f.properties.subclass;
    const kind = cls === "place_of_worship" ? (sub === "hindu" || f.properties.religion === "hindu" ? "temple" : "worship") : sub === "veterinary" ? "vet" : cls === "hospital" || sub === "clinic" || sub === "doctors" ? "clinic" : cls === "school" || cls === "college" ? "school" : cls === "park" ? "park" : cls === "grocery" || cls === "shop" || cls === "convenience" || cls === "bakery" ? "shop" : cls === "town_hall" ? "office" : null;
    if (kind) pois.push({ k: kind, p: [Math.round(p[0]), Math.round(p[1])], n: f.properties["name:en"] || f.properties.name_en || f.properties.name || "" });
  });
  each("place", (f) => {
    const g = toLngLat(f).geometry; if (g.type !== "Point") return;
    const p = local(g.coordinates); if (!inside(p, 200)) return;
    const n = f.properties["name:en"] || f.properties.name_en || f.properties.name; if (!n || !/^[\x20-\x7e]+$/.test(n)) return;
    places.push({ n, p: [Math.round(p[0]), Math.round(p[1])], k: f.properties.class });
  });
}

/* one building per 30px cell, the largest: where the painting puts a house, a real building stands */
const best = new Map();
for (const b of buildings) { const k = `${Math.floor(b[0] / 30)},${Math.floor(b[1] / 30)}`; const o = best.get(k); if (!o || o[2] < b[2]) best.set(k, b); }
const bld = [...best.values()];
const uniq = (arr, key) => { const s = new Set(); return arr.filter((a) => { const k = key(a); if (s.has(k)) return false; s.add(k); return true; }); };

const out = {
  name: NAME, city: CITY, centre: CENTRE, zoom: Z, half: HALF,
  source: "OpenStreetMap contributors, via OpenFreeMap",
  roads: roads.sort((a, b) => a.k - b.k),
  rail, water, rivers, parks,
  buildings: bld,
  pois: uniq(pois, (p) => `${p.k}${p.p}`),
  places: uniq(places, (p) => p.n),
};
mkdirSync("public/mural", { recursive: true });
const json = JSON.stringify(out);
writeFileSync("public/mural/ganapathy.json", json);
console.log({ roads: roads.length, rail: rail.length, water: water.length, rivers: rivers.length, parks: parks.length, buildings: bld.length, pois: out.pois.length, places: out.places.map((p) => p.n), kb: Math.round(json.length / 1024) });
