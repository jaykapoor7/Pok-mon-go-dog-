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
import { ArrowUpRight } from "lucide-react";
import { Dashboard, Feed, ItemList, MapChips, Panel, type Item } from "@/components/dash/Dashboard";
import { LiveMap, type MapTone } from "@/components/dash/LiveMap";
import { CellCard } from "@/components/dash/CellCard";
import { CityOperations } from "./CityOperations";
import { useSpatialDataset, pointInCell, ringOf } from "@/components/spatial/data";
import type { Light } from "@/components/system/LightsMap";
import { cityEvidence, kindOf, KIND_META } from "@/components/spatial/AtlasRegister";
import { A, A_STRIDE, AF, C, C_STRIDE, K, K_STRIDE } from "@/lib/spatial/types";
import { monthLabel, monthOfDay, openNow } from "@/lib/spatial/engine";


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

  const [measure, setMeasure] = useState<"animals" | "open_cases" | "sterilised" | "vaccinated" | "care_events">(row && !row.cases ? "vaccinated" : "animals");
  const [sel, setSel] = useState<string | null>(null);
  const names = useMemo(() => { const m = new Map<string, string>(); ds?.cells.forEach((c, i) => { const l = ds.cellLocality[i]; if (l >= 0) m.set(c, ds.localities[l]); }); return m; }, [ds]);
  const tone: MapTone = measure === "open_cases" ? "flame" : measure === "animals" ? "blue" : "teal";
  const mapCells = (cellTotals ?? []).map((c) => ({ h3: c.h3_r8, value: (c[measure] as number | undefined) ?? 0, label: names.get(c.h3_r8) ?? null }));
  const selCell = sel ? cellTotals?.find((c) => c.h3_r8 === sel) : null;
  const [focus, setFocus] = useState<string | null>(null);
  const vp = useMemo(() => (city && !oneLocation ? { city: city } : null), [city, oneLocation]);
  const MEAS: Record<typeof measure, string> = { animals: "recorded animals", open_cases: "open requests", sterilised: "sterilisation records", vaccinated: "vaccination records", care_events: "care events" };
  const hotspots: Item[] = (topLoc ?? []).map((l) => ({ key: l.name, href: `/map?city=${encodeURIComponent(city ?? "")}&q=${encodeURIComponent(l.name)}`, title: l.name, meta: `${fmt(l.animals)} profiles · ${fmt(l.cases)} requests`, tag: useOpen ? { text: `${fmt(l.open)} open`, tone: "hot" } : { text: `${fmt(locMeasure(l))}`, tone: "quiet" } }));
  const notes: Item[] = detail ? [
    { key: "ster", title: `${pct(detail.sterUnknown, detail.nA)}% without a sterilisation status`, meta: `${fmt(detail.sterUnknown)} of ${fmt(detail.nA)} loaded profiles. Unknown, not “no”`, tag: { text: "", tone: "quiet" } },
    { key: "vacc", title: `${pct(detail.vaccUnknown, detail.nA)}% without a vaccination status`, meta: "Campaign and NGO care registers usually settle these", tag: { text: "", tone: "quiet" } },
    { key: "prec", title: `${pct(detail.nA - detail.exact, detail.nA)}% located to a locality or city`, meta: "Precision limits street-level planning; cells stay the unit", tag: { text: "", tone: "open" } },
    { key: "edge", title: `${fmt(detail.frontier)} unreported cells at the record's edge`, meta: "Empty next to recorded activity: a gap, not an absence", tag: { text: "", tone: "open" } },
  ] : [];

  return (
    <Dashboard art="city"
      eyebrow={ev && kind ? <><i className="db-kind" style={{ background: KIND_META[kind].color }} aria-hidden /> {ev.label} · {ev.precision}{row?.latest_seen ? ` · latest record ${new Date(row.latest_seen).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}</> : "City brief"}
      title={<>City brief · <em>{city ?? params.get("city") ?? "…"}</em></>}
      subtitle={error ? "The city record could not be read just now. Nothing has changed; try again shortly." : ev?.note}
      controls={<label className="db-select"><span className="sys-sr">City</span><select value={city ?? ""} onChange={(e) => pick(e.target.value)} disabled={!cities.length}>{[...cities].sort((x, y) => x.city.localeCompare(y.city)).map((c) => <option key={c.city} value={c.city}>{c.city}{c.state ? `, ${c.state}` : ""}</option>)}</select></label>}
      actions={<Link className="x-btn" href={`/insights?city=${encodeURIComponent(city ?? "")}`}>Analysis</Link>}
      kpis={[
        { label: "Animal profiles", value: row?.animals, note: "Records, not a population" },
        { label: "Case records", value: row?.cases, note: row?.cases ? `${fmt(row.open_cases)} open now` : "None held for this city", tone: "blue" },
        { label: "Sterilisation recorded", value: row?.sterilised, tone: "care", note: row?.animals ? `${pct(row.sterilised ?? 0, row.animals)}% of profiles` : "" },
        { label: "Vaccination recorded", value: row?.vaccinated, tone: "care", note: row?.animals ? `${pct(row.vaccinated ?? 0, row.animals)}% of profiles` : "" },
        { label: "Cells with records", value: row?.cells, note: oneLocation ? "One shared city location" : "≈0.7 km² each · not wards" },
      ]}
      map={<LiveMap pin={selCell ? <CellCard h3={selCell.h3_r8} title={names.get(selCell.h3_r8) ?? "This area"} facts={`${fmt(selCell.animals)} profiles · ${fmt(selCell.cases)} requests (${fmt(selCell.open_cases)} open) · ${fmt(selCell.sterilised)} sterilised · ${fmt(selCell.vaccinated)} vaccinated`} href={`/map?city=${encodeURIComponent(city ?? "")}&cell=${selCell.h3_r8}`} linkLabel="Open this area's records" focus={focus} onClose={() => { setSel(null); setFocus(null); }} /> : null} cells={oneLocation ? [] : mapCells} tone={tone} metric={MEAS[measure]} label={`${city}: ${MEAS[measure]} by cell`} viewport={vp} dotFocus={measure === "open_cases" ? "hot" : "all"} selected={sel} onCell={(h, id) => { setSel(h); setFocus(id ?? null); }} emptyNote={oneLocation ? `Every ${city} record shares one city location, so no street geography exists.` : loading ? "Reading the city…" : `No ${MEAS[measure]} recorded here.`}>
        <MapChips value={measure} options={[{ id: "animals", label: "Animals" }, { id: "open_cases", label: "Open requests" }, { id: "sterilised", label: "Sterilised" }, { id: "vaccinated", label: "Vaccinated" }, { id: "care_events", label: "Care" }]} onChange={setMeasure} label="Map measure" />
        <Link href={`/map?city=${encodeURIComponent(city ?? "")}&mode=coverage`} className="db-maplink">Open in map <ArrowUpRight size={14} aria-hidden /></Link>
      </LiveMap>}
      side={<>
        <Panel title={`Hotspots by ${locLabel}`} action={{ label: "Map", href: `/map?city=${encodeURIComponent(city ?? "")}` }}>
          <ItemList items={hotspots} loading={!topLoc && !oneLocation} empty={oneLocation ? "No locality pattern can be read from a single city location." : "No named localities are recorded for this city."} />
        </Panel>
        <Panel title="Where the record is thin">
          <Feed items={notes} loading={!detail} empty="Reading the loaded detail…" />
        </Panel>
      </>}
    >
      <CityOperations city={city ?? null} />
      <div className="db-row3">
        <Panel title="When work was recorded">
          {detail && detail.series.length > 1 ? (
            <figure className="db-chart">
              <div className="db-cols" role="img" aria-label={`Monthly requests and care events in ${city}`}>
                {detail.series.map((x) => <span key={x.m} title={`${monthLabel(x.m)}: ${x.cases} requests, ${x.care} care events`}><i className="is-care" style={{ height: `${(x.care / maxSeries) * 100}%` }} /><i className="is-case" style={{ height: `${(x.cases / maxSeries) * 100}%` }} /></span>)}
              </div>
              <figcaption><span><i className="is-case" /> requests</span><span><i className="is-care" /> care</span><span>{monthLabel(detail.series[0].m)} – {monthLabel(detail.series[detail.series.length - 1].m)} · loaded detail</span></figcaption>
            </figure>
          ) : <p className="db-empty">{detail ? "Too few dated records to show change over time." : "Reading…"}</p>}
        </Panel>
        <Panel title="What requests are about" count={detail?.nC}>
          {detail && detail.conditions.length ? <ItemList items={detail.conditions.map((c) => ({ key: c.name, title: c.name, tag: c.open ? { text: `${fmt(c.open)} open`, tone: "hot" } : undefined, right: fmt(c.n) }))} empty="" /> : <p className="db-empty">{detail ? "No request records are loaded for this city." : "Reading…"}</p>}
        </Panel>
        <Panel title="What this brief cannot tell you">
          <ul className="db-steps"><li>How many dogs live here: official estimates are separate, dated sources.</li><li>Programme coverage: it needs a population denominator.</li><li>Ward statistics: no city has matching ward boundaries and records.</li><li>Where to allocate resources: that needs cost and capacity evidence.</li></ul>
        </Panel>
      </div>
      <Panel title="Every city register" count={cities.length}>
        <div className="db-table" role="region" aria-label="City registers" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">City</th><th scope="col">Evidence</th>
              {([["animals", "Profiles"], ["cases", "Requests"], ["open_cases", "Open"], ["care_events", "Care"], ["cells", "Cells"]] as [SortKey, string][]).map(([k, l]) => <th key={k} scope="col" aria-sort={sort === k ? "descending" : "none"}><button type="button" onClick={() => setSort(k)}>{l}{sort === k ? " ↓" : ""}</button></th>)}
              <th scope="col">Latest</th></tr></thead>
            <tbody>
              {(allCities ? sortedCities : sortedCities.slice(0, 10)).map((c) => { const k = kindOf(c.city, c.cells); return (
                <tr key={c.city} className={c.city === city ? "is-on" : ""}>
                  <th scope="row"><button type="button" onClick={() => pick(c.city)}>{c.city}</button></th>
                  <td><span className="db-k"><i style={{ background: KIND_META[k].color }} aria-hidden />{KIND_META[k].label}</span></td>
                  <td>{fmt(c.animals)}</td><td>{fmt(c.cases)}</td><td>{fmt(c.open_cases)}</td><td>{fmt(c.care_events)}</td><td>{c.cells <= 1 ? "one location" : fmt(c.cells)}</td>
                  <td>{c.latest_seen ? new Date(c.latest_seen).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
        {sortedCities.length > 10 && <button type="button" className="x-btn db-tbl-more" onClick={() => setAllCities((v) => !v)} aria-expanded={allCities}>{allCities ? "Show fewer" : `Show all ${sortedCities.length}`}</button>}
      </Panel>
    </Dashboard>
  );
}

