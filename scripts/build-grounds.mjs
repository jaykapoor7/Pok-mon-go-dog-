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
const NSEQ = ["#132b55", "#1b3f80", "#2a5bb8", "#4f7fe0", "#93b1f0"];
/* Colour by depth: the outer rings of the record light, the inner deep. */
const ramp = (pal, t) => pal[Math.min(pal.length - 1, Math.floor(t * pal.length))];

/* Every animal's cell and written place, from the public view. */
const rows = [];
for (let from = 0; ; from += 1000) {
  const r = await fetch(`${URL_}/rest/v1/public_spatial_animals?select=h3_r8,city,zone,first_seen&h3_r8=not.is.null`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` } });
  const page = await r.json();
  if (!Array.isArray(page)) throw new Error(JSON.stringify(page));
  rows.push(...page);
  if (page.length < 1000) break;
}
const cities = new Map();
for (const r of rows) {
  if (!r.city) continue;
  const c = cities.get(r.city) ?? cities.set(r.city, { name: r.city, points: [], cells: new Map(), zones: new Map(), months: new Map() }).get(r.city);
  const m = String(r.first_seen ?? "").slice(0, 7);
  if (/^20\d\d-\d\d$/.test(m) && m <= new Date().toISOString().slice(0, 7)) c.months.set(m, (c.months.get(m) ?? 0) + 1);
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

/* The density field on a coarse grid, in frame pixels. */
function density(city, fr) {
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
  return { gw, gh, grid, at: (x, y) => { const i = Math.max(0, Math.min(gw - 1, Math.floor(x))), j = Math.max(0, Math.min(gh - 1, Math.floor(y))); return grid[j * gw + i]; } };
}

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
  const colour = Array.isArray(ink) ? ramp(ink, t) : ink;
  return `<path class="${cls(i)}" d="${d}" fill="none" stroke="${colour}" stroke-opacity="${(lo + t * (hi - lo)).toFixed(3)}" stroke-width="${(0.8 + t * 1.1).toFixed(2)}"/>`;
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
      + cs.map(([h, n]) => `<path d="${hexPath(h, fr)}" fill="${SEQ[qi(n)]}" fill-opacity="${(0.28 + qi(n) * 0.12).toFixed(2)}" stroke="#f4eee5" stroke-width="1.2"/>`).join("")
      + hot.map((c, i) => `<path class="arrive" style="animation-delay:${(i * 1.9).toFixed(1)}s" d="${hexPath(c.h, fr)}" fill="${FLAME}"/>`).join("")
      + labels(B, fr, INK, 5);
    return doc(fr, `Recorded cells in ${B.name}`, `.arrive{opacity:0;animation:arrive 22.8s ease-in-out infinite}@keyframes arrive{0%,100%{opacity:0}4%{opacity:.85}14%{opacity:.3}30%{opacity:0}}`, body);
  },
  /* Pages, educators and feeders: the survey sheet. */
  "survey.svg": () => {
    const fr = frame(A, 1600, 1000, 0.8), levels = 18;
    const paths = contourPaths(A, fr, levels);
    const traced = new Set([Math.floor(levels * 0.45), Math.floor(levels * 0.75)]);
    const body = contourLayer(paths, levels, SEQ, 0.35, 0.8)
      + paths.filter((p) => traced.has(p.i)).map((p) => `<path class="trace" d="${p.d}" fill="none" stroke="${FLAME}" stroke-opacity="0.9" stroke-width="2.2" stroke-linecap="round" pathLength="1000"/>`).join("")
      + labels(A, fr, INK, 6) + ticks(fr, INK);
    return doc(fr, `Recorded animals in ${A.name}, as contours`, `.trace{stroke-dasharray:140 860;animation:trace 26s linear infinite}@keyframes trace{to{stroke-dashoffset:-1000}}`, body);
  },
  /* Municipalities and insights: coverage, with the unmapped edge breathing. */
  "coverage.svg": () => {
    const fr = frame(A, 1600, 1000, 1.1, [-0.04, 0.03]);
    const cs = cellsIn(A, fr);
    const w = (n) => (n >= 8 ? 0.55 : n >= 3 ? 0.34 : 0.16);
    const body = cs.map(([h, n]) => `<path d="${hexPath(h, fr)}" fill="${INK}" fill-opacity="${w(n)}" stroke="#f4eee5" stroke-width="1.2"/>`).join("")
      + `<g class="edge">${frontier(A, fr).map((h) => `<path d="${hexPath(h, fr)}" fill="none" stroke="${SEQ[3]}" stroke-width="1.4" stroke-dasharray="4 3"/>`).join("")}</g>`
      + labels(A, fr, INK, 4) + ticks(fr, INK);
    return doc(fr, `Coverage of ${A.name}`, `.edge{stroke-opacity:.22;animation:edge 9s ease-in-out infinite}@keyframes edge{50%{stroke-opacity:.5}}`, body);
  },
  /* The NGO workspace: the field, with open work pulsing. */
  "console.svg": () => {
    const fr = frame(B, 1600, 1100, 0.85), levels = 16;
    const paths = contourPaths(B, fr, levels), cs = cellsIn(B, fr);
    const body = contourLayer(paths, levels, SEQ, 0.3, 0.75)
      + cs.slice(0, 40).map(([h]) => `<path d="${hexPath(h, fr)}" fill="${SEQ[2]}" fill-opacity="0.35" stroke="#f3ede4" stroke-width="1"/>`).join("")
      + spread(cs, 9, fr, 140).map((c, i) => `<circle class="work" style="animation-delay:${(i * 1.3).toFixed(1)}s" cx="${f1(c.x)}" cy="${f1(c.y)}" r="5" fill="none" stroke="${FLAME}" stroke-width="1.6"/><circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="3.6" fill="${FLAME}" fill-opacity="0.9"/>`).join("")
      + labels(B, fr, INK, 5);
    return doc(fr, `Field work in ${B.name}`, `.work{transform-box:fill-box;transform-origin:center;opacity:0;animation:work 11.7s ease-out infinite}@keyframes work{0%{opacity:.8;transform:scale(1)}40%{opacity:0;transform:scale(5)}100%{opacity:0;transform:scale(5)}}`, body);
  },
  /* Night heroes and closes: the city's lights. */
  "night.svg": () => {
    const fr = frame(B, 1600, 1000, 0.55), levels = 16;
    const paths = contourPaths(B, fr, levels), cs = cellsIn(B, fr);
    const body = contourLayer(paths, levels, NSEQ, 0.45, 0.95)
      + cs.map(([h, n], i) => { const [x, y] = fr.p(...cellToLatLng(h)); const tw = i % 7 === 0; return `<circle${tw ? ` class="tw" style="animation-delay:${((i * 0.37) % 9).toFixed(2)}s"` : ""} cx="${f1(x)}" cy="${f1(y)}" r="${(1.3 + Math.min(n, 12) * 0.12).toFixed(2)}" fill="${n >= 5 ? SKY : CREAM}" fill-opacity="${n >= 5 ? 0.85 : 0.5}"/>`; }).join("");
    return doc(fr, `${B.name} at night, one light per recorded place`, `.tw{animation:tw 9s ease-in-out infinite}@keyframes tw{50%{fill-opacity:.95;fill:${FLAME}}}`, body);
  },
  /* Community: rings around the places animals are recorded; a few spread
     outward, the way a new sighting reaches the people around it. */
  "ripples.svg": () => {
    const fr = frame(B, 1600, 1000, 0.7, [0.02, 0]);
    const cs = cellsIn(B, fr);
    const pts = spread(cs, 70, fr, 46);
    const body = pts.map((c, i) => `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="${i < 12 ? 30 : 18}" fill="none" stroke="${SEQ[3]}" stroke-opacity="${i < 12 ? 0.6 : 0.4}" stroke-width="1.3"/><circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="${i < 12 ? 62 : 36}" fill="${SEQ[0]}" fill-opacity="0.22" stroke="${SEQ[1]}" stroke-opacity="0.5"/><circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="3" fill="${i < 12 ? FLAME : SEQ[4]}" fill-opacity="0.9"/>`).join("")
      + pts.slice(0, 10).map((c, i) => `<circle class="rip" style="animation-delay:${(i * 2.3).toFixed(1)}s" cx="${f1(c.x)}" cy="${f1(c.y)}" r="90" fill="none" stroke="${FLAME}" stroke-width="1.8"/>`).join("")
      + labels(B, fr, INK, 5);
    return doc(fr, `Recorded places in ${B.name}, with their rings`, `.rip{transform-box:fill-box;transform-origin:center;opacity:0;animation:rip 23s ease-out infinite}@keyframes rip{0%{opacity:.9;transform:scale(.05)}18%{opacity:0;transform:scale(1)}100%{opacity:0;transform:scale(1)}}`, body);
  },
  /* NGO workspace: the shortest network through the busiest places, the way
     a field team's rounds join them; a dash travels the rounds. */
  "routes.svg": () => {
    const fr = frame(B, 1600, 1100, 0.8);
    const nodes = spread(cellsIn(B, fr), 64, fr, 72);
    // Prim's minimum spanning tree over the nodes.
    const inTree = new Set([0]), edges = [];
    const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    while (inTree.size < nodes.length) {
      let best = null;
      for (const i of inTree) for (let j = 0; j < nodes.length; j++) if (!inTree.has(j)) { const d = d2(nodes[i], nodes[j]); if (!best || d < best.d) best = { i, j, d }; }
      inTree.add(best.j); edges.push(best);
    }
    const line = (e) => `M${f1(nodes[e.i].x)} ${f1(nodes[e.i].y)}L${f1(nodes[e.j].x)} ${f1(nodes[e.j].y)}`;
    const long = [...edges].sort((a, b) => b.d - a.d).slice(0, 12);
    const body = `<path d="${edges.map(line).join("")}" fill="none" stroke="${SEQ[3]}" stroke-opacity="0.55" stroke-width="1.8" stroke-linecap="round"/>`
      + long.map((e, i) => `<path class="van" style="animation-delay:${(i * 1.7).toFixed(1)}s" d="${line(e)}" fill="none" stroke="${FLAME}" stroke-width="3.2" stroke-linecap="round" pathLength="100"/>`).join("")
      + nodes.map((n, i) => `<circle cx="${f1(n.x)}" cy="${f1(n.y)}" r="${i < 10 ? 5 : 3}" fill="${i < 10 ? FLAME : SEQ[4]}" fill-opacity="${i < 10 ? 0.9 : 0.7}" stroke="#f3ede4" stroke-width="1.5"/>`).join("")
      + labels(B, fr, INK, 5);
    return doc(fr, `Field rounds through ${B.name}'s busiest places`, `.van{stroke-dasharray:12 88;stroke-dashoffset:100;opacity:1;animation:van 23.8s linear infinite}@keyframes van{0%{stroke-dashoffset:100}25%{stroke-dashoffset:0}25.01%,100%{stroke-dashoffset:-100;opacity:0}}`, body);
  },
  /* Insights: streamlines through the density field, like a wind map of
     where the record gathers; dashes flow along them. */
  "flow.svg": () => {
    const fr = frame(A, 1600, 1000, 0.75);
    const D = density(A, fr), sx = fr.W / D.gw, sy = fr.H / D.gh;
    const lines = [];
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let gy = 4; gy < D.gh; gy += 9) for (let gx = 4; gx < D.gw; gx += 9) {
      let x = gx + rnd() * 5 - 2.5, y = gy + rnd() * 5 - 2.5; const pts = [];
      for (let k = 0; k < 46; k++) {
        const dx = D.at(x + 1, y) - D.at(x - 1, y), dy = D.at(x, y + 1) - D.at(x, y - 1), m = Math.hypot(dx, dy);
        if (m < 1e-6) break;
        // Along the contour (perpendicular to the gradient), leaning in.
        x += (-dy / m) * 0.9 + (dx / m) * 0.18; y += (dx / m) * 0.9 + (dy / m) * 0.18;
        if (x < 0 || y < 0 || x >= D.gw || y >= D.gh) break;
        if (k % 2 === 0) pts.push(`${Math.round(x * sx)} ${Math.round(y * sy)}`);
      }
      if (pts.length > 6) lines.push({ d: "M" + pts.join("L"), t: D.at(gx, gy) });
    }
    const tmax = Math.max(...lines.map((l) => l.t)) || 1;
    const body = lines.map(({ d, t }, i) => { const u = Math.sqrt(t / tmax); const hot = i % 6 === 0; return `<path${hot ? ` class="fl" style="animation-delay:${((i * 0.41) % 12).toFixed(2)}s"` : ""} d="${d}" fill="none" stroke="${hot ? FLAME : ramp(SEQ, u)}" stroke-opacity="${hot ? 0.85 : (0.3 + u * 0.5).toFixed(2)}" stroke-width="${hot ? 1.8 : (1 + u).toFixed(2)}" stroke-linecap="round" pathLength="100"/>`; }).join("")
      + labels(A, fr, INK, 4) + ticks(fr, INK);
    return doc(fr, `The record's density in ${A.name}, as flow lines`, `.fl{stroke-dasharray:18 82;animation:fl 12s linear infinite}@keyframes fl{to{stroke-dashoffset:-100}}`, body);
  },
  /* Educators: each city's record over time, as strata; a line sweeps
     through the years. */
  "strata.svg": () => {
    const W = 1600, H = 1000, fr = { W, H };
    const top = ranked.filter((c) => c.months.size > 3).slice(0, 7);
    const all = [...new Set(top.flatMap((c) => [...c.months.keys()]))].sort();
    if (!all.length) return doc(fr, "The record over time", "", "");
    const [y0, m0] = all[0].split("-").map(Number), [y1, m1] = all.at(-1).split("-").map(Number);
    const N = (y1 - y0) * 12 + (m1 - m0) + 1;
    const X = (i) => 60 + (i / Math.max(1, N - 1)) * (W - 120);
    const band = (H - 160) / top.length;
    const body = top.map((c, ci) => {
      const vals = Array.from({ length: N }, (_, i) => { const y = y0 + Math.floor((m0 - 1 + i) / 12), m = ((m0 - 1 + i) % 12) + 1; return c.months.get(`${y}-${String(m).padStart(2, "0")}`) ?? 0; });
      const sm = vals.map((_, i) => { let a = 0, n = 0; for (let k = -2; k <= 2; k++) if (vals[i + k] !== undefined) { a += vals[i + k]; n++; } return a / n; });
      const mx = Math.max(1, ...sm), base = 90 + (ci + 1) * band;
      const d = "M" + sm.map((v, i) => `${f1(X(i))} ${f1(base - Math.sqrt(v / mx) * band * 0.92)}`).join("L");
      return `<path d="${d}L${f1(X(N - 1))} ${f1(base)}L${f1(X(0))} ${f1(base)}Z" fill="${SEQ[ci % SEQ.length]}" fill-opacity="0.45"/><path d="${d}" fill="none" stroke="${SEQ[Math.min(4, (ci % SEQ.length) + 1)]}" stroke-opacity="0.9" stroke-width="1.6"/><path d="M60 ${f1(base)}H${W - 60}" stroke="${INK}" stroke-opacity="0.07"/><text x="${W - 60}" y="${f1(base - 6)}" text-anchor="end" fill="${INK}" fill-opacity="0.26" font-family="DM Mono, ui-monospace, Menlo, monospace" font-size="11" letter-spacing="1.4">${c.name.toUpperCase().replace(/&/g, "&amp;")}</text>`;
    }).join("")
      + Array.from({ length: y1 - y0 + 1 }, (_, k) => { const i = (y0 + k - y0) * 12 - (m0 - 1); if (i < 0 || i >= N) return ""; return `<line x1="${f1(X(i))}" x2="${f1(X(i))}" y1="${H - 50}" y2="${H - 36}" stroke="${INK}" stroke-opacity="0.35"/><text x="${f1(X(i) + 4)}" y="${H - 38}" fill="${INK}" fill-opacity="0.3" font-family="DM Mono, ui-monospace, Menlo, monospace" font-size="10">${y0 + k}</text>`; }).join("")
      + `<line class="now" x1="60" x2="60" y1="70" y2="${H - 60}" stroke="${FLAME}" stroke-opacity="0.8" stroke-width="2"/>`;
    return doc(fr, "Each city's record, month by month", `.now{animation:now 40s linear infinite}@keyframes now{to{transform:translateX(${W - 120}px)}}`, body);
  },
};

const out = path.join(root, "public", "grounds");
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.startsWith("contour-")) fs.unlinkSync(path.join(out, f));
for (const [file, make] of Object.entries(grounds)) {
  fs.writeFileSync(path.join(out, file), make());
  console.error(`${file}: ${(fs.statSync(path.join(out, file)).size / 1024).toFixed(0)} KB`);
}
