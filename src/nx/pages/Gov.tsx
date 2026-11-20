"use client";

import { About, GhMark, usePhone } from "./gh/parts";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, FileText, MapPin, ShieldAlert } from "lucide-react";
import { ALERT_KIND, KIND_LABEL as OH_KIND, SERVICE_LABEL, SERVICE_STATUS, call, fmtDate, type Alert, type Count, type Network, type Overview, type Place, type ProgrammeRef } from "@/oh/data";
import { oversees } from "@/oh/places";
import { PACKAGE_LABEL, orgNames, packages, type Package } from "@/lib/abc";
import { isVisibleToOffice } from "@/lib/machines/package";
import { ListPage, type Col } from "../ListPage";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { ALERTS, OUTPUTS, PARTNERS, PROG_SAMPLE, SURV_AREAS, SURV_WEEKS, TARGET, WARDS, type Tone } from "../fixtures";
import { useLive, useTasks } from "../live";
import { Failed, TabBar } from "../kit";
import { ContractsTab } from "./gov/Contracts";
import { AtKaju } from "../AtKaju";
import { Grid, Meter, Panel, Rows, Split, TasksPanel, Tile, Tiles, type Item } from "../HomeCards";

/* Government & Programmes, built on the programme the person oversees (oh_programme_overview and friends).
   Every count comes from the database, which suppresses small human-health counts as "<5" and never returns
   patient details. A reviewing office without a programme sees its own packages instead. */

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (c: Count | undefined) => (c === null || c === undefined ? "—" : typeof c === "number" ? c.toLocaleString("en-IN") : c);
const val = (c: Count | undefined) => (typeof c === "number" ? c : 0);

/* ── The programme this person oversees ─────────────────────────── */
type Mode = "loading" | "sample" | "programme" | "office" | "none" | "failed";
function useGov() {
  const live = useLive();
  const gov = live.orgFor("government");
  const govId = gov?.org_id ?? null;
  const [progs, setProgs] = useState<ProgrammeRef[] | null>(null);
  const [pid, setPid] = useState<string | null>(null);
  // A failed read is said as such; it is never shown as "no programme".
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!live.ready || !govId) return;
    let alive = true;
    setFailed(null); setProgs(null);
    call<Place[]>("oh_my_today").then((r) => {
      if (!alive) return;
      if (r.error) { setFailed(r.error); return; }
      const mine = (Array.isArray(r.data) ? r.data : []).filter((p) => oversees(p.kind));
      const ordered = [...mine.filter((p) => p.organisation_id === govId), ...mine.filter((p) => p.organisation_id !== govId)];
      setProgs([...new Map(ordered.flatMap((p) => p.programmes).map((x) => [x.id, x])).values()]);
    });
    return () => { alive = false; };
  }, [live.ready, govId, attempt]);
  const office = gov?.source === "review_office";
  const mode: Mode = !live.ready ? "loading" : !live.org ? "sample" : !gov ? "none" : office ? "office" : failed ? "failed" : progs === null ? "loading" : progs.length ? "programme" : "none";
  const prog = progs?.find((p) => p.id === pid) ?? progs?.[0] ?? null;
  return { gov, mode, progs: progs ?? [], prog, pick: setPid, failed, retry: () => setAttempt((n) => n + 1) };
}

/** One read, keyed; a changed key starts a new read and the old answer is not shown for it. */
function useCall<T>(fn: string, args: Record<string, unknown> | null, key: string) {
  const [s, setS] = useState<{ key: string; data: T | null; err: string | null } | null>(null);
  const argsRef = useRef(args); argsRef.current = args;
  const on = args !== null;
  useEffect(() => {
    if (!on || !argsRef.current) return;
    let alive = true;
    call<T>(fn, argsRef.current).then((r) => { if (alive) setS({ key, data: r.data, err: r.error }); });
    return () => { alive = false; };
  }, [fn, key, on]);
  const hit = s && s.key === key ? s : null;
  return { data: hit?.data ?? null, err: hit?.err ?? null, loading: on && !hit };
}

function ProgName({ g, sample }: { g: ReturnType<typeof useGov>; sample: boolean }) {
  if (sample) return <>{PROG_SAMPLE.name}</>;
  if (g.progs.length > 1) return <select className="nx-pick" aria-label="Programme" value={g.prog?.id ?? ""} onChange={(e) => g.pick(e.target.value)}>{g.progs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>;
  return <>{g.prog?.name ?? ""}</>;
}

function Plain({ crumb, title, children }: { crumb: string; title: string; children: ReactNode }) {
  return <Shell ws="gov" crumb={["Government", crumb]}><div className="nx-page"><h1 className="nx-h1">{title}</h1><div className="nx-sub" style={{ maxWidth: "62ch" }}>{children}</div></div></Shell>;
}
const Opening = ({ crumb }: { crumb: string }) => <Shell ws="gov" crumb={["Government", crumb]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
const NOT_IN = "Your account is not part of a government office or programme.";

/* ── Programmes: coverage by area against a dated estimate ───────── */
type AreaRow = { id: string; area: string; vaccinated: number; registered: number; estimate: { dogs: number; method: string; source: string; on: string } | null; href?: string };
const covOf = (r: AreaRow) => (r.estimate && r.estimate.dogs > 0 ? r.vaccinated / r.estimate.dogs : null);
function CovBar({ c, target }: { c: number | null; target: number }) {
  return <span className="nx-cov"><span className="nx-bar-t" style={{ width: 96 }}>{c !== null ? <span className={c < target ? "is-low" : ""} style={{ width: `${Math.min(100, c * 100)}%` }} /> : null}<i style={{ left: `${target * 100}%` }} /></span><span className="num">{c !== null ? pct(c) : <span className="nx-t3">No estimate</span>}</span></span>;
}

export function GovProgrammes() {
  const g = useGov();
  const o = useCall<Overview>("oh_programme_overview", g.mode === "programme" && g.prog ? { p_programme: g.prog.id, p_days: 365 } : null, `cov:${g.prog?.id}`);
  if (g.mode === "loading") return <Opening crumb="Programmes" />;
  if (g.mode === "failed") return <Plain crumb="Programmes" title="Programmes"><Failed error={`Your programmes could not be read, so nothing is shown as missing. ${g.failed ?? ""}`} retry={g.retry} /></Plain>;
  if (g.mode === "none") return <Plain crumb="Programmes" title="Programmes">{g.gov ? `${g.gov.name} does not oversee a programme on StrayPaw yet.` : NOT_IN}</Plain>;
  if (g.mode === "office") return <Plain crumb="Programmes" title="Programmes">{g.gov!.name} reviews packages that operators send it. It is not a member of a programme on StrayPaw, so there is no programme coverage to show here. <Link href="/gov/verification" style={{ color: "var(--accent)" }}>Open verification</Link>.</Plain>;
  const sample = g.mode === "sample";
  const target = sample ? TARGET : o.data?.programme.target ?? TARGET;
  const slug = g.prog?.slug;
  const rows: AreaRow[] = sample
    ? WARDS.map((w) => ({ id: w.ward, area: w.ward, vaccinated: w.verified, registered: w.submitted, estimate: w.estimate ? { dogs: w.estimate, method: "Street survey", source: `${w.operator}, ${w.estimated}`, on: w.estimated } : null, href: "/gov/programmes/sample?tab=Coverage" }))
    : (o.data?.vaccination ?? []).map((v) => ({ id: v.area_id, area: v.area, vaccinated: v.vaccinated, registered: v.registered, estimate: v.estimate ? { ...v.estimate, on: fmtDate(v.estimate.on, { day: "numeric", month: "short", year: "numeric" }) } : null, href: slug ? `/gov/programmes/${slug}?tab=Coverage` : undefined }));
  const withEst = rows.filter((r) => covOf(r) !== null), at = withEst.filter((r) => covOf(r)! >= target).length;
  const cols: Col<AreaRow>[] = [
    { label: "Area", width: "minmax(0, 1fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.area}</b><small>{r.estimate ? `Estimate ${r.estimate.dogs.toLocaleString("en-IN")} dogs · ${r.estimate.on}` : "No dated estimate"}<span className="nx-only-s"> · {covOf(r) !== null ? pct(covOf(r)!) : "no coverage figure"}</span></small></span></span> },
    { label: "Vaccinated", width: "150px", hideOnPhone: true, render: (r) => <span><b className="num" style={{ fontWeight: 500 }}>{r.vaccinated.toLocaleString("en-IN")}</b> <span className="nx-t3">of {r.registered.toLocaleString("en-IN")} registered</span></span> },
    { label: `Coverage (target ${pct(target)})`, width: "190px", hideOnPhone: true, render: (r) => <CovBar c={covOf(r)} target={target} /> },
  ];
  return (
    <ListPage ws="gov" crumb={["Government", "Programmes"]} title="Programmes" sample={sample}
      eyebrow={<><ProgName g={g} sample={sample} /><GhMark />{!sample && o.data?.programme.illustrative && !/illustrative/i.test(o.data.programme.name) ? <Chip tone="warn">Illustrative</Chip> : null}</>}
      sub={o.loading ? "Reading the programme…" : <><b className="num">{at}</b> of {withEst.length} {withEst.length === 1 ? "area" : "areas"} with a dated estimate reach the {pct(target)} target.{rows.length - withEst.length ? <> <About>{rows.length - withEst.length} {rows.length - withEst.length === 1 ? "has" : "have"} no estimate, so no coverage is shown.</About></> : null}<GhMark /></>}
      action={sample ? <Link href="/gov/programmes/sample?tab=Coverage" className="nx-btn is-quiet">Open the programme</Link> : slug ? <Link href={`/gov/programmes/${slug}?tab=Coverage`} className="nx-btn is-quiet">Record an estimate</Link> : undefined}
      views={[{ id: "all", label: "All areas", test: () => true }, { id: "low", label: "Below target", test: (r: AreaRow) => covOf(r) !== null && covOf(r)! < target }, { id: "none", label: "No estimate", test: (r: AreaRow) => covOf(r) === null }]}
      columns={cols} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.area} search={(r) => r.area}
      sort={(a, b) => (covOf(a) ?? 2) - (covOf(b) ?? 2)}
      preview={(r) => ({ title: r.area, sub: <CovBar c={covOf(r)} target={target} />, body: <><dl className="nx-props"><div><dt>Vaccinated</dt><dd className="num">{r.vaccinated.toLocaleString("en-IN")}</dd></div><div><dt>Registered</dt><dd className="num">{r.registered.toLocaleString("en-IN")}</dd></div>{r.estimate ? <><div><dt>Estimate</dt><dd><span className="num">{r.estimate.dogs.toLocaleString("en-IN")}</span> dogs</dd></div><div><dt>Method</dt><dd>{r.estimate.method}</dd></div><div><dt>Source</dt><dd>{r.estimate.source}</dd></div><div><dt>Dated</dt><dd>{r.estimate.on}</dd></div></> : <div><dt>Estimate</dt><dd>None recorded</dd></div>}</dl><p className="nx-note" style={{ marginTop: 14 }}><span>Coverage is vaccinated dogs recorded on StrayPaw divided by the dated estimate. Dogs vaccinated outside StrayPaw are not counted, so it can understate coverage.</span></p></>, href: r.href, hrefLabel: "Open coverage", hrefNote: "Estimates are recorded with their method and source on the programme's Coverage tab." })}
      loading={o.loading} error={o.err} empty={{ none: "No areas in this programme yet", hint: "Areas are added when the programme is set up." }} />
  );
}

/* ── Partners ─────────────────────────────────────────────────────── */
type PartnerRow = { id: string; name: string; kind: string; responsibilities: string; members: Count; open: number; overdue: number; services: { service: string; status: string; on: string }[] };
const STATUS_TONE: Record<string, Tone> = { Available: "ok", Limited: "warn", "Not available": "bad" };
const HEALTH = new Set(["Hospital", "Health centre", "Laboratory"]);

export function Partners() {
  const g = useGov();
  const args = g.mode === "programme" && g.prog ? { p_programme: g.prog.id, p_days: 90 } : null;
  const o = useCall<Overview>("oh_programme_overview", args, `pp:${g.prog?.id}`);
  const net = useCall<Network>("oh_programme_network", args ? { p_programme: g.prog!.id } : null, `net:${g.prog?.id}`);
  if (g.mode === "loading") return <Opening crumb="Partners" />;
  if (g.mode === "failed") return <Plain crumb="Partners" title="Partners"><Failed error={`Your programmes could not be read, so nothing is shown as missing. ${g.failed ?? ""}`} retry={g.retry} /></Plain>;
  if (g.mode === "none") return <Plain crumb="Partners" title="Partners">{g.gov ? `${g.gov.name} does not oversee a programme on StrayPaw yet, so it has no partners here.` : NOT_IN}</Plain>;
  if (g.mode === "office") return <Operators />;
  const sample = g.mode === "sample";
  const svc = new Map((net.data?.facilities ?? []).map((f) => [f.id, f.services.map((s) => ({ service: SERVICE_LABEL[s.service] ?? s.service, status: SERVICE_STATUS[s.status]?.label ?? s.status, on: fmtDate(s.verified_at) }))]));
  const rows: PartnerRow[] = sample ? PARTNERS : (o.data?.partners ?? []).map((p) => ({ id: p.id, name: p.name, kind: OH_KIND[p.kind] ?? p.kind, responsibilities: p.responsibilities ?? "Not written down yet", members: p.members, open: p.open, overdue: p.overdue, services: svc.get(p.id) ?? [] }));
  const slug = g.prog?.slug;
  const late = rows.filter((r) => r.overdue > 0).length;
  const cols: Col<PartnerRow>[] = [
    { label: "Organisation", width: "minmax(0, 1.2fr)", render: (r) => <span className="nx-cell-main"><span className="nx-thumb">{r.name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span><span><b>{r.name}</b><small>{r.kind}<span className="nx-only-s">{r.overdue ? ` · ${r.overdue} overdue` : r.open ? ` · ${r.open} open` : ""}</span></small></span></span> },
    { label: "Responsible for", width: "minmax(0, 1.4fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.responsibilities}</span> },
    { label: "Requests", width: "130px", hideOnPhone: true, render: (r) => r.overdue ? <Chip tone="bad">{r.overdue} overdue</Chip> : r.open ? <span className="nx-t2">{r.open} open</span> : <span className="nx-t3">None open</span> },
    { label: "People", width: "70px", hideOnPhone: true, render: (r) => <span className="num">{num(r.members)}</span> },
  ];
  return (
    <ListPage ws="gov" crumb={["Government", "Partners"]} title="Partners" sample={sample} eyebrow={<ProgName g={g} sample={sample} />}
      sub={o.loading ? "Reading partners…" : <><b className="num">{rows.length}</b> organisations in the programme{late ? <>, <b className="num">{late}</b> with overdue requests</> : null}. <About>Joining a programme does not open one organisation&apos;s records to another.</About><GhMark /></>}
      action={sample ? <Link href="/gov/programmes/sample?tab=Network" className="nx-btn is-quiet">Open the network</Link> : slug ? <Link href={`/gov/programmes/${slug}?tab=Network`} className="nx-btn is-quiet">Open the network</Link> : undefined}
      views={[{ id: "all", label: "All", test: () => true }, { id: "late", label: "Overdue requests", test: (r: PartnerRow) => r.overdue > 0 }, { id: "health", label: "Health and laboratory", test: (r: PartnerRow) => HEALTH.has(r.kind) }, { id: "field", label: "Field and municipal", test: (r: PartnerRow) => !HEALTH.has(r.kind) }]}
      columns={cols} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.name} search={(r) => `${r.name} ${r.kind} ${r.responsibilities}`}
      sort={(a, b) => b.overdue - a.overdue || b.open - a.open || a.name.localeCompare(b.name)}
      preview={(r) => ({ title: r.name, sub: r.kind, body: <><dl className="nx-props"><div><dt>Responsible for</dt><dd>{r.responsibilities}</dd></div><div><dt>People</dt><dd className="num">{num(r.members)}</dd></div><div><dt>Open requests</dt><dd className="num">{r.open}{r.overdue ? <>&nbsp;<Chip tone="bad">{r.overdue} overdue</Chip></> : null}</dd></div></dl>
        {r.services.length ? <><h3 className="nx-h3" style={{ marginTop: 18 }}>Services</h3><ul className="nx-svc">{r.services.map((s) => <li key={s.service}><span>{s.service}</span><Chip tone={STATUS_TONE[s.status] ?? "plain"}>{s.status}</Chip><small>confirmed {s.on}</small></li>)}</ul><p className="nx-note" style={{ marginTop: 12 }}><span>What the facility last confirmed. It is not a stock count.</span></p></> : null}</>,
        href: sample ? "/gov/programmes/sample?tab=Network" : slug ? `/gov/programmes/${slug}?tab=Network` : undefined, hrefLabel: "Open in the network", hrefNote: "Invitations and responsibilities are managed on the programme's Setup tab." })}
      loading={o.loading} error={o.err} empty={{ none: "No partners yet", hint: "Organisations join a programme by invitation." }} />
  );
}

/** A reviewing office's partners are the operators that send it packages. */
type OpRow = { id: string; name: string; sent: number; waiting: number; accepted: number; records: number; last: string | null };
function Operators() {
  const live = useLive();
  const office = live.orgFor("government")!;
  const [rows, setRows] = useState<OpRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    packages().then(async (all) => {
      const mine = all.filter((p) => p.office_id === office.org_id && isVisibleToOffice(p.status));
      const names = await orgNames([...new Set(mine.map((p) => p.ngo_id))]).catch(() => ({} as Record<string, string>));
      const by = new Map<string, Package[]>(); for (const p of mine) by.set(p.ngo_id, [...(by.get(p.ngo_id) ?? []), p]);
      if (alive) setRows([...by].map(([id, ps]) => { const ok = ps.filter((p) => p.status === "accepted" || p.status === "partially_accepted"); return { id, name: names[id] ?? "Operator", sent: ps.length, waiting: ps.filter((p) => p.status === "submitted").length, accepted: ok.length, records: ok.reduce((a, p) => a + (p.summary?.records ?? 0), 0), last: ps.map((p) => p.submitted_at).filter(Boolean).sort().pop() ?? null }; }));
    }).catch(() => { if (alive) { setRows([]); setErr("Packages could not be read just now."); } });
    return () => { alive = false; };
  }, [office.org_id]);
  const list = rows ?? [];
  const cols: Col<OpRow>[] = [
    { label: "Operator", width: "minmax(0, 1.4fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.name}</b><small>Last sent {r.last ? fmtDate(r.last) : "—"}<span className="nx-only-s"> · {r.waiting} waiting</span></small></span></span> },
    { label: "Sent", width: "80px", hideOnPhone: true, render: (r) => <span className="num">{r.sent}</span> },
    { label: "Waiting for you", width: "130px", hideOnPhone: true, render: (r) => r.waiting ? <Chip tone="accent">{r.waiting}</Chip> : <span className="nx-t3">None</span> },
    { label: "Records accepted", width: "140px", hideOnPhone: true, render: (r) => <span className="num">{r.records.toLocaleString("en-IN")}</span> },
  ];
  return (
    <ListPage ws="gov" crumb={["Government", "Partners"]} title="Partners" sample={false} eyebrow={office.name}
      sub={rows === null ? "Reading packages…" : <><b className="num">{list.length}</b> {list.length === 1 ? "operator has" : "operators have"} sent this office a package. <About>Sending a package does not make an operator a contracted partner.</About><GhMark /></>}
      views={[{ id: "all", label: "All", test: () => true }, { id: "w", label: "Waiting for you", test: (r: OpRow) => r.waiting > 0 }]}
      columns={cols} rows={list} rowKey={(r) => r.id} rowLabel={(r) => r.name} search={(r) => r.name} sort={(a, b) => b.waiting - a.waiting || b.sent - a.sent}
      preview={(r) => ({ title: r.name, sub: "Operator", body: <dl className="nx-props"><div><dt>Packages sent</dt><dd className="num">{r.sent}</dd></div><div><dt>Waiting for you</dt><dd className="num">{r.waiting}</dd></div><div><dt>Accepted</dt><dd className="num">{r.accepted}</dd></div><div><dt>Records accepted</dt><dd className="num">{r.records.toLocaleString("en-IN")}</dd></div></dl>, href: "/gov/verification", hrefLabel: "Open verification" })}
      loading={rows === null} error={err} empty={{ none: "No operator has sent a package yet" }} />
  );
}

/* ── Surveillance ─────────────────────────────────────────────────── */
type AlertRow = { key: string; severity: "urgent" | "attention" | "info"; kind: string; title: string; detail: string; area: string | null; at: string; ack: string | null };
const SEV: Record<AlertRow["severity"], { tone: Tone; label: string }> = { urgent: { tone: "bad", label: "Urgent" }, attention: { tone: "warn", label: "Attention" }, info: { tone: "plain", label: "Information" } };
const PERIODS = [{ d: 30, label: "30 days" }, { d: 90, label: "90 days" }, { d: 365, label: "12 months" }];

export function WeekBars({ weeks }: { weeks: { week: string; n: Count }[] }) {
  const max = Math.max(5, ...weeks.map((w) => val(w.n)));
  const W = 640, H = 150, gap = 4, bw = weeks.length ? (W - gap * (weeks.length - 1)) / weeks.length : 0;
  return (
    <svg className="nx-vbars" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`Exposures per week: ${weeks.map((w) => `${w.week} ${num(w.n)}`).join(", ")}`}>
      <line className="g" x1={0} x2={W} y1={H} y2={H} />
      {weeks.map((w, i) => { const sup = w.n === "<5"; const h = sup ? 6 : (val(w.n) / max) * H; const label = /^\d{4}-/.test(w.week) ? fmtDate(w.week) : w.week; const x = i * (bw + gap); return (
        <g key={w.week}><rect className={sup ? "is-sup" : ""} x={x} y={H - h} width={bw} height={Math.max(h, 1)} rx={2}><title>{`Week of ${label}: ${num(w.n)}`}</title></rect>
          {sup && bw >= 18 ? <text className="sup" x={x + bw / 2} y={H - 10} textAnchor="middle">&lt;5</text> : null}
          {i % Math.ceil(weeks.length / 6) === 0 ? <text x={x} y={H + 13}>{label}</text> : null}</g>); })}
    </svg>
  );
}

export function Surveillance() {
  const g = useGov();
  const [days, setDays] = useState(90);
  /* A phone shows the five newest alerts first; the rest are one tap away. */
  const phone = usePhone();
  const [allAlerts, setAllAlerts] = useState(false);
  const on = g.mode === "programme" && g.prog;
  const o = useCall<Overview>("oh_programme_overview", on ? { p_programme: g.prog!.id, p_days: days } : null, `sv:${g.prog?.id}:${days}`);
  const al = useCall<Alert[]>("oh_alerts", on ? { p_programme: g.prog!.id } : null, `al:${g.prog?.id}`);
  const sample = g.mode === "sample";
  const alerts: AlertRow[] = useMemo(() => sample ? ALERTS : (al.data ?? []).map((a) => ({ key: a.key, severity: a.severity, kind: ALERT_KIND[a.kind] ?? a.kind, title: a.title, detail: a.detail, area: a.area, at: fmtDate(a.at), ack: a.ack ? `Acknowledged${a.ack.by ? ` by ${a.ack.by}` : ""}, ${fmtDate(a.ack.at)}` : null })), [sample, al.data]);
  if (g.mode === "loading") return <Opening crumb="Surveillance" />;
  if (g.mode === "failed") return <Plain crumb="Surveillance" title="Surveillance"><Failed error={`Your programmes could not be read, so nothing is shown as missing. ${g.failed ?? ""}`} retry={g.retry} /></Plain>;
  if (g.mode === "none" || g.mode === "office") return <Plain crumb="Surveillance" title="Surveillance">{g.gov ? `${g.gov.name} is not part of a programme that shares surveillance on StrayPaw. Bite, laboratory and handoff signals appear here once it is.` : NOT_IN}</Plain>;
  const x = o.data;
  const weeks = sample ? SURV_WEEKS : x?.exposures?.by_week ?? [];
  const areas = sample ? SURV_AREAS : x?.exposures?.by_area ?? [];
  const total: Count = sample ? 70 : x?.exposures?.total ?? null, cat3: Count = sample ? 21 : x?.exposures?.category_iii ?? null;
  const washed: Count = sample ? 38 : x?.exposures?.washed ?? null, washedKnown: Count = sample ? 52 : x?.exposures?.washed_known ?? null;
  const s = sample ? { positive: 1, negative: 3, waiting: 2, positive_areas: ["Ward 08"], median_days_to_result: 4 } : x?.samples;
  const h = sample ? { open: 6, overdue: 2 } : x?.handoffs;
  const urgent = alerts.filter((a) => a.severity === "urgent" && !a.ack).length;
  const maxArea = Math.max(5, ...areas.map((a) => val(a.n)));
  const slug = g.prog?.slug;
  const fig = (n: ReactNode, label: string, sub?: string) => <div className="nx-fig"><b>{n}{sub ? <em>{sub}</em> : null}</b><span>{label}</span></div>;
  return (
    <Shell ws="gov" crumb={["Government", "Surveillance"]}>
      <div className="nx-page" style={{ maxWidth: 1080 }}>
        <div className="nx-head"><div><p className="nx-eyebrow"><ProgName g={g} sample={sample} />{sample ? <Sample /> : x?.programme.illustrative && !/illustrative/i.test(x.programme.name) ? <Chip tone="warn">Illustrative</Chip> : null}</p><h1 className="nx-h1">Surveillance</h1>
          <p className="nx-sub">{o.loading ? "Reading signals…" : <><b className="num">{num(total)}</b> exposures recorded in the last {PERIODS.find((p) => p.d === days)!.label}{s ? <>, <b className="num">{s.positive}</b> laboratory-confirmed {s.positive === 1 ? "positive" : "positives"}</> : null}. <About>Alerts follow fixed programme rules; none of them declares an outbreak.</About><GhMark /></>}</p></div>
          {sample ? <Link href="/gov/programmes/sample?tab=Work" className="nx-btn is-quiet is-keep">Open the response queue</Link> : slug ? <Link href={`/gov/programmes/${slug}?tab=Work`} className="nx-btn is-quiet is-keep">Open the response queue</Link> : null}
        </div>
        <div className="nx-bar" style={{ borderBottom: 0, paddingBottom: 0 }}><div className="nx-views" role="tablist" aria-label="Period">{PERIODS.map((p) => <button key={p.d} type="button" role="tab" aria-selected={days === p.d} className={`nx-view ${days === p.d ? "is-on" : ""}`} onClick={() => setDays(p.d)}>{days === p.d ? <span className="nx-view-bg" /> : null}<span>{p.label}</span></button>)}</div></div>
        {o.err || al.err ? <p className="nx-foot" role="alert">{o.err ?? al.err}</p> : null}
        <div className="nx-figs">
          {fig(num(total), "Exposures")}
          {fig(num(cat3), "Category III")}
          {fig(num(washed), "Wound washed", washedKnown !== null ? `of ${num(washedKnown)} known` : undefined)}
          {fig(s ? s.positive : "—", "Positive samples", s ? `of ${s.positive + s.negative} resulted` : undefined)}
          {fig(urgent, "Urgent alerts open")}
        </div>
        <div className="nx-cols" style={{ gridTemplateColumns: "minmax(0, 1fr) 300px" }}>
          <section className="nx-sec" aria-labelledby="sv-w">
            <div className="nx-sec-h"><h2 id="sv-w">Exposures per week</h2></div>
            {weeks.length ? <WeekBars weeks={weeks} /> : <p className="nx-sub">{o.loading ? "Reading…" : "No exposures recorded in this period."}</p>}
            <p className="nx-foot">Weeks with fewer than 5 show as &lt;5, without a bar height, so that no one can be identified. No patient details reach this page.</p>
          </section>
          <section className="nx-sec" aria-labelledby="sv-a" style={{ marginTop: 0 }}>
            <div className="nx-sec-h"><h2 id="sv-a">By area</h2></div>
            <div className="nx-bars">{areas.map((a) => <div key={a.area} className="nx-barrow" style={{ gridTemplateColumns: "96px minmax(0, 1fr) 40px" }}><span className="nx-t2">{a.area}</span><span className="nx-bar-t"><span style={{ width: a.n === "<5" ? "6%" : `${(val(a.n) / maxArea) * 100}%`, opacity: a.n === "<5" ? .45 : 1 }} /></span><em>{num(a.n)}</em></div>)}</div>
            {s?.positive_areas?.length ? <p className="nx-note" style={{ marginTop: 12 }}><MapPin size={13} /><span>Positive results in {s.positive_areas.join(", ")}. {s.waiting} {s.waiting === 1 ? "sample waits" : "samples wait"} for a result{s.median_days_to_result !== null ? `; results take ${s.median_days_to_result} days at the median` : ""}.</span></p> : null}
          </section>
        </div>
        <section className="nx-sec" aria-labelledby="sv-al" style={{ marginTop: 30 }}>
          <div className="nx-sec-h"><h2 id="sv-al">Alerts</h2><span className="nx-count">{alerts.length}</span>{h ? <span className="nx-link" style={{ cursor: "default" }}>{h.open} open handoffs{h.overdue ? `, ${h.overdue} overdue` : ""}</span> : null}</div>
          <ul className="nx-feed">{alerts.slice(0, phone && !allAlerts ? 5 : undefined).map((a) => <li key={a.key}><span className="nx-feed-i" style={a.severity === "urgent" ? { background: "var(--bad-soft)", color: "var(--bad)" } : undefined}><ShieldAlert size={12} /></span><div><b>{a.title}</b><p>{a.detail}</p><small><Chip tone={SEV[a.severity].tone}>{SEV[a.severity].label}</Chip> {a.kind}{a.area ? ` · ${a.area}` : ""} · {a.at}{a.ack ? ` · ${a.ack}` : ""}</small></div></li>)}</ul>
          {phone && !allAlerts && alerts.length > 5 ? <button type="button" className="nx-btn is-quiet gh-more" onClick={() => setAllAlerts(true)}>Show all {alerts.length}</button> : null}
          {!alerts.length && !al.loading ? <p className="nx-sub">No alerts.</p> : null}
          <p className="nx-foot">Each alert comes from a written rule, such as a positive result or a facility without vaccine. A person in the programme reviews and acknowledges it.</p>
        </section>
      </div>
    </Shell>
  );
}

/* ── Reports ──────────────────────────────────────────────────────── */
type OutRow = { id: string; title: string; source: string; kind: string; period: string; records: number; by: string; on: string; href?: string };
export function GovReports() {
  const g = useGov();
  const [tab, setTab] = useState<"Reports" | "Contracts">(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "Contracts" ? "Contracts" : "Reports"));
  const [ps, setPs] = useState<OutRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const officeId = g.mode === "office" ? g.gov!.org_id : null;
  useEffect(() => {
    if (!officeId) return;
    let alive = true;
    packages().then(async (all) => {
      const done = all.filter((p) => p.office_id === officeId && (p.status === "accepted" || p.status === "partially_accepted"));
      const names = await orgNames([...new Set(done.map((p) => p.ngo_id))]).catch(() => ({} as Record<string, string>));
      if (alive) setPs(done.map((p) => ({ id: p.id, title: p.title, source: names[p.ngo_id] ?? "Operator", kind: PACKAGE_LABEL[p.status], period: `${fmtDate(p.period_start)} – ${fmtDate(p.period_end)}`, records: p.summary?.records ?? 0, by: p.decided_by_name ?? "—", on: p.decided_at ? fmtDate(p.decided_at) : "—", href: `/gov/verification/${p.id}` })));
    }).catch(() => { if (alive) { setPs([]); setErr("Packages could not be read just now."); } });
    return () => { alive = false; };
  }, [officeId]);
  if (g.mode === "loading") return <Opening crumb="Reports" />;
  if (g.mode === "failed") return <Plain crumb="Reports" title="Reports"><Failed error={`Your programmes could not be read, so nothing is shown as missing. ${g.failed ?? ""}`} retry={g.retry} /></Plain>;
  if (g.mode === "none") return <Plain crumb="Reports" title="Reports">{g.gov ? `${g.gov.name} has no programme or reviewed packages on StrayPaw yet, so there is nothing to report from.` : NOT_IN}</Plain>;
  const sample = g.mode === "sample";
  const slug = g.prog?.slug;
  const outs: OutRow[] = sample ? OUTPUTS.map((o) => ({ ...o, href: "/gov/verification/v4" })) : ps ?? [];
  /* Contracts belong to a reviewing office: it reviews claims against them. */
  const withContracts = sample || g.mode === "office";
  const pick = (t: "Reports" | "Contracts") => { setTab(t); try { const u = new URL(window.location.href); if (t === "Contracts") u.searchParams.set("tab", t); else u.searchParams.delete("tab"); window.history.replaceState(null, "", u); } catch {} };
  const progReports = sample || g.mode === "programme" ? [
    { t: "Programme report", d: "Exposures, treatment completion, laboratory results, coverage and training for a chosen period, ready to print or save as PDF.", href: `/gov/programmes/${slug ?? "sample"}?tab=Report` },
    { t: "Coverage by area", d: "Vaccinated dogs against each area's dated estimate, with the estimate's source.", href: `/gov/programmes/${slug ?? "sample"}?tab=Coverage` },
    { t: "Data export", d: "Weekly exposures by area, species and category as a CSV, with small counts suppressed. No patient details.", href: `/gov/programmes/${slug ?? "sample"}?tab=Data` },
  ] : [];
  return (
    <Shell ws="gov" crumb={["Government", "Reports"]}>
      <div className="nx-page" style={{ maxWidth: 1000 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{g.mode === "office" ? g.gov!.name : <ProgName g={g} sample={sample} />}{sample ? <Sample /> : null}</p><h1 className="nx-h1">Reports</h1><p className="nx-sub">Every report is built from records and says where each figure comes from. <About>Kaju does not write reports.</About><GhMark /></p></div></div>
        {withContracts ? <div className="gh-tabwrap"><TabBar id="gov-reports" tabs={["Reports", "Contracts"]} value={tab} onChange={pick} label="Reports and contracts" /></div> : null}
        {withContracts && tab === "Contracts" ? <ContractsTab /> : <>
        {progReports.length ? <section className="nx-sec" aria-labelledby="rp-p" style={{ marginTop: 20 }}>
          <div className="nx-sec-h"><h2 id="rp-p">Programme reports</h2></div>
          <ul className="nx-feed">{progReports.map((r) => <li key={r.t}><span className="nx-feed-i"><FileText size={12} /></span><div>{r.href ? <Link href={r.href} className="nx-rep-a"><b>{r.t}</b><ArrowRight size={12} /></Link> : <b>{r.t}</b>}<p>{r.d}</p></div></li>)}</ul>
        </section> : null}
        {g.mode === "office" || sample ? <section className="nx-sec" aria-labelledby="rp-o" style={{ marginTop: 26 }}>
          <div className="nx-sec-h"><h2 id="rp-o">Accepted packages</h2><span className="nx-count">{outs.length}</span>{!sample ? <Link href="/gov/verification">Verification <ArrowRight size={12} /></Link> : null}</div>
          <div className="nx-table" role="group" aria-label="Accepted packages">
            <div className="nx-tr nx-th" aria-hidden="true" style={{ gridTemplateColumns: "minmax(0, 1.5fr) 110px 140px" }}><span>Package</span><span className="nx-hide-s">Records</span><span className="nx-hide-s">Decided</span></div>
            {outs.map((r) => { const inner = <><span className="nx-cell-main" style={{ minWidth: 0 }}><span><b>{r.title}</b><small>{r.source} · {r.period}{r.kind !== "Accepted" && r.kind !== "Accepted package" ? ` · ${r.kind}` : ""}<span className="nx-only-s"> · {r.records} records</span></small></span></span><span className="num nx-hide-s">{r.records.toLocaleString("en-IN")}</span><span className="nx-t2 nx-hide-s">{r.on} · {r.by}</span></>;
              return r.href ? <Link key={r.id} href={r.href} className="nx-tr" style={{ gridTemplateColumns: "minmax(0, 1.5fr) 110px 140px" }}>{inner}</Link> : <div key={r.id} className="nx-tr" style={{ gridTemplateColumns: "minmax(0, 1.5fr) 110px 140px" }}>{inner}</div>; })}
            {!sample && ps === null ? <p className="nx-sub" style={{ padding: "18px 0" }}>Reading…</p> : !outs.length ? <p className="nx-sub" style={{ padding: "18px 0" }}>No package has been accepted yet.</p> : null}
          </div>
          {err ? <p className="nx-foot" role="alert">{err}</p> : null}
          <p className="nx-foot">An accepted package is signed by the named reviewer on the date shown. Accepted is not the same as paid; StrayPaw does not process payments.</p>
        </section> : null}
        </>}
      </div>
    </Shell>
  );
}

/** Where an alert is acted on: the programme tab that holds its work (as on the programme's own Overview), otherwise
    Surveillance. Every row used to open the top of Surveillance, whatever it was about. */
const alertHref = (a: Alert, slug: string | null | undefined) => {
  const tab = a.kind === "positive_result" || a.kind === "followups_overdue" ? "Work" : a.kind === "pep_readiness" ? "Network" : a.kind === "coverage_below_target" ? "Coverage" : null;
  return tab && slug ? `/gov/programmes/${slug}?tab=${tab}` : "/gov/surveillance";
};

/* ── Overview for a programme coordinator or municipal officer ────── */
/** The programme lead's home: @Kaju, four figures with what they count drawn small, each opening the list it counts
    (Surveillance, Programmes below target, Partners with overdue requests), and three panels side by side (what needs a
    decision, coverage by area, partners), five rows each. Every figure comes from oh_programme_overview and oh_alerts;
    a read that failed shows "Not read". */
export function ProgrammeHome() {
  const g = useGov();
  const live = useLive();
  const tasks = useTasks(g.gov?.org_id ?? null);
  const on = g.mode === "programme" && g.prog;
  /* Ninety days, as Surveillance opens, so the exposures figure is the one that page shows first. */
  const o = useCall<Overview>("oh_programme_overview", on ? { p_programme: g.prog!.id, p_days: 90 } : null, `home:${g.prog?.id}:90`);
  const al = useCall<Alert[]>("oh_alerts", on ? { p_programme: g.prog!.id } : null, `al:${g.prog?.id}`);
  if (g.mode === "loading") return <Opening crumb="Overview" />;
  if (g.mode === "failed") return <Plain crumb="Overview" title="Overview"><Failed error={`Your programmes could not be read, so nothing is shown as missing. ${g.failed ?? ""}`} retry={g.retry} /></Plain>;
  if (g.mode !== "programme") return <Plain crumb="Overview" title="Overview">{g.gov ? `${g.gov.name} does not oversee a programme on StrayPaw yet.` : NOT_IN}</Plain>;
  const x = o.data;
  const target = x?.programme.target ?? TARGET;
  const areas = (x?.vaccination ?? []).map((v) => ({ ...v, cov: v.estimate && v.estimate.dogs > 0 ? v.vaccinated / v.estimate.dogs : null }));
  const low = areas.filter((a) => a.cov !== null && a.cov < target), reach = areas.filter((a) => a.cov !== null && a.cov >= target), noEst = areas.filter((a) => a.cov === null);
  const partners = [...(x?.partners ?? [])].sort((a, b) => b.overdue - a.overdue || b.open - a.open);
  const late = partners.filter((p) => p.overdue > 0);
  const openAlerts = (al.data ?? []).filter((a) => !a.ack);
  const urgent = openAlerts.filter((a) => a.severity === "urgent");
  const slug = g.prog?.slug;
  /* undefined while reading, null when the read failed: never shown as zero. */
  const fromO = (n: number | undefined) => (o.err ? null : o.loading ? undefined : n);
  const exp = x?.exposures?.total, cat3 = x?.exposures?.category_iii;
  const pct0 = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <Shell ws="gov" crumb={["Government", "Overview"]}>
      <div className="nx-page hm-page">
        <div className="nx-head"><div><p className="nx-eyebrow"><ProgName g={g} sample={false} />{x?.programme.illustrative && !/illustrative/i.test(x.programme.name) ? <Chip tone="warn">Illustrative</Chip> : null}</p><h1 className="nx-h1">Overview</h1>
          <p className="nx-sub">{o.loading ? "Reading the programme…" : <>{x?.programme.parent ? <>Part of {x.programme.parent.name}. </> : null}{x?.can_manage ? "You manage this programme." : "You can see this programme; changes are made by its coordinators."}<GhMark /></>}</p></div></div>
        <AtKaju role="programme" />
        {o.err ? <p className="hm-note is-bad" role="alert" style={{ marginTop: 16 }}>The programme could not be read: {o.err}. Its figures show “Not read”.</p> : null}
        <Tiles>
          <Tile label="Urgent alerts open" n={al.err ? null : al.loading ? undefined : urgent.length} tone={urgent.length ? "bad" : "plain"} href="/gov/surveillance"
            visual={openAlerts.length ? <Split parts={[{ n: urgent.length, tone: "bad", label: "urgent" }, { n: openAlerts.filter((a) => a.severity === "attention").length, tone: "warn", label: "attention" }, { n: openAlerts.filter((a) => a.severity === "info").length, tone: "plain", label: "for information" }]} /> : null} note={!al.loading && !al.err && !openAlerts.length ? "Nothing open" : undefined} />
          <Tile label={`Areas below ${pct0(target)}`} n={fromO(low.length)} tone={low.length ? "warn" : "plain"} href="/gov/programmes?view=low"
            visual={areas.length ? <Split parts={[{ n: reach.length, tone: "ok", label: "at target" }, { n: low.length, tone: "warn", label: "below" }, { n: noEst.length, tone: "plain", label: "no estimate" }]} /> : null} />
          <Tile label="Partners with overdue requests" n={fromO(late.length)} tone={late.length ? "warn" : "plain"} href="/gov/partners?view=late"
            visual={partners.length ? <Meter part={late.length} whole={partners.length} tone="warn" label={`${late.length} of ${partners.length} partners`} /> : null} />
          <Tile label="Exposures, 90 days" n={o.err ? null : o.loading ? undefined : typeof exp === "number" ? exp : null} text={exp === "<5" ? "Fewer than 5" : undefined} href="/gov/surveillance"
            visual={typeof exp === "number" && typeof cat3 === "number" && exp > 0 ? <Meter part={cat3} whole={exp} tone="bad" label={`${cat3} category III`} /> : cat3 === "<5" ? <span className="hm-tile-note">Category III: fewer than 5</span> : null} />
        </Tiles>
        <Grid cols={2}>
          <Panel id="h-u" title="Needs a decision">
            <Rows items={al.data ? [...urgent, ...openAlerts.filter((a) => a.severity === "attention")].map((a): Item => ({ id: a.key, title: a.title, meta: [ALERT_KIND[a.kind] ?? a.kind, a.area, fmtDate(a.at)].filter(Boolean).join(" · "), href: alertHref(a, slug), icon: <ShieldAlert size={16} />, tone: a.severity === "urgent" ? "bad" : "warn", chip: { text: a.severity === "urgent" ? "Urgent" : "Attention", tone: a.severity === "urgent" ? "bad" : "warn" }, kaju: `What should happen next about: ${a.title}?`, kajuLabel: `Ask @Kaju about ${a.title}` })) : null}
              loading={al.loading} error={al.err ? `Alerts could not be read: ${al.err}.` : null} all={{ href: "/gov/surveillance", label: "All alerts on Surveillance" }} empty="Nothing urgent or needing attention is open." />
          </Panel>
          <Panel id="h-c" title="Coverage by area" foot={<span>Lowest first. Coverage is vaccinated dogs on StrayPaw against a dated estimate.</span>}>
            <Rows items={x ? [...low.sort((a, b) => (a.cov ?? 0) - (b.cov ?? 0)), ...noEst, ...reach.sort((a, b) => (a.cov ?? 0) - (b.cov ?? 0))].map((a): Item => ({ id: a.area_id, title: a.area, meta: a.estimate ? `${a.vaccinated.toLocaleString("en-IN")} of ${a.estimate.dogs.toLocaleString("en-IN")} dogs vaccinated` : `${a.vaccinated.toLocaleString("en-IN")} vaccinated · no dated estimate`, href: slug ? `/gov/programmes/${slug}?tab=Coverage` : "/gov/programmes", icon: <MapPin size={16} />, tone: a.cov === null ? "plain" : a.cov < target ? "warn" : "ok", chip: { text: a.cov === null ? "No estimate" : pct0(a.cov), tone: a.cov === null ? "plain" : a.cov < target ? "warn" : "ok" } })) : null}
              loading={o.loading} error={o.err ? "Coverage could not be read." : null} all={{ href: "/gov/programmes" }} empty="No areas in this programme yet." />
          </Panel>
          <Panel id="h-p" title="Partners">
            <Rows items={x ? partners.map((p): Item => ({ id: p.id, title: p.name, meta: `${OH_KIND[p.kind] ?? p.kind}${p.responsibilities ? ` · ${p.responsibilities}` : ""}`, href: "/gov/partners", icon: <FileText size={16} />, tone: p.overdue ? "warn" : "plain", chip: p.overdue ? { text: `${p.overdue} overdue`, tone: "warn" } : { text: `${p.open} open`, tone: "plain" } })) : null}
              loading={o.loading} error={o.err ? "Partners could not be read." : null} all={{ href: "/gov/partners" }} empty="No partners in this programme yet." />
          </Panel>
          {g.gov ? <TasksPanel orgId={g.gov.org_id} userId={live.userId} tasks={tasks} /> : null}
        </Grid>
      </div>
    </Shell>
  );
}
