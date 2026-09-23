"use client";

/* Ward coverage. The city printed as cells, one measure at a time, beside
   the table of its localities. The three measures are the questions a
   ward officer asks: is anyone working here (months with field records in
   the last twelve), is sterilisation recorded (share of recorded animals,
   the unrecorded share hatched rather than counted as zero), and is the
   response where the need is (animals needing help against recent work).
   Selecting a cell selects its locality; selecting a locality lights its
   cells. */

import { useMemo, useState } from "react";
import { projector, type Box } from "../geo";

export type CovCell = { key: string; ring: [number, number][]; loc: string; animals: number; ster: number; help: number; months: number; recent: number; gap: boolean };
export type CovLoc = { name: string; cells: number; animals: number; ster: number; help: number; months: number; series: number[]; last: string; gapCells: number };
type Measure = "presence" | "abc" | "need";

const PRES = ["#e6ddcf", "#c8d4f0", "#93aee9", "#5b82dc", "#2457ce", "#16398f"];
const fmt = (n: number) => n.toLocaleString("en-IN");

export function CoverageMap({ cells, locs, box }: { cells: CovCell[]; locs: CovLoc[]; box: Box }) {
  const [m, setM] = useState<Measure>("presence");
  const [sel, setSel] = useState<string | null>(null);
  const [sort, setSort] = useState<"animals" | "months" | "abc" | "help">("animals");
  const W = 760, H = 700;
  const { p, kmPx } = useMemo(() => projector(box, W, H, 10), [box]);
  const pts = useMemo(() => cells.map((c) => c.ring.map(([x, y]) => p(x, y).map((v) => v.toFixed(1)).join(",")).join(" ")), [cells, p]);

  const fill = (c: CovCell) => {
    if (m === "presence") return c.animals === 0 && c.months === 0 ? "#efe8dc" : PRES[Math.min(5, Math.ceil(c.months / 2.4))];
    if (m === "abc") return c.animals === 0 ? "#efe8dc" : c.ster === 0 ? "url(#hx)" : PRES[Math.min(5, 2 + Math.ceil((c.ster / c.animals) * 6))];
    if (c.help > 0 && c.recent === 0) return "#f05b40";
    if (c.help > 0) return "#f7b3a4";
    return c.recent > 0 ? "#c8d4f0" : "#efe8dc";
  };
  const sorted = [...locs].sort((a, b) => sort === "animals" ? b.animals - a.animals : sort === "months" ? a.months - b.months : sort === "abc" ? a.ster / Math.max(1, a.animals) - b.ster / Math.max(1, b.animals) : b.help - a.help).slice(0, 18);
  const S = sel ? locs.find((l) => l.name === sel) : null;
  const lines = {
    presence: "Months with any field record, Oct 2025 – Sep 2026. Paper: nothing recorded.",
    abc: "Share of recorded animals with sterilisation recorded. Hatched: animals present, none recorded as sterilised — not recorded, not zero.",
    need: "Flame: animals needing help and no field work in 90 days. Pink: need with recent work. Blue: recent work, no need recorded.",
  };
  return (
    <div className="sx-cov">
      <div className="sx-cov-map">
        <div className="sx-cov-tools">
          <div className="sx-seg" role="group" aria-label="Measure">
            <button type="button" aria-pressed={m === "presence"} onClick={() => setM("presence")}>Field presence</button>
            <button type="button" aria-pressed={m === "abc"} onClick={() => setM("abc")}>ABC recorded</button>
            <button type="button" aria-pressed={m === "need"} onClick={() => setM("need")}>Need vs response</button>
          </div>
          <p>{lines[m]}</p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cells of the sample city">
          <defs><pattern id="hx" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#efe8dc" /><path d="M0 0V6" stroke="rgba(11,30,61,.45)" strokeWidth="1.4" /></pattern></defs>
          {cells.map((c, i) => (
            <polygon key={c.key} points={pts[i]} fill={fill(c)} stroke={sel && c.loc === sel ? "#0b1e3d" : "#faf7f1"} strokeWidth={sel && c.loc === sel ? 2 : 1}
              opacity={sel && c.loc !== sel ? 0.45 : 1} onClick={() => setSel(c.loc === sel ? null : c.loc)} style={{ cursor: "pointer" }}>
              <title>{`${c.loc}: ${c.animals} animals, ${c.months} of 12 months with work`}</title>
            </polygon>
          ))}
          <g transform={`translate(14 ${H - 18})`}><path d={`M0 0H${kmPx * 5}M0 -5V5M${kmPx * 5} -5V5`} stroke="#0b1e3d" strokeWidth="1.5" /><text x={kmPx * 5 + 8} y="4" className="sc">5 km</text></g>
        </svg>
        <div className="sx-key">
          {m === "presence" && ["0", "1–2", "3–4", "5–7", "8–9", "10–12"].map((l, i) => <span key={l}><i style={{ background: PRES[i] }} />{l}</span>)}
          {m === "presence" && <span>months of 12</span>}
          {m === "abc" && <><span><i className="hatch" style={{ outline: "1px solid rgba(11,30,61,.3)" }} />none recorded</span>{[3, 4, 5].map((i) => <span key={i}><i style={{ background: PRES[i] }} />{["up to a third", "up to two thirds", "more"][i - 3]}</span>)}</>}
          {m === "need" && <><span><i style={{ background: "#f05b40" }} />need, no work in 90 days</span><span><i style={{ background: "#f7b3a4" }} />need, work recent</span><span><i style={{ background: "#c8d4f0" }} />work, no need</span></>}
        </div>
      </div>

      <div className="sx-cov-side">
        {S ? (
          <div className="sx-cov-sel">
            <button type="button" className="sx-btn quiet" onClick={() => setSel(null)}>← All localities</button>
            <span className="lbl">Locality · {S.cells} cells</span>
            <h2>{S.name}</h2>
            <dl>
              <div><dt>Animals recorded</dt><dd className="m">{fmt(S.animals)}</dd></div>
              <div><dt>Needing help</dt><dd className={`m${S.help ? " need" : ""}`}>{S.help}</dd></div>
              <div><dt>Sterilisation recorded</dt><dd className="m">{S.ster} <span className="dim">of {S.animals}</span></dd></div>
              <div><dt>Months with work, of 12</dt><dd className="m">{S.months}</dd></div>
              <div><dt>Last field record</dt><dd className="m">{S.last}</dd></div>
              <div><dt>Gap cells</dt><dd className={`m${S.gapCells ? " need" : ""}`}>{S.gapCells}</dd></div>
            </dl>
            <span className="lbl">Field records per month, Jan 2024 – Sep 2026</span>
            <svg viewBox="0 0 330 70" width="100%" aria-hidden>{S.series.map((v, i) => { const h = (v / Math.max(1, ...S.series)) * 60; return <rect key={i} x={i * 10} y={64 - h} width="7" height={Math.max(h, 1)} fill={v ? "#2457ce" : "rgba(11,30,61,.15)"} />; })}</svg>
          </div>
        ) : (
          <>
            <div className="sx-cov-th">
              <span className="lbl">Localities · sort by</span>
              <div className="sx-seg" role="group" aria-label="Sort">
                {([["animals", "Animals"], ["months", "Least presence"], ["abc", "Lowest ABC"], ["help", "Need"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>)}
              </div>
            </div>
            <table className="sx-cov-table">
              <thead><tr><th>Locality</th><th>Animals</th><th>Need</th><th>ABC</th><th>Presence</th><th>2024 → 2026</th></tr></thead>
              <tbody>
                {sorted.map((l) => (
                  <tr key={l.name} onClick={() => setSel(l.name)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setSel(l.name); }}>
                    <td><b>{l.name}</b>{l.gapCells > 0 && <span className="gapt">{l.gapCells} gap</span>}</td>
                    <td className="m">{l.animals}</td>
                    <td className={`m${l.help ? " need" : " dim"}`}>{l.help}</td>
                    <td><span className="abc"><i style={{ width: `${(l.ster / Math.max(1, l.animals)) * 100}%` }} /></span></td>
                    <td><span className="months">{Array.from({ length: 12 }, (_, i) => <i key={i} className={i < l.months ? "on" : ""} />)}</span></td>
                    <td><svg width="90" height="20" aria-hidden>{l.series.map((v, i) => { const h = (v / Math.max(1, ...l.series)) * 18; return <rect key={i} x={i * 2.7} y={20 - h} width="2" height={Math.max(h, 0.6)} fill={v ? "#2457ce" : "rgba(11,30,61,.2)"} />; })}</svg></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
