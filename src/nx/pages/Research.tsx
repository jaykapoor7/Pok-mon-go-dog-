"use client";

import { DataRequests } from "./DataRequests";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, Lock, X } from "lucide-react";
import { call, type Count, type Place, type ProgrammeRef } from "@/oh/data";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { useLive } from "../live";

/* Research works on governed, aggregated data. The only dataset here is the one the programme already publishes to
   analysts: bite exposures by week, area, animal and category, with small counts suppressed by the database. A suppressed
   cell is never added into a total. Access to anything else is requested and approved by its steward. */

type Row = { week: string; area: string; species: string; category: string; exposures: Count };
type Extract = { since: string; suppress_below: number; rows: Row[] };
type Dataset = { id: string; name: string; programme: string; illustrative: boolean; extract: Extract | null; error: string | null };

/* Sample rows, invented and generated the same way every time. */
function sampleExtract(): Extract {
  const areas = ["HSR Layout", "Koramangala", "Jayanagar", "Whitefield", "Malleshwaram"], sp = ["Dog", "Cat"], cats = ["II", "III"];
  const rows: Row[] = []; let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const start = new Date(); start.setDate(start.getDate() - 7 * 12);
  for (let w = 0; w < 12; w++) { const d = new Date(start); d.setDate(d.getDate() + 7 * w); const week = d.toISOString().slice(0, 10);
    for (const a of areas) for (const s of sp) for (const c of cats) { if (s === "Cat" && rnd() < .6) continue; const n = Math.round(rnd() * (s === "Dog" ? 14 : 4) + (w > 7 && a === "HSR Layout" ? 6 : 0)); if (!n) continue; rows.push({ week, area: a, species: s, category: c, exposures: n < 5 ? "<5" : n }); } }
  return { since: start.toISOString().slice(0, 10), suppress_below: 5, rows };
}
const SAMPLE: Dataset[] = [{ id: "sample", name: "Bite exposures by week, area, animal and category", programme: "Bengaluru Rabies Elimination · Illustrative", illustrative: true, extract: sampleExtract(), error: null }];
const known = (c: Count) => (typeof c === "number" ? c : 0);
const fmt = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) }); };

function useDatasets(): { sets: Dataset[] | null; sample: boolean; ready: boolean; org: string | null } {
  const live = useLive();
  const org = live.orgFor("research");
  const [sets, setSets] = useState<Dataset[] | null>(null);
  useEffect(() => {
    if (!org) return;
    let alive = true;
    call<Place[]>("oh_my_today").then(async (r) => {
      const progs: ProgrammeRef[] = r.data?.find((p) => p.organisation_id === org.org_id)?.programmes ?? [];
      const out = await Promise.all(progs.map(async (p) => { const x = await call<Extract>("oh_research_extract", { p_programme: p.id, p_days: 365 }); return { id: p.id, name: "Bite exposures by week, area, animal and category", programme: p.name, illustrative: p.illustrative, extract: x.data, error: x.error }; }));
      if (alive) setSets(out);
    });
    return () => { alive = false; };
  }, [org]);
  if (!live.ready) return { sets: null, sample: false, ready: false, org: null };
  if (!live.org) return { sets: SAMPLE, sample: true, ready: true, org: null };
  return { sets: org ? sets : [], sample: false, ready: true, org: org?.name ?? null };
}

const notResearch = <div className="nx-page"><h1 className="nx-h1">Research</h1><p className="nx-sub">Your account is not part of a research organisation in any programme. Researchers request access from the programme that holds the data; it is not granted by choosing a menu.</p></div>;

export function Datasets() {
  const { sets, sample, ready, org } = useDatasets();
  const live = useLive();
  if (!ready) return <Shell ws="research" crumb={["Research", "Datasets"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (!sample && !live.orgFor("research")) return <Shell ws="research" crumb={["Research", "Datasets"]}>{notResearch}</Shell>;
  return (
    <Shell ws="research" crumb={["Research", "Datasets"]}>
      <div className="nx-page">
        <div className="nx-head"><div><p className="nx-eyebrow">{sample ? "Programme Epidemiology Unit" : org}{sample ? <Sample /> : null}</p><h1 className="nx-h1">Datasets</h1><p className="nx-sub">{sets === null ? "Reading what you may analyse…" : <><b className="num">{sets.length}</b> {sets.length === 1 ? "dataset" : "datasets"} approved for you. Aggregated only; no record identifies a person.</>}</p></div></div>
        <div className="nx-table" style={{ marginTop: 18 }}>
          <div className="nx-tr nx-th" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr) 120px 150px 110px" }}><span>Dataset</span><span className="nx-hide-s">Programme</span><span className="nx-hide-s">Since</span><span className="nx-hide-s">Rows</span><span /></div>
          {(sets ?? []).map((s) => (
            <div key={s.id} className="nx-tr" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr) 120px 150px 110px" }}>
              <span className="nx-cell-main"><span><b>{s.name}</b><small>{s.extract ? `Counts below ${s.extract.suppress_below} are suppressed` : s.error ?? "Not readable"}<span className="nx-only-s"> · {s.programme}</span></small></span></span>
              <span className="nx-t2 nx-hide-s">{s.programme}{s.illustrative ? <> <Chip bare>Illustrative</Chip></> : null}</span>
              <span className="nx-t3 nx-hide-s">{s.extract ? fmt(s.extract.since) : "—"}</span>
              <span className="num nx-hide-s">{s.extract ? s.extract.rows.length.toLocaleString("en-IN") : "—"}</span>
              <span>{s.extract ? <Link href={`/research/explore?d=${s.id}`} className="nx-btn is-quiet is-sm">Explore <ArrowRight size={12} /></Link> : null}</span>
            </div>
          ))}
          {sets && !sets.length ? <p className="nx-sub" style={{ padding: "20px 0" }}><b style={{ color: "var(--ink)" }}>No datasets are approved for this organisation yet.</b></p> : null}
        </div>
        {!sample && live.orgFor("research") ? <div style={{ marginTop: 28 }}><DataRequests org={live.orgFor("research")!} /></div> : null}
        <p className="nx-note" style={{ marginTop: 18, maxWidth: 720 }}><Lock size={13} /><span>Patient-level records never leave the treating facility. To use another programme&apos;s data, its steward approves a request; access is versioned and can be withdrawn.</span></p>
      </div>
    </Shell>
  );
}

export function Explore() {
  const { sets, sample, ready } = useDatasets();
  const live = useLive();
  const [pick, setPick] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [species, setSpecies] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => { try { setPick(new URLSearchParams(window.location.search).get("d")); } catch {} }, []);
  const ds = sets?.find((s) => s.id === pick && s.extract) ?? sets?.find((s) => s.extract) ?? null;
  const x = ds?.extract ?? null;
  const rows = useMemo(() => (x ? x.rows.filter((r) => (!area || r.area === area) && (!species || r.species === species) && (!cat || r.category === cat)) : []), [x, area, species, cat]);
  const weeks = useMemo(() => [...new Set((x?.rows ?? []).map((r) => r.week))].sort(), [x]);
  const series = useMemo(() => weeks.map((w) => { const rs = rows.filter((r) => r.week === w); return { w, n: rs.reduce((a, r) => a + known(r.exposures), 0), hidden: rs.filter((r) => r.exposures === "<5").length }; }), [weeks, rows]);
  const byArea = useMemo(() => { const m = new Map<string, { n: number; hidden: number }>(); for (const r of rows) { const e = m.get(r.area) ?? { n: 0, hidden: 0 }; e.n += known(r.exposures); if (r.exposures === "<5") e.hidden++; m.set(r.area, e); } return [...m].sort((a, b) => b[1].n - a[1].n); }, [rows]);
  if (!ready) return <Shell ws="research" crumb={["Research", "Explore"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (!sample && !live.orgFor("research")) return <Shell ws="research" crumb={["Research", "Explore"]}>{notResearch}</Shell>;
  if (!x || !ds) return <Shell ws="research" crumb={["Research", "Explore"]}><div className="nx-page"><h1 className="nx-h1">Explore</h1><p className="nx-sub">{sets === null ? "Reading the dataset…" : "No dataset is approved for you yet."}</p></div></Shell>;
  const opts = (k: "area" | "species" | "category") => [...new Set(x.rows.map((r) => r[k]))].sort();
  const total = series.reduce((a, s) => a + s.n, 0), hidden = rows.filter((r) => r.exposures === "<5").length;
  const W = 640, H = 190, P = 24, max = Math.max(1, ...series.map((s) => s.n)) * 1.15;
  const px = (i: number) => P + (i * (W - P * 2)) / Math.max(1, series.length - 1), py = (n: number) => H - P - (n * (H - P * 2)) / max;
  const path = series.map((s, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(s.n).toFixed(1)}`).join(" ");
  const at = hover ?? series.length - 1;
  const csv = () => {
    const lines = [["week", "area", "species", "category", "exposures"].join(","), ...rows.map((r) => [r.week, `"${r.area.replace(/"/g, '""')}"`, r.species, r.category, r.exposures === "<5" ? `<${x.suppress_below}` : String(r.exposures ?? "")].join(","))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = "exposures-by-week.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  const Filter = ({ label, value, set, k }: { label: string; value: string | null; set: (v: string | null) => void; k: "area" | "species" | "category" }) => (
    <label className={`nx-filter ${value ? "is-on" : ""}`} style={{ position: "relative" }}>{value ?? `Any ${label}`}{value ? <X size={12} onClick={(e) => { e.preventDefault(); set(null); }} /> : null}
      <select value={value ?? ""} onChange={(e) => set(e.target.value || null)} aria-label={label} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}><option value="">Any {label}</option>{opts(k).map((o) => <option key={o} value={o}>{o}</option>)}</select>
    </label>
  );
  return (
    <Shell ws="research" crumb={["Research", "Explore"]}>
      <div className="nx-page">
        <div className="nx-head"><div><p className="nx-eyebrow">{ds.programme}{sample ? <Sample /> : null}</p><h1 className="nx-h1">Explore</h1><p className="nx-sub">{ds.name}, since {fmt(x.since)}. Counts below {x.suppress_below} are suppressed and never added into a total.</p></div><button type="button" className="nx-btn is-quiet" onClick={csv} disabled={!rows.length}><Download size={13} />Download CSV</button></div>
        <div className="nx-bar"><Filter label="area" value={area} set={setArea} k="area" /><Filter label="animal" value={species} set={setSpecies} k="species" /><Filter label="category" value={cat} set={setCat} k="category" /></div>
        <div className="nx-figs" style={{ marginTop: 0, borderTop: 0 }}>
          <div className="nx-fig"><b>{total.toLocaleString("en-IN")}</b><span>Exposures in shown cells</span></div>
          <div className="nx-fig"><b>{hidden}</b><span>Cells suppressed (fewer than {x.suppress_below})</span></div>
          <div className="nx-fig"><b>{weeks.length}</b><span>Weeks</span></div>
          <div className="nx-fig"><b>{byArea.length}</b><span>Areas</span></div>
        </div>
        <div className="nx-two">
          <section aria-labelledby="r-w"><div className="nx-sec-h"><h2 id="r-w">Exposures per week</h2></div>
            <p className="nx-readout"><span>Week of {series[at] ? fmt(series[at].w) : "—"}</span><span><b>{series[at]?.n ?? 0}</b> in shown cells</span>{series[at]?.hidden ? <span>{series[at].hidden} suppressed</span> : null}</p>
            {total === 0 && hidden > 0 ? <p className="nx-note" style={{ marginTop: 12 }}><Lock size={13} /><span>Every cell in this view has fewer than {x.suppress_below} exposures, so none can be shown at this level of detail. This protects people in small areas; the cells are not estimated or added up.</span></p> : <svg className="nx-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Exposures per week in cells that are not suppressed" onMouseLeave={() => setHover(null)}>
              {[0, .5, 1].map((t) => <g key={t}><line className="g" x1={P} x2={W - P} y1={py(max * t * .87)} y2={py(max * t * .87)} /><text x={0} y={py(max * t * .87) + 3}>{Math.round(max * t * .87)}</text></g>)}
              {series.length ? <><path className="a" d={`${path} L${px(series.length - 1)} ${H - P} L${px(0)} ${H - P} Z`} /><path className="v" d={path} /></> : null}
              {hover !== null && series[hover] ? <><line className="cur" x1={px(hover)} x2={px(hover)} y1={P - 8} y2={H - P} /><circle cx={px(hover)} cy={py(series[hover].n)} r={3.5} /></> : null}
              {series.map((_, i) => <rect key={i} className="hit" x={px(i) - (W - P * 2) / series.length / 2} y={0} width={(W - P * 2) / series.length} height={H} onMouseEnter={() => setHover(i)} />)}
            </svg>}
          </section>
          <section aria-labelledby="r-a"><div className="nx-sec-h"><h2 id="r-a">By area</h2></div>
            <div className="nx-bars">{byArea.map(([a, v]) => <button key={a} type="button" style={{ gridTemplateColumns: "112px minmax(0, 1fr) 104px" }} className={`nx-barrow ${area === a ? "is-on" : area ? "is-dim" : ""}`} aria-pressed={area === a} onClick={() => setArea(area === a ? null : a)}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a}</span><span className="nx-bar-t"><span style={{ width: `${(v.n / Math.max(1, byArea[0][1].n)) * 100}%` }} /></span><em>{v.n}{v.hidden ? ` +${v.hidden} supp.` : ""}</em></button>)}</div>
            <p className="nx-foot">Totals add only the cells that are shown. A suppressed cell holds between 1 and {x.suppress_below - 1}; it is counted separately, not estimated.</p>
          </section>
        </div>
        <p className="nx-note" style={{ marginTop: 24, maxWidth: 720 }}><Lock size={13} /><span>These are descriptive counts. They do not show cause, and a rise in one area may reflect more reporting rather than more bites.</span></p>
      </div>
    </Shell>
  );
}
