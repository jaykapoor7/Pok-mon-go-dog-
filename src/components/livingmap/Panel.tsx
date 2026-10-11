"use client";

/* ════════════════════════════════════════════════════════════════════
   The Living Map's panel: a docked column on a desktop, a bottom sheet
   on a phone. It is also the map's accessible form: every place and
   figure the map draws is listed here as text and as buttons.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, GitCompare, Link2 } from "lucide-react";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { KIND_META, cityEvidence, kindOf } from "@/components/spatial/AtlasRegister";
import { lastActivity, treatments, type Ctx, type Klass, type Question, type QuestionId, type Range } from "@/lib/livingmap/questions";
import { fmt, placeName, totals, type Locality, type Tally } from "@/lib/livingmap/reading";
import type { FoundAnimal } from "@/lib/livingmap/server";
import type { AreaAnimal, MapArea, MapCell, MapCity, NationalCity } from "@/lib/livingmap/types";
import { MapSearch } from "./Search";
import { Timeline } from "./Timeline";
import type { Level } from "./LivingMap";

type Props = {
  level: Level; cities: NationalCity[]; city: string | null; data: MapCity | null; loadState: "idle" | "loading" | "error" | "missing";
  q: Question; questions: Question[]; facet: string; classes: Klass[]; counts: Tally; reading: { lead: string; qualify: string } | null; isolate: string | null;
  places: Locality[]; cells: MapCell[]; classOf: string[]; ctx: Ctx; range: Range; timedActive: boolean;
  area: MapArea | null | "loading" | "error"; areaIndex: number; animalId: string | null; pin: string | null; sheet: "peek" | "half" | "full";
  nationalMeasure: (c: NationalCity) => number;
  onQuestion: (id: QuestionId) => void; onFacet: (f: string) => void; onIsolate: (k: string) => void; onRange: (r: Range) => void;
  onCity: (c: string) => void; onIndia: () => void; onArea: (h3: string) => void; onCloseArea: () => void;
  onAnimal: (id: string) => void; onCloseAnimal: () => void; onPin: (h3: string | null) => void; onPlace: (c: [number, number]) => void;
  onSheet: (s: "peek" | "half" | "full") => void; onFound: (a: FoundAnimal) => void;
};

const STATUS: Record<string, string> = {
  open: "Open", in_progress: "In progress", closed: "Closed after field work", other_ngo: "Handed to another organisation",
  no_action: "Closed, no field action recorded", not_attended: "Not attended",
};
const day = (iso: string | null) => { if (!iso) return "date not recorded"; const d = new Date(iso); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
const since = (iso: string | null) => {
  if (!iso) return "unknown";
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  return d < 1 ? "today" : d < 45 ? `${d} days ago` : d < 540 ? `${Math.round(d / 30)} months ago` : `${(d / 365).toFixed(1).replace(/\.0$/, "")} years ago`;
};
const zoneName = placeName;

export function Panel(p: Props) {
  const next = p.sheet === "peek" ? "half" : p.sheet === "half" ? "full" : "peek";
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);
  const view = `${p.level}:${p.city}:${p.areaIndex}:${p.animalId}`;
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [view]);
  const animal = p.level === "animal" && p.area && typeof p.area === "object" ? p.area.animals.find((a) => a.id === p.animalId) : null;
  const title = p.level === "india" ? "India" : p.level === "city" ? p.city : animal ? animal.title : p.level === "animal" ? "Animal" : p.areaIndex >= 0 ? zoneName(p.cells[p.areaIndex]?.zone) : p.city;
  return (
    <aside className="lm-panel" aria-label="Map reading">
      <button type="button" className="lm-grip" aria-label={p.sheet === "full" ? "Show more map" : "Show more of the panel"} aria-expanded={p.sheet !== "peek"}
        onPointerDown={(e) => { drag.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); }}
        onPointerUp={(e) => {
          const from = drag.current; drag.current = null;
          if (from === null) return;
          if (Math.abs(e.clientY - from) < 24) { p.onSheet(next); return; }
          const up = e.clientY < from;
          p.onSheet(up ? (p.sheet === "peek" ? "half" : "full") : (p.sheet === "full" ? "half" : "peek"));
        }}
        onClick={(e) => { if (e.detail === 0) p.onSheet(next); }}
><i aria-hidden /></button>
      <div className="lm-panel-top">
        <Ladder {...p} />
        <MapSearch cities={p.cities} places={p.places} city={p.city} onCity={p.onCity} onPlace={(pl) => { const best = pl.cells[0]; if (best !== undefined) p.onArea(p.cells[best].h3); }} onFound={p.onFound} />
      </div>
      <div className="lm-panel-body" ref={body}>
        <h1 className="lm-title">{title}</h1>
        {p.level === "animal" ? <AnimalView {...p} /> : p.level === "area" ? <AreaView {...p} /> : (
          <>
            <Questions {...p} />
            {p.level === "india" ? <IndiaView {...p} /> : <CityView {...p} />}
          </>
        )}
      </div>
    </aside>
  );
}

function Ladder(p: Props) {
  const area = p.areaIndex >= 0 ? p.cells[p.areaIndex] : null;
  const animal = p.animalId && p.area && typeof p.area === "object" ? p.area.animals.find((a) => a.id === p.animalId) : null;
  return (
    <nav className="lm-ladder" aria-label="Scale">
      <ol>
        <li><button type="button" onClick={p.onIndia} aria-current={p.level === "india" ? "page" : undefined}>India</button></li>
        {p.city && <li><ChevronRight size={13} aria-hidden /><button type="button" onClick={p.onCloseArea} aria-current={p.level === "city" ? "page" : undefined}>{p.city}</button></li>}
        {area && <li><ChevronRight size={13} aria-hidden /><button type="button" onClick={p.onCloseAnimal} aria-current={p.level === "area" ? "page" : undefined}>{zoneName(area.zone)}</button></li>}
        {p.level === "animal" && <li><ChevronRight size={13} aria-hidden /><span aria-current="page">{animal?.title ?? "Animal"}</span></li>}
      </ol>
    </nav>
  );
}

function Questions(p: Props) {
  return (
    <section className="lm-qs" aria-label="Read the map for">
      <div className="lm-q-row" role="radiogroup" aria-label="Question">
        {p.questions.map((q) => (
          <button key={q.id} type="button" role="radio" aria-checked={p.q.id === q.id} className={p.q.id === q.id ? "is-on" : ""} onClick={() => p.onQuestion(q.id)}
            disabled={p.level === "india" && (q.id === "orgs" || q.id === "gaps")} title={p.level === "india" && (q.id === "orgs" || q.id === "gaps") ? "Open a city to read this" : undefined}>{q.label}</button>
        ))}
      </div>
      <p className="lm-ask">{p.q.ask}</p>
      {p.q.facets && (
        <div className="lm-facets" role="radiogroup" aria-label={`${p.q.label}: which`}>
          {p.q.facets.map((f) => <button key={f.id} type="button" role="radio" aria-checked={p.facet === f.id} onClick={() => p.onFacet(f.id)}>{f.label}</button>)}
        </div>
      )}
    </section>
  );
}

/* ── INDIA ───────────────────────────────────────────────────────── */
function IndiaView(p: Props) {
  const rows = useMemo(() => [...p.cities].sort((a, b) => p.nationalMeasure(b) - p.nationalMeasure(a) || b.animals - a.animals), [p]);
  const street = p.cities.filter((c) => kindOf(c.city, c.cells) !== "clinical");
  const clinical = p.cities.filter((c) => kindOf(c.city, c.cells) === "clinical");
  const sum = (list: NationalCity[], f: (c: NationalCity) => number) => list.reduce((s, c) => s + f(c), 0);
  const max = Math.max(1, ...street.map(p.nationalMeasure));
  const lead = p.q.id === "needs"
    ? `${fmt(sum(p.cities, (c) => c.open_cases ?? 0))} requests for help open on the record, across ${fmt(p.cities.filter((c) => (c.open_cases ?? 0) > 0).length)} cities.`
    : p.q.id === "care"
      ? p.facet === "vacc" ? `${fmt(sum(street, (c) => c.vaccinated ?? 0))} street animals recorded vaccinated.` : p.facet === "treat" ? `Treatment is recorded in ${fmt(p.cities.filter((c) => p.nationalMeasure(c) > 0).length)} cities.` : `${fmt(sum(street, (c) => c.sterilised ?? 0))} street animals recorded sterilised.`
      : `${fmt(sum(street, (c) => c.animals))} street-animal profiles in ${fmt(street.length)} cities.`;
  return (
    <>
      <div className="lm-reading">
        <p className="lm-lead">{p.cities.length ? lead : "Reading the national record…"}</p>
        {clinical.length > 0 && <p className="lm-qualify">{clinical.map((c) => `${c.city}'s ${fmt(c.animals)} records`).join(", ")} {clinical.length === 1 ? "are one clinical register" : "are clinical registers"} kept at city level, drawn hollow and never counted with street profiles. Recorded profiles are not a population estimate.</p>}
      </div>
      <KindKey />
      <section className="lm-sec" aria-labelledby="lm-cities-h">
        <h2 id="lm-cities-h">City registers <span>{p.cities.length}</span></h2>
        <ol className="lm-rank">
          {rows.map((c) => {
            const k = kindOf(c.city, c.cells), v = p.nationalMeasure(c);
            return (
              <li key={c.city}>
                <button type="button" onClick={() => p.onCity(c.city)}>
                  <span className="lm-rank-name"><i style={{ background: k === "clinical" ? "transparent" : KIND_META[k].color, borderColor: KIND_META[k].color }} aria-hidden /><b>{c.city}</b><small>{KIND_META[k].label} · {cityEvidence(c.city, c.cells).precision}</small></span>
                  <span className="lm-rank-v"><b>{v ? fmt(v) : "—"}</b>{k !== "clinical" && <i style={{ width: `${(v / max) * 100}%` }} aria-hidden />}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}

function KindKey() {
  return (
    <ul className="lm-kinds" aria-label="Kinds of record">
      {(Object.keys(KIND_META) as (keyof typeof KIND_META)[]).map((k) => (
        <li key={k}><i style={{ background: k === "clinical" ? "transparent" : KIND_META[k].color, borderColor: KIND_META[k].color }} aria-hidden /><span><b>{KIND_META[k].label}</b> {KIND_META[k].reads}</span></li>
      ))}
    </ul>
  );
}

/* ── CITY ────────────────────────────────────────────────────────── */
function CityView(p: Props) {
  if (p.loadState === "loading" && !p.data) return <p className="lm-status" role="status">Reading {p.city}’s record…</p>;
  if (p.loadState === "missing") return <p className="lm-status" role="status">There is no mapped record for {p.city} yet. A record starts with one report. <button type="button" onClick={p.onIndia}>See every city on the record</button></p>;
  if (p.loadState === "error") return <p className="lm-status" role="status">{p.city}’s record could not be read just now. <button type="button" onClick={() => p.onCity(p.city!)}>Try again</button></p>;
  if (!p.data) return null;
  const ev = cityEvidence(p.data.city, p.cells.length);
  const max = Math.max(1, ...p.places.map((l) => l.v));
  return (
    <>
      <p className="lm-kind"><i style={{ background: KIND_META[p.data.kind].color }} aria-hidden />{ev.label} · {ev.precision}</p>
      {p.reading && (
        <div className="lm-reading" aria-live="polite">
          <p className="lm-lead">{p.reading.lead}</p>
          <p className="lm-qualify">{p.reading.qualify}</p>
        </div>
      )}
      <Legend {...p} />
      {p.timedActive && p.data.months.length > 0 && (
        <section className="lm-sec" aria-label="Over time">
          <Timeline months={p.data.months} range={p.range} onRange={p.onRange} careLabel={p.q.id === "care" ? "Dated care" : "Dated care"} />
        </section>
      )}
      {p.timedActive && p.data.months.length === 0 && <p className="lm-note">No dates on this city’s record, so it cannot be read over time.</p>}
      <section className="lm-sec" aria-labelledby="lm-places-h">
        <h2 id="lm-places-h">Localities, by {p.q.unit(p.facet)} <span>{p.places.length}</span></h2>
        <ol className="lm-rank">
          {p.places.slice(0, 12).map((l) => (
            <li key={l.name}>
              <button type="button" onClick={() => { const best = [...l.cells].sort((a, b) => p.q.measure(p.cells[b], p.facet, p.ctx, b) - p.q.measure(p.cells[a], p.facet, p.ctx, a))[0]; p.onArea(p.cells[best].h3); }}>
                <span className="lm-rank-name"><b>{l.name}</b><small>{l.cells.length} {l.cells.length === 1 ? "area" : "areas"} · {fmt(l.animals)} animals</small></span>
                <span className="lm-rank-v"><b>{l.v ? fmt(l.v) : "—"}</b><i style={{ width: `${(l.v / max) * 100}%` }} aria-hidden /></span>
              </button>
            </li>
          ))}
        </ol>
      </section>
      <DataNote data={p.data} cells={p.cells} />
    </>
  );
}

function Legend(p: Props) {
  return (
    <section className="lm-legend" aria-label="Legend: tap a row to show only those areas">
      <ul>
        {p.classes.map((k) => {
          /* The bordering areas are not on the record, so they are counted from the edge ring itself. */
          const row = k.id === "edge" && p.data?.edge.length ? { areas: p.data.edge.length, v: 0 } : p.counts.get(k.id);
          if (!k.label && !row) return null;
          return (
            <li key={k.id}>
              <button type="button" aria-pressed={p.isolate === k.id} className={p.isolate && p.isolate !== k.id ? "is-dim" : ""} onClick={() => p.onIsolate(k.id)} disabled={!row || k.id === "edge"}>
                <Swatch k={k} />
                <span className="lm-lg-l">{k.label || <span className="lm-lg-step" aria-label="intermediate step" />}</span>
                <span className="lm-lg-n">{row ? `${fmt(row.areas)} ${row.areas === 1 ? "area" : "areas"}` : "—"}</span>
              </button>
              {k.note && p.isolate === k.id && <p className="lm-lg-note">{k.note}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Swatch({ k }: { k: Klass }) {
  return <i className={`lm-sw is-${k.kind}`} style={k.kind === "value" ? { background: k.color, borderColor: k.color } : k.kind === "unknown" ? { ["--hc" as string]: k.color } : undefined} aria-hidden />;
}

function DataNote({ data, cells }: { data: MapCity; cells: MapCell[] }) {
  const s = totals(cells);
  return (
    <section className="lm-sec lm-datanote" aria-label="About this record">
      <h2>About this record</h2>
      <p>{fmt(s.animals)} animals and {fmt(s.cases)} requests in {fmt(s.areas)} areas of about 0.74 km² each. {fmt(s.exact)} animals were placed from a map point; the rest by a written locality, so their area is approximate. Latest record {since(s.last)}.</p>
      <p>The map never shows anything finer than an area. Areas next to the record with nothing in it are hatched: unreported, not empty. Read {day(data.built)}.</p>
    </section>
  );
}

/* ── AREA ────────────────────────────────────────────────────────── */
function AreaView(p: Props) {
  const c = p.areaIndex >= 0 ? p.cells[p.areaIndex] : null;
  const [all, setAll] = useState(false);
  const typical = useMemo(() => {
    const vals = (f: (x: MapCell) => number) => { const v = p.cells.map(f).filter((n) => n > 0).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
    return { animals: vals((x) => x.animals), cases: vals((x) => x.cases) };
  }, [p.cells]);
  if (!c) return <p className="lm-status" role="status">{p.loadState === "loading" ? "Reading the area…" : "This area is not on the city’s record."} <button type="button" onClick={p.onCloseArea}>Back to {p.city}</button></p>;
  const k = p.classes.find((x) => x.id === p.classOf[p.areaIndex]);
  const a = typeof p.area === "object" ? p.area : null;
  const pinned = p.pin && p.pin !== c.h3 ? p.cells.find((x) => x.h3 === p.pin) ?? null : null;
  const share = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");
  const versus = (v: number, t: number) => (!t || !v ? null : v >= t * 1.5 ? `${(v / t).toFixed(1).replace(/\.0$/, "")}× the city’s typical area` : v <= t / 1.5 ? "below the city’s typical area" : "about typical for the city");
  const shown = a ? (all ? a.animals : a.animals.slice(0, 12)) : [];
  return (
    <>
      <p className="lm-kind">Area of about 0.74 km² in {p.city} · {c.exact_loc ? `${fmt(c.exact_loc)} placed from a map point` : "placed by locality name"}</p>
      {k && <p className="lm-areaclass"><Swatch k={k} />{p.q.label}: <b>{k.label || "—"}</b></p>}
      <dl className="lm-figs">
        <Fig label="Animals on record" v={fmt(c.animals)} note={versus(c.animals, typical.animals)} />
        <Fig label="Open requests" v={fmt(c.open_cases)} note={c.open_30 ? `${fmt(c.open_30)} waiting over 30 days` : c.cases ? `of ${fmt(c.cases)} recorded here` : "no requests recorded"} hot={c.open_cases > 0} />
        <Fig label="Sterilised" v={fmt(c.ster_yes)} note={c.ster_unknown ? `status unknown for ${fmt(c.ster_unknown)} (${share(c.ster_unknown, c.animals)})` : c.ster_no ? `${fmt(c.ster_no)} recorded not sterilised` : "status known for all"} />
        <Fig label="Vaccinated (recorded)" v={fmt(c.vacc_yes)} note={c.vacc_unknown ? `not recorded for ${fmt(c.vacc_unknown)}` : "recorded for all"} />
        <Fig label="Treatments" v={fmt(treatments(c))} note={c.care_last ? `latest ${since(c.care_last)}` : "none recorded"} />
        {c.fu_missed > 0
          ? <Fig label="Follow-ups missed" v={fmt(c.fu_missed)} note={`${fmt(c.fu_done)} kept · ${fmt(c.fu_upcoming)} due`} hot />
          : <Fig label="Follow-ups kept" v={fmt(c.fu_done)} note={c.fu_upcoming ? `${fmt(c.fu_upcoming)} due` : c.cases ? "none missed or due" : "no requests recorded"} />}
      </dl>
      {p.data && p.data.months.some((r) => r[0] === p.areaIndex) && (
        <section className="lm-sec" aria-label="This area over time"><Timeline months={p.data.months} cell={p.areaIndex} range={null} /></section>
      )}
      <section className="lm-sec" aria-labelledby="lm-an-h">
        <h2 id="lm-an-h">Animals here <span>{a ? fmt(a.animalTotal) : fmt(c.animals)}</span></h2>
        {p.area === "loading" && <p className="lm-status" role="status">Reading the animals…</p>}
        {p.area === "error" && <p className="lm-status" role="status">The animals here could not be read just now.</p>}
        {a && (
          <>
            <ul className="lm-animals">
              {shown.map((x) => <li key={x.id}><AnimalTile a={x} onOpen={() => p.onAnimal(x.id)} /></li>)}
            </ul>
            {a.animals.length > 12 && !all && <button type="button" className="lm-more" onClick={() => setAll(true)}>Show {a.animals.length - 12} more</button>}
            {a.animalTotal > a.animals.length && (all || a.animals.length <= 12) && <p className="lm-note">Showing the {fmt(a.animals.length)} most relevant of {fmt(a.animalTotal)}: needing help first, then those with photos, then the most recently seen.</p>}
          </>
        )}
      </section>
      {a && a.cases.length > 0 && (
        <section className="lm-sec" aria-labelledby="lm-cs-h">
          <h2 id="lm-cs-h">Requests for help <span>{fmt(a.caseTotal)}</span></h2>
          <ol className="lm-cases">
            {a.cases.slice(0, 8).map((x, i) => (
              <li key={i} className={x.status === "open" || x.status === "in_progress" ? "is-open" : ""}>
                <b>{x.condition && x.condition !== "Not recorded" ? x.condition : "Condition not recorded"}</b>
                <span>{STATUS[x.status ?? ""] ?? "Status not recorded"} · {day(x.occurred)}{typeof x.first_action_days === "number" && x.first_action_days >= 0 ? ` · first action ${x.first_action_days === 0 ? "same day" : `after ${x.first_action_days} d`}` : ""}</span>
                <small>{[x.org, x.animal ? `animal ${x.animal}` : null, x.fu_missed ? `${x.fu_missed} follow-up missed` : x.fu_upcoming ? `${x.fu_upcoming} follow-up due` : null].filter(Boolean).join(" · ")}</small>
              </li>
            ))}
          </ol>
        </section>
      )}
      {c.orgs.length > 0 && (
        <section className="lm-sec" aria-labelledby="lm-org-h">
          <h2 id="lm-org-h">Who keeps the record here</h2>
          <ul className="lm-orgs">
            {c.orgs.map((o, i) => <li key={i}><b>{o.name ?? "An organisation that has not published its name"}</b><span>{[o.a ? `${fmt(o.a)} animals` : null, o.c ? `${fmt(o.c)} requests` : null].filter(Boolean).join(" · ")}</span></li>)}
          </ul>
        </section>
      )}
      {pinned && <Compare a={pinned} b={c} typical={typical} />}
      <div className="lm-actions">
        <button type="button" className="lm-btn" onClick={() => p.onPin(p.pin === c.h3 ? null : c.h3)} aria-pressed={p.pin === c.h3}><GitCompare size={15} aria-hidden />{p.pin === c.h3 ? "Pinned to compare" : pinned ? "Compare with this instead" : "Pin to compare"}</button>
        <button type="button" className="lm-btn" onClick={() => { void navigator.clipboard?.writeText(window.location.href); }}><Link2 size={15} aria-hidden />Copy link</button>
        <Link className="lm-btn is-flame" href="/report">Report an animal here <ArrowUpRight size={14} aria-hidden /></Link>
      </div>
      <p className="lm-note">Last activity here {since(lastActivity(c))}. First recorded {day(c.first_seen)}.</p>
    </>
  );
}

function Fig({ label, v, note, hot }: { label: string; v: string; note?: string | null; hot?: boolean }) {
  return <div className={hot ? "is-hot" : undefined}><dt>{label}</dt><dd>{v}</dd>{note && <p>{note}</p>}</div>;
}

function Compare({ a, b, typical }: { a: MapCell; b: MapCell; typical: { animals: number; cases: number } }) {
  const rows: [string, (c: MapCell) => number][] = [
    ["Animals", (c) => c.animals], ["Open requests", (c) => c.open_cases], ["Requests ever", (c) => c.cases],
    ["Sterilised", (c) => c.ster_yes], ["Status unknown", (c) => c.ster_unknown], ["Vaccinated", (c) => c.vacc_yes], ["Follow-ups missed", (c) => c.fu_missed],
  ];
  return (
    <section className="lm-sec" aria-labelledby="lm-cmp-h">
      <h2 id="lm-cmp-h">Compared</h2>
      <table className="lm-cmp">
        <thead><tr><th scope="col"><span className="sr-only">Figure</span></th><th scope="col">{zoneName(a.zone)}</th><th scope="col">{zoneName(b.zone)}</th></tr></thead>
        <tbody>{rows.map(([l, f]) => <tr key={l}><th scope="row">{l}</th><td>{fmt(f(a))}</td><td>{fmt(f(b))}</td></tr>)}</tbody>
      </table>
      <p className="lm-note">A typical recorded area in this city holds {fmt(typical.animals)} animals and {fmt(typical.cases)} requests.</p>
    </section>
  );
}

function AnimalTile({ a, onOpen }: { a: AreaAnimal; onOpen: () => void }) {
  return (
    <button type="button" className={`lm-tile${a.needs_help ? " is-help" : ""}`} onClick={onOpen} aria-label={`${a.title}${a.describe ? `, ${a.describe}` : ""}${a.needs_help ? ", needs help" : ""}`}>
      <span className="lm-tile-ph">
        {a.photo ? <SensitiveVeil sensitive={a.sensitive} id={a.photo} compact><img src={a.photo} alt="" loading="lazy" /></SensitiveVeil> : <span className="lm-tile-mono" aria-hidden>{a.title.slice(0, 2)}</span>}
      </span>
      <b>{a.title}</b>
      <small>{a.needs_help ? "Needs help" : a.ster === "sterilised" ? "Sterilised" : a.describe ?? "Recorded"}</small>
    </button>
  );
}

/* ── ANIMAL ──────────────────────────────────────────────────────── */
function AnimalView(p: Props) {
  const a = p.area && typeof p.area === "object" ? p.area.animals.find((x) => x.id === p.animalId) : null;
  if (!a) {
    return (
      <div className="lm-animal">
        <button type="button" className="lm-back" onClick={p.onCloseAnimal}><ArrowLeft size={15} aria-hidden />Back to the area</button>
        <p className="lm-status">{p.area === "loading" ? "Reading the animal…" : "This animal’s full record has its history, photographs and care."}</p>
        <Link className="lm-btn is-flame" href={`/dog/${p.animalId}`}>Open the animal’s record <ArrowUpRight size={14} aria-hidden /></Link>
      </div>
    );
  }
  const chips = [
    a.needs_help ? { t: "Needs help", hot: true } : null,
    a.ster === "sterilised" ? { t: "Sterilised" } : a.ster === "not_sterilised" ? { t: "Not sterilised (recorded)" } : { t: "Sterilisation not recorded", quiet: true },
    a.vacc === "vaccinated" ? { t: "Vaccinated" } : { t: "Vaccination not recorded", quiet: true },
    a.source === "resident" ? { t: "Reported by a resident" } : null,
  ].filter(Boolean) as { t: string; hot?: boolean; quiet?: boolean }[];
  return (
    <div className="lm-animal">
      <button type="button" className="lm-back" onClick={p.onCloseAnimal}><ArrowLeft size={15} aria-hidden />Back to {zoneName(p.cells[p.areaIndex]?.zone)}</button>
      <div className="lm-animal-ph">
        {a.photo ? <SensitiveVeil sensitive={a.sensitive} id={a.photo}><img src={a.photo} alt={`Photograph of ${a.title}`} /></SensitiveVeil> : <span className="lm-tile-mono is-big" aria-hidden>{a.title.slice(0, 2)}</span>}
      </div>
      <p className="lm-animal-sub">{[a.describe, zoneName(a.zone)].filter(Boolean).join(" · ")}</p>
      <ul className="lm-chips">{chips.map((c) => <li key={c.t} className={c.hot ? "is-hot" : c.quiet ? "is-quiet" : ""}>{c.t}</li>)}</ul>
      <dl className="lm-figs is-two">
        <Fig label="Last seen" v={since(a.last_seen)} note={day(a.last_seen)} />
        <Fig label="On the record since" v={day(a.first_seen)} />
        <Fig label="Kept by" v={a.org ?? (a.source === "resident" ? "A resident's report" : "Not published")} note={!a.org && a.source !== "resident" ? "The organisation has not published its name" : null} />
      </dl>
      <Link className="lm-btn is-flame" href={`/dog/${a.id}`}>Open its full history <ArrowUpRight size={14} aria-hidden /></Link>
      <p className="lm-note">The map places this animal in its area only. Its record holds the photographs, care and every organisation that has met it.</p>
    </div>
  );
}
