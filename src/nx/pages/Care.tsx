"use client";

import { About, GhMark } from "./gh/parts";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Lock, MapPin, Phone, ShieldAlert } from "lucide-react";
import { ALERT_KIND, HANDOFF, KIND_LABEL as OH_KIND, SERVICE_SHORT, SERVICE_STATUS, call, fmtDate, select, useNames, useRead, type Alert, type Count, type Handoff, type Network, type Overview, type Place, type Sample, type SampleEvent } from "@/oh/data";
import { ListPage, type Col } from "../ListPage";
import { Shell } from "../Shell";
import { Chip, Sample as SampleChip } from "../ui";
import { FACILITIES, LAB_DETAIL, LAB_SAMPLES, SURV_AREAS, SURV_WEEKS, ALERTS, type Tone } from "../fixtures";
import { useLive } from "../live";
import { NotHealth, STATUS, d, isLab, useClinic, word } from "./Health";
import { WeekBars } from "./Gov";
import { LabSteps } from "./health/Lab";

/* The rest of Healthcare: the facility directory and surveillance for a clinic; testing, results and quality for a
   laboratory. Read as the signed-in person through the functions the current app uses. Laboratory steps can be taken
   from a row's preview; confirming services is on Our services; referrals are on their own page. */

const num = (c: Count | undefined) => (c === null || c === undefined ? "—" : typeof c === "number" ? c.toLocaleString("en-IN") : c);
const val = (c: Count | undefined) => (typeof c === "number" ? c : 0);
const Opening = ({ crumb }: { crumb: string }) => <Shell ws="health" crumb={["Healthcare", crumb]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
const Only = ({ crumb, children }: { crumb: string; children: ReactNode }) => <Shell ws="health" crumb={["Healthcare", crumb]}><div className="nx-page"><h1 className="nx-h1">{crumb}</h1><p className="nx-sub" style={{ maxWidth: "62ch" }}>{children}</p></div></Shell>;

/** The programme this facility belongs to, from its place. */
function usePlace(orgId: string | null) {
  const places = useRead<Place[]>(() => call<Place[]>("oh_my_today"), "nx-places", !!orgId);
  const place = (places.data ?? []).find((p) => p.organisation_id === orgId) ?? null;
  return { place, prog: place?.programmes[0] ?? null, loading: !!orgId && places.loading && !places.data };
}

/* ── Facilities ───────────────────────────────────────────────────── */
type FacRow = { id: string; name: string; kind: string; area: string; hours: string; phone: string | null; services: { service: string; status: string; on: string }[] };
const SVC_TONE: Record<string, Tone> = { Available: "ok", Limited: "warn", "Not available": "bad", "Not confirmed recently": "plain" };
const gap = (r: FacRow) => r.services.some((s) => s.status !== "Available");
const facCols: Col<FacRow>[] = [
  { label: "Facility", width: "minmax(0, 1.2fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.name}</b><small>{r.kind} · {r.area}</small><span className="nx-only-s nx-chips" style={{ marginTop: 6 }}>{r.services.map((s) => <Chip key={s.service} tone={SVC_TONE[s.status] ?? "plain"}>{s.service}{s.status === "Available" ? "" : `: ${s.status.toLowerCase()}`}</Chip>)}</span></span></span> },
  { label: "Services, as last confirmed", width: "minmax(0, 1.6fr)", hideOnPhone: true, render: (r) => <span className="nx-chips">{r.services.map((s) => <Chip key={s.service} tone={SVC_TONE[s.status] ?? "plain"}>{s.service}{s.status === "Available" ? "" : `: ${s.status.toLowerCase()}`}</Chip>)}{!r.services.length ? <span className="nx-t3">None listed</span> : null}</span> },
  { label: "Hours", width: "170px", hideOnPhone: true, render: (r) => <span className="nx-t3" style={{ whiteSpace: "normal" }}>{r.hours}</span> },
];
export function Facilities() {
  const live = useLive(); const org = useClinic();
  const { place, prog, loading } = usePlace(live.org ? org?.org_id ?? null : null);
  const net = useRead<Network>(() => call("oh_programme_network", { p_programme: prog!.id }), `nx-net:${prog?.id}`, !!prog);
  const rows = useMemo<FacRow[]>(() => (net.data?.facilities ?? []).map((f) => ({ id: f.id, name: f.short_name ?? f.name, kind: OH_KIND[f.kind] ?? f.kind, area: f.area ?? "—", hours: f.hours ?? "Hours not listed", phone: f.phone, services: f.services.map((s) => ({ service: SERVICE_SHORT[s.service] ?? word(s.service), status: Date.parse(s.valid_until) < Date.now() ? "Not confirmed recently" : SERVICE_STATUS[s.status]?.label ?? word(s.status), on: fmtDate(s.verified_at) })) })), [net.data]);
  if (!live.ready || loading) return <Opening crumb="Facilities" />;
  const sample = !live.org;
  if (!sample && !org) return <NotHealth crumb="Facilities" />;
  if (!sample && !prog) return <Only crumb="Facilities">{org!.name} is not part of a programme on StrayPaw yet, so there is no shared facility directory.</Only>;
  const data = sample ? FACILITIES : rows;
  const vacc = data.filter((r) => r.services.some((s) => s.service === "Vaccine" && s.status === "Available")).length;
  const canConfirm = !!place?.capabilities.includes("confirm_service");
  return <ListPage ws="health" crumb={["Healthcare", "Facilities"]} title="Facilities" sample={sample} eyebrow={sample ? "East Zone rabies programme" : prog!.name}
    sub={sample || net.data ? <><b className="num">{vacc}</b> of {data.length} facilities last confirmed anti-rabies vaccine available. <About>Call before sending someone: a status is only as fresh as its date.</About><GhMark /></> : "Reading the directory…"}
    action={sample || canConfirm ? <Link href="/health/facilities/ours" className="nx-btn is-quiet is-keep">Confirm our services</Link> : undefined}
    views={[{ id: "all", label: "All", test: () => true }, { id: "vac", label: "Vaccine available", test: (r: FacRow) => r.services.some((s) => s.service === "Vaccine" && s.status === "Available") }, { id: "gap", label: "Gaps or unconfirmed", test: gap }]}
    columns={facCols} rows={data} rowKey={(r) => r.id} rowLabel={(r) => r.name} search={(r) => `${r.name} ${r.area} ${r.kind}`}
    preview={(r) => ({ title: r.name, sub: `${r.kind} · ${r.area}`, body: <><dl className="nx-props"><div><dt>Hours</dt><dd>{r.hours}</dd></div>{r.phone ? <div><dt>Phone</dt><dd><a href={`tel:${r.phone.replace(/\s/g, "")}`} style={{ color: "var(--accent)" }}><Phone size={12} /> {r.phone}</a></dd></div> : null}</dl>
      <h3 className="nx-h3" style={{ marginTop: 18 }}>Services</h3><ul className="nx-svc">{r.services.map((s) => <li key={s.service}><span>{s.service}</span><Chip tone={SVC_TONE[s.status] ?? "plain"}>{s.status}</Chip><small>confirmed {s.on}</small></li>)}</ul>
      <p className="nx-note" style={{ marginTop: 12 }}><MapPin size={13} /><span>What each facility last confirmed. It is not a live stock count.</span></p></> })}
    loading={!sample && !net.data && !net.error} error={net.error} empty={{ none: "No facilities listed", hint: "Facilities join the directory through the programme." }} />;
}

/* ── Surveillance, for a clinic ───────────────────────────────────── */
const SEV: Record<string, Tone> = { urgent: "bad", attention: "warn", info: "plain" };
export function HealthSurveillance() {
  const live = useLive(); const org = useClinic();
  const [days, setDays] = useState(90);
  const { prog, loading } = usePlace(live.org ? org?.org_id ?? null : null);
  const o = useRead<Overview>(() => call("oh_programme_overview", { p_programme: prog!.id, p_days: days }), `nx-hsv:${prog?.id}:${days}`, !!prog);
  const al = useRead<Alert[]>(() => call("oh_alerts", { p_programme: prog!.id }), `nx-hal:${prog?.id}`, !!prog);
  if (!live.ready || loading) return <Opening crumb="Surveillance" />;
  const sample = !live.org;
  if (!sample && !org) return <NotHealth crumb="Surveillance" />;
  if (!sample && !prog) return <Only crumb="Surveillance">{org!.name} is not part of a programme on StrayPaw yet, so there are no shared signals to show.</Only>;
  const x = o.data;
  const weeks = sample ? SURV_WEEKS : x?.exposures?.by_week ?? [];
  const areas = sample ? SURV_AREAS : x?.exposures?.by_area ?? [];
  const alerts = sample ? ALERTS.map((a) => ({ key: a.key, sev: a.severity, title: a.title, detail: a.detail, meta: `${a.kind}${a.area ? ` · ${a.area}` : ""} · ${a.at}` }))
    : (al.data ?? []).map((a) => ({ key: a.key, sev: a.severity, title: a.title, detail: a.detail, meta: `${ALERT_KIND[a.kind] ?? a.kind}${a.area ? ` · ${a.area}` : ""} · ${fmtDate(a.at)}` }));
  const maxArea = Math.max(5, ...areas.map((a) => val(a.n)));
  const total: Count = sample ? 70 : x?.exposures?.total ?? null;
  return (
    <Shell ws="health" crumb={["Healthcare", "Surveillance"]}>
      <div className="nx-page" style={{ maxWidth: 1080 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{sample ? "East Zone rabies programme" : prog!.name}{sample ? <SampleChip /> : null}</p><h1 className="nx-h1">Surveillance</h1>
          <p className="nx-sub">{!sample && o.loading && !x ? "Reading signals…" : <><b className="num">{num(total)}</b> exposures across the programme in the last {days === 365 ? "12 months" : `${days} days`}. <About>These are programme totals, not this facility&apos;s patients.</About><GhMark /></>}</p></div></div>
        <div className="nx-bar" style={{ borderBottom: 0, paddingBottom: 0 }}><div className="nx-views" role="tablist" aria-label="Period">{[30, 90, 365].map((n) => <button key={n} type="button" role="tab" aria-selected={days === n} className={`nx-view ${days === n ? "is-on" : ""}`} onClick={() => setDays(n)}>{days === n ? <span className="nx-view-bg" /> : null}<span>{n === 365 ? "12 months" : `${n} days`}</span></button>)}</div></div>
        {o.error || al.error ? <p className="nx-foot" role="alert">{o.error ?? al.error}</p> : null}
        <div className="nx-cols" style={{ gridTemplateColumns: "minmax(0, 1fr) 300px", marginTop: 18 }}>
          <section className="nx-sec" aria-labelledby="hs-w"><div className="nx-sec-h"><h2 id="hs-w">Exposures per week</h2></div>{weeks.length ? <WeekBars weeks={weeks} /> : <p className="nx-sub">No exposures recorded in this period.</p>}<p className="nx-foot">Weeks with fewer than 5 show as &lt;5, without a bar height. No patient details reach this page.</p></section>
          <section className="nx-sec" aria-labelledby="hs-a" style={{ marginTop: 0 }}><div className="nx-sec-h"><h2 id="hs-a">By area</h2></div><div className="nx-bars">{areas.slice(0, 10).map((a) => <div key={a.area} className="nx-barrow" style={{ gridTemplateColumns: "96px minmax(0, 1fr) 40px" }}><span className="nx-t2">{a.area}</span><span className="nx-bar-t"><span style={{ width: a.n === "<5" ? "6%" : `${(val(a.n) / maxArea) * 100}%`, opacity: a.n === "<5" ? .45 : 1 }} /></span><em>{num(a.n)}</em></div>)}</div></section>
        </div>
        <section className="nx-sec" aria-labelledby="hs-al" style={{ marginTop: 30 }}>
          <div className="nx-sec-h"><h2 id="hs-al">Alerts you can see</h2><span className="nx-count">{alerts.length}</span></div>
          <ul className="nx-feed">{alerts.slice(0, 10).map((a) => <li key={a.key}><span className="nx-feed-i" style={a.sev === "urgent" ? { background: "var(--bad-soft)", color: "var(--bad)" } : undefined}><ShieldAlert size={12} /></span><div><b>{a.title}</b><p>{a.detail}</p><small><Chip tone={SEV[a.sev] ?? "plain"}>{a.sev === "urgent" ? "Urgent" : a.sev === "attention" ? "Attention" : "Information"}</Chip> {a.meta}</small></div></li>)}</ul>
          {!alerts.length && !al.loading ? <p className="nx-sub">No alerts for this facility.</p> : null}
          <p className="nx-foot">Alerts come from written programme rules. None of them is a diagnosis or declares an outbreak.</p>
        </section>
      </div>
    </Shell>
  );
}

/* ── Laboratory: testing, results, quality ────────────────────────── */
type LabRow = { raw?: Sample; id: string; code: string; species: string; type: string; from: string; area: string; collected: string; status: string; result: string | null; days: number; received: string | null; bench: number | null; method: string | null; by: string | null; on: string | null; notice: string | null; noticeTone: Tone; custody: { what: string; who: string; when: string; note?: string }[]; href?: string; collectedAt?: number; receivedAt?: number; resultedAt?: number; rejectedNote?: string | null };
const STEP: Record<string, string> = { collected: "Collected", dispatched: "Dispatched", received: "Received", testing: "Testing started", resulted: "Result released", rejected: "Rejected" };
const bench = (r: LabRow) => r.bench ?? 0;
const NOTICE: Record<string, string> = { open: "not opened yet", accepted: "being acted on", done: "closed", declined: "declined" };

function useLab() {
  const live = useLive(); const org = useClinic();
  const lab = !!org && isLab(org);
  const samples = useRead<Sample[]>(() => select<Sample>("oh_samples", { laboratory_id: org!.org_id }), `nx-lab:${org?.org_id}`, lab);
  const events = useRead<SampleEvent[]>(() => select<SampleEvent>("oh_sample_events", {}, "id,sample_id,at,actor_name,organisation_id,action,note", 1000), `nx-lab-ev:${org?.org_id}`, lab);
  const notices = useRead<Handoff[]>(() => select<Handoff>("oh_handoffs", { kind: "result_notice" }), `nx-lab-ho:${org?.org_id}`, lab);
  const names = useNames(lab);
  const now = Date.now();
  const rows = useMemo<LabRow[]>(() => {
    if (!samples.data) return [];
    const ev = new Map<string, SampleEvent[]>(); for (const e of events.data ?? []) ev.set(e.sample_id, [...(ev.get(e.sample_id) ?? []), e]);
    return samples.data.map((s) => {
      const es = (ev.get(s.id) ?? []).sort((a, b) => a.at.localeCompare(b.at));
      const rec = es.find((e) => e.action === "received");
      const n = (notices.data ?? []).filter((h) => h.sample_id === s.id);
      const sent = n[0];
      return {
        id: s.id, code: s.code, species: word(s.species), type: word(s.sample_type), from: names.org(s.submitted_by) ?? "Submitting partner", area: names.area(s.area_id) ?? s.place ?? "—", collected: d(s.collected_on), status: word(s.status),
        result: s.status === "resulted" && s.result ? word(s.result) : null, days: Math.floor((now - Date.parse(s.collected_on)) / 864e5),
        received: rec ? fmtDate(rec.at) : null, bench: rec ? Math.floor((now - Date.parse(rec.at)) / 864e5) : null, method: s.method, by: s.resulted_by_name, on: s.resulted_at ? fmtDate(s.resulted_at) : null,
        notice: sent ? `Sent to ${names.org(sent.to_org) ?? "a partner"}, ${NOTICE[sent.status] ?? HANDOFF[sent.status]?.label.toLowerCase() ?? sent.status}` : null, noticeTone: sent ? (sent.status === "done" ? "ok" : "accent") : s.result === "positive" ? "bad" : "plain",
        custody: es.map((e) => ({ what: STEP[e.action] ?? word(e.action), who: e.actor_name ?? "—", when: fmtDate(e.at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }), note: e.note ?? undefined })),
        href: `/health/samples/${s.id}`, raw: s,
        collectedAt: Date.parse(s.collected_on), receivedAt: rec ? Date.parse(rec.at) : undefined, resultedAt: s.resulted_at ? Date.parse(s.resulted_at) : undefined, rejectedNote: es.find((e) => e.action === "rejected")?.note ?? null,
      };
    });
  }, [samples.data, events.data, notices.data, names, now]);
  const sample = live.ready && !live.org;
  const data: LabRow[] = sample ? LAB_SAMPLES.map((r) => { const x = LAB_DETAIL[r.id]; return { ...r, ...x, noticeTone: x.notice ? "accent" : r.result === "Positive" ? "bad" : "plain", href: `/health/samples/${r.id}` }; }) : rows;
  const reload = () => { samples.reload(); events.reload(); };
  return { live, org, lab, sample, data, error: samples.error ?? events.error, loading: !sample && !samples.data && !samples.error, reload };
}
function LabGate({ crumb, l, children }: { crumb: string; l: ReturnType<typeof useLab>; children: () => ReactNode }) {
  if (!l.live.ready) return <Opening crumb={crumb} />;
  if (!l.sample && !l.org) return <NotHealth crumb={crumb} />;
  if (!l.sample && !l.lab) return <Only crumb={crumb}>{crumb} is a laboratory&apos;s work. {l.org!.name} is not a laboratory.</Only>;
  return <>{children()}</>;
}
const custody = (r: LabRow) => <><h3 className="nx-h3" style={{ marginTop: 18 }}>Chain of custody</h3><ol className="nx-tl">{r.custody.map((c, i) => <li key={i}><span className={`nx-tl-d ${i === r.custody.length - 1 ? "t-accent" : "t-ok"}`} /><div><b>{c.what}</b><small>{c.who} · {c.when}</small>{c.note ? <p>{c.note}</p> : null}</div></li>)}</ol></>;
const labNote = <p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>Each step is taken by named laboratory staff and recorded with their name. StrayPaw does not choose protocols or interpret results, and Kaju never does.</span></p>;
/* The next laboratory step, from the row's preview; the sample page has the full chain of custody. */
const steps = (r: LabRow, l: { sample: boolean; reload: () => void }) => (l.sample ? <LabSteps compact sample s={{ id: r.id, code: r.code, status: r.status.toLowerCase(), species: r.species.toLowerCase(), sample_type: r.type.toLowerCase().replace(/ /g, "_") }} onDone={() => {}} /> : r.raw ? <LabSteps compact s={r.raw} onDone={l.reload} /> : null);

export function Testing() {
  const l = useLab();
  const rows = l.data.filter((r) => r.status === "Received" || r.status === "Testing");
  const cols: Col<LabRow>[] = [
    { label: "Sample", width: "minmax(0, 1.2fr)", render: (r) => <span className="nx-cell-main"><span><b className="num">{r.code}</b><small>{r.species} · {r.type}<span className="nx-only-s"> · {bench(r)} {bench(r) === 1 ? "day" : "days"} here</span></small></span></span> },
    { label: "From", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.from}</span> },
    { label: "Received", width: "110px", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.received ?? "—"}</span> },
    { label: "Days here", width: "90px", hideOnPhone: true, render: (r) => <span className="num" style={{ color: bench(r) > 5 ? "var(--bad)" : undefined }}>{bench(r)}</span> },
    { label: "Status", width: "110px", render: (r) => <Chip tone={STATUS[r.status] ?? "plain"}>{r.status}</Chip> },
  ];
  return <LabGate crumb="Testing" l={l}>{() => <ListPage ws="health" crumb={["Healthcare", "Testing"]} title="Testing" sample={l.sample} eyebrow={l.sample ? "Reference Rabies Diagnostic Laboratory" : l.org!.name}
    sub={<><b className="num">{rows.length}</b> {rows.length === 1 ? "sample is" : "samples are"} in the laboratory{rows.length ? <>, the longest for <b className="num">{Math.max(...rows.map(bench))}</b> days</> : null}. Oldest first.<GhMark /></>}
    views={[{ id: "all", label: "In the laboratory", test: () => true }, { id: "r", label: "Received, not started", test: (r: LabRow) => r.status === "Received" }, { id: "t", label: "Testing", test: (r: LabRow) => r.status === "Testing" }]}
    columns={cols} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.code} search={(r) => `${r.code} ${r.species} ${r.from}`} sort={(a, b) => bench(b) - bench(a)}
    preview={(r) => ({ title: <span className="num">{r.code}</span>, sub: <>{r.species} · {r.type} <Chip tone={STATUS[r.status] ?? "plain"}>{r.status}</Chip></>, body: <><dl className="nx-props"><div><dt>From</dt><dd>{r.from}</dd></div><div><dt>Place</dt><dd>{r.area}</dd></div><div><dt>Collected</dt><dd>{r.collected}</dd></div><div><dt>Received</dt><dd>{r.received ?? "—"}</dd></div><div><dt>Method</dt><dd>{r.method ?? "Recorded with the result"}</dd></div></dl>{steps(r, l)}{custody(r)}{labNote}</>, href: r.href, hrefLabel: "Open the sample", hrefNote: "The chain of custody and the result are on the sample." })}
    loading={l.loading} error={l.error} empty={{ none: "Nothing is in the laboratory", hint: "Received samples appear here until a result is released." }} />}</LabGate>;
}

export function Results() {
  const l = useLab();
  const rows = l.data.filter((r) => r.status === "Resulted");
  const cols: Col<LabRow>[] = [
    { label: "Sample", width: "minmax(0, 1.1fr)", render: (r) => <span className="nx-cell-main"><span><b className="num">{r.code}</b><small>{r.species} · {r.area}<span className="nx-only-s"> · {r.on}</span></small></span></span> },
    { label: "Result", width: "110px", render: (r) => <Chip tone={r.result === "Positive" ? "bad" : r.result === "Inconclusive" ? "warn" : "plain"}>{r.result ?? "—"}</Chip> },
    { label: "Released", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.on ?? "—"} · {r.by ?? "—"}</span> },
    { label: "Notice", width: "minmax(0, 1.1fr)", hideOnPhone: true, render: (r) => r.notice ? <span className="nx-t2">{r.notice}</span> : <span className="nx-t3" style={{ color: r.result === "Positive" ? "var(--bad)" : undefined }}>{r.result === "Positive" ? "No notice sent" : "Not needed"}</span> },
  ];
  const pos = rows.filter((r) => r.result === "Positive");
  return <LabGate crumb="Results" l={l}>{() => <ListPage ws="health" crumb={["Healthcare", "Results"]} title="Results" sample={l.sample} eyebrow={l.sample ? "Reference Rabies Diagnostic Laboratory" : l.org!.name}
    sub={<><b className="num">{rows.length}</b> released, <b className="num">{pos.length}</b> positive{pos.filter((r) => !r.notice).length ? <>, <b className="num">{pos.filter((r) => !r.notice).length}</b> without a notice to a partner</> : null}. <About>A result is released when a laboratory scientist records it with the method and validates it.</About><GhMark /></>}
    views={[{ id: "all", label: "All", test: () => true }, { id: "pos", label: "Positive", test: (r: LabRow) => r.result === "Positive" }, { id: "no", label: "Positive, no notice", test: (r: LabRow) => r.result === "Positive" && !r.notice }]}
    columns={cols} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.code} search={(r) => `${r.code} ${r.species} ${r.area} ${r.result ?? ""}`} sort={(a, b) => (b.resultedAt ?? 0) - (a.resultedAt ?? 0)}
    preview={(r) => ({ title: <span className="num">{r.code}</span>, sub: <>{r.species} · {r.type} <Chip tone={r.result === "Positive" ? "bad" : "plain"}>{r.result ?? "—"}</Chip></>, body: <><dl className="nx-props"><div><dt>Method</dt><dd>{r.method ?? "Not recorded"}</dd></div><div><dt>Released by</dt><dd>{r.by ?? "—"}</dd></div><div><dt>Released</dt><dd>{r.on ?? "—"}</dd></div><div><dt>Notice</dt><dd>{r.notice ?? (r.result === "Positive" ? "None sent" : "Not needed")}</dd></div><div><dt>From</dt><dd>{r.from}</dd></div></dl>{steps(r, l)}{custody(r)}{labNote}</>, href: r.href, hrefLabel: "Open the sample", hrefNote: "The signed result and its notice are on the sample." })}
    loading={l.loading} error={l.error} empty={{ none: "No results released yet" }} />}</LabGate>;
}

const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export function Quality() {
  const l = useLab();
  const done = l.data.filter((r) => r.status === "Resulted");
  const day = 864e5;
  const tatAll = l.sample ? [7, 4, 5, 3, 4] : done.filter((r) => r.resultedAt && r.collectedAt).map((r) => (r.resultedAt! - r.collectedAt!) / day);
  const tatLab = l.sample ? [3, 2, 3, 2] : done.filter((r) => r.resultedAt && r.receivedAt).map((r) => (r.resultedAt! - r.receivedAt!) / day);
  const rejected = l.data.filter((r) => r.status === "Rejected");
  const inconclusive = done.filter((r) => r.result === "Inconclusive").length;
  const waiting = l.data.filter((r) => (r.status === "Received" || r.status === "Testing") && bench(r) > 5);
  const f = (n: number | null) => (n === null ? "—" : n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n).toString());
  const fig = (v: ReactNode, label: string, sub?: string) => <div className="nx-fig"><b>{v}{sub ? <em>{sub}</em> : null}</b><span>{label}</span></div>;
  return <LabGate crumb="Quality" l={l}>{() =>
    <Shell ws="health" crumb={["Healthcare", "Quality"]}>
      <div className="nx-page" style={{ maxWidth: 960 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{l.sample ? "Reference Rabies Diagnostic Laboratory" : l.org?.name}{l.sample ? <SampleChip /> : null}</p><h1 className="nx-h1">Quality</h1><p className="nx-sub">Turnaround and rejected samples, from the steps staff recorded. {done.length} {done.length === 1 ? "result" : "results"} released so far.<GhMark /></p></div></div>
        {l.error ? <p className="nx-foot" role="alert">{l.error}</p> : null}
        <div className="nx-figs">
          {fig(f(median(tatAll)), "Days, collected to result", "median")}
          {fig(f(median(tatLab)), "Days, received to result", "median")}
          {fig(waiting.length, "In the laboratory over 5 days")}
          {fig(rejected.length, "Rejected samples")}
          {fig(inconclusive, "Inconclusive results")}
        </div>
        <section className="nx-sec" aria-labelledby="q-r" style={{ marginTop: 26 }}>
          <div className="nx-sec-h"><h2 id="q-r">Rejected samples</h2><span className="nx-count">{rejected.length}</span></div>
          {rejected.length ? <ul className="nx-feed">{rejected.map((r) => <li key={r.id}><span className="nx-feed-i"><ShieldAlert size={12} /></span><div><b className="num">{r.code}</b><p>{r.rejectedNote ?? "No reason recorded"}</p><small>{r.from} · collected {r.collected}</small></div></li>)}</ul> : <p className="nx-sub">No sample has been rejected.</p>}
        </section>
        {waiting.length ? <section className="nx-sec" aria-labelledby="q-w"><div className="nx-sec-h"><h2 id="q-w">Waiting over 5 days</h2><Link href="/health/testing">Testing</Link></div><ul className="nx-feed">{waiting.map((r) => <li key={r.id}><span className="nx-feed-i"><ShieldAlert size={12} /></span><div><b className="num">{r.code}</b><p>{r.species} · {r.type} · {bench(r)} days since it was received</p></div></li>)}</ul></section> : null}
        <p className="nx-note" style={{ marginTop: 26, maxWidth: 680 }}><Lock size={13} /><span>StrayPaw does not hold standard operating procedures, competency records or instrument logs. A laboratory that runs its own information system keeps those there.</span></p>
      </div>
    </Shell>
  }</LabGate>;
}
