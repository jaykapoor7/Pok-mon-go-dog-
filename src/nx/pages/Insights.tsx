"use client";

import { About, GhMark } from "./gh/parts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Sparkles, Users, X } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { GOV_ORG, SERIES, TARGET, WARDS } from "../fixtures";
import { PACKAGE_LABEL, orgNames, packages, type Package } from "@/lib/abc";
import { isVisibleToOffice } from "@/lib/machines/package";
import { useLive, useTasks } from "../live";
import { ProgrammeHome } from "./Gov";
import { AtKaju } from "../AtKaju";
import { Grid, Meter, Panel, Rows, Strip, TasksPanel, Tile, Tiles, type Item } from "../HomeCards";

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
      <div className="nx-page hm-page">
        <div className="nx-head">
          <div><p className="nx-eyebrow">{GOV_ORG.kind} · {GOV_ORG.city}<Sample /><GhMark /></p><h1 className="nx-h1">Programme insights</h1><p className="nx-sub">Verified vaccination activity against the estimated dog population, by ward.</p></div>
          <Link href="/try" className="nx-btn is-quiet" title="Opens the live demo, where this works"><Download size={13} />Export</Link>
        </div>
        <AtKaju role="programme" />
        <div className="nx-bar" style={{ marginTop: 24 }}>
          {[4, 8, 12].map((n) => <button key={n} type="button" className={`nx-filter ${range === n ? "is-on" : ""}`} onClick={() => setRange(n)} aria-pressed={range === n}>Last {n} weeks</button>)}
          {ward ? <button type="button" className="nx-filter is-on" onClick={() => setWard(null)} aria-label={`Clear ${ward}`}>{ward}<X size={12} /></button> : <span className="nx-filter" style={{ boxShadow: "none", color: "var(--ink-3)" }}>All wards · pick one below</span>}
          <span className="nx-t3" style={{ marginLeft: "auto" }}>Synced 15 minutes ago</span>
        </div>

        <Tiles>
          <Tile label="Submitted" n={sub} note={ward ? `${ward} only` : "All wards"} />
          <Tile label="Reviewed and verified" n={ver} visual={<Meter part={ver} whole={sub} tone="ok" label={`${pct(ver / sub)} of submitted`} />} />
          <Tile label={`Verified coverage, target ${pct(TARGET)}`} text={est ? pct(verEst / est) : "No estimate"} visual={est ? <Meter part={verEst} whole={est} tone={verEst / est < TARGET ? "warn" : "ok"} mark={TARGET} label={`${verEst.toLocaleString("en-IN")} of ${est.toLocaleString("en-IN")} dogs`} /> : null} />
          <Tile label="Evidence exceptions" n={exc} tone={exc ? "warn" : "plain"} note="Events without the photos or location a review needs" />
        </Tiles>

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

        <Strip id="i-kaju" title="Kaju noticed" items={[
          { id: "k1", title: "Ward 08: 16 submitted events have no location photo", meta: "Counted as submitted, not verified, until the records are reviewed.", icon: <Sparkles size={16} />, tone: "blue", end: <button type="button" className="hm-btn" style={{ marginTop: 8, justifySelf: "start" }} onClick={() => setWard("Ward 08")}>Show Ward 08</button> },
          { id: "k2", title: "Ward 12 uses a 2025 population count", meta: "Its coverage rests on an estimate older than the others; a new survey would change it.", icon: <Sparkles size={16} />, tone: "blue" },
        ]} empty="Nothing right now." />
      </div>
    </Shell>
  );
}

/** A reviewing office's overview: what waits, what was decided, who sends work. Every figure is a count of its own packages. */
function OfficeOverview() {
  const live = useLive();
  const office = live.orgFor("government")!;
  const tasks = useTasks(office.org_id);
  const [ps, setPs] = useState<Package[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setErr(null);
    packages().then(async (all) => { const mine = all.filter((p) => p.office_id === office.org_id && isVisibleToOffice(p.status)); const n = await orgNames([...new Set(mine.map((p) => p.ngo_id))]).catch(() => ({})); if (alive) { setPs(mine); setNames(n); } }).catch(() => { if (alive) { setPs(null); setErr("Packages could not be read just now."); } });
    return () => { alive = false; };
  }, [office.org_id, tick]);
  const list = ps ?? [], count = (s: string[]) => list.filter((p) => s.includes(p.status)).length;
  /* undefined while reading, null when the read failed: never a zero that was not counted. */
  const n = (v: number) => (err ? null : ps === null ? undefined : v);
  const waiting = list.filter((p) => p.status === "submitted").sort((a, b) => Date.parse(a.submitted_at ?? a.created_at) - Date.parse(b.submitted_at ?? b.created_at));
  const decided = list.filter((p) => ["accepted", "partially_accepted", "returned"].includes(p.status));
  const accepted = count(["accepted", "partially_accepted"]);
  const records = list.filter((p) => p.status === "accepted" || p.status === "partially_accepted").reduce((a, p) => a + (p.summary?.records ?? 0), 0);
  const ops = [...new Set(list.map((p) => p.ngo_id))].map((id) => ({ id, name: names[id] ?? "Operator", waiting: list.filter((p) => p.ngo_id === id && p.status === "submitted").length, queried: list.filter((p) => p.ngo_id === id && p.status === "queried").length, total: list.filter((p) => p.ngo_id === id).length })).sort((a, b) => b.waiting - a.waiting || b.total - a.total);
  const days = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 864e5)) : null);
  const oldest = waiting[0] ? days(waiting[0].submitted_at ?? waiting[0].created_at) : null;
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
  const recent = [...decided].sort((a, b) => Date.parse(b.decided_at ?? b.created_at) - Date.parse(a.decided_at ?? a.created_at));
  return (
    <Shell ws="gov" crumb={["Government", "Overview"]}>
      <div className="nx-page hm-page">
        <div className="nx-head"><div><p className="nx-eyebrow">{office.name}<GhMark /></p><h1 className="nx-h1">Overview</h1><p className="nx-sub">{err ? "Packages could not be read, so nothing is counted." : ps === null ? "Reading packages…" : <About>Accepted means accepted by this office; StrayPaw does not process payments.</About>}</p></div></div>
        <AtKaju role="office" />
        <Tiles>
          <Tile label="Waiting for your decision" n={n(waiting.length)} tone={waiting.length ? "warn" : "plain"} href="/gov/verification" note={oldest !== null ? `The oldest was sent ${oldest === 0 ? "today" : `${oldest} ${oldest === 1 ? "day" : "days"} ago`}` : undefined} />
          <Tile label="Question with the operator" n={n(count(["queried"]))} href="/gov/verification" />
          <Tile label="Accepted packages" n={n(accepted)} href="/gov/reports" visual={decided.length ? <Meter part={accepted} whole={decided.length} tone="ok" label={`${accepted} of ${decided.length} decided packages`} /> : null} />
          <Tile label="Records in accepted packages" n={n(records)} href="/gov/reports" />
        </Tiles>
        <Grid cols={3}>
          <Panel id="o-wait" title="Waiting for a decision">
            <Rows items={ps ? waiting.map((p): Item => { const d = days(p.submitted_at ?? p.created_at); return { id: p.id, title: p.title, meta: `${names[p.ngo_id] ?? "Operator"}${p.summary?.records ? ` · ${p.summary.records.toLocaleString("en-IN")} records` : ""}`, href: `/gov/verification/${p.id}`, icon: <FileText size={16} />, tone: "warn", chip: { text: d === null ? "Sent" : d === 0 ? "Sent today" : `${d} ${d === 1 ? "day" : "days"} waiting`, tone: d !== null && d > 7 ? "warn" : "plain" }, kaju: `Check the package “${p.title}” before I review it`, kajuLabel: `Ask @Kaju about ${p.title}` }; }) : null}
              error={err} retry={() => setTick((t) => t + 1)} all={{ href: "/gov/verification" }} empty="Nothing is waiting for a decision." />
          </Panel>
          <Panel id="o-ops" title="Operators" count={ps ? ops.length : undefined}>
            <Rows items={ps ? ops.map((o): Item => ({ id: o.id, title: o.name, meta: `${o.total} ${o.total === 1 ? "package" : "packages"}${o.queried ? ` · ${o.queried} with a question` : ""}`, href: "/gov/partners", icon: <Users size={16} />, tone: o.waiting ? "warn" : "plain", chip: o.waiting ? { text: `${o.waiting} waiting`, tone: "warn" } : undefined })) : null}
              error={err} all={{ href: "/gov/partners" }} empty="No operator has sent a package yet." />
          </Panel>
          <TasksPanel orgId={office.org_id} userId={live.userId} tasks={tasks} />
        </Grid>
        <Strip id="o-recent" title="Recently decided" all={{ href: "/gov/reports", label: "Reports" }} error={err}
          items={ps ? recent.map((p): Item => ({ id: p.id, title: p.title, meta: `${names[p.ngo_id] ?? "Operator"}${p.decided_by_name ? ` · ${p.decided_by_name}` : ""}`, href: `/gov/verification/${p.id}`, icon: <FileText size={16} />, tone: p.status === "returned" ? "plain" : "ok", chip: { text: `${PACKAGE_LABEL[p.status] ?? p.status}${p.decided_at ? ` · ${when(p.decided_at)}` : ""}`, tone: p.status === "returned" ? "plain" : "ok" } })) : undefined}
          empty="No package has been decided yet." />
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
