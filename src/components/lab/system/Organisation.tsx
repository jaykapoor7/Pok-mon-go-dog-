import Link from "next/link";
import "./sys.css";
import { LAB, fmt } from "../data";
import { Band, Band100, CellSVG, rampOf, RAMP } from "./parts";
import { R, STATUSES, STATUS_STYLE, cells, matrixBy, months, CBE_BOX } from "./sdata";

export function SystemOrganisation() {
  const t = LAB.totals;
  const all = cells();
  const byKey = new Map(all.map((c) => [c.key, c]));
  const worked = all.filter((c) => c.events > 0);
  const locs = new Set(worked.map((c) => c.locality)).size;
  const m = matrixBy();
  const status = STATUSES.map((s) => ({ s, n: m.reduce((a, r) => a + (r.by.find((b) => b.s === s)?.n ?? 0), 0) }));
  const reqs = status.reduce((a, s) => a + s.n, 0);
  const ms = months();
  const mx = Math.max(...ms.map((x) => x.cases + x.care));
  const projects = [
    { name: "Rescue helpline", kind: "Rescue", scope: `${fmt(R.requests)} requests`, span: "2024 – now", status: `${fmt(t.inProgress)} in progress`, done: status.find((s) => s.s === "Closed")!.n / reqs, href: "/lab/system/ngo" },
    { name: "Sterilisation drive", kind: "ABC", scope: `${R.abc.enrolled} animals`, span: "one drive", status: `${R.abc.fields.find((f) => f[0] === "Release date")![1]} released`, done: (R.abc.fields.find((f) => f[0] === "Release date")![1]) / R.abc.enrolled, href: "/lab/system/project" },
    { name: "TVT treatment", kind: "Medical", scope: `${R.tvt.courses} courses`, span: "weekly doses", status: `${R.tvt.open} open`, done: (R.tvt.courses - R.tvt.open) / R.tvt.courses, href: "/lab/system/project" },
    { name: "Review and appointments", kind: "Follow-up", scope: `${R.review.appointments} appointments`, span: "scheduled", status: "outcome not recorded", done: 0, href: "/lab/system/ngo" },
  ];
  return (
    <main className="sx sx-org">
      <Band current="/lab/system/organisation" crumbs={["India", "Coimbatore", "Organisations", "Field partner"]} />
      <section className="sx-org-top">
        <div className="sx-org-id">
          <span className="lbl">Organisation · rescue and ABC · Coimbatore</span>
          <h1>Field partner, <span className="it">Coimbatore</span></h1>
          <p className="dim">Name withheld in the design lab. Verified partner · records on StrayPaw since January 2024.</p>
          <dl className="sx-org-facts">
            <div><dt>Animals on its register</dt><dd className="num">{fmt(t.coimbatore)}</dd></div>
            <div><dt>Field records</dt><dd className="num">{fmt(t.fieldEvents)}</dd></div>
            <div><dt>Cases closed</dt><dd className="num">{fmt(t.resolved)}</dd></div>
            <div><dt>Open now</dt><dd className="num need">{fmt(t.inProgress + t.unverified)}</dd></div>
          </dl>
        </div>
        <figure className="sx-org-foot">
          <CellSVG cells={all} box={CBE_BOX} width={520} height={470} pad={6} fill={(k) => { const c = byKey.get(k)!; return c.events ? rampOf(c.events, [1, 4, 10, 24, 50]) : "#e9e1d4"; }} stroke="#f3ede4" label="Organisation footprint" />
          <figcaption><b>Footprint</b><span className="m">{worked.length} cells · {locs} localities with field work, 2024 – 2026</span>
            <span className="sx-key">{RAMP.slice(1).map((c, i) => <span key={c}><i style={{ background: c }} />{["1", "2–4", "5–10", "11–24", "25+"][i]}</span>)}</span>
          </figcaption>
        </figure>
      </section>

      <section className="sx-org-sec" aria-label="Projects">
        <div className="sx-rec-h"><h2>Projects</h2><Link href="/lab/system/project" className="sx-more">All project types →</Link></div>
        <table className="sx-org-proj">
          <thead><tr><th>Project</th><th>Kind</th><th>Scope</th><th>Progress</th><th>Now</th></tr></thead>
          <tbody>{projects.map((p) => (
            <tr key={p.name}>
              <td><Link href={p.href}><b>{p.name}</b></Link><span className="dim"> · {p.span}</span></td>
              <td><span className="k">{p.kind}</span></td>
              <td className="m">{p.scope}</td>
              <td>{p.done > 0 ? <span className="prog"><i style={{ width: `${p.done * 100}%` }} /></span> : <span className="prog hatch" />}</td>
              <td>{p.status}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>

      <div className="sx-org-cols">
        <section aria-label="Outcomes">
          <div className="sx-rec-h"><h2>Outcomes</h2><span className="m dim">{fmt(reqs)} rescue requests</span></div>
          <Band100 height={26} parts={status.map((s) => ({ n: s.n, fill: STATUS_STYLE[s.s].fill, hatch: STATUS_STYLE[s.s].hatch, label: s.s }))} />
          <ul className="sx-comp-list">{status.filter((s) => s.n).map((s) => <li key={s.s}><i className={STATUS_STYLE[s.s].hatch ? "hatch" : ""} style={{ background: STATUS_STYLE[s.s].hatch ? undefined : STATUS_STYLE[s.s].fill }} /><span>{STATUS_STYLE[s.s].label}</span><b className="m">{fmt(s.n)}</b><span className="m dim">{Math.round((s.n / reqs) * 100)}%</span></li>)}</ul>
        </section>
        <section aria-label="Activity">
          <div className="sx-rec-h"><h2>Activity</h2><span className="m dim">field records per month</span></div>
          <svg viewBox="0 0 400 140" width="100%" role="img" aria-label="Field records per month, Jan 2024 to Sep 2026">
            {ms.map((x, i) => { const hc = (x.cases / mx) * 110, hk = (x.care / mx) * 110; return <g key={x.m}><rect x={i * 12} y={120 - hc - hk} width="9" height={hk} fill="#2457ce" /><rect x={i * 12} y={120 - hc} width="9" height={hc} fill="#f05b40" /></g>; })}
            <line x1="0" x2="400" y1="120.5" y2="120.5" stroke="#0b1e3d" />
            <text x="0" y="136" className="ax">Jan 2024</text><text x="396" y="136" textAnchor="end" className="ax">Sep 2026</text>
          </svg>
          <div className="sx-key"><span><i style={{ background: "#f05b40" }} />cases opened</span><span><i style={{ background: "#2457ce" }} />care recorded</span></div>
        </section>
        <section aria-label="Evidence">
          <div className="sx-rec-h"><h2>Evidence</h2><span className="m dim">what its records hold</span></div>
          <ul className="sx-vars">{R.fields.slice(0, 8).map(([k, n]) => <li key={k}><span>{k}</span><div><Band100 height={10} parts={[{ n, fill: "#2457ce" }, { n: R.requests - n, fill: "", hatch: true }]} /></div><b className="m">{Math.round((n / R.requests) * 100)}%</b></li>)}</ul>
        </section>
      </div>
      <p className="sx-source" style={{ padding: "18px var(--sx-g) 48px" }}>Counts from the StrayPaw register and from the organisation&apos;s rescue register imported into StrayPaw (anonymised, de-duplicated). Staff, finance and informer records are never imported or shown.</p>
    </main>
  );
}
