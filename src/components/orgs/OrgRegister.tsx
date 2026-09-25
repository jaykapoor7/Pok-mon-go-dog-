"use client";

/* ════════════════════════════════════════════════════════════════════
   The organisation register.

   Forty-odd named organisations are a list; where they are and what they
   do is the information. So the page opens with India as tiles — one per
   state and union territory, shaded by how many listed organisations are
   there, hatched where none is listed (not listed is not "nobody works
   here") — and what they do as columns of squares, one square per
   organisation. Either one filters the register below, where every row
   carries a small copy of the tile map with its state lit, and a tick in
   each column of work it does, like a survey form.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import Link from "next/link";
import type { ContributorOrg } from "@/lib/contributor-types";
import "./orgs.css";

type Org = ContributorOrg;

/** India as tiles: [code, col, row]. A cartogram — neighbours stay neighbours, sizes do not. */
const TILES: [string, number, number][] = [
  ["IN-JK", 3, 0], ["IN-LA", 4, 0],
  ["IN-CH", 1, 1], ["IN-PB", 2, 1], ["IN-HP", 3, 1], ["IN-UT", 4, 1],
  ["IN-RJ", 1, 2], ["IN-HR", 2, 2], ["IN-DL", 3, 2], ["IN-UP", 4, 2], ["IN-BR", 5, 2], ["IN-SK", 6, 2], ["IN-AR", 8, 2],
  ["IN-GJ", 1, 3], ["IN-MP", 2, 3], ["IN-CT", 3, 3], ["IN-JH", 4, 3], ["IN-WB", 5, 3], ["IN-AS", 6, 3], ["IN-NL", 7, 3],
  ["IN-DH", 1, 4], ["IN-MH", 2, 4], ["IN-TG", 3, 4], ["IN-OR", 4, 4], ["IN-TR", 5, 4], ["IN-ML", 6, 4], ["IN-MN", 7, 4],
  ["IN-GA", 1, 5], ["IN-KA", 2, 5], ["IN-AP", 3, 5], ["IN-MZ", 6, 5],
  ["IN-LD", 0, 6], ["IN-KL", 2, 6], ["IN-TN", 3, 6], ["IN-PY", 4, 6], ["IN-AN", 7, 6],
];
const COLS = 9, ROWS = 7;
/** The columns of work the register ticks; everything else is "other". */
const WORK: { id: string; label: string; short: string }[] = [
  { id: "Rescue", label: "Rescue", short: "Rescue" },
  { id: "ABC", label: "Sterilisation (ABC)", short: "ABC" },
  { id: "Anti-rabies vaccination", label: "Anti-rabies vaccination", short: "ARV" },
  { id: "Shelter", label: "Shelter", short: "Shelter" },
  { id: "Hospital", label: "Hospital", short: "Hospital" },
  { id: "Adoption", label: "Adoption", short: "Adopt" },
  { id: "Advocacy", label: "Advocacy", short: "Advocacy" },
];
const WORK_IDS = new Set(WORK.map((w) => w.id));
const level = (n: number) => (n <= 0 ? 0 : n === 1 ? 2 : n === 2 ? 3 : n <= 3 ? 4 : 5);

export function OrgRegister({ orgs, stateNames }: { orgs: Org[]; stateNames: Record<string, string> }) {
  const [state, setState] = useState<string | null>(null);
  const [work, setWork] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);

  /* The console search links here with a name, a state or a city already chosen. */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get("q"); if (v) setQ(v);
    const s = p.get("state"); if (s && orgs.some((o) => o.stateCode === s)) setState(s);
    const c = p.get("city"); if (c && orgs.some((o) => o.city === c)) setCity(c);
  }, [orgs]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orgs) m.set(o.stateCode, (m.get(o.stateCode) ?? 0) + 1);
    return m;
  }, [orgs]);
  const inState = useMemo(() => (state ? orgs.filter((o) => o.stateCode === state) : orgs), [orgs, state]);
  const workCount = (id: string) => inState.filter((o) => id === "other" ? o.focus.some((f) => !WORK_IDS.has(f)) : o.focus.includes(id)).length;
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inState.filter((o) => {
      if (city && o.city !== city) return false;
      if (work && !(work === "other" ? o.focus.some((f) => !WORK_IDS.has(f)) : o.focus.includes(work))) return false;
      if (needle && !`${o.name} ${o.city} ${o.state} ${o.summary} ${o.focus.join(" ")}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [inState, city, work, q]);
  const cities = useMemo(() => [...new Set(inState.map((o) => o.city))].sort(), [inState]);
  const listedStates = counts.size;
  const filtered = !!(state || work || city || q.trim());

  return (
    <div className="og">
      <div className="og-top">
        <figure className="og-map">
          <figcaption className="og-cap">Where the records come from <span>choose a state</span></figcaption>
          <div className="og-tiles" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${ROWS}, auto)` }} role="group" aria-label="States and union territories">
            {TILES.map(([code, c, r]) => {
              const n = counts.get(code) ?? 0;
              const on = state === code;
              return (
                <button key={code} type="button" className={`og-tile l${level(n)} ${on ? "is-on" : ""} ${state && !on ? "is-dim" : ""}`}
                  style={{ gridColumn: c + 1, gridRow: r + 1 }} disabled={!n} aria-pressed={on}
                  aria-label={`${stateNames[code] ?? code}: ${n ? `${n} listed` : "none listed"}`} title={`${stateNames[code] ?? code} · ${n ? `${n} listed` : "none listed"}`}
                  onClick={() => { setState(on ? null : code); setCity(null); }}>
                  <span>{code.slice(3)}</span>{n > 0 && <b>{n}</b>}
                </button>
              );
            })}
          </div>
          <p className="og-key">
            <span><i className="l2" />1</span><span><i className="l3" />2</span><span><i className="l4" />3</span><span><i className="l5" />4+</span>
            <span><i className="l0" />none listed — not the same as nobody working there</span>
          </p>
        </figure>

        <figure className="og-work">
          <figcaption className="og-cap">What they document <span>one square, one organisation</span></figcaption>
          <div className="og-cols">
            {[...WORK, { id: "other", label: "Other work", short: "Other" }].map((w) => {
              const n = workCount(w.id);
              const on = work === w.id;
              return (
                <button key={w.id} type="button" className={`og-col ${on ? "is-on" : ""} ${work && !on ? "is-dim" : ""}`} disabled={!n} aria-pressed={on} onClick={() => setWork(on ? null : w.id)}>
                  <span className="og-units" aria-hidden>{Array.from({ length: n }, (_, i) => <i key={i} />)}</span>
                  <b className="sys-mono">{n}</b>
                  <span className="og-col-l">{w.short}</span>
                </button>
              );
            })}
          </div>
        </figure>
      </div>

      <div className="og-tools">
        <label className="og-search">
          <Search size={15} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search partners and data sources" aria-label="Search organisations" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Clear the search"><X size={14} /></button>}
        </label>
        {state && cities.length > 1 && (
          <label className="og-city"><span className="sys-sr">City</span>
            <select value={city ?? ""} onChange={(e) => setCity(e.target.value || null)}>
              <option value="">Every city in {stateNames[state]}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}
        {state && <button type="button" className="og-chip" onClick={() => { setState(null); setCity(null); }}>{stateNames[state]} <X size={13} /></button>}
        {work && <button type="button" className="og-chip" onClick={() => setWork(null)}>{WORK.find((w) => w.id === work)?.label ?? "Other work"} <X size={13} /></button>}
        <p className="og-tally sys-mono">{results.length} of {orgs.length}{filtered && <button type="button" onClick={() => { setState(null); setWork(null); setCity(null); setQ(""); }}>Clear</button>}</p>
      </div>

      {results.length ? (
        <>
          <div className="og-head" aria-hidden>
            <span />
            <span>Organisation</span>
            <span className="og-ticks">{WORK.map((w) => <i key={w.id} title={w.label}>{w.short}</i>)}</span>
            <span />
          </div>
          <ol className="og-list">
            {(filtered || all ? results : results.slice(0, 12)).map((o) => {
              return (
                <li key={o.id}>
                  <Link className="og-row" href={o.url}>
                    <Glyph code={o.stateCode} />
                    <span className="og-who">
                      <b>{o.name}</b>
                      <small>{o.directoryKind === "partner" ? "Partner organisation" : "Data source organisation"} · {[o.city, o.state].filter(Boolean).join(", ")}{o.founded ? ` · since ${o.founded}` : ""}</small>
                      <span className="og-sum">{o.summary}</span>
                      <small>{o.animalCount.toLocaleString("en-IN")} animal records{o.areaRecordCount ? ` · ${o.areaRecordCount.toLocaleString("en-IN")} area records` : ""}{o.sourceCount ? ` · ${o.sourceCount} source${o.sourceCount === 1 ? "" : "s"}` : ""}</small>
                    </span>
                    <span className="og-ticks" aria-label={`Does: ${o.focus.join(", ")}`}>
                      {WORK.map((w) => <i key={w.id} className={o.focus.includes(w.id) ? "is-yes" : ""} title={`${w.label}: ${o.focus.includes(w.id) ? "yes" : "not listed"}`}><span className="og-tick-l">{w.short}</span></i>)}
                    </span>
                    <span className="og-go"><ArrowUpRight size={16} aria-label="Open the organisation's StrayPaw page" /></span>
                  </Link>
                </li>
              );
            })}
          </ol>
          {!filtered && !all && results.length > 12 && (
            <button type="button" className="og-all" onClick={() => setAll(true)}>Show all {results.length}</button>
          )}
        </>
      ) : <p className="og-empty">No partner or attributed source fits that filter. The register currently covers {listedStates} states; try widening it.</p>}
    </div>
  );
}

/** The tile map at thumbnail size, with one state lit. */
function Glyph({ code }: { code: string }) {
  return (
    <svg className="og-glyph" viewBox={`0 0 ${COLS * 4} ${ROWS * 4}`} aria-hidden>
      {TILES.map(([c, x, y]) => <rect key={c} x={x * 4} y={y * 4} width={3.2} height={3.2} rx={0.6} className={c === code ? "is-on" : ""} />)}
    </svg>
  );
}
