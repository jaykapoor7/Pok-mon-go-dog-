"use client";

/* Renders municipal findings in two registers: the working Home page
   (one claim beside its limit and its evidence, method one tap away) and
   the printed City report (the same claims, method written out). One
   source, so the publication can never say more than the working view. */

import Link from "next/link";
import { MONTHS } from "@/lib/spatial/engine";
import type { Figure, Finding, Part } from "./findings";

/* The parts of a figure, in the theme's own tints. "Not recorded" is always hatched, never a colour. */
const TONE: Record<Part["tone"], string> = { care: "var(--i-green)", other: "var(--n-text-3)", no: "var(--n-red)", na: "var(--i-yellow)", progress: "var(--n-blue)", open: "var(--i-blue)", unknown: "url(#hatch)", plain: "var(--n-text)" };
const HATCH = "repeating-linear-gradient(135deg, var(--n-text-3) 0 2px, transparent 2px 5px)";
const f = (n: number) => n.toLocaleString("en-IN");

export function FindingView({ x, i, city, print }: { x: Finding; i: number; city: string; print?: boolean }) {
  return (
    <article className={`fnd${print ? " is-print" : ""}`} id={x.id} aria-labelledby={`${x.id}-c`}>
      <p className="fnd-k"><span aria-hidden>{String(i + 1).padStart(2, "0")}</span>{x.kicker}</p>
      <h2 id={`${x.id}-c`} className="fnd-claim">{x.claim}</h2>
      <p className="fnd-limit"><b>Limit</b> {x.qualify}</p>
      <FigureView fig={x.figure} />
      {/* On screen the method folds away; on paper it is printed in full. */}
      <details className="fnd-method no-print"><summary>How this is counted</summary><MethodLedger m={x.method} /></details>
      {print && <div className="print-only"><MethodLedger m={x.method} /></div>}
      {!print && (
        <p className="fnd-links">
          {x.lens && <Link href={`/city?city=${encodeURIComponent(city)}&lens=${x.lens === "animals" ? "animals" : "requests"}`}>See it on the map</Link>}
          <Link href={`/city/report?city=${encodeURIComponent(city)}#${x.id}`}>In the city report</Link>
        </p>
      )}
    </article>
  );
}

function MethodLedger({ m }: { m: Finding["method"] }) {
  return (
    <dl className="fnd-ledger">
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
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" style={{ stroke: "var(--n-text-3)" }} strokeWidth="2.4" /></pattern></defs></svg>;
}

function FigureView({ fig }: { fig: Figure }) {
  if (fig.kind === "parts") {
    const all = fig.parts.reduce((a, p) => a + p.n, 0) || 1;
    let x = 0;
    return (
      <figure className="fnd-fig">
        <svg viewBox="0 0 1000 12" className="fnd-strip" role="img" aria-label={fig.parts.map((p) => `${p.n} ${p.label}`).join(", ") + ` of ${all} ${fig.of}`} preserveAspectRatio="none">
          {fig.parts.filter((p) => p.n).map((p) => { const w = (p.n / all) * 1000, r = <rect key={p.label} x={x} y={0} width={Math.max(1, w)} height={12} style={{ fill: TONE[p.tone], stroke: "var(--n-bg)" }} strokeWidth="2" vectorEffect="non-scaling-stroke" />; x += w; return r; })}
        </svg>
        <figcaption className="fnd-key">{fig.parts.filter((p) => p.n).map((p) => <span key={p.label}><i style={{ background: p.tone === "unknown" ? HATCH : TONE[p.tone] }} />{f(p.n)} {p.label.toLowerCase()}</span>)}</figcaption>
      </figure>
    );
  }
  if (fig.kind === "bins") {
    const max = Math.max(1, ...fig.bins.map((b) => b.n));
    return (
      <figure className="fnd-fig">
        <ol className="fnd-bins" aria-label={`By ${fig.of}`}>
          {fig.bins.map((b) => <li key={b.label}><span className="fnd-bl">{b.label}</span><span className="fnd-bar"><i style={{ width: `${(b.n / max) * 100}%`, background: b.tone === "unknown" ? HATCH : TONE[b.tone] }} /></span><span className="fnd-bn">{f(b.n)}</span></li>)}
        </ol>
      </figure>
    );
  }
  if (fig.kind === "table") {
    return (
      <figure className="fnd-fig fnd-scroll" role="region" aria-label="Table" tabIndex={0}>
        <table className="fnd-table"><thead><tr><th>Locality</th>{fig.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{fig.rows.map((r) => <tr key={r.name}><th scope="row">{r.name}</th>{r.cells.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table>
      </figure>
    );
  }
  if (fig.kind === "season") {
    const max = Math.max(1, ...fig.years.flatMap((y) => y.months.map((v) => v ?? 0)));
    return (
      <figure className="fnd-fig fnd-scroll" role="region" aria-label="Requests by month and year" tabIndex={0}>
        <table className="fnd-season">
          <thead><tr><th />{MONTHS.map((m, k) => <th key={m} className={fig.peaks.includes(k) ? "is-peak" : ""}>{m}</th>)}</tr></thead>
          <tbody>{fig.years.map((y) => <tr key={y.year}><th scope="row">{y.year}</th>{y.months.map((v, k) => <td key={k} title={v === null ? "No record" : `${v} requests`}>{v === null ? <span className="fnd-none">·</span> : <span className="fnd-dot" style={{ width: 6 + (v / max) * 18, height: 6 + (v / max) * 18, background: fig.peaks.includes(k) ? "var(--n-red)" : "var(--n-blue)" }} />}</td>)}</tr>)}</tbody>
        </table>
        <figcaption className="fnd-cap">Circles sized by requests in the month. A dot is a month before the record starts or after today: no record, not zero.{fig.peaks.length ? " Red: busier than that year's average in every year." : ""}</figcaption>
      </figure>
    );
  }
  return (
    <figure className="fnd-fig">
      <ol className="fnd-bins">
        {fig.rows.map((r) => <li key={r.label}><span className="fnd-bl">{r.label} <small>of {r.of}</small></span><span className="fnd-bar is-whole"><i style={{ width: `${(r.known / r.total) * 100}%` }} /><i className="is-part" style={{ width: `${(r.partial / r.total) * 100}%` }} /></span><span className="fnd-bn">{Math.round((r.known / r.total) * 100)}%</span></li>)}
      </ol>
      <figcaption className="fnd-cap">Solid: recorded. Light: taken from an imported workbook. Hatched: not recorded.</figcaption>
    </figure>
  );
}
