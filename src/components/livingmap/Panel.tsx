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
import { FolkPortrait, portraitCredit } from "@/components/art/FolkPortrait";
import { KIND_META, cityEvidence, kindOf } from "@/components/spatial/AtlasRegister";
import { lastActivity, treatments, type Ctx, type Klass, type Question, type QuestionId, type Range } from "@/lib/livingmap/questions";
import { fmt, placeName, totals, type Locality, type Tally } from "@/lib/livingmap/reading";
import type { FoundAnimal, FoundPlace } from "@/lib/livingmap/server";
import type { AreaAnimal, MapArea, MapCell, MapCity, NationalCity, Unplaced } from "@/lib/livingmap/types";
import { WORK_META, areaWork, cityWork, nationalWork, workCsv, type WorkItem } from "@/lib/livingmap/work";
import { MapSearch } from "./Search";
import { useAuth } from "@/components/auth/AuthProvider";
import { claimCase } from "@/lib/case-actions";
import { Timeline } from "./Timeline";
import { INDIA_PATH, INDIA_VIEW, indiaXY } from "./india-path";
import { STORIES, clusterLine, nationalStoryFigures, story, storyFigures, storyOf, unconfirmedByLocality, glance, type Cluster, type StoryId } from "@/lib/livingmap/stories";
import type { Level } from "./LivingMap";

type Props = {
  level: Level; cities: NationalCity[]; city: string | null; data: MapCity | null; loadState: "idle" | "loading" | "error" | "missing";
  q: Question; questions: Question[]; facet: string; classes: Klass[]; counts: Tally; reading: { lead: string; qualify: string } | null; isolate: string | null;
  places: Locality[]; cells: MapCell[]; classOf: string[]; ctx: Ctx; range: Range; timedActive: boolean;
  area: MapArea | null | "loading" | "error"; areaIndex: number; animalId: string | null; pin: string | null; sheet: "peek" | "half" | "full";
  nationalMeasure: (c: NationalCity) => number;
  /** A signed-in member of an organisation: sees the workspace actions. */
  member: boolean; unplaced: Unplaced[];
  /** Start reading a city before it is chosen (pointer rests on it, or it takes focus). */
  onPrefetch: (city: string) => void;
  citiesState: "ready" | "loading" | "auth" | "error"; scope: "public" | "org";
  onQuestion: (id: QuestionId) => void; onFacet: (f: string) => void; onIsolate: (k: string) => void; onRange: (r: Range) => void;
  onCity: (c: string) => void; onIndia: () => void; onArea: (h3: string) => void; onCloseArea: () => void;
  onAnimal: (id: string) => void; onCloseAnimal: () => void; onPin: (h3: string | null) => void; onPlace: (c: [number, number]) => void;
  onSheet: (s: "peek" | "half" | "full") => void; onFound: (a: FoundAnimal) => void; onFoundPlace: (p: FoundPlace) => void;
  /** Touching areas with open or flagged work, joined and named. */
  clusters: Cluster[];
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
  const title = p.level === "india" ? (p.scope === "org" ? "Your map" : "India") : p.level === "city" ? p.city : animal ? animal.title : p.level === "animal" ? "Animal" : p.areaIndex >= 0 ? zoneName(p.cells[p.areaIndex]?.zone) : p.city;
  const nationalReady = p.citiesState === "ready" && (p.scope !== "org" || p.cities.length > 0);
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
        <MapSearch cities={p.cities} places={p.places} city={p.city} onCity={p.onCity} onPlace={(pl) => { const best = pl.cells[0]; if (best !== undefined) p.onArea(p.cells[best].h3); }} onFound={p.onFound} onFoundPlace={p.onFoundPlace} />
      </div>
      <div className="lm-panel-body" ref={body}>
        <h1 className="lm-title">{title}</h1>
        {p.level === "animal" ? <AnimalView {...p} /> : p.level === "area" ? <AreaView {...p} /> : (
          <>
            {p.level !== "india" || nationalReady ? <Stories {...p} /> : null}
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

/* The three stories, each with its figure; under the active one, its lenses. */
function Stories(p: Props) {
  const figs = useMemo(() => (p.level === "india" ? nationalStoryFigures(p.cities) : storyFigures(p.cells)), [p.level, p.cities, p.cells]);
  const cur = storyOf(p.q.id);
  const offAtIndia = (id: string) => p.level === "india" && (id === "orgs" || id === "gaps");
  const lenses = story(cur).lenses.map((id) => p.questions.find((q) => q.id === id)).filter((q): q is Question => !!q);
  const pick = (id: StoryId) => { const first = story(id).lenses.find((l) => p.questions.some((q) => q.id === l) && !offAtIndia(l)); if (first && id !== cur) p.onQuestion(first); };
  return (
    <section className="lm-qs" aria-label="Read the map for">
      <div className="lm-stories" role="radiogroup" aria-label="Story">
        {STORIES.map((st) => (
          <button key={st.id} type="button" role="radio" aria-checked={cur === st.id} className={`lm-story is-${st.id}${cur === st.id ? " is-on" : ""}`} onClick={() => pick(st.id)}>
            {p.level === "india" && <MiniIndia cities={p.cities} id={st.id} />}
            <span className="lm-story-l">{st.label}</span>
            <b className="lm-story-n">{figs[st.id].big}</b>
            <small>{figs[st.id].small}</small>
          </button>
        ))}
      </div>
      <p className="lm-ask">{story(cur).ask}</p>
      {lenses.length > 1 && (
        <div className="lm-q-row" role="radiogroup" aria-label="Read it as">
          {lenses.map((q) => (
            <button key={q.id} type="button" role="radio" aria-checked={p.q.id === q.id} className={p.q.id === q.id ? "is-on" : ""} onClick={() => p.onQuestion(q.id)}
              disabled={offAtIndia(q.id)} title={offAtIndia(q.id) ? "Open a city to read this" : undefined}>{q.label}</button>
          ))}
        </div>
      )}
      {p.q.facets && (
        <div className="lm-facets" role="radiogroup" aria-label={`${p.q.label}: which`}>
          {p.q.facets.map((f) => <button key={f.id} type="button" role="radio" aria-checked={p.facet === f.id} onClick={() => p.onFacet(f.id)}>{f.label}</button>)}
        </div>
      )}
    </section>
  );
}

/* A small India for each story: the same cities, sized by that story's own figure. */
function MiniIndia({ cities, id }: { cities: NationalCity[]; id: StoryId }) {
  const v = (c: NationalCity) => (id === "documented" ? (kindOf(c.city, c.cells) === "clinical" ? 0 : c.animals) : id === "care" ? (kindOf(c.city, c.cells) === "clinical" ? 0 : c.sterilised) : c.open_cases - (c.open_unconfirmed ?? 0) + c.needs_help);
  const max = Math.sqrt(Math.max(1, ...cities.map(v)));
  return (
    <svg className="lm-mini" viewBox={`-2 -2 ${INDIA_VIEW.w + 4} ${INDIA_VIEW.h + 4}`} aria-hidden>
      <path d={INDIA_PATH} />
      {cities.filter((c) => typeof c.lng === "number").map((c) => {
        const [x, y] = indiaXY(c.lng!, c.lat!), n = v(c);
        return n > 0 ? <circle key={c.city} cx={x} cy={y} r={1.4 + (Math.sqrt(n) / max) * 7} /> : <circle key={c.city} cx={x} cy={y} r={1.1} className="is-none" />;
      })}
    </svg>
  );
}

/* How to read one area: the disc, the ring and the pip, which carry the three stories at once. */
function GlyphKey({ active }: { active: StoryId }) {
  return (
    <figure className="lm-gkey" aria-label="How to read an area">
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="19" fill="#5b82dc" opacity="0.9" />
        <path d="M32 7 A25 25 0 1 1 9.4 42.6" stroke="#1f6f80" strokeWidth="5" fill="none" />
        <path d="M9.4 42.6 A25 25 0 0 1 14.3 14.3" stroke="#0b1e3d" strokeWidth="5" fill="none" />
        <path d="M14.3 14.3 A25 25 0 0 1 32 7" stroke="rgba(11,30,61,0.4)" strokeWidth="2" strokeDasharray="3 3" fill="none" />
        <circle cx="49.7" cy="14.3" r="6" fill="#d23a1e" stroke="#fffaf0" strokeWidth="2" />
      </svg>
      <figcaption>
        <span className={active === "documented" ? "is-on" : ""}><b>Disc</b> the area and what is documented in it</span>
        <span className={active === "care" ? "is-on" : ""}><b>Ring</b> sterilised · <i className="k-ink" />recorded not · <i className="k-dash" />not known</span>
        <span className={active === "attention" ? "is-on" : ""}><b>Pip</b> work confirmed waiting · hollow: the record only raises the question</span>
      </figcaption>
    </figure>
  );
}

/* Where the record confirms work is waiting, by place; then where only a
   status review would tell (imported, unconfirmed), by locality. */
function Concentrations({ p }: { p: Props }) {
  const review = useMemo(() => unconfirmedByLocality(p.cells), [p.cells]);
  const total = review.reduce((t, r) => t + r.n, 0);
  return (
    <>
      <section className="lm-sec" aria-labelledby="lm-cl-h">
        <h2 id="lm-cl-h">Where work is confirmed waiting <span>{p.clusters.length}</span></h2>
        {p.clusters.length === 0 ? <p className="lm-note">Nowhere here does StrayPaw&rsquo;s own record confirm an animal waiting. That is not proof none is: see below for what is unconfirmed.</p> : (
          <ol className="lm-clusters">
            {p.clusters.slice(0, 8).map((k) => (
              <li key={`${k.name}:${k.cells[0]}`}>
                <button type="button" onClick={() => { const best = [...k.cells].sort((a, b) => p.cells[b].open_cases + p.cells[b].needs_help - p.cells[a].open_cases - p.cells[a].needs_help)[0]; p.onArea(p.cells[best].h3); }}>
                  <b>{k.name}</b><span>{clusterLine(k)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="lm-note">Open by StrayPaw&rsquo;s own record, a recheck missed on an open request, or an animal flagged with no request. Touching areas are joined into one place and washed red on the map.</p>
      </section>
      {total > 0 && (
        <section className="lm-sec" aria-labelledby="lm-rv-h">
          <h2 id="lm-rv-h">Where a status review would settle most <span>{fmt(total)}</span></h2>
          <ol className="lm-review">
            {review.slice(0, 6).map((r) => (
              <li key={r.name}><button type="button" onClick={() => p.onArea(p.cells[r.first].h3)}><b>{r.name}</b><span>{fmt(r.n)} open only in an imported register · {r.areas} {r.areas === 1 ? "area" : "areas"}</span></button></li>
            ))}
          </ol>
          <p className="lm-note">Marked open when a register was imported and not confirmed in StrayPaw since. Hollow pips on the map. Some may be long resolved; some may still need help.</p>
        </section>
      )}
    </>
  );
}

/* Care coverage by locality: sterilised, recorded not sterilised, and not known, side by side. */
function CareCoverage({ p }: { p: Props }) {
  const rows = useMemo(() => p.places.map((l) => {
    let y = 0, n = 0, u = 0;
    for (const i of l.cells) { y += p.cells[i].ster_yes; n += p.cells[i].ster_no; u += p.cells[i].ster_unknown; }
    return { l, y, n, u, t: y + n + u };
  }).filter((r) => r.t >= 5).sort((a, b) => b.t - a.t).slice(0, 14), [p.places, p.cells]);
  if (!rows.length) return null;
  const pc = (x: number, t: number) => `${(x / t) * 100}%`;
  return (
    <section className="lm-sec" aria-labelledby="lm-cov-h">
      <h2 id="lm-cov-h">Sterilisation coverage by locality <span>{rows.length}</span></h2>
      <ol className="lm-cov">
        {rows.map(({ l, y, n, u, t }) => (
          <li key={l.name}>
            <button type="button" onClick={() => p.onArea(p.cells[l.cells[0]].h3)}>
              <span className="lm-cov-name"><b>{l.name}</b><small>{fmt(t)} animals · {Math.round((y / t) * 100)}% recorded sterilised{n ? ` · ${Math.round((n / t) * 100)}% recorded not` : ""}{u ? ` · ${Math.round((u / t) * 100)}% not known` : ""}</small></span>
              <span className="lm-cov-bar" aria-hidden><i className="is-y" style={{ width: pc(y, t) }} /><i className="is-n" style={{ width: pc(n, t) }} /><i className="is-u" style={{ width: pc(u, t) }} /></span>
            </button>
          </li>
        ))}
      </ol>
      <p className="lm-note">Teal sterilised, ink recorded not sterilised, hatched not known. An unknown share is a gap in the record, not a share left unsterilised.</p>
    </section>
  );
}

/* ── INDIA ───────────────────────────────────────────────────────── */
function IndiaView(p: Props) {
  if (p.citiesState !== "ready" || (!p.cities.length && p.scope === "org")) return <NationalState {...p} />;
  return <IndiaReading {...p} />;
}

/* Never a zero for a record that could not be read. */
function NationalState(p: Props) {
  const { openSignIn } = useAuth();
  if (p.citiesState === "loading") return <p className="lm-status" role="status">Reading the record…</p>;
  if (p.citiesState === "auth") return <p className="lm-status" role="status">Sign in with your organisation to see its own map: its records, who holds each request and what to do next. <button type="button" onClick={openSignIn}>Sign in</button></p>;
  if (p.citiesState === "error") return <p className="lm-status" role="status">The record could not be read just now. Reload to try again.</p>;
  return <p className="lm-status" role="status">Your organisation has no mapped records yet. Records appear here once they carry a place.</p>;
}

function IndiaReading(p: Props) {
  const rows = useMemo(() => [...p.cities].sort((a, b) => p.nationalMeasure(b) - p.nationalMeasure(a) || b.animals - a.animals), [p]);
  const street = p.cities.filter((c) => kindOf(c.city, c.cells) !== "clinical");
  const clinical = p.cities.filter((c) => kindOf(c.city, c.cells) === "clinical");
  const sum = (list: NationalCity[], f: (c: NationalCity) => number) => list.reduce((s, c) => s + f(c), 0);
  const max = Math.max(1, ...street.map(p.nationalMeasure));
  const work = useMemo(() => (p.q.id === "act" ? nationalWork(p.cities, p.unplaced) : []), [p.q.id, p.cities, p.unplaced]);
  if (p.q.id === "act") {
    const waiting = p.cities.reduce((s, c) => s + c.open_30 - (c.open_30_unconfirmed ?? 0), 0), placeless = p.unplaced.reduce((s, u) => s + u.open_cases, 0);
    const unconf = p.cities.reduce((s, c) => s + (c.open_unconfirmed ?? 0), 0);
    return (
      <>
        <div className="lm-reading">
          <p className="lm-lead">{fmt(waiting)} {waiting === 1 ? "request" : "requests"} for help confirmed open more than 30 days{placeless ? `, and ${fmt(placeless)} open requests waiting to be placed on the map` : ""}.</p>
          <p className="lm-qualify">{unconf ? `${fmt(unconf)} more are marked open only in an imported register and have not been confirmed since: reviewing them is on the list. ` : ""}Open a city to see each place, why it is listed, who holds the record and what can be done.</p>
        </div>
        <WorkList items={work} member={p.member} onPick={(w) => w.city && p.onCity(w.city)} cityLabel />
      </>
    );
  }
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
                <button type="button" onClick={() => p.onCity(c.city)} onPointerEnter={() => p.onPrefetch(c.city)} onFocus={() => p.onPrefetch(c.city)}>
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
      <GlyphKey active={storyOf(p.q.id)} />
      {storyOf(p.q.id) === "attention" && <Concentrations p={p} />}
      {p.q.id === "care" && p.facet === "ster" && <CareCoverage p={p} />}
      {p.timedActive && p.data.months.length > 0 && (
        <section className="lm-sec" aria-label="Over time">
          <Timeline months={p.data.months} range={p.range} onRange={p.onRange} careLabel={p.q.id === "care" ? "Dated care" : "Dated care"} />
        </section>
      )}
      {p.timedActive && p.data.months.length === 0 && <p className="lm-note">No dates on this city’s record, so it cannot be read over time.</p>}
      {p.q.id === "act" && <WorkList items={cityWork(p.cells, p.data.city)} member={p.member} onPick={(w) => w.cell !== null && p.onArea(p.cells[w.cell].h3)} csvName={`${p.data.city}-work-next`} />}
      {p.q.id !== "act" && <section className="lm-sec" aria-labelledby="lm-places-h">
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
      </section>}
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
      <ul className="lm-glance" aria-label="The three stories here">
        {glance(c).map((g) => <li key={g.id} className={`is-${g.id}${storyOf(p.q.id) === g.id ? " is-on" : ""}${g.tone === 2 ? " is-hot" : g.tone === 1 ? " is-q" : ""}`}><b>{g.label}</b><span>{g.text}</span></li>)}
      </ul>
      {k && <p className="lm-areaclass"><Swatch k={k} />{p.q.label}: <b>{k.label || "—"}</b></p>}
      <AreaWork c={c} i={p.areaIndex} city={p.city ?? ""} member={p.member} />
      <dl className="lm-figs">
        <Fig label="Animals on record" v={fmt(c.animals)} note={versus(c.animals, typical.animals)} />
        {(() => {
          const unconf = c.open_unconfirmed ?? 0, known = c.open_cases - unconf, known30 = c.open_30 - (c.open_30_unconfirmed ?? 0);
          return <Fig label="Open requests" v={fmt(known)} hot={known > 0}
            note={[known30 > 0 ? `${fmt(known30)} waiting over 30 days` : null, unconf ? `plus ${fmt(unconf)} marked open in an imported register, unconfirmed` : null, !c.cases ? "no requests recorded" : !known && !unconf ? `of ${fmt(c.cases)} recorded here` : null].filter(Boolean).join("; ")} />;
        })()}
        <Fig label="Sterilised" v={fmt(c.ster_yes)} note={c.ster_unknown ? `status unknown for ${fmt(c.ster_unknown)} (${share(c.ster_unknown, c.animals)})` : c.ster_no ? `${fmt(c.ster_no)} recorded not sterilised` : "status known for all"} />
        <Fig label="Vaccinated (recorded)" v={fmt(c.vacc_yes)} note={c.vacc_unknown ? `not recorded for ${fmt(c.vacc_unknown)}` : "recorded for all"} />
        <Fig label="Treatments" v={fmt(treatments(c))} note={c.care_last ? `latest ${since(c.care_last)}` : "none recorded"} />
        {(c.fu_missed_live ?? 0) > 0
          ? <Fig label="Follow-ups missed" v={fmt(c.fu_missed_live ?? 0)} note={`on requests still open · ${fmt(c.fu_done)} kept · ${fmt(c.fu_upcoming)} due${c.fu_missed > (c.fu_missed_live ?? 0) ? ` · ${fmt(c.fu_missed - (c.fu_missed_live ?? 0))} missed before closing` : ""}`} hot />
          : c.fu_missed > 0
          ? <Fig label="Follow-ups kept" v={fmt(c.fu_done)} note={`${fmt(c.fu_missed)} missed before the request closed (history)${c.fu_upcoming ? ` · ${fmt(c.fu_upcoming)} due` : ""}`} />
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
            <ul className="lm-reg">
              {shown.map((x) => <li key={x.id}><AnimalRow a={x} onOpen={() => p.onAnimal(x.id)} /></li>)}
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
                {x.id && <CaseActs id={x.id} code={x.code ?? null} assignee={x.assignee ?? null} open={x.status === "open" || x.status === "in_progress"} />}
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
    ["Sterilised", (c) => c.ster_yes], ["Status unknown", (c) => c.ster_unknown], ["Vaccinated", (c) => c.vacc_yes], ["Follow-ups missed (open)", (c) => c.fu_missed_live ?? 0],
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

/* An animal's line in the area's register: a portrait (its photograph, or a
   labelled painting when it has none, as 99.6% do), what it is, and its own
   record of care, so a record means something without a picture. */
const span = (a: string | null, b: string | null) => {
  if (!a || !b) return null;
  const y = (Date.parse(b) - Date.parse(a)) / (365 * 86_400_000);
  return y >= 1 ? `on the record ${y.toFixed(1).replace(/\.0$/, "")} years` : null;
};
function careLine(a: AreaAnimal): string {
  const f = a.facts;
  const bits = [
    f?.open ? `${f.open} open request${f.open > 1 ? "s" : ""}` : f?.cases ? `${f.cases} request${f.cases > 1 ? "s" : ""}` : null,
    f?.care ? `${f.care} care record${f.care > 1 ? "s" : ""}` : null,
    a.ster === "sterilised" ? "sterilised" : a.ster === "not_sterilised" ? "not sterilised" : null,
    span(a.first_seen, a.last_seen),
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "One sighting on the record";
}
function AnimalRow({ a, onOpen }: { a: AreaAnimal; onOpen: () => void }) {
  return (
    <button type="button" className={`lm-reg-row${a.needs_help ? " is-help" : ""}`} onClick={onOpen}>
      <span className="lm-reg-ph">
        {a.photo ? <SensitiveVeil sensitive={a.sensitive} id={a.photo} compact><img src={a.photo} alt="" loading="lazy" /></SensitiveVeil> : <FolkPortrait seed={a.id} size={a.size} label="" />}
      </span>
      <span className="lm-reg-t">
        <b>{a.title}{a.needs_help && <em>Needs help</em>}</b>
        <small>{[a.describe, `seen ${since(a.last_seen)}`].filter(Boolean).join(" · ")}</small>
        <span>{careLine(a)}</span>
      </span>
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
        {a.photo ? <SensitiveVeil sensitive={a.sensitive} id={a.photo}><img src={a.photo} alt={`Photograph of ${a.title}`} /></SensitiveVeil> : <FolkPortrait seed={a.id} size={a.size} className="is-big" />}
      </div>
      {!a.photo && (() => { const cr = portraitCredit(a.id, a.size); return <p className="lm-note lm-portrait-credit">No photograph yet. Illustration from “{cr.title}” ({cr.date}), {cr.source}: not this animal.</p>; })()}
      <p className="lm-animal-sub">{[a.describe, zoneName(a.zone)].filter(Boolean).join(" · ")}</p>
      <ul className="lm-chips">{chips.map((c) => <li key={c.t} className={c.hot ? "is-hot" : c.quiet ? "is-quiet" : ""}>{c.t}</li>)}</ul>
      <dl className="lm-figs is-two">
        <Fig label="Requests for help" v={fmt(a.facts?.cases ?? 0)} note={a.facts?.open ? `${a.facts.open} still open` : a.facts?.cases ? "none open" : "none recorded"} hot={!!a.facts?.open} />
        <Fig label="Care records" v={fmt(a.facts?.care ?? 0)} note={a.facts?.lastCare ? `latest ${day(a.facts.lastCare)}` : "none recorded"} />
        <Fig label="Last seen" v={since(a.last_seen)} note={day(a.last_seen)} />
        <Fig label="On the record since" v={day(a.first_seen)} />
        <Fig label="Kept by" v={a.org ?? (a.source === "resident" ? "A resident's report" : "Not published")} note={!a.org && a.source !== "resident" ? "The organisation has not published its name" : null} />
      </dl>
      <Link className="lm-btn is-flame" href={`/dog/${a.id}`}>Open its full history <ArrowUpRight size={14} aria-hidden /></Link>
      <p className="lm-note">The map places this animal in its area only. Its record holds the photographs, care and every organisation that has met it.</p>
    </div>
  );
}

/* ── WORK NEXT ───────────────────────────────────────────────────── */
function WorkList({ items, member, onPick, cityLabel = false, csvName }: { items: WorkItem[]; member: boolean; onPick: (w: WorkItem) => void; cityLabel?: boolean; csvName?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 12);
  const download = () => {
    const blob = new Blob([workCsv(items)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${(csvName ?? "work-next").replace(/\s+/g, "-").toLowerCase()}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <section className="lm-sec" aria-labelledby="lm-work-h">
      <h2 id="lm-work-h">Work next <span>{fmt(items.length)}</span></h2>
      {items.length === 0 ? <p className="lm-note">None of the rules applies anywhere here. That is not proof all is well: it may simply be unreported.</p> : (
        <ol className="lm-work">
          {shown.map((w, n) => (
            <li key={w.key}>
              <button type="button" className="lm-work-go" onClick={() => onPick(w)} disabled={!w.city && w.cell === null}>
                <span className="lm-work-n">{n + 1}</span>
                <span className="lm-work-t">
                  <span className="lm-work-k"><i style={{ background: WORK_META[w.kind].color }} aria-hidden />{WORK_META[w.kind].short}</span>
                  <b>{cityLabel && w.city && w.place !== w.city ? `${w.place}, ${w.city}` : w.place}</b>
                  <span>{w.reason}</span>
                  {(w.who.length > 0 || w.whoNote) && <small>Held by {[...w.who, w.whoNote].filter(Boolean).join(" · ")}</small>}
                </span>
              </button>
              {member && w.actions.filter((a) => a.audience === "member" && a.href).slice(0, 1).map((a) => <Link key={a.label} className="lm-work-act" href={a.href!}>{a.label}<ArrowUpRight size={13} aria-hidden /></Link>)}
            </li>
          ))}
        </ol>
      )}
      <div className="lm-actions is-tight">
        {items.length > 12 && !all && <button type="button" className="lm-more" onClick={() => setAll(true)}>Show all {fmt(items.length)}</button>}
        {items.length > 0 && <button type="button" className="lm-more" onClick={download}>Download the list (CSV)</button>}
      </div>
      <p className="lm-note">Listed by rule, not by a score: animals waiting on someone first, then gaps in the record. Each rule is in the legend above.</p>
    </section>
  );
}

function AreaWork({ c, i, city, member }: { c: MapCell; i: number; city: string; member: boolean }) {
  const items = areaWork(c, i, city);
  /* Each item keeps its own workspace action; the actions open to anyone
     are gathered once at the end rather than repeated under every item. */
  const shared = [...new Map(items.flatMap((w) => w.actions.filter((a) => a.audience === "all")).map((a) => [a.label, a])).values()];
  const memberOnly = items.some((w) => w.actions.some((a) => a.audience === "member"));
  return (
    <section className="lm-sec lm-areawork" aria-labelledby="lm-aw-h">
      <h2 id="lm-aw-h">What needs doing here</h2>
      {items.length === 0 ? <p className="lm-note">Nothing here meets a Work-next rule. That is not proof all is well: it may simply be unreported.</p> : (
        <>
          <ul>
            {items.map((w) => (
              <li key={w.key}>
                <p className="lm-work-k"><i style={{ background: WORK_META[w.kind].color }} aria-hidden />{WORK_META[w.kind].label}</p>
                <p>{w.reason}</p>
                <p className="lm-aw-who">{w.who.length || w.whoNote ? <>Held by <b>{[...w.who, w.whoNote].filter(Boolean).join(" · ")}</b></> : "No organisation holds this record yet."}</p>
                {member && w.actions.filter((a) => a.audience === "member" && a.href).map((a) => <Link key={a.label} href={a.href!} className="lm-btn is-sm is-ink">{a.label}<ArrowUpRight size={13} aria-hidden /></Link>)}
              </li>
            ))}
          </ul>
          <div className="lm-aw-acts">
            {shared.map((a) => a.copy
              ? <button key={a.label} type="button" className="lm-btn is-sm" onClick={() => { void navigator.clipboard?.writeText(window.location.href); }}>{a.label}</button>
              : <Link key={a.label} href={a.href!} className="lm-btn is-sm">{a.label}<ArrowUpRight size={13} aria-hidden /></Link>)}
          </div>
          {!member && memberOnly && <p className="lm-note">The organisations working here can act on these from their StrayPaw workspace.</p>}
        </>
      )}
    </section>
  );
}

/** Organisation map: the case itself, who holds it, and taking it on the spot. */
function CaseActs({ id, code, assignee, open }: { id: string; code: string | null; assignee: string | null; open: boolean }) {
  const { user } = useAuth();
  const [held, setHeld] = useState(assignee);
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const take = async () => {
    if (!user || state === "busy") return;
    setState("busy");
    try { const ok = await claimCase(id, { id: user.id, name: user.name }); if (ok) { setHeld(user.name); setState("idle"); } else setState("failed"); }
    catch { setState("failed"); }
  };
  return (
    <span className="lm-case-acts">
      <Link href={`/partner/cases/${id}`}>{code ? `Open ${code}` : "Open the case"}<ArrowUpRight size={12} aria-hidden /></Link>
      {held ? <span className="lm-case-who">Held by {held}</span> : open && user ? <button type="button" onClick={take} disabled={state === "busy"}>{state === "busy" ? "Taking…" : "Take this case"}</button> : open ? <span className="lm-case-who is-none">Nobody assigned</span> : null}
      {state === "failed" && <span className="lm-case-who is-none" role="status">Not saved. Try again.</span>}
    </span>
  );
}
