/* ════════════════════════════════════════════════════════════════════
   The report: what the analytics chapters compute from the dataset.

   Everything here is a pure function of (dataset, the cases in scope) so
   the same numbers answer the public /insights and an organisation's
   /partner/reports, on the server for the first paint and in the browser
   as the reader filters. Like measures.ts, nothing returns a bare rate: a
   share carries its denominator, and "not recorded" is its own part.
   ════════════════════════════════════════════════════════════════════ */

import { A, A_STRIDE, AF, C, C_STRIDE, K, K_STRIDE, RES, type SpatialDataset } from "./types";
import { monthOfDay, robustStart, yearOfMonth, type Index } from "./engine";
import { inScope } from "./measures";
import { STATUSES } from "@/lib/register/taxonomy";

/* ── fate: what happened to a request ─────────────────────────────── */

/** In reading order: done, passed on, not done, not reached, still going, not started, not known. */
export const FATES = ["closed", "other_ngo", "no_action", "not_attended", "in_progress", "open", "unknown"] as const;
export type Fate = (typeof FATES)[number];
export const FATE_META: Record<Fate, { label: string; short: string; color: string; hatch?: boolean }> = {
  closed: { label: "Closed after field work", short: "Closed", color: "var(--sp-st-closed)" },
  other_ngo: { label: "Handed to another organisation", short: "Handed on", color: "var(--sp-st-other)" },
  no_action: { label: "Closed without field action", short: "No action", color: "var(--sp-st-noaction)" },
  not_attended: { label: "Not attended", short: "Not attended", color: "var(--sp-st-unattended)" },
  in_progress: { label: "Still in progress", short: "In progress", color: "var(--sp-st-progress)" },
  open: { label: "Open, not started", short: "Open", color: "var(--sp-st-open)" },
  unknown: { label: "Outcome not recorded", short: "Not recorded", color: "transparent", hatch: true },
};
const fateOf = (ds: SpatialDataset, i: number): Fate => (STATUSES[ds.cases[i * C_STRIDE + C.status]] ?? "unknown") as Fate;
const zeroFates = () => Object.fromEntries(FATES.map((f) => [f, 0])) as Record<Fate, number>;

export function fates(ds: SpatialDataset, idx: number[]) {
  const by = zeroFates();
  for (const i of idx) by[fateOf(ds, i)]++;
  return by;
}

/** The ledger wall: every request in the period, by the month it came in and what happened to it. */
export function ledger(ds: SpatialDataset, idx: number[], from: number, to: number) {
  const start = robustStart(idx.map((i) => ds.cases[i * C_STRIDE + C.day]));
  const m0 = monthOfDay(Math.max(from, start >= 0 ? start : from)), m1 = monthOfDay(to);
  const months = Array.from({ length: Math.max(1, m1 - m0 + 1) }, (_, k) => ({ m: m0 + k, total: 0, by: zeroFates() }));
  for (const i of idx) {
    const k = Math.max(0, monthOfDay(ds.cases[i * C_STRIDE + C.day]) - m0);
    if (k >= months.length) continue;
    months[k].total++;
    months[k].by[fateOf(ds, i)]++;
  }
  return { m0, months };
}

/* ── when: the rhythm of the year ─────────────────────────────────── */

/** Requests by calendar month and year, the months busier than usual, and this year against last. */
export function season(ds: SpatialDataset, idx: number[], today: number) {
  const mToday = monthOfDay(today);
  const counts = new Map<number, number>();
  for (const i of idx) { const m = monthOfDay(ds.cases[i * C_STRIDE + C.day]); counts.set(m, (counts.get(m) ?? 0) + 1); }
  const ms = [...counts.keys()];
  if (!ms.length) return { years: [] as { year: number; months: (number | null)[] }[], peaks: [] as number[], mean: 0, yoy: null as null | { months: number; now: number; before: number }, surge: null as null | { year: number; month: number; ratio: number } };
  const mFirst = Math.min(...ms);
  const y0 = yearOfMonth(mFirst), y1 = yearOfMonth(mToday);
  const years = [];
  for (let y = y0; y <= y1; y++) {
    const months: (number | null)[] = [];
    for (let k = 0; k < 12; k++) {
      const m = (y - yearOfMonth(0)) * 12 + k;
      // Before the record starts, or after this month, is "no record", not zero.
      months.push(m < mFirst || m > mToday ? null : counts.get(m) ?? 0);
    }
    years.push({ year: y, months });
  }
  // A season is a month that is busier than its own year's average in
  // EVERY year that has it — not a month that was busy once. One surge
  // (a campaign, a backlog entered at once) is reported as a surge.
  const all = years.flatMap((y) => y.months.filter((v): v is number => v !== null));
  const mean = all.reduce((a, b) => a + b, 0) / Math.max(1, all.length);
  const yMean = years.map((y) => { const v = y.months.filter((x): x is number => x !== null); return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length); });
  const peaks: number[] = [];
  for (let k = 0; k < 12; k++) {
    const have = years.map((y, i) => ({ v: y.months[k], m: yMean[i] })).filter((x): x is { v: number; m: number } => x.v !== null && x.m > 0);
    if (have.length >= 2 && have.every((x) => x.v >= x.m * 1.15)) peaks.push(k);
  }
  let surge: { year: number; month: number; ratio: number } | null = null;
  years.forEach((y, i) => y.months.forEach((v, k) => {
    if (v !== null && yMean[i] > 0 && v / yMean[i] >= 2 && (!surge || v / yMean[i] > surge.ratio)) surge = { year: y.year, month: k, ratio: v / yMean[i] };
  }));
  // This year so far against the same months last year.
  const cur = years[years.length - 1], prev = years[years.length - 2];
  let yoy = null;
  if (cur && prev) {
    const done = mToday % 12; // months fully elapsed this year
    let now = 0, before = 0;
    for (let k = 0; k < done; k++) { now += cur.months[k] ?? 0; before += prev.months[k] ?? 0; }
    if (done >= 2 && before > 0) yoy = { months: done, now, before };
  }
  return { years, peaks, mean, yoy, surge: surge as null | { year: number; month: number; ratio: number } };
}

/* ── where ────────────────────────────────────────────────────────── */

/** Requests per cell for each year: the footprint of the work, year on year. */
export function footprints(ds: SpatialDataset, idx: number[]) {
  const byYear = new Map<number, Map<number, number>>();
  for (const i of idx) {
    const o = i * C_STRIDE, y = yearOfMonth(monthOfDay(ds.cases[o + C.day])), c = ds.cases[o + C.cell];
    const m = byYear.get(y) ?? new Map<number, number>();
    m.set(c, (m.get(c) ?? 0) + 1);
    byYear.set(y, m);
  }
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, cells]) => ({ year, cells, total: [...cells.values()].reduce((a, b) => a + b, 0) }));
}

/** What happened to requests, cell by cell. */
export function cellOutcomes(ds: SpatialDataset, idx: number[]) {
  const COULD_NOT = ds.dict.closure.indexOf("could_not_locate");
  const NO = STATUSES.indexOf("no_action"), NA = STATUSES.indexOf("not_attended");
  const out = new Map<number, { n: number; noAction: number; couldNotLocate: number }>();
  for (const i of idx) {
    const o = i * C_STRIDE, c = ds.cases[o + C.cell], st = ds.cases[o + C.status];
    const v = out.get(c) ?? { n: 0, noAction: 0, couldNotLocate: 0 };
    v.n++;
    if (st === NO || st === NA) v.noAction++;
    if (ds.cases[o + C.closure] === COULD_NOT) v.couldNotLocate++;
    out.set(c, v);
  }
  return out;
}

/** Places that ask every year. The register cannot yet say whether an animal
    came back — each imported case made its own animal — but it can say
    which places keep calling. */
export function repeatPlaces(ds: SpatialDataset, idx: number[]) {
  const rows = new Map<number, { locality: number; city: number; years: Map<number, number>; total: number; noAction: number }>();
  const NO = STATUSES.indexOf("no_action");
  for (const i of idx) {
    const o = i * C_STRIDE, c = ds.cases[o + C.cell], l = ds.cellLocality[c];
    if (l < 0) continue;
    const r = rows.get(l) ?? { locality: l, city: ds.cellCity[c], years: new Map(), total: 0, noAction: 0 };
    const y = yearOfMonth(monthOfDay(ds.cases[o + C.day]));
    r.years.set(y, (r.years.get(y) ?? 0) + 1);
    r.total++;
    if (ds.cases[o + C.status] === NO) r.noAction++;
    rows.set(l, r);
  }
  return [...rows.values()]
    .map((r) => ({ ...r, name: ds.localities[r.locality], nYears: r.years.size }))
    .sort((a, b) => b.nYears - a.nYears || b.total - a.total);
}

/* ── evidence: what is not known ──────────────────────────────────── */

export type Completeness = { key: string; label: string; of: string; known: number; partial?: number; total: number; next: string };

/** How much of each field the register actually holds, for the cases and animals in scope. */
export function completeness(ds: SpatialDataset, ix: Index, idx: number[], cells: Set<number> | null, t: number): Completeness[] {
  const NOTREC = ds.dict.condition.indexOf("Not recorded");
  const UNK = STATUSES.indexOf("unknown"), NO = STATUSES.indexOf("no_action"), NA = STATUSES.indexOf("not_attended"), CLOSED = STATUSES.indexOf("closed");
  const UNSPEC = ds.dict.closure.indexOf("unspecified");
  let cond = 0, status = 0, noActionN = 0, why = 0, intake = 0, first = 0, closedN = 0, dateRec = 0, dateWb = 0;
  for (const i of idx) {
    const o = i * C_STRIDE, st = ds.cases[o + C.status];
    if (ds.cases[o + C.cond] !== NOTREC) cond++;
    if (st !== UNK) status++;
    if (st === NO || st === NA) { noActionN++; const r = ds.cases[o + C.closure]; if (r >= 0 && r !== UNSPEC) why++; }
    if (ds.cases[o + C.intake] >= 0) intake++;
    if (ds.cases[o + C.firstAction] >= 0) first++;
    if (st === CLOSED) { closedN++; const src = ds.cases[o + C.resolvedSrc]; if (src === RES.recorded) dateRec++; else if (src === RES.workbook) dateWb++; }
  }
  let animals = 0, ster = 0, vacc = 0, photo = 0, exact = 0;
  for (let i = 0; i < ix.nAnimals; i++) {
    const o = i * A_STRIDE;
    if (!inScope(cells, ds.animals[o + A.cell]) || ds.animals[o + A.first] > t) continue;
    const f = ds.animals[o + A.flags];
    animals++;
    if (f & (AF.sterYes | AF.sterNo)) ster++;
    if (f & (AF.vaccYes | AF.vaccNo)) vacc++;
    if (f & AF.photo) photo++;
    if (f & AF.exact) exact++;
  }
  const n = idx.length;
  return [
    { key: "cond", label: "What was wrong", of: "requests", known: cond, total: n, next: "a condition for every request" },
    { key: "status", label: "What happened", of: "requests", known: status, total: n, next: "an outcome for every request" },
    { key: "why", label: "Why it closed without action", of: "requests closed without action", known: why, total: noActionN, next: "why a request closed without action — “could not locate” is a different problem from “caller unreachable”" },
    { key: "intake", label: "How the request came in", of: "requests", known: intake, total: n, next: "how each request arrived" },
    { key: "first", label: "When field work began", of: "requests", known: first, total: n, next: "the day field work began" },
    { key: "closed", label: "When it was closed", of: "closed cases", known: dateRec, partial: dateWb, total: closedN, next: "the day each case closed — without it, time to resolution cannot be measured" },
    { key: "ster", label: "Sterilisation status", of: "animals", known: ster, total: animals, next: "whether each animal is sterilised, including “no”" },
    { key: "vacc", label: "Vaccination status", of: "animals", known: vacc, total: animals, next: "whether each animal is vaccinated, including “no”" },
    { key: "photo", label: "A photograph", of: "animals", known: photo, total: animals, next: "a photograph, so the animal can be recognised again" },
    { key: "exact", label: "An exact location", of: "animals", known: exact, total: animals, next: "an exact location instead of a locality centre" },
  ];
}

/** Records dated after today: data-entry errors, counted as an evidence issue rather than drawn. */
export function futureDated(ds: SpatialDataset) {
  let n = 0;
  for (let i = 0; i < ds.cases.length; i += C_STRIDE) if (ds.cases[i + C.day] > ds.today) n++;
  for (let i = 0; i < ds.care.length; i += K_STRIDE) if (ds.care[i + K.day] > ds.today) n++;
  return n;
}

/* ── intervention ─────────────────────────────────────────────────── */

/** Care recorded per month by kind, for the care in scope. */
export function careMonthly(ds: SpatialDataset, ix: Index, cells: Set<number> | null, from: number, to: number) {
  const m0 = monthOfDay(Math.max(0, from)), m1 = monthOfDay(to);
  const n = Math.max(1, m1 - m0 + 1);
  const byKind = new Map<number, number[]>();
  for (let i = 0; i < ix.nCare; i++) {
    const o = i * K_STRIDE, day = ds.care[o + K.day];
    if (day < from || day > to || !inScope(cells, ds.care[o + K.cell])) continue;
    const k = ds.care[o + K.kind], m = Math.max(0, monthOfDay(day) - m0);
    if (m >= n) continue;
    const v = byKind.get(k) ?? new Array(n).fill(0);
    v[m]++;
    byKind.set(k, v);
  }
  return { m0, byKind };
}

/** TVT (transmissible venereal tumour) is treated with a course of weekly
    chemotherapy, usually four to six doses. Sessions recorded per animal say
    whether courses are being finished — or only started on paper. */
export function courses(ds: SpatialDataset, ix: Index, cells: Set<number> | null, from: number, to: number, kind = "chemotherapy") {
  const K_ = ds.dict.care.indexOf(kind);
  const per = new Map<number, number>();
  let orphan = 0;
  for (let i = 0; i < ix.nCare; i++) {
    const o = i * K_STRIDE, day = ds.care[o + K.day];
    if (ds.care[o + K.kind] !== K_ || day < from || day > to || !inScope(cells, ds.care[o + K.cell])) continue;
    const a = ds.care[o + K.animal];
    if (a < 0) { orphan++; continue; }
    per.set(a, (per.get(a) ?? 0) + 1);
  }
  const dist = new Map<number, number>();
  for (const n of per.values()) dist.set(n, (dist.get(n) ?? 0) + 1);
  return { animals: per.size, oneOnly: dist.get(1) ?? 0, fourPlus: [...per.values()].filter((n) => n >= 4).length, dist, orphan };
}
