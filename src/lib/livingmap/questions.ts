/* ════════════════════════════════════════════════════════════════════
   The Living Map reads the record by question, not by layer.

   Each question classifies every area into a small set of named classes,
   and every class is one of three kinds:

     "value"    something of this kind is on the record here
     "zero"     the place is on the record, and the answer is none
     "unknown"  the record does not say — drawn hatched, never as zero

   The same classification drives the map's colours, the legend (which is
   also the filter), the counts in the panel and the screen-reader table,
   so the picture and the words can never disagree.
   ════════════════════════════════════════════════════════════════════ */

import type { MapCell, MonthRow } from "./types";
import { WORK_META, areaWork, type WorkKind } from "./work";
import { MR } from "./types";

export type QuestionId = "act" | "animals" | "needs" | "care" | "gaps" | "orgs";
export type Facet = string;
export type ClassKind = "value" | "zero" | "unknown";
export type Klass = { id: string; label: string; kind: ClassKind; color: string; note?: string };
export type Range = { from: number; to: number } | null;

export type Question = {
  id: QuestionId;
  label: string;
  ask: string;
  facets?: { id: Facet; label: string }[];
  /** Whether the timeline range changes what this question reads. */
  timed: (facet: Facet) => boolean;
  classes: (facet: Facet, ctx: Ctx) => Klass[];
  /** The class an area belongs to and its magnitude (for size and ranking). */
  classify: (c: MapCell, facet: Facet, ctx: Ctx, i: number) => { k: string; v: number };
  /** The figure a place list ranks by, with its unit. */
  measure: (c: MapCell, facet: Facet, ctx: Ctx, i: number) => number;
  unit: (facet: Facet) => string;
};

/** Per-render context: the city's months folded for the active time range, and the org palette. */
export type Ctx = { range: Range; inRange: Float64Array[] | null; orgColor: Map<string, string>; today: number; org?: boolean };

const INK = "#0b1e3d";
export const C = {
  seq: ["#d7e1f5", "#9db6ea", "#5b82dc", "#2457ce", "#16398f"],
  flame: "#e0472b", flameSoft: "#f29a83", amber: "#c98a12",
  care: ["#cfe8ea", "#8fcbd2", "#3c98a8", "#1f6f80"],
  quiet: "#b9c2cf", zeroFill: "rgba(11,30,61,0.05)", ink: INK,
};

const days = (iso: string | null, today: number) => (iso ? (today - Date.parse(iso)) / 86_400_000 : Infinity);
export const lastActivity = (c: MapCell) => [c.last_seen, c.last_case, c.care_last].filter(Boolean).sort().at(-1) ?? null;

/** Fold the city's monthly rows into per-area sums for a range: [opened, closed, care, ster, vacc, other]. */
export function foldMonths(months: MonthRow[], cells: number, range: Range): Float64Array[] | null {
  if (!range) return null;
  const out = Array.from({ length: cells }, () => new Float64Array(6));
  for (const r of months) {
    if (r[MR.m] < range.from || r[MR.m] > range.to) continue;
    const o = out[r[MR.cell]];
    o[0] += r[MR.opened]; o[1] += r[MR.closed]; o[2] += r[MR.care]; o[3] += r[MR.ster]; o[4] += r[MR.vacc]; o[5] += r[MR.other];
  }
  return out;
}

const share = (n: number, of: number) => (of > 0 ? n / of : 0);

const WORK_ORDER: WorkKind[] = ["waiting", "unassigned", "missed", "flagged", "confirm", "outcome", "survey", "revisit"];

export const QUESTIONS: Question[] = [
  {
    id: "act", label: "Work next", ask: "What needs attention here, who holds the record, and what can be done?",
    timed: () => false,
    classes: (_f, ctx) => [
      ...WORK_ORDER.filter((k) => k !== "unassigned" || ctx.org).map((k) => ({ id: k, label: WORK_META[k].label, kind: (k === "confirm" || k === "outcome" || k === "survey" || k === "revisit" ? "unknown" : "value") as ClassKind, color: WORK_META[k].color, note: WORK_META[k].why })),
      { id: "none", label: "Nothing flagged on the record", kind: "zero", color: C.zeroFill, note: "None of the rules applies here. That is not a guarantee all is well: it may simply be unreported." },
    ],
    measure: (c, _f, _ctx, i) => areaWork(c, i, "").length,
    classify(c, _f, _ctx, i) {
      const top = areaWork(c, i, "")[0];
      return top ? { k: top.kind, v: areaWork(c, i, "").length } : { k: "none", v: 0 };
    },
    unit: () => "things to act on",
  },
  {
    id: "animals", label: "Animals", ask: "Where are animals on the record?",
    facets: [{ id: "all", label: "All" }, { id: "photos", label: "With photos" }, { id: "residents", label: "Resident reports" }],
    timed: () => false,
    classes: () => [
      { id: "q5", label: "60 or more", kind: "value", color: C.seq[4] },
      { id: "q4", label: "25 to 59", kind: "value", color: C.seq[3] },
      { id: "q3", label: "10 to 24", kind: "value", color: C.seq[2] },
      { id: "q2", label: "4 to 9", kind: "value", color: C.seq[1] },
      { id: "q1", label: "1 to 3", kind: "value", color: C.seq[0] },
      { id: "none", label: "None of this kind", kind: "zero", color: C.zeroFill },
    ],
    measure: (c, f) => (f === "photos" ? c.photos : f === "residents" ? c.residents : c.animals),
    classify(c, f, ctx, i) {
      const v = this.measure(c, f, ctx, i);
      if (!v) return { k: "none", v: 0 };
      return { k: v >= 60 ? "q5" : v >= 25 ? "q4" : v >= 10 ? "q3" : v >= 4 ? "q2" : "q1", v };
    },
    unit: (f) => (f === "photos" ? "with photos" : f === "residents" ? "from residents" : "animals"),
  },
  {
    id: "needs", label: "Needs now", ask: "Where do animals need attention?",
    facets: [{ id: "open", label: "Open requests" }, { id: "followups", label: "Follow-ups" }],
    timed: (f) => f === "open",
    classes(f, ctx) {
      if (f === "followups") return [
        { id: "missed", label: "Follow-up missed", kind: "value", color: C.flame },
        { id: "due", label: "Follow-up due", kind: "value", color: C.amber },
        { id: "kept", label: "All follow-ups kept", kind: "value", color: C.seq[3] },
        { id: "nofu", label: "No follow-up recorded", kind: "unknown", color: C.quiet, note: "Requests here record no follow-up either way." },
        { id: "noreq", label: "No requests recorded", kind: "unknown", color: C.quiet },
      ];
      if (ctx.range) return [
        { id: "opened", label: "Requests opened in period", kind: "value", color: C.flame },
        { id: "quiet", label: "None opened in period", kind: "zero", color: C.zeroFill },
        { id: "noreq", label: "No requests ever recorded", kind: "unknown", color: C.quiet },
      ];
      return [
        { id: "waiting", label: "Open over 30 days", kind: "value", color: "#a8230f" },
        { id: "open", label: "Open request", kind: "value", color: C.flame },
        { id: "flag", label: "Flagged needing help", kind: "value", color: C.flameSoft, note: "An animal marked as needing help, with no open request." },
        { id: "unconf", label: "Open in an imported register, unconfirmed", kind: "unknown", color: "#b0702a", note: "Marked open when the register was imported and not confirmed in StrayPaw since: still open, or long resolved, is not known." },
        { id: "nostatus", label: "Outcome not recorded", kind: "unknown", color: C.amber, note: "Requests here carry no status: open or closed is not known." },
        { id: "clear", label: "Requests recorded, none open", kind: "zero", color: C.zeroFill },
        { id: "noreq", label: "No requests recorded", kind: "unknown", color: C.quiet, note: "No request here is not the same as no need here." },
      ];
    },
    measure(c, f, ctx, i) {
      if (f === "followups") return c.fu_missed + c.fu_upcoming;
      if (ctx.inRange) return ctx.inRange[i][0];
      const known = c.open_cases - (c.open_unconfirmed ?? 0);
      return known + (known ? 0 : c.needs_help);
    },
    classify(c, f, ctx, i) {
      if (f === "followups") {
        if (!c.cases) return { k: "noreq", v: 0 };
        if (c.fu_missed) return { k: "missed", v: c.fu_missed };
        if (c.fu_upcoming) return { k: "due", v: c.fu_upcoming };
        if (c.fu_done) return { k: "kept", v: c.fu_done };
        return { k: "nofu", v: 0 };
      }
      if (!c.cases && !c.needs_help) return { k: "noreq", v: 0 };
      if (ctx.inRange) { const n = ctx.inRange[i][0]; return n ? { k: "opened", v: n } : { k: "quiet", v: 0 }; }
      const known = c.open_cases - (c.open_unconfirmed ?? 0), known30 = c.open_30 - (c.open_30_unconfirmed ?? 0);
      if (known30 > 0) return { k: "waiting", v: known };
      if (known > 0) return { k: "open", v: known };
      if (c.needs_help) return { k: "flag", v: c.needs_help };
      if (c.open_unconfirmed) return { k: "unconf", v: c.open_unconfirmed };
      if (c.status_unknown) return { k: "nostatus", v: c.status_unknown };
      return { k: "clear", v: 0 };
    },
    unit: (f) => (f === "followups" ? "follow-ups open" : "open"),
  },
  {
    id: "care", label: "Care given", ask: "Where has care been recorded?",
    facets: [{ id: "ster", label: "Sterilisation" }, { id: "vacc", label: "Vaccination" }, { id: "treat", label: "Treatment" }],
    timed: () => true,
    classes(f, ctx) {
      if (ctx.range) return [
        { id: "c3", label: "10 or more in the period", kind: "value", color: C.care[3] },
        { id: "c2", label: "3 to 9", kind: "value", color: C.care[2] },
        { id: "c1", label: "1 or 2", kind: "value", color: C.care[1] },
        { id: "none", label: "None dated in period", kind: "zero", color: C.zeroFill },
        { id: "undated", label: "Care recorded without dates", kind: "unknown", color: C.quiet, note: "Status on the animal record, with no date to place it in time." },
      ];
      if (f === "ster") return [
        { id: "c3", label: "Three in four or more sterilised", kind: "value", color: C.care[3] },
        { id: "c2", label: "Half or more", kind: "value", color: C.care[2] },
        { id: "c1", label: "Under half", kind: "value", color: C.care[1] },
        { id: "none", label: "None sterilised (recorded)", kind: "zero", color: C.zeroFill },
        { id: "unknown", label: "Mostly not recorded", kind: "unknown", color: C.quiet, note: "Sterilisation status is unknown for most animals here." },
      ];
      if (f === "vacc") return [
        { id: "c3", label: "Three in four or more", kind: "value", color: C.care[3] },
        { id: "c2", label: "Half or more", kind: "value", color: C.care[2] },
        { id: "c1", label: "Under half", kind: "value", color: C.care[1] },
        { id: "unknown", label: "No vaccination recorded", kind: "unknown", color: C.quiet, note: "The record only notes vaccination when it happened: not recorded does not mean unvaccinated." },
      ];
      return [
        { id: "c3", label: "10 or more treatments", kind: "value", color: C.care[3] },
        { id: "c2", label: "3 to 9", kind: "value", color: C.care[2] },
        { id: "c1", label: "1 or 2", kind: "value", color: C.care[1] },
        { id: "none", label: "None recorded", kind: "zero", color: C.zeroFill },
      ];
    },
    measure(c, f, ctx, i) {
      if (ctx.inRange) return f === "ster" ? ctx.inRange[i][3] : f === "vacc" ? ctx.inRange[i][4] : ctx.inRange[i][5];
      if (f === "ster") return c.ster_yes;
      if (f === "vacc") return c.vacc_yes;
      return treatments(c);
    },
    classify(c, f, ctx, i) {
      if (ctx.inRange) {
        const n = this.measure(c, f, ctx, i);
        if (n) return { k: n >= 10 ? "c3" : n >= 3 ? "c2" : "c1", v: n };
        const statusOnly = f === "ster" ? c.ster_yes : f === "vacc" ? c.vacc_yes : 0;
        return statusOnly ? { k: "undated", v: 0 } : { k: "none", v: 0 };
      }
      if (f === "ster") {
        const known = c.ster_yes + c.ster_no;
        if (!c.animals || known < c.animals / 2) return { k: "unknown", v: c.ster_yes };
        const s = share(c.ster_yes, known);
        return { k: !c.ster_yes ? "none" : s >= 0.75 ? "c3" : s >= 0.5 ? "c2" : "c1", v: c.ster_yes };
      }
      if (f === "vacc") {
        if (!c.vacc_yes) return { k: "unknown", v: 0 };
        const s = share(c.vacc_yes, c.animals);
        return { k: s >= 0.75 ? "c3" : s >= 0.5 ? "c2" : "c1", v: c.vacc_yes };
      }
      const t = treatments(c);
      return { k: t >= 10 ? "c3" : t >= 3 ? "c2" : t ? "c1" : "none", v: t };
    },
    unit: (f) => (f === "ster" ? "sterilised" : f === "vacc" ? "vaccinated" : "treatments"),
  },
  {
    id: "gaps", label: "Gaps", ask: "Where is the record thin or missing?",
    timed: () => false,
    classes: () => [
      { id: "stale", label: "Nothing new in over a year", kind: "unknown", color: "#8a6a3b" },
      { id: "status", label: "Status unknown for most animals", kind: "unknown", color: C.amber },
      { id: "approx", label: "Placed by locality name only", kind: "unknown", color: C.quiet, note: "Located from a written place name, not a map point." },
      { id: "fresh", label: "Recent, specific record", kind: "value", color: C.seq[3] },
      { id: "edge", label: "Next to the record, nothing yet", kind: "unknown", color: "rgba(11,30,61,0.18)", note: "Areas bordering recorded ones, with no record at all. Empty means unreported, not empty of animals." },
    ],
    measure: (c) => c.animals,
    classify(c, _f, ctx) {
      const age = days(lastActivity(c), ctx.today);
      if (age > 365) return { k: "stale", v: Math.round(age) };
      if (c.animals && c.ster_unknown + 0 >= c.animals / 2) return { k: "status", v: c.ster_unknown };
      if (c.animals && c.exact_loc === 0) return { k: "approx", v: c.animals };
      return { k: "fresh", v: c.animals };
    },
    unit: () => "animals",
  },
  {
    id: "orgs", label: "Who's working", ask: "Which organisations keep the record here?",
    timed: () => false,
    classes(_f, ctx) {
      const list: Klass[] = [...ctx.orgColor.entries()].map(([name, color]) => ({ id: `o:${name}`, label: name, kind: "value" as const, color }));
      return [...list, { id: "multi", label: "Two or more organisations", kind: "value", color: INK, note: "Ringed: more than one organisation has records here." }, { id: "none", label: "No organisation named", kind: "unknown", color: C.quiet }];
    },
    measure: (c) => c.orgs.length,
    classify(c, _f, ctx) {
      const named = c.orgs.filter((o) => o.name);
      if (!named.length) return { k: "none", v: 0 };
      const top = named[0].name!;
      return { k: ctx.orgColor.has(top) ? `o:${top}` : "none", v: c.orgs.length };
    },
    unit: () => "organisations",
  },
];

export const treatments = (c: MapCell) => Object.entries(c.care_kinds).reduce((s, [k, n]) => (k === "sterilisation" || k === "vaccination" ? s : s + n), 0);
export const question = (id: string | null | undefined) => QUESTIONS.find((q) => q.id === id) ?? QUESTIONS[0];
export const defaultFacet = (q: Question) => q.facets?.[0]?.id ?? "all";

/** Up to six organisation colours, by how much of the city's record each keeps. */
const ORG_PALETTE = ["#2457ce", "#c2401f", "#1f6f80", "#8a5a9e", "#a8740f", "#4d7a3a"];
export function orgPalette(cells: MapCell[]): Map<string, string> {
  const tally = new Map<string, number>();
  for (const c of cells) for (const o of c.orgs) if (o.name) tally.set(o.name, (tally.get(o.name) ?? 0) + o.a + o.c);
  return new Map([...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, ORG_PALETTE.length).map(([n], i) => [n, ORG_PALETTE[i]]));
}
