"use client";

/* ════════════════════════════════════════════════════════════════════
   The Living World.

   A folk painting of one real neighbourhood (Ganapathy, Coimbatore),
   drawn on its actual streets, canal and buildings, and alive: tails
   wag, mynas wheel, a cow ambles down the main road, a feeder kneels by
   a dog. Every animal that is not passing through stands where an area
   is on StrayPaw's public record.

   Scroll, and the painting becomes the instrument it was hiding: the
   brushed streets straighten onto the live map's roads (same geometry,
   same coordinates: a topology-preserving morph, not a crossfade), the
   houses dissolve into building footprints, the vines between animals
   straighten into stitched connections, each animal resolves into its
   record mark, and the camera rises from the street to the city to
   India.

   Four canvases (paper, streets, town, life) over a MapLibre map in
   the same projection. Static layers paint once; streets repaint only
   while they morph; life runs at 30fps only while on screen. Reduced
   motion: the painting, still.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { GLYPHS, supportsWebGL2 } from "@/components/map/basemap";
import { groundStyle, drawGround, collapseAttribution } from "@/sp/map/ground";
import { useStage, span, ease } from "@/components/bindu/stage";
import { areasGeo, camBetween, fromCentres, type Cam, type Cell } from "@/components/bindu/mapkit";
import { addFolkRecord, folkVis, areasAt, washAt } from "./folk";
import * as A from "./art";
import { mapRoad, noise, resample, rnd, segDist2, toLngLat, toLocal, wobble, type Mural, type Pt } from "./geo";

/** An area on the record near the painted place: its centre, name, open requests, and n (its animals on the record, normalised as the map draws it). */
export type WorldArea = { name: string; c: Pt; open: number; crit: number; n: number };

type RoadG = { k: number; exact: Pt[]; brush: Pt[]; box: [number, number, number, number] };
type Thing = { x: number; y: number; draw: (ctx: CanvasRenderingContext2D) => void };
type Beast = { x: number; y: number; pose: A.Pose; coat: number; seed: number; open: number; n: number; flip: boolean; d: number; name: string };
type Walker = { path: Pt[]; len: number[]; total: number; speed: number; off: number; kind: "dog" | "cow"; coat: number; seed: number };
type Figure = { x: number; y: number; act: A.Act; flip: boolean; seed: number };
type Built = {
  m: Mural; roads: RoadG[]; rivers: RoadG[]; town: Thing[]; beasts: Beast[]; walkers: Walker[]; figures: Figure[];
  links: [number, number][]; washes: { x: number; y: number; r: number; c: string }[]; labels: { n: string; x: number; y: number; big: boolean }[];
};

const BRUSH = [3.6, 3.6, 11, 15, 19]; /* painted street width by rank, in mural units */
const DOG_K = 0.95;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
const INK = [11, 30, 61], IVORY = [255, 248, 236], MARI = [242, 182, 50], SAFF = [242, 140, 56];

function build(m: Mural, areas: WorldArea[]): Built {
  const H = m.half;
  /* streets: exact geometry and the brushed version of the same points */
  const geom = (k: number, p: Pt[], amp: number, i: number): RoadG => {
    const exact = resample(p, 9), brush = wobble(exact, amp, i * 0.37);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of brush) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { k, exact, brush, box: [x0 - 20, y0 - 20, x1 + 20, y1 + 20] };
  };
  const roads = m.roads.map((r, i) => geom(r.k, r.p, r.k >= 2 ? 5 : 3.2, i));
  const rivers = m.rivers.map((r, i) => geom(r.k, r.p, 4, i + 5000));

  /* a coarse grid of street segments, to keep houses off the road */
  const G = 40, grid = new Map<string, [number, number, number, number, number][]>();
  for (const r of roads) for (let i = 1; i < r.exact.length; i++) {
    const [ax, ay] = r.exact[i - 1], [bx, by] = r.exact[i], w = BRUSH[r.k] / 2 + (r.k >= 2 ? 3 : 0.5);
    const key = `${Math.floor((ax + bx) / 2 / G)},${Math.floor((ay + by) / 2 / G)}`;
    const l = grid.get(key) ?? []; l.push([ax, ay, bx, by, w]); grid.set(key, l);
  }
  for (const r of rivers) for (let i = 1; i < r.exact.length; i++) {
    const [ax, ay] = r.exact[i - 1], [bx, by] = r.exact[i];
    const key = `${Math.floor((ax + bx) / 2 / G)},${Math.floor((ay + by) / 2 / G)}`;
    const l = grid.get(key) ?? []; l.push([ax, ay, bx, by, 14]); grid.set(key, l);
  }
  const clear = (x: number, y: number, pad: number) => {
    const gx = Math.floor(x / G), gy = Math.floor(y / G);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [ax, ay, bx, by, w] of grid.get(`${gx + i},${gy + j}`) ?? []) if (segDist2(x, y, ax, ay, bx, by) < (w + pad) ** 2) return false;
    return true;
  };

  /* the record: an animal where each area on the record stands */
  const local = areas.map((a) => ({ ...a, p: toLocal(m, a.c) })).filter((a) => Math.abs(a.p[0]) < H - 20 && Math.abs(a.p[1]) < H - 20);
  const focus = local.find((a) => a.name === m.name) ?? local.sort((a, b) => Math.hypot(...a.p) - Math.hypot(...b.p))[0];
  const beasts: Beast[] = local.map((a, i) => ({
    x: a.p[0], y: a.p[1], name: a.name, open: a.open, n: a.n, seed: i * 13 + 7,
    pose: a === focus ? "stand" : A.POSES[Math.floor(rnd(i, 4) * 3)], coat: Math.floor(rnd(i, 5) * A.COATS.length), flip: rnd(i, 6) > 0.5,
    d: Math.hypot(a.p[0], a.p[1]),
  }));
  /* vines: each animal to its nearest neighbour, and the place's animal to three */
  const links: [number, number][] = [];
  beasts.forEach((b, i) => {
    const near = beasts.map((o, j) => [j, Math.hypot(o.x - b.x, o.y - b.y)] as const).filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]);
    for (const [j, dd] of near.slice(0, b === beasts[local.indexOf(focus!)] ? 3 : 1)) if (dd < 520 && !links.some(([p, q]) => (p === j && q === i) || (p === i && q === j))) links.push([i, j]);
  });
  /* people of the street: a feeder beside every animal with an open request; a reporter, phone in hand, at the place */
  const figures: Figure[] = [];
  beasts.forEach((b, i) => {
    if (focus && b.x === focus.p[0] && b.y === focus.p[1]) figures.push({ x: b.x - 52, y: b.y, act: "phone", flip: false, seed: i });
    else if (b.open > 0) figures.push({ x: b.x + (b.flip ? -48 : 48), y: b.y, act: "feed", flip: !b.flip, seed: i });
    else if (rnd(i, 9) > 0.7) figures.push({ x: b.x + 46, y: b.y + 2, act: rnd(i, 10) > 0.5 ? "sit" : "wave", flip: true, seed: i });
  });

  /* the town: a house where a real building stands, palms and Gond trees between, landmarks by name */
  const town: Thing[] = [];
  const taken: Pt[] = [];
  for (const p of m.pois) {
    if (!clear(p.p[0], p.p[1], 10)) continue;
    const k = p.k; town.push({ x: p.p[0], y: p.p[1], draw: (c) => A.landmark(c, k, 1.3) }); taken.push(p.p);
  }
  const occupied = (x: number, y: number, r: number) => taken.some(([a, b]) => Math.abs(a - x) < r && Math.abs(b - y) < r) || beasts.some((b) => Math.abs(b.x - x) < 70 && Math.abs(b.y - y) < 46);
  for (const [x, y, area] of m.buildings) {
    if (!clear(x, y, 2.5) || occupied(x, y, 18)) continue;
    const seed = Math.round(x * 7 + y * 13), r = rnd(seed, 1);
    if (r < 0.09) town.push({ x, y, draw: (c) => A.palm(c, seed, 0, 1.15) });
    else if (r < 0.13) town.push({ x, y, draw: (c) => A.tree(c, seed, 0, 1.05) });
    else { const s = Math.min(1.7, 1.15 + Math.sqrt(area) / 50); town.push({ x, y, draw: (c) => A.house(c, seed, s) }); }
  }
  town.sort((a, b) => a.y - b.y);

  /* walkers: two dogs on lanes and a cow on the main road, passing through (not records) */
  const walkers: Walker[] = [];
  const pick = (k: number, n: number, seed: number) => roads.filter((r) => r.k >= k && r.exact.length > 12 && Math.hypot(...r.exact[0]) < H * 0.6).sort((a, b) => rnd(a.exact.length, seed) - rnd(b.exact.length, seed)).slice(0, n);
  const walk = (r: RoadG, kind: Walker["kind"], i: number): Walker => {
    const len = [0]; for (let j = 1; j < r.exact.length; j++) len.push(len[j - 1] + Math.hypot(r.exact[j][0] - r.exact[j - 1][0], r.exact[j][1] - r.exact[j - 1][1]));
    return { path: r.exact, len, total: len[len.length - 1], speed: kind === "cow" ? 5 : 14, off: rnd(i, 3) * 400, kind, coat: i % A.COATS.length, seed: i * 31 };
  };
  pick(1, 2, 2).forEach((r, i) => walkers.push(walk(r, "dog", i)));
  pick(2, 1, 5).forEach((r, i) => walkers.push(walk(r, "cow", i + 4)));

  /* pigment: neighbourhoods washed in warm fields that drift with the land */
  const tints = [A.C.marigoldPale, A.C.rosePale, A.C.greenPale, A.C.saffronPale, A.C.bluePale];
  const washes = m.buildings.filter((_, i) => i % 2 === 0).map(([x, y]) => ({ x, y, r: 46, c: tints[Math.floor(noise(x * 0.005 + 3, y * 0.005) * tints.length * 0.999)] }));
  const labels = m.places.map((p) => ({ n: p.n, x: p.p[0], y: p.p[1], big: p.n === m.name }));
  return { m, roads, rivers, town, beasts, walkers, figures, links, washes, labels };
}

/* sprites: each pose and coat painted once at the exact device scale, then stamped */
function sprite(w: number, h: number, k: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement("canvas"); cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
  const c = cv.getContext("2d")!; c.scale(k, k); draw(c); return cv;
}

export function World({ areas, cells, city, sampleAt }: { areas: WorldArea[]; cells: Cell[]; city: string; sampleAt: Pt | null }) {
  const { p, listen, still } = useStage();
  const wrap = useRef<HTMLDivElement>(null), mapEl = useRef<HTMLDivElement>(null);
  const cv = { base: useRef<HTMLCanvasElement>(null), streets: useRef<HTMLCanvasElement>(null), town: useRef<HTMLCanvasElement>(null), life: useRef<HTMLCanvasElement>(null) };
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = wrap.current, me = mapEl.current, base = cv.base.current, streets = cv.streets.current, townC = cv.town.current, life = cv.life.current;
    if (!w || !me || !base || !streets || !townC || !life) return;
    let alive = true, raf = 0, on = true, map: MLMap | null = null, B: Built | null = null;
    let W = 0, H = 0, dpr = 1, s = 1, fx = 0.62, fy = 0.56, zMap = 16, lastT = -1, intro = 0, t0 = 0, lastLife = 0, lastView = "";
    const memo: Record<string, string> = {}, css: Record<string, string> = {};
    const setVar = (k: string, v: string) => { if (css[k] !== v) { css[k] = v; w.style.setProperty(k, v); } };
    const sprites = new Map<string, HTMLCanvasElement>();
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    const reduce = still;

    /* the view: the painting scaled so its window always covers the frame, the place off to the right of the words */
    const layout = () => {
      W = w.clientWidth; H = w.clientHeight; const phone = W < 760;
      dpr = Math.min(phone ? 1.75 : 2, window.devicePixelRatio || 1);
      fx = phone ? 0.5 : 0.63; fy = phone ? 0.66 : 0.55;
      const half = B ? B.m.half : 720;
      s = Math.max((W * fx) / half, (W * (1 - fx)) / half, (H * fy) / half, (H * (1 - fy)) / half) * (phone ? 1.12 : 1.3);
      zMap = 16 + Math.log2(s);
      for (const c of [base, streets, townC, life]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = `${W}px`; c.style.height = `${H}px`; }
      sprites.clear(); lastT = -1; lastView = "";
      w.style.setProperty("--fx", `${fx * 100}%`); w.style.setProperty("--fy", `${fy * 100}%`);
    };
    const unit = (c: CanvasRenderingContext2D) => c.setTransform(dpr * s, 0, 0, dpr * s, dpr * fx * W, dpr * fy * H);
    const visible = () => { const x0 = -fx * W / s, y0 = -fy * H / s; return [x0 - 40, y0 - 60, x0 + W / s + 40, y0 + H / s + 60] as const; };
    const inView = (b: readonly number[], v: readonly number[]) => !(b[2] < v[0] || b[0] > v[2] || b[3] < v[1] || b[1] > v[3]);

    const paintBase = () => {
      if (!B) return; const c = base.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); A.paper(c, W, H);
      unit(c); const v = visible();
      for (const h of B.washes) if (h.x > v[0] && h.x < v[2] && h.y > v[1] && h.y < v[3]) A.wash(c, h.x, h.y, h.r, h.c, 0.85);
      /* tanks and lakes */
      for (const poly of B.m.water) { c.beginPath(); poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = A.C.water; c.fill(); c.strokeStyle = A.C.waterInk; c.lineWidth = 1.2; c.stroke(); }
    };
    const paintTown = () => {
      if (!B) return; const c = townC.getContext("2d")!;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, townC.width, townC.height); unit(c); const v = visible();
      for (const t of B.town) if (t.x > v[0] && t.x < v[2] && t.y > v[1] && t.y < v[3] + 30) { c.save(); c.translate(t.x, t.y); t.draw(c); c.restore(); }
      /* hand-lettered places, on painted ribbons */
      const serif = getComputedStyle(w).getPropertyValue("--serif").trim() || "Georgia, serif";
      for (const l of B.labels) {
        if (l.x < v[0] || l.x > v[2] || l.y < v[1] || l.y > v[3]) continue;
        c.font = `italic ${l.big ? 30 : 17}px ${serif}`; const tw = c.measureText(l.n).width, h = l.big ? 34 : 22;
        c.fillStyle = l.big ? A.C.coral : A.C.paper; c.strokeStyle = A.C.ink; c.lineWidth = 1;
        c.beginPath(); c.moveTo(l.x - tw / 2 - 12, l.y - h / 2); c.lineTo(l.x + tw / 2 + 12, l.y - h / 2); c.lineTo(l.x + tw / 2 + 4, l.y); c.lineTo(l.x + tw / 2 + 12, l.y + h / 2); c.lineTo(l.x - tw / 2 - 12, l.y + h / 2); c.lineTo(l.x - tw / 2 - 4, l.y); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = l.big ? A.C.paper : A.C.ink; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(l.n, l.x, l.y + 1);
      }
    };

    /* the streets, at morph t: brushed and double-lined (0) to the live map's roads (1) */
    const paintStreets = (t: number) => {
      if (!B) return; const c = streets.getContext("2d")!;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, streets.width, streets.height); unit(c);
      c.lineCap = "round"; c.lineJoin = "round";
      const v = visible(), e = ease.inOut(t);
      const pathOf = (list: RoadG[]) => { const P = new Path2D(); for (const r of list) { if (!inView(r.box, v)) continue; r.exact.forEach(([ex, ey], i) => { const [bx, by] = r.brush[i]; const x = lerp(bx, ex, e), y = lerp(by, ey, e); if (i) P.lineTo(x, y); else P.moveTo(x, y); }); } return P; };
      /* the canal: a painted band of water to the map's blue line */
      const rv = pathOf(B.rivers.filter((r) => r.k >= 1)), rw = lerp(15, 3.6 / s, e);
      c.strokeStyle = A.C.ink; c.globalAlpha = 1 - e; c.lineWidth = rw + 4; c.stroke(rv); c.globalAlpha = 1;
      c.strokeStyle = mix([169, 195, 238], [134, 166, 224], e); c.lineWidth = rw; c.stroke(rv);
      if (e < 0.9) { c.strokeStyle = A.C.paper; c.globalAlpha = 0.8 * (1 - e); c.lineWidth = 1.1; c.setLineDash([4, 7]); c.stroke(rv); c.setLineDash([]); c.globalAlpha = 1; }
      for (let k = 1; k <= 4; k++) {
        const list = B.roads.filter((r) => r.k === k); if (!list.length) continue;
        const P = pathOf(list), mr = mapRoad(k, zMap), bw = BRUSH[k], fw = lerp(bw, mr.fw / s, e), cw = lerp(bw + (k >= 2 ? 4.6 : 1.3), mr.cw / s, e);
        c.strokeStyle = mix(k >= 2 ? INK : [176, 146, 112], mr.cc, e); c.lineWidth = cw; c.stroke(P);
        if (k >= 2 && e < 1) {
          /* the Madhubani double line: ink, a paper gap, ink again */
          c.globalAlpha = 1 - e; c.strokeStyle = A.C.paper; c.lineWidth = bw + 2.6; c.stroke(P); c.strokeStyle = A.C.ink; c.lineWidth = bw + 1.2; c.stroke(P); c.globalAlpha = 1;
        }
        c.strokeStyle = mix(k >= 3 ? MARI : k === 2 ? SAFF.map((x, i) => lerp(x, IVORY[i], 0.45)) : IVORY, mr.fc, e); c.lineWidth = fw; c.stroke(P);
        if (k >= 2 && e < 0.8) { c.strokeStyle = A.C.coral; c.globalAlpha = 1 - e / 0.8; c.lineWidth = 1.4; c.setLineDash([2.5, 5.5]); c.stroke(P); c.setLineDash([]); c.globalAlpha = 1; }
      }
      /* rail: a ladder */
      if (e < 1) { c.globalAlpha = 1 - e; c.strokeStyle = A.C.ink; c.lineWidth = 1; for (const r of B.m.rail) { c.beginPath(); r.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); } c.lineWidth = 4; c.setLineDash([0.8, 4]); for (const r of B.m.rail) { c.beginPath(); r.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); } c.setLineDash([]); c.globalAlpha = 1; }
    };

    const dogSprite = (pose: A.Pose, coat: number, seed: number) => {
      const k = `d${pose}${coat}`; let sp = sprites.get(k);
      if (!sp) { sp = sprite(62, 42, dpr * s * DOG_K, (c) => { c.translate(1, 1); A.dogBody(c, pose, A.COATS[coat], seed); }); sprites.set(k, sp); }
      return sp;
    };
    const cowSprite = () => { let sp = sprites.get("cow"); if (!sp) { sp = sprite(72, 52, dpr * s * 0.85, (c) => { c.translate(1, 1); A.cow(c, 0, 4); }); sprites.set("cow", sp); } return sp; };
    const at = (wk: Walker, d: number): [number, number, number] => {
      const L = wk.total, u = ((d % (2 * L)) + 2 * L) % (2 * L), x = u > L ? 2 * L - u : u, dir = u > L ? -1 : 1;
      let i = 1; while (i < wk.len.length - 1 && wk.len[i] < x) i++;
      const a = wk.path[i - 1], b = wk.path[i], f = (x - wk.len[i - 1]) / Math.max(1e-6, wk.len[i] - wk.len[i - 1]);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, (b[0] - a[0]) * dir];
    };

    /* life: animals, people, birds, fish and the vines between; t resolves them into the record */
    const paintLife = (now: number, t: number) => {
      if (!B) return; const c = life.getContext("2d")!;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, life.width, life.height); unit(c);
      const sec = reduce ? 0 : Math.max(0, now - t0) / 1000, e = ease.inOut(t), v = visible();
      const pop = (d: number) => reduce ? 1 : ease.out(Math.max(0, Math.min(1, (intro * 1.6 - d / 900) * 2.2)));
      /* vines grow out with the reveal and straighten into stitched connections */
      for (const [i, j] of B.links) { const a = B.beasts[i], b = B.beasts[j]; const g = Math.min(pop(a.d), pop(b.d)); if (g > 0) A.vine(c, [a.x, a.y - 8 * (1 - e)], [b.x, b.y - 8 * (1 - e)], e, g, i * 7 + j); }
      /* the canal's fish */
      if (e < 1) { c.globalAlpha = 1 - e; B.rivers.filter((r) => r.k >= 1).slice(0, 4).forEach((r, i) => { const n = r.exact.length; if (n < 6) return; const u = (sec * 0.05 + i * 0.3) % 1, j = Math.floor(u * (n - 2)), [x, y] = r.exact[j], [x2, y2] = r.exact[j + 1]; c.save(); c.translate(x, y); c.rotate(Math.atan2(y2 - y, x2 - x)); A.fish(c, sec * 5 + i); c.restore(); }); c.globalAlpha = 1; }
      /* passers-by */
      const fade = Math.max(0, 1 - e * 2.2);
      if (fade > 0) for (const wk of B.walkers) {
        const [x, y, dx] = at(wk, wk.off + sec * wk.speed); if (x < v[0] || x > v[2] || y < v[1] || y > v[3]) continue;
        c.save(); c.globalAlpha = fade * pop(Math.hypot(x, y)); c.translate(x, y + Math.abs(Math.sin(sec * 7 + wk.seed)) * -1.2); if (dx < 0) c.scale(-1, 1);
        if (wk.kind === "cow") { const sp = cowSprite(); c.drawImage(sp, -36 * 0.85, -49 * 0.85, 72 * 0.85, 52 * 0.85); }
        else { const sp = dogSprite("stand", wk.coat, wk.seed); c.translate(-31 * DOG_K, -39 * DOG_K); c.scale(DOG_K, DOG_K); A.dogTail(c, "stand", sec * 9 + wk.seed); c.drawImage(sp, 0, 0, 62, 42); }
        c.restore();
      }
      /* people */
      if (fade > 0) for (const f of B.figures) {
        if (f.x < v[0] || f.x > v[2] || f.y < v[1] || f.y > v[3]) continue;
        c.save(); c.globalAlpha = fade * pop(Math.hypot(f.x, f.y) + 120); c.translate(f.x, f.y); if (f.flip) c.scale(-1, 1); c.scale(1.45, 1.45); c.translate(-10, -34); A.person(c, f.act, sec * 3 + f.seed); c.restore();
      }
      /* the record's animals: alive, then resolving into their marks */
      for (const b of B.beasts) {
        if (b.x < v[0] - 40 || b.x > v[2] + 40 || b.y < v[1] - 40 || b.y > v[3] + 40) continue;
        const g = pop(b.d); if (g <= 0) continue;
        const k = (1 - ease.in(Math.min(1, e * 1.25))) * g;
        if (k > 0.02) {
          const sp = dogSprite(b.pose, b.coat, b.seed), br = 1 + Math.sin(sec * 2.2 + b.seed) * 0.018;
          c.save(); c.globalAlpha = Math.min(1, k * 1.4); c.translate(b.x, b.y); c.scale(k, k * br); if (b.flip) c.scale(-1, 1);
          c.translate(-31 * DOG_K, -39 * DOG_K); c.scale(DOG_K, DOG_K); A.dogTail(c, b.pose, sec * (b.pose === "lie" ? 1.2 : 6) + b.seed); c.drawImage(sp, 0, 0, 62, 42); c.restore();
        }
        /* the mark: vermilion, a marigold rim, an ink ring (the map's own mark, so the handover is invisible) */
        const mk = Math.max(0, (e - 0.35) / 0.65);
        if (mk > 0) {
          const r = (2.6 + 7 * b.n) / s;
          c.globalAlpha = mk; c.beginPath(); c.arc(b.x, b.y, r * 1.7, 0, 6.283); c.strokeStyle = A.C.ink; c.lineWidth = 0.8 / s; c.globalAlpha = mk * 0.45; c.stroke();
          c.globalAlpha = mk; c.beginPath(); c.arc(b.x, b.y, r, 0, 6.283); c.fillStyle = A.C.coral; c.fill(); c.strokeStyle = A.C.marigold; c.lineWidth = 1.4 / s; c.stroke(); c.globalAlpha = 1;
        }
      }
      /* mynas wheeling over the place, leaving as the record takes over */
      if (fade > 0) for (let i = 0; i < 5; i++) {
        const a = sec * (0.25 + i * 0.04) + i * 1.3, R = 120 + i * 40, x = Math.cos(a) * R + (i - 2) * 60, y = Math.sin(a * 1.3) * R * 0.4 - 160 - e * 400;
        c.save(); c.globalAlpha = fade; c.translate(x, y); c.scale(Math.cos(a) > 0 ? -1.7 : 1.7, 1.7); A.bird(c, sec * 9 + i); c.restore();
      }
    };

    /* the map: the same view, under the painting, ready before it is needed */
    const K = (): [number, Cam][] => {
      const v0 = toLngLat(B!.m, [(W / 2 - fx * W) / s, (H / 2 - fy * H) / s]);
      const phone = W < 760, cityC: Pt = sampleAt ?? B!.m.centre;
      return [
        [0.5, { c: v0, z: zMap, pitch: 0, bearing: 0 }],
        [0.72, { c: cityC, z: phone ? 11.2 : 11.8, pitch: 0, bearing: 0 }],
        [0.95, { c: [80.6, 22.2], z: phone ? 3.4 : 4.25, pitch: 0, bearing: 0 }],
        [1, { c: [80.6, 22.2], z: phone ? 3.4 : 4.25, pitch: 0, bearing: 0 }],
      ];
    };

    const frame = (now: number) => {
      raf = 0; if (!alive || !B) return;
      const P = reduce ? 0 : p.current;
      if (intro < 1 && !reduce) intro = Math.max(0, Math.min(1, (now - t0) / 1400));
      const t = span(P, 0.06, 0.42);
      /* reveal: the painting opens outward from the place, as if being painted */
      const R = (reduce ? 1 : ease.out(intro)) * Math.hypot(W, H);
      setVar("--reveal", `${R.toFixed(0)}px`);
      if (Math.abs(t - lastT) > 0.002 || lastT < 0) { lastT = t; paintStreets(t); }
      const lifeDue = now - lastLife > 33 || intro < 1;
      if (lifeDue) { lastLife = now; paintLife(now, t); }
      /* parallax: the life layer leans with the pointer, settling to exact as the record takes over */
      ptr.x += (ptr.tx - ptr.x) * 0.08; ptr.y += (ptr.ty - ptr.y) * 0.08;
      const pa = 1 - t; setVar("--px", `${(ptr.x * 10 * pa).toFixed(1)}px`); setVar("--py", `${(ptr.y * 6 * pa).toFixed(1)}px`);
      if (map) {
        const ks = K(); let i = 0; while (i < ks.length - 2 && P > ks[i + 1][0]) i++;
        const cam = P <= ks[0][0] ? ks[0][1] : camBetween(ks[i][1], ks[i + 1][1], ease.inOut(span(P, ks[i][0], ks[i + 1][0])));
        const key = `${cam.c[0].toFixed(6)},${cam.c[1].toFixed(6)},${cam.z.toFixed(4)}`;
        if (key !== lastView) { lastView = key; map.jumpTo({ center: cam.c, zoom: cam.z, pitch: 0, bearing: 0 }); }
        const mo = span(P, 0.3, 0.42);
        folkVis(map, "world", areasAt(cam.z) * mo, mo, 1, memo, washAt(cam.z));
      }
      const idle = !reduce && on && P < 0.5;
      if (alive && (idle || intro < 1 || Math.abs(ptr.tx - ptr.x) > 0.001)) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };

    (async () => {
      const m: Mural = await fetch("/mural/ganapathy.json").then((r) => r.json());
      if (!alive) return;
      B = build(m, areas); layout();
      if ("fonts" in document) await document.fonts.ready.catch(() => {});
      if (!alive) return;
      paintBase(); paintTown(); t0 = performance.now(); setReady(true); kick();
      if (!supportsWebGL2()) return;
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      if (!alive) return;
      const v0 = toLngLat(m, [(W / 2 - fx * W) / s, (H / 2 - fy * H) / s]);
      const mm = new ml.Map({ container: me, style: { ...groundStyle(), glyphs: GLYPHS }, center: v0, zoom: zMap, interactive: false, attributionControl: { compact: true }, fadeDuration: 0, pixelRatio: dpr });
      map = mm;
      mm.on("load", () => {
        addFolkRecord(mm, areasGeo(fromCentres(cells)), "world");
        drawGround(mm, "world-area").catch(() => false).then(() => { collapseAttribution(mm); lastView = ""; kick(); });
        kick();
      });
    })();

    const ro = new ResizeObserver(() => { if (!B) return; layout(); paintBase(); paintTown(); map?.resize(); kick(); });
    ro.observe(w);
    const io = new IntersectionObserver(([en]) => { on = en.isIntersecting; if (on) kick(); });
    io.observe(w);
    const off = listen(kick);
    const move = (ev: PointerEvent) => { ptr.tx = ev.clientX / innerWidth - 0.5; ptr.ty = ev.clientY / innerHeight - 0.5; kick(); };
    if (!reduce && window.matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", move, { passive: true });
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); off(); window.removeEventListener("pointermove", move); map?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas, cells, p, listen, still, sampleAt]);

  return (
    <div className={`wd${ready ? " is-ready" : ""}`} ref={wrap} aria-hidden>
      <div className="wd-map" ref={mapEl} />
      <div className="wd-paint">
        <canvas ref={cv.base} className="wd-base" />
        <canvas ref={cv.streets} className="wd-streets" />
        <canvas ref={cv.town} className="wd-town" />
        <canvas ref={cv.life} className="wd-life" />
      </div>
      <span className="wd-credit">Painted on OpenStreetMap: {city}</span>
    </div>
  );
}
