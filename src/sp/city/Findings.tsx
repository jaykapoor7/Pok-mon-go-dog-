"use client";

/* Renders municipal findings in two registers: the working Insights page
   (claims beside their evidence, method one tap away) and the printed
   City report (the same claims, method written out). One source, so the
   publication can never say more than the working view. */

import Link from "next/link";
import { MONTHS } from "@/lib/spatial/engine";
import type { Figure, Finding, Part } from "./findings";

const TONE: Record<Part["tone"], string> = { care: "#1f6f80", other: "#7d8db4", no: "#c0603c", na: "#d99b1c", progress: "#2457ce", open: "#9fb3e8", unknown: "url(#hatch)", plain: "#0b1e3d" };
const f = (n: number) => n.toLocaleString("en-IN");

export function FindingView({ x, i, city, print }: { x: Finding; i: number; city: string; print?: boolean }) {
  return (
    <article className={`fi${print ? " is-print" : ""}`} id={x.id} aria-labelledby={`${x.id}-c`}>
      <p className="fi-n serif" aria-hidden>{String(i + 1).padStart(2, "0")}</p>
      <div className="fi-body">
        <p className="k">{x.kicker}</p>
        <h2 id={`${x.id}-c`} className="fi-claim serif">{x.claim}</h2>
        <p className="fi-qual"><b>Limit</b> {x.qualify}</p>
        <FigureView fig={x.figure} />
        {print ? <MethodLedger m={x.method} /> : (
          <details className="fi-method"><summary>Method, unit and gaps</summary><MethodLedger m={x.method} /></details>
        )}
        {!print && (
          <p className="fi-links">
            {x.lens && <Link className="link" href={`/city?city=${encodeURIComponent(city)}&lens=${x.lens === "animals" ? "animals" : "requests"}`}>See it on the map</Link>}
            <Link className="link" href={`/city/report?city=${encodeURIComponent(city)}#${x.id}`}>In the city report</Link>
          </p>
        )}
      </div>
    </article>
  );
}

function MethodLedger({ m }: { m: Finding["method"] }) {
  return (
    <dl className="ledger fi-ledger">
      <div><dt>Unit</dt><dd>{m.unit}</dd></div>
      <div><dt>Out of</dt><dd>{m.denominator}</dd></div>
      <div><dt>Not known</dt><dd>{m.unknown}</dd></div>
      <div><dt>Source</dt><dd>{m.source}</dd></div>
      <div><dt>Placement</dt><dd>{m.precision}</dd></div>
      <div><dt>Period</dt><dd>{m.period}</dd></div>
      {m.loaded && <div><dt>Loaded</dt><dd>{m.loaded}</dd></div>}
    </dl>
  );
}

export function Hatch() {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fffdf8" /><line x1="0" y1="0" x2="0" y2="6" stroke="#7d8db4" strokeWidth="2.4" /></pattern></defs></svg>;
}

function FigureView({ fig }: { fig: Figure }) {
  if (fig.kind === "parts") {
    const all = fig.parts.reduce((a, p) => a + p.n, 0) || 1;
    let x = 0;
    return (
      <figure className="fi-fig">
        <svg viewBox="0 0 1000 44" className="fi-strip" role="img" aria-label={fig.parts.map((p) => `${p.n} ${p.label}`).join(", ") + ` of ${all} ${fig.of}`} preserveAspectRatio="none">
          {fig.parts.filter((p) => p.n).map((p) => { const w = (p.n / all) * 1000, r = <rect key={p.label} x={x} y={4} width={Math.max(1, w)} height={36} fill={TONE[p.tone]} stroke="#0b1e3d" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />; x += w; return r; })}
          <rect x={0} y={4} width={1000} height={36} fill="none" stroke="#0b1e3d" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <figcaption className="fi-key">{fig.parts.filter((p) => p.n).map((p) => <span key={p.label}><i style={{ background: p.tone === "unknown" ? "repeating-linear-gradient(135deg,#7d8db4 0 2px,transparent 2px 5px)" : TONE[p.tone] }} />{f(p.n)} {p.label.toLowerCase()}</span>)}</figcaption>
      </figure>
    );
  }
  if (fig.kind === "bins") {
    const max = Math.max(1, ...fig.bins.map((b) => b.n));
    return (
      <figure className="fi-fig">
        <ol className="fi-bins" aria-label={`By ${fig.of}`}>
          {fig.bins.map((b) => <li key={b.label}><span className="fi-bl">{b.label}</span><span className="fi-bar"><i className={b.tone === "unknown" ? "is-unk" : ""} style={{ width: `${(b.n / max) * 100}%`, background: b.tone === "unknown" ? undefined : TONE[b.tone] }} /></span><span className="mono fi-bn">{f(b.n)}</span></li>)}
        </ol>
      </figure>
    );
  }
  if (fig.kind === "table") {
    return (
      <figure className="fi-fig fi-tablewrap" role="region" aria-label="Table" tabIndex={0}>
        <table className="fi-table"><thead><tr><th>Locality</th>{fig.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{fig.rows.map((r) => <tr key={r.name}><th scope="row" className="serif">{r.name}</th>{r.cells.map((c, i) => <td key={i} className="mono">{c}</td>)}</tr>)}</tbody></table>
      </figure>
    );
  }
  if (fig.kind === "season") {
    const max = Math.max(1, ...fig.years.flatMap((y) => y.months.map((v) => v ?? 0)));
    return (
      <figure className="fi-fig fi-tablewrap" role="region" aria-label="Requests by month and year" tabIndex={0}>
        <table className="fi-season">
          <thead><tr><th />{MONTHS.map((m, k) => <th key={m} className={fig.peaks.includes(k) ? "is-peak" : ""}>{m}</th>)}</tr></thead>
          <tbody>{fig.years.map((y) => <tr key={y.year}><th scope="row" className="mono">{y.year}</th>{y.months.map((v, k) => <td key={k} title={v === null ? "No record" : `${v} requests`}>{v === null ? <span className="fi-none">·</span> : <span className="fi-dot" style={{ width: 6 + (v / max) * 22, height: 6 + (v / max) * 22, background: fig.peaks.includes(k) ? "#f05b40" : "#2457ce" }} />}</td>)}</tr>)}</tbody>
        </table>
        <figcaption className="small">Circles sized by requests in the month. A dot is a month before the record starts or after today: no record, not zero.{fig.peaks.length ? " Flame: busier than that year's average in every year." : ""}</figcaption>
      </figure>
    );
  }
  return (
    <figure className="fi-fig">
      <ol className="fi-complete">
        {fig.rows.map((r) => <li key={r.label}><span className="fi-bl">{r.label} <small>of {r.of}</small></span><span className="fi-bar is-whole"><i style={{ width: `${(r.known / r.total) * 100}%` }} /><i className="is-part" style={{ width: `${(r.partial / r.total) * 100}%` }} /></span><span className="mono fi-bn">{Math.round((r.known / r.total) * 100)}%</span></li>)}
      </ol>
      <figcaption className="small">Solid: recorded. Light: taken from an imported workbook. Hatched: not recorded.</figcaption>
    </figure>
  );
}
