"use client";

/* ════════════════════════════════════════════════════════════════════
   The report's chapters. Each one opens with its question and answers it
   in a sentence computed from the records in scope, then shows the
   evidence for that sentence. A chart that cannot support a sentence does
   not belong here.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { ShareBand } from "@/components/system/ShareBand";
import { HexPlate, type PlateCell } from "@/components/system/HexPlate";
import { HatchDef } from "@/components/system/Hatch";
import { LedgerWall } from "@/components/viz/LedgerWall";
import { ResponseCurve } from "@/components/viz/ResponseCurve";
import { CareCalendar, CourseRows, YearDots } from "@/components/viz/Matrix";
import { FEW, isSparse, MONTHS, pct, type Index } from "@/lib/spatial/engine";
import {
  AGE_BINS, animalKnowledge, careKinds, closureReasons, conditionOutcome, followups, intakeMix, openAging, resolution,
} from "@/lib/spatial/measures";
import {
  careMonthly, cellOutcomes, completeness, courses, FATES, FATE_META, fates, footprints, futureDated, ledger, repeatPlaces, season, type Fate,
} from "@/lib/spatial/report";
import { C, C_STRIDE, type SpatialDataset } from "@/lib/spatial/types";
import { INTAKE_META, type Intake } from "@/lib/register/taxonomy";

export type Ctx = {
  ds: SpatialDataset;
  ix: Index;
  scope: "public" | "org";
  cells: Set<number> | null;
  city: number;
  idx: number[];
  fromDay: number;
  toDay: number;
  /** Few-aware count: "few" for one or two, on a small public place. */
  n: (x: number) => string;
  guard: boolean;
  place: string;
  mapHref: (mode: string, extra?: Record<string, string>) => string;
  focus: Fate | null;
  setFocus: (f: Fate | null) => void;
  setCondition: (c: number) => void;
  setLocality: (l: number) => void;
  setCell: (c: number) => void;
};

const fmt = (x: number) => x.toLocaleString("en-IN");
const share = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const words = (x: number) => (["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][x] ?? fmt(x));
const oneIn = (a: number, b: number) => { const r = b / Math.max(1, a); return r >= 1.5 && r < 11 ? `one in ${words(Math.round(r))}` : `${share(a, b)}%`; };

const CLOSURE_LABEL: Record<string, string> = {
  could_not_locate: "Animal could not be found", died: "Died before help arrived", recovered: "Recovered on its own",
  caller_unreachable: "Caller could not be reached", other_ngo: "Another organisation took it", duplicate: "Duplicate request",
  not_attended: "Not attended", other: "Other", unspecified: "Reason not recorded",
};
const CARE_LABEL: Record<string, string> = {
  treatment: "Treatment", diagnostic: "Diagnostics", surgery: "Surgery", sterilisation: "Sterilisation (ABC)", vaccination: "Vaccination (ARV)",
  wound_care: "Wound care", chemotherapy: "Chemotherapy (TVT)", rescue: "Rescue and transport", other: "Other care",
};

export function Chapter({ n, id, q, answer, children, map }: { n: number; id: string; q: string; answer: ReactNode; children: ReactNode; map?: { href: string; label: string } }) {
  return (
    <section className="an-ch" id={id} aria-labelledby={`${id}-q`}>
      <header className="an-ch-head">
        <p className="an-ch-n sys-mono">{String(n).padStart(2, "0")}</p>
        <h2 id={`${id}-q`}>{q}</h2>
        <p className="an-ch-answer">{answer}</p>
      </header>
      {children}
      {map && <Link href={map.href} className="an-onmap">{map.label} <ArrowUpRight size={14} /></Link>}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="an-empty">{children}</p>;
}

/* ── 1. What happens to a request ─────────────────────────────────── */
export function Happens({ c }: { c: Ctx }) {
  const { ds, idx, n } = c;
  const by = useMemo(() => fates(ds, idx), [ds, idx]);
  const wall = useMemo(() => ledger(ds, idx, c.fromDay, c.toDay), [ds, idx, c.fromDay, c.toDay]);
  const peaks = useMemo(() => season(ds, idx, ds.today).peaks, [ds, idx]);
  const reasons = useMemo(() => closureReasons(ds, idx), [ds, idx]);
  const conds = useMemo(() => conditionOutcome(ds, idx), [ds, idx]);
  const T = idx.length;
  const noAct = by.no_action + by.not_attended;
  const top = reasons.parts.find((p) => p.reason !== "unspecified");
  if (!T) return <Chapter n={1} id="happens" q="What happens to a request for help?" answer="No request in this place and period."><Empty>Widen the period or step out to the city.</Empty></Chapter>;
  const answer = c.guard && isSparse(T)
    ? <>Few requests are recorded here — too few to say what usually happens.</>
    : <>
      <b>{share(by.closed, T)}%</b> were closed after field work. <b>{noAct ? oneIn(noAct, T) : "None"}</b>{noAct ? ` — ${n(noAct)} — closed without it` : " closed without it"}
      {top && noAct >= 10 ? <>, most often because <em>{CLOSURE_LABEL[top.reason]?.toLowerCase()}</em>.</> : "."}
      {by.in_progress + by.open > 0 && <> {n(by.in_progress + by.open)} are still open.</>}
    </>;
  return (
    <Chapter n={1} id="happens" q="What happens to a request for help?" answer={answer} map={{ href: c.mapHref("cases", { lens: "noaction" }), label: "See where requests closed without action" }}>
      <div className="an-fates" role="group" aria-label="Show one outcome">
        {FATES.filter((f) => by[f] > 0).map((f) => (
          <button key={f} type="button" aria-pressed={c.focus === f} className={c.focus === f ? "is-on" : c.focus ? "is-off" : ""} onClick={() => c.setFocus(c.focus === f ? null : f)}>
            <i className={FATE_META[f].hatch ? "is-hatch" : ""} style={{ background: FATE_META[f].hatch ? undefined : FATE_META[f].color }} aria-hidden />
            <b>{n(by[f])}</b>
            <span>{FATE_META[f].label}</span>
          </button>
        ))}
      </div>
      {c.guard && isSparse(T) ? null : (
        <figure className="an-fig">
          <LedgerWall months={wall.months} focus={c.focus} peaks={peaks} label={`${fmt(T)} requests by month and outcome, ${c.place}`} idPrefix="wall" />
          <figcaption>One square is one request, in the month it came in, stacked by what happened to it.{peaks.length ? <> <span className="an-peak-key" aria-hidden /> marks months busier than usual.</> : null}</figcaption>
        </figure>
      )}

      <div className="an-split">
        <div>
          <h3 className="an-h3">Why requests closed without action</h3>
          {reasons.total ? (
            <>
              <ShareBand height={12} parts={reasons.parts.map((p, i) => ({
                key: p.reason, n: p.n, label: CLOSURE_LABEL[p.reason] ?? p.reason, hatch: p.reason === "unspecified",
                color: ["var(--sp-ink)", "#42526b", "#6b7a8f", "#94a0b1", "#b9c1cc", "#d3d8df"][i] ?? "#d3d8df",
              }))} />
              {reasons.unspecified > 0 && <p className="an-note">For {n(reasons.unspecified)} of them nobody wrote down why. “Could not find the animal” and “could not reach the caller” need different fixes, so the reason is worth one tap.</p>}
            </>
          ) : <Empty>No request here closed without action.</Empty>}
        </div>
        <div>
          <h3 className="an-h3">By condition</h3>
          <ol className="an-conds">
            {conds.filter((r) => r.condition !== "Not recorded").slice(0, 8).map((r) => (
              <li key={r.condition}>
                <button type="button" onClick={() => c.setCondition(r.index)} title="Show only this condition">
                  <span>{r.condition}</span>
                  <b className="sys-mono">{n(r.total)}</b>
                  <ShareBand height={6} legend={false} parts={FATES.map((f) => ({ key: f, n: r.by[f], color: FATE_META[f].color, hatch: FATE_META[f].hatch, label: FATE_META[f].short }))} />
                  <em>{r.total >= 10 ? `${share(r.by.no_action, r.total)}% no action` : ""}</em>
                </button>
              </li>
            ))}
          </ol>
          {conds.some((r) => r.condition === "Not recorded") && <p className="an-note">{n(conds.find((r) => r.condition === "Not recorded")!.total)} requests have no condition recorded.</p>}
        </div>
      </div>
    </Chapter>
  );
}

/* ── 2. When ───────────────────────────────────────────────────────── */
export function When({ c }: { c: Ctx }) {
  const { ds, idx, n } = c;
  const s = useMemo(() => season(ds, idx, ds.today), [ds, idx]);
  if (!idx.length || !s.years.length) return null;
  const max = Math.max(1, ...s.years.flatMap((y) => y.months.map((v) => v ?? 0)));
  const peakNames = s.peaks.map((k) => MONTHS[k]);
  const change = s.yoy ? Math.round(((s.yoy.now - s.yoy.before) / s.yoy.before) * 100) : null;
  const answer = <>
    {peakNames.length ? <>Requests rise every year in <b>{peakNames.length > 2 ? `${peakNames.slice(0, -1).join(", ")} and ${peakNames[peakNames.length - 1]}` : peakNames.join(" and ")}</b>. </> : <>No month is busy every year — the record does not show a season yet. </>}
    {s.surge && <>The sharpest surge on record was <b>{MONTHS[s.surge.month]} {s.surge.year}</b>, at {s.surge.ratio.toFixed(1)} times that year&rsquo;s average month. </>}
    {change !== null && s.yoy && <>So far this year, {n(s.yoy.now)} requests against {n(s.yoy.before)} in the same {words(s.yoy.months)} months last year — <b>{change > 0 ? `${change}% more` : `${Math.abs(change)}% fewer`}</b>{change < 0 ? ", which may mean fewer records rather than fewer animals in need" : ""}.</>}
  </>;
  return (
    <Chapter n={2} id="when" q="When do requests come in?" answer={answer}>
      <div className="an-season" role="table" aria-label="Requests by month and year">
        <div className="an-season-row is-head" role="row">
          <span role="columnheader" />
          {MONTHS.map((m, k) => <span key={m} role="columnheader" className={s.peaks.includes(k) ? "is-peak" : ""}>{m}</span>)}
        </div>
        {s.years.map((y) => (
          <div key={y.year} className="an-season-row" role="row">
            <span role="rowheader" className="sys-mono">{y.year}</span>
            {y.months.map((v, k) => (
              <span key={k} role="cell" className={v === null ? "is-none" : v / max > 0.62 ? "is-deep" : ""} style={v ? { ["--a" as string]: String(0.12 + 0.88 * (v / max)) } : undefined} aria-label={v === null ? `${MONTHS[k]} ${y.year}: no record` : `${MONTHS[k]} ${y.year}: ${v}`}>
                {v === null ? "" : <b className="sys-mono">{n(v)}</b>}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="an-note">Blank squares are months outside the record, not months without need.</p>
    </Chapter>
  );
}

/* ── 3. Response ───────────────────────────────────────────────────── */
export function Response({ c }: { c: Ctx }) {
  const { ds, idx, n } = c;
  const days = useMemo(() => idx.map((i) => ds.cases[i * C_STRIDE + C.firstAction]).filter((d) => d >= 0), [ds, idx]);
  const unknown = idx.length - days.length;
  const fu = useMemo(() => followups(ds, idx), [ds, idx]);
  const res = useMemo(() => resolution(ds, idx), [ds, idx]);
  const aging = useMemo(() => openAging(ds, idx, c.toDay), [ds, idx, c.toDay]);
  const intake = useMemo(() => intakeMix(ds, idx), [ds, idx]);
  const missedAt = useMemo(() => {
    const m = new Map<number, number>();
    for (const i of idx) {
      const o = i * C_STRIDE, miss = ds.cases[o + C.fuMissed], l = ds.cellLocality[ds.cases[o + C.cell]];
      if (miss > 0 && l >= 0) m.set(l, (m.get(l) ?? 0) + miss);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [ds, idx]);
  if (!idx.length) return null;
  const sorted = [...days].sort((a, b) => a - b);
  const within = (d: number) => (sorted.length ? share(sorted.filter((x) => x <= d).length, sorted.length) : 0);
  const answer = days.length >= FEW
    ? <>Where the day is recorded, <b>{within(1)}%</b> saw field work by the next day and <b>{within(7)}%</b> within a week. {aging.stale.length > 0 && <><b>{n(aging.stale.length)}</b> requests have been open for more than ninety days.</>}</>
    : <>Too few requests here have the day field work began.</>;
  return (
    <Chapter n={3} id="response" q="How fast does work start — and is it followed through?" answer={answer} map={{ href: c.mapHref("cases"), label: "See open work on the map" }}>
      <div className="an-split is-wide">
        <div>
          <h3 className="an-h3">Days from request to first field action</h3>
          {days.length >= FEW ? <ResponseCurve days={days} unknown={unknown} idPrefix="resp" /> : <Empty>Not enough recorded days to draw.</Empty>}
          {unknown > 0 && <p className="an-note">{n(unknown)} requests ({share(unknown, idx.length)}%) have no day recorded, drawn hatched at their real size.</p>}
        </div>
        <div>
          <h3 className="an-h3">How requests arrive</h3>
          <ShareBand height={12} parts={intake.map((r, i) => ({
            key: r.intake, n: r.n, hatch: r.intake === "not_recorded", label: r.intake === "not_recorded" ? "Not recorded" : INTAKE_META[r.intake as Intake] ?? r.intake,
            color: ["var(--sp-blue)", "var(--sp-seq-3)", "var(--sp-seq-2)", "var(--sp-seq-1)", "#d6deef"][i],
          }))} />
        </div>
      </div>

      <div className="an-trio">
        <div>
          <h3 className="an-h3">Follow-ups</h3>
          {fu.total ? (
            <>
              <p className="an-big"><b className={fu.missed ? "is-flame" : ""}>{n(fu.missed)}</b> missed</p>
              <ShareBand height={10} parts={[
                { key: "d", n: fu.done, color: "var(--sp-blue)", label: "Done" },
                { key: "m", n: fu.missed, color: "var(--sp-flame)", label: "Missed" },
                { key: "u", n: fu.upcoming, color: "var(--sp-seq-2)", label: "Upcoming" },
              ]} />
              <p className="an-note">{n(fu.casesWithFollowups)} of {n(fu.cases)} requests have any follow-up on record.</p>
              {missedAt.length > 0 && (
                <ol className="an-mini">
                  {missedAt.map(([l, v]) => <li key={l}><button type="button" onClick={() => c.setLocality(l)}>{ds.localities[l]}</button><b className="sys-mono">{n(v)} missed</b></li>)}
                </ol>
              )}
            </>
          ) : <Empty>No follow-ups recorded.</Empty>}
        </div>
        <div>
          <h3 className="an-h3">Time to close</h3>
          {res.known >= 5
            ? <p className="an-big"><b>{res.median}</b> days, median</p>
            : <p className="an-big is-quiet"><b>Not measurable</b></p>}
          <p className="an-note">
            {res.known >= 5 ? <>From {n(res.known)} closures with a recorded date. </> : <>{res.known ? `Only ${n(res.known)} closure${res.known === 1 ? " has" : "s have"} a recorded date. ` : "No closure has a recorded date. "}</>}
            {res.workbook.n > 0 && <>{n(res.workbook.n)} imported closures carry a date taken from the source workbook: median {res.workbook.median} days, three in four within {res.workbook.p75} — read those as indicative. </>}
            {res.excluded > 0 && <>{n(res.excluded)} imported closures had no date at all and are left out, not counted as same-day.</>}
          </p>
        </div>
        <div>
          <h3 className="an-h3">Open work, by age</h3>
          {aging.open ? (
            <>
              <ol className="an-aging">
                {AGE_BINS.map((b, i) => (
                  <li key={b} className={i === 3 ? "is-stale" : ""}>
                    <span>{b}</span>
                    <i style={{ width: `${Math.max(2, (aging.bins[i] / Math.max(1, ...aging.bins)) * 100)}%` }} />
                    <b className="sys-mono">{n(aging.bins[i])}</b>
                  </li>
                ))}
              </ol>
              {aging.stale.length > 0 && (c.scope === "org"
                ? <Link href="/partner/review" className="sys-btn is-sm an-review">Review {fmt(aging.stale.length)} stale cases <ArrowUpRight size={14} /></Link>
                : <p className="an-note">A case open for months is usually finished work nobody closed. The organisation reviews these; nothing is closed automatically.</p>)}
            </>
          ) : <Empty>Nothing open.</Empty>}
        </div>
      </div>
    </Chapter>
  );
}

/* ── 4. Where ──────────────────────────────────────────────────────── */
export function Where({ c }: { c: Ctx }) {
  const { ds, idx, n } = c;
  const foot = useMemo(() => footprints(ds, idx), [ds, idx]);
  const outcomes = useMemo(() => cellOutcomes(ds, idx), [ds, idx]);
  const places = useMemo(() => repeatPlaces(ds, idx).slice(0, 10), [ds, idx]);
  const cityCells = useMemo(() => (c.city < 0 ? [] : ds.cells.map((_, i) => i).filter((i) => ds.cellCity[i] === c.city)), [ds, c.city]);
  if (!idx.length) return null;
  if (c.city < 0) return (
    <Chapter n={4} id="where" q="Where does the work concentrate?" answer="Choose a city to see its cells.">
      <Empty>Place is read one city at a time, so each cell can be compared with its neighbours.</Empty>
    </Chapter>
  );
  const box = ds.cities[c.city].box;
  const years = foot.map((f) => f.year);
  const everyYear = places.filter((p) => years.length > 1 && p.nYears === years.length);
  const plateCells = (fill: (i: number) => { fill: string; hatch?: boolean; title?: string } | null): PlateCell[] =>
    cityCells.map((i) => {
      const f = fill(i);
      return { key: ds.cells[i], ring: ds.rings[i], fill: f?.fill ?? "transparent", hatch: f?.hatch, title: f?.title, stroke: f ? undefined : "rgba(11,30,61,0.08)", selected: !!c.cells && c.cells.has(i) && c.cells.size < cityCells.length };
    });
  const pick = (key: string) => { const i = ds.cells.indexOf(key); if (i >= 0) c.setCell(i); };
  const answer = everyYear.length
    ? <><b>{everyYear.length === 1 ? everyYear[0].name : `${everyYear.length} places`}</b> asked for help in every year on record{everyYear.length > 1 ? <> — {everyYear.slice(0, 3).map((p) => p.name).join(", ")}{everyYear.length > 3 ? " and others" : ""}</> : null}. The register cannot yet tell whether the same animal came back; it can tell that the same places do.</>
    : <>Requests are spread thinly; no place has asked in every year on record.</>;
  const seqOf = (v: number, max: number) => ["var(--sp-seq-1)", "var(--sp-seq-2)", "var(--sp-seq-3)", "var(--sp-seq-4)", "var(--sp-seq-5)"][Math.min(4, Math.floor(Math.sqrt(v / Math.max(1, max)) * 5))];
  return (
    <Chapter n={4} id="where" q="Where does the work concentrate — and where does it fail?" answer={answer} map={{ href: c.mapHref("density"), label: "Open these places on the map" }}>
      <h3 className="an-h3">Where requests came from, year by year</h3>
      <div className="an-plates">
        {foot.map((f) => {
          const max = Math.max(1, ...f.cells.values());
          return (
            <figure key={f.year}>
              <HexPlate width={260} height={220} box={box} label={`Requests by cell in ${f.year}`} onCell={pick}
                cells={plateCells((i) => { const v = f.cells.get(i) ?? 0; return v ? { fill: seqOf(v, max), title: `${ds.localities[ds.cellLocality[i]] ?? "Cell"}: ${n(v)}` } : null; })} />
              <figcaption><b className="sys-mono">{f.year}</b> {n(f.total)} requests in {n(f.cells.size)} cells</figcaption>
            </figure>
          );
        })}
      </div>
      <div className="an-plates is-two">
        <figure>
          <svg width="0" height="0" aria-hidden><defs><HatchDef id="an-few" /></defs></svg>
          <HexPlate width={320} height={260} box={box} hatchId="an-few" label="Share of requests closed without action, by cell" onCell={pick}
            cells={plateCells((i) => {
              const o = outcomes.get(i); if (!o) return null;
              if (o.n < 5) return { fill: "transparent", hatch: true, title: "Fewer than five requests: too few for a share" };
              const r = o.noAction / o.n;
              return { fill: ["var(--sp-att-1)", "var(--sp-att-2)", "var(--sp-att-3)", "var(--sp-att-4)"][Math.min(3, Math.floor(r * 4 / 0.6))], title: `${Math.round(r * 100)}% of ${o.n} closed without action` };
            })} />
          <figcaption>Closed without action, as a share of each cell&rsquo;s requests. Hatched: fewer than five requests, too few for a share.</figcaption>
        </figure>
        <figure>
          <HexPlate width={320} height={260} box={box} label="Requests where the animal could not be found, by cell" onCell={pick}
            cells={plateCells((i) => { const o = outcomes.get(i); if (!o?.couldNotLocate) return o ? { fill: "var(--sp-seq-0)" } : null; return { fill: ["var(--sp-att-2)", "var(--sp-att-3)", "var(--sp-att-4)"][Math.min(2, o.couldNotLocate - 1)], title: `${n(o.couldNotLocate)} could not be found` }; })} />
          <figcaption>Where the animal could not be found. A cluster says the address is the problem, not the team.</figcaption>
        </figure>
      </div>
      <h3 className="an-h3">Places that keep asking</h3>
      {places.length ? (
        <YearDots rows={places.map((p) => ({ key: String(p.locality), name: p.name, years: p.years, total: p.total, noAction: p.noAction }))} years={years} few={n}
          onPick={(k) => c.setLocality(Number(k))} label="Requests per place per year" />
      ) : <Empty>No named places in this selection.</Empty>}
    </Chapter>
  );
}

/* ── 5. Intervention ───────────────────────────────────────────────── */
export function Intervention({ c }: { c: Ctx }) {
  const { ds, ix, n } = c;
  const know = useMemo(() => animalKnowledge(ds, ix, c.cells, c.toDay), [ds, ix, c.cells, c.toDay]);
  const kinds = useMemo(() => careKinds(ds, ix, { cells: c.cells, from: c.fromDay, to: c.toDay }), [ds, ix, c.cells, c.fromDay, c.toDay]);
  const cal = useMemo(() => careMonthly(ds, ix, c.cells, c.fromDay, c.toDay), [ds, ix, c.cells, c.fromDay, c.toDay]);
  const tvt = useMemo(() => courses(ds, ix, c.cells, c.fromDay, c.toDay), [ds, ix, c.cells, c.fromDay, c.toDay]);
  if (!know.total) return null;
  const sterKnown = know.ster.yes + know.ster.no, vaccKnown = know.vacc.yes + know.vacc.no;
  const answer = c.guard && know.total < FEW
    ? <>Too few animals are recorded here to say how many are sterilised or vaccinated.</>
    : <>A sterilisation is on record for <b>{n(know.ster.yes)}</b> of {n(know.total)} animals and a vaccination for <b>{n(know.vacc.yes)}</b>. For <b>{share(know.ster.unknown, know.total)}%</b>, nobody has recorded either way — which is not the same as “not sterilised”.</>;
  const rows = kinds.slice(0, 7).map((k) => ({ key: k.kind, label: CARE_LABEL[k.kind] ?? k.kind, values: cal.byKind.get(ds.dict.care.indexOf(k.kind)) ?? [], total: k.n }));
  return (
    <Chapter n={5} id="intervention" q="How much sterilisation and vaccination is recorded?" answer={answer} map={{ href: c.mapHref("abc"), label: "See ABC coverage by cell" }}>
      {!(c.guard && know.total < FEW) && (
        <div className="an-split">
          <div>
            <p className="an-big"><b className="is-blue">{n(know.ster.yes)}</b> sterilised, on record</p>
            <ShareBand height={16} total={know.total} parts={[
              { key: "y", n: know.ster.yes, color: "var(--sp-blue)", label: "Sterilised" },
              { key: "n", n: know.ster.no, color: "var(--sp-muted)", label: "Not sterilised" },
              { key: "u", n: know.ster.unknown, hatch: true, label: "Not recorded" },
            ]} />
            <p className="an-note">Status recorded for {n(sterKnown)} of {n(know.total)} animals.</p>
          </div>
          <div>
            <p className="an-big"><b className="is-arv">{n(know.vacc.yes)}</b> vaccinated, on record</p>
            <ShareBand height={16} total={know.total} parts={[
              { key: "y", n: know.vacc.yes, color: "var(--sp-arv)", label: "Vaccinated" },
              { key: "n", n: know.vacc.no, color: "var(--sp-muted)", label: "Not vaccinated" },
              { key: "u", n: know.vacc.unknown, hatch: true, label: "Not recorded" },
            ]} />
            <p className="an-note">Status recorded for {n(vaccKnown)} of {n(know.total)}. {know.due > 0 && <>{n(know.due)} vaccinated animals are past a year since their last dose and due a booster.</>}</p>
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <>
          <h3 className="an-h3">Care recorded, month by month</h3>
          <CareCalendar rows={rows} m0={cal.m0} label="Care events by kind and month" />
        </>
      )}
      {tvt.animals > 0 && (
        <div className="an-course">
          <div>
            <h3 className="an-h3">Are treatment courses finished?</h3>
            <p className="an-text">
              {n(tvt.animals)} animals began chemotherapy for TVT, a tumour treated with weekly doses — usually four to six.
              {tvt.oneOnly === tvt.animals ? <> Every one of them has <b>a single session</b> on record. Either courses stop after one dose, or later doses are not being written down; the register cannot tell which.</>
                : <> {n(tvt.fourPlus)} have four or more sessions on record; {n(tvt.oneOnly)} have only one.</>}
            </p>
          </div>
          <CourseRows counts={[...tvt.dist.entries()].flatMap(([k, v]) => Array(v).fill(k)).slice(0, 40)} label={`${tvt.animals} TVT courses, sessions on record against four expected`} />
        </div>
      )}
    </Chapter>
  );
}

/* ── 6. Evidence ───────────────────────────────────────────────────── */
export function Evidence({ c }: { c: Ctx }) {
  const { ds, ix, idx, n } = c;
  const rows = useMemo(() => completeness(ds, ix, idx, c.cells, c.toDay), [ds, ix, idx, c.cells, c.toDay]);
  const future = useMemo(() => futureDated(ds), [ds]);
  const orgShare = useMemo(() => {
    if (c.scope !== "public" || !idx.length) return null;
    const m = new Map<number, number>();
    for (const i of idx) { const o = ds.cases[i * C_STRIDE + C.org]; m.set(o, (m.get(o) ?? 0) + 1); }
    const top = Math.max(...m.values());
    return { orgs: [...m.keys()].filter((k) => k >= 0).length, top: top / idx.length };
  }, [ds, idx, c.scope]);
  const next = rows.filter((r) => r.total >= 5 && r.known / r.total < 0.8).sort((a, b) => (b.total - b.known) - (a.total - a.known)).slice(0, 3);
  const worst = [...rows].filter((r) => r.total).sort((a, b) => a.known / a.total - b.known / b.total)[0];
  const answer = worst
    ? <>The thinnest field is <b>{worst.label.toLowerCase()}</b>: recorded for {share(worst.known, worst.total)}% of {worst.of}. Every chart above draws what is missing as hatched rather than leaving it out.</>
    : <>Nothing to measure yet.</>;
  return (
    <Chapter n={6} id="evidence" q="What does the register not know?" answer={answer}>
      <ol className="an-complete">
        {rows.filter((r) => r.total > 0).map((r) => (
          <li key={r.key}>
            <span>{r.label}<small>of {n(r.total)} {r.of}</small></span>
            <ShareBand height={8} legend={false} total={r.total} parts={[
              { key: "k", n: r.known, color: "var(--sp-ink)", label: "Recorded" },
              ...(r.partial ? [{ key: "p", n: r.partial, color: "var(--sp-muted)", label: "From the import workbook" }] : []),
              { key: "u", n: r.total - r.known - (r.partial ?? 0), hatch: true, label: "Not recorded" },
            ]} />
            <b className="sys-mono">{r.known > 0 && pct(r.known, r.total) === 0 ? "<1" : pct(r.known, r.total)}%</b>
          </li>
        ))}
      </ol>
      <p className="an-note an-key"><i className="is-rec" /> recorded <i className="is-wb" /> taken from an import workbook <i className="is-unk" /> not recorded</p>
      {next.length > 0 && (
        <div className="an-next">
          <h3 className="an-h3">Record next</h3>
          <ol>{next.map((r) => <li key={r.key}><b>{fmt(r.total - r.known - (r.partial ?? 0))}</b> {r.of} are missing {r.next}.</li>)}</ol>
        </div>
      )}
      <ul className="an-caveats">
        {future > 0 && <li>{fmt(future)} records are dated in the future — typing errors in the source. They are left out of everything drawn over time.</li>}
        {orgShare && orgShare.top >= 0.9 && <li>Almost all of these requests come from one organisation&rsquo;s register. Where other places look quiet, it is because nobody has recorded there yet.</li>}
        <li>These are recorded requests and recorded animals, never a population estimate.</li>
      </ul>
    </Chapter>
  );
}

