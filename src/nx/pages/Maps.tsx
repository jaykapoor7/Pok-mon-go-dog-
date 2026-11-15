"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { call, type Count, type Network, type Overview, type Place, type ProgrammeRef } from "@/oh/data";
import { oversees } from "@/oh/places";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { SURV_AREAS, WARDS } from "../fixtures";
import { useLive } from "../live";

/* Maps & Analysis: the programme's areas drawn from their stored outlines, coloured by one layer at a time, with
   the same numbers in a table beside them. Areas only: there are no points, so no one's location is shown.
   Counts under the programme's threshold stay "<5" and are hatched, never shaded as if known. */

type Geo = { type: string; coordinates: number[][][] };
type AreaV = { id: string; name: string; geo: Geo | null; exposures: Count; vaccinated: number | null; estimate: number | null; positive: boolean };
type Layer = "exposures" | "coverage" | "positives";
const LAYERS: { id: Layer; label: string }[] = [{ id: "exposures", label: "Bite exposures" }, { id: "coverage", label: "Vaccination" }, { id: "positives", label: "Lab positives" }];
const PERIODS = [{ d: 90, label: "90 days" }, { d: 365, label: "12 months" }];
const num = (c: Count) => (c === null ? "—" : typeof c === "number" ? c.toLocaleString("en-IN") : c);

/* A sample outline: hexagons in two rows, clearly schematic. */
const hex = (cx: number, cy: number, r = 0.0105): Geo => ({ type: "Polygon", coordinates: [[0, 1, 2, 3, 4, 5, 0].map((i) => [cx + r * Math.cos((Math.PI / 3) * i), cy + r * 0.86 * Math.sin((Math.PI / 3) * i)])] });
const SAMPLE_AREAS: AreaV[] = WARDS.slice(0, 6).map((w, i) => ({ id: w.ward, name: w.ward, geo: hex(77.55 + (i % 3) * 0.0235 + (Math.floor(i / 3) % 2) * 0.0118, 12.93 - Math.floor(i / 3) * 0.0205), exposures: SURV_AREAS.find((a) => a.area === w.ward)?.n ?? "<5", vaccinated: w.verified, estimate: w.estimate, positive: w.ward === "Ward 08" }));

function useProgramme() {
  const live = useLive();
  const [progs, setProgs] = useState<ProgrammeRef[] | null>(null);
  const on = live.ready && !!live.org;
  useEffect(() => {
    if (!on) return;
    let alive = true;
    call<Place[]>("oh_my_today").then((r) => { if (alive) setProgs([...new Map((Array.isArray(r.data) ? r.data : []).filter((p) => oversees(p.kind)).flatMap((p) => p.programmes).map((x) => [x.id, x])).values()]); });
    return () => { alive = false; };
  }, [on]);
  return { live, prog: progs?.[0] ?? null, loading: on && progs === null };
}

export function Maps() {
  const { live, prog, loading } = useProgramme();
  const [days, setDays] = useState(90);
  const [layer, setLayer] = useState<Layer>("exposures");
  const [sel, setSel] = useState<string | null>(null);
  const [o, setO] = useState<{ key: string; data: Overview | null; err: string | null } | null>(null);
  const [net, setNet] = useState<{ key: string; data: Network | null } | null>(null);
  const pid = prog?.id ?? null;
  useEffect(() => { if (!pid) return; let alive = true; call<Overview>("oh_programme_overview", { p_programme: pid, p_days: days }).then((r) => { if (alive) setO({ key: `${pid}:${days}`, data: r.data, err: r.error }); }); return () => { alive = false; }; }, [pid, days]);
  useEffect(() => { if (!pid) return; let alive = true; call<Network>("oh_programme_network", { p_programme: pid }).then((r) => { if (alive) setNet({ key: pid, data: r.data }); }); return () => { alive = false; }; }, [pid]);
  const sample = live.ready && !live.org;
  const ov = o?.key === `${pid}:${days}` ? o.data : null;
  const areas: AreaV[] = useMemo(() => {
    if (sample) return SAMPLE_AREAS;
    const n = net?.key === pid ? net.data : null;
    if (!n || !ov) return [];
    return n.areas.filter((a) => a.level !== "city").map((a) => {
      const v = ov.vaccination.find((x) => x.area_id === a.id || x.area === a.name);
      return { id: a.id, name: a.name, geo: (a.geometry as Geo | null) ?? null, exposures: ov.exposures?.by_area.find((x) => x.area === a.name)?.n ?? 0, vaccinated: v ? v.vaccinated : null, estimate: v?.estimate?.dogs ?? null, positive: ov.samples.positive_areas.includes(a.name) };
    });
  }, [sample, net, ov, pid]);

  if (!live.ready || loading) return <Shell ws="research" crumb={["Research", "Maps & Analysis"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (!sample && !prog) return <Shell ws="research" crumb={["Research", "Maps & Analysis"]}><div className="nx-page"><h1 className="nx-h1">Maps &amp; Analysis</h1><p className="nx-sub">Your account does not have access to a programme&apos;s aggregated data yet. Access is granted by the programme, not chosen here.</p></div></Shell>;

  const target = sample ? 0.7 : ov?.programme.target ?? 0.7;
  const maxExp = Math.max(5, ...areas.map((a) => (typeof a.exposures === "number" ? a.exposures : 0)));
  const cov = (a: AreaV) => (a.estimate && a.estimate > 0 && a.vaccinated !== null ? a.vaccinated / a.estimate : null);
  const fill = (a: AreaV): { f: string; o: number; hatch?: boolean } => {
    if (layer === "exposures") return a.exposures === "<5" ? { f: "url(#nx-hatch)", o: 1, hatch: true } : typeof a.exposures === "number" && a.exposures > 0 ? { f: "var(--accent)", o: 0.15 + 0.75 * (a.exposures / maxExp) } : { f: "var(--hover)", o: 1 };
    if (layer === "coverage") { const c = cov(a); return c === null ? { f: "url(#nx-hatch)", o: 1, hatch: true } : { f: c >= target ? "var(--ok)" : "var(--warn)", o: 0.25 + 0.65 * Math.min(1, c / target) }; }
    return a.positive ? { f: "var(--bad)", o: 0.7 } : { f: "var(--hover)", o: 1 };
  };
  const valueOf = (a: AreaV) => layer === "exposures" ? num(a.exposures) : layer === "coverage" ? (cov(a) === null ? "No estimate" : `${Math.round(cov(a)! * 100)}%`) : a.positive ? "Positive result" : "None";

  /* Project the outlines into the drawing: longitude scaled by the cosine of the mean latitude. */
  const pts = areas.flatMap((a) => a.geo?.coordinates[0] ?? []);
  const W = 600, H = 420, pad = 16;
  const [minX, maxX, minY, maxY] = pts.length ? [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))] : [0, 1, 0, 1];
  const k = Math.cos(((minY + maxY) / 2) * Math.PI / 180);
  const sx = (W - pad * 2) / Math.max(1e-9, (maxX - minX) * k), sy = (H - pad * 2) / Math.max(1e-9, maxY - minY), s = Math.min(sx, sy);
  const ox = (W - (maxX - minX) * k * s) / 2, oy = (H - (maxY - minY) * s) / 2;
  const P = (p: number[]) => [ox + (p[0] - minX) * k * s, oy + (maxY - p[1]) * s];
  const path = (g: Geo) => g.coordinates.map((ring) => ring.map((p, i) => `${i ? "L" : "M"}${P(p).map((v) => v.toFixed(1)).join(",")}`).join("") + "Z").join("");
  const centre = (g: Geo) => { const r = g.coordinates[0].slice(0, -1); const c = r.reduce((m, p) => [m[0] + p[0] / r.length, m[1] + p[1] / r.length], [0, 0]); return P(c); };

  const rows = [...areas].sort((a, b) => layer === "coverage" ? (cov(a) ?? 2) - (cov(b) ?? 2) : layer === "positives" ? Number(b.positive) - Number(a.positive) : (typeof b.exposures === "number" ? b.exposures : 2.5) - (typeof a.exposures === "number" ? a.exposures : 2.5));
  const suppressed = areas.filter((a) => a.exposures === "<5").length;
  return (
    <Shell ws="research" crumb={["Research", "Maps & Analysis"]}>
      <div className="nx-page" style={{ maxWidth: 1180 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{sample ? "East Zone rabies programme" : prog!.name}{sample ? <Sample /> : null}</p><h1 className="nx-h1">Maps &amp; Analysis</h1>
          <p className="nx-sub">{areas.length} areas, coloured by one layer at a time. Areas only, never points, so no one&apos;s location is shown.{sample ? " The sample outlines are schematic." : ""}</p></div></div>
        <div className="nx-bar nx-map-bar" style={{ borderBottom: 0, paddingBottom: 0 }}>
          <div className="nx-views" role="tablist" aria-label="Layer">{LAYERS.map((l) => <button key={l.id} type="button" role="tab" aria-selected={layer === l.id} className={`nx-view ${layer === l.id ? "is-on" : ""}`} onClick={() => setLayer(l.id)}>{layer === l.id ? <span className="nx-view-bg" /> : null}<span>{l.label}</span></button>)}</div>
          {layer !== "coverage" ? <div className="nx-views" role="tablist" aria-label="Period" style={{ marginLeft: "auto" }}>{PERIODS.map((p) => <button key={p.d} type="button" role="tab" aria-selected={days === p.d} className={`nx-view ${days === p.d ? "is-on" : ""}`} onClick={() => setDays(p.d)}>{days === p.d ? <span className="nx-view-bg" /> : null}<span>{p.label}</span></button>)}</div> : null}
        </div>
        {o?.err ? <p className="nx-foot" role="alert">{o.err}</p> : null}
        <div className="nx-map-wrap">
          <figure className="nx-map">
            <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Map of ${areas.length} areas: ${LAYERS.find((l) => l.id === layer)!.label}`}>
              <defs><pattern id="nx-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--hover)" /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-2)" strokeWidth="2" /></pattern></defs>
              {areas.map((a) => { if (!a.geo) return null; const f = fill(a); const [cx, cy] = centre(a.geo); return (
                <g key={a.id} className={`nx-area ${sel === a.id ? "is-on" : sel ? "is-dim" : ""}`} role="button" tabIndex={0} aria-pressed={sel === a.id} aria-label={`${a.name}: ${valueOf(a)}`} onClick={() => setSel(sel === a.id ? null : a.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === a.id ? null : a.id); } }}>
                  <path d={path(a.geo)} fill={f.f} fillOpacity={f.o} />
                  <text x={cx} y={cy - 2} textAnchor="middle" className="n">{a.name.length > 13 ? `${a.name.slice(0, 12)}…` : a.name}</text>
                  <text x={cx} y={cy + 11} textAnchor="middle" className="v">{valueOf(a)}</text>
                </g>); })}
            </svg>
            <figcaption className="nx-legend" style={{ marginTop: 8 }}>
              {layer === "exposures" ? <><span><i style={{ background: "var(--accent)", opacity: .3 }} />Fewer</span><span><i style={{ background: "var(--accent)" }} />More</span><span><i className="is-h" />Under 5, not shown</span></> : layer === "coverage" ? <><span><i style={{ background: "var(--ok)" }} />At or above {Math.round(target * 100)}%</span><span><i style={{ background: "var(--warn)" }} />Below</span><span><i className="is-h" />No dated estimate</span></> : <><span><i style={{ background: "var(--bad)", opacity: .7 }} />Positive result in the period</span></>}
            </figcaption>
          </figure>
          <div className="nx-table nx-map-t" role="table" aria-label="Areas">
            <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: "minmax(0, 1fr) 110px" }}><span>Area</span><span>{LAYERS.find((l) => l.id === layer)!.label}</span></div>
            {rows.map((a) => <button key={a.id} type="button" role="row" className={`nx-tr ${sel === a.id ? "is-sel" : ""}`} style={{ gridTemplateColumns: "minmax(0, 1fr) 110px" }} onClick={() => setSel(sel === a.id ? null : a.id)}><span className="nx-cell-main"><span><b>{a.name}</b>{layer === "coverage" && a.estimate ? <small>{a.vaccinated} of an estimated {a.estimate} dogs</small> : null}</span></span><span className="num">{valueOf(a)}</span></button>)}
            {!areas.length ? <p className="nx-sub" style={{ padding: "18px 0" }}>Reading areas…</p> : null}
          </div>
        </div>
        <p className="nx-note" style={{ marginTop: 18, maxWidth: 760 }}><Info size={13} /><span>{layer === "exposures" ? `${suppressed} ${suppressed === 1 ? "area has" : "areas have"} fewer than 5 exposures in the period; those are hatched and never shaded as if known. ` : layer === "coverage" ? "Coverage is vaccinated dogs recorded on StrayPaw divided by the area's dated estimate; dogs vaccinated elsewhere are not counted. " : "Positive means at least one laboratory-confirmed result from that area in the period. "}These are descriptive counts. They do not show cause, and a difference between areas can come from how much is reported.</span></p>
        {!sample && prog?.illustrative ? <p className="nx-foot"><Chip tone="warn">Illustrative</Chip> This programme&apos;s figures and outlines are invented for demonstration.</p> : null}
      </div>
    </Shell>
  );
}
