/* A city finding, in two registers: on screen (one claim beside its limit
   and its evidence, method one tap away) and on paper in the City report
   (the same claim, method written out). One source, so the publication can
   never say more than the working view. Findings themselves are computed by
   src/sp/city/findings (pure functions of the public city dataset). */

import Link from "next/link";
import { MONTHS } from "@/lib/spatial/engine";
import type { Figure, Finding, Part } from "@/sp/city/findings";

/* "Not recorded" is always hatched, never a colour. */
const TONE: Record<Part["tone"], string> = { care: "#1f7a4d", other: "#8a93a6", no: "#c73e25", na: "#d08a1d", progress: "#2457ce", open: "#7d9be0", unknown: "url(#pb-hatch)", plain: "#0b1e3d" };
const HATCH = "repeating-linear-gradient(135deg, #8a93a6 0 2px, transparent 2px 5px)";
const f = (n: number) => n.toLocaleString("en-IN");

export function Hatch() {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false"><defs><pattern id="pb-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#8a93a6" strokeWidth="2.4" /></pattern></defs></svg>;
}

export function FindingView({ x, i, city, print }: { x: Finding; i: number; city: string; print?: boolean }) {
  return (
    <article className={`fd${print ? " is-print" : ""}`} id={x.id} aria-labelledby={`${x.id}-c`}>
      <p className="fd-k"><span aria-hidden>{String(i + 1).padStart(2, "0")}</span>{x.kicker}</p>
      <h2 id={`${x.id}-c`} className="fd-claim">{x.claim}</h2>
      <p className="fd-limit"><b>Limit</b> {x.qualify}</p>
      <FigureView fig={x.figure} />
      {print ? <MethodLedger m={x.method} /> : <details className="fd-method"><summary>How this is counted</summary><MethodLedger m={x.method} /></details>}
      {!print && (
        <p className="fd-links">
          {x.lens && <Link href={`/city?city=${encodeURIComponent(city)}&lens=${x.lens === "animals" ? "animals" : "requests"}`}>See it on the map</Link>}
          <Link href={`/city/report?city=${encodeURIComponent(city)}#${x.id}`}>In the city report</Link>
        </p>
      )}
    </article>
  );
}

function MethodLedger({ m }: { m: Finding["method"] }) {
  return (
    <dl className="fd-ledger">
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

function FigureView({ fig }: { fig: Figure }) {
  if (fig.kind === "parts") {
    const all = fig.parts.reduce((a, p) => a + p.n, 0) || 1;
    let x = 0;
    return (
      <figure className="fd-fig">
        <svg viewBox="0 0 1000 12" className="fd-strip" role="img" aria-label={fig.parts.map((p) => `${p.n} ${p.label}`).join(", ") + ` of ${all} ${fig.of}`} preserveAspectRatio="none">
          {fig.parts.filter((p) => p.n).map((p) => { const w = (p.n / all) * 1000, r = <rect key={p.label} x={x} y={0} width={Math.max(1, w)} height={12} fill={TONE[p.tone]} stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />; x += w; return r; })}
        </svg>
        <figcaption className="fd-key">{fig.parts.filter((p) => p.n).map((p) => <span key={p.label}><i style={{ background: p.tone === "unknown" ? HATCH : TONE[p.tone] }} />{f(p.n)} {p.label.toLowerCase()}</span>)}</figcaption>
      </figure>
    );
  }
  if (fig.kind === "bins") {
    const max = Math.max(1, ...fig.bins.map((b) => b.n));
    return (
      <figure className="fd-fig">
        <ol className="fd-bins" aria-label={`By ${fig.of}`}>
          {fig.bins.map((b) => <li key={b.label}><span className="fd-bl">{b.label}</span><span className="fd-bar" aria-hidden><i style={{ width: `${(b.n / max) * 100}%`, background: b.tone === "unknown" ? HATCH : TONE[b.tone] }} /></span><span className="fd-bn">{f(b.n)}</span></li>)}
        </ol>
      </figure>
    );
  }
  if (fig.kind === "table") {
    return (
      <figure className="fd-fig fd-scroll" role="region" aria-label="Table" tabIndex={0}>
        <table className="fd-table"><thead><tr><th scope="col">Locality</th>{fig.cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{fig.rows.map((r) => <tr key={r.name}><th scope="row">{r.name}</th>{r.cells.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table>
      </figure>
    );
  }
  if (fig.kind === "season") {
    const max = Math.max(1, ...fig.years.flatMap((y) => y.months.map((v) => v ?? 0)));
    return (
      <figure className="fd-fig fd-scroll" role="region" aria-label="Requests by month and year" tabIndex={0}>
        <table className="fd-season">
          <thead><tr><th scope="col"><span className="pb-sr">Year</span></th>{MONTHS.map((m, k) => <th key={m} scope="col" className={fig.peaks.includes(k) ? "is-peak" : ""}>{m}</th>)}</tr></thead>
          <tbody>{fig.years.map((y) => <tr key={y.year}><th scope="row">{y.year}</th>{y.months.map((v, k) => <td key={k} title={v === null ? "No record" : `${v} requests`}>{v === null ? <span className="fd-none" aria-label="No record">·</span> : <span className="fd-dot" aria-label={`${v} requests`} style={{ width: 6 + (v / max) * 18, height: 6 + (v / max) * 18, background: fig.peaks.includes(k) ? "#c73e25" : "#2457ce" }} />}</td>)}</tr>)}</tbody>
        </table>
        <figcaption className="fd-cap">Circles sized by requests in the month. A dot is a month before the record starts or after today: no record, not zero.{fig.peaks.length ? " Red: busier than that year's average in every year." : ""}</figcaption>
      </figure>
    );
  }
  return (
    <figure className="fd-fig">
      <ol className="fd-bins">
        {fig.rows.map((r) => <li key={r.label}><span className="fd-bl">{r.label} <small>of {r.of}</small></span><span className="fd-bar is-whole" aria-hidden><i style={{ width: `${(r.known / r.total) * 100}%` }} /><i className="is-part" style={{ width: `${(r.partial / r.total) * 100}%` }} /></span><span className="fd-bn">{Math.round((r.known / r.total) * 100)}%</span></li>)}
      </ol>
      <figcaption className="fd-cap">Solid: recorded. Light: taken from an imported workbook. Hatched: not recorded.</figcaption>
    </figure>
  );
}
