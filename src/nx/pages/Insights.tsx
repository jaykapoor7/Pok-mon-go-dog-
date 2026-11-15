"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, Sparkles, X } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { GOV_ORG, SERIES, TARGET, WARDS } from "../fixtures";
import { PACKAGE_LABEL, orgNames, packages, type Package } from "@/lib/abc";
import { isVisibleToOffice } from "@/lib/machines/package";
import { useLive } from "../live";
import { ProgrammeHome } from "./Gov";

const COLS = "minmax(0, 1.2fr) minmax(0, 1fr) 92px 92px 112px 132px 72px";
const W = 640, H = 200, PAD = 24;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Analytics the Linear way: one chart, one breakdown, one table, and choosing in any of them narrows the others. */
function SampleInsights() {
  const [ward, setWard] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [range, setRange] = useState(12);
  const rows = ward ? WARDS.filter((w) => w.ward === ward) : WARDS;
  const share = ward ? rows[0].submitted / WARDS.reduce((a, w) => a + w.submitted, 0) : 1;
  const series = useMemo(() => SERIES.slice(-range).map(([v, s]) => [Math.round(v * share), Math.round(s * share)] as [number, number]), [range, share]);
  const max = Math.max(...series.map(([v, s]) => v + s)) * 1.12;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (series.length - 1), y = (n: number) => H - PAD - (n * (H - PAD * 2)) / max;
  const line = (f: (p: [number, number]) => number) => series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(f(p)).toFixed(1)}`).join(" ");
  const sub = rows.reduce((a, w) => a + w.submitted, 0), ver = rows.reduce((a, w) => a + w.verified, 0), exc = rows.reduce((a, w) => a + w.exceptions, 0);
  const withEst = rows.filter((w) => w.estimate), est = withEst.reduce((a, w) => a + (w.estimate ?? 0), 0), verEst = withEst.reduce((a, w) => a + w.verified, 0);
  const at = hover ?? series.length - 1;

  return (
    <Shell ws="gov" crumb={["Government", "Overview"]}>
      <div className="nx-page">
        <div className="nx-head">
          <div><p className="nx-eyebrow">{GOV_ORG.kind} · {GOV_ORG.city}<Sample /></p><h1 className="nx-h1">Programme insights</h1><p className="nx-sub">Verified vaccination activity against the estimated dog population, by ward.</p></div>
          <button type="button" className="nx-btn is-quiet"><Download size={13} />Export</button>
        </div>
        <div className="nx-bar">
          {[4, 8, 12].map((n) => <button key={n} type="button" className={`nx-filter ${range === n ? "is-on" : ""}`} onClick={() => setRange(n)} aria-pressed={range === n}>Last {n} weeks</button>)}
          {ward ? <button type="button" className="nx-filter is-on" onClick={() => setWard(null)} aria-label={`Clear ${ward}`}>{ward}<X size={12} /></button> : <span className="nx-filter" style={{ boxShadow: "none", color: "var(--ink-3)" }}>All wards · pick one below</span>}
          <span className="nx-t3" style={{ marginLeft: "auto" }}>Synced 15 minutes ago</span>
        </div>

        <div className="nx-figs" style={{ marginTop: 0, borderTop: 0 }}>
          <div className="nx-fig"><b>{sub.toLocaleString("en-IN")}</b><span>Submitted</span></div>
          <div className="nx-fig"><b>{ver.toLocaleString("en-IN")}<em>{pct(ver / sub)} of submitted</em></b><span>Reviewed and verified</span></div>
          <div className="nx-fig"><b>{est ? pct(verEst / est) : "—"}<em>{est ? `${verEst.toLocaleString("en-IN")} of ${est.toLocaleString("en-IN")} dogs` : "no estimate"}</em></b><span>Verified coverage, target {pct(TARGET)}</span></div>
          <div className="nx-fig"><b>{exc}</b><span>Evidence exceptions</span></div>
        </div>

        <div className="nx-two">
          <section aria-labelledby="i-time">
            <div className="nx-sec-h"><h2 id="i-time">Vaccinations per week</h2><span className="nx-legend"><span><i />Verified</span><span><i className="is-s" />Submitted, not yet verified</span></span></div>
            <p className="nx-readout"><span>Week {at + 1} of {series.length}</span><span><b>{series[at][0]}</b> verified</span><span><b>{series[at][1]}</b> waiting</span></p>
            <svg className="nx-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Verified vaccinations per week over ${series.length} weeks${ward ? ` in ${ward}` : ""}`} onMouseLeave={() => setHover(null)}>
              {[0, .5, 1].map((t) => <g key={t}><line className="g" x1={PAD} x2={W - PAD} y1={y(max * t * .88)} y2={y(max * t * .88)} /><text x={0} y={y(max * t * .88) + 3}>{Math.round(max * t * .88)}</text></g>)}
              <path className="a" d={`${line((p) => p[0])} L${x(series.length - 1)} ${H - PAD} L${x(0)} ${H - PAD} Z`} />
              <path className="s" d={line((p) => p[0] + p[1])} />
              <path className="v" d={line((p) => p[0])} />
              {hover !== null ? <><line className="cur" x1={x(hover)} x2={x(hover)} y1={PAD - 8} y2={H - PAD} /><circle cx={x(hover)} cy={y(series[hover][0])} r={3.5} /></> : null}
              {series.map((_, i) => <rect key={i} className="hit" x={x(i) - (W - PAD * 2) / series.length / 2} y={0} width={(W - PAD * 2) / series.length} height={H} onMouseEnter={() => setHover(i)} />)}
            </svg>
          </section>

          <section aria-labelledby="i-ward">
            <div className="nx-sec-h"><h2 id="i-ward">Verified coverage by ward</h2></div>
            <div className="nx-bars">
              {WARDS.map((w) => {
                const c = w.estimate ? w.verified / w.estimate : null;
                return (
                  <button key={w.ward} type="button" className={`nx-barrow ${ward === w.ward ? "is-on" : ward ? "is-dim" : ""}`} aria-pressed={ward === w.ward} onClick={() => setWard(ward === w.ward ? null : w.ward)}>
                    <span>{w.ward}</span>
                    <span className="nx-bar-t">{c !== null ? <span className={c < TARGET - .15 ? "is-low" : ""} style={{ width: `${Math.min(100, c * 100)}%` }} /> : null}<i style={{ left: `${TARGET * 100}%` }} /></span>
                    <em>{c !== null ? pct(c) : "No estimate"}</em>
                  </button>
                );
              })}
            </div>
            <p className="nx-foot">The tick marks the {pct(TARGET)} target. Coverage counts verified vaccinations only, against the latest dated population estimate. A ward without an estimate shows no figure.</p>
          </section>
        </div>

        <section className="nx-sec" style={{ marginTop: 30 }} aria-labelledby="i-table">
          <div className="nx-sec-h"><h2 id="i-table">{ward ?? "Wards"}</h2><span className="nx-count">{rows.length}</span></div>
          <div className="nx-table">
            <div className="nx-tr nx-th" style={{ gridTemplateColumns: COLS }}><span>Ward</span><span>Operator</span><span>Submitted</span><span>Verified</span><span>Estimate</span><span>State</span><span>Updated</span></div>
            {rows.map((w) => (
              <button key={w.ward} type="button" className={`nx-tr ${ward === w.ward ? "is-sel" : ""}`} style={{ gridTemplateColumns: COLS }} onClick={() => setWard(ward === w.ward ? null : w.ward)}>
                <span className="nx-cell-main"><span><b>{w.ward}</b><small>{w.exceptions} evidence {w.exceptions === 1 ? "exception" : "exceptions"}<span className="nx-only-s"> · {w.operator}</span></small></span></span>
                <span className="nx-t2 nx-hide-s">{w.operator}</span>
                <span className="num nx-hide-s">{w.submitted}</span>
                <span className="num nx-hide-s">{w.verified}</span>
                <span className="nx-t2 nx-hide-s">{w.estimate ? <><span className="num">{w.estimate}</span> · {w.estimated.split(" ")[1]}</> : "None"}</span>
                <span><Chip tone={w.tone}>{w.state}</Chip></span>
                <span className="nx-t3 nx-hide-s">{w.updated}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="nx-sec" aria-labelledby="i-kaju">
          <div className="nx-sec-h"><h2 id="i-kaju">Kaju noticed</h2></div>
          <ul className="nx-feed" style={{ maxWidth: 640 }}>
            <li><span className="nx-feed-i is-kaju"><Sparkles size={12} /></span><div><b>Ward 08: 16 submitted events have no location photo</b><p>They are counted as submitted, not verified. Review the records before treating the ward as complete.</p><div className="nx-feed-a"><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setWard("Ward 08")}>Show Ward 08</button></div></div></li>
            <li><span className="nx-feed-i is-kaju"><Sparkles size={12} /></span><div><b>Ward 12 uses a 2025 population count</b><p>Its coverage figure rests on an estimate older than the others. A new survey would change it.</p></div></li>
          </ul>
        </section>
      </div>
    </Shell>
  );
}

/** A reviewing office's overview: what waits, what was decided, who sends work. Every figure is a count of its own packages. */
function OfficeOverview() {
  const live = useLive();
  const office = live.orgFor("government")!;
  const [ps, setPs] = useState<Package[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    packages().then(async (all) => { const mine = all.filter((p) => p.office_id === office.org_id && isVisibleToOffice(p.status)); const n = await orgNames([...new Set(mine.map((p) => p.ngo_id))]).catch(() => ({})); if (alive) { setPs(mine); setNames(n); } }).catch(() => { if (alive) { setPs([]); setErr("Packages could not be read just now."); } });
    return () => { alive = false; };
  }, [office.org_id]);
  const list = ps ?? [], count = (s: string[]) => list.filter((p) => s.includes(p.status)).length;
  const records = list.filter((p) => p.status === "accepted" || p.status === "partially_accepted").reduce((a, p) => a + (p.summary?.records ?? 0), 0);
  const ops = [...new Set(list.map((p) => p.ngo_id))].map((id) => ({ id, name: names[id] ?? "Operator", waiting: list.filter((p) => p.ngo_id === id && p.status === "submitted").length, total: list.filter((p) => p.ngo_id === id).length }));
  const fig = (n: number | null, label: string, href?: string) => { const inner = <><b>{n === null ? "—" : n.toLocaleString("en-IN")}</b><span>{label}{href ? <ArrowRight size={12} /> : null}</span></>; return href ? <Link key={label} href={href} className="nx-fig">{inner}</Link> : <div key={label} className="nx-fig">{inner}</div>; };
  return (
    <Shell ws="gov" crumb={["Government", "Overview"]}>
      <div className="nx-page">
        <div className="nx-head"><div><p className="nx-eyebrow">{office.name}</p><h1 className="nx-h1">Overview</h1><p className="nx-sub">{ps === null ? "Reading packages…" : <><b className="num">{count(["submitted"])}</b> waiting for a decision. Accepted means accepted by this office; StrayPaw does not process payments.</>}</p></div></div>
        <div className="nx-figs">
          {fig(ps === null ? null : count(["submitted"]), "Waiting for you", "/next/gov/verification")}
          {fig(ps === null ? null : count(["queried"]), "Question with the operator", "/next/gov/verification")}
          {fig(ps === null ? null : count(["accepted", "partially_accepted"]), "Accepted packages")}
          {fig(ps === null ? null : records, "Records in accepted packages")}
        </div>
        {err ? <p className="nx-foot" role="alert">{err}</p> : null}
        <section className="nx-sec" style={{ marginTop: 26 }} aria-labelledby="o-ops">
          <div className="nx-sec-h"><h2 id="o-ops">Operators</h2><span className="nx-count">{ops.length}</span></div>
          <div className="nx-table">
            <div className="nx-tr nx-th" style={{ gridTemplateColumns: "minmax(0,1fr) 140px 120px" }}><span>Operator</span><span>Waiting for you</span><span>Packages</span></div>
            {ops.map((o) => <div key={o.id} className="nx-tr" style={{ gridTemplateColumns: "minmax(0,1fr) 140px 120px" }}><span className="nx-cell-main"><span><b>{o.name}</b></span></span><span className="num">{o.waiting}</span><span className="num">{o.total}</span></div>)}
            {ps && !ops.length ? <p className="nx-sub" style={{ padding: "20px 0" }}><b style={{ color: "var(--ink)" }}>No operator has sent a package yet.</b></p> : null}
          </div>
        </section>
        <section className="nx-sec" aria-labelledby="o-recent">
          <div className="nx-sec-h"><h2 id="o-recent">Latest</h2><Link href="/next/gov/verification">Open the queue <ArrowRight size={12} /></Link></div>
          <ul className="nx-feed" style={{ maxWidth: 720 }}>{list.slice(0, 5).map((p) => <li key={p.id}><span className="nx-feed-i"><ArrowRight size={12} /></span><div><b>{p.title}</b><p>{names[p.ngo_id] ?? "Operator"} · {PACKAGE_LABEL[p.status] ?? p.status}</p></div></li>)}</ul>
        </section>
      </div>
    </Shell>
  );
}

export function Insights() {
  const live = useLive();
  if (!live.ready) return <Shell ws="gov" crumb={["Government", "Overview"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const gov = live.orgFor("government");
  if (!live.org) return <SampleInsights />;
  if (gov?.source === "review_office") return <OfficeOverview />;
  return <ProgrammeHome />;
}
