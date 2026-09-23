/* The spatial engine. Pure functions, no data imports, safe in the browser.

   Everything the map draws is computed here from records: which cell each
   animal and record falls in, what each cell holds at a given moment in
   time under the current filters, how well each cell is mapped, and which
   unmapped cells deserve a visit next — with the reason, never a score. */

import { latLngToCell, cellToLatLng, cellToBoundary, gridDisk, getHexagonAreaAvg, UNITS } from "h3-js";

export type Data = {
  fields: string[]; snapshot: string; now: number;
  cities: { name: string; state: string; lng: number; lat: number; box: [number, number, number, number] }[];
  localities: [string, number, number][];
  animals: [string, number, number, number, number, number, number, number, number | null, number | null, number, number, number, number][];
  zones: string[];
  events: [number, number, number][];
  cases: [number, number, number, number, number, number][];
  held: Record<string, number>;
  conditions: string[];
};
// Animal tuple positions.
export const A = { id: 0, lng: 1, lat: 2, city: 3, ster: 4, vacc: 5, help: 6, inj: 7, first: 8, last: 9, resident: 10, dates: 11, lastVacc: 12, zone: 13 } as const;
export const KINDS = ["Case opened", "Treatment", "Sterilisation · ABC", "Vaccination", "Surgery", "Diagnostic", "Rescue", "Wound care"];
export const OUTCOMES = ["Not recorded", "Treated", "Rescued", "Sterilised"];
export const CRITICAL = new Set([0, 1, 3, 4, 5]); // road accident, maggot, rabies (recorded), abuse, bite

export type Mode = "animals" | "density" | "coverage" | "abc" | "arv" | "medical" | "cases" | "projects";
export type Filters = { ster: "any" | "yes" | "unknown"; vacc: "any" | "yes" | "unknown" | "due"; cond: "any" | "help" | "injured"; seen: "any" | "90" | "365"; source: "all" | "field" | "resident"; repeat: "all" | "repeat" };
export const NO_FILTERS: Filters = { ster: "any", vacc: "any", cond: "any", seen: "any", source: "all", repeat: "all" };
export type Programme = "all" | "abc" | "vacc" | "tvt" | "resident";

/* ── geometry: Uber H3, resolution 8 (≈0.74 km² per cell) ──────────────── */
export const H3_RES = 8;
export const CELL_KM2 = getHexagonAreaAvg(H3_RES, UNITS.km2);
export const cellOf = (lng: number, lat: number, res = H3_RES) => latLngToCell(lat, lng, res);
export const cellCentre = (h: string): [number, number] => { const [lat, lng] = cellToLatLng(h); return [lng, lat]; };
export const cellRingOf = (h: string): [number, number][] => { const b = cellToBoundary(h, true) as [number, number][]; return b; };
/** A ring shrunk towards its centre: the "recorded share" drawn inside a cell. */
export const scaleRing = (ring: [number, number][], c: [number, number], k: number): [number, number][] => ring.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
export const neighboursOf = (h: string) => gridDisk(h, 1).filter((x) => x !== h);
export const kmBetween = (a: [number, number], b: [number, number]) => { const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180); return Math.hypot((a[0] - b[0]) * 111 * k, (a[1] - b[1]) * 111); };

/* ── the index: every record assigned to a cell once ────────────────────── */
export type Index = {
  cellOfAnimal: string[];
  cells: Map<string, { key: string; city: number; center: [number, number]; ring: [number, number][]; animals: number[]; events: number[]; cases: number[]; locality: string }>;
  eventsByAnimal: number[][];
  casesByAnimal: number[][];
};
export function buildIndex(d: Data): Index {
  const cells: Index["cells"] = new Map();
  const cellOfAnimal: string[] = [];
  const get = (city: number, key: string) => {
    let c = cells.get(key);
    if (!c) {
      const center = cellCentre(key);
      let best = "", bd = Infinity;
      if (city === 0) for (const [n, lng, lat] of d.localities) { const dd = (lng - center[0]) ** 2 + (lat - center[1]) ** 2; if (dd < bd) { bd = dd; best = n; } }
      c = { key, city, center, ring: cellRingOf(key), animals: [], events: [], cases: [], locality: best || d.cities[city].name };
      cells.set(key, c);
    }
    return c;
  };
  d.animals.forEach((a, i) => { const c = get(a[A.city], cellOf(a[A.lng], a[A.lat])); c.animals.push(i); cellOfAnimal[i] = c.key; });
  const eventsByAnimal: number[][] = d.animals.map(() => []);
  const casesByAnimal: number[][] = d.animals.map(() => []);
  d.events.forEach((e, i) => { eventsByAnimal[e[0]].push(i); cells.get(cellOfAnimal[e[0]])!.events.push(i); });
  d.cases.forEach((c, i) => { casesByAnimal[c[0]].push(i); cells.get(cellOfAnimal[c[0]])!.cases.push(i); });
  return { cellOfAnimal, cells, eventsByAnimal, casesByAnimal };
}

/* ── what is true at time t, under the filters ──────────────────────────── */
export function animalVisible(d: Data, i: number, t: number, f: Filters): boolean {
  const a = d.animals[i];
  const first = a[A.first] ?? 0;
  if (first > t) return false;
  if (f.ster === "yes" && !a[A.ster]) return false;
  if (f.ster === "unknown" && a[A.ster]) return false;
  if (f.vacc === "yes" && !a[A.vacc]) return false;
  if (f.vacc === "unknown" && a[A.vacc]) return false;
  if (f.vacc === "due" && !(a[A.lastVacc] >= 0 && a[A.lastVacc] <= t && a[A.lastVacc] < t - 365)) return false;
  if (f.cond === "help" && !a[A.help]) return false;
  if (f.cond === "injured" && !a[A.inj]) return false;
  const last = Math.min(a[A.last] ?? first, t);
  if (f.seen === "90" && last < t - 90) return false;
  if (f.seen === "365" && last < t - 365) return false;
  if (f.source === "field" && a[A.resident]) return false;
  if (f.source === "resident" && !a[A.resident]) return false;
  if (f.repeat === "repeat" && a[A.dates] < 2) return false;
  return true;
}
export const caseOpenAt = (c: Data["cases"][number], t: number) => c[1] <= t && (c[3] === 1 || c[3] === 2 ? true : c[5] >= 0 ? c[5] > t : false);

export type Cov = "strong" | "partial" | "weak" | "insufficient" | "unmapped";
export const COV_ORDER: Cov[] = ["strong", "partial", "weak", "insufficient", "unmapped"];
export const COV_TEXT: Record<Cov, string> = {
  strong: "Well mapped: 8+ animals, field work in the last 6 months",
  partial: "Partly mapped: 3+ animals, field work in the last year",
  weak: "Weakly mapped: records exist, but thin or over a year old",
  insufficient: "Too few observations: 1–2 records",
  unmapped: "Unmapped: no records yet — not no dogs",
};

export type CellStat = {
  key: string; animals: number; help: number; inj: number; ster: number; vacc: number; due: number; repeat: number; resident: number;
  events: number; recentEvents: number; lastActivity: number; open: number; critical: number; cases: number;
  abc: number; arv: number; tvt: number; residentReports: number; cov: Cov; nbAnimals: number;
};

export function computeCells(d: Data, ix: Index, t: number, f: Filters, city?: number) {
  const out = new Map<string, CellStat>();
  for (const c of ix.cells.values()) {
    if (city != null && c.city !== city) continue;
    const s: CellStat = { key: c.key, animals: 0, help: 0, inj: 0, ster: 0, vacc: 0, due: 0, repeat: 0, resident: 0, events: 0, recentEvents: 0, lastActivity: -1, open: 0, critical: 0, cases: 0, abc: 0, arv: 0, tvt: 0, residentReports: 0, cov: "unmapped", nbAnimals: 0 };
    for (const i of c.animals) {
      const a = d.animals[i];
      if ((a[A.first] ?? 0) <= t) s.lastActivity = Math.max(s.lastActivity, Math.min(a[A.last] ?? 0, t));
      if (!animalVisible(d, i, t, f)) continue;
      s.animals++; s.help += a[A.help]; s.inj += a[A.inj]; s.ster += a[A.ster]; s.vacc += a[A.vacc];
      if (a[A.lastVacc] >= 0 && a[A.lastVacc] <= t && a[A.lastVacc] < t - 365) s.due++;
      if (a[A.dates] > 1) s.repeat++;
      if (a[A.resident]) { s.resident++; s.residentReports++; }
    }
    for (const e of c.events) {
      const ev = d.events[e]; if (ev[1] > t) continue;
      s.events++; if (ev[1] > t - 365) s.recentEvents++;
      s.lastActivity = Math.max(s.lastActivity, ev[1]);
      if (ev[2] === 2) s.abc++; if (ev[2] === 3) s.arv++;
    }
    for (const ci of c.cases) {
      const cs = d.cases[ci]; if (cs[1] > t) continue;
      s.cases++; if (cs[2] === 2) s.tvt++;
      if (caseOpenAt(cs, t)) { s.open++; if (CRITICAL.has(cs[2])) s.critical++; }
    }
    out.set(c.key, s);
  }
  // Coverage uses everything recorded, not the filtered view: how well we know a place does not change with a filter.
  for (const s of out.values()) {
    const c = ix.cells.get(s.key)!;
    const obs = c.animals.filter((i) => (d.animals[i][A.first] ?? 0) <= t).length;
    const since = s.lastActivity < 0 ? Infinity : t - s.lastActivity;
    s.cov = obs >= 8 && since <= 180 ? "strong" : obs >= 3 && since <= 365 ? "partial" : obs >= 3 || (obs > 0 && s.events >= 3) ? "weak" : obs > 0 || s.events > 0 ? "insufficient" : "unmapped";
  }
  return out;
}

/** The frontier: empty cells within two rings of a recorded cell. Beyond it the map says "not mapped", not "no dogs". */
export function frontier(ix: Index, stats: Map<string, CellStat>, city: number) {
  const have = new Set([...stats.values()].filter((s) => s.cov !== "unmapped" && ix.cells.get(s.key)!.city === city).map((s) => s.key));
  const ring1 = new Set<string>(), ring2 = new Set<string>();
  for (const k of have) for (const n of neighboursOf(k)) if (!have.has(n)) ring1.add(n);
  for (const k of ring1) for (const n of neighboursOf(k)) if (!have.has(n) && !ring1.has(n)) ring2.add(n);
  return [...ring1, ...ring2].map((k) => ({ key: k, ring: cellRingOf(k), center: cellCentre(k), near: ring1.has(k) }));
}

export type Priority = { key: string; center: [number, number]; reasons: string[]; nb: number; locality: string };
/** Where to map next: thinly known cells next to dense ones, with no recent work. Every pick carries its reasons. */
export function mapNext(d: Data, ix: Index, stats: Map<string, CellStat>, city: number, t: number, front: ReturnType<typeof frontier>): Priority[] {
  const nbSum = (k: string) => neighboursOf(k).reduce((a, n) => a + (stats.get(n)?.animals ?? 0), 0);
  const cand: Priority[] = [];
  const consider = (key: string, center: [number, number], cov: Cov, last: number, locality: string) => {
    const nb = nbSum(key);
    if (nb < 12) return;
    const months = last < 0 ? null : Math.round((t - last) / 30.4);
    if (months != null && months < 12) return;
    cand.push({ key, center, nb, locality, reasons: [
      `${nb} animals recorded in the six neighbouring cells`,
      cov === "unmapped" ? "no record here at all" : cov === "insufficient" ? "only 1–2 observations here" : "records here are thin",
      months == null ? "never visited by a field team" : `no field record for ${months} months`,
    ] });
  };
  for (const s of stats.values()) {
    if (s.cov === "strong" || s.cov === "partial") continue;
    const c = ix.cells.get(s.key)!;
    if (c.city !== city) continue;
    consider(s.key, c.center, s.cov, s.lastActivity, c.locality);
  }
  for (const f of front) if (f.near) consider(f.key, f.center, "unmapped", -1, nearestLocality(d, f.center));
  return cand.sort((a, b) => b.nb - a.nb).slice(0, 12);
}
export function nearestLocality(d: Data, p: [number, number]) {
  let best = "", bd = Infinity;
  for (const [n, lng, lat] of d.localities) { const dd = (lng - p[0]) ** 2 + (lat - p[1]) ** 2; if (dd < bd) { bd = dd; best = n; } }
  return best;
}

/* ── time ───────────────────────────────────────────────────────────────── */
const EPOCH = Date.UTC(2024, 0, 1);
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthEnd = (m: number) => Math.round((Date.UTC(2024, m + 1, 0) - EPOCH) / 86400000);
export const monthOf = (day: number) => { const x = new Date(EPOCH + day * 86400000); return (x.getUTCFullYear() - 2024) * 12 + x.getUTCMonth(); };
export const monthLabel = (m: number) => `${MON[m % 12]} ${2024 + Math.floor(m / 12)}`;
export const dayLabel = (day: number) => { const x = new Date(EPOCH + day * 86400000); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
export const fmt = (n: number) => n.toLocaleString("en-IN");
export const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
