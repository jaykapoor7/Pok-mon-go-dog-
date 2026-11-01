"use client";

/* ════════════════════════════════════════════════════════════════════
   Everything on top of the Map, and nothing that competes with it.

   Place lettering (top left), lenses and search (top right), the key
   (bottom left), controls and Report (bottom right). What you choose
   opens in one card: a field-guide page on desktop, a sheet you drag on
   a phone (peek, half, full). Closing it climbs one scale; the camera,
   lens and selection stay where you left them.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronLeft, Crosshair, Eye, EyeOff, LocateFixed, Minus, Plus, Radio, Search, Share2, X } from "lucide-react";
import type { AreaAnimal, MapArea, MapCell, NationalCity, Unplaced } from "@/lib/livingmap/types";
import { monthName } from "@/lib/livingmap/types";
import type { Locality } from "@/lib/livingmap/reading";
import { placeName } from "@/lib/livingmap/reading";
import { Portrait } from "../ui/Portrait";
import { MobileDetails } from "../ui/MobileDetails";
import { Reading } from "../ui/Reading";
import type { Bucket } from "../atlas/recency";
import { KINDS, kindOf, type EvidenceKind } from "../atlas/evidence";
import { LENSES, nationalMeasure } from "../atlas/lenses";
import { MARK } from "./marks";
import { lensLabel, type MapScope, type MapVariant } from "./lens";
import type { LensId } from "../atlas/lenses";
import { cityFindings } from "../atlas/cityFindings";
import { LOAD_ZOOM, NEED_INK, NEED_LABEL, NEED_RANK, needOf } from "./need";

export type Level = "india" | "city" | "area" | "animal";
export type Face = { id: string; title: string; describe: string | null; photo: string; city: string; zone: string | null; h3: string; c: [number, number]; last_seen: string | null };

const f = (v: number) => v.toLocaleString("en-IN");
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null);
const ago = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  return d < 1 ? "today" : d < 45 ? `${d} days ago` : d < 540 ? `${Math.round(d / 30)} months ago` : `${(d / 365).toFixed(1).replace(/\.0$/, "")} years ago`;
};

type Props = {
  embedded?: boolean;
  level: Level; city: string | null; cityRow: NationalCity | null; cities: NationalCity[]; unplaced: Unplaced[];
  citiesState: "ready" | "loading" | "error" | "auth"; cityState: "idle" | "loading" | "error" | "missing"; clinical: boolean;
  ev: { kind: EvidenceKind; precision: string; note: string } | null;
  variant: MapVariant; scope: MapScope; lenses: LensId[]; spot: string | null; onSpot: (id: string | null, cells: string[]) => void;
  lens: LensId; setLens: (l: LensId) => void; fig: { big: string; small: string }; reading: { lead: string; qualify: string } | null;
  places: Locality[]; cells: MapCell[]; centers: [number, number][]; months: { m: number; opened: number; care: number }[];
  area: MapArea | null | "loading" | "error"; areaIndex: number; animalId: string | null; faces: Face[]; zoom: number;
  quiet: boolean; setQuiet: (v: boolean) => void; mapError: string | null; picking: boolean; setPicking: (v: boolean) => void; center: [number, number] | null;
  recency: Bucket[];
  onPlace: (city: string, name: string) => void; onIndia: () => void; onCity: (c: string, o?: { area?: string; animal?: string }) => void; onArea: (h3: string) => void; onAnimal: (id: string) => void; onUp: () => void;
  onFly: (c: [number, number], z?: number) => void; onZoom: (d: number) => void; onLocate: () => void; onRetry: () => void;
};

export function Chrome(P: Props) {
  const { level, city, cells, areaIndex, area } = P;
  const Title = P.embedded ? "h3" : "h1";
  const cell = areaIndex >= 0 ? cells[areaIndex] : null;
  const animal = P.animalId && area && area !== "loading" && area !== "error" ? area.animals.find((a) => a.id === P.animalId) ?? null : null;
  const [sheet, setSheet] = useState<"peek" | "half" | "full">("peek");
  const [keyOpen, setKeyOpen] = useState(false);
  /* Choosing something opens the sheet to read it; climbing back keeps it where it was. */
  useEffect(() => { if (level === "area" || level === "animal") setSheet((s) => (s === "peek" ? "half" : s)); }, [level, P.animalId, P.areaIndex]);

  const org = P.scope === "org";
  const title = level === "india" ? (org ? "Your organisation" : "India") : level === "city" ? city : cell ? placeName(cell.zone) : city;
  const street = P.cities.filter((c) => kindOf(c.city, c.cells) !== "clinical");

  return (
    <>
      <header className="fm-head">
        <nav className="fm-ladder" aria-label="Scale">
          {level !== "india" && <button type="button" className="fm-back" onClick={P.onUp} aria-label="Up one scale"><ChevronLeft size={18} aria-hidden /></button>}
          <button type="button" onClick={P.onIndia} aria-current={level === "india" ? "page" : undefined}>India</button>
          {city && <><span aria-hidden>›</span><button type="button" onClick={() => P.onCity(city)} aria-current={level === "city" ? "page" : undefined}>{city}</button></>}
          {cell && <><span aria-hidden>›</span><button type="button" onClick={() => P.onArea(cell.h3)} aria-current={level === "area" ? "page" : undefined}>{placeName(cell.zone)}</button></>}
        </nav>
        <Title className="fm-title">{level === "animal" && animal ? animal.title : title}{level === "india" && !org && <span className="fm-hi" lang="hi"> भारत</span>}</Title>
        {level === "india" && (
          <p className="fm-sub">
            {P.citiesState === "auth" ? "Sign in with your organisation to see its map." :
              P.citiesState === "error" ? (org ? "Your organisation's map could not be read. That is not the same as no records." : "The national index could not be read. That is not the same as no records.") :
              org && P.citiesState === "ready" && !P.cities.length ? "Your organisation has no mapped records yet. Records with a place appear here as they are added." :
              P.citiesState === "loading" ? <Reading>Reading the national record</Reading> :
              org ? <><b>{P.fig.big}</b> {P.fig.small}. Your organisation&rsquo;s own records, by city.</> :
              <><b>{P.fig.big}</b> {P.fig.small}. A record kept since 2015, not a live feed and not a census.</>}
          </p>
        )}
        {level !== "india" && P.ev && <p className="fm-sub"><i className="fm-kind" style={{ background: KINDS[P.ev.kind].ink }} aria-hidden />{KINDS[P.ev.kind].label} · {P.ev.precision}</p>}
        {P.cityState === "loading" && <p className="fm-sub" role="status"><Reading>Reading {city}&rsquo;s areas</Reading></p>}
        {P.cityState === "error" && <p className="fm-sub is-err" role="alert">{city} could not be read. That is not the same as no records. <button type="button" className="fm-link" onClick={P.onRetry}>Retry</button></p>}
      </header>

      <div className="fm-tools">
        <MapSearch cities={P.cities} onCity={P.onCity} onPlace={P.onPlace} remote={!org} />
        <MobileDetails label={`Map layer: ${lensLabel(P.lens)}`} className="fm-layer-fold"><div className="fm-lenses" role="group" aria-label="What the map shows">
          {P.lenses.map((id) => (
            <button key={id} type="button" aria-pressed={P.lens === id} onClick={() => P.setLens(id)} style={{ ["--lk" as string]: id === "animals" ? "#2457ce" : LENSES[id].ink }}>
              <i aria-hidden />{lensLabel(id)}
            </button>
          ))}
        </div></MobileDetails>
      </div>

      <aside className={`fm-key${keyOpen ? " is-open" : ""}`} aria-label="Key">
        <button type="button" className="fm-key-btn" aria-expanded={keyOpen} onClick={() => setKeyOpen((v) => !v)}>Key</button>
        <div className="fm-key-in"><Key level={level} lens={P.lens} zoom={P.zoom} /></div>
      </aside>

      <MobileDetails label="Map tools" className="fm-controls-fold"><div className="fm-ctl" role="group" aria-label="Map controls">
        <button type="button" onClick={() => P.onZoom(1)} aria-label="Zoom in"><Plus size={18} aria-hidden /></button>
        <button type="button" onClick={() => P.onZoom(-1)} aria-label="Zoom out"><Minus size={18} aria-hidden /></button>
        <button type="button" onClick={P.onLocate} aria-label="Go to where I am"><LocateFixed size={18} aria-hidden /></button>
        <button type="button" onClick={() => P.setQuiet(!P.quiet)} aria-pressed={P.quiet} aria-label={P.quiet ? "Show the painted map" : "Quiet map: evidence on plain paper"}>{P.quiet ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}</button>
      </div>
      {P.variant !== "city" && <button type="button" className="fm-report" onClick={() => P.setPicking(true)} hidden={P.picking}><Radio size={18} aria-hidden /><span>{P.variant === "ngo" ? "Open a case here" : "Report here"}</span></button>}
      </MobileDetails>
      {P.picking && <PickBar variant={P.variant} zoom={P.zoom} center={P.center} onCancel={() => P.setPicking(false)} />}

      {P.mapError && <p className="fm-err" role="status">{P.mapError}</p>}

      <Sheet level={level} state={sheet} setState={setSheet} onClose={level === "india" ? null : P.onUp} label={level === "animal" ? "Animal" : level === "area" ? "Neighbourhood" : level === "city" ? "City" : org ? "Your organisation" : "India"}>
        {level === "india" && <IndiaCard cities={P.cities} street={street} unplaced={P.unplaced} faces={P.faces} fig={P.fig} onCity={P.onCity} />}
        {level === "city" && city && <CityCard {...P} city={city} />}
        {level === "area" && cell && <AreaCard cell={cell} city={city!} area={area} onAnimal={P.onAnimal} variant={P.variant} />}
        {level === "animal" && (animal ? <AnimalCard a={animal} city={city!} cell={cell} variant={P.variant} embedded={P.embedded} /> : area === "loading" || !area ? <p className="fm-wait" role="status"><Reading>Reading this animal&rsquo;s record</Reading></p> : <p className="fm-wait">This animal is not among the records read for this area. <button type="button" className="fm-link" onClick={P.onUp}>Back to the area</button></p>)}
      </Sheet>
    </>
  );
}

/* ── The sheet: a card on desktop, a draggable sheet on a phone ── */
function Sheet({ level, state, setState, onClose, label, children }: { level: Level; state: "peek" | "half" | "full"; setState: (s: "peek" | "half" | "full") => void; onClose: (() => void) | null; label: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; t: number; h: number } | null>(null);
  const [dy, setDy] = useState(0);
  const order = ["peek", "half", "full"] as const;
  /* The grip is the only drag target, so a drag never pans the map behind. */
  const down = (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { y: e.clientY, t: performance.now(), h: ref.current?.offsetHeight ?? 0 }; };
  const move = (e: React.PointerEvent) => { if (drag.current) setDy(e.clientY - drag.current.y); };
  const up = () => {
    const d = drag.current; drag.current = null; if (!d) return;
    const v = dy / Math.max(1, performance.now() - d.t), i = order.indexOf(state);
    const next = dy < -40 || v < -0.5 ? order[Math.min(2, i + 1)] : dy > 40 || v > 0.5 ? order[Math.max(0, i - 1)] : state;
    setDy(0); setState(next);
  };
  return (
    <section ref={ref} className={`fm-sheet is-${state} at-${level}`} aria-label={label} style={dy ? { transform: `translateY(${Math.max(-200, dy)}px)`, transition: "none" } : undefined}>
      <div className="fm-grip" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <button type="button" className="fm-grip-btn" aria-label={state === "full" ? "Lower the panel" : "Raise the panel"} onClick={() => setState(state === "full" ? "half" : state === "half" ? "full" : "half")}><span aria-hidden /></button>
      </div>
      {onClose && <button type="button" className="fm-close" onClick={onClose} aria-label="Close, up one scale"><X size={18} aria-hidden /></button>}
      <div className="fm-sheet-in" key={level}>{children}</div>
    </section>
  );
}

/* ── India ── */
function IndiaCard({ cities, street, unplaced, faces, fig, onCity }: { cities: NationalCity[]; street: NationalCity[]; unplaced: Unplaced[]; faces: Face[]; fig: { big: string; small: string }; onCity: Props["onCity"] }) {
  const ranked = [...cities].filter((c) => c.animals > 0).sort((a, b) => b.animals - a.animals);
  const clinical = cities.filter((c) => kindOf(c.city, c.cells) === "clinical");
  /* Where to go first: the cities where the record says someone should look. */
  const needing = street.map((c) => ({ c, n: nationalMeasure("help", c) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  return (
    <div className="fm-card fm-india">
      {needing.length > 0 && (
        <>
          <p className="fm-k">Where help is needed</p>
          <ol className="fm-need">{needing.slice(0, 6).map(({ c, n }) => (
            <li key={c.city}><button type="button" onClick={() => onCity(c.city)}>
              <i aria-hidden style={{ background: NEED_INK.help }} /><b>{c.city}</b><span className="fm-num">{f(n)}</span><small>needing help</small>
            </button></li>
          ))}</ol>
        </>
      )}
      <p className="fm-k">The record</p>
      <p className="fm-big"><b>{fig.big}</b> <span>{fig.small}</span></p>
      {faces.length > 0 && (
        <>
          <p className="fm-k">Photographed animals</p>
          <ul className="fm-faces">{faces.slice(0, 6).map((a) => (
            <li key={a.id}><button type="button" onClick={() => onCity(a.city, { area: a.h3, animal: a.id })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => (e.currentTarget.style.display = "none")} /><b>{a.title}</b><small>{a.city}</small>
            </button></li>
          ))}</ul>
        </>
      )}
      <p className="fm-note">A red city has animals the record says need help. {clinical.length ? `${clinical.map((c) => c.city).join(", ")} keeps a clinical register at city level only, so it is drawn hollow. ` : ""}Empty land means nothing was reported there, not that there are no animals.</p>
      <p className="fm-k">Cities on the record · {street.length + cities.length - street.length}</p>
      <ol className="fm-cities">{ranked.map((c) => {
        const k = kindOf(c.city, c.cells);
        return <li key={c.city}><button type="button" onClick={() => onCity(c.city)}><i style={{ background: KINDS[k].ink }} aria-hidden /><b>{c.city}</b><span className="fm-num">{f(c.animals)}</span><small>{KINDS[k].label}</small></button></li>;
      })}</ol>
      {unplaced.length > 0 && <p className="fm-note">{unplaced.length} recorded place{unplaced.length === 1 ? "" : "s"} name no city, so they cannot be drawn. They stay on the record.</p>}
    </div>
  );
}

/* ── City ── */
function CityCard(P: Props & { city: string }) {
  const { cityRow, ev, clinical, fig, reading, places, months, cells } = P;
  if (clinical && cityRow) {
    return (
      <div className="fm-card">
        <p className="fm-k"><i className="fm-kind" style={{ background: KINDS.clinical.ink }} aria-hidden />Historical clinical register (2013–16) · city level only</p>
        <p className="fm-big"><b>{f(cityRow.animals)}</b> <span>animals in {P.city}&rsquo;s clinical register</span></p>
        <p className="fm-note">{ev?.note}</p>
        <p className="fm-note">Treatments on record: <b>{f(cityRow.treatments)}</b>. Last dated entry: {day(cityRow.last_activity) ?? "not recorded"}.</p>
        <Link className="fm-btn" href={`/community/organisations`}>Who keeps this register</Link>
      </div>
    );
  }
  if (!cells.length) return <p className="fm-wait" role="status">{P.cityState === "loading" ? <Reading>Reading {P.city}</Reading> : P.cityState === "missing" ? `${P.city} has no mapped areas yet.` : ""}</p>;
  const top = places.slice(0, 8);
  const maxV = Math.max(1, ...top.map((p) => p.v));
  /* Where to go in this city: localities with animals needing help or an
     open request, each opening its busiest area with those animals first. */
  const needing = (() => {
    const by = new Map<string, { name: string; help: number; open: number; h3: string; best: number }>();
    for (const c of cells) {
      const open = Math.max(0, c.open_cases - (c.open_unconfirmed ?? 0));
      if (!c.needs_help && !open) continue;
      const name = placeName(c.zone), x = by.get(name) ?? { name, help: 0, open: 0, h3: c.h3, best: -1 };
      x.help += c.needs_help; x.open += open;
      if (c.needs_help * 100 + open > x.best) { x.best = c.needs_help * 100 + open; x.h3 = c.h3; }
      by.set(name, x);
    }
    return [...by.values()].sort((a, b) => b.help - a.help || b.open - a.open);
  })();
  return (
    <div className="fm-card">
      {needing.length > 0 && (
        <>
          <p className="fm-k">Where help is needed</p>
          <ol className="fm-need">{needing.slice(0, 6).map((x) => (
            <li key={x.name}><button type="button" onClick={() => P.onArea(x.h3)}>
              <i aria-hidden style={{ background: x.help ? NEED_INK.help : NEED_INK.open }} /><b>{x.name}</b>
              <span className="fm-num">{f(x.help || x.open)}</span>
              <small>{x.help ? `needing help${x.open ? ` · ${f(x.open)} open` : ""}` : `open request${x.open === 1 ? "" : "s"}`}</small>
            </button></li>
          ))}</ol>
        </>
      )}
      <p className="fm-big"><b>{fig.big}</b> <span>{fig.small}</span></p>
      {/* The need filters are read by the list above; their older narrower sentence would contradict it. */}
      {reading && P.lens !== "help" && P.lens !== "requests" && <><p className="fm-lead">{reading.lead}</p><p className="fm-note">{reading.qualify}</p></>}
      {P.variant === "city" && months.length > 2 && <Ribbon months={months} />}
      {P.variant !== "community" && <Findings cells={cells} spot={P.spot} onSpot={P.onSpot} onArea={P.onArea} />}
      <p className="fm-k">Localities</p>
      <ol className="fm-locs">{top.map((p) => {
        const best = p.cells.reduce((a, b) => (cells[b].animals > cells[a].animals ? b : a), p.cells[0]);
        const v = p.v;
        return (
          <li key={p.name}><button type="button" onClick={() => P.onArea(cells[best].h3)}>
            <b>{p.name}</b><span className="fm-num">{f(v)}</span>
            <i aria-hidden style={{ width: `${Math.max(4, (v / maxV) * 100)}%` }} />
          </button></li>
        );
      })}</ol>
      {ev && <p className="fm-note">{ev.note}</p>}
    </div>
  );
}

/* Findings in place (decision 034): each a sentence about the city's complete area record,
   with its method; lighting one rings the areas it rests on and nothing else. */
function Findings({ cells, spot, onSpot, onArea }: { cells: MapCell[]; spot: string | null; onSpot: Props["onSpot"]; onArea: Props["onArea"] }) {
  const list = useMemo(() => cityFindings(cells), [cells]);
  if (!list.length) return null;
  return (
    <section className="fm-finds" aria-label="Findings in this city">
      <p className="fm-k">Findings <span>from the complete area record</span></p>
      <ol>
        {list.map((x, i) => {
          const on = spot === x.id;
          const rows = on ? cells.filter((c) => x.cells.includes(c.h3)).sort((a, b) => b.animals - a.animals) : [];
          return (
            <li key={x.id} className={`is-${x.tone}${on ? " is-on" : ""}`}>
              <span className="fm-find-n" aria-hidden>{i + 1}</span>
              <div>
                <p className="fm-find-lead">{x.lead}</p>
                <p className="fm-note">{x.detail}</p>
                <p className="fm-find-m">{x.method}</p>
                {on && (
                  <ol className="fm-find-areas">{rows.slice(0, 6).map((c) => (
                    <li key={c.h3}><button type="button" onClick={() => onArea(c.h3)}><b>{placeName(c.zone)}</b><span>{f(c.animals)} animals · {f(c.open_cases - (c.open_unconfirmed ?? 0))} open · care {f(c.care_12m)}</span></button></li>
                  ))}{rows.length > 6 && <li className="fm-note">And {f(rows.length - 6)} more, ringed on the map.</li>}</ol>
                )}
                {x.cells.length > 0 && (
                  <button type="button" className="fm-btn is-s" aria-pressed={on} onClick={() => onSpot(on ? null : x.id, x.cells)}>
                    {on ? "Show every area" : x.cells.length === 1 ? "Show this area on the map" : `Show these ${f(x.cells.length)} areas`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* The city's record month by month: requests opened above the line, care below. Recorded months, not a live feed. */
function Ribbon({ months }: { months: { m: number; opened: number; care: number }[] }) {
  const W = 360, H = 76, mid = 36, n = months.length, bw = W / n;
  const max = Math.max(1, ...months.map((x) => Math.max(x.opened, x.care)));
  const s = (v: number) => (v ? Math.max(1.5, (v / max) * (mid - 4)) : 0);
  const years = months.filter((x) => x.m % 12 === 0);
  const last = months[n - 1];
  return (
    <figure className="fm-ribbon">
      <svg viewBox={`0 0 ${W} ${H + 12}`} role="img" aria-label={`Requests opened and care recorded each month, ${monthName(months[0].m, true)} to ${monthName(last.m, true)}`}>
        {months.map((x, i) => (
          <g key={x.m}>
            {x.opened > 0 && <rect x={i * bw + 0.5} y={mid - s(x.opened)} width={Math.max(1, bw - 1)} height={s(x.opened)} rx={1} fill="#e0673f" />}
            {x.care > 0 && <rect x={i * bw + 0.5} y={mid + 1} width={Math.max(1, bw - 1)} height={s(x.care)} rx={1} fill="#1b8a8f" />}
          </g>
        ))}
        <line x1={0} x2={W} y1={mid + 0.5} y2={mid + 0.5} stroke={MARK.ink} strokeWidth={1} />
        {years.map((x) => <text key={x.m} x={months.indexOf(x) * bw} y={H + 10} className="fm-ribbon-y">{2000 + Math.floor(x.m / 12)}</text>)}
      </svg>
      <figcaption><i style={{ background: "#e0673f" }} />requests opened <i style={{ background: "#1b8a8f" }} />care recorded · by month, as recorded</figcaption>
    </figure>
  );
}

/* ── Neighbourhood: the animals recorded here, as a contact sheet ── */
function AreaCard({ cell, city, area, onAnimal, variant }: { cell: MapCell; city: string; area: MapArea | null | "loading" | "error"; onAnimal: (id: string) => void; variant: MapVariant }) {
  const [all, setAll] = useState(false);
  const a = area && area !== "loading" && area !== "error" ? area : null;
  const sorted = a ? [...a.animals].sort((x, y) => NEED_RANK[needOf(x)] - NEED_RANK[needOf(y)]) : [];
  const shown = all ? sorted : sorted.slice(0, 12);
  const open = cell.open_cases - (cell.open_unconfirmed ?? 0);
  return (
    <div className="fm-card">
      <p className="fm-k">{city} · an area of about 0.74 km²</p>
      <dl className="fm-facts">
        <div className={cell.needs_help ? "is-help" : undefined}><dt>Needing help</dt><dd>{f(cell.needs_help)}</dd></div>
        <div className={open ? "is-open" : undefined}><dt>Open requests</dt><dd>{f(open)}{cell.open_unconfirmed ? <small> +{cell.open_unconfirmed} unconfirmed</small> : null}</dd></div>
        <div><dt>Animals</dt><dd>{f(cell.animals)}</dd></div>
        <div><dt>Last recorded</dt><dd className="is-text">{ago([cell.last_seen, cell.last_case, cell.care_last].filter(Boolean).sort().pop() ?? null) ?? "not recorded"}</dd></div>
      </dl>
      {area === "loading" && <div className="fm-sheetgrid" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <span key={i} className="fm-skel" />)}</div>}
      {area === "error" && <p className="fm-note is-err" role="alert">This area&rsquo;s animals could not be read. That is not the same as none.</p>}
      {a && (
        <>
          <p className="fm-k">Recorded here · {f(a.animalTotal)}</p>
          <ul className="fm-sheetgrid">{shown.map((x) => {
            const n = needOf(x);
            return (
              <li key={x.id} className={`is-${n}`}><button type="button" onClick={() => onAnimal(x.id)}>
                {x.photo ? <Portrait src={x.photo} tag={x.title} sensitive={x.sensitive} size="s" alt="" /> : <span className="fm-thumb" aria-hidden><Paw color={NEED_INK[n]} /><i>{x.title}</i></span>}
                <b>{x.title}</b><small><i aria-hidden style={{ background: NEED_INK[n] }} />{n === "rec" ? x.describe ?? NEED_LABEL.rec : NEED_LABEL[n]}</small>
              </button></li>
            );
          })}</ul>
          {a.animals.length > 12 && !all && <button type="button" className="fm-link" onClick={() => setAll(true)}>Show all {a.animals.length} read here</button>}
          {a.animalTotal > a.animals.length && <p className="fm-note">{f(a.animals.length)} of {f(a.animalTotal)} shown, those needing help first.</p>}
          {a.cases.length > 0 && (
            <>
              <p className="fm-k">Requests for help · {f(a.caseTotal)}</p>
              <ul className="fm-reqs">{a.cases.slice(0, 5).map((c, i) => (
                <li key={i}><b>{c.condition ?? "Condition not recorded"}</b><span>{statusWord(c.status)}{c.org ? ` · ${c.org}` : ""}</span><small>{day(c.occurred) ?? "date not recorded"}{c.animal ? ` · ${c.animal}` : ""}</small></li>
              ))}</ul>
            </>
          )}
        </>
      )}
      <p className="fm-note">On the map, each dot is one recorded animal, arranged inside this area. A dot is not where the animal was seen.</p>
      {variant === "community" && <Link className="fm-btn is-flame" href={`/community/report?lat=${cell.c[1]}&lng=${cell.c[0]}`}><Radio size={16} aria-hidden /> Report an animal here</Link>}
      {variant === "ngo" && <Link className="fm-btn is-flame" href={`/ngo/cases/new?lat=${cell.c[1].toFixed(5)}&lng=${cell.c[0].toFixed(5)}&zone=${encodeURIComponent(placeName(cell.zone))}`}><Radio size={16} aria-hidden /> Open a case in this area</Link>}
    </div>
  );
}
const statusWord = (s: string | null) => (s === "open" ? "Open" : s === "in_progress" ? "In progress" : s === "closed" ? "Closed" : s === "handed_on" ? "Handed on" : s === "no_action" ? "Closed, no action recorded" : "Status not recorded");

/* ── Animal: a field-guide entry ── */
function AnimalCard({ a, city, cell, variant, embedded }: { a: AreaAnimal; city: string; cell: MapCell | null; variant: MapVariant; embedded?: boolean }) {
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();
  const from = embedded ? `/explore?${new URLSearchParams({ city, ...(cell ? { area: cell.h3 } : {}), animal: a.id })}` : `${pathname ?? "/community"}${params.size ? `?${params.toString()}` : ""}`;
  const ster = a.ster === "sterilised" ? "Recorded sterilised" : a.ster === "not_sterilised" ? "Recorded not sterilised" : "Sterilisation not recorded";
  const vacc = a.vacc === "vaccinated" ? "Recorded vaccinated" : a.vacc === "not_vaccinated" ? "Recorded not vaccinated" : "Vaccination not recorded";
  const need = needOf(a), open = a.facts?.open ?? 0;
  const reqs = `${f(open)} open request${open === 1 ? "" : "s"} for help`;
  const why = need === "help" ? `Flagged as needing help${open ? ` · ${reqs}` : ""}` : need === "open" ? reqs : "No open request on the record. Not the same as fine.";
  const thread = useMemo(() => {
    const t: { when: string | null; what: string; tone?: string }[] = [];
    t.push({ when: a.first_seen, what: `First on the record${a.source ? `, from ${sourceWord(a.source)}` : ""}` });
    if (a.facts?.cases) t.push({ when: null, what: `${a.facts.cases} request${a.facts.cases === 1 ? "" : "s"} for help${a.facts.open ? `, ${a.facts.open} open` : ""}`, tone: a.facts.open ? "flame" : undefined });
    if (a.facts?.care) t.push({ when: a.facts.lastCare, what: `${a.facts.care} care record${a.facts.care === 1 ? "" : "s"}${a.facts.ster ? ", including sterilisation" : ""}`, tone: "care" });
    t.push({ when: a.last_seen, what: "Last recorded" });
    return t;
  }, [a]);
  const share = async () => {
    const url = `${window.location.origin}/animal/${a.id}`;
    try { if (navigator.share) await navigator.share({ title: `${a.title} on StrayPaw`, url }); else { await navigator.clipboard.writeText(url); setCopied(true); } } catch { /* dismissed */ }
  };
  return (
    <article className="fm-card fm-animal">
      <p className={`fm-status is-${need}`} role="status"><i aria-hidden style={{ background: NEED_INK[need] }} /><b>{NEED_LABEL[need]}</b><span>{why}</span></p>
      <div className="fm-photo">{a.photo ? <Portrait src={a.photo} tag={a.title} sensitive={a.sensitive} size="l" alt={`${a.title}, as photographed`} /> : <Plate tag={a.title} puppy={a.size === "puppy"} />}</div>
      <p className="fm-k">{[a.describe, placeName(a.zone ?? cell?.zone), city].filter(Boolean).join(" · ")}</p>
      <ul className="fm-chips">
        <li className={a.ster === "sterilised" ? "is-care" : a.ster ? "" : "is-unknown"}>{ster}</li>
        <li className={a.vacc === "vaccinated" ? "is-care" : a.vacc && a.vacc !== "unknown" ? "" : "is-unknown"}>{vacc}</li>
      </ul>
      <ol className="fm-thread" aria-label="What the record holds, in order">
        {thread.map((t, i) => <li key={i} className={t.tone ? `is-${t.tone}` : undefined}><span>{t.what}</span><time>{t.when ? `${day(t.when)} · ${ago(t.when)}` : ""}</time></li>)}
      </ol>
      <p className="fm-note">{a.org ? `Kept by ${a.org}. ` : ""}Placed by area, not by street. A status is as recorded, never assumed.</p>
      <div className="fm-acts">
        <Link className="fm-btn is-ink" href={variant === "ngo" ? `/ngo/animals/${a.id}` : `/animal/${a.id}${from ? `?from=${encodeURIComponent(from)}` : ""}`}>{variant === "ngo" ? "Casefile" : "The full record"} <ArrowUpRight size={16} aria-hidden /></Link>
        {variant === "community" && <Link className="fm-btn is-flame" href={`/community/report?animal=${a.id}`}><Radio size={16} aria-hidden /> I saw this animal</Link>}
        {variant === "ngo" && <Link className="fm-btn is-flame" href={`/ngo/cases/new?dog=${a.id}`}><Radio size={16} aria-hidden /> Open a case</Link>}
        <button type="button" className="fm-btn" onClick={share}><Share2 size={16} aria-hidden /> {copied ? "Link copied" : "Share"}</button>
      </div>
    </article>
  );
}
function Paw({ color }: { color: string }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden><circle cx="12" cy="12" r="7" fill={color} stroke="#fffdf9" strokeWidth="2" /><circle cx="12" cy="12" r="10" fill="none" stroke="rgba(11,30,61,0.18)" strokeWidth="1" /></svg>;
}
/* No photograph: said plainly, on a quiet plate. Nothing stands in for the animal. */
function Plate({ tag }: { tag: string; puppy: boolean }) {
  return (
    <figure className="fm-plate">
      <p role="img" aria-label={`No photograph recorded for ${tag}`}><b>No photograph recorded</b><span>{tag}</span></p>
    </figure>
  );
}
const sourceWord = (s: string) => (/import|register|xlsx|sheet/i.test(s) ? "an imported register" : /inat/i.test(s) ? "an iNaturalist observation" : /campaign|survey/i.test(s) ? "a field campaign" : /field/i.test(s) ? "a field record" : /report|community|web/i.test(s) ? "a community report" : s.replace(/_/g, " "));

/* ── Key: what the marks mean at this scale ── */
function Key({ level, lens, zoom }: { level: Level; lens: LensId; zoom: number }) {
  const L = LENSES[lens];
  const care = lens === "care" || lens === "abc" || lens === "arv";
  const filter = lens === "help" || lens === "requests" || lens === "followups";
  const sw = (c: string) => <span className="fm-sw" style={{ background: c }} aria-hidden />;
  return (
    <>
      <p className="fm-k">{lensLabel(lens)}</p>
      {level === "india" ? (
        <ul className="fm-keyl">
          {lens === "animals" ? <>
            <li>{sw(NEED_INK.help)}A city with animals needing help</li>
            <li><span className="fm-sw is-city" aria-hidden />A city on the record, sized by its animals</li>
          </> : <li><span className="fm-sw is-city" aria-hidden />A city, sized by {L.unit}</li>}
          <li><span className="fm-sw is-hollow" aria-hidden />City-level register: no streets</li>
        </ul>
      ) : (
        <ul className="fm-keyl">
          {care ? <>
            <li>{sw("#1f6f80")}{lens === "arv" ? "Recorded vaccinated" : "Recorded sterilised"}</li>
            {lens !== "arv" && <li>{sw("#d0782a")}Recorded not sterilised</li>}
            <li>{sw("#9aa6b6")}Not recorded, never counted as no</li>
          </> : <>
            <li>{sw(NEED_INK.help)}{NEED_LABEL.help}</li>
            <li>{sw(NEED_INK.open)}{NEED_LABEL.open}</li>
            <li>{sw(NEED_INK.rec)}{NEED_LABEL.rec}</li>
          </>}
          {filter && <li className="fm-keyn">Faded dots are outside this filter.</li>}
          {lens !== "animals" && <li>{sw(L.ink)}Circles: {L.define.split(".")[0].toLowerCase()}, by area.</li>}
          <li className="fm-keyn">One dot per animal, placed inside its area, not where it was seen.{zoom < LOAD_ZOOM ? " Zoom in to open each one." : ""}</li>
        </ul>
      )}
    </>
  );
}

/* ── Report here: move the map to the place, then confirm ── */
function PickBar({ variant, zoom, center, onCancel }: { variant: MapVariant; zoom: number; center: [number, number] | null; onCancel: () => void }) {
  const router = useRouter();
  const close = zoom >= 11 && center;
  const ngo = variant === "ngo";
  const base = ngo ? "/ngo/cases/new" : "/community/report";
  return (
    <>
      <div className="fm-cross" aria-hidden><Crosshair size={36} /></div>
      <div className="fm-pick" role="dialog" aria-label={ngo ? "Open a case here" : "Report an animal here"}>
        <p>{close ? (ngo ? "Open a case at the centre of the map. Move the map to the place, then confirm." : "Report an animal at the centre of the map. Move the map to the place, then confirm.") : (ngo ? "Zoom in to the street, or continue and choose the place in the case." : "Zoom in to the street where you saw the animal, or continue and choose the place in the report.")}</p>
        <div className="fm-acts">
          <button type="button" className="fm-btn is-flame" onClick={() => router.push(close ? `${base}?lat=${center![1].toFixed(5)}&lng=${center![0].toFixed(5)}` : base)}><Radio size={16} aria-hidden /> {close ? (ngo ? "Open a case here" : "Report here") : (ngo ? "Continue to the case" : "Continue to the report")}</button>
          <button type="button" className="fm-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </>
  );
}

/* ── Search: cities on the record, localities, animals by name or tag ── */
type Found = { animals: { id: string; title: string; city: string | null; zone: string | null; h3: string | null }[]; places: { city: string; name: string; animals: number }[] };
function MapSearch({ cities, onCity, onPlace, remote }: { cities: NationalCity[]; onCity: Props["onCity"]; onPlace: Props["onPlace"]; remote: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [state, setState] = useState<"idle" | "reading" | "error">("idle");
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    /* The public record is searched only on public maps; an organisation's map finds its own cities. */
    const t = q.trim(); if (!remote || t.length < 3) { setFound(null); setState("idle"); return; }
    let live = true; setState("reading");
    const id = window.setTimeout(() => {
      fetch(`/api/livingmap?kind=find&q=${encodeURIComponent(t)}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((j: Found) => { if (live) { setFound(j); setState("idle"); } }).catch(() => { if (live) setState("error"); });
    }, 220);
    return () => { live = false; window.clearTimeout(id); };
  }, [q, remote]);
  useEffect(() => { const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("pointerdown", out); return () => document.removeEventListener("pointerdown", out); }, []);
  const t = q.trim().toLowerCase();
  const cityHits = t ? cities.filter((c) => c.city.toLowerCase().includes(t)).slice(0, 4) : [];
  const rows: { key: string; label: string; sub: string; go: () => void }[] = [
    ...cityHits.map((c) => ({ key: `c:${c.city}`, label: c.city, sub: `City · ${f(c.animals)} animals`, go: () => onCity(c.city) })),
    ...(found?.places ?? []).map((p) => ({ key: `p:${p.city}:${p.name}`, label: p.name, sub: `Locality in ${p.city} · ${f(p.animals)} animals`, go: () => onPlace(p.city, p.name) })),
    ...(found?.animals ?? []).filter((a) => a.city && a.h3).map((a) => ({ key: `a:${a.id}`, label: a.title, sub: `Animal · ${[placeName(a.zone), a.city].filter(Boolean).join(", ")}`, go: () => onCity(a.city!, { area: a.h3!, animal: a.id }) })),
  ];
  const pick = (i: number) => { const r = rows[i]; if (!r) return; r.go(); setOpen(false); setQ(""); };
  return (
    <div className="fm-search" ref={box}>
      <label className="fm-search-in">
        <Search size={17} aria-hidden />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }} onFocus={() => setOpen(true)} placeholder="A city, locality or animal" aria-label="Search the map: a city, locality, animal name or StrayPaw tag" role="combobox" aria-expanded={open && rows.length > 0} aria-controls={open && t.length > 0 ? "fm-found" : undefined} aria-activedescendant={open && rows.length ? `fm-result-${hi}` : undefined} aria-autocomplete="list"
          onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(rows.length - 1, h + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); } else if (e.key === "Enter") { e.preventDefault(); pick(hi); } else if (e.key === "Escape") setOpen(false); }} />
      </label>
      {open && t.length > 0 && (
        <ul id="fm-found" className="fm-found" role="listbox">
          {rows.map((r, i) => <li id={`fm-result-${i}`} key={r.key} role="option" aria-selected={i === hi}><button type="button" onMouseEnter={() => setHi(i)} onClick={() => pick(i)}><b>{r.label}</b><small>{r.sub}</small></button></li>)}
          {state === "reading" && <li className="fm-found-note" role="option" aria-selected="false" aria-disabled="true">Searching the record…</li>}
          {state === "error" && <li className="fm-found-note" role="option" aria-selected="false" aria-disabled="true">Search could not reach the record. Cities above still work.</li>}
          {state === "idle" && t.length >= 3 && !rows.length && <li className="fm-found-note" role="option" aria-selected="false" aria-disabled="true">Nothing on the record matches. No result is not the same as no animals there.</li>}
          {t.length < 3 && !rows.length && <li className="fm-found-note" role="option" aria-selected="false" aria-disabled="true">Type at least three letters.</li>}
        </ul>
      )}
    </div>
  );
}
