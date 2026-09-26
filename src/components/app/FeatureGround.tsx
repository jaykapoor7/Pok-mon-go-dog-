"use client";

/* ════════════════════════════════════════════════════════════════════
   The live ground under every app screen.

   Each feature stands on its own scene, drawn from the record itself
   (public/grounds/points.json: real cells of two cities, a sample of
   public StrayPaw IDs, each city's month-by-month record; nothing finer
   than a cell). The motion says what the feature is about:

     pulse          home: reports ripple out and travel to the nearest team
     constellation  saved dogs: the animals you keep, joined like stars
     flow           insights: the record's density as a moving wind map
     journeys       stories: a rescue drawn from report to close, again and again
     orbits         partner NGOs, team: organisations and people in orbit
     rounds         NGO dashboard: field teams travelling their rounds
     ledger         records, cases: the register scrolling, rows being closed
     radar          drives, analysis: a sweep lighting what it covers
     intake         import: spreadsheet rows flowing in and becoming records
     heartbeat      medical: a trace with care events on it
     feeding        feeding: the round a feeder walks, spots filled as passed,
                    the sun or moon where it is right now
     strata         lessons: each city's record over time, as moving ribbons

   Every app screen opens with its title on the left and air on the
   right; the scene lives in that air, as a bloom from the top-right
   corner that has faded to nothing before the screen's content begins,
   so it never sits behind a line of text. It runs at 30fps, pauses when the tab is hidden or
   the screen is scrolled away, and draws one still frame under reduced
   motion.
   ════════════════════════════════════════════════════════════════════ */

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type City = { name: string; pts: [number, number, number][]; zones: { name: string; x: number; y: number }[]; ids: string[] };
type Live = { cities: City[]; series: { name: string; months: [string, number][] }[] };
type P = { x: number; y: number; n: number };
type Scene = {
  init: (d: Live, w: number, h: number) => Record<string, unknown>;
  draw: (c: CanvasRenderingContext2D, st: Record<string, unknown>, t: number, w: number, h: number, dt: number) => void;
  trails?: boolean;
  /* The wash of colour the scene stands in, from the top-right corner. */
  tint?: [string, string];
};

const INK = "11,30,61", FLAME = "240,91,64", SKY = "143,183,255", OCHRE = "227,179,91", TEAL = "88,180,196";
const SEQ = ["200,212,240", "147,174,233", "91,130,220", "36,87,206", "22,57,143"];
const rgba = (c: string, a: number) => `rgba(${c},${a.toFixed(3)})`;
const seeded = (s: number) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

/* The frame (16:10) laid over the canvas, covering it. */
function place(city: City, w: number, h: number, zoom = 1): P[] {
  const S = Math.max(w / 1.6, h) * zoom, ox = (w - 1.6 * S) / 2 + w * 0.12, oy = (h - S) / 2;
  return city.pts.map(([x, y, n]) => ({ x: ox + x * 1.6 * S, y: oy + y * S, n }));
}
function spread(pts: P[], n: number, min: number) {
  const out: P[] = [];
  for (const p of [...pts].sort((a, b) => b.n - a.n)) { if (out.every((o) => Math.hypot(o.x - p.x, o.y - p.y) > min)) out.push(p); if (out.length >= n) break; }
  return out;
}
function mst(nodes: P[]) {
  const inT = new Set([0]), edges: [number, number][] = [];
  while (inT.size < nodes.length) {
    let best: [number, number, number] | null = null;
    for (const i of inT) for (let j = 0; j < nodes.length; j++) if (!inT.has(j)) { const d = (nodes[i].x - nodes[j].x) ** 2 + (nodes[i].y - nodes[j].y) ** 2; if (!best || d < best[2]) best = [i, j, d]; }
    if (!best) break; inT.add(best[1]); edges.push([best[0], best[1]]);
  }
  return edges;
}
const dot = (c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
const ring = (c: CanvasRenderingContext2D, x: number, y: number, r: number, stroke: string, lw = 1) => { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); };
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/* ── the scenes ───────────────────────────────────────────────────── */
const SCENES: Record<string, Scene> = {
  pulse: {
    tint: [SEQ[1], FLAME],
    init: (d, w, h) => {
      const pts = place(d.cities[0], w, h);
      const hubs = spread(pts, 5, Math.min(w, h) * 0.22);
      const links: [P, P][] = [];
      for (const p of pts) { const near = pts.filter((q) => q !== p).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 2); for (const q of near) if (Math.hypot(q.x - p.x, q.y - p.y) < Math.min(w, h) * 0.08) links.push([p, q]); }
      return { pts, hubs, links, events: [] as { p: P; hub: P; t0: number }[], next: 0, rnd: seeded(11) };
    },
    draw: (c, st, t) => {
      const s = st as { pts: P[]; hubs: P[]; links: [P, P][]; events: { p: P; hub: P; t0: number }[]; next: number; rnd: () => number };
      c.lineWidth = 0.8; c.strokeStyle = rgba(SEQ[2], 0.16); c.beginPath();
      for (const [a, b] of s.links) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); } c.stroke();
      for (const p of s.pts) dot(c, p.x, p.y, 1.4 + Math.min(p.n, 12) * 0.22, rgba(SEQ[Math.min(4, 1 + Math.floor(p.n / 4))], 0.55));
      for (const hb of s.hubs) { ring(c, hb.x, hb.y, 9, rgba(SEQ[3], 0.55), 1.4); dot(c, hb.x, hb.y, 3.2, rgba(SEQ[4], 0.85)); }
      if (t > s.next) { const p = s.pts[Math.floor(s.rnd() * s.pts.length)]; const hub = [...s.hubs].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; s.events.push({ p, hub, t0: t }); s.next = t + 1.3 + s.rnd() * 1.2; }
      s.events = s.events.filter((e) => t - e.t0 < 4.5);
      for (const e of s.events) {
        const k = t - e.t0;
        ring(c, e.p.x, e.p.y, ease(k / 2.2) * 46, rgba(FLAME, 0.7 * (1 - Math.min(1, k / 2.2))), 1.6);
        dot(c, e.p.x, e.p.y, 3, rgba(FLAME, Math.max(0, 0.9 - k / 5)));
        if (k > 0.5 && k < 3.4) {
          const u = ease((k - 0.5) / 2.2), mx = (e.p.x + e.hub.x) / 2, my = Math.min(e.p.y, e.hub.y) - 40;
          c.beginPath(); c.moveTo(e.p.x, e.p.y);
          for (let i = 1; i <= 24; i++) { const v = (i / 24) * u; c.lineTo((1 - v) ** 2 * e.p.x + 2 * (1 - v) * v * mx + v * v * e.hub.x, (1 - v) ** 2 * e.p.y + 2 * (1 - v) * v * my + v * v * e.hub.y); }
          c.strokeStyle = rgba(FLAME, 0.55); c.lineWidth = 1.4; c.stroke();
        }
        if (k > 2.7 && k < 4.5) ring(c, e.hub.x, e.hub.y, 9 + (k - 2.7) * 18, rgba(SEQ[3], 0.6 * (1 - (k - 2.7) / 1.8)), 1.4);
      }
    },
  },

  constellation: {
    tint: [SEQ[2], SKY],
    init: (d, w, h) => {
      const stars = spread(place(d.cities[0], w, h, 1.1), 30, Math.min(w, h) * 0.07);
      const rnd = seeded(5);
      return { stars: stars.map((s) => ({ ...s, ph: rnd() * 6.28, sp: 0.6 + rnd() })), edges: mst(stars), shoot: 0, rnd };
    },
    draw: (c, st, t, w, h) => {
      const s = st as { stars: (P & { ph: number; sp: number })[]; edges: [number, number][]; shoot: number; rnd: () => number };
      const dx = Math.sin(t * 0.05) * 14, dy = Math.cos(t * 0.04) * 10;
      c.lineWidth = 1; c.strokeStyle = rgba(SEQ[3], 0.3); c.setLineDash([2, 5]); c.beginPath();
      for (const [a, b] of s.edges) { c.moveTo(s.stars[a].x + dx, s.stars[a].y + dy); c.lineTo(s.stars[b].x + dx, s.stars[b].y + dy); }
      c.stroke(); c.setLineDash([]);
      for (const p of s.stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * p.sp + p.ph);
        dot(c, p.x + dx, p.y + dy, 2 + tw * 1.6, rgba(SEQ[4], 0.5 + tw * 0.4));
        if (tw > 0.93) ring(c, p.x + dx, p.y + dy, 7, rgba(FLAME, (tw - 0.93) * 10), 1.2);
      }
      const k = (t % 9) / 1.4;
      if (k < 1) { const x0 = w * 0.55 + (s.rnd() - 0.5) * 2, y0 = h * 0.12; c.beginPath(); c.moveTo(x0 + k * 260, y0 + k * 120); c.lineTo(x0 + k * 260 - 60, y0 + k * 120 - 28); c.strokeStyle = rgba(FLAME, 0.7 * (1 - k)); c.lineWidth = 1.8; c.stroke(); }
    },
  },

  flow: {
    tint: [SEQ[1], SEQ[3]],
    trails: true,
    init: (d, w, h) => {
      const pts = place(d.cities[1] ?? d.cities[0], w, h, 0.9);
      const cores = spread(pts, 9, Math.min(w, h) * 0.12).map((p, i) => ({ ...p, s: i % 2 ? 1 : -1 }));
      const rnd = seeded(3);
      const parts = Array.from({ length: Math.round((w * h) / 2600) }, () => ({ x: rnd() * w, y: rnd() * h, age: rnd() * 200 }));
      return { cores, parts, rnd };
    },
    draw: (c, st, _t, w, h, dt) => {
      const s = st as { cores: (P & { s: number })[]; parts: { x: number; y: number; age: number }[]; rnd: () => number };
      c.lineWidth = 1.1;
      for (const p of s.parts) {
        let vx = 0.35, vy = 0;
        for (const k of s.cores) { const dx = p.x - k.x, dy = p.y - k.y, r2 = dx * dx + dy * dy + 900, f = (k.s * 9000) / r2; vx += -dy * f / Math.sqrt(r2); vy += dx * f / Math.sqrt(r2); }
        const sp = Math.hypot(vx, vy), nx = p.x + vx * dt * 38, ny = p.y + vy * dt * 38;
        c.strokeStyle = rgba(sp > 1.6 ? FLAME : SEQ[Math.min(4, 2 + Math.floor(sp))], sp > 1.6 ? 0.5 : 0.42);
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(nx, ny); c.stroke();
        p.x = nx; p.y = ny; p.age += 1;
        if (p.age > 220 || nx < 0 || ny < 0 || nx > w || ny > h) { p.x = s.rnd() * w; p.y = s.rnd() * h; p.age = 0; }
      }
    },
  },

  journeys: {
    tint: [SEQ[1], FLAME],
    init: (d, w, h) => {
      const pts = spread(place(d.cities[0], w, h), 60, Math.min(w, h) * 0.05);
      return { pts, js: [] as { path: P[]; t0: number }[], next: 0, rnd: seeded(21) };
    },
    draw: (c, st, t) => {
      const s = st as { pts: P[]; js: { path: P[]; t0: number }[]; next: number; rnd: () => number };
      for (const p of s.pts) dot(c, p.x, p.y, 1.6, rgba(SEQ[2], 0.35));
      if (t > s.next && s.js.length < 4) {
        let cur = s.pts[Math.floor(s.rnd() * s.pts.length)]; const path = [cur];
        for (let i = 0; i < 4; i++) { const near = s.pts.filter((q) => !path.includes(q)).sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y)); cur = near[Math.floor(s.rnd() * 3)] ?? cur; path.push(cur); }
        s.js.push({ path, t0: t }); s.next = t + 1.6;
      }
      s.js = s.js.filter((j) => t - j.t0 < 7);
      for (const j of s.js) {
        const k = t - j.t0, u = ease(k / 4), fade = k > 5.5 ? 1 - (k - 5.5) / 1.5 : 1, segs = j.path.length - 1, upto = u * segs;
        c.beginPath(); c.moveTo(j.path[0].x, j.path[0].y);
        for (let i = 1; i <= segs; i++) { const a = j.path[i - 1], b = j.path[i]; const f = Math.min(1, Math.max(0, upto - (i - 1))); if (f <= 0) break; c.quadraticCurveTo((a.x + b.x) / 2 + (b.y - a.y) * 0.25, (a.y + b.y) / 2 - (b.x - a.x) * 0.25, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); }
        c.strokeStyle = rgba(SEQ[3], 0.65 * fade); c.lineWidth = 1.8; c.stroke();
        dot(c, j.path[0].x, j.path[0].y, 4, rgba(FLAME, 0.9 * fade));
        for (let i = 1; i < j.path.length && i <= upto; i++) dot(c, j.path[i].x, j.path[i].y, 2.6, rgba(SEQ[4], 0.8 * fade));
        if (u >= 1) { const e = j.path[j.path.length - 1]; ring(c, e.x, e.y, 7, rgba(SEQ[3], 0.9 * fade), 1.6); }
      }
    },
  },

  orbits: {
    tint: [SKY, FLAME],
    init: (_d, w, h) => {
      const rnd = seeded(8);
      const cx = w * 0.82, cy = h * 0.42, R = Math.min(w * 0.3, h * 0.42);
      const rings = [0.34, 0.56, 0.78, 1].map((f, i) => ({ r: R * f, tilt: 0.42 + i * 0.05, nodes: Array.from({ length: 3 + i * 2 }, () => ({ a: rnd() * 6.28, sp: (0.08 + rnd() * 0.08) * (i % 2 ? 1 : -1), big: rnd() > 0.8 })) }));
      return { cx, cy, rings };
    },
    draw: (c, st, t) => {
      const s = st as { cx: number; cy: number; rings: { r: number; tilt: number; nodes: { a: number; sp: number; big: boolean }[] }[] };
      for (const [ri, r] of s.rings.entries()) {
        c.beginPath(); c.ellipse(s.cx, s.cy, r.r, r.r * r.tilt, -0.35, 0, Math.PI * 2); c.strokeStyle = rgba(SEQ[2 + (ri % 2)], 0.28); c.lineWidth = 1; c.stroke();
        for (const n of r.nodes) {
          const a = n.a + t * n.sp, ex = Math.cos(a) * r.r, ey = Math.sin(a) * r.r * r.tilt, rot = -0.35;
          const x = s.cx + ex * Math.cos(rot) - ey * Math.sin(rot), y = s.cy + ex * Math.sin(rot) + ey * Math.cos(rot);
          if (n.big) { c.beginPath(); c.moveTo(s.cx, s.cy); c.lineTo(x, y); c.strokeStyle = rgba(FLAME, 0.18); c.stroke(); }
          dot(c, x, y, n.big ? 5 : 3, rgba(n.big ? FLAME : SEQ[4], n.big ? 0.85 : 0.7));
        }
      }
      const pulse = (t % 3) / 3;
      ring(c, s.cx, s.cy, 12 + pulse * 30, rgba(SEQ[3], 0.5 * (1 - pulse)), 1.4);
      dot(c, s.cx, s.cy, 8, rgba(SEQ[4], 0.9));
    },
  },

  rounds: {
    tint: [SEQ[1], FLAME],
    init: (d, w, h) => {
      const nodes = spread(place(d.cities[0], w, h), 46, Math.min(w, h) * 0.075);
      const edges = mst(nodes), adj = nodes.map(() => [] as number[]);
      for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
      const rnd = seeded(4);
      const vans = Array.from({ length: 4 }, (_, i) => ({ from: i * 7 % nodes.length, to: adj[i * 7 % nodes.length][0] ?? 0, u: 0 }));
      return { nodes, edges, adj, vans, glow: nodes.map(() => -9), rnd };
    },
    draw: (c, st, t, _w, _h, dt) => {
      const s = st as { nodes: P[]; edges: [number, number][]; adj: number[][]; vans: { from: number; to: number; u: number }[]; glow: number[]; rnd: () => number };
      c.lineWidth = 1.6; c.lineCap = "round"; c.strokeStyle = rgba(SEQ[2], 0.32); c.beginPath();
      for (const [a, b] of s.edges) { c.moveTo(s.nodes[a].x, s.nodes[a].y); c.lineTo(s.nodes[b].x, s.nodes[b].y); } c.stroke();
      for (const [i, n] of s.nodes.entries()) {
        const g = Math.max(0, 1 - (t - s.glow[i]) / 2.5);
        if (g > 0) ring(c, n.x, n.y, 6 + (1 - g) * 16, rgba(SEQ[3], 0.6 * g), 1.4);
        dot(c, n.x, n.y, 2.6 + g * 2, rgba(g > 0 ? SEQ[4] : SEQ[3], 0.75));
      }
      for (const v of s.vans) {
        const a = s.nodes[v.from], b = s.nodes[v.to], L = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
        v.u += (dt * 70) / L;
        if (v.u >= 1) { s.glow[v.to] = t; const nx = s.adj[v.to].filter((x) => x !== v.from); v.from = v.to; v.to = nx.length ? nx[Math.floor(s.rnd() * nx.length)] : s.adj[v.to][0]; v.u = 0; continue; }
        const x = a.x + (b.x - a.x) * v.u, y = a.y + (b.y - a.y) * v.u;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - (b.x - a.x) / L * 26, y - (b.y - a.y) / L * 26); c.strokeStyle = rgba(FLAME, 0.55); c.lineWidth = 3; c.stroke();
        dot(c, x, y, 4, rgba(FLAME, 0.95));
      }
    },
  },

  ledger: {
    tint: [SEQ[0], SEQ[2]],
    init: (d, w, h) => {
      const ids = d.cities.flatMap((c) => c.ids);
      const rnd = seeded(9);
      return { ids, cols: [w * 0.66, w * 0.84], rowH: 34, h, marks: new Map<number, number>(), rnd, next: 0 };
    },
    draw: (c, st, t, w) => {
      const s = st as { ids: string[]; cols: number[]; rowH: number; h: number; marks: Map<number, number>; rnd: () => number; next: number };
      c.font = "500 12px 'DM Mono', ui-monospace, Menlo, monospace";
      const off = (t * 14) % s.rowH, rows = Math.ceil(s.h / s.rowH) + 2, base = Math.floor((t * 14) / s.rowH);
      if (t > s.next) { s.marks.set(base + Math.floor(s.rnd() * rows), t); s.next = t + 1.1; }
      for (const [ci, x] of s.cols.entries()) {
        for (let r = 0; r < rows; r++) {
          const idx = base + r, y = s.h - (r * s.rowH + off) + s.rowH;
          const id = s.ids[(idx * 7 + ci * 13) % s.ids.length] ?? "SP-D-000000";
          c.strokeStyle = rgba(INK, 0.08); c.lineWidth = 1; c.beginPath(); c.moveTo(x - 20, y + 10); c.lineTo(Math.min(w, x + 190), y + 10); c.stroke();
          const m = ci === 0 ? s.marks.get(idx) : undefined, k = m !== undefined ? t - m : 99;
          c.fillStyle = rgba(k < 3 ? FLAME : INK, k < 3 ? 0.75 : 0.26); c.fillText(id, x, y);
          if (k < 6) { const u = Math.min(1, k / 1.2); c.fillStyle = rgba(k < 3 ? FLAME : SEQ[3], 0.8); c.fillRect(x + 118, y - 9, 40 * u, 3); if (k > 3) { c.fillStyle = rgba(SEQ[3], 0.85); c.fillText("closed", x + 118, y); } else c.fillText("new", x + 118, y + 12); }
        }
      }
    },
  },

  radar: {
    tint: [SEQ[1], SEQ[3]],
    init: (d, w, h) => {
      const pts = place(d.cities[0], w, h, 1.05);
      const cx = w * 0.8, cy = h * 0.45, R = Math.min(w * 0.34, h * 0.5);
      return { pts: pts.filter((p) => Math.hypot(p.x - cx, p.y - cy) < R), cx, cy, R };
    },
    draw: (c, st, t) => {
      const s = st as { pts: P[]; cx: number; cy: number; R: number };
      for (const f of [0.25, 0.5, 0.75, 1]) ring(c, s.cx, s.cy, s.R * f, rgba(SEQ[2], f === 1 ? 0.35 : 0.2), 1);
      const a = (t * 0.55) % (Math.PI * 2);
      const grad = c.createConicGradient ? c.createConicGradient(a - 0.9, s.cx, s.cy) : null;
      if (grad) { grad.addColorStop(0, rgba(SEQ[3], 0)); grad.addColorStop(0.14, rgba(SEQ[3], 0.16)); grad.addColorStop(0.145, rgba(SEQ[3], 0)); c.beginPath(); c.arc(s.cx, s.cy, s.R, 0, Math.PI * 2); c.fillStyle = grad; c.fill(); }
      c.beginPath(); c.moveTo(s.cx, s.cy); c.lineTo(s.cx + Math.cos(a) * s.R, s.cy + Math.sin(a) * s.R); c.strokeStyle = rgba(SEQ[3], 0.7); c.lineWidth = 1.6; c.stroke();
      for (const p of s.pts) {
        const pa = Math.atan2(p.y - s.cy, p.x - s.cx), since = ((a - pa) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const lit = Math.max(0, 1 - since / 2.4);
        dot(c, p.x, p.y, 1.8 + lit * 2.4, rgba(lit > 0.7 && p.n > 4 ? FLAME : SEQ[4], 0.25 + lit * 0.7));
      }
    },
  },

  intake: {
    tint: [SEQ[0], OCHRE],
    init: (d, w, h) => {
      const targets = spread(place(d.cities[0], w, h), 70, Math.min(w, h) * 0.04);
      return { targets, rows: [] as { tx: number; ty: number; y: number; t0: number }[], placed: [] as { x: number; y: number; t: number }[], next: 0, rnd: seeded(2), w, h };
    },
    draw: (c, st, t) => {
      const s = st as { targets: P[]; rows: { tx: number; ty: number; y: number; t0: number }[]; placed: { x: number; y: number; t: number }[]; next: number; rnd: () => number; w: number; h: number };
      if (t > s.next) { const p = s.targets[Math.floor(s.rnd() * s.targets.length)]; s.rows.push({ tx: p.x, ty: p.y, y: s.h * (0.1 + s.rnd() * 0.8), t0: t }); s.next = t + 0.45; }
      s.rows = s.rows.filter((r) => { const k = (t - r.t0) / 2.6; if (k >= 1) { s.placed.push({ x: r.tx, y: r.ty, t }); return false; } return true; });
      s.placed = s.placed.filter((p) => t - p.t < 9);
      for (const p of s.placed) { const k = t - p.t; dot(c, p.x, p.y, 3, rgba(SEQ[4], 0.8 * (1 - k / 9))); if (k < 0.8) ring(c, p.x, p.y, 3 + k * 16, rgba(SEQ[3], 0.7 * (1 - k / 0.8)), 1.2); }
      for (const r of s.rows) {
        const k = ease((t - r.t0) / 2.6), x0 = s.w + 20, x = x0 + (r.tx - x0) * k, y = r.y + (r.ty - r.y) * k, bw = 70 * (1 - k) + 6;
        c.fillStyle = rgba(INK, 0.1 + 0.2 * (1 - k)); c.fillRect(x - bw / 2, y - 5, bw, 10);
        for (let i = 1; i < 3; i++) { c.fillStyle = rgba(i === 1 ? SEQ[3] : OCHRE, 0.55 * (1 - k)); c.fillRect(x - bw / 2 + (bw / 3) * i, y - 5, 1.4, 10); }
      }
    },
  },

  heartbeat: {
    tint: [TEAL, SEQ[1]],
    init: (_d, w, h) => ({ w, h, rnd: seeded(6) }),
    draw: (c, st, t) => {
      const s = st as { w: number; h: number; rnd: () => number };
      for (const [li, yb] of [s.h * 0.2, s.h * 0.46, s.h * 0.72].entries()) {
        c.beginPath();
        const x0 = s.w * 0.52;
        for (let x = x0; x <= s.w; x += 3) {
          const ph = (x - t * 90 - li * 140) / 240, frac = ph - Math.floor(ph);
          const spike = frac > 0.46 && frac < 0.54 ? Math.sin(((frac - 0.46) / 0.08) * Math.PI * 2) * (li === 1 ? 34 : 24) : 0;
          const y = yb - spike + Math.sin(ph * 6.28 * 3) * 2;
          if (x === x0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.strokeStyle = rgba(li === 1 ? TEAL : SEQ[3], li === 1 ? 0.6 : 0.35); c.lineWidth = li === 1 ? 1.8 : 1.2; c.stroke();
      }
      const k = (t % 2.2) / 2.2;
      ring(c, s.w * 0.9, s.h * 0.46, 6 + k * 22, rgba(TEAL, 0.6 * (1 - k)), 1.4); dot(c, s.w * 0.9, s.h * 0.46, 4, rgba(TEAL, 0.9));
    },
  },

  feeding: {
    tint: [OCHRE, FLAME],
    init: (d, w, h) => {
      const spots = spread(place(d.cities[0], w, h), 12, Math.min(w, h) * 0.12).filter((p) => p.x > w * 0.45);
      const cx = spots.reduce((a, p) => a + p.x, 0) / Math.max(1, spots.length), cy = spots.reduce((a, p) => a + p.y, 0) / Math.max(1, spots.length);
      spots.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
      return { spots, fed: spots.map(() => -99), w, h };
    },
    draw: (c, st, t) => {
      const s = st as { spots: P[]; fed: number[]; w: number; h: number };
      const n = s.spots.length; if (n < 3) return;
      /* The sun or moon, where it is now. */
      const now = new Date(), hr = now.getHours() + now.getMinutes() / 60, day = hr >= 6 && hr < 18, frac = day ? (hr - 6) / 12 : ((hr + 6) % 24) / 12;
      const ax = s.w * 0.55 + frac * s.w * 0.4, ay = s.h * 0.2 - Math.sin(frac * Math.PI) * s.h * 0.12;
      c.beginPath(); c.ellipse(s.w * 0.75, s.h * 0.2, s.w * 0.2, s.h * 0.12, 0, Math.PI, 0); c.strokeStyle = rgba(OCHRE, 0.3); c.setLineDash([3, 6]); c.lineWidth = 1; c.stroke(); c.setLineDash([]);
      dot(c, ax, ay, 9, rgba(day ? OCHRE : SKY, 0.85)); ring(c, ax, ay, 15 + Math.sin(t) * 2, rgba(day ? OCHRE : SKY, 0.35), 1.2);
      c.beginPath();
      for (let i = 0; i <= n; i++) { const a = s.spots[i % n], b = s.spots[(i + 1) % n]; if (i === 0) c.moveTo(a.x, a.y); c.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2); }
      c.strokeStyle = rgba(OCHRE, 0.5); c.lineWidth = 2; c.stroke();
      const lap = (t / 2.2) % n, i = Math.floor(lap), u = lap - i, a = s.spots[i], b = s.spots[(i + 1) % n];
      if (u < 0.05 && t - s.fed[i] > 1) s.fed[i] = t;
      for (const [k, p] of s.spots.entries()) { const full = Math.max(0, 1 - (t - s.fed[k]) / 14); dot(c, p.x, p.y, 3 + full * 5, rgba(OCHRE, 0.35 + full * 0.55)); ring(c, p.x, p.y, 9, rgba(OCHRE, 0.35), 1); }
      dot(c, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 4.5, rgba(FLAME, 0.95));
    },
  },

  strata: {
    tint: [SEQ[1], SKY],
    init: (d, w, h) => ({ series: d.series.map((sr) => sr.months.map((m) => m[1])), w, h }),
    draw: (c, st, t) => {
      const s = st as { series: number[][]; w: number; h: number };
      const band = (s.h * 0.8) / Math.max(1, s.series.length);
      for (const [i, vals] of s.series.entries()) {
        const mx = Math.max(1, ...vals), base = s.h * 0.12 + (i + 1) * band, x0 = s.w * 0.45;
        c.beginPath(); c.moveTo(x0, base);
        for (let x = x0; x <= s.w; x += 6) {
          const f = (x - x0) / (s.w - x0), j = f * (vals.length - 1), v = vals[Math.floor(j)] ?? 0;
          c.lineTo(x, base - Math.sqrt(v / mx) * band * 0.85 - Math.sin(x / 70 + t * 0.6 + i) * 4);
        }
        c.lineTo(s.w, base); c.closePath();
        c.fillStyle = rgba(SEQ[i % SEQ.length], 0.38); c.fill();
        c.strokeStyle = rgba(SEQ[Math.min(4, (i % SEQ.length) + 1)], 0.8); c.lineWidth = 1.4; c.stroke();
      }
      const nx = s.w * 0.45 + ((t * 18) % (s.w * 0.55));
      c.beginPath(); c.moveTo(nx, s.h * 0.1); c.lineTo(nx, s.h * 0.95); c.strokeStyle = rgba(FLAME, 0.6); c.lineWidth = 1.6; c.stroke();
    },
  },
};

/* Which scene a screen stands on. */
function sceneFor(path: string): keyof typeof SCENES {
  if (path.startsWith("/following")) return "constellation";
  if (path.startsWith("/insights")) return "flow";
  if (path.startsWith("/stories") || path.startsWith("/partner/stories") || path.startsWith("/partner/fundrais") || path.startsWith("/fundraisers")) return "journeys";
  if (path.startsWith("/orgs") || path.startsWith("/org/") || path.startsWith("/partner/team") || path.startsWith("/partner/volunteers") || path.startsWith("/partner/codes") || path.startsWith("/partner/settings")) return "orbits";
  if (path.startsWith("/partner/import")) return "intake";
  if (path.startsWith("/partner/medical")) return "heartbeat";
  if (path.startsWith("/partner/feeding") || path.startsWith("/feeder") || path.startsWith("/feeding")) return "feeding";
  if (/^\/partner\/(animals|records|cases|incoming|review|quality)/.test(path)) return "ledger";
  if (/^\/partner\/(reports|drives|projects|field|surveys|operations)/.test(path) || path.startsWith("/programmes")) return "radar";
  if (path.startsWith("/learn")) return "strata";
  if (path === "/partner") return "rounds";
  return "pulse";
}

let cache: Promise<Live | null> | null = null;
const load = () => (cache ??= fetch("/grounds/points.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));

export function FeatureGround() {
  const path = usePathname() ?? "";
  const scene = sceneFor(path);
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current, holder = box.current;
    if (!canvas || !holder) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0, dead = false, visible = true, st: Record<string, unknown> = {}, data: Live | null = null, last = 0, t = 0, w = 0, h = 0;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const S = SCENES[scene];

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (data) st = S.init(data, w, h);
    };
    const paint = (dt: number) => {
      if (S.trails) { ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,0.07)"; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = "source-over"; }
      else ctx.clearRect(0, 0, w, h);
      if (S.tint && !S.trails) {
        /* Two slow washes of colour: the feature's own, and a warmer one
           drifting across it. */
        const [a, b] = S.tint, R = Math.max(w * 0.5, h * 1.2);
        let g = ctx.createRadialGradient(w, 0, 0, w, 0, R);
        g.addColorStop(0, rgba(a, 0.34)); g.addColorStop(0.55, rgba(a, 0.12)); g.addColorStop(1, rgba(a, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const bx = w * (0.8 + Math.sin(t * 0.13) * 0.08), by = h * (0.3 + Math.cos(t * 0.11) * 0.12);
        g = ctx.createRadialGradient(bx, by, 0, bx, by, R * 0.45);
        g.addColorStop(0, rgba(b, 0.14)); g.addColorStop(1, rgba(b, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      S.draw(ctx, st, t, w, h, dt);
    };
    const loop = (now: number) => {
      if (dead) return;
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || !data) return;
      if (now - last < 33) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.033; last = now; t += dt;
      paint(dt);
    };

    load().then((d) => {
      if (dead || !d) return;
      data = d; size();
      if (still) { t = 6; for (let i = 0; i < (S.trails ? 60 : 1); i++) paint(0.05); return; }
      raf = requestAnimationFrame(loop);
    });
    const ro = new ResizeObserver(() => { size(); if (still && data) paint(0.05); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(holder);
    return () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [scene]);

  return (
    <div ref={box} className="fg" data-scene={scene} aria-hidden="true">
      <canvas ref={cv} className="fg-canvas" />
    </div>
  );
}
