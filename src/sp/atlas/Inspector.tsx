"use client";

/* ════════════════════════════════════════════════════════════════════
   The atlas inspector: a docked sheet on desktop, a draggable bottom
   sheet on phones (peek · half · full). It is also the map's accessible
   form: every place and figure the map draws is listed here as text and
   as buttons.

   India  → the lens figure, how to read the marks, every city register
   City   → method line first, then the reading, the legend (isolate a
            class), the localities, the compare tray
   Area   → what is recorded here, the animals (bounded), the requests
   Animal → a preview in place and the way into the full record
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, ArrowUpRight, GitCompare, X } from "lucide-react";
import type { Ctx, Klass, Question } from "@/lib/livingmap/questions";
import { placeName, type Locality, type Tally } from "@/lib/livingmap/reading";
import type { AreaAnimal, MapArea, MapCell, MapCity, NationalCity, Unplaced } from "@/lib/livingmap/types";
import { Portrait } from "../ui/Portrait";
import { KINDS, kindOf, type EvidenceKind } from "./evidence";
import { PIE_INK } from "./geo";
import { EvidenceDrawer } from "./Evidence";
import { LENSES, type LensId } from "./lenses";
import type { Level, Scope, Variant } from "./Atlas";

type Props = {
  variant: Variant; scope: Scope; level: Level; lens: LensId; q: Question; facet: string; classes: Klass[]; counts: Tally; reading: { lead: string; qualify: string } | null;
  cities: NationalCity[]; citiesState: "ready" | "loading" | "auth" | "error"; unplaced: Unplaced[]; city: string | null; cityState: "idle" | "loading" | "error" | "missing";
  data: MapCity | null; cells: MapCell[]; places: Locality[]; ctx: Ctx; area: MapArea | null | "loading" | "error"; areaIndex: number; animalId: string | null;
  cmp: string[]; isolate: string | null; sheet: "peek" | "half" | "full"; evidence: { kind: EvidenceKind; precision: string; note: string } | null;
  onCity: (c: string) => void; onIndia: () => void; onArea: (h3: string) => void; onCloseArea: () => void; onAnimal: (id: string) => void; onCloseAnimal: () => void;
  onIsolate: (k: string) => void; onPlace: (c: [number, number]) => void; onSheet: (s: "peek" | "half" | "full") => void; onCompare: (h3: string) => void; onClearCompare: () => void;
  onOpenRecord: (id: string) => void; nationalMeasure: (c: NationalCity) => number;
};

const f = (n: number) => n.toLocaleString("en-IN");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "date not recorded");

export function Inspector(p: Props) {
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);
  const view = `${p.level}:${p.city}:${p.areaIndex}:${p.animalId}`;
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [view]);
  const next = p.sheet === "peek" ? "half" : p.sheet === "half" ? "full" : "peek";
  return (
    <aside className="atlas-insp" aria-label="Map reading" data-level={p.level}>
      <button type="button" className="atlas-grip" aria-label={p.sheet === "full" ? "Show more map" : "Show more of the panel"} aria-expanded={p.sheet !== "peek"}
        onPointerDown={(e) => { drag.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); }}
        onPointerUp={(e) => {
          const from = drag.current; drag.current = null; if (from === null) return;
          if (Math.abs(e.clientY - from) < 24) { p.onSheet(next); return; }
          p.onSheet(e.clientY < from ? (p.sheet === "peek" ? "half" : "full") : (p.sheet === "full" ? "half" : "peek"));
        }}
        onClick={(e) => { if (e.detail === 0) p.onSheet(next); }}><i aria-hidden /></button>
      <div className="atlas-insp-body" ref={body}>
        {p.level === "animal" ? <AnimalView {...p} /> : p.level === "area" ? <AreaView {...p} /> : p.level === "city" ? <CityView {...p} /> : <IndiaView {...p} />}
      </div>
    </aside>
  );
}

/* ── India ───────────────────────────────────────────────────────── */
function IndiaView(p: Props) {
  const L = LENSES[p.lens];
  const ordered = useMemo(() => [...p.cities].sort((a, b) => p.nationalMeasure(b) - p.nationalMeasure(a) || b.animals - a.animals), [p]);
  const kinds = (Object.keys(KINDS) as EvidenceKind[]).map((k) => ({ k, n: p.cities.filter((c) => kindOf(c.city, c.cells) === k).length })).filter((x) => x.n);
  const unplaced = p.unplaced.reduce((s, u) => s + u.open_cases, 0);
  if (p.citiesState === "auth") return <section className="insp-sec"><p className="k">Your organisation</p><h2 className="serif insp-h">Sign in to see your map</h2><p className="body">Your organisation&rsquo;s records load only for its members. <Link className="link" href="/join">Sign in with your code</Link>.</p></section>;
  if (p.citiesState === "error") return <section className="insp-sec" role="alert"><p className="k is-flame">Not read</p><h2 className="serif insp-h">The map index could not be read</h2><p className="body">This is an outage, not an empty record. Reload in a moment.</p></section>;
  return (
    <>
      <section className="insp-sec">
        <p className="k">{L.label} · all India</p>
        <p className="insp-lead">{L.define}</p>
        <ul className="insp-kinds" aria-label="How cities are drawn">
          {kinds.map(({ k, n }) => <li key={k}><i className={k === "clinical" ? "is-hollow" : undefined} style={{ ["--ki" as string]: KINDS[k].ink, ["--ke" as string]: KINDS[k].echo }} aria-hidden /><span><b>{KINDS[k].label}</b> {KINDS[k].reads}</span><em className="mono">{n}</em></li>)}
        </ul>
      </section>
      <section className="insp-sec">
        <h2 className="insp-sh">City registers <span className="mono">{p.citiesState === "loading" ? "…" : p.cities.length}</span></h2>
        {p.citiesState === "loading" ? <div className="stack">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skel" style={{ height: 40 }} />)}</div> : (
          <ol className="insp-cities">
            {ordered.map((c) => {
              const k = kindOf(c.city, c.cells), v = p.nationalMeasure(c);
              return (
                <li key={c.city}>
                  <button type="button" onClick={() => p.onCity(c.city)}>
                    <i className={k === "clinical" ? "is-hollow" : undefined} style={{ ["--ki" as string]: KINDS[k].ink }} aria-hidden />
                    <span><b>{c.city}</b><small>{KINDS[k].label}{c.state ? ` · ${c.state}` : ""}</small></span>
                    <em className="mono">{k === "clinical" ? "register" : f(v)}</em>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {unplaced > 0 && <p className="small">{f(unplaced)} open request{unplaced === 1 ? "" : "s"} recorded with a place but no city, so no area. They are kept, listed by organisations, never dropped.</p>}
      </section>
    </>
  );
}

/* ── City ────────────────────────────────────────────────────────── */
function CityView(p: Props) {
  const L = LENSES[p.lens];
  const c = p.cities.find((x) => x.city === p.city);
  if (p.evidence?.kind === "clinical") {
    return (
      <section className="insp-sec">
        <p className="k">{KINDS.clinical.label} · {p.evidence.precision}</p>
        <p className="insp-lead">{p.evidence.note}</p>
        {c && <dl className="insp-figs"><div><dt>Records in the register</dt><dd className="serif">{f(c.animals)}</dd></div><div><dt>Care records</dt><dd className="serif">{f(c.care)}</dd></div></dl>}
        <p className="small">Counted as one city-level register, never as street-animal profiles and never placed on streets.</p>
      </section>
    );
  }
  if (p.cityState === "loading") return <section className="insp-sec" aria-busy="true"><div className="skel" style={{ height: 20, width: "60%" }} /><div className="skel" style={{ height: 70, marginTop: 14 }} /><div className="skel" style={{ height: 160, marginTop: 14 }} /></section>;
  if (p.cityState === "missing") return <section className="insp-sec"><p className="insp-lead">No mapped areas for {p.city} yet. Its records may lack locations; that is missing placement, not an absence of animals.</p></section>;
  if (!p.data) return null;
  const k = p.classes;
  const total = (id: string) => p.counts.get(id)?.areas ?? 0;
  return (
    <>
      <section className="insp-sec">
        <p className="method"><span>Unit <b>H3 area ≈0.74 km²</b></span><span>Areas <b>{f(p.cells.length)}</b></span><span>Precision <b>{p.evidence?.precision}</b></span><span>Period <b>{p.ctx.range ? "selected months" : "all recorded time"}</b></span></p>
        {p.reading && <><p className="insp-lead">{p.reading.lead}</p><p className="small">{p.reading.qualify}</p></>}
      </section>
      {p.variant === "city" && p.city && <EvidenceDrawer lens={p.lens} city={p.city} data={p.data} cells={p.cells} evidence={p.evidence} ranged={!!p.ctx.range} />}
      {p.lens === "animals" && p.facet === "all" ? <PieKey cells={p.cells} /> : <section className="insp-sec">
        <h2 className="insp-sh">{L.label} <span className="mono">by area</span></h2>
        <ul className="insp-legend" aria-label="Legend: choose a class to show only its areas">
          {k.map((x) => (
            <li key={x.id}>
              <button type="button" aria-pressed={p.isolate === x.id} onClick={() => p.onIsolate(x.id)} title={x.note}>
                <i className={`is-${x.kind}`} style={{ background: x.kind === "unknown" ? undefined : x.color }} aria-hidden />
                <span>{x.label}{x.note && <small>{x.note}</small>}</span>
                <em className="mono">{f(total(x.id))}</em>
              </button>
            </li>
          ))}
        </ul>
        <p className="small">Hatched means the record does not say. An empty ring means recorded: none. Areas bordering the record with nothing in it are faint hatched rings: the edge of reporting.</p>
      </section>}
      {p.cmp.length > 0 && <Compare {...p} />}
      <section className="insp-sec">
        <h2 className="insp-sh">Localities <span className="mono">{p.places.length}</span></h2>
        <ol className="insp-places">
          {p.places.slice(0, 14).map((l) => (
            <li key={l.name}><button type="button" onClick={() => { const best = [...l.cells].sort((a, b) => p.cells[b].animals - p.cells[a].animals)[0]; p.onArea(p.cells[best].h3); }}>
              <b>{l.name}</b><span className="mono">{f(l.v)} {p.q.unit(p.facet)}</span><small>{l.cells.length} area{l.cells.length === 1 ? "" : "s"} · {f(l.animals)} animals</small>
            </button></li>
          ))}
        </ol>
      </section>
      <section className="insp-sec">
        <p className="small">{p.evidence?.note}</p>
      </section>
    </>
  );
}

/* The Animals lens key: each area a pie of its animals' recorded sterilisation status, sized by count. */
function PieKey({ cells }: { cells: MapCell[] }) {
  let yes = 0, no = 0, all = 0;
  for (const c of cells) { yes += c.ster_yes; no += c.ster_no; all += c.animals; }
  const rows = [{ l: "Recorded sterilised", v: yes, c: PIE_INK.yes }, { l: "Recorded not sterilised", v: no, c: PIE_INK.no }, { l: "Not recorded", v: Math.max(0, all - yes - no), c: PIE_INK.unknown }];
  return (
    <section className="insp-sec">
      <h2 className="insp-sh">How to read an area <span className="mono">pie · size</span></h2>
      <div className="insp-piekey">
        <svg viewBox="0 0 120 56" aria-hidden><circle cx="18" cy="38" r="9" fill={PIE_INK.unknown} /><circle cx="50" cy="34" r="14" fill={PIE_INK.unknown} /><path d="M50 34 L50 20 A14 14 0 0 1 63.3 38.3 Z" fill={PIE_INK.yes} /><circle cx="94" cy="28" r="22" fill={PIE_INK.unknown} /><path d="M94 28 L94 6 A22 22 0 1 1 72.3 31.8 Z" fill={PIE_INK.yes} /><path d="M94 28 L72.3 31.8 A22 22 0 0 1 80 11 Z" fill={PIE_INK.no} /></svg>
        <p className="small">Each disc is one area (≈0.74 km², not a ward). Its size grows with the animals recorded there; its slices are their recorded sterilisation status. Every animal is in exactly one slice.</p>
      </div>
      <ul className="insp-legend">{rows.map((r) => <li key={r.l}><span className="insp-legend-row"><i style={{ background: r.c }} aria-hidden /><span>{r.l}</span><em className="mono">{f(r.v)}</em></span></li>)}</ul>
      <p className="small">Not recorded is shown as its own colour, never counted as not sterilised. Switch to Care for sterilisation by area.</p>
    </section>
  );
}

function Compare(p: Props) {
  const rows = p.cmp.map((h) => p.cells.find((c) => c.h3 === h)).filter((c): c is MapCell => !!c);
  if (!rows.length) return null;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  return (
    <section className="insp-sec insp-cmp" aria-label="Compare areas">
      <h2 className="insp-sh"><GitCompare size={15} aria-hidden /> Comparing {rows.length} area{rows.length === 1 ? "" : "s"} <button type="button" className="btn is-ghost is-xs" onClick={p.onClearCompare}>Clear</button></h2>
      <div className="insp-cmp-grid" style={{ gridTemplateColumns: `110px repeat(${rows.length}, minmax(0, 1fr))` }}>
        <span />{rows.map((c, i) => <b key={c.h3}><i className="mono">{i + 1}</i> {placeName(c.zone)}</b>)}
        <span>Animals</span>{rows.map((c) => <span key={c.h3} className="mono">{f(c.animals)}</span>)}
        <span>Open, confirmed</span>{rows.map((c) => <span key={c.h3} className="mono">{f(c.open_cases - (c.open_unconfirmed ?? 0))}</span>)}
        <span>Open, unconfirmed</span>{rows.map((c) => <span key={c.h3} className="mono">{f(c.open_unconfirmed ?? 0)}</span>)}
        <span>Sterilised (recorded)</span>{rows.map((c) => <span key={c.h3} className="mono">{f(c.ster_yes)} · {pct(c.ster_yes, c.animals)}</span>)}
        <span>Status not known</span>{rows.map((c) => <span key={c.h3} className="mono">{pct(c.ster_unknown, c.animals)}</span>)}
        <span>Care, 12 months</span>{rows.map((c) => <span key={c.h3} className="mono">{f(c.care_12m)}</span>)}
        <span>Last record</span>{rows.map((c) => <span key={c.h3} className="mono">{day([c.last_seen, c.last_case, c.care_last].filter(Boolean).sort().at(-1) ?? null)}</span>)}
      </div>
      <p className="small">Same unit (an H3 area, not a ward) and the same period: all recorded time. Percentages are of recorded animals in each area, never of the animals living there.</p>
    </section>
  );
}

/* ── Area ────────────────────────────────────────────────────────── */
function AreaView(p: Props) {
  const c = p.cells[p.areaIndex];
  if (!c) return null;
  const a = p.area;
  const known = c.open_cases - (c.open_unconfirmed ?? 0);
  return (
    <>
      <section className="insp-sec">
        <div className="insp-back"><button type="button" className="btn is-ghost is-s" onClick={p.onCloseArea}><ArrowLeft size={14} aria-hidden /> {p.city}</button>
          <button type="button" className={`btn is-s${p.cmp.includes(c.h3) ? " is-ink" : ""}`} onClick={() => p.onCompare(c.h3)}><GitCompare size={14} aria-hidden /> {p.cmp.includes(c.h3) ? "Comparing" : "Compare"}</button></div>
        <p className="k">{c.zone ?? "Recorded area"} · H3 area, not a ward</p>
        <dl className="insp-figs">
          <div><dt>Animals recorded</dt><dd className="serif">{f(c.animals)}</dd><small>{c.exact_loc ? `${f(c.exact_loc)} placed from a map point` : "placed by locality name"}</small></div>
          <div><dt>Open requests</dt><dd className="serif">{f(known)}</dd><small>{c.open_unconfirmed ? `+ ${f(c.open_unconfirmed)} unconfirmed` : "confirmed in StrayPaw"}</small></div>
          <div><dt>Sterilised</dt><dd className="serif">{f(c.ster_yes)}</dd><small>{f(c.ster_unknown)} not known</small></div>
          <div><dt>Care, 12 months</dt><dd className="serif">{f(c.care_12m)}</dd><small>last {day(c.care_last)}</small></div>
        </dl>
        {c.orgs.length > 0 && <p className="small">Kept by {c.orgs.map((o) => o.name ?? "an unnamed organisation").join(", ")}.</p>}
      </section>
      <section className="insp-sec">
        <h2 className="insp-sh">Animals here <span className="mono">{a && typeof a === "object" ? `${f(a.animals.length)} of ${f(a.animalTotal)}` : ""}</span></h2>
        {a === "loading" && <div className="stack">{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 64 }} />)}</div>}
        {a === "error" && <p className="body" role="alert">This area&rsquo;s animals could not be read. Nothing has changed; try again.</p>}
        {a && typeof a === "object" && (a.animals.length ? (
          <ul className="insp-animals">
            {a.animals.map((x) => <AnimalRow key={x.id} a={x} onPick={() => p.onAnimal(x.id)} />)}
          </ul>
        ) : <p className="body">No published animal profile in this area. Requests may still be recorded below.</p>)}
        {a && typeof a === "object" && a.animalTotal > a.animals.length && <p className="small">Showing the first {f(a.animals.length)}, needing help first.</p>}
      </section>
      {a && typeof a === "object" && a.cases.length > 0 && (
        <section className="insp-sec">
          <h2 className="insp-sh">Requests recorded <span className="mono">{f(a.caseTotal)}</span></h2>
          <ul className="insp-cases">
            {a.cases.slice(0, 8).map((k, i) => <li key={i}><b>{k.condition ?? "Request"}</b><span className="small">{k.status ? k.status.replace(/_/g, " ") : "status not recorded"} · {day(k.occurred)}{k.org ? ` · ${k.org}` : ""}</span></li>)}
          </ul>
          <p className="small">Requests are what was reported and recorded, not proof of what happened since.</p>
        </section>
      )}
    </>
  );
}

function AnimalRow({ a, onPick }: { a: AreaAnimal; onPick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onPick} className={a.needs_help ? "is-help" : undefined}>
        <Portrait src={a.photo} tag={a.title} sensitive={a.sensitive} size="s" />
        <span><b>{a.title}{a.needs_help && <em> Needs help</em>}</b><small>{a.describe ?? "Description not recorded"}</small><small>Seen {day(a.last_seen)}{a.org ? ` · ${a.org}` : ""}</small></span>
      </button>
    </li>
  );
}

/* ── Animal ──────────────────────────────────────────────────────── */
function AnimalView(p: Props) {
  const a = p.area && typeof p.area === "object" ? p.area.animals.find((x) => x.id === p.animalId) : null;
  if (!a) return <section className="insp-sec"><button type="button" className="btn is-ghost is-s" onClick={p.onCloseAnimal}><ArrowLeft size={14} aria-hidden /> Area</button><div className="skel" style={{ height: 220, marginTop: 12 }} /></section>;
  const ster = a.ster === "yes" ? "Sterilised (recorded)" : a.ster === "no" ? "Recorded not sterilised" : null;
  const vacc = a.vacc === "yes" ? "Vaccinated (recorded)" : null;
  return (
    <section className="insp-sec insp-animal">
      <div className="insp-back"><button type="button" className="btn is-ghost is-s" onClick={p.onCloseAnimal}><ArrowLeft size={14} aria-hidden /> {placeName(a.zone)}</button><button type="button" className="icon-btn" onClick={p.onCloseAnimal} aria-label="Close"><X size={16} /></button></div>
      <Portrait src={a.photo} tag={a.title} sensitive={a.sensitive} size="l" />
      <p className="k">Preview · one animal on the record</p>
      <h2 className="serif insp-h">{a.title}</h2>
      <p className="body">{a.describe ?? "Sex, size and appearance not recorded."}</p>
      <div className="row" style={{ ["--g" as string]: "6px" }}>
        {a.needs_help && <span className="pill is-urgent">Needs help</span>}
        {ster ? <span className={`pill ${a.ster === "yes" ? "is-care" : ""}`}>{ster}</span> : <span className="pill is-unknown">Sterilisation not recorded</span>}
        {vacc ? <span className="pill is-care">{vacc}</span> : <span className="pill is-unknown">Vaccination not recorded</span>}
      </div>
      <dl className="insp-facts">
        <div><dt>Last seen</dt><dd>{day(a.last_seen)}</dd></div>
        <div><dt>First recorded</dt><dd>{day(a.first_seen)}</dd></div>
        <div><dt>Place</dt><dd>{a.zone ?? "not recorded"} <small>· area level</small></dd></div>
        <div><dt>Source</dt><dd>{a.org ?? (a.source ? a.source.replace(/_/g, " ") : "community report")}</dd></div>
        {a.facts && <div><dt>On record</dt><dd>{f(a.facts.cases)} request{a.facts.cases === 1 ? "" : "s"} · {f(a.facts.care)} care record{a.facts.care === 1 ? "" : "s"}</dd></div>}
      </dl>
      <div className="row">
        <button type="button" className="btn is-ink" onClick={() => p.onOpenRecord(a.id)}>Open the full record <ArrowUpRight size={15} aria-hidden /></button>
        <Link className="btn" href={`/community/report?animal=${a.id}`}>Report an update</Link>
      </div>
      <p className="small">Its dot on the map is a schematic position inside the area. The full record keeps this map exactly as you left it.</p>
    </section>
  );
}
