/* ════════════════════════════════════════════════════════════════════
   The spatial engine: what the register says about each place, at a
   moment in time, under a filter.

   Pure functions over a SpatialDataset. No network, no h3-js, no DOM —
   so the same code answers the map, the analytics, the landing plate and
   the dashboards, in the browser or on the server, and the tests can run
   it on a synthetic city.

   THE RULES IT KEEPS
   • Recorded is not real. A count is always "recorded"; an empty cell is
     "not mapped", never "no dogs".
   • Unknown is its own answer. Every share comes back as known / unknown /
     total, so a screen can hatch the unknown instead of hiding it.
   • Coverage does not change with a filter. How well a place is known is a
     property of everything recorded there, not of the slice on screen.
   ════════════════════════════════════════════════════════════════════ */

import {
  A, A_STRIDE, AF, C, C_STRIDE, K, K_STRIDE, S, S_STRIDE, SF,
  type SpatialDataset,
} from "./types";
import { CONDITIONS, DEFAULT_TRIAGE, STATUSES, type Condition, type Triage } from "@/lib/register/taxonomy";

export type Mode = "animals" | "density" | "coverage" | "abc" | "arv" | "medical" | "cases" | "activity";

export type Filters = {
  ster: "any" | "yes" | "unknown";
  vacc: "any" | "yes" | "unknown" | "due";
  health: "any" | "help" | "injured";
  seen: "any" | "90" | "365";
  source: "all" | "field" | "resident";
  /** Case condition, by index into dict.condition; -1 for all. */
  condition: number;
};
export const NO_FILTERS: Filters = { ster: "any", vacc: "any", health: "any", seen: "any", source: "all", condition: -1 };

export type Coverage = "strong" | "partial" | "weak" | "insufficient" | "unmapped";
export const COVERAGE_ORDER: Coverage[] = ["strong", "partial", "weak", "insufficient", "unmapped"];
export const COVERAGE_TEXT: Record<Coverage, { label: string; rule: string }> = {
  strong: { label: "Well mapped", rule: "8 or more animals, and field work in the last six months" },
  partial: { label: "Partly mapped", rule: "3 or more animals, and field work in the last year" },
  weak: { label: "Weakly mapped", rule: "records exist, but they are thin or more than a year old" },
  insufficient: { label: "Too few records", rule: "one or two records" },
  unmapped: { label: "Not mapped", rule: "nothing recorded yet — which is not the same as no dogs" },
};

export type Index = {
  cellByKey: Map<string, number>;
  animalsByCell: number[][];
  casesByCell: number[][];
  careByCell: number[][];
  sightingsByCell: number[][];
  casesByAnimal: number[][];
  careByAnimal: number[][];
  nAnimals: number;
  nCases: number;
  nCare: number;
  nSightings: number;
};

export function buildIndex(ds: SpatialDataset): Index {
  const n = ds.cells.length;
  const mk = () => Array.from({ length: n }, () => [] as number[]);
  const animalsByCell = mk(), casesByCell = mk(), careByCell = mk(), sightingsByCell = mk();
  const nAnimals = Math.floor(ds.animals.length / A_STRIDE);
  const nCases = Math.floor(ds.cases.length / C_STRIDE);
  const nCare = Math.floor(ds.care.length / K_STRIDE);
  const nSightings = Math.floor(ds.sightings.length / S_STRIDE);
  const casesByAnimal = Array.from({ length: nAnimals }, () => [] as number[]);
  const careByAnimal = Array.from({ length: nAnimals }, () => [] as number[]);
  for (let i = 0; i < nAnimals; i++) animalsByCell[ds.animals[i * A_STRIDE + A.cell]].push(i);
  for (let i = 0; i < nCases; i++) {
    casesByCell[ds.cases[i * C_STRIDE + C.cell]].push(i);
    const a = ds.cases[i * C_STRIDE + C.animal];
    if (a >= 0) casesByAnimal[a].push(i);
  }
  for (let i = 0; i < nCare; i++) {
    careByCell[ds.care[i * K_STRIDE + K.cell]].push(i);
    const a = ds.care[i * K_STRIDE + K.animal];
    if (a >= 0) careByAnimal[a].push(i);
  }
  for (let i = 0; i < nSightings; i++) sightingsByCell[ds.sightings[i * S_STRIDE + S.cell]].push(i);
  return {
    cellByKey: new Map(ds.cells.map((k, i) => [k, i])),
    animalsByCell, casesByCell, careByCell, sightingsByCell, casesByAnimal, careByAnimal,
    nAnimals, nCases, nCare, nSightings,
  };
}

/* ── the pieces of a record, read ─────────────────────────────────────── */

export const animal = (ds: SpatialDataset, i: number) => {
  const o = i * A_STRIDE, f = ds.animals[o + A.flags];
  return {
    cell: ds.animals[o + A.cell], city: ds.animals[o + A.city],
    first: ds.animals[o + A.first], last: ds.animals[o + A.last],
    locality: ds.animals[o + A.locality], sightings: ds.animals[o + A.sightings],
    lastVacc: ds.animals[o + A.lastVacc], org: ds.animals[o + A.org],
    help: !!(f & AF.help), injured: !!(f & AF.injured),
    ster: f & AF.sterYes ? "yes" : f & AF.sterNo ? "no" : "unknown",
    vacc: f & AF.vaccYes ? "yes" : f & AF.vaccNo ? "no" : "unknown",
    photo: !!(f & AF.photo), earNotch: !!(f & AF.earNotch),
    resident: !!(f & AF.resident), exact: !!(f & AF.exact),
  } as const;
};

export const kase = (ds: SpatialDataset, i: number) => {
  const o = i * C_STRIDE;
  const status = STATUSES[ds.cases[o + C.status]] ?? "unknown";
  return {
    cell: ds.cases[o + C.cell], animal: ds.cases[o + C.animal], day: ds.cases[o + C.day],
    condition: (CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded") as Condition,
    status, closure: ds.cases[o + C.closure], intake: ds.cases[o + C.intake],
    firstAction: ds.cases[o + C.firstAction], closedDay: ds.cases[o + C.closedDay],
    reliable: ds.cases[o + C.reliable] === 1, severity: ds.cases[o + C.severity],
    fuDone: ds.cases[o + C.fuDone], fuMissed: ds.cases[o + C.fuMissed], fuUp: ds.cases[o + C.fuUp],
    org: ds.cases[o + C.org], resident: ds.cases[o + C.source] === 1,
  };
};

/** Is the case open on day t? Closed cases close on their recorded or assumed day. */
export const openOn = (ds: SpatialDataset, i: number, t: number) => {
  const o = i * C_STRIDE, day = ds.cases[o + C.day], closed = ds.cases[o + C.closedDay];
  if (day > t || day < 0) return false;
  return closed < 0 || closed > t;
};

export const triage = (c: Condition, overrides?: Partial<Record<string, Triage>>): Triage =>
  overrides?.[c] ?? DEFAULT_TRIAGE[c] ?? "Routine";

export function animalVisible(ds: SpatialDataset, i: number, t: number, f: Filters): boolean {
  const o = i * A_STRIDE, flags = ds.animals[o + A.flags];
  const first = ds.animals[o + A.first];
  if (first > t) return false;
  if (f.ster === "yes" && !(flags & AF.sterYes)) return false;
  if (f.ster === "unknown" && (flags & (AF.sterYes | AF.sterNo))) return false;
  if (f.vacc === "yes" && !(flags & AF.vaccYes)) return false;
  if (f.vacc === "unknown" && (flags & (AF.vaccYes | AF.vaccNo))) return false;
  if (f.vacc === "due") { const lv = ds.animals[o + A.lastVacc]; if (!(lv >= 0 && lv <= t && lv < t - 365)) return false; }
  if (f.health === "help" && !(flags & AF.help)) return false;
  if (f.health === "injured" && !(flags & (AF.injured | AF.help))) return false;
  const last = Math.min(Math.max(ds.animals[o + A.last], first), t);
  if (f.seen === "90" && last < t - 90) return false;
  if (f.seen === "365" && last < t - 365) return false;
  const resident = !!(flags & AF.resident);
  if (f.source === "field" && resident) return false;
  if (f.source === "resident" && !resident) return false;
  return true;
}

export type CellStat = {
  cell: number;
  animals: number;
  help: number;
  injured: number;
  sterYes: number;
  sterNo: number;
  vaccYes: number;
  vaccNo: number;
  due: number;
  resident: number;
  photo: number;
  /** Everything recorded up to t, ignoring filters: the basis of coverage. */
  observed: number;
  cases: number;
  open: number;
  critical: number;
  noAction: number;
  couldNotLocate: number;
  care: number;
  abc: number;
  arv: number;
  sightings: number;
  events: number;
  recentEvents: number;
  lastActivity: number;
  coverage: Coverage;
};

export function coverageOf(observed: number, since: number, events: number): Coverage {
  if (observed >= 8 && since <= 180) return "strong";
  if (observed >= 3 && since <= 365) return "partial";
  if (observed >= 3 || (observed > 0 && events >= 3)) return "weak";
  if (observed > 0 || events > 0) return "insufficient";
  return "unmapped";
}

/** Every cell's state on day t, under the filters. */
export function cellStats(ds: SpatialDataset, ix: Index, t: number, f: Filters = NO_FILTERS, city = -1): CellStat[] {
  const out: CellStat[] = [];
  const COULD_NOT = ds.dict.closure.indexOf("could_not_locate");
  const NO_ACTION = STATUSES.indexOf("no_action");
  const ABC = ds.dict.care.indexOf("sterilisation");
  const ARV = ds.dict.care.indexOf("vaccination");
  for (let c = 0; c < ds.cells.length; c++) {
    if (city >= 0 && ds.cellCity[c] !== city) continue;
    const s: CellStat = {
      cell: c, animals: 0, help: 0, injured: 0, sterYes: 0, sterNo: 0, vaccYes: 0, vaccNo: 0, due: 0, resident: 0, photo: 0,
      observed: 0, cases: 0, open: 0, critical: 0, noAction: 0, couldNotLocate: 0, care: 0, abc: 0, arv: 0, sightings: 0,
      events: 0, recentEvents: 0, lastActivity: -1, coverage: "unmapped",
    };
    for (const i of ix.animalsByCell[c]) {
      const o = i * A_STRIDE, first = ds.animals[o + A.first];
      if (first > t) continue;
      s.observed++;
      s.lastActivity = Math.max(s.lastActivity, Math.min(Math.max(ds.animals[o + A.last], first), t));
      if (!animalVisible(ds, i, t, f)) continue;
      const fl = ds.animals[o + A.flags];
      s.animals++;
      if (fl & AF.help) s.help++;
      if (fl & AF.injured) s.injured++;
      if (fl & AF.sterYes) s.sterYes++;
      if (fl & AF.sterNo) s.sterNo++;
      if (fl & AF.vaccYes) s.vaccYes++;
      if (fl & AF.vaccNo) s.vaccNo++;
      if (fl & AF.resident) s.resident++;
      if (fl & AF.photo) s.photo++;
      const lv = ds.animals[o + A.lastVacc];
      if (lv >= 0 && lv <= t && lv < t - 365) s.due++;
    }
    for (const i of ix.casesByCell[c]) {
      const o = i * C_STRIDE, day = ds.cases[o + C.day];
      if (day > t || day < 0) continue;
      if (f.condition >= 0 && ds.cases[o + C.cond] !== f.condition) continue;
      if (f.source === "field" && ds.cases[o + C.source] === 1) continue;
      if (f.source === "resident" && ds.cases[o + C.source] !== 1) continue;
      s.cases++; s.events++;
      if (day > t - 365) s.recentEvents++;
      s.lastActivity = Math.max(s.lastActivity, day);
      if (ds.cases[o + C.status] === NO_ACTION) s.noAction++;
      if (ds.cases[o + C.closure] === COULD_NOT) s.couldNotLocate++;
      if (openOn(ds, i, t)) {
        s.open++;
        if (DEFAULT_TRIAGE[(CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded") as Condition] === "Critical") s.critical++;
      }
    }
    for (const i of ix.careByCell[c]) {
      const o = i * K_STRIDE, day = ds.care[o + K.day];
      if (day > t || day < 0) continue;
      s.care++; s.events++;
      if (day > t - 365) s.recentEvents++;
      s.lastActivity = Math.max(s.lastActivity, day);
      if (ds.care[o + K.kind] === ABC) s.abc++;
      if (ds.care[o + K.kind] === ARV) s.arv++;
    }
    for (const i of ix.sightingsByCell[c]) {
      const o = i * S_STRIDE, day = ds.sightings[o + S.day];
      if (day > t || day < 0) continue;
      s.sightings++; s.events++;
      if (day > t - 365) s.recentEvents++;
      s.lastActivity = Math.max(s.lastActivity, day);
    }
    const since = s.lastActivity < 0 ? Infinity : t - s.lastActivity;
    s.coverage = coverageOf(s.observed, since, s.events);
    out.push(s);
  }
  return out;
}

/** The value a mode colours a cell by. */
export function modeValue(mode: Mode, s: CellStat): number {
  switch (mode) {
    case "animals":
    case "density":
    case "coverage":
    case "abc":
    case "arv":
      return s.animals;
    case "medical":
      return s.injured + s.help;
    case "cases":
      return s.open;
    case "activity":
      return s.recentEvents;
  }
}

/** Quantile breaks over the non-zero values, so a ramp spends its steps where the data is. */
export function breaks(values: number[], steps = 5): number[] {
  const v = values.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return [1];
  const out: number[] = [];
  for (let k = 1; k < steps; k++) out.push(v[Math.min(v.length - 1, Math.floor((k / steps) * v.length))]);
  return [...new Set(out)];
}
export const rankOf = (v: number, br: number[]) => {
  if (v <= 0) return -1;
  const i = br.findIndex((b) => v <= b);
  return i === -1 ? br.length : i;
};

/* ── selections: city, locality, cell, set of cells ──────────────────── */

export type Selection =
  | { t: "all" }
  | { t: "city"; city: number }
  | { t: "locality"; city: number; locality: number }
  | { t: "cell"; cell: number };

export function selectionCells(ds: SpatialDataset, sel: Selection): Set<number> | null {
  if (sel.t === "all") return null;
  const out = new Set<number>();
  for (let c = 0; c < ds.cells.length; c++) {
    if (sel.t === "city" && ds.cellCity[c] === sel.city) out.add(c);
    else if (sel.t === "locality" && ds.cellCity[c] === sel.city && ds.cellLocality[c] === sel.locality) out.add(c);
    else if (sel.t === "cell" && c === sel.cell) out.add(c);
  }
  return out;
}

export function selectionLabel(ds: SpatialDataset, sel: Selection): string {
  if (sel.t === "all") return "India";
  if (sel.t === "city") return ds.cities[sel.city]?.name ?? "City";
  if (sel.t === "locality") return ds.localities[sel.locality] ?? "Locality";
  const loc = ds.cellLocality[sel.cell];
  return loc >= 0 ? `${ds.localities[loc]} cell` : "This cell";
}

export const cellCenter = (ds: SpatialDataset, c: number): [number, number] => [ds.centers[c * 2], ds.centers[c * 2 + 1]];
export const cellRing = (ds: SpatialDataset, c: number): [number, number][] => {
  const r = ds.rings[c], out: [number, number][] = [];
  for (let i = 0; i < r.length; i += 2) out.push([r[i], r[i + 1]]);
  return out;
};

/** Scale a ring towards its centre: the "recorded share" drawn inside a cell. */
export const scaleRing = (ring: [number, number][], c: [number, number], k: number): [number, number][] =>
  ring.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);

/* ── time ─────────────────────────────────────────────────────────────── */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthOfDay = (day: number) => { const d = new Date(Date.UTC(2024, 0, 1) + day * 86_400_000); return (d.getUTCFullYear() - 2024) * 12 + d.getUTCMonth(); };
export const monthEndDay = (m: number) => Math.round((Date.UTC(2024, m + 1, 0) - Date.UTC(2024, 0, 1)) / 86_400_000);
export const monthStartDay = (m: number) => Math.round((Date.UTC(2024, m, 1) - Date.UTC(2024, 0, 1)) / 86_400_000);
export const monthLabel = (m: number, long = false) => `${long ? ["January","February","March","April","May","June","July","August","September","October","November","December"][((m % 12) + 12) % 12] : MONTHS[((m % 12) + 12) % 12]} ${2024 + Math.floor(m / 12)}`;
export const dayLabel = (day: number) => { const d = new Date(Date.UTC(2024, 0, 1) + day * 86_400_000); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export const fmt = (n: number) => n.toLocaleString("en-IN");
export const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
