"use client";

/* ════════════════════════════════════════════════════════════════════
   City brief: the municipal surface.

   A council officer arrives with a question about one city. The brief
   answers in the order a decision needs: what kind of evidence exists here
   and how precise it is; what is recorded, with the qualifier beside each
   figure; where recorded activity concentrates (by recorded locality —
   never presented as wards); how it changed; where the record is thin;
   and how the city compares with the others StrayPaw holds. Every figure
   says whether it is an authoritative citywide total or drawn from the
   bounded detail loaded for this page. Nothing here estimates population,
   coverage or cost.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import { useSpatialDataset, pointInCell, ringOf } from "@/components/spatial/data";
import { cityEvidence, kindOf, KIND_META } from "@/components/spatial/AtlasRegister";
import { LightsMap, type Light } from "@/components/system/LightsMap";
import { A, A_STRIDE, AF, C, C_STRIDE, K, K_STRIDE } from "@/lib/spatial/types";
import { monthLabel, monthOfDay, openNow } from "@/lib/spatial/engine";
import "./brief.css";

type CellTotals = { h3_r8: string; animals: number; sterilised: number; vaccinated: number; cases: number; open_cases: number; needs_help: number; care_events?: number };
const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
type SortKey = "animals" | "cases" | "open_cases" | "care_events" | "cells";

export function MunicipalBrief() {
  const params = useSearchParams();
  const router = useRouter();
  const { ds, error, loading, city, cities } = useSpatialDataset("public");
  const [cellTotals, setCellTotals] = useState<CellTotals[] | null>(null);
  const [sort, setSort] = useState<SortKey>("animals");

  useEffect(() => {
    if (!city) return;
    let live = true;
    setCellTotals(null);
    fetch(`/api/spatial?kind=cells&city=${encodeURIComponent(city)}&v=3`).then((r) => (r.ok ? r.json() : { cells: [] }))
      .then((j) => { if (live) setCellTotals(j.cells ?? []); }).catch(() => { if (live) setCellTotals([]); });
    return () => { live = false; };
  }, [city]);

  const row = cities.find((c) => c.city === city) ?? null;
  const ev = city ? cityEvidence(city, row?.cells ?? 0) : null;
  const kind = city ? kindOf(city, row?.cells ?? 0) : null;
  const oneLocation = (row?.cells ?? 0) <= 1;
  const pick = (name: string) => router.push(`/municipality?city=${encodeURIComponent(name)}`, { scroll: false });

  /* Recorded localities, from authoritative cell totals named by the loaded geometry. */
  const localities = useMemo(() => {
    if (!ds || !cellTotals) return null;
    const idx = new Map(ds.cells.map((c, i) => [c, i]));
    const by = new Map<string, { name: string; animals: number; open: number; cases: number; care: number; cells: number }>();
    for (const c of cellTotals) {
      const i = idx.get(c.h3_r8);
      const name = i != null && ds.cellLocality[i] >= 0 ? ds.localities[ds.cellLocality[i]] : "Cells without a recorded locality";
      const v = by.get(name) ?? { name, animals: 0, open: 0, cases: 0, care: 0, cells: 0 };
      v.animals += c.animals; v.open += c.open_cases; v.cases += c.cases; v.care += c.care_events ?? 0; v.cells++;
      by.set(name, v);
    }
    return [...by.values()];
  }, [ds, cellTotals]);

  /* Bounded detail: monthly activity, conditions, unknown status. */
  const detail = useMemo(() => {
    if (!ds) return null;
    const nA = ds.animals.length / A_STRIDE, nC = ds.cases.length / C_STRIDE, nK = ds.care.length / K_STRIDE;
    const months = new Map<number, { cases: number; care: number }>();
    for (let i = 0; i < nC; i++) { const d = ds.cases[i * C_STRIDE + C.day]; if (d < 0 || d > ds.today) continue; const m = monthOfDay(d); const v = months.get(m) ?? { cases: 0, care: 0 }; v.cases++; months.set(m, v); }
    for (let i = 0; i < nK; i++) { const d = ds.care[i * K_STRIDE + K.day]; if (d < 0 || d > ds.today) continue; const m = monthOfDay(d); const v = months.get(m) ?? { cases: 0, care: 0 }; v.care++; months.set(m, v); }
    const keys = [...months.keys()].sort((a, b) => a - b);
    const series = keys.length ? Array.from({ length: Math.min(36, keys[keys.length - 1] - keys[0] + 1) }, (_, k) => { const m = keys[keys.length - 1] - Math.min(36, keys[keys.length - 1] - keys[0] + 1) + 1 + k; return { m, ...(months.get(m) ?? { cases: 0, care: 0 }) }; }) : [];
    const cond = new Map<string, { n: number; open: number }>();
    for (let i = 0; i < nC; i++) { const name = ds.dict.condition[ds.cases[i * C_STRIDE + C.cond]] ?? "Not recorded"; const v = cond.get(name) ?? { n: 0, open: 0 }; v.n++; if (openNow(ds, i)) v.open++; cond.set(name, v); }
    let sterUnknown = 0, vaccUnknown = 0, photo = 0, exact = 0;
    for (let i = 0; i < nA; i++) { const f = ds.animals[i * A_STRIDE + A.flags]; if (!(f & (AF.sterYes | AF.sterNo))) sterUnknown++; if (!(f & (AF.vaccYes | AF.vaccNo))) vaccUnknown++; if (f & AF.photo) photo++; if (f & AF.exact) exact++; }
    const lights: Light[] = [];
    const rings = new Map<number, [number, number][]>();
    for (let i = 0; i < nC; i++) { if (!openNow(ds, i)) continue; const c = ds.cases[i * C_STRIDE + C.cell]; let r = rings.get(c); if (!r) { r = ringOf(ds, c); rings.set(c, r); } const [lng, lat] = pointInCell(r, i + 7); lights.push({ lng, lat, help: true }); }
    if (!lights.length) for (let i = 0; i < Math.min(nA, 1500); i++) { const c = ds.animals[i * A_STRIDE + A.cell]; let r = rings.get(c); if (!r) { r = ringOf(ds, c); rings.set(c, r); } const [lng, lat] = pointInCell(r, i + 1); lights.push({ lng, lat }); }
    return { nA, nC, nK, series, conditions: [...cond.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.n - a.n).slice(0, 8), sterUnknown, vaccUnknown, photo, exact, frontier: ds.frontier.length, lights, openLights: lights.some((l) => l.help) };
  }, [ds]);

  const sortedCities = useMemo(() => [...cities].sort((a, b) => (sort === "cells" ? b.cells - a.cells : ((b[sort] as number) ?? 0) - ((a[sort] as number) ?? 0))), [cities, sort]);
  const box = ds?.cities.find((c) => c.name === city)?.box;
  const maxSeries = Math.max(1, ...(detail?.series.map((s) => s.cases + s.care) ?? [1]));
  const topLoc = localities ? [...localities].filter((l) => l.name !== "Cells without a recorded locality").sort((a, b) => b.open - a.open || b.cases - a.cases || b.animals - a.animals).slice(0, 10) : null;
  const useOpen = (topLoc ?? []).some((l) => l.open > 0);
  const useCases = !useOpen && (topLoc ?? []).some((l) => l.cases > 0);
  const locMeasure = (l: { open: number; cases: number; animals: number }) => (useOpen ? l.open : useCases ? l.cases : l.animals);
  const locLabel = useOpen ? "open requests" : useCases ? "requests recorded" : "animal profiles";
  const locMax = Math.max(1, ...(topLoc?.map(locMeasure) ?? [1]));
  const [allCities, setAllCities] = useState(false);

  return (
    <div className="mb">
      <header className="mb-hero x-night">
        <div className="mb-hero-map" aria-hidden>
          {ds && detail && box && !oneLocation ? <LightsMap center={[(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]} box={box} lights={detail.lights} dot={2.2} glow={1.2} credit={false} label={`${city}: ${detail.openLights ? "open requests" : "recorded animals"} placed within their cells`} /> : <div className="mb-hero-ground" />}
        </div>
        <div className="mb-hero-in x-wrap">
          <div className="mb-pick">
            <label htmlFor="mb-city" className="x-kicker">City brief</label>
            <select id="mb-city" value={city ?? ""} onChange={(e) => pick(e.target.value)} disabled={!cities.length}>
              {cities.length === 0 && <option value="">Loading cities…</option>}
              {[...cities].sort((a, b) => a.city.localeCompare(b.city)).map((c) => <option key={c.city} value={c.city}>{c.city}{c.state ? `, ${c.state}` : ""}</option>)}
            </select>
          </div>
          <h1 className="x-display">{city ?? params.get("city") ?? "Reading…"}</h1>
          {ev && kind && (
            <p className="mb-kind"><i style={{ background: KIND_META[kind].color }} aria-hidden /><b>{ev.label}</b> · {ev.precision}{row?.latest_seen ? ` · latest record ${new Date(row.latest_seen).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}</p>
          )}
          {ev && <p className="x-lede mb-note">{ev.note}</p>}
          <div className="mb-do">
            <Link className="x-btn is-flame" href={`/map?city=${encodeURIComponent(city ?? "")}&mode=coverage`}>Open in the Atlas <ArrowUpRight size={15} aria-hidden /></Link>
            <Link className="x-btn" href={`/insights?city=${encodeURIComponent(city ?? "")}`}>Analysis</Link>
            <Link className="x-btn" href="/programmes">Programmes</Link>
          </div>
        </div>
      </header>

      <div className="x-wrap">
        {error && <p className="mb-err" role="alert">The city record could not be read just now. Nothing has changed; try again shortly.</p>}

        {/* ── what is recorded ──────────────────────────────────────── */}
        <section className="mb-sec" aria-labelledby="mb-rec">
          <header className="mb-sec-h"><h2 id="mb-rec" className="x-h2">What the record holds</h2><p className="x-small">Authoritative citywide totals. Each figure is a count of records, read with the note beside it.</p></header>
          <dl className="mb-facts">
            <Fact label="Animal profiles" value={row?.animals} note="Recorded profiles, not a population. Imported rows can describe the same animal twice." />
            <Fact label="Requests for help" value={row?.cases} note={row?.cases ? `${fmt(row.open_cases)} open now. Imported "no action" closures are not verified gaps.` : "No case records are held for this city."} />
            <Fact label="Sterilisation recorded" value={row?.sterilised} note={row?.animals ? `${pct(row.sterilised ?? 0, row.animals)}% of profiles carry a positive status. The rest are unknown or recorded as not — never assume "no".` : ""} />
            <Fact label="Vaccination recorded" value={row?.vaccinated} note={row?.animals ? `${pct(row.vaccinated ?? 0, row.animals)}% of profiles. Campaign records skew this upward where a campaign worked.` : ""} />
            <Fact label="Care events" value={row?.care_events} note="Treatments, surgeries and vaccinations entered against animals." />
            <Fact label="Cells with records" value={row?.cells} note={oneLocation ? "Every record shares one city location: no street geography exists." : "Analysis cells of about 0.7 km². Not wards, not a coverage denominator."} />
          </dl>
        </section>

        {/* ── where it concentrates ─────────────────────────────────── */}
        <section className="mb-sec mb-two" aria-labelledby="mb-where">
          <div>
            <header className="mb-sec-h"><h2 id="mb-where" className="x-h2">Where recorded activity concentrates</h2><p className="x-small">Recorded localities ranked by {locLabel}, from full cell totals. Localities are source place names, not administrative boundaries.</p></header>
            {oneLocation ? <p className="mb-quiet"><Info size={16} aria-hidden /> {city}&apos;s records share a single city location, so no locality pattern can be read from them.</p>
              : !topLoc ? <div className="mb-skel">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="x-skel" />)}</div>
              : topLoc.length === 0 ? <p className="mb-quiet">No named localities are recorded for this city.</p>
              : (
                <ol className="mb-bars">
                  {topLoc.map((l) => (
                    <li key={l.name}>
                      <span className="mb-bar-name">{l.name}</span>
                      <span className="mb-bar"><span style={{ width: `${(locMeasure(l) / locMax) * 100}%` }} className={useOpen ? "is-open" : ""} /></span>
                      <b className="x-num">{fmt(locMeasure(l))}</b>
                    </li>
                  ))}
                </ol>
              )}
          </div>
          <div>
            <header className="mb-sec-h"><h2 className="x-h3">What requests are about</h2><p className="x-small">{detail ? `Conditions across ${fmt(detail.nC)} loaded requests${row?.cases && detail.nC < row.cases ? ` of ${fmt(row.cases)}` : ""}.` : "Reading…"}</p></header>
            {detail && detail.conditions.length ? (
              <ul className="mb-conds">
                {detail.conditions.map((c) => <li key={c.name}><span>{c.name}</span><b className="x-num">{fmt(c.n)}</b><small>{c.open ? `${fmt(c.open)} open` : ""}</small></li>)}
              </ul>
            ) : detail ? <p className="mb-quiet">No request records are loaded for this city.</p> : null}
          </div>
        </section>

        {/* ── change ────────────────────────────────────────────────── */}
        <section className="mb-sec" aria-labelledby="mb-time">
          <header className="mb-sec-h"><h2 id="mb-time" className="x-h2">When work was recorded</h2><p className="x-small">Requests and care events per month in the loaded detail{detail && detail.series.length ? `, ${monthLabel(detail.series[0].m)} – ${monthLabel(detail.series[detail.series.length - 1].m)}` : ""}. Historical records describe when work happened, not present-day coverage.</p></header>
          {detail && detail.series.length > 1 ? (
            <figure className="mb-chart">
              <div className="mb-cols" role="img" aria-label={`Monthly requests and care events in ${city}`}>
                {detail.series.map((s) => (
                  <span key={s.m} title={`${monthLabel(s.m)}: ${s.cases} requests, ${s.care} care events`}>
                    <i className="is-care" style={{ height: `${(s.care / maxSeries) * 100}%` }} />
                    <i className="is-case" style={{ height: `${(s.cases / maxSeries) * 100}%` }} />
                  </span>
                ))}
              </div>
              <figcaption><span><i className="is-case" /> requests</span><span><i className="is-care" /> care events</span><span className="x-small">Tallest month: {fmt(maxSeries)} records</span></figcaption>
            </figure>
          ) : <p className="mb-quiet">{detail ? "Too few dated records to show change over time." : "Reading…"}</p>}
        </section>

        {/* ── where the record is thin ──────────────────────────────── */}
        <section className="mb-sec" aria-labelledby="mb-gaps">
          <header className="mb-sec-h"><h2 id="mb-gaps" className="x-h2">Where the record is thin</h2><p className="x-small">Gaps in reporting, not proof of missing care. Shares describe the {detail ? fmt(detail.nA) : "—"} loaded profiles.</p></header>
          {detail && (
            <div className="mb-gaps">
              <Gap n={detail.sterUnknown} of={detail.nA} label="profiles with no sterilisation status recorded" act="A photograph of an ear notch or a programme register resolves these." />
              <Gap n={detail.vaccUnknown} of={detail.nA} label="profiles with no vaccination status recorded" act="Campaign registers and NGO care records are the usual source." />
              <Gap n={detail.nA - detail.exact} of={detail.nA} label="profiles located to a locality or city, not a point" act="Precision limits street-level planning; cells stay the unit." />
              <Gap n={detail.frontier} label="unreported cells at the edge of the record" act="Areas next to recorded activity where nobody has recorded anything." />
            </div>
          )}
        </section>

        {/* ── compare ───────────────────────────────────────────────── */}
        <section className="mb-sec" aria-labelledby="mb-cmp">
          <header className="mb-sec-h">
            <div><h2 id="mb-cmp" className="x-h2">Every city register</h2><p className="x-small">Different kinds of record — compare like with like. Sort by a column; choose a city to brief it.</p></div>
          </header>
          <div className="mb-table" role="region" aria-label="City registers" tabIndex={0}>
            <table>
              <thead><tr>
                <th scope="col">City</th><th scope="col">Evidence</th>
                {([["animals", "Profiles"], ["cases", "Requests"], ["open_cases", "Open"], ["care_events", "Care events"], ["cells", "Cells"]] as [SortKey, string][]).map(([k, l]) => (
                  <th key={k} scope="col" aria-sort={sort === k ? "descending" : "none"}><button type="button" onClick={() => setSort(k)}>{l}{sort === k ? " ↓" : ""}</button></th>
                ))}
                <th scope="col">Latest record</th>
              </tr></thead>
              <tbody>
                {(allCities ? sortedCities : sortedCities.slice(0, 12)).map((c) => {
                  const k = kindOf(c.city, c.cells);
                  return (
                    <tr key={c.city} className={c.city === city ? "is-on" : ""}>
                      <th scope="row"><button type="button" onClick={() => pick(c.city)}>{c.city}</button><small>{c.state}</small></th>
                      <td><span className="mb-k"><i style={{ background: KIND_META[k].color }} aria-hidden />{KIND_META[k].label}</span></td>
                      <td className="x-num">{fmt(c.animals)}</td><td className="x-num">{fmt(c.cases)}</td><td className="x-num">{fmt(c.open_cases)}</td><td className="x-num">{fmt(c.care_events)}</td><td className="x-num">{c.cells <= 1 ? "one location" : fmt(c.cells)}</td>
                      <td>{c.latest_seen ? new Date(c.latest_seen).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedCities.length > 12 && <button type="button" className="x-btn mb-more" onClick={() => setAllCities((v) => !v)} aria-expanded={allCities}>{allCities ? "Show the first 12" : `Show all ${sortedCities.length} city registers`}</button>}
        </section>

        <section className="mb-limits" aria-labelledby="mb-lim">
          <h2 id="mb-lim" className="x-h3">What this brief cannot tell you</h2>
          <ul>
            <li>How many street dogs live in {city ?? "a city"}. Official and research estimates are separate, dated sources.</li>
            <li>Programme coverage percentages. They need a compatible population denominator.</li>
            <li>Ward-level statistics. No current city has matching ward boundaries and ward-level records.</li>
            <li>Where to allocate resources. That needs cost, capacity and population evidence this record does not hold.</li>
          </ul>
          {loading && <p className="x-small" role="status">Reading {params.get("city") ?? "the city"}&apos;s record…</p>}
        </section>
      </div>
    </div>
  );
}

function Fact({ label, value, note }: { label: string; value: number | null | undefined; note: string }) {
  return <div><dt>{label}</dt><dd className="x-num">{fmt(value)}</dd><p>{note}</p></div>;
}
function Gap({ n, of, label, act }: { n: number; of?: number; label: string; act: string }) {
  return (
    <div className="mb-gap">
      <b className="x-num">{of ? `${pct(n, of)}%` : fmt(n)}</b>
      <p><span>{of ? `${fmt(n)} of ${fmt(of)} ` : ""}{label}.</span> {act}</p>
      {of ? <span className="mb-gap-bar" aria-hidden><span style={{ width: `${pct(n, of)}%` }} /></span> : null}
    </div>
  );
}
