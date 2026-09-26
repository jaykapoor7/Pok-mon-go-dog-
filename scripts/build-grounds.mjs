#!/usr/bin/env node
/*
 * The grounds: backgrounds drawn from the record itself.
 *
 * No screen of StrayPaw sits on a bare colour, and no two kinds of screen
 * sit on the same ground. Each ground is a real city's record, read from
 * the public spatial view (one point per animal at its H3 cell centre,
 * never finer), drawn in the map's own language and given one slow motion
 * that means something:
 *
 *   cells     the recorded honeycomb in sequential blue; a few cells light
 *             in flame, the way new reports arrive          (residents)
 *   survey    the density field as contours, with locality names and
 *             coordinate ticks; one contour is traced like a survey line
 *                                                            (pages, educators, feeders)
 *   coverage  cells in ink weight with the unmapped edge dashed; the edge
 *             breathes                                       (municipalities, insights)
 *   console   contours with the busiest cells; flame cells pulse like
 *             open work                                      (NGO workspace)
 *   night     contours on the night ground, one light per recorded place,
 *             twinkling                                      (night heroes, closes)
 *
 * The motion lives inside each SVG (CSS keyframes on a handful of
 * elements, opacity and dash only) and stops under prefers-reduced-motion.
 * Output: public/grounds/*.svg. No screen computes anything; no row
 * reaches a browser.
 *
 * Usage: node scripts/build-grounds.mjs   (reads NEXT_PUBLIC_SUPABASE_URL
 * and NEXT_PUBLIC_SUPABASE_ANON_KEY from the environment or .env.local)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contours } from "d3-contour";
import { cellToBoundary, cellToLatLng, gridDisk } from "h3-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = (k) => process.env[k] ?? (fs.existsSync(path.join(root, ".env.local")) ? fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n").find((l) => l.startsWith(`${k}=`))?.slice(k.length + 1).trim() : undefined);
const URL_ = env("NEXT_PUBLIC_SUPABASE_URL"), KEY = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!URL_ || !KEY) { console.error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required."); process.exit(1); }

/* The map's colours (tokens.css). */
const INK = "#0b1e3d", CREAM = "#efe7da", FLAME = "#f05b40", SKY = "#8fb7ff";
const SEQ = ["#c8d4f0", "#93aee9", "#5b82dc", "#2457ce", "#16398f"];

/* Every animal's cell and written place, from the public view. */
const rows = [];
for (let from = 0; ; from += 1000) {
  const r = await fetch(`${URL_}/rest/v1/public_spatial_animals?select=h3_r8,city,zone&h3_r8=not.is.null`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` } });
  const page = await r.json();
  if (!Array.isArray(page)) throw new Error(JSON.stringify(page));
  rows.push(...page);
  if (page.length < 1000) break;
}
const cities = new Map();
for (const r of rows) {
  if (!r.city) continue;
  const c = cities.get(r.city) ?? cities.set(r.city, { name: r.city, points: [], cells: new Map(), zones: new Map() }).get(r.city);
  c.points.push(cellToLatLng(r.h3_r8));
  c.cells.set(r.h3_r8, (c.cells.get(r.h3_r8) ?? 0) + 1);
  /* Written as the site writes it: "Ward Ward 37" is "Ward 37". */
  const z = String(r.zone ?? "").replace(/\s*\(as recorded\)$/i, "").replace(/\b(ward)\s+ward\b/gi, "$1").trim();
  if (z && z.length < 28 && !/^\d/.test(z)) { const zz = c.zones.get(z) ?? { n: 0, lat: 0, lng: 0 }; const [la, ln] = cellToLatLng(r.h3_r8); zz.n++; zz.lat += la; zz.lng += ln; c.zones.set(z, zz); }
}
const ranked = [...cities.values()].sort((a, b) => b.points.length - a.points.length);
console.error(`${rows.length} animals; deepest: ${ranked.slice(0, 3).map((c) => `${c.name} ${c.points.length}`).join(", ")}`);

/* A frame over a city: the record's middle, cropped by zoom (<1 bleeds). */
function frame(city, W, H, zoom, shift = [0, 0]) {
  const lats = city.points.map((p) => p[0]).sort((a, b) => a - b), lngs = city.points.map((p) => p[1]).sort((a, b) => a - b);
  const q = (v, f) => v[Math.floor(f * (v.length - 1))];
  const s0 = q(lats, 0.03), n0 = q(lats, 0.97), w0 = q(lngs, 0.03), e0 = q(lngs, 0.97);
  const k = Math.cos(((s0 + n0) / 2) * Math.PI / 180);
  let spanX = (e0 - w0) * k * zoom, spanY = (n0 - s0) * zoom;
  if (spanX / spanY < W / H) spanX = spanY * (W / H); else spanY = spanX * (H / W);
  const cx = (w0 + e0) / 2 + shift[0] * (e0 - w0), cy = (s0 + n0) / 2 + shift[1] * (n0 - s0);
  const w = cx - spanX / k / 2, e = cx + spanX / k / 2, s = cy - spanY / 2, n = cy + spanY / 2;
  const p = (lat, lng) => [((lng - w) / (e - w)) * W, ((n - lat) / (n - s)) * H];
  return { w, e, s, n, k, W, H, p, inside: (lat, lng) => lat > s && lat < n && lng > w && lng < e };
}
const f1 = (v) => v.toFixed(1);
const hexPath = (h, fr) => "M" + cellToBoundary(h).map(([la, ln]) => fr.p(la, ln).map(f1).join(" ")).join("L") + "Z";

/* The density field, traced into contour rings. */
function contourPaths(city, fr, levels) {
  const gw = 240, gh = Math.round(240 * fr.H / fr.W), grid = new Float64Array(gw * gh);
  const bw = 0.9 / 111.32;
  const sig = (bw * gw) / ((fr.e - fr.w) * fr.k), sigY = (bw * gh) / (fr.n - fr.s);
  const r = Math.ceil(3 * Math.max(sig, sigY));
  for (const [lat, lng] of city.points) {
    const px = ((lng - fr.w) / (fr.e - fr.w)) * gw, py = ((fr.n - lat) / (fr.n - fr.s)) * gh;
    for (let y = Math.max(0, Math.floor(py - r)); y < Math.min(gh, py + r); y++)
      for (let x = Math.max(0, Math.floor(px - r)); x < Math.min(gw, px + r); x++)
        grid[y * gw + x] += Math.exp(-(((x - px) / sig) ** 2 + ((y - py) / sigY) ** 2) / 2);
  }
  const max = Math.max(...grid);
  const thresholds = Array.from({ length: levels }, (_, i) => max * Math.pow(0.002, 1 - (i + 0.5) / levels));
  const sx = fr.W / gw, sy = fr.H / gh;
  return contours().size([gw, gh]).smooth(true).thresholds(thresholds)(Array.from(grid)).map((c, i) => ({
    i, d: c.coordinates.flatMap((poly) => poly.map((ring) => "M" + ring.map(([x, y]) => `${f1(x * sx)} ${f1(y * sy)}`).join("L") + "Z")).join(""),
  })).filter((c) => c.d);
}
const contourLayer = (paths, levels, ink, lo, hi, cls = () => "") => paths.map(({ i, d }) => {
  const t = (i + 1) / levels;
  return `<path class="${cls(i)}" d="${d}" fill="none" stroke="${ink}" stroke-opacity="${(lo + t * (hi - lo)).toFixed(3)}" stroke-width="${(0.7 + t * 0.8).toFixed(2)}"/>`;
}).join("");

/* Cells in the frame, busiest first. */
const cellsIn = (city, fr) => [...city.cells].filter(([h]) => { const [la, ln] = cellToLatLng(h); return fr.inside(la, ln); }).sort((a, b) => b[1] - a[1]);
/* The unmapped edge: neighbours of recorded cells that hold nothing. */
function frontier(city, fr) {
  const out = new Set();
  for (const h of city.cells.keys()) for (const g of gridDisk(h, 1)) if (!city.cells.has(g)) { const [la, ln] = cellToLatLng(g); if (fr.inside(la, ln)) out.add(g); }
  return [...out];
}
/* Spread picks: the busiest cells, no two too close. */
function spread(cells, n, fr, minPx = 90) {
  const out = [];
  for (const [h] of cells) {
    const [x, y] = fr.p(...cellToLatLng(h));
    if (out.every((o) => Math.hypot(o.x - x, o.y - y) > minPx)) out.push({ h, x, y });
    if (out.length >= n) break;
  }
  return out;
}
const quint = (cells) => { const v = cells.map((c) => c[1]).sort((a, b) => a - b); return (n) => { let i = 0; for (const f of [0.35, 0.6, 0.8, 0.93]) if (n > v[Math.floor(f * (v.length - 1))]) i++; return i; }; };

/* Cartographic furniture: the deepest localities named, and coordinate ticks. */
function labels(city, fr, ink, n = 6) {
  const z = [...city.zones].map(([name, v]) => ({ name, n: v.n, lat: v.lat / v.n, lng: v.lng / v.n })).filter((x) => fr.inside(x.lat, x.lng)).sort((a, b) => b.n - a.n);
  const placed = [];
  for (const x of z) { const [px, py] = fr.p(x.lat, x.lng); if (px < 80 || px > fr.W - 200 || py < 40 || py > fr.H - 40) continue; if (placed.every((o) => Math.hypot(o.px - px, o.py - py) > 220)) placed.push({ ...x, px, py }); if (placed.length >= n) break; }
  return placed.map((x) => `<text x="${f1(x.px + 10)}" y="${f1(x.py - 8)}" fill="${ink}" fill-opacity="0.24" font-family="DM Mono, ui-monospace, Menlo, monospace" font-size="11" letter-spacing="1.4">${x.name.toUpperCase().replace(/&/g, "&amp;").replace(/</g, "")}</text><circle cx="${f1(x.px)}" cy="${f1(x.py)}" r="2" fill="${ink}" fill-opacity="0.28"/>`).join("");
}
function ticks(fr, ink) {
  const step = Math.max(0.01, Math.round(((fr.n - fr.s) / 5) * 100) / 100);
  let out = "";
  for (let lat = Math.ceil(fr.s / step) * step; lat < fr.n; lat += step) { const [, y] = fr.p(lat, fr.w); out += `<line x1="0" x2="14" y1="${f1(y)}" y2="${f1(y)}" stroke="${ink}" stroke-opacity="0.35"/><text x="20" y="${f1(y + 4)}" fill="${ink}" fill-opacity="0.34" font-family="DM Mono, ui-monospace, Menlo, monospace" font-size="10">${lat.toFixed(2)}°N</text>`; }
  for (let lng = Math.ceil(fr.w / step) * step; lng < fr.e; lng += step) { const [x] = fr.p(fr.s, lng); out += `<line y1="${fr.H}" y2="${fr.H - 14}" x1="${f1(x)}" x2="${f1(x)}" stroke="${ink}" stroke-opacity="0.35"/><text x="${f1(x + 4)}" y="${fr.H - 18}" fill="${ink}" fill-opacity="0.34" font-family="DM Mono, ui-monospace, Menlo, monospace" font-size="10">${lng.toFixed(2)}°E</text>`; }
  return out;
}

const REDUCE = "@media (prefers-reduced-motion: reduce){*{animation:none!important}}";
const doc = (fr, title, style, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fr.W} ${fr.H}" preserveAspectRatio="xMidYMid slice"><title>${title}</title><style>${style}${REDUCE}</style>${body}</svg>\n`;

/* ── the five grounds ─────────────────────────────────────────────── */
const A = ranked[0], B = ranked[1] ?? ranked[0];
const grounds = {
  /* Residents: the honeycomb, with reports arriving. */
  "cells.svg": () => {
    const fr = frame(B, 1600, 1000, 0.62, [0.05, 0]);
    const cs = cellsIn(B, fr), qi = quint(cs);
    const hot = spread(cs, 12, fr, 120);
    const body = frontier(B, fr).map((h) => `<path d="${hexPath(h, fr)}" fill="none" stroke="${INK}" stroke-opacity="0.16" stroke-dasharray="3 3"/>`).join("")
      + cs.map(([h, n]) => `<path d="${hexPath(h, fr)}" fill="${SEQ[qi(n)]}" fill-opacity="${(0.09 + qi(n) * 0.045).toFixed(2)}" stroke="#f4eee5" stroke-width="1"/>`).join("")
      + hot.map((c, i) => `<path class="arrive" style="animation-delay:${(i * 1.9).toFixed(1)}s" d="${hexPath(c.h, fr)}" fill="${FLAME}"/>`).join("")
      + labels(B, fr, INK, 5);
    return doc(fr, `Recorded cells in ${B.name}`, `.arrive{opacity:0;animation:arrive 22.8s ease-in-out infinite}@keyframes arrive{0%,100%{opacity:0}4%{opacity:.45}14%{opacity:.14}30%{opacity:0}}`, body);
  },
  /* Pages, educators and feeders: the survey sheet. */
  "survey.svg": () => {
    const fr = frame(A, 1600, 1000, 0.8), levels = 18;
    const paths = contourPaths(A, fr, levels);
    const traced = new Set([Math.floor(levels * 0.45), Math.floor(levels * 0.75)]);
    const body = contourLayer(paths, levels, INK, 0.08, 0.26)
      + paths.filter((p) => traced.has(p.i)).map((p) => `<path class="trace" d="${p.d}" fill="none" stroke="${SEQ[3]}" stroke-opacity="0.55" stroke-width="1.6" pathLength="1000"/>`).join("")
      + labels(A, fr, INK, 6) + ticks(fr, INK);
    return doc(fr, `Recorded animals in ${A.name}, as contours`, `.trace{stroke-dasharray:140 860;animation:trace 26s linear infinite}@keyframes trace{to{stroke-dashoffset:-1000}}`, body);
  },
  /* Municipalities and insights: coverage, with the unmapped edge breathing. */
  "coverage.svg": () => {
    const fr = frame(A, 1600, 1000, 1.1, [-0.04, 0.03]);
    const cs = cellsIn(A, fr);
    const w = (n) => (n >= 8 ? 0.2 : n >= 3 ? 0.12 : 0.06);
    const body = cs.map(([h, n]) => `<path d="${hexPath(h, fr)}" fill="${INK}" fill-opacity="${w(n)}" stroke="#f4eee5" stroke-width="1.2"/>`).join("")
      + `<g class="edge">${frontier(A, fr).map((h) => `<path d="${hexPath(h, fr)}" fill="none" stroke="${INK}" stroke-width="1.1" stroke-dasharray="4 3"/>`).join("")}</g>`
      + labels(A, fr, INK, 4) + ticks(fr, INK);
    return doc(fr, `Coverage of ${A.name}`, `.edge{stroke-opacity:.22;animation:edge 9s ease-in-out infinite}@keyframes edge{50%{stroke-opacity:.5}}`, body);
  },
  /* The NGO workspace: the field, with open work pulsing. */
  "console.svg": () => {
    const fr = frame(B, 1600, 1100, 0.85), levels = 16;
    const paths = contourPaths(B, fr, levels), cs = cellsIn(B, fr);
    const body = contourLayer(paths, levels, INK, 0.05, 0.16)
      + cs.slice(0, 40).map(([h]) => `<path d="${hexPath(h, fr)}" fill="${SEQ[2]}" fill-opacity="0.12" stroke="#f3ede4" stroke-width="1"/>`).join("")
      + spread(cs, 9, fr, 140).map((c, i) => `<circle class="work" style="animation-delay:${(i * 1.3).toFixed(1)}s" cx="${f1(c.x)}" cy="${f1(c.y)}" r="5" fill="none" stroke="${FLAME}" stroke-width="1.6"/><circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="3" fill="${FLAME}" fill-opacity="0.45"/>`).join("")
      + labels(B, fr, INK, 5);
    return doc(fr, `Field work in ${B.name}`, `.work{transform-box:fill-box;transform-origin:center;opacity:0;animation:work 11.7s ease-out infinite}@keyframes work{0%{opacity:.8;transform:scale(1)}40%{opacity:0;transform:scale(5)}100%{opacity:0;transform:scale(5)}}`, body);
  },
  /* Night heroes and closes: the city's lights. */
  "night.svg": () => {
    const fr = frame(B, 1600, 1000, 0.55), levels = 16;
    const paths = contourPaths(B, fr, levels), cs = cellsIn(B, fr);
    const body = contourLayer(paths, levels, CREAM, 0.05, 0.2)
      + cs.map(([h, n], i) => { const [x, y] = fr.p(...cellToLatLng(h)); const tw = i % 7 === 0; return `<circle${tw ? ` class="tw" style="animation-delay:${((i * 0.37) % 9).toFixed(2)}s"` : ""} cx="${f1(x)}" cy="${f1(y)}" r="${(1.3 + Math.min(n, 12) * 0.12).toFixed(2)}" fill="${n >= 5 ? SKY : CREAM}" fill-opacity="${n >= 5 ? 0.55 : 0.32}"/>`; }).join("");
    return doc(fr, `${B.name} at night, one light per recorded place`, `.tw{animation:tw 9s ease-in-out infinite}@keyframes tw{50%{fill-opacity:.95;fill:${FLAME}}}`, body);
  },
};

const out = path.join(root, "public", "grounds");
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.startsWith("contour-")) fs.unlinkSync(path.join(out, f));
for (const [file, make] of Object.entries(grounds)) {
  fs.writeFileSync(path.join(out, file), make());
  console.error(`${file}: ${(fs.statSync(path.join(out, file)).size / 1024).toFixed(0)} KB`);
}
