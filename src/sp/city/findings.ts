/* ════════════════════════════════════════════════════════════════════
   Municipality · findings (decisions 023, 034; references 03 Opportunity
   Atlas, 09 Our World in Data, 13 Stripe Press).

   What a city's record supports, written as numbered claims a council
   officer can quote. Each finding is a pure function of the bounded city
   dataset and a period, and carries:
     claim    one sentence with its own numbers;
     qualify  the limit that sits beside the claim, not in a footnote;
     figure   the parts behind the number, with "not recorded" as a part;
     method   unit, denominator, what is unknown, source, precision, period.
   A finding the record cannot support is omitted, not softened.
   ════════════════════════════════════════════════════════════════════ */

import { animalKnowledge, casesIn, closureReasons, firstAction, FIRST_ACTION_BINS, localityTable, openAging, AGE_BINS } from "@/lib/spatial/measures";
import { completeness, fates, FATES, repeatPlaces, season } from "@/lib/spatial/report";
import { fewOr, MONTHS_LONG, type Index } from "@/lib/spatial/engine";
import type { SpatialDataset } from "@/lib/spatial/types";
import { CLOSURE_META, type ClosureReason } from "@/lib/register/taxonomy";
import { cityEvidence } from "../atlas/evidence";

export type Tone = "care" | "other" | "no" | "na" | "progress" | "open" | "unknown" | "plain";
export type Part = { label: string; n: number; tone: Tone };
export type Figure =
  | { kind: "parts"; parts: Part[]; of: string }
  | { kind: "bins"; bins: Part[]; of: string }
  | { kind: "table"; cols: string[]; rows: { name: string; cells: string[] }[] }
  | { kind: "season"; years: { year: number; months: (number | null)[] }[]; peaks: number[] }
  | { kind: "complete"; rows: { label: string; of: string; known: number; partial: number; total: number }[] };
export type Method = { unit: string; denominator: string; unknown: string; source: string; precision: string; period: string; loaded?: string };
export type Finding = { id: string; kicker: string; claim: string; qualify: string; figure: Figure; method: Method; lens?: string };
export type Period = "12m" | "all";
/** The city's authoritative totals, from the live city index (not the capped sample). */
export type Totals = { cases: number; animals: number; open: number | null };
/** How much of the city's record the bounded dataset holds. */
export type Loaded = { cases: number; animals: number; totals: Totals; capped: boolean };

export function loadedScope(ds: SpatialDataset, ix: Index, city: string, totals: Totals): Loaded {
  const cells = cityCells(ds, city);
  const cases = casesIn(ds, { cells, from: -Infinity, to: Infinity }).length;
  const animals = animalKnowledge(ds, ix, cells, Infinity).total;
  return { cases, animals, totals, capped: cases < totals.cases || animals < totals.animals };
}
function cityCells(ds: SpatialDataset, city: string): Set<number> | null {
  const cells = new Set<number>();
  ds.cellCity.forEach((c, i) => { if (ds.cities[c]?.name === city) cells.add(i); });
  return cells.size ? cells : null;
}

const f = (n: number) => n.toLocaleString("en-IN");
const share = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

export function findings(ds: SpatialDataset, ix: Index, city: string, period: Period, ld: Loaded): Finding[] {
  const scopeCells = cityCells(ds, city);
  const cells = scopeCells ?? new Set<number>();
  const t = ds.today, from = period === "12m" ? t - 365 : 0;
  const idx = casesIn(ds, { cells: scopeCells, from, to: t });
  const ev = cityEvidence(city, cells.size);
  const periodText = period === "12m" ? "the last 12 months, by request date" : ld.capped ? "the loaded record, by request date" : "everything on the record, by request date";
  const loaded = ld.capped ? `The most recent ${ld.totals.cases ? `${f(ld.cases)} of ${f(ld.totals.cases)} requests and ` : ""}${f(ld.animals)} of ${f(ld.totals.animals)} animal profiles in ${city}. Older records are not in this figure.` : undefined;
  const of = (n: number, unit: string) => (ld.capped ? `the ${f(n)} most recent ${unit} loaded` : `${f(n)} ${unit}`);
  const src = `Records of organisations working in ${city}, imported or recorded in StrayPaw`;
  const out: Finding[] = [];
  const street = ev.kind !== "clinical";

  if (idx.length) {
    const by = fates(ds, idx), n = idx.length;
    const done = by.closed, none = by.no_action + by.not_attended, unk = by.unknown, live = by.open + by.in_progress;
    out.push({
      id: "outcome", kicker: "What happened to requests", lens: "requests",
      claim: `Of ${of(n, "requests for help")}, ${f(done)} (${share(done, n)}) were closed after field work and ${f(none)} (${share(none, n)}) closed without it; ${f(unk)} have no recorded outcome.`,
      qualify: by.other_ngo ? `${f(by.other_ngo)} were handed to another organisation, whose outcome this record does not hold.` : "An outcome is what an organisation recorded, not a verified result.",
      figure: { kind: "parts", of: "requests", parts: FATES.map((k) => ({ label: ({ closed: "Closed after field work", other_ngo: "Handed on", no_action: "No field action", not_attended: "Not attended", in_progress: "In progress", open: "Open", unknown: "Not recorded" })[k], n: by[k], tone: (({ closed: "care", other_ngo: "other", no_action: "no", not_attended: "na", in_progress: "progress", open: "open", unknown: "unknown" }) as const)[k] })) },
      method: { unit: "A request for help (a case)", denominator: `${f(n)} requests made in the period`, unknown: `${f(unk)} with no outcome; ${f(live)} still open`, source: src, precision: ev.precision, period: periodText },
    });

    const cr = closureReasons(ds, idx);
    if (cr.total >= 5) {
      const top = cr.parts.filter((p) => p.reason !== "unspecified")[0];
      out.push({
        id: "why", kicker: "Why requests closed without action",
        claim: top ? `When a request closed without field action, the most common recorded reason was “${(CLOSURE_META[top.reason as ClosureReason]?.label ?? top.reason).toLowerCase()}” (${f(top.n)} of ${f(cr.total)}). ${f(cr.unspecified)} carry no reason.` : `None of the ${f(cr.total)} requests closed without field action records why.`,
        qualify: "“Could not be found” and “caller unreachable” are different problems with different remedies; a missing reason hides which one this city has.",
        figure: { kind: "bins", of: "requests closed without action", bins: cr.parts.map((p) => ({ label: CLOSURE_META[p.reason as ClosureReason]?.label ?? p.reason, n: p.n, tone: p.reason === "unspecified" ? "unknown" : "no" })) },
        method: { unit: "A request closed without field action or not attended", denominator: `${f(cr.total)} such requests`, unknown: `${f(cr.unspecified)} with no reason recorded`, source: src, precision: ev.precision, period: periodText },
      });
    }

    const fa = firstAction(ds, idx);
    if (fa.known >= 10) {
      out.push({
        id: "speed", kicker: "How soon field work began",
        claim: `Where the day field work began is recorded (${f(fa.known)} requests), half began within ${fa.median} day${fa.median === 1 ? "" : "s"} and nine in ten within ${fa.p90} days.`,
        qualify: `For ${f(fa.unknown)} requests (${share(fa.unknown, fa.known + fa.unknown)}) the start of field work is not recorded; they are not assumed fast or slow.`,
        figure: { kind: "bins", of: "requests", bins: FIRST_ACTION_BINS.map((l, i) => ({ label: l, n: fa.bins[i], tone: i === 5 ? "unknown" : i <= 1 ? "care" : i <= 3 ? "progress" : "no" })) },
        method: { unit: "Days from request to the first recorded field action", denominator: `${f(fa.known)} requests with both dates`, unknown: `${f(fa.unknown)} with no first-action date`, source: src, precision: "Dates as recorded; imported dates as the workbook gave them", period: periodText },
      });
    }

    const ag = openAging(ds, casesIn(ds, { cells: scopeCells, from: 0, to: t }), t);
    if (ag.open) {
      out.push({
        id: "open", kicker: "Requests still open today", lens: "requests",
        claim: ld.capped ? `Among the ${f(ld.cases)} most recent requests loaded, ${f(ag.open)} are open today and ${f(ag.bins[3])} of those have been open for more than 90 days${ld.totals.open !== null ? `; the full record holds ${f(ld.totals.open)} open requests` : ""}.` : `${f(ag.open)} requests are open on the record today; ${f(ag.bins[3])} of them have been open for more than 90 days.`,
        qualify: "A request open on paper for months may have been resolved and never closed in the register. Long-open requests need a decision, not a count.",
        figure: { kind: "bins", of: "open requests", bins: AGE_BINS.map((l, i) => ({ label: l, n: ag.bins[i], tone: i === 3 ? "no" : i === 2 ? "na" : "open" })) },
        method: { unit: "A request with no recorded closure", denominator: `${f(ag.open)} open requests, any request date`, unknown: "Whether a long-open request is still active", source: src, precision: ev.precision, period: "Open on the day this was built" },
      });
    }

    if (street) {
      const loc = localityTable(ds, ix, { cells: scopeCells, from, to: t }, t).filter((r) => r.cases > 0).sort((a, b) => b.cases - a.cases);
      if (loc.length >= 3) {
        const top = loc.slice(0, 8), topN = top.slice(0, 3).reduce((a, r) => a + r.cases, 0);
        out.push({
          id: "where", kicker: "Where requests come from", lens: "requests",
          claim: `Three localities, ${top.slice(0, 3).map((r) => r.name).join(", ")}, account for ${f(topN)} of ${of(idx.length, "requests")} (${share(topN, idx.length)}).`,
          qualify: "Requests measure where people report and where an organisation answers, not where animals are or where need is greatest. A quiet locality may be one nobody reports from.",
          figure: { kind: "table", cols: ["Requests", "No field action", "Open now", "Animals on record"], rows: top.map((r) => ({ name: r.name, cells: [fewOr(r.cases, true), fewOr(r.noAction, true), fewOr(r.open, true), fewOr(r.animals, true)] })) },
          method: { unit: "A request, grouped by the locality its area belongs to", denominator: `${f(idx.length)} requests in the period`, unknown: "Requests with no place are not in any locality", source: src, precision: `${ev.precision}. Counts of one or two are shown as “few”.`, period: periodText },
        });
      }
      const rp = repeatPlaces(ds, idx).filter((r) => r.nYears >= 2).slice(0, 6);
      if (period === "all" && rp.length) {
        out.push({
          id: "repeat", kicker: "Places that ask every year",
          claim: `${f(rp.length)} localit${rp.length === 1 ? "y has" : "ies have"} produced requests in two or more separate years, led by ${rp[0].name} (${rp[0].nYears} years, ${f(rp[0].total)} requests).`,
          qualify: "The record cannot yet say whether the same animal returned; imported cases each made their own animal. It can say which places keep calling.",
          figure: { kind: "table", cols: ["Years with requests", "Requests", "No field action"], rows: rp.map((r) => ({ name: r.name, cells: [String(r.nYears), fewOr(r.total, true), fewOr(r.noAction, true)] })) },
          method: { unit: "A locality, by calendar years with at least one request", denominator: "Localities with a request in two or more years", unknown: "Whether requests concern the same animals", source: src, precision: ev.precision, period: periodText },
        });
      }
    }

    const se = season(ds, idx, t);
    if (se.years.length >= 2) {
      out.push({
        id: "season", kicker: "The rhythm of the year",
        claim: se.peaks.length ? `Requests rise in ${se.peaks.map((k) => MONTHS_LONG[k]).join(" and ")} in every year on record.` : se.surge ? `No month is busier every year; the largest single surge was ${MONTHS_LONG[se.surge.month]} ${se.surge.year}, at ${se.surge.ratio.toFixed(1)}× that year's monthly average.` : "No month is consistently busier than the rest.",
        qualify: se.surge ? "A one-off surge is often a campaign or a backlog entered at once, not a change in animals' lives." : "A season needs several years of record; with fewer, treat any pattern as a question.",
        figure: { kind: "season", years: se.years, peaks: se.peaks },
        method: { unit: "Requests per calendar month", denominator: "Each year's own monthly average", unknown: "Months before the record starts are shown as no record, not zero", source: src, precision: "Request dates as recorded", period: periodText },
      });
    }
  }

  const ak = animalKnowledge(ds, ix, scopeCells, t);
  if (ak.total) {
    out.push({
      id: "known", kicker: "What is known about the animals", lens: "animals",
      claim: `${ld.capped ? `Of the ${f(ak.total)} most recently seen animal profiles loaded (${f(ld.totals.animals)} on the record), s` : `${f(ak.total)} animal profiles are on the record. S`}terilisation is recorded for ${f(ak.ster.yes + ak.ster.no)} of them (${f(ak.ster.yes)} sterilised) and not recorded for ${f(ak.ster.unknown)}.`,
      qualify: "Profiles are not a census: one animal can have several profiles across organisations, and most animals in a city have none. A low recorded rate is not a low actual rate.",
      figure: { kind: "parts", of: "animal profiles", parts: [{ label: "Sterilised (recorded)", n: ak.ster.yes, tone: "care" }, { label: "Recorded not sterilised", n: ak.ster.no, tone: "no" }, { label: "Not recorded", n: ak.ster.unknown, tone: "unknown" }] },
      method: { unit: "An animal profile", denominator: `${f(ak.total)} profiles first recorded by the build day`, unknown: `${f(ak.ster.unknown)} with no sterilisation status; ${f(ak.vacc.unknown)} with no vaccination status`, source: src, precision: ev.precision, period: "Cumulative to the build day" },
    });
  }

  const cp = completeness(ds, ix, idx, scopeCells, t).filter((r) => r.total > 0);
  if (cp.length) {
    const weakest = [...cp].sort((a, b) => a.known / a.total - b.known / b.total)[0];
    out.push({
      id: "gaps", kicker: "What the record cannot say yet",
      claim: `The thinnest part of ${city}'s record is ${weakest.label.toLowerCase()}: known for ${share(weakest.known, weakest.total)} of ${weakest.of}. The next useful thing to record is ${weakest.next}.`,
      qualify: "Each gap limits a finding above. Closing it is cheaper than any new survey.",
      figure: { kind: "complete", rows: cp.map((r) => ({ label: r.label, of: r.of, known: r.known, partial: r.partial ?? 0, total: r.total })) },
      method: { unit: "A field on a request or an animal profile", denominator: "Each row's own total", unknown: "The hatched remainder of each row", source: src, precision: ev.precision, period: periodText },
    });
  }
  for (const x of out) x.method.loaded = loaded;
  return out;
}
