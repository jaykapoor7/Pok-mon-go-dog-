/* ════════════════════════════════════════════════════════════════════
   Measures: the numbers analytics prints, each one with its denominator
   and its unknown.

   Every share here returns { known, unknown, total } or a list of parts
   whose last part is "not recorded" — never a bare percentage — so the
   screen can hatch what nobody wrote down instead of quietly dropping it.
   ════════════════════════════════════════════════════════════════════ */

import { A, A_STRIDE, AF, C, C_STRIDE, K, K_STRIDE, type SpatialDataset } from "./types";
import { monthOfDay, openOn, type Index } from "./engine";
import { CONDITIONS, STATUSES, type Condition, type StatusClass } from "@/lib/register/taxonomy";

export type Scope = { cells: Set<number> | null; from: number; to: number; condition?: number; source?: "all" | "field" | "resident" };

export const inScope = (cells: Set<number> | null, c: number) => !cells || cells.has(c);

/** Cases whose request date falls in the period, inside the selected cells. */
export function casesIn(ds: SpatialDataset, s: Scope): number[] {
  const out: number[] = [];
  const n = Math.floor(ds.cases.length / C_STRIDE);
  for (let i = 0; i < n; i++) {
    const o = i * C_STRIDE, day = ds.cases[o + C.day];
    if (day < s.from || day > s.to || day < 0) continue;
    if (!inScope(s.cells, ds.cases[o + C.cell])) continue;
    if (s.condition != null && s.condition >= 0 && ds.cases[o + C.cond] !== s.condition) continue;
    if (s.source === "field" && ds.cases[o + C.source] === 1) continue;
    if (s.source === "resident" && ds.cases[o + C.source] !== 1) continue;
    out.push(i);
  }
  return out;
}

export type ConditionRow = { condition: Condition; index: number; total: number; by: Record<StatusClass, number>; noActionShare: number };

export function conditionOutcome(ds: SpatialDataset, idx: number[]): ConditionRow[] {
  const rows = new Map<number, ConditionRow>();
  for (const i of idx) {
    const o = i * C_STRIDE, ci = ds.cases[o + C.cond], st = (STATUSES[ds.cases[o + C.status]] ?? "unknown") as StatusClass;
    let r = rows.get(ci);
    if (!r) {
      r = { condition: (CONDITIONS[ci] ?? "Not recorded") as Condition, index: ci, total: 0, by: Object.fromEntries(STATUSES.map((x) => [x, 0])) as Record<StatusClass, number>, noActionShare: 0 };
      rows.set(ci, r);
    }
    r.total++; r.by[st]++;
  }
  const out = [...rows.values()];
  for (const r of out) r.noActionShare = r.total ? r.by.no_action / r.total : 0;
  return out.sort((a, b) => (a.condition === "Not recorded" ? 1 : 0) - (b.condition === "Not recorded" ? 1 : 0) || b.total - a.total);
}

export function statusTotals(ds: SpatialDataset, idx: number[]) {
  const by = Object.fromEntries(STATUSES.map((x) => [x, 0])) as Record<StatusClass, number>;
  for (const i of idx) by[(STATUSES[ds.cases[i * C_STRIDE + C.status]] ?? "unknown") as StatusClass]++;
  return by;
}

export function closureReasons(ds: SpatialDataset, idx: number[]) {
  const NO = STATUSES.indexOf("no_action"), NA = STATUSES.indexOf("not_attended");
  const counts = new Map<number, number>();
  let total = 0;
  for (const i of idx) {
    const o = i * C_STRIDE, st = ds.cases[o + C.status];
    if (st !== NO && st !== NA) continue;
    total++;
    const r = ds.cases[o + C.closure];
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const unspecified = ds.dict.closure.indexOf("unspecified");
  return {
    total,
    parts: [...counts.entries()]
      .map(([r, n]) => ({ reason: r >= 0 ? ds.dict.closure[r] : "unspecified", n }))
      .sort((a, b) => (a.reason === "unspecified" ? 1 : 0) - (b.reason === "unspecified" ? 1 : 0) || b.n - a.n),
    unspecified: counts.get(unspecified) ?? 0,
  };
}

/** Requests per calendar month, from the first month to the last. */
export function monthly(ds: SpatialDataset, idx: number[], from: number, to: number) {
  const m0 = monthOfDay(Math.max(0, from)), m1 = monthOfDay(to);
  const n = Math.max(1, m1 - m0 + 1);
  const total = new Array(n).fill(0), noAction = new Array(n).fill(0), open = new Array(n).fill(0);
  const NO = STATUSES.indexOf("no_action");
  for (const i of idx) {
    const o = i * C_STRIDE, m = monthOfDay(ds.cases[o + C.day]) - m0;
    if (m < 0 || m >= n) continue;
    total[m]++;
    if (ds.cases[o + C.status] === NO) noAction[m]++;
    if (ds.cases[o + C.closedDay] < 0) open[m]++;
  }
  return { m0, total, noAction, open };
}

export const FIRST_ACTION_BINS = ["Same day", "1–3 days", "4–7 days", "8–30 days", "Over 30 days", "Not recorded"] as const;
export function firstAction(ds: SpatialDataset, idx: number[]) {
  const bins = new Array(FIRST_ACTION_BINS.length).fill(0);
  const values: number[] = [];
  for (const i of idx) {
    const d = ds.cases[i * C_STRIDE + C.firstAction];
    if (d < 0) { bins[5]++; continue; }
    values.push(d);
    bins[d === 0 ? 0 : d <= 3 ? 1 : d <= 7 ? 2 : d <= 30 ? 3 : 4]++;
  }
  values.sort((a, b) => a - b);
  const q = (f: number) => (values.length ? values[Math.min(values.length - 1, Math.floor(f * values.length))] : null);
  return { bins, known: values.length, unknown: bins[5], median: q(0.5), p75: q(0.75), p90: q(0.9) };
}

/** Time to resolution, from recorded resolution dates only. Imported dates that had to be assumed are left out. */
export function resolution(ds: SpatialDataset, idx: number[]) {
  const values: number[] = [];
  let excluded = 0;
  for (const i of idx) {
    const o = i * C_STRIDE, closed = ds.cases[o + C.closedDay];
    if (closed < 0) continue;
    if (ds.cases[o + C.reliable] !== 1) { excluded++; continue; }
    values.push(closed - ds.cases[o + C.day]);
  }
  values.sort((a, b) => a - b);
  return { known: values.length, excluded, median: values.length ? values[Math.floor(values.length / 2)] : null };
}

export function followups(ds: SpatialDataset, idx: number[]) {
  let done = 0, missed = 0, upcoming = 0, withAny = 0;
  for (const i of idx) {
    const o = i * C_STRIDE, d = ds.cases[o + C.fuDone], m = ds.cases[o + C.fuMissed], u = ds.cases[o + C.fuUp];
    done += d; missed += m; upcoming += u;
    if (d + m + u > 0) withAny++;
  }
  return { done, missed, upcoming, total: done + missed + upcoming, casesWithFollowups: withAny, cases: idx.length };
}

export function intakeMix(ds: SpatialDataset, idx: number[]) {
  const NO = STATUSES.indexOf("no_action");
  const m = new Map<number, { n: number; noAction: number }>();
  for (const i of idx) {
    const o = i * C_STRIDE, k = ds.cases[o + C.intake];
    const v = m.get(k) ?? { n: 0, noAction: 0 };
    v.n++; if (ds.cases[o + C.status] === NO) v.noAction++;
    m.set(k, v);
  }
  return [...m.entries()].map(([k, v]) => ({ intake: k >= 0 ? ds.dict.intake[k] : "not_recorded", ...v })).sort((a, b) => b.n - a.n);
}

export const AGE_BINS = ["0–7 days", "8–30 days", "31–90 days", "Over 90 days"] as const;
/** Open work by how long it has been open, on day t. */
export function openAging(ds: SpatialDataset, idx: number[], t: number) {
  const bins = [0, 0, 0, 0];
  const stale: number[] = [];
  for (const i of idx) {
    if (!openOn(ds, i, t)) continue;
    const age = t - ds.cases[i * C_STRIDE + C.day];
    bins[age <= 7 ? 0 : age <= 30 ? 1 : age <= 90 ? 2 : 3]++;
    if (age > 90) stale.push(i);
  }
  return { bins, stale, open: bins.reduce((a, b) => a + b, 0) };
}

export function careKinds(ds: SpatialDataset, ix: Index, s: Scope) {
  const counts = new Array(ds.dict.care.length).fill(0);
  const n = ix.nCare;
  for (let i = 0; i < n; i++) {
    const o = i * K_STRIDE, day = ds.care[o + K.day];
    if (day < s.from || day > s.to) continue;
    if (!inScope(s.cells, ds.care[o + K.cell])) continue;
    counts[ds.care[o + K.kind]]++;
  }
  return ds.dict.care.map((k, i) => ({ kind: k, n: counts[i] })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
}

/** What is known about the animals in scope: the heart of "low recorded ≠ low actual". */
export function animalKnowledge(ds: SpatialDataset, ix: Index, cells: Set<number> | null, t: number) {
  let total = 0, sterYes = 0, sterNo = 0, vaccYes = 0, vaccNo = 0, photo = 0, earNotch = 0, resident = 0, help = 0, due = 0;
  for (let i = 0; i < ix.nAnimals; i++) {
    const o = i * A_STRIDE;
    if (!inScope(cells, ds.animals[o + A.cell])) continue;
    if (ds.animals[o + A.first] > t) continue;
    const f = ds.animals[o + A.flags];
    total++;
    if (f & AF.sterYes) sterYes++;
    if (f & AF.sterNo) sterNo++;
    if (f & AF.vaccYes) vaccYes++;
    if (f & AF.vaccNo) vaccNo++;
    if (f & AF.photo) photo++;
    if (f & AF.earNotch) earNotch++;
    if (f & AF.resident) resident++;
    if (f & AF.help) help++;
    const lv = ds.animals[o + A.lastVacc];
    if (lv >= 0 && lv < t - 365) due++;
  }
  return {
    total, resident, help, due,
    ster: { yes: sterYes, no: sterNo, unknown: total - sterYes - sterNo },
    vacc: { yes: vaccYes, no: vaccNo, unknown: total - vaccYes - vaccNo },
    photo: { yes: photo, unknown: total - photo },
    earNotch,
  };
}

/** Localities in scope, by demand and by how often demand fails to become field work. */
export function localityTable(ds: SpatialDataset, ix: Index, s: Scope, t: number) {
  const NO = STATUSES.indexOf("no_action");
  const rows = new Map<number, { locality: number; city: number; cells: Set<number>; animals: number; cases: number; noAction: number; open: number; years: Set<number>; last: number }>();
  const get = (c: number) => {
    const l = ds.cellLocality[c];
    if (l < 0) return null;
    let r = rows.get(l);
    if (!r) { r = { locality: l, city: ds.cellCity[c], cells: new Set(), animals: 0, cases: 0, noAction: 0, open: 0, years: new Set(), last: -1 }; rows.set(l, r); }
    r.cells.add(c);
    return r;
  };
  for (const i of casesIn(ds, s)) {
    const o = i * C_STRIDE, r = get(ds.cases[o + C.cell]);
    if (!r) continue;
    r.cases++;
    if (ds.cases[o + C.status] === NO) r.noAction++;
    if (openOn(ds, i, t)) r.open++;
    r.years.add(Math.floor(monthOfDay(ds.cases[o + C.day]) / 12));
    r.last = Math.max(r.last, ds.cases[o + C.day]);
  }
  for (let i = 0; i < ix.nAnimals; i++) {
    const o = i * A_STRIDE;
    if (!inScope(s.cells, ds.animals[o + A.cell])) continue;
    const r = rows.get(ds.cellLocality[ds.animals[o + A.cell]]);
    if (r) r.animals++;
  }
  return [...rows.values()].map((r) => ({ ...r, name: ds.localities[r.locality], yearsActive: r.years.size }));
}
