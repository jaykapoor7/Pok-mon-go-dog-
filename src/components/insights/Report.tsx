"use client";

/* ════════════════════════════════════════════════════════════════════
   The register, explained.

   The map answers "where". This report answers "why", "how many" and
   "since when", from the same dataset and for the same place: a city, a
   locality or one cell, chosen here, on the map, or on the plate in the
   margin. Every chapter asks one question, answers it in a sentence
   computed from the records in scope, and then shows the evidence.

   Public (/insights) and an organisation's own (/partner/reports) are the
   same report over different registers. On the public one, a small place
   never prints a count of one or two; it reads "few".
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarRange, ChevronDown, Map as MapIcon, RotateCcw } from "lucide-react";
import { ScaleLadder, type Rung } from "@/components/system/ScaleLadder";
import { HexPlate } from "@/components/system/HexPlate";
import { PeriodBrush } from "@/components/viz/PeriodBrush";
import { useSpatialDataset, type Scope } from "@/components/spatial/data";
import {
  fewOr, firstDay, isSparse, monthEndDay, monthLabel, monthOfDay, monthStartDay,
} from "@/lib/spatial/engine";
import { casesIn } from "@/lib/spatial/measures";
import { fates, type Fate } from "@/lib/spatial/report";
import { C, C_STRIDE, EPOCH_YEAR } from "@/lib/spatial/types";
import { CONDITIONS } from "@/lib/register/taxonomy";
import { Evidence, Happens, Intervention, Response, When, Where, type Ctx } from "./Chapters";
import "./report.css";

type Place = { city: number; locality: number; cell: number };
type Source = "all" | "field" | "resident";

const ym = (m: number) => `${EPOCH_YEAR + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
const parseYm = (s: string | null) => {
  const r = s?.match(/^(\d{4})-(\d{2})$/);
  return r ? (Number(r[1]) - EPOCH_YEAR) * 12 + Number(r[2]) - 1 : null;
};

export type Headline = { requests: number; closedPct: number; noAction: number; open: number; place: string; since: string };

const CHAPTERS = [
  { id: "happens", label: "What happens" },
  { id: "when", label: "When" },
  { id: "response", label: "Response" },
  { id: "where", label: "Where" },
  { id: "intervention", label: "ABC & ARV" },
  { id: "evidence", label: "What is not known" },
];

export function Report({ scope, initial = null, tail = null, notice = null, userKey = null }: {
  scope: Scope;
  /** Server-computed headline for the default view, shown before the register arrives. */
  initial?: Headline | null;
  /** After the chapters: an organisation's exports. */
  tail?: ReactNode;
  notice?: ReactNode;
  userKey?: string | null;
}) {
  const params = useSearchParams();
  const { ds, ix, loading, error } = useSpatialDataset(scope, userKey);

  /* ── the clock ─────────────────────────────────────────────────────── */
  const m0 = useMemo(() => (ds ? monthOfDay(firstDay(ds)) : 0), [ds]);
  const mNow = ds ? monthOfDay(ds.today) : 0;

  /* ── state, seeded from the URL once the register is here ─────────── */
  const [place, setPlace] = useState<Place>({ city: 0, locality: -1, cell: -1 });
  const [range, setRange] = useState<[number, number] | null>(null);
  const [condition, setCondition] = useState(-1);
  const [source, setSource] = useState<Source>("all");
  const [focus, setFocus] = useState<Fate | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  useEffect(() => {
    if (!periodOpen) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setPeriodOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [periodOpen]);

  useEffect(() => {
    if (!ds || seeded) return;
    const p: Place = { city: 0, locality: -1, cell: -1 };
    const cellKey = params.get("cell"), cityName = params.get("city"), q = params.get("q");
    const ci = cellKey ? ds.cells.indexOf(cellKey) : -1;
    if (ci >= 0) { p.city = ds.cellCity[ci]; p.cell = ci; }
    else {
      if (cityName) { const k = ds.cities.findIndex((c) => c.name.toLowerCase() === cityName.toLowerCase()); if (k >= 0) p.city = k; else if (cityName.toLowerCase() === "india") p.city = -1; }
      if (q) { const li = ds.localities.findIndex((l) => l.toLowerCase() === q.toLowerCase()); if (li >= 0) p.locality = li; }
    }
    setPlace(p);
    const f = parseYm(params.get("from")), t = parseYm(params.get("to"));
    if (f !== null || t !== null) setRange([Math.max(m0, Math.min(mNow, f ?? m0)), Math.max(m0, Math.min(mNow, t ?? mNow))]);
    const cond = params.get("cond");
    if (cond) { const k = CONDITIONS.findIndex((c) => c.toLowerCase() === cond.toLowerCase()); if (k >= 0) setCondition(k); }
    const src = params.get("src");
    if (src === "field" || src === "resident") setSource(src);
    setSeeded(true);
  }, [ds, seeded, params, m0, mNow]);

  const [from, to] = range ?? [m0, mNow];
  const fromDay = monthStartDay(from), toDay = ds ? Math.min(monthEndDay(to), ds.today) : 0;

  /* ── keep the URL in step ──────────────────────────────────────────── */
  useEffect(() => {
    if (!ds || !seeded) return;
    const u = new URL(window.location.href);
    ["city", "q", "cell", "from", "to", "cond", "src"].forEach((k) => u.searchParams.delete(k));
    if (place.cell >= 0) u.searchParams.set("cell", ds.cells[place.cell]);
    else {
      u.searchParams.set("city", place.city >= 0 ? ds.cities[place.city].name : "India");
      if (place.locality >= 0) u.searchParams.set("q", ds.localities[place.locality]);
    }
    if (range && (range[0] !== m0 || range[1] !== mNow)) { u.searchParams.set("from", ym(range[0])); u.searchParams.set("to", ym(range[1])); }
    if (condition >= 0) u.searchParams.set("cond", CONDITIONS[condition]);
    if (source !== "all") u.searchParams.set("src", source);
    window.history.replaceState(window.history.state, "", u.toString());
  }, [ds, seeded, place, range, condition, source, m0, mNow]);

  /* ── what is in scope ──────────────────────────────────────────────── */
  const cells = useMemo(() => {
    if (!ds || place.city < 0) return null;
    const out = new Set<number>();
    for (let c = 0; c < ds.cells.length; c++) {
      if (ds.cellCity[c] !== place.city) continue;
      if (place.cell >= 0 && c !== place.cell) continue;
      if (place.locality >= 0 && ds.cellLocality[c] !== place.locality) continue;
      out.add(c);
    }
    return out;
  }, [ds, place]);
  const cityCells = useMemo(() => {
    if (!ds || place.city < 0) return null;
    return new Set(ds.cells.map((_, i) => i).filter((i) => ds.cellCity[i] === place.city));
  }, [ds, place.city]);
  const idx = useMemo(() => (ds ? casesIn(ds, { cells, from: fromDay, to: toDay, condition, source }) : []), [ds, cells, fromDay, toDay, condition, source]);
  const cityIdx = useMemo(() => (ds ? casesIn(ds, { cells: cityCells, from: fromDay, to: toDay, condition, source }) : []), [ds, cityCells, fromDay, toDay, condition, source]);

  const guard = scope === "public" && (place.locality >= 0 || place.cell >= 0);
  const n = useCallback((x: number) => fewOr(x, guard), [guard]);

  const placeName = !ds ? initial?.place ?? "" : place.cell >= 0
    ? `${ds.cellLocality[place.cell] >= 0 ? ds.localities[ds.cellLocality[place.cell]] : "One"} cell`
    : place.locality >= 0 ? ds.localities[place.locality]
    : place.city >= 0 ? ds.cities[place.city].name : "India";

  const mapHref = useCallback((mode: string, extra: Record<string, string> = {}) => {
    const base = scope === "org" ? "/partner/map" : "/map";
    const q = new URLSearchParams({ mode, ...extra });
    if (ds) {
      if (place.cell >= 0) q.set("cell", ds.cells[place.cell]);
      else if (place.city >= 0) { q.set("city", ds.cities[place.city].name); if (place.locality >= 0) q.set("q", ds.localities[place.locality]); }
    }
    if (range && range[1] !== mNow) q.set("m", String(range[1]));
    return `${base}?${q.toString()}`;
  }, [scope, ds, place, range, mNow]);

  /* ── the monthly rhythm, for the brush ─────────────────────────────── */
  const series = useMemo(() => {
    if (!ds) return [] as number[];
    const s = new Array(Math.max(1, mNow - m0 + 1)).fill(0);
    for (let i = 0; i < ds.cases.length; i += C_STRIDE) {
      const d = ds.cases[i + C.day];
      if (d < 0 || d > ds.today) continue;
      if (cityCells && !cityCells.has(ds.cases[i + C.cell])) continue;
      s[Math.max(0, monthOfDay(d) - m0)]++;
    }
    return s;
  }, [ds, m0, mNow, cityCells]);

  /* ── the ladder ────────────────────────────────────────────────────── */
  const rungs: Rung[] = useMemo(() => {
    if (!ds) return [{ label: initial?.place ?? "India" }];
    const r: Rung[] = [{ label: "India", onClick: () => setPlace({ city: -1, locality: -1, cell: -1 }) }];
    if (place.city >= 0) {
      const c = ds.cities[place.city];
      if (c.state && c.state !== c.name) r.push({ label: c.state });
      r.push({ label: c.name, onClick: () => setPlace({ city: place.city, locality: -1, cell: -1 }) });
      const l = place.cell >= 0 ? ds.cellLocality[place.cell] : place.locality;
      if (l >= 0) r.push({ label: ds.localities[l], onClick: () => setPlace({ city: place.city, locality: l, cell: -1 }) });
      if (place.cell >= 0) r.push({ label: "Cell" });
    }
    return r;
  }, [ds, place, initial]);

  const localitiesInCity = useMemo(() => {
    if (!ds || place.city < 0) return [] as { i: number; name: string; n: number }[];
    const m = new Map<number, number>();
    for (const i of cityIdx) { const l = ds.cellLocality[ds.cases[i * C_STRIDE + C.cell]]; if (l >= 0) m.set(l, (m.get(l) ?? 0) + 1); }
    return [...m.entries()].map(([i, k]) => ({ i, name: ds.localities[i], n: k })).sort((a, b) => a.name.localeCompare(b.name));
  }, [ds, cityIdx, place.city]);

  /* ── the plate in the margin ───────────────────────────────────────── */
  const plate = useMemo(() => {
    if (!ds || place.city < 0 || !cityCells) return null;
    const per = new Map<number, number>();
    for (const i of cityIdx) { const c = ds.cases[i * C_STRIDE + C.cell]; per.set(c, (per.get(c) ?? 0) + 1); }
    const max = Math.max(1, ...per.values());
    const ramp = ["var(--sp-seq-1)", "var(--sp-seq-2)", "var(--sp-seq-3)", "var(--sp-seq-4)", "var(--sp-seq-5)"];
    return [...cityCells].map((i) => {
      const v = per.get(i) ?? 0;
      return {
        key: ds.cells[i], ring: ds.rings[i],
        fill: v ? ramp[Math.min(4, Math.floor(Math.sqrt(v / max) * 5))] : "var(--sp-seq-0)",
        selected: !!cells && cells.size < cityCells.size && cells.has(i),
        title: `${ds.cellLocality[i] >= 0 ? ds.localities[ds.cellLocality[i]] : "Cell"}: ${fewOr(v, scope === "public")} requests`,
      };
    });
  }, [ds, place.city, cityCells, cityIdx, cells, scope]);

  /* ── chapters: one at a time on a phone, all of them on a wide screen ── */
  /* On a phone each chapter is its own screen: the chips choose it and a
     Next button steps on. On a wide screen the page stays one scroll to
     scan, and the contents rail marks the chapter in view and jumps to any
     of them. #when and the like open that chapter either way. */
  const [active, setActive] = useState("happens");
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const on = () => setWide(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1); if (CHAPTERS.some((c) => c.id === h)) setActive(h); };
    read(); window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  /* Wide: follow the reader down the page. */
  useEffect(() => {
    if (!wide || !ds) return;
    const els = CHAPTERS.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => {
      const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (v) setActive(v.target.id);
    }, { rootMargin: "-12% 0px -70% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [wide, ds, idx]);
  /* Phone: keep the chosen chip in view in its scrolling row. */
  useEffect(() => {
    if (wide) return;
    document.querySelector(`.an-toc-phone [data-ch="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active, wide]);
  const pick = (id: string) => {
    setActive(id);
    try { history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`); } catch { /* ok */ }
    if (wide) { document.getElementById(id)?.scrollIntoView({ block: "start" }); return; }
    const body = document.querySelector(".an-body");
    if (body && body.getBoundingClientRect().top < 0) body.scrollIntoView({ block: "start" });
  };
  const at = CHAPTERS.findIndex((c) => c.id === active);
  const nextCh = CHAPTERS[at + 1];
  const show = (id: string) => wide || active === id;

  /* ── the headline ──────────────────────────────────────────────────── */
  const head = useMemo(() => {
    if (!ds) return initial;
    const by = fates(ds, idx);
    return {
      requests: idx.length,
      closedPct: idx.length ? Math.round((by.closed / idx.length) * 100) : 0,
      noAction: by.no_action + by.not_attended,
      open: by.open + by.in_progress,
      place: placeName,
      since: `${monthLabel(from)} – ${monthLabel(to)}`,
    } satisfies Headline;
  }, [ds, idx, initial, placeName, from, to]);

  const ctx: Ctx | null = ds && ix ? {
    ds, ix, scope, cells, city: place.city, idx, fromDay, toDay, n, guard, place: placeName, mapHref, focus, setFocus,
    setCondition: (k) => setCondition(k),
    setLocality: (l) => setPlace({ city: place.city, locality: l, cell: -1 }),
    setCell: (c) => setPlace({ city: ds.cellCity[c], locality: -1, cell: c }),
  } : null;

  const filtered = condition >= 0 || source !== "all" || (range && (range[0] !== m0 || range[1] !== mNow));
  const reset = () => { setRange(null); setCondition(-1); setSource("all"); setFocus(null); };

  return (
    <div className={`an ${scope === "org" ? "is-org" : ""}`}>
      <header className="an-mast">
        {notice && <div className="an-notice">{notice}</div>}
        <div className="an-kicker">
          <p className="sys-eyebrow">{scope === "org" ? "Your records, explained" : "The register, explained"}</p>
          <ScaleLadder rungs={rungs} />
        </div>
        <h1>
          <span>{head ? <>{guard && isSparse(head.requests) ? "Few" : head.requests.toLocaleString("en-IN")} request{head.requests === 1 ? "" : "s"} for help.</> : error ? "The register could not be read." : <>&nbsp;</>}</span>
          <em>{!head ? (error ? "Nothing below is drawn until it can. Try again in a minute." : <>&nbsp;</>)
            : head.requests >= FEW_HEAD ? <>{head.closedPct}% closed after field work{head.noAction ? <>, {fewOr(head.noAction, guard)} without it</> : null}.</>
            : head.requests === 0 ? "None in this place and period."
            : guard ? "Too few to read as a pattern; what is recorded is below."
            : "Here is what happened to each of them."}</em>
        </h1>
        <p className="an-mast-lede">
          The map shows where. This page explains what happened, when, how fast and what is still unknown — for the place and period you choose.
          Recorded requests and recorded animals, never a population estimate.
        </p>
      </header>

      <div className="an-bar" role="region" aria-label="Place, period and filters">
        <div className="an-bar-row">
          {ds && (
            <div className="an-bar-selects">
              <label><span className="sys-sr">City</span>
                <select value={place.city} onChange={(e) => setPlace({ city: Number(e.target.value), locality: -1, cell: -1 })}>
                  <option value={-1}>All of India</option>
                  {ds.cities.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
                </select>
              </label>
              {place.city >= 0 && localitiesInCity.length > 0 && (
                <label><span className="sys-sr">Locality</span>
                  <select value={place.cell >= 0 ? -1 : place.locality} onChange={(e) => setPlace({ city: place.city, locality: Number(e.target.value), cell: -1 })}>
                    <option value={-1}>Every locality</option>
                    {localitiesInCity.map((l) => <option key={l.i} value={l.i}>{l.name}</option>)}
                  </select>
                </label>
              )}
              <button type="button" className={`an-period ${range ? "is-set" : ""}`} aria-expanded={periodOpen} onClick={() => setPeriodOpen((v) => !v)}>
                <CalendarRange size={14} /> {monthLabel(from)} – {monthLabel(to)} <ChevronDown size={14} />
              </button>
              <label><span className="sys-sr">Condition</span>
                <select value={condition} onChange={(e) => setCondition(Number(e.target.value))} className={condition >= 0 ? "is-set" : ""}>
                  <option value={-1}>Every condition</option>
                  {CONDITIONS.map((c, i) => <option key={c} value={i}>{c}</option>)}
                </select>
              </label>
              <label><span className="sys-sr">Recorded by</span>
                <select value={source} onChange={(e) => setSource(e.target.value as Source)} className={source !== "all" ? "is-set" : ""}>
                  <option value="all">Recorded by anyone</option>
                  <option value="field">By field teams</option>
                  <option value="resident">By residents</option>
                </select>
              </label>
              {filtered && <button type="button" className="an-reset" onClick={reset}><RotateCcw size={13} /> Reset</button>}
            </div>
          )}
          <Link href={mapHref(focus === "no_action" ? "cases" : "density", focus === "no_action" ? { lens: "noaction" } : {})} className="sys-btn is-sm an-tomap" aria-label="See this place on the map"><MapIcon size={14} /> Map</Link>
        </div>
        {periodOpen && ds && series.length > 1 && (
          <div className="an-period-pop" role="dialog" aria-label="Choose the period">
            <PeriodBrush series={series} m0={m0} from={from} to={to} onChange={(f, t) => setRange(f === m0 && t === mNow ? null : [f, t])} />
            <button type="button" className="sys-btn is-sm" onClick={() => setPeriodOpen(false)}>Done</button>
          </div>
        )}
      </div>

      <nav className="an-toc-phone" aria-label="Chapters">
        {CHAPTERS.map((c, i) => <button key={c.id} type="button" data-ch={c.id} aria-pressed={active === c.id} className={active === c.id ? "is-on" : ""} onClick={() => pick(c.id)}><span className="sys-mono">{i + 1}</span>{c.label}</button>)}
      </nav>

      <div className="an-body">
        <aside className="an-rail" aria-label="Place and contents">
          {plate && ds && place.city >= 0 && (
            <figure className="an-rail-plate">
              <HexPlate width={280} height={250} box={ds.cities[place.city].box} cells={plate} label={`Requests by cell in ${ds.cities[place.city].name}`} scaleBarKm={2}
                onCell={(key) => { const i = ds.cells.indexOf(key); if (i >= 0) setPlace({ city: place.city, locality: -1, cell: i }); }} />
              <figcaption>Choose a cell to read it on its own. Darker cells have more requests.</figcaption>
            </figure>
          )}
          <nav className="an-toc" aria-label="Chapters">
            <ol>
              {CHAPTERS.map((c, i) => (
                <li key={c.id}><button type="button" aria-pressed={active === c.id} className={active === c.id ? "is-on" : ""} onClick={() => pick(c.id)}><span className="sys-mono">{String(i + 1).padStart(2, "0")}</span>{c.label}</button></li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="an-main">
          {loading && <p className="an-state" role="status">Reading the register…</p>}
          {error && <p className="an-state" role="status">{error}</p>}
          {ctx && (
            <>
              {show("happens") && <Happens c={ctx} />}
              {show("when") && <When c={ctx} />}
              {show("response") && <Response c={ctx} />}
              {show("where") && <Where c={ctx} />}
              {show("intervention") && <Intervention c={ctx} />}
              {show("evidence") && <Evidence c={ctx} />}
              {!wide && nextCh && <button type="button" className="an-next" onClick={() => pick(nextCh.id)}>Next: {nextCh.label} <span className="sys-mono">{at + 2} of {CHAPTERS.length}</span> <ArrowRight size={15} aria-hidden /></button>}
            </>
          )}
          {tail}
        </div>
      </div>
    </div>
  );
}

const FEW_HEAD = 3;
