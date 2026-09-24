/* The spatial engine on a synthetic city.

   A handful of cells around a real centre, with records chosen so every
   rule the map, the analytics and the dashboards rely on has something to
   bite on: coverage classes, open and critical work, unreliable imported
   resolution dates, "few" for sparse public cells, the clock, and what the
   public dataset must never carry. Runs the real builder (h3-js included),
   so a change that breaks the shape of the data fails here, not on a screen. */

import assert from "node:assert/strict";
import { gridDisk, latLngToCell } from "h3-js";
import { assemble, nextReasons, type AnimalRow, type CaseRow, type CareRow, type SightRow } from "../src/lib/spatial/build";
import {
  animalVisible, breaks, buildIndex, caseStateOn, cellStats, coverageOf, FEW, fewOr, firstDay, isSparse, modeValue, robustStart,
  monthEndDay, monthLabel, monthOfDay, monthStartDay, NO_FILTERS, openOn, rankOf, resolutionUndated, resolvedOn, type Filters,
} from "../src/lib/spatial/engine";
import { animalKnowledge, casesIn, closureReasons, firstAction, monthly, openAging, resolution, statusTotals } from "../src/lib/spatial/measures";
import { completeness, courses, fates, ledger, season } from "../src/lib/spatial/report";
import { CONDITIONS, DEFAULT_TRIAGE, STATUSES, STATUS_META } from "../src/lib/register/taxonomy";
import { C, C_STRIDE, dayOf, H3_RES, RES, UNDATED } from "../src/lib/spatial/types";
import { queueOrder, type QueueItem } from "../src/lib/ops";
import { placeLine } from "../src/lib/utils";

const NOW = new Date("2026-09-24T12:00:00Z");
const c0 = latLngToCell(11.0168, 76.9558, H3_RES);
const disk = gridDisk(c0, 2).filter((k) => k !== c0);
const [c1, c2, c3, c4, c5, c6, c7] = disk;

let seq = 0;
const animal = (cell: string, first: string, last: string, extra: Partial<AnimalRow> = {}): AnimalRow => ({
  id: `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`,
  h3_r8: cell, lat: null, lng: null, city: "Coimbatore", state: "Tamil Nadu", zone: `Place ${cell.slice(-4)}`,
  location_precision: "approximate", source: "field", status: "seen", needs_help: false,
  sterilisation_status: "unknown", vaccination_status: "unknown", ear_notch: null, cover_photo: null,
  first_seen: first, last_seen: last, sightings_count: 1, ngo_id: null, ...extra,
});
const kase = (cell: string, dog: string | null, occurred: string, extra: Partial<CaseRow> = {}): CaseRow => ({
  id: `case-${++seq}`, dog_id: dog, ngo_id: null, h3_r8: cell, city: "Coimbatore", zone: null, occurred_at: occurred,
  condition_class: "Skin & mange", status_class: "closed", closure_reason: null, intake_channel: "own_line", severity: "normal",
  first_action_days: null, resolved_at: null, resolved_at_source: null, source: "field",
  followups_done: 0, followups_missed: 0, followups_upcoming: 0, ...extra,
});

/* c0: ten animals, recent work — well mapped. Three need attention: one
   needs help only (9), one is injured and needs help (8), one is injured
   only (7). */
const strong = Array.from({ length: 10 }, (_, i) => animal(c0, "2025-01-10", "2026-08-20", {
  sterilisation_status: i < 4 ? "sterilised" : i < 6 ? "not_sterilised" : "unknown",
  vaccination_status: i < 3 ? "vaccinated" : "unknown",
  needs_help: i === 9 || i === 8,
  status: i === 8 || i === 7 ? "injured" : "seen",
}));
/* c1: four animals, last seen within the year — partly mapped. */
const partial = Array.from({ length: 4 }, () => animal(c1, "2025-02-01", "2026-01-15"));
/* c2: one animal — too few records. */
const lonely = animal(c2, "2026-03-01", "2026-03-01");
/* c3: three animals, nothing for two years — weakly mapped. */
const stale = Array.from({ length: 3 }, () => animal(c3, "2024-02-01", "2024-06-01"));
/* c4–c6: one each, so the city has enough recorded cells to have an edge. */
const scattered = [c4, c5, c6].map((k) => animal(k, "2025-05-01", "2025-05-01"));
/* c7: nine animals recorded by residents, seen last week — and never a
   field team's record. Busy, but not well mapped. */
const residentOnly = Array.from({ length: 9 }, () => animal(c7, "2026-08-01", "2026-09-15", { source: "resident" }));
const animals = [...strong, ...partial, lonely, ...stale, ...scattered, ...residentOnly];

const cases: CaseRow[] = [
  kase(c0, strong[9].id, "2026-09-01T08:00:00Z", { condition_class: "Road accident", status_class: "open", severity: "critical" }),
  kase(c0, strong[0].id, "2026-06-01T08:00:00Z", { resolved_at: "2026-06-10T08:00:00Z", resolved_at_source: "recorded", first_action_days: 0 }),
  kase(c0, strong[1].id, "2026-05-01T08:00:00Z", { resolved_at: "2026-05-01T08:00:00Z", resolved_at_source: "import_assumed", first_action_days: 5 }),
  kase(c0, strong[3].id, "2026-03-01T08:00:00Z", { resolved_at: "2026-03-15T08:00:00Z", resolved_at_source: "import_derived" }),
  kase(c0, strong[2].id, "2026-04-01T08:00:00Z", { status_class: "no_action", closure_reason: "could_not_locate" }),
  /* An organisation's old paper register: before the old 2024 epoch. */
  kase(c1, partial[0].id, "2019-05-01T08:00:00Z", { resolved_at: "2019-05-20T08:00:00Z", resolved_at_source: "recorded" }),
  /* Open for more than ninety days: stale work for review, never auto-closed. */
  kase(c1, partial[1].id, "2026-01-02T08:00:00Z", { status_class: "in_progress", condition_class: "Maggot wound" }),
  /* A workbook date in 2030: a data-entry error, not a date. */
  kase(c1, partial[2].id, "2025-11-01T08:00:00Z", { resolved_at: "2030-08-23T08:00:00Z", resolved_at_source: "import_derived" }),
  /* Closed by a person reviewing stale work: dated, but not field work. */
  kase(c1, partial[3].id, "2025-12-01T08:00:00Z", { reviewed_at: "2026-02-10T08:00:00Z" }),
];
const care: CareRow[] = [
  { dog_id: strong[0].id, kind: "sterilisation", event_date: "2026-06-02", h3_r8: null },
  { dog_id: strong[0].id, kind: "vaccination", event_date: "2025-03-01", h3_r8: null },
  /* c1's only recent field-team work: a treatment in January. */
  { dog_id: partial[2].id, kind: "treatment", event_date: "2026-01-20", h3_r8: null },
];
const sight = (cell: string, created: string): SightRow => ({
  dog_id: null, created_at: created, h3_r8: cell, lat: null, lng: null, sterilisation_status: null, vaccination_status: null, has_photo: false,
});
/* Residents keep seeing animals in c3 and c7; no field team has been. */
const sightings: SightRow[] = [sight(c3, "2026-09-10T08:00:00Z"), sight(c3, "2026-09-12T08:00:00Z"), sight(c7, "2026-09-20T08:00:00Z")];

const ds = assemble({ animals, cases, care, sightings, orgs: [] }, "public", NOW);
const ix = buildIndex(ds);
const at = (k: string) => { const i = ds.cells.indexOf(k); assert.ok(i >= 0, `cell ${k} is in the dataset`); return i; };
const today = ds.today;

/* ── shape ─────────────────────────────────────────────────────────────── */
assert.equal(ds.cities.length, 1);
assert.equal(ds.cities[0].name, "Coimbatore");
assert.equal(ds.cities[0].state, "Tamil Nadu");
assert.equal(ix.nAnimals, animals.length);
assert.equal(ix.nCases, cases.length);
assert.equal(ix.nCare, care.length);
assert.equal(today, dayOf(NOW.toISOString()));

/* ── what the public dataset never carries ─────────────────────────────── */
const wire = JSON.stringify(ds);
for (const a of animals) assert.ok(!wire.includes(a.id), "no animal id on the wire");
for (const c of cases) assert.ok(!wire.includes(c.id), "no case id on the wire");
assert.ok(!/"lat"\s*:|"lng"\s*:\s*[0-9]/.test(wire.replace(/"cities":\[.*?\],"cells"/, "")), "no record positions outside the city list");

/* ── the clock ─────────────────────────────────────────────────────────── */
const old = dayOf("2019-05-01T08:00:00Z");
assert.ok(old > 0, "a 2019 record has a positive day on the register clock");
assert.equal(firstDay(ds), old, "the clock starts at the first record, not the epoch");
/* Past a couple of hundred records, a stray early date does not drag the clock back. */
const busy = [dayOf("2011-03-01"), ...Array.from({ length: 400 }, (_, i) => dayOf("2024-01-01") + i)];
assert.equal(robustStart(busy), dayOf("2024-01-01") + 1);
assert.equal(robustStart([5, 3, 9]), 3, "a small register starts at its first record");
assert.equal(robustStart([-1, -1]), -1);
const mToday = monthOfDay(today);
assert.equal(monthLabel(mToday), "Sep 2026");
assert.equal(monthLabel(mToday, true), "September 2026");
assert.ok(monthStartDay(mToday) <= today && today <= monthEndDay(mToday));
assert.equal(monthEndDay(mToday) + 1, monthStartDay(mToday + 1));
const series = monthly(ds, casesIn(ds, { cells: null, from: 0, to: today }), 0, today);
assert.equal(series.m0, monthOfDay(old), "monthly() starts at the first request, not month zero");
assert.equal(series.total.reduce((a, b) => a + b, 0), cases.length);

/* ── coverage ──────────────────────────────────────────────────────────── */
assert.equal(coverageOf(0, Infinity, 0), "unmapped");
assert.equal(coverageOf(1, 10, 0), "insufficient");
assert.equal(coverageOf(8, 180, 0), "strong");
assert.equal(coverageOf(8, 181, 0), "partial");
assert.equal(coverageOf(3, 400, 0), "weak");
const stats = new Map(cellStats(ds, ix, today).map((s) => [s.cell, s]));
assert.equal(stats.get(at(c0))!.coverage, "strong");
assert.equal(stats.get(at(c1))!.coverage, "partial");
assert.equal(stats.get(at(c2))!.coverage, "insufficient");
assert.equal(stats.get(at(c3))!.coverage, "weak");
/* A filter narrows what is counted, never how well a place is known. */
const filtered = new Map(cellStats(ds, ix, today, { ...NO_FILTERS, ster: "yes" }).map((s) => [s.cell, s]));
assert.equal(filtered.get(at(c0))!.animals, 4);
assert.equal(filtered.get(at(c0))!.coverage, "strong");
assert.equal(filtered.get(at(c3))!.coverage, "weak");

/* ── open work ─────────────────────────────────────────────────────────── */
const s0 = stats.get(at(c0))!;
assert.equal(s0.cases, 5);
assert.equal(s0.open, 1);
assert.equal(s0.critical, 1);
assert.equal(s0.noAction, 1);
assert.equal(s0.couldNotLocate, 1);
const openIdx = [...Array(ix.nCases).keys()].find((i) => ds.cases[i * C_STRIDE + C.status] === STATUSES.indexOf("open"))!;
assert.equal(openOn(ds, openIdx, dayOf("2026-08-31")), false, "not open before it was reported");
assert.equal(openOn(ds, openIdx, today), true);
const aging = openAging(ds, casesIn(ds, { cells: null, from: 0, to: today }), today);
assert.equal(aging.open, 2);
assert.equal(aging.stale.length, 1, "the January case is surfaced as stale");
/* Surfacing is not closing: the stale case is still open after the measure ran. */
assert.equal(openOn(ds, aging.stale[0], today), true);

/* ── evidence quality ──────────────────────────────────────────────────── */
const all = casesIn(ds, { cells: null, from: 0, to: today });
const res = resolution(ds, all);
assert.equal(res.excluded, 3, "an assumed date, a date in the future and a review closure are left out of time-to-resolution");
assert.equal(res.known, 2, "two closures carry a recorded date; a no-action request is not a resolution");
assert.ok([9, 19].includes(res.median!));
assert.equal(res.workbook.n, 1, "a date the import took from its workbook is measured apart");
assert.equal(res.workbook.median, 14);
const fa = firstAction(ds, all);
assert.equal(fa.known, 2);
assert.equal(fa.unknown, cases.length - 2);
assert.equal(fa.bins[0], 1);
const cr = closureReasons(ds, all);
assert.equal(cr.total, 1);
assert.equal(cr.parts[0].reason, "could_not_locate");
const st = statusTotals(ds, all);
assert.equal(st.open + st.in_progress, 2);

/* ── what is known about the animals ───────────────────────────────────── */
const know = animalKnowledge(ds, ix, new Set([at(c0)]), today);
assert.equal(know.total, 10);
assert.deepEqual(know.ster, { yes: 4, no: 2, unknown: 4 });
assert.equal(know.vacc.yes + know.vacc.no + know.vacc.unknown, know.total);
assert.equal(know.help, 2);
assert.equal(know.due, 1, "a vaccination eighteen months old is due a booster");
assert.ok(animalVisible(ds, 0, today, NO_FILTERS));
assert.ok(!animalVisible(ds, 0, dayOf("2024-12-31"), NO_FILTERS), "not drawn before it was first recorded");

/* ── few, for sparse public places ─────────────────────────────────────── */
assert.equal(FEW, 3);
assert.equal(fewOr(1, true), "few");
assert.equal(fewOr(2, true), "few");
assert.equal(fewOr(3, true), "3");
assert.equal(fewOr(0, true), "0", "zero is not sparse: nothing is recorded");
assert.equal(fewOr(2, false), "2", "members see exact counts");
assert.ok(isSparse(stats.get(at(c2))!.animals));

/* ── ramps ─────────────────────────────────────────────────────────────── */
const br = breaks([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
assert.deepEqual([...br].sort((a, b) => a - b), br, "breaks ascend");
assert.equal(rankOf(0, br), -1, "zero is never on the ramp");
assert.equal(rankOf(10, br), br.length);

/* ── the edge of the record ────────────────────────────────────────────── */
assert.ok(ds.frontier.length > 0, "a city with seven recorded cells has an edge");
for (const f of ds.frontier) assert.ok(!ds.cells.includes(f.cell), "the edge is outside the record");

/* ── the report ────────────────────────────────────────────────────────── */
const wall = ledger(ds, all, 0, today);
assert.equal(wall.months.reduce((a, m) => a + m.total, 0), all.length, "every request is one square on the wall");
assert.equal(wall.months[0].total, 1, "the 2019 request is folded into the first month, not dropped");
const f = fates(ds, all);
assert.equal(f.closed + f.no_action + f.in_progress + f.open + f.other_ngo + f.not_attended + f.unknown, all.length);
const comp = new Map(completeness(ds, ix, all, null, today).map((r) => [r.key, r]));
assert.equal(comp.get("closed")!.known, 2, "two closures carry a recorded date");
assert.equal(comp.get("closed")!.partial, 1, "one closure carries a workbook date");
assert.equal(comp.get("ster")!.known, 6);
assert.equal(comp.get("why")!.known, 1, "the no-action request says why");
const tvt = courses(ds, ix, null, 0, today);
assert.equal(tvt.animals, 0);
/* A season is a month busy in every year that has it, not once. */
const seasonDs = { ...ds, cases: [] as number[] };
const mk = (iso: string) => [0, -1, dayOf(iso), 0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 0, -1, 0];
for (const [y, months] of [[2024, [1, 1, 1, 1, 1, 1, 1, 1, 1, 6, 6, 1]], [2025, [9, 1, 1, 1, 1, 1, 1, 1, 1, 5, 5, 1]]] as const)
  months.forEach((k, m) => { for (let q = 0; q < k; q++) seasonDs.cases.push(...mk(`${y}-${String(m + 1).padStart(2, "0")}-10`)); });
const sIdx = Array.from({ length: seasonDs.cases.length / C_STRIDE }, (_, i) => i);
const se = season(seasonDs, sIdx, dayOf("2026-01-15"));
assert.deepEqual(se.peaks, [9, 10], "October and November are busy in both years; a single busy January is not a season");
assert.equal(se.surge?.year, 2025, "the one-off January is reported as a surge");
assert.equal(se.surge?.month, 0);

/* ── nobody is named in public ─────────────────────────────────────────── */
{
  const named = assemble({ animals, cases: cases.map((c) => ({ ...c, ngo_id: "org-1" })), care, sightings: [], orgs: [{ id: "org-1", name: "A Real Partner" }] }, "public", NOW);
  assert.ok(!named.dict.org.includes("A Real Partner"), "the public dataset never carries an organisation's name");
  const own = assemble({ animals, cases: cases.map((c) => ({ ...c, ngo_id: "org-1" })), care, sightings: [], orgs: [{ id: "org-1", name: "A Real Partner" }] }, "org", NOW);
  assert.ok(own.dict.org.includes("A Real Partner"), "an organisation's own dataset keeps its name");
}

/* ── medical: injured means injured; each animal counts once ──────────── */
{
  const c0s = stats.get(at(c0))!;
  assert.equal(c0s.help, 2, "two animals need help");
  assert.equal(c0s.injured, 2, "two animals are injured");
  assert.equal(c0s.medical, 3, "three animals need medical attention — the one both injured and needing help counts once");
  assert.equal(modeValue("medical", c0s), 3, "the Medical layer is coloured by animals, never injured + help");
  const inj = new Map(cellStats(ds, ix, today, { ...NO_FILTERS, health: "injured" }).map((x) => [x.cell, x]));
  assert.equal(inj.get(at(c0))!.animals, 2, "the Injured filter shows injured animals only");
  const helpOnly = strong.findIndex((a) => a.needs_help && a.status !== "injured");
  assert.ok(!animalVisible(ds, helpOnly, today, { ...NO_FILTERS, health: "injured" }), "needs help is not injured");
  assert.ok(animalVisible(ds, helpOnly, today, { ...NO_FILTERS, health: "help" }));
}

/* ── coverage: independent of filters, field-team activity only ─────────── */
{
  const condition = CONDITIONS.indexOf("Road accident");
  const filterSets: Filters[] = [
    { ...NO_FILTERS, condition },
    { ...NO_FILTERS, source: "field" },
    { ...NO_FILTERS, source: "resident" },
    { ...NO_FILTERS, ster: "yes" },
    { ...NO_FILTERS, ster: "unknown" },
    { ...NO_FILTERS, vacc: "yes" },
    { ...NO_FILTERS, vacc: "due" },
    { ...NO_FILTERS, health: "injured" },
    { ...NO_FILTERS, seen: "90" },
  ];
  for (const t of [today, dayOf("2026-02-01"), dayOf("2025-06-01")]) {
    const base = cellStats(ds, ix, t);
    for (const fs of filterSets) {
      const got = cellStats(ds, ix, t, fs);
      base.forEach((b, k) => {
        assert.equal(got[k].coverage, b.coverage, `coverage of cell ${b.cell} does not change under ${JSON.stringify(fs)}`);
        assert.equal(got[k].lastField, b.lastField, "field-team activity does not change under a filter");
        assert.equal(got[k].events, b.events, "what is recorded does not change under a filter");
      });
    }
  }
  /* A condition or source filter narrows the case counts, not the coverage. */
  const byCond = new Map(cellStats(ds, ix, today, { ...NO_FILTERS, condition }).map((x) => [x.cell, x]));
  assert.equal(byCond.get(at(c0))!.cases, 1, "one Road accident request in c0");
  assert.equal(byCond.get(at(c0))!.coverage, "strong");
  const bySource = new Map(cellStats(ds, ix, today, { ...NO_FILTERS, source: "resident" }).map((x) => [x.cell, x]));
  assert.equal(bySource.get(at(c0))!.cases, 0);
  assert.equal(bySource.get(at(c0))!.coverage, "strong");
  /* Field work is field-team activity: residents' sightings and last-seen dates are records, not visits. */
  const c7s = stats.get(at(c7))!;
  assert.equal(c7s.observed, 9);
  assert.equal(c7s.lastField, -1, "nine resident records and a sighting last week are not field work");
  assert.equal(c7s.coverage, "weak", "busy with residents' records, but not well mapped");
  const c3s = stats.get(at(c3))!;
  assert.equal(c3s.lastField, dayOf("2024-02-01"), "c3's last field-team record is its 2024 animals, not this month's sightings");
  assert.equal(c3s.coverage, "weak", "fresh resident sightings do not make an old place mapped");
  assert.equal(c3s.recentField, 0);
  assert.equal(modeValue("activity", c3s), 0, "the Field work layer does not count residents' sightings");
  assert.ok(c3s.recentEvents >= 2, "the sightings are still recorded");
  const c1s = stats.get(at(c1))!;
  assert.equal(c1s.lastField, dayOf("2026-01-20"), "c1's January treatment is its latest field work; the review closure in February is not");
  assert.equal(c1s.coverage, "partial");
  /* The coverage rule text says what the rule measures. */
  assert.ok(/field work/.test("8 or more animals, and field work in the last six months"));
}

/* ── resolution dates: an unknown day is never used as a day ───────────── */
{
  /* Every fixture case has a cell, so dataset order is fixture order. */
  const idxOf = (dog: string) => cases.findIndex((c) => c.dog_id === dog);
  const assumed = idxOf(strong[1].id);
  const future = idxOf(partial[2].id);
  const reviewed = idxOf(partial[3].id);
  const dated = idxOf(strong[0].id);
  assert.equal(ds.cases[assumed * C_STRIDE + C.closedDay], UNDATED, "an assumed import date is stored as unknown");
  assert.equal(ds.cases[assumed * C_STRIDE + C.resolvedSrc], RES.assumed);
  assert.ok(resolutionUndated(ds, assumed));
  /* It does not vanish on its opening day, and it is not called open or resolved on a day it may not have been. */
  for (const d of ["2026-05-01", "2026-05-02", "2026-07-15"]) {
    assert.equal(caseStateOn(ds, assumed, dayOf(d)), "undated", `on ${d} it is "resolved, date unknown"`);
    assert.equal(openOn(ds, assumed, dayOf(d)), false);
    assert.equal(resolvedOn(ds, assumed, dayOf(d)), false);
  }
  assert.equal(caseStateOn(ds, assumed, dayOf("2026-04-30")), "none", "not before it was reported");
  assert.equal(caseStateOn(ds, assumed, today), "closed", "as of today it is resolved");
  /* A workbook date in the future is not a date: before, it kept the case "open" until 2030. */
  assert.equal(ds.cases[future * C_STRIDE + C.closedDay], UNDATED);
  assert.equal(openOn(ds, future, today), false, "a closed case with a 2030 date is not open today");
  assert.equal(caseStateOn(ds, future, today), "closed");
  /* A review closure is a real day on the register. */
  assert.equal(ds.cases[reviewed * C_STRIDE + C.resolvedSrc], RES.reviewed);
  assert.equal(caseStateOn(ds, reviewed, dayOf("2026-01-15")), "open", "open until someone closed it on review");
  assert.equal(caseStateOn(ds, reviewed, dayOf("2026-02-10")), "closed");
  /* A recorded date behaves as a date. */
  assert.equal(caseStateOn(ds, dated, dayOf("2026-06-05")), "open");
  assert.equal(caseStateOn(ds, dated, dayOf("2026-06-10")), "closed");
  /* Map and analytics read the same rule: the cell counts, the open-work measure and the case state agree on every day. */
  const inScopeAll = casesIn(ds, { cells: null, from: 0, to: today });
  for (const d of ["2025-12-15", "2026-01-15", "2026-05-15", "2026-07-15", "2026-09-24"]) {
    const t = dayOf(d);
    const cells = cellStats(ds, ix, t);
    const openByState = [...Array(ix.nCases).keys()].filter((i) => caseStateOn(ds, i, t) === "open").length;
    const undatedByState = [...Array(ix.nCases).keys()].filter((i) => caseStateOn(ds, i, t) === "undated").length;
    assert.equal(cells.reduce((a, x) => a + x.open, 0), openByState, `map cells count the same open work as the rule on ${d}`);
    assert.equal(cells.reduce((a, x) => a + x.undated, 0), undatedByState, `map cells count the same undated cases on ${d}`);
    assert.equal(openAging(ds, inScopeAll, t).open, openByState, `analytics count the same open work as the map on ${d}`);
  }
  assert.equal(stats.get(at(c0))!.undated, 0, "as of today, an undated case is resolved");
  const midMay = new Map(cellStats(ds, ix, dayOf("2026-05-15")).map((x) => [x.cell, x]));
  assert.equal(midMay.get(at(c0))!.undated, 2, "in May, c0 holds two cases closed on an unknown day: the assumed import, and April's no-action request that never said when");
  /* Still-open-today counts in the monthly series are the cases with no resolution at all. */
  assert.equal(series.open.reduce((a, b) => a + b, 0), 2);
}

/* ── map next: what is known, said precisely ──────────────────────────── */
{
  assert.deepEqual(nextReasons(14, 0, 0, null), ["14 animals recorded in the six cells around it", "nothing recorded here", "no field-team record here"]);
  assert.deepEqual(nextReasons(14, 2, 3, 18), ["14 animals recorded in the six cells around it", "only two animals recorded here", "no field-team activity recorded for 18 months"]);
  assert.equal(nextReasons(20, 0, 4, null)[1], "no animals recorded here, 4 other records");
  /* A place residents report from, next to a mapped one, is suggested — and never described as unvisited by anyone. */
  const hub = latLngToCell(11.0168, 76.9558, H3_RES);
  const [edge, far] = gridDisk(hub, 1).filter((k) => k !== hub);
  const nAnimals = [
    ...Array.from({ length: 13 }, () => animal(hub, "2026-08-01", "2026-09-01", { zone: "Hub" })),
    animal(edge, "2026-09-01", "2026-09-20", { source: "resident", zone: "Edge" }),
    animal(edge, "2026-09-02", "2026-09-20", { source: "resident", zone: "Edge" }),
    animal(far, "2024-03-01", "2024-03-01", { zone: "Far" }),
  ];
  const nds = assemble({ animals: nAnimals, cases: [], care: [], sightings: [sight(edge, "2026-09-21T08:00:00Z")], orgs: [] }, "public", NOW);
  const byCell = new Map(nds.next.map((n) => [n.cell, n]));
  const e = byCell.get(edge);
  assert.ok(e, "a resident-only place beside a mapped one is suggested next, though residents were there last week");
  assert.deepEqual(e!.reasons.slice(1), ["only two animals recorded here", "no field-team record here"]);
  for (const n of [...nds.next, ...ds.next]) {
    for (const r of n.reasons) assert.ok(!/never visited/i.test(r), `"${r}" claims more than is known`);
    assert.ok(/^no field-team (record here|activity recorded for \d+ months)$/.test(n.reasons[2]), n.reasons[2]);
  }
  const f = byCell.get(far);
  if (f) assert.match(f.reasons[2], /^no field-team activity recorded for \d+ months$/, "a place a field team last recorded in 2024 says how long ago");
  assert.ok(!byCell.has(hub), "a well-mapped place is never suggested");
}

/* ── the NGO queue: overdue follow-ups, then critical, then the rest; oldest first in each ── */
{
  const items: (QueueItem & { id: string })[] = [
    { id: "new-routine", kind: "case", crit: false, age: 2 },
    { id: "old-routine", kind: "case", crit: false, age: 60 },
    { id: "new-critical", kind: "case", crit: true, age: 1 },
    { id: "old-critical", kind: "case", crit: true, age: 20 },
    { id: "late-followup", kind: "followup", crit: false, age: 3 },
    { id: "later-followup", kind: "followup", crit: false, age: 12 },
  ];
  assert.deepEqual([...items].sort(queueOrder).map((x) => x.id),
    ["later-followup", "late-followup", "old-critical", "new-critical", "old-routine", "new-routine"],
    "within each group the item that has waited longest comes first");
}

/* ── places are never said twice ───────────────────────────────────────── */
assert.equal(placeLine("Saket, Delhi", "Delhi"), "Saket, Delhi");
assert.equal(placeLine("Masakalipalayam, Kasturba Gandhinagar 2nd st", "Coimbatore"), "Masakalipalayam, Kasturba Gandhinagar 2nd st, Coimbatore");
assert.equal(placeLine(null, "Delhi"), "Delhi");
assert.equal(placeLine("delhi", "Delhi"), "delhi", "the same place in another case is the same place");
assert.equal(placeLine(null, undefined), "");

/* ── taxonomy ──────────────────────────────────────────────────────────── */
for (const c of CONDITIONS) assert.ok(DEFAULT_TRIAGE[c], `${c} has a default triage`);
for (const s of STATUSES) assert.ok(STATUS_META[s], `${s} has a label`);

console.log("Spatial engine regression passed.");
