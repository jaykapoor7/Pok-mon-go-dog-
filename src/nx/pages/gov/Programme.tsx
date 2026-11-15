"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Copy, Download, MapPin, Plus, Printer, ShieldAlert, Upload } from "lucide-react";
import { AreaIntel } from "./AreaIntel";
import { ALERT_KIND, AUDIENCE, HANDOFF, HANDOFF_KIND, KIND_LABEL, MODULES, ROLE_LABEL, SERVICE_LABEL, SERVICE_SHORT, SERVICE_STATUS, call, fmtDate, select, showCount, useNames, useRead, type Alert, type Count, type Handoff, type Kind, type Network, type Overview, type Place, type Role } from "@/oh/data";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Empty, Failed, Field, Modal, Props, RecordHead, Skeleton, TabBar, day, dayTime, toast, useAct } from "../../kit";
import { useLive } from "../../live";
import type { Tone } from "../../fixtures";
import { ago, capsIn, indiaToday, uploadLogo, usePlaces } from "../../data/govhealth";
import { SAMPLE_ALERTS, SAMPLE_HANDOFFS, SAMPLE_NAMES, SAMPLE_NETWORK, SAMPLE_OVERVIEW, SAMPLE_PROGRAMME } from "../../data/govhealth-samples";
import { Block, Opening, SignedConfirm, TryLink } from "../gh/parts";
import { WeekBars } from "../Gov";

/* One programme, seen whole: what needs a decision, coverage against dated estimates, the care network, the work
   between partners, the data extract, a printable report and, for its leads, its setup. What each person sees and
   can change follows from their role in the programme; the database checks every change again. Human counts below
   the programme's threshold arrive already hidden as "<5". */

type Prog = { id: string; slug: string; name: string; parent_id: string | null; summary: string | null; status: string; vaccination_target: number; config: { modules?: string[]; suppress_below?: number; followup_due_days?: number; dog_revaccination_days?: number; alert_window_days?: number }; plan: string; illustrative: boolean; time_zone: string };
type Tab = "Overview" | "Coverage" | "Network" | "Work" | "Data" | "Report" | "Setup";
type Ctx = { sample: boolean; p: Prog; caps: Set<string>; places: Place[]; go: (t: Tab) => void };
const ALL_MODULES = ["bite_care", "laboratory", "followups", "vaccination", "services", "training"];
const STATUS: Record<string, string> = { planning: "Planning", pilot: "Pilot", active: "Active", closed: "Closed" };
const PLAN: Record<string, string> = { pilot: "Pilot programme", programme: "City programme", state: "State programme", national: "National programme" };
const SEV: Record<string, { tone: Tone; label: string }> = { urgent: { tone: "bad", label: "Urgent" }, attention: { tone: "warn", label: "Attention" }, info: { tone: "plain", label: "Information" } };
const HTONE: Record<string, Tone> = { open: "accent", accepted: "warn", done: "ok", declined: "plain" };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const INVITE_ROLES: Record<string, Role[]> = { hospital: ["clinician", "nurse", "records"], clinic: ["clinician", "nurse", "records"], laboratory: ["lab_scientist", "trainer"], coordinator: ["coordinator", "analyst", "trainer"], state: ["coordinator", "analyst"], municipal: ["coordinator", "field", "analyst"], research: ["analyst"], training: ["trainer"] };

/** A read that is sample data when signed out, and the database's answer otherwise. */
function useOh<T>(sample: boolean, sampleData: T, read: () => Promise<{ data: T | null; error: string | null }>, key: string, on = true) {
  const r = useRead<T>(read, key, !sample && on);
  return sample ? { data: sampleData as T | null, error: null as string | null, loading: false, reload: () => {} } : { data: r.data, error: r.error, loading: r.loading && !r.data, reload: r.reload };
}

export function ProgrammeRecord({ slug, tab }: { slug: string; tab?: string }) {
  const live = useLive();
  if (!live.ready) return <Opening ws="gov" crumb={["Programmes", "Programme"]} />;
  if (!live.org) return <View sample p={{ ...SAMPLE_PROGRAMME, slug }} caps={new Set(["manage", "invite", "oversee", "ack_alert", "record_training", "record_estimate", "raise_handoff", "configure_network", "act_handoff"])} places={[]} first={tab} />;
  return <LiveProgramme slug={slug} tab={tab} />;
}

function LiveProgramme({ slug, tab }: { slug: string; tab?: string }) {
  const prog = useRead<Prog[]>(() => select<Prog>("oh_programmes", { slug }, "id,slug,name,parent_id,summary,status,vaccination_target,config,plan,illustrative,time_zone", 1), `nx-prog:${slug}`);
  const pl = usePlaces(true);
  const p = prog.data?.[0] ?? null;
  const caps = useMemo(() => capsIn(pl.places, p?.id), [pl.places, p?.id]);
  if ((prog.loading && !prog.data) || pl.loading) return <Opening ws="gov" crumb={["Programmes", "Programme"]} />;
  if (prog.error) return <Shell ws="gov" crumb={["Programmes", "Programme"]}><div className="nx-page"><Failed error={prog.error} retry={prog.reload} /></div></Shell>;
  if (!p) return <Shell ws="gov" crumb={["Programmes", "Programme"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Programme</h1><Empty title="This programme is not visible to you" hint="Only organisations taking part in a programme can open it." action={<Link href="/gov/programmes" className="nx-btn is-quiet">Back to programmes</Link>} /></div></Shell>;
  return <View sample={false} p={p} caps={caps} places={pl.places} first={tab} reloadProg={prog.reload} />;
}

function View({ sample, p, caps, places, first, reloadProg }: { sample: boolean; p: Prog; caps: Set<string>; places: Place[]; first?: string; reloadProg?: () => void }) {
  const tabs: Tab[] = ["Overview", "Coverage", "Network", "Work", ...(caps.has("analyse") || caps.has("oversee") ? ["Data" as Tab] : []), "Report", ...(caps.has("manage") || caps.has("invite") ? ["Setup" as Tab] : [])];
  const [tab, setTab] = useState<Tab>(() => (tabs.includes(first as Tab) ? (first as Tab) : "Overview"));
  const go = (t: Tab) => { setTab(t); try { const u = new URL(window.location.href); if (t === "Overview") u.searchParams.delete("tab"); else u.searchParams.set("tab", t); window.history.replaceState(null, "", u); } catch {} };
  const ctx: Ctx = { sample, p, caps, places, go };
  return (
    <Shell ws="gov" crumb={["Programmes", p.name]}>
      <div className="gh-noprint">
        <RecordHead av={<MapPin size={18} />} title={<>{p.name}{sample ? <Sample /> : null}</>}
          sub={<>{PLAN[p.plan] ?? "Programme"}{p.plan === p.status ? "" : `, ${(STATUS[p.status] ?? p.status).toLowerCase()}`} · target {pct(p.vaccination_target)} dog vaccination </>}
          chips={p.illustrative && !sample ? <Chip tone="warn">Illustrative</Chip> : null} />
        <TabBar id="gh-prog" tabs={tabs} value={tab} onChange={go} label="Programme sections" />
      </div>
      {tab === "Overview" ? <OverviewTab {...ctx} /> : tab === "Coverage" ? <CoverageTab {...ctx} /> : tab === "Network" ? <NetworkTab {...ctx} /> : tab === "Work" ? <WorkTab {...ctx} /> : tab === "Data" ? <DataTab {...ctx} /> : tab === "Report" ? <ReportTab {...ctx} /> : <SetupTab {...ctx} reloadProg={reloadProg} />}
    </Shell>
  );
}

const Periods = ({ days, set }: { days: number; set: (d: number) => void }) => (
  <div className="nx-views" role="tablist" aria-label="Period">{[[30, "30 days"], [90, "90 days"], [365, "12 months"]].map(([d, l]) => <button key={d} type="button" role="tab" aria-selected={days === d} className={`nx-view ${days === d ? "is-on" : ""}`} onClick={() => set(d as number)}>{days === d ? <span className="nx-view-bg" /> : null}<span>{l}</span></button>)}</div>
);

/* ── Overview: what needs a decision, the figures, partners and training ── */
function OverviewTab({ sample, p, caps, go }: Ctx) {
  const [days, setDays] = useState(90);
  const o = useOh<Overview>(sample, SAMPLE_OVERVIEW, () => call("oh_programme_overview", { p_programme: p.id, p_days: days }), `nx-pov:${p.id}:${days}`);
  const al = useOh<Alert[]>(sample, SAMPLE_ALERTS, () => call("oh_alerts", { p_programme: p.id }), `nx-pal:${p.id}`);
  const [ack, setAck] = useState<Alert | null>(null);
  const [training, setTraining] = useState(false);
  const d = o.data;
  const mods = d?.programme.modules ?? p.config.modules ?? ALL_MODULES;
  const openAlerts = (al.data ?? []).filter((a) => !a.ack);
  const fig = (v: ReactNode, label: string, t?: Tab) => t ? <button key={label} type="button" className="nx-fig" onClick={() => go(t)}><b>{v}</b><span>{label}<ArrowRight size={12} /></span></button> : <div key={label} className="nx-fig"><b>{v}</b><span>{label}</span></div>;
  const target = (a: Alert): Tab | null => a.kind === "positive_result" || a.kind === "followups_overdue" ? "Work" : a.kind === "pep_readiness" ? "Network" : a.kind === "coverage_below_target" ? "Coverage" : null;
  return (
    <div className="gh-body">
      <div className="nx-head"><p className="nx-sub" style={{ margin: 0 }}>{al.error ? "What needs a decision could not be read." : al.loading ? "Reading what needs a decision…" : openAlerts.length ? <><b className="num">{openAlerts.length}</b> {openAlerts.length === 1 ? "alert needs" : "alerts need"} a decision{openAlerts.filter((a) => a.severity === "urgent").length ? <>, <b className="num">{openAlerts.filter((a) => a.severity === "urgent").length}</b> urgent</> : null}. Each comes from a written programme rule; none declares an outbreak.</> : "Nothing needs a decision."}</p><Periods days={days} set={setDays} /></div>
      {o.error ? <Failed error={o.error} retry={o.reload} /> : !d ? <Skeleton rows={3} /> : (
        <div className="nx-figs" style={{ marginTop: 16 }}>
          {mods.includes("bite_care") && d.exposures ? fig(showCount(d.exposures.total), `Bite exposures, ${days === 365 ? "12 months" : `${days} days`}`) : null}
          {mods.includes("bite_care") && d.exposures ? fig(showCount(d.exposures.category_iii), "Category III") : null}
          {mods.includes("bite_care") && d.pep ? fig(d.pep.completion_rate === null ? "—" : pct(d.pep.completion_rate), "Courses completed") : null}
          {mods.includes("laboratory") ? fig(d.samples.positive, "Laboratory-confirmed", "Work") : null}
          {mods.includes("services") ? fig(d.services.arv_unavailable, "Facilities without vaccine", "Network") : null}
        </div>)}
      {!sample && d && (mods.includes("bite_care") || mods.includes("laboratory")) ? <Block title="Where to act" note="Bites, confirmed cases and dog vaccination, by area"><AreaIntel programme={p.id} slug={p.slug} d={d} /></Block> : null}
      <div className="nx-cols" style={{ gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)", marginTop: 24, gap: 28 }}>
        <Block title="Needs a decision">
          {al.error ? <Failed error={al.error} retry={al.reload} /> : al.loading ? <Skeleton rows={3} /> : (al.data ?? []).length ? (
            <ul className="nx-feed">{(al.data ?? []).slice(0, 8).map((a) => { const t = target(a); return (
              <li key={a.key}><span className="nx-feed-i" style={a.severity === "urgent" && !a.ack ? { background: "var(--bad-soft)", color: "var(--bad)" } : undefined}><ShieldAlert size={12} /></span>
                <div><b>{a.title}</b><p>{a.detail}</p><small><Chip tone={a.ack ? "plain" : SEV[a.severity].tone}>{a.ack ? "Acknowledged" : SEV[a.severity].label}</Chip> {ALERT_KIND[a.kind] ?? a.kind}{a.area ? ` · ${a.area}` : ""} · {fmtDate(a.at)}{a.ack ? ` · by ${a.ack.by ?? "a programme member"}, ${fmtDate(a.ack.at)}${a.ack.note ? `: ${a.ack.note}` : ""}` : ""}</small>
                  <div className="gh-acts" style={{ marginTop: 6 }}>{t ? <button type="button" className="nx-btn is-sm is-quiet" onClick={() => go(t)}>Open {t.toLowerCase()}</button> : null}{!a.ack && caps.has("ack_alert") ? (sample ? <TryLink sm quiet>Acknowledge</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setAck(a)}>Acknowledge</button>) : null}</div></div></li>); })}</ul>
          ) : <p className="nx-sub">No alerts.</p>}
        </Block>
        <div>
          <Block title="Partners" note="Organisations taking part. Joining does not open one organisation's records to another.">
            {d ? <ul className="gh-list">{[...d.partners].sort((a, b) => b.overdue - a.overdue || b.open - a.open).map((x) => <li key={x.id}><div><b>{x.name}</b><small>{KIND_LABEL[x.kind] ?? x.kind}{x.responsibilities ? ` · ${x.responsibilities}` : ""}</small></div><span className="gh-row-a">{x.overdue ? <Chip tone="bad">{x.overdue} overdue</Chip> : x.open ? <span className="nx-t3">{x.open} open</span> : <Chip tone="ok">Clear</Chip>}</span></li>)}</ul> : <Skeleton rows={3} />}
          </Block>
          {d?.children.length ? <Block title="Programmes in this one"><ul className="gh-list">{d.children.map((c) => <li key={c.slug}><div><Link href={`/gov/programmes/${c.slug}`} className="gh-link">{c.name}</Link><small>{STATUS[c.status] ?? c.status} · bites {showCount(c.exposures)} · confirmed cases {c.positives} · overdue work {c.overdue}</small></div></li>)}</ul></Block> : null}
          {mods.includes("bite_care") && d?.exposures?.by_week.length ? <Block title="Bites by week" note="Weeks with fewer than the threshold show as <5, without a bar height."><WeekBars weeks={d.exposures.by_week} /></Block> : null}
          {mods.includes("training") && d ? <Block title="Training" note={`${d.training.sessions} sessions, ${d.training.participants} people`} action={caps.has("record_training") ? (sample ? <TryLink sm quiet><Plus size={13} />Record a session</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setTraining(true)}><Plus size={13} />Record a session</button>) : undefined}>
            {Object.keys(d.training.by_audience).length ? <ul className="gh-list">{Object.entries(d.training.by_audience).map(([k, v]) => <li key={k}><div>{AUDIENCE[k] ?? k}</div><span className="num">{v} people</span></li>)}</ul> : <p className="nx-sub">No training recorded in this period.</p>}
          </Block> : null}
        </div>
      </div>
      {ack ? <AckModal p={p} a={ack} onClose={() => setAck(null)} onDone={() => { setAck(null); al.reload(); }} /> : null}
      {training ? <TrainingModal p={p} onClose={() => setTraining(false)} onDone={() => { setTraining(false); o.reload(); }} /> : null}
    </div>
  );
}

function AckModal({ p, a, onClose, onDone }: { p: Prog; a: Alert; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const { busy, run } = useAct();
  const save = async () => { const r = await run("ack", () => call("oh_ack_alert", { p_programme: p.id, p_key: a.key, p_note: note.trim() || null }), { ok: "Acknowledged in your name. The alert stays in the record." }); if (r.ok) onDone(); };
  return <Modal title="Acknowledge this alert" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy} onClick={() => void save()}>Acknowledge</button></>}>
    <p className="nx-sub" style={{ marginTop: 0 }}><b>{a.title}</b>. Acknowledging says a person in the programme has seen it and is acting. It does not close the cause.</p>
    <Field label="What is being done (optional)"><textarea value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="For example: follow-up asked of Street Care Trust" autoFocus /></Field>
  </Modal>;
}

function TrainingModal({ p, onClose, onDone }: { p: Prog; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: "", audience: "healthcare", on: indiaToday(), n: "", inst: "", notes: "" });
  const { busy, run } = useAct();
  const save = async () => { const r = await run("training", () => call("oh_record_training", { p_programme: p.id, p_title: f.title.trim(), p_audience: f.audience, p_held_on: f.on, p_participants: Number(f.n || 0), p_institutions: f.inst ? Number(f.inst) : null, p_notes: f.notes.trim() || null }), { ok: "Training session recorded." }); if (r.ok) onDone(); };
  return <Modal title="Record a training session" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || f.title.trim().length < 3} onClick={() => void save()}>Save session</button></>}>
    <div className="nx-fields gh-fields">
      <Field label="Title" wide><input value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
      <Field label="Audience"><select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{Object.entries(AUDIENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Held on"><input type="date" max={indiaToday()} value={f.on} onChange={(e) => setF({ ...f, on: e.target.value })} /></Field>
      <Field label="People trained"><input inputMode="numeric" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value.replace(/\D/g, "") })} /></Field>
      <Field label="Institutions reached"><input inputMode="numeric" value={f.inst} onChange={(e) => setF({ ...f, inst: e.target.value.replace(/\D/g, "") })} /></Field>
      <Field label="Notes" wide><textarea value={f.notes} maxLength={600} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
    </div>
  </Modal>;
}

/* ── Coverage: vaccinated dogs against a dated estimate, area by area ── */
function CoverageTab({ sample, p, caps }: Ctx) {
  const o = useOh<Overview>(sample, SAMPLE_OVERVIEW, () => call("oh_programme_overview", { p_programme: p.id, p_days: 365 }), `nx-pcov:${p.id}`);
  const [est, setEst] = useState<{ id: string; name: string } | null>(null);
  const d = o.data, target = d?.programme.target ?? p.vaccination_target;
  const withEst = (d?.vaccination ?? []).filter((v) => v.estimate);
  const totV = withEst.reduce((s, v) => s + v.vaccinated, 0), totE = withEst.reduce((s, v) => s + (v.estimate?.dogs ?? 0), 0);
  const canEst = caps.has("record_estimate") || caps.has("oversee");
  return (
    <div className="gh-body is-narrow" style={{ maxWidth: 1040 }}>
      <p className="nx-sub" style={{ marginTop: 0 }}>{!d ? "Reading coverage…" : totE ? <><b className="num">{pct(totV / totE)}</b> of an estimated {totE.toLocaleString("en-IN")} dogs are recorded vaccinated, against a target of <b>{pct(target)}</b>. {withEst.length} of {d.vaccination.length} areas have a dated estimate.</> : <>No dated estimate is recorded, so coverage is not shown. The target is {pct(target)}.</>}</p>
      {o.error ? <Failed error={o.error} retry={o.reload} /> : !d ? <Skeleton rows={5} /> : (
        <div className="nx-table" role="table" aria-label="Coverage by area" style={{ marginTop: 14 }}>
          <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: "minmax(0, 1fr) 130px minmax(0, 1.4fr) 110px 140px" }}><span>Area</span><span className="nx-hide-s">Vaccinated</span><span className="nx-hide-s">Estimate and source</span><span>Coverage</span><span className="nx-hide-s" /></div>
          {d.vaccination.map((v) => { const c = v.estimate && v.estimate.dogs > 0 ? v.vaccinated / v.estimate.dogs : null; return (
            <div key={v.area_id} role="row" className="nx-tr" style={{ gridTemplateColumns: "minmax(0, 1fr) 130px minmax(0, 1.4fr) 110px 140px" }}>
              <span className="nx-cell-main"><span><b>{v.area}</b><small>{v.vaccinated.toLocaleString("en-IN")} of {v.registered.toLocaleString("en-IN")} on registers<span className="nx-only-s"> · {v.estimate ? `estimate ${v.estimate.dogs}, ${fmtDate(v.estimate.on, { month: "short", year: "numeric" })}` : "no estimate"}</span></small></span></span>
              <span className="num nx-hide-s">{v.vaccinated.toLocaleString("en-IN")}</span>
              <span className="nx-t2 nx-hide-s" style={{ whiteSpace: "normal" }}>{v.estimate ? <>{v.estimate.dogs.toLocaleString("en-IN")} dogs · {v.estimate.method} · {v.estimate.source} · {fmtDate(v.estimate.on, { day: "numeric", month: "short", year: "numeric" })}</> : <span className="nx-t3">No dated estimate</span>}</span>
              <span>{c === null ? <span className="nx-t3">Needs an estimate</span> : <Chip tone={c >= target ? "ok" : "warn"}>{pct(c)}</Chip>}</span>
              <span className="nx-hide-s" style={{ textAlign: "right" }}>{canEst ? (sample ? <TryLink sm quiet>{v.estimate ? "Update estimate" : "Add estimate"}</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setEst({ id: v.area_id, name: v.area })}>{v.estimate ? "Update estimate" : "Add estimate"}</button>) : null}</span>
            </div>); })}
          {!d.vaccination.length ? <Empty title="No areas in this programme yet" hint="A programme lead adds areas in Setup." /> : null}
        </div>)}
      {canEst && d?.vaccination.length ? <div className="nx-only-s" style={{ marginTop: 12 }}><Field label="Record an estimate for"><select defaultValue="" onChange={(e) => { const v = d.vaccination.find((x) => x.area_id === e.target.value); if (v) { if (sample) window.location.href = "/try"; else setEst({ id: v.area_id, name: v.area }); } e.target.value = ""; }}><option value="" disabled>Choose an area</option>{d.vaccination.map((v) => <option key={v.area_id} value={v.area_id}>{v.area}</option>)}</select></Field></div> : null}
      <p className="nx-foot">Vaccinated dogs come from partner registers in each area. Dogs vaccinated in drives without individual records are not counted, so coverage can understate. Coverage is never shown without a dated estimate.</p>
      {est ? <EstimateModal p={p} area={est} onClose={() => setEst(null)} onDone={() => { setEst(null); o.reload(); }} /> : null}
    </div>
  );
}

export function EstimateModal({ p, area, onClose, onDone }: { p: { id: string }; area: { id: string; name: string }; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ dogs: "", method: "", source: "", on: indiaToday() });
  const { busy, run } = useAct();
  const ok = Number(f.dogs) > 0 && f.method.trim().length >= 3 && f.source.trim().length >= 3 && !!f.on;
  const save = async () => { const r = await run("est", () => call("oh_record_estimate", { p_programme: p.id, p_area: area.id, p_dogs: Number(f.dogs), p_method: f.method.trim(), p_source: f.source.trim(), p_on: f.on }), { ok: `Estimate recorded for ${area.name}, dated ${day(f.on)}.` }); if (r.ok) onDone(); };
  return <Modal title={`Population estimate · ${area.name}`} onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!ok || !!busy} onClick={() => void save()}>Save estimate</button></>}>
    <p className="nx-sub" style={{ marginTop: 0 }}>Coverage in this area is calculated against it. Earlier estimates stay in the record.</p>
    <div className="nx-fields gh-fields">
      <Field label="Estimated dogs"><input inputMode="numeric" value={f.dogs} onChange={(e) => setF({ ...f, dogs: e.target.value.replace(/\D/g, "") })} autoFocus /></Field>
      <Field label="Estimated on" hint="The date of the survey, not today."><input type="date" max={indiaToday()} value={f.on} onChange={(e) => setF({ ...f, on: e.target.value })} /></Field>
      <Field label="Method" wide><input value={f.method} maxLength={200} onChange={(e) => setF({ ...f, method: e.target.value })} placeholder="For example: mark and resight street survey" /></Field>
      <Field label="Source" wide><input value={f.source} maxLength={200} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Who made it, and where it is published" /></Field>
    </div>
  </Modal>;
}

/* ── Network: facilities as last confirmed, and referral pathways ── */
function NetworkTab({ sample, p }: Ctx) {
  const net = useOh<Network>(sample, SAMPLE_NETWORK, () => call("oh_programme_network", { p_programme: p.id }), `nx-pnet:${p.id}`);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Network["referrals"][number] | null>(null);
  const { busy, run } = useAct();
  const d = net.data;
  const byId = new Map((d?.facilities ?? []).map((f) => [f.id, f]));
  const care = (d?.facilities ?? []).filter((f) => f.kind !== "laboratory");
  const remove = async (r: Network["referrals"][number]) => {
    const res = await run("rm", () => call("oh_set_referral", { p_programme: p.id, p_from: r.from, p_to: r.to, p_service: r.service, p_note: null, p_remove: true }), { ok: "Referral pathway removed.", undo: () => call("oh_set_referral", { p_programme: p.id, p_from: r.from, p_to: r.to, p_service: r.service, p_note: r.note, p_remove: false }).then(() => net.reload()) });
    setRemoving(null); if (res.ok) net.reload();
  };
  return (
    <div className="gh-body" style={{ maxWidth: 1120 }}>
      <p className="nx-sub" style={{ marginTop: 0 }}>{!d ? "Reading the care network…" : <><b className="num">{care.length}</b> care {care.length === 1 ? "facility" : "facilities"}{care.filter((f) => f.services.find((s) => s.service === "arv")?.status === "unavailable").length ? <>, <b className="num">{care.filter((f) => f.services.find((s) => s.service === "arv")?.status === "unavailable").length}</b> without vaccine</> : null}. Availability is what each facility confirmed, with the date. It is not a stock count and does not say a place is open now.</>}</p>
      {net.error ? <Failed error={net.error} retry={net.reload} /> : !d ? <Skeleton rows={5} /> : <>
        <Block title="Facilities">
          <ul className="gh-list">{d.facilities.map((f) => <li key={f.id}><div><b>{f.name}</b><small>{KIND_LABEL[f.kind] ?? f.kind}{f.area ? ` · ${f.area}` : ""}{f.hours ? ` · ${f.hours}` : ""}{f.kind !== "laboratory" && f.active_courses !== null ? ` · in a course: ${showCount(f.active_courses)}` : ""}{f.kind === "laboratory" && f.samples_waiting !== null ? ` · ${f.samples_waiting} samples waiting` : ""}</small></div>
            <span className="gh-row-a">{f.services.length ? f.services.map((s) => { const old = Date.parse(s.valid_until) < Date.now(); return <span key={s.service} title={`Confirmed ${ago(s.verified_at)}${s.by ? ` by ${s.by}` : ""}`}><Chip tone={old ? "plain" : s.status === "available" ? "ok" : s.status === "limited" ? "warn" : "bad"}>{SERVICE_SHORT[s.service] ?? s.service}: {old ? "not confirmed recently" : (SERVICE_STATUS[s.status]?.label ?? s.status).toLowerCase()}</Chip></span>; }) : <Chip tone="warn">No service confirmed</Chip>}</span></li>)}</ul>
        </Block>
        <Block title="Referral pathways" note="Where a facility sends people for a service it does not offer." action={d.can_configure ? (sample ? <TryLink sm quiet><Plus size={13} />Add a pathway</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setAdding(true)}><Plus size={13} />Add a pathway</button>) : undefined}>
          {d.referrals.length ? <ul className="gh-list">{d.referrals.map((r) => <li key={`${r.from}${r.to}${r.service}`}><div><b>{byId.get(r.from)?.short_name ?? byId.get(r.from)?.name ?? "A partner"} → {byId.get(r.to)?.short_name ?? byId.get(r.to)?.name ?? "A partner"}</b><small>{SERVICE_LABEL[r.service] ?? r.service}{r.note ? ` · ${r.note}` : ""}</small></div>
            <span className="gh-row-a">{d.can_configure ? (sample ? <TryLink sm quiet>Remove</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={() => setRemoving(r)}>Remove</button>) : null}</span></li>)}</ul>
            : <Empty title="No referral pathways yet" hint="Add one so a health centre without immunoglobulin knows where to send people." />}
        </Block>
      </>}
      {adding && d ? <PathwayModal p={p} facilities={care} onClose={() => setAdding(false)} onDone={() => { setAdding(false); net.reload(); }} /> : null}
      {removing ? <Modal title="Remove this pathway" onClose={() => setRemoving(null)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setRemoving(null)}>Cancel</button><button type="button" className="nx-btn is-danger" disabled={!!busy} onClick={() => void remove(removing)}>Remove</button></>}><p className="nx-confirm">Facilities will no longer see {byId.get(removing.to)?.name ?? "this facility"} as the place to send people for {(SERVICE_LABEL[removing.service] ?? removing.service).toLowerCase()}. You can undo it straight after.</p></Modal> : null}
    </div>
  );
}

function PathwayModal({ p, facilities, onClose, onDone }: { p: Prog; facilities: Network["facilities"]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ from: facilities[0]?.id ?? "", to: facilities[1]?.id ?? "", svc: "rig", note: "" });
  const { busy, run } = useAct();
  const save = async () => { const r = await run("pw", () => call("oh_set_referral", { p_programme: p.id, p_from: f.from, p_to: f.to, p_service: f.svc, p_note: f.note.trim() || null, p_remove: false }), { ok: "Referral pathway saved." }); if (r.ok) onDone(); };
  return <Modal title="Add a referral pathway" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || !f.from || !f.to || f.from === f.to} onClick={() => void save()}>Save pathway</button></>}>
    <div className="nx-fields gh-fields">
      <Field label="From" wide><select value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })}>{facilities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="For"><select value={f.svc} onChange={(e) => setF({ ...f, svc: e.target.value })}>{["rig", "arv", "wound_care"].map((s) => <option key={s} value={s}>{SERVICE_LABEL[s]}</option>)}</select></Field>
      <Field label="To"><select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{facilities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field label="Note (optional)" wide><input value={f.note} maxLength={200} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="For example: category III exposures" /></Field>
    </div>
    {f.from === f.to ? <p className="gh-hint">Choose two different facilities.</p> : null}
  </Modal>;
}

/* ── Work: requests between partners ── */
function WorkTab({ sample, p, caps, places }: Ctx) {
  const hand = useOh<Handoff[]>(sample, SAMPLE_HANDOFFS, () => select<Handoff>("oh_handoffs", { programme_id: p.id }, "*", 500), `nx-pho:${p.id}`);
  const ov = useOh<Overview>(sample, SAMPLE_OVERVIEW, () => call("oh_programme_overview", { p_programme: p.id, p_days: 30 }), `nx-pwo:${p.id}`);
  const names = useNames(!sample);
  const nm = (id: string | null | undefined) => (sample ? SAMPLE_NAMES[id ?? ""] : names.org(id)) ?? null;
  const ar = (id: string | null | undefined) => (sample ? SAMPLE_NAMES[id ?? ""] : names.area(id)) ?? null;
  const [lane, setLane] = useState<"open" | "overdue" | "closed">("open");
  const [asking, setAsking] = useState(false);
  const [acting, setActing] = useState<{ h: Handoff; action: "done" | "decline" } | null>(null);
  const { busy, run } = useAct();
  const t = indiaToday();
  const all = [...(hand.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const isOpen = (h: Handoff) => h.status === "open" || h.status === "accepted", late = (h: Handoff) => isOpen(h) && !!h.due_on && h.due_on < t;
  const list = all.filter((h) => (lane === "open" ? isOpen(h) : lane === "overdue" ? late(h) : !isOpen(h)));
  const mine = (h: Handoff) => sample ? h.to_org === "o2" : places.some((x) => x.organisation_id === h.to_org && x.capabilities.includes("act_handoff"));
  const accept = async (h: Handoff) => { const r = await run(`acc:${h.id}`, () => call("oh_handoff_act", { p_handoff: h.id, p_action: "accept" }), { ok: "Accepted. It shows as in progress for the programme." }); if (r.ok) hand.reload(); };
  return (
    <div className="gh-body" style={{ maxWidth: 1120 }}>
      <div className="nx-head"><p className="nx-sub" style={{ margin: 0 }}>{hand.error ? "The requests could not be read." : hand.loading ? "Reading the requests…" : <><b className="num">{all.filter(isOpen).length}</b> open between partners{all.filter(late).length ? <>, <b className="num">{all.filter(late).length}</b> overdue</> : null}. Requests never carry patient details.</>}</p>
        {caps.has("raise_handoff") ? (sample ? <TryLink keep><Plus size={13} />Ask a partner</TryLink> : <button type="button" className="nx-btn is-keep" onClick={() => setAsking(true)}><Plus size={13} />Ask a partner</button>) : null}</div>
      <div className="nx-bar"><div className="nx-views" role="tablist" aria-label="Requests">{([["open", "Open", all.filter(isOpen).length], ["overdue", "Overdue", all.filter(late).length], ["closed", "Closed", all.filter((h) => !isOpen(h)).length]] as const).map(([k, l, c]) => <button key={k} type="button" role="tab" aria-selected={lane === k} className={`nx-view ${lane === k ? "is-on" : ""}`} onClick={() => setLane(k)}>{lane === k ? <span className="nx-view-bg" /> : null}<span>{l}<span className="nx-count">{c}</span></span></button>)}</div></div>
      {hand.error ? <Failed error={hand.error} retry={hand.reload} /> : hand.loading ? <Skeleton rows={5} /> : list.length ? (
        <ul className="gh-list">{list.map((h) => <li key={h.id}><div><b>{h.title}</b><small>{HANDOFF_KIND[h.kind] ?? h.kind} · {nm(h.from_org) ?? "Programme"} → {nm(h.to_org) ?? "Partner"}{ar(h.area_id) ? ` · ${ar(h.area_id)}` : ""}{h.due_on ? ` · due ${fmtDate(h.due_on)}` : ""}{late(h) ? " (overdue)" : ""}{h.outcome ? ` · ${h.outcome}` : ""}{h.closed_by_name ? ` · ${h.closed_by_name}` : ""}</small></div>
          <span className="gh-row-a"><Chip tone={late(h) ? "bad" : HTONE[h.status] ?? "plain"}>{HANDOFF[h.status]?.label ?? h.status}</Chip>
            {isOpen(h) && mine(h) ? (sample ? <TryLink sm quiet>Record outcome</TryLink> : <>{h.status === "open" ? <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void accept(h)}>Accept</button> : null}<button type="button" className="nx-btn is-sm is-quiet" onClick={() => setActing({ h, action: "done" })}>Record outcome</button><button type="button" className="nx-btn is-sm is-quiet" onClick={() => setActing({ h, action: "decline" })}>Decline</button></>) : null}</span></li>)}</ul>
      ) : <Empty title={lane === "closed" ? "Nothing closed yet" : lane === "overdue" ? "Nothing overdue" : "Nothing open"} />}
      {asking ? <AskModal p={p} partners={(ov.data?.partners ?? []).filter((x) => !places.some((pl) => pl.organisation_id === x.id))} areas={(ov.data?.vaccination ?? []).map((v) => ({ id: v.area_id, name: v.area }))} onClose={() => setAsking(false)} onDone={() => { setAsking(false); hand.reload(); }} /> : null}
      {acting ? <OutcomeModal h={acting.h} action={acting.action} onClose={() => setActing(null)} onDone={() => { setActing(null); hand.reload(); }} /> : null}
    </div>
  );
}

function AskModal({ p, partners, areas, onClose, onDone }: { p: Prog; partners: Overview["partners"]; areas: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ kind: "vaccination_request", to: partners[0]?.id ?? "", title: "", detail: "", area: "", due: "" });
  const { busy, run } = useAct();
  const save = async () => { const r = await run("ask", () => call("oh_raise_handoff", { p_programme: p.id, p_kind: f.kind, p_to: f.to, p_title: f.title.trim(), p_detail: f.detail.trim() || null, p_area: f.area || null, p_due: f.due || null }), { ok: "Sent. It is on the partner's list now, with the due date." }); if (r.ok) onDone(); };
  return <Modal title="Ask a partner" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || f.title.trim().length < 3 || !f.to} onClick={() => void save()}>Send request</button></>}>
    <p className="nx-sub" style={{ marginTop: 0 }}>The partner sees it on their list. Never include patient details.</p>
    <div className="nx-fields gh-fields">
      <Field label="Kind of request"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{["vaccination_request", "animal_followup", "sample_request", "service_gap"].map((k) => <option key={k} value={k}>{HANDOFF_KIND[k]}</option>)}</select></Field>
      <Field label="To"><select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{partners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
      <Field label="What you need" wide><input value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="For example: vaccinate dogs around the market" autoFocus /></Field>
      <Field label="Details" wide><textarea value={f.detail} maxLength={1200} onChange={(e) => setF({ ...f, detail: e.target.value })} /></Field>
      <Field label="Area"><select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}><option value="">Not specific</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
      <Field label="Due"><input type="date" min={indiaToday()} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
    </div>
  </Modal>;
}

export function OutcomeModal({ h, action, onClose, onDone }: { h: Handoff; action: "done" | "decline"; onClose: () => void; onDone: () => void }) {
  const [outcome, setOutcome] = useState("");
  const { busy, run } = useAct();
  const save = async () => { const r = await run("out", () => call("oh_handoff_act", { p_handoff: h.id, p_action: action, p_outcome: outcome.trim(), p_animal: null }), { ok: action === "done" ? "Closed with what you found. The programme sees it." : "Declined with your reason. The programme sees it." }); if (r.ok) onDone(); };
  return <Modal title={action === "done" ? "Record what was done" : "Decline this request"} onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className={`nx-btn ${action === "decline" ? "is-danger" : ""}`} disabled={!!busy || outcome.trim().length < 3} onClick={() => void save()}>{action === "done" ? "Close request" : "Decline"}</button></>}>
    <p className="nx-sub" style={{ marginTop: 0 }}><b>{h.title}</b></p>
    {h.detail ? <p className="nx-note" style={{ whiteSpace: "pre-line" }}>{h.detail}</p> : null}
    <Field label={action === "done" ? "What was found or done" : "Why your team cannot take this on"}><textarea value={outcome} maxLength={600} onChange={(e) => setOutcome(e.target.value)} autoFocus placeholder={action === "done" ? "For example: dog found alive, observed for ten days, healthy" : "For example: outside our ward"} /></Field>
  </Modal>;
}

/* ── Data: suppressed weekly counts for analysis ── */
type Extract = { since: string; suppress_below: number; rows: { week: string; area: string; species: string; category: string; exposures: Count }[] };
const SAMPLE_EXTRACT: Extract = { since: "2025-11-15", suppress_below: 5, rows: [{ week: "2026-11-02", area: "Ward 08", species: "dog", category: "III", exposures: 6 }, { week: "2026-11-02", area: "Ward 05", species: "dog", category: "II", exposures: "<5" }, { week: "2026-11-09", area: "Ward 08", species: "dog", category: "II", exposures: 7 }, { week: "2026-11-09", area: "Ward 12", species: "cat", category: "II", exposures: "<5" }] };
function DataTab({ sample, p }: Ctx) {
  const x = useOh<Extract>(sample, SAMPLE_EXTRACT, () => call("oh_research_extract", { p_programme: p.id, p_days: 365 }), `nx-prx:${p.id}`);
  const rows = x.data?.rows ?? [];
  const csv = () => {
    const lines = [["week", "area", "species", "category", "exposures"].join(","), ...rows.map((r) => [r.week, `"${r.area.replace(/"/g, '""')}"`, r.species, r.category, r.exposures === "<5" ? `<${x.data!.suppress_below}` : String(r.exposures)].join(","))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = `${p.slug}-exposures-by-week.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="gh-body is-narrow">
      <div className="nx-head"><p className="nx-sub" style={{ margin: 0 }}>{!x.data ? (x.error ? "The extract could not be read." : "Reading the extract…") : <><b className="num">{rows.length}</b> weekly counts by area, animal and category since {fmtDate(x.data.since, { day: "numeric", month: "short", year: "numeric" })}. Counts below {x.data.suppress_below} are hidden. No patient details.</>}</p>
        <button type="button" className="nx-btn is-keep" disabled={!rows.length} onClick={csv}><Download size={13} />Download CSV</button></div>
      {x.error ? <Failed error={x.error} retry={x.reload} /> : !x.data ? <Skeleton rows={5} /> : rows.length ? (
        <div className="nx-table" role="table" aria-label="Exposures by week" style={{ marginTop: 14 }}>
          <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: "100px minmax(0, 1fr) 100px 100px 100px" }}><span>Week</span><span>Area</span><span className="nx-hide-s">Animal</span><span className="nx-hide-s">Category</span><span>Exposures</span></div>
          {rows.slice(0, 300).map((r, i) => <div key={i} role="row" className="nx-tr" style={{ gridTemplateColumns: "100px minmax(0, 1fr) 100px 100px 100px" }}><span className="nx-t3">{fmtDate(r.week)}</span><span className="nx-cell-main"><span><b>{r.area}</b><small className="nx-only-s">{r.species} · category {r.category} · {fmtDate(r.week)}</small></span></span><span className="nx-t2 nx-hide-s">{r.species}</span><span className="nx-t2 nx-hide-s">{r.category}</span><span className="num">{showCount(r.exposures)}</span></div>)}
        </div>) : <Empty title="No exposures in the last year" />}
    </div>
  );
}

/* ── Report: one printable page for the period ── */
function ReportTab({ sample, p }: Ctx) {
  const [days, setDays] = useState(90);
  const o = useOh<Overview>(sample, SAMPLE_OVERVIEW, () => call("oh_programme_overview", { p_programme: p.id, p_days: days }), `nx-prep:${p.id}:${days}`);
  const marks = useOh<Record<string, string>>(sample, {}, () => call("oh_partner_marks", { p_programme: p.id }), `nx-pmk:${p.id}`);
  const d = o.data;
  const d1 = (x: number | null) => (x === null ? "None" : String(Math.round(x * 10) / 10));
  return (
    <div className="gh-body is-narrow gh-print">
      <div className="nx-head gh-noprint"><Periods days={days} set={setDays} /><button type="button" className="nx-btn is-keep" onClick={() => window.print()}><Printer size={13} />Print or save as PDF</button></div>
      {o.error ? <Failed error={o.error} retry={o.reload} /> : !d ? <Skeleton rows={8} /> : <article aria-label="Programme report" style={{ marginTop: 16 }}>
        <h2 className="nx-h1" style={{ fontSize: 20 }}>{p.name}</h2>
        <p className="nx-sub">{fmtDate(d.since, { day: "numeric", month: "long", year: "numeric" })} to {fmtDate(d.today, { day: "numeric", month: "long", year: "numeric" })}. Prepared {dayTime(new Date().toISOString())}; every figure comes from the shared record.{sample || p.illustrative ? " Illustrative: every figure is invented." : ""}</p>
        {Object.keys(marks.data ?? {}).length ? <ul className="gh-marks" aria-label="Partners">{d.partners.filter((x) => marks.data?.[x.id]).map((x) => <li key={x.id}><img src={marks.data![x.id]} alt="" /><span>{x.short_name ?? x.name}</span></li>)}</ul> : null}
        {d.exposures && d.pep ? <Block title="Human bite care"><Props items={[["Bite exposures", showCount(d.exposures.total)], ["Category III", showCount(d.exposures.category_iii)], ["Courses prescribed", showCount(d.pep.courses)], ["Completion", d.pep.completion_rate === null ? "Too few to show" : pct(d.pep.completion_rate)], ["Did not return", showCount(d.pep.lost)], ["Doses overdue now", showCount(d.pep.doses_overdue)]]} /></Block> : null}
        <Block title="Laboratory surveillance"><Props items={[["Samples", String(d.samples.total)], ["Positive", String(d.samples.positive)], ["Negative", String(d.samples.negative)], ["Median days to result", d1(d.samples.median_days_to_result)], ["Confirmed in", d.samples.positive_areas.join(", ") || "None"]]} /></Block>
        <Block title="Coordination"><Props items={[["Requests closed", String(d.handoffs.done)], ["Open", String(d.handoffs.open)], ["Overdue", String(d.handoffs.overdue)], ["Median days to close", d1(d.handoffs.median_days_to_close)], ["Services confirmed", `${d.services.confirmed} across ${d.services.facilities} ${d.services.facilities === 1 ? "facility" : "facilities"}`]]} /></Block>
        <Block title="Dog vaccination" note={`Target ${pct(d.programme.target)}. Shown only where a dated estimate exists.`}><ul className="gh-list">{d.vaccination.map((v) => <li key={v.area_id}><div><b>{v.area}</b><small>{v.vaccinated} vaccinated{v.estimate ? ` of an estimated ${v.estimate.dogs} (${v.estimate.source}, ${fmtDate(v.estimate.on, { month: "short", year: "numeric" })})` : ", no estimate"}</small></div><span className="num">{v.estimate ? pct(v.vaccinated / v.estimate.dogs) : "—"}</span></li>)}</ul></Block>
        <Block title="Training"><p className="nx-sub">{d.training.sessions} sessions, {d.training.participants} people: {Object.entries(d.training.by_audience).map(([k, v]) => `${AUDIENCE[k] ?? k} ${v}`).join(", ") || "none recorded"}.</p></Block>
        <Block title="Partners and responsibilities"><ul className="gh-list">{d.partners.map((x) => <li key={x.id}><div><b>{x.name}</b><small>{KIND_LABEL[x.kind] ?? x.kind}{x.responsibilities ? `: ${x.responsibilities}` : ""}</small></div></li>)}</ul></Block>
        <p className="nx-foot">Human counts below {d.programme.suppress_below} are shown as “fewer than {d.programme.suppress_below}”. Kaju does not write reports.</p>
      </article>}
    </div>
  );
}

/* ── Setup: settings, partners, areas, assignments, training and people ── */
type Assignment = { programme_id: string; area_id: string; duty: string; organisation_id: string };
const DUTY: Record<string, string> = { animal_followup: "Animal follow-ups", vaccination: "Dog vaccination", sample_collection: "Sample collection" };
function SetupTab({ sample, p, caps, places, reloadProg }: Ctx & { reloadProg?: () => void }) {
  const manage = caps.has("manage");
  const o = useOh<Overview>(sample, SAMPLE_OVERVIEW, () => call("oh_programme_overview", { p_programme: p.id, p_days: 30 }), `nx-pset:${p.id}`);
  const marks = useOh<Record<string, string>>(sample, {}, () => call("oh_partner_marks", { p_programme: p.id }), `nx-pmk:${p.id}`);
  const asg = useOh<Assignment[]>(sample, [{ programme_id: p.id, area_id: "a8", duty: "animal_followup", organisation_id: "o2" }], () => select<Assignment>("oh_assignments", { programme_id: p.id }, "programme_id,area_id,duty,organisation_id", 500), `nx-pasg:${p.id}`);
  const [partner, setPartner] = useState(false);
  const [est, setEst] = useState<{ id: string; name: string } | null>(null);
  const [training, setTraining] = useState(false);
  const [area, setArea] = useState({ name: "", level: "ward", code: "" });
  const { busy, run } = useAct();
  const d = o.data;
  const addArea = async () => { const r = await run("area", () => call("oh_add_area", { p_programme: p.id, p_name: area.name.trim(), p_level: area.level, p_code: area.code.trim() || null }), { ok: `${area.name.trim()} added to the programme.` }); if (r.ok) { setArea({ name: "", level: "ward", code: "" }); o.reload(); } };
  const assign = async (areaId: string, duty: string, org: string | null) => {
    const prev = (asg.data ?? []).find((x) => x.area_id === areaId && x.duty === duty)?.organisation_id ?? null;
    const r = await run(`asg:${areaId}:${duty}`, () => call("oh_set_assignment", { p_programme: p.id, p_area: areaId, p_duty: duty, p_org: org }), { ok: org ? "Assigned." : "Assignment cleared.", undo: () => call("oh_set_assignment", { p_programme: p.id, p_area: areaId, p_duty: duty, p_org: prev }).then(() => asg.reload()) });
    if (r.ok) asg.reload();
  };
  const inviteOrgs = sample ? [{ id: "coord", name: "Programme coordination", kind: "coordinator" as Kind }] : places.filter((x) => x.programmes.some((y) => y.id === p.id) && x.capabilities.includes("invite")).map((x) => ({ id: x.organisation_id, name: x.name, kind: x.kind }));
  const areas = d?.vaccination ?? [];
  return (
    <div className="gh-body is-narrow">
      {manage ? <Settings sample={sample} p={p} onSaved={() => reloadProg?.()} /> : <p className="nx-note"><span>Only the programme lead changes modules, settings, partners and areas. You can invite people to your own organisation below.</span></p>}
      {manage ? <Block title="Partners" note="Organisations taking part. A logo appears on the programme report." action={sample ? <TryLink sm quiet><Plus size={13} />Add a partner</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setPartner(true)}><Plus size={13} />Add a partner</button>}>
        {d ? <ul className="gh-list">{d.partners.map((x) => <li key={x.id}><div><b>{x.name}</b><small>{KIND_LABEL[x.kind] ?? x.kind} · {showCount(x.members)} people{marks.data?.[x.id] ? " · logo set" : ""}</small></div><span className="gh-row-a"><Logo sample={sample} org={x.id} name={x.name} has={!!marks.data?.[x.id]} onDone={marks.reload} /></span></li>)}</ul> : <Skeleton rows={3} />}
      </Block> : null}
      {manage || caps.has("oversee") ? <Block title="Areas and assignments" note="Wards or localities the programme covers, and which partner answers for each duty there. A bite recorded in an area raises its animal follow-up with the assigned partner.">
        {d ? <ul className="gh-list">{areas.map((a) => <li key={a.area_id} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div><b>{a.area}</b><small>{a.estimate ? `Estimate ${a.estimate.dogs} dogs, ${fmtDate(a.estimate.on, { day: "numeric", month: "short", year: "numeric" })}, ${a.estimate.source}` : "No dated estimate"}</small></div>
          <div className="nx-fields gh-fields" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>{Object.entries(DUTY).map(([k, l]) => { const cur = (asg.data ?? []).find((x) => x.area_id === a.area_id && x.duty === k)?.organisation_id ?? ""; return <Field key={k} label={l}>{sample ? <select value={cur} disabled aria-disabled><option value="">Nobody</option>{d.partners.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select> : <select value={cur} disabled={!!busy} onChange={(e) => void assign(a.area_id, k, e.target.value || null)}><option value="">Nobody</option>{d.partners.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}</Field>; })}</div>
          <div className="gh-acts">{caps.has("record_estimate") || caps.has("oversee") ? (sample ? <TryLink sm quiet>Record an estimate</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setEst({ id: a.area_id, name: a.area })}>Record an estimate</button>) : null}</div></li>)}</ul> : <Skeleton rows={3} />}
        {asg.error ? <p className="gh-err">{asg.error}</p> : null}
        {manage ? <div className="gh-form" style={{ marginTop: 12 }}><div className="nx-fields gh-fields" style={{ gridTemplateColumns: "minmax(0, 1.4fr) 140px 120px" }}>
          <Field label="New area"><input value={area.name} maxLength={120} onChange={(e) => setArea({ ...area, name: e.target.value })} placeholder="Ward or locality name" /></Field>
          <Field label="Level"><select value={area.level} onChange={(e) => setArea({ ...area, level: e.target.value })}><option value="ward">Ward</option><option value="locality">Locality</option><option value="zone">Zone</option></select></Field>
          <Field label="Code (optional)"><input value={area.code} maxLength={20} onChange={(e) => setArea({ ...area, code: e.target.value })} /></Field></div>
          <div className="gh-acts">{sample ? <TryLink sm quiet><MapPin size={13} />Add area</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy || area.name.trim().length < 2} onClick={() => void addArea()}><MapPin size={13} />Add area</button>}</div>
          <p className="gh-hint">Areas are names until the official ward boundaries are loaded.</p></div> : null}
      </Block> : null}
      {caps.has("record_training") ? <Block title="Training" note={d ? `${d.training.sessions} sessions recorded, ${d.training.participants} people` : undefined} action={sample ? <TryLink sm quiet><Plus size={13} />Record a session</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setTraining(true)}><Plus size={13} />Record a session</button>}><span /></Block> : null}
      {inviteOrgs.length ? <Invites sample={sample} orgs={inviteOrgs} /> : null}
      {partner ? <PartnerModal p={p} onClose={() => setPartner(false)} onDone={() => { setPartner(false); o.reload(); }} /> : null}
      {est ? <EstimateModal p={p} area={est} onClose={() => setEst(null)} onDone={() => { setEst(null); o.reload(); }} /> : null}
      {training ? <TrainingModal p={p} onClose={() => setTraining(false)} onDone={() => { setTraining(false); o.reload(); }} /> : null}
    </div>
  );
}

function Settings({ sample, p, onSaved }: { sample: boolean; p: Prog; onSaved: () => void }) {
  const [mods, setMods] = useState<string[]>(p.config?.modules ?? ALL_MODULES);
  const [target, setTarget] = useState(String(Math.round(p.vaccination_target * 100)));
  const [due, setDue] = useState(String(p.config?.followup_due_days ?? 3));
  const [revac, setRevac] = useState(p.config?.dog_revaccination_days ? String(p.config.dog_revaccination_days) : "");
  const [summary, setSummary] = useState(p.summary ?? ""), [status, setStatus] = useState(p.status);
  const { busy, run } = useAct();
  const cfg = (m: string[], d: string, r: string) => { const c: Record<string, unknown> = { modules: m, followup_due_days: Number(d) || 3 }; if (p.config?.suppress_below) c.suppress_below = p.config.suppress_below; if (p.config?.alert_window_days) c.alert_window_days = p.config.alert_window_days; if (r) c.dog_revaccination_days = Number(r); return c; };
  const t = Number(target), rv = Number(revac);
  const ok = t >= 1 && t <= 100 && (!revac || (rv >= 30 && rv <= 1095));
  const save = async () => {
    const before = { p_programme: p.id, p_summary: p.summary ?? "", p_status: p.status, p_target: p.vaccination_target, p_config: p.config ?? {} };
    const r = await run("settings", () => call("oh_set_programme", { p_programme: p.id, p_summary: summary, p_status: status, p_target: t / 100, p_config: cfg(mods, due, revac) }), { ok: "Programme settings saved.", undo: () => call("oh_set_programme", before).then(() => onSaved()) });
    if (r.ok) onSaved();
  };
  return (
    <Block title="What this programme does" note="Changes apply at once for every partner.">
      <div className="gh-mods">{ALL_MODULES.map((m) => <label key={m}><input type="checkbox" checked={mods.includes(m)} onChange={(e) => setMods(e.target.checked ? [...mods, m] : mods.filter((x) => x !== m))} /><span><b>{MODULES[m].label}</b><small>{MODULES[m].note}</small></span></label>)}</div>
      <div className="nx-fields gh-fields" style={{ marginTop: 12 }}>
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Dog vaccination target (%)"><input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, "").slice(0, 3))} /></Field>
        <Field label="Days to answer a follow-up"><input inputMode="numeric" value={due} onChange={(e) => setDue(e.target.value.replace(/\D/g, "").slice(0, 2))} /></Field>
        <Field label="Dog revaccination interval (days)" hint="Set by the programme's veterinary lead, 30 to 1095. Empty switches reminders off."><input inputMode="numeric" value={revac} onChange={(e) => setRevac(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Off" /></Field>
        <Field label="Summary" wide><textarea value={summary} maxLength={600} onChange={(e) => setSummary(e.target.value)} /></Field>
      </div>
      <div className="gh-acts" style={{ marginTop: 10 }}>{sample ? <TryLink sm>Save settings</TryLink> : <button type="button" className="nx-btn is-sm" disabled={!!busy || !ok} onClick={() => void save()}>Save settings</button>}<span className="gh-hint">Human counts below {p.config?.suppress_below ?? 5} are always hidden outside the treating facility.</span></div>
    </Block>
  );
}

function Logo({ sample, org, name, has, onDone }: { sample: boolean; org: string; name: string; has: boolean; onDone: () => void }) {
  const { busy, run } = useAct();
  if (sample) return <TryLink sm quiet><Upload size={13} />{has ? "Change logo" : "Add logo"}</TryLink>;
  const up = async (file: File) => { const r = await run(`logo:${org}`, async () => { const url = await uploadLogo(org, file); const x = await call("oh_set_logo", { p_org: org, p_url: url }); if (x.error) throw new Error(x.error); }, { ok: `Logo saved for ${name}.` }); if (r.ok) onDone(); };
  const remove = async () => { const r = await run(`logo:${org}`, () => call("oh_set_logo", { p_org: org, p_url: null }), { ok: `Logo removed for ${name}.` }); if (r.ok) onDone(); };
  return <>
    <label className="nx-btn is-sm is-quiet" style={{ cursor: "pointer" }} aria-disabled={!!busy}><Upload size={13} />{has ? "Change logo" : "Add logo"}<input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void up(f); }} /></label>
    {has ? <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={() => void remove()} aria-label={`Remove the logo of ${name}`}>Remove</button> : null}
  </>;
}

function PartnerModal({ p, onClose, onDone }: { p: Prog; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ kind: "clinic" as Kind, name: "", short: "", resp: "" });
  const { busy, run } = useAct();
  const save = async () => { const r = await run("partner", () => call("oh_add_partner", { p_programme: p.id, p_kind: f.kind, p_name: f.name.trim(), p_short_name: f.short.trim() || null, p_responsibilities: f.resp.trim() || null, p_area: null, p_existing: null, p_ngo: null }), { ok: `${f.name.trim()} added. Invite their people next.` }); if (r.ok) onDone(); };
  return <Modal title="Add a partner" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || f.name.trim().length < 2} onClick={() => void save()}>Add partner</button></>}>
    <div className="nx-fields gh-fields">
      <Field label="Kind" hint="An NGO joins by linking its existing StrayPaw organisation, through StrayPaw support."><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Kind })}>{(Object.keys(KIND_LABEL) as Kind[]).filter((k) => k !== "ngo").map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></Field>
      <Field label="Short name"><input value={f.short} maxLength={40} onChange={(e) => setF({ ...f, short: e.target.value })} /></Field>
      <Field label="Name" wide><input value={f.name} maxLength={160} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
      <Field label="Responsible for" wide><textarea value={f.resp} maxLength={400} onChange={(e) => setF({ ...f, resp: e.target.value })} /></Field>
    </div>
  </Modal>;
}

type InviteList = { members: { name: string; role: Role; since: string }[]; invites: { code: string; role: Role; email: string | null; name: string | null; expires_at: string }[] };
function Invites({ sample, orgs }: { sample: boolean; orgs: { id: string; name: string; kind: Kind }[] }) {
  const [org, setOrg] = useState(orgs[0]?.id ?? "");
  const kind = orgs.find((o) => o.id === org)?.kind ?? "coordinator";
  const roles = INVITE_ROLES[kind] ?? ["analyst"];
  const [role, setRole] = useState<Role>(roles[0]);
  const [name, setName] = useState(""), [email, setEmail] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const { busy, run } = useAct();
  const live = useLive();
  const list = useOh<InviteList>(sample, { members: [{ name: "Programme lead", role: "lead", since: new Date(Date.now() - 90 * 864e5).toISOString() }], invites: [{ code: "SAMPLE01", role: "analyst", email: null, name: "District analyst", expires_at: new Date(Date.now() + 9 * 864e5).toISOString() }] }, () => call("oh_org_invites", { p_org: org }), `nx-inv:${org}:${code}`, !!org);
  const create = async () => { const r = await run("invite", () => call<string>("oh_create_invite", { p_org: org, p_role: role, p_email: email.trim() || null, p_display_name: name.trim() || null }), { quiet: true }); setAsking(false); if (r.ok && r.result && typeof r.result === "object" && "data" in r.result) { const c = (r.result as { data: string | null }).data; if (c) { setCode(c); setName(""); setEmail(""); toast({ text: "Invite code created. It works once and expires in 14 days.", tone: "ok" }); } } };
  const link = code ? `${typeof window === "undefined" ? "" : window.location.origin}/next/start?invite=${code}` : "";
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast({ text: "Link copied.", tone: "ok" }); } catch { toast({ text: "Could not copy. Select the link and copy it.", tone: "bad" }); } };
  return (
    <Block title="People" note="Invite someone with a code. They open the link, sign in and join with the role you chose.">
      <div className="nx-fields gh-fields">
        <Field label="Organisation"><select value={org} onChange={(e) => { setOrg(e.target.value); const k = orgs.find((o) => o.id === e.target.value)?.kind ?? "coordinator"; setRole((INVITE_ROLES[k] ?? ["analyst"])[0]); }}>{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <Field label="Role"><select value={role} onChange={(e) => setRole(e.target.value as Role)}>{roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
        <Field label="Name"><input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email (optional)" hint="If given, only that address can use the code."><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
      <div className="gh-acts" style={{ marginTop: 10 }}>{sample ? <TryLink sm>Create invite code</TryLink> : <button type="button" className="nx-btn is-sm" disabled={!!busy || !org} onClick={() => setAsking(true)}>Create invite code</button>}</div>
      {code ? <div className="gh-invite" role="status" style={{ marginTop: 12 }}>
        <span>Send this link. It opens StrayPaw with the code filled in.</span>
        <code>{link}</code>
        <div className="gh-acts"><button type="button" className="nx-btn is-sm is-quiet" onClick={() => void copy()}><Copy size={13} />Copy link</button><span>Or read out the code <b className="gh-big">{code}</b>. It works once and expires in 14 days.</span></div>
      </div> : null}
      {list.data && list.data.members.length + list.data.invites.length ? <>
        <h3 className="nx-h3">Members and invitations <span className="nx-count">{list.data.members.length + list.data.invites.length}</span></h3>
        <ul className="gh-list">{list.data.members.map((m, i) => <li key={`m${i}`}><div><b>{m.name ?? "Member"}</b><small>{ROLE_LABEL[m.role] ?? m.role} · since {fmtDate(m.since)}</small></div></li>)}{list.data.invites.map((v) => <li key={v.code}><div><b>{v.name ?? v.email ?? "Invited"}</b><small>{ROLE_LABEL[v.role] ?? v.role} · code <span className="gh-code">{v.code}</span> · expires {fmtDate(v.expires_at)}</small></div><span className="gh-row-a"><Chip tone="warn">Not yet accepted</Chip></span></li>)}</ul>
      </> : list.error ? <p className="gh-err">{list.error}</p> : null}
      {asking ? <SignedConfirm title="Create an invite code" who={live.userName} where={orgs.find((o) => o.id === org)?.name} busy={busy === "invite"} confirm="Create code" onClose={() => setAsking(false)} onConfirm={() => void create()} tick="I am inviting this person to work in this organisation with this role.">
        <p>{name.trim() || "The person"} joins {orgs.find((o) => o.id === org)?.name} as {ROLE_LABEL[role].toLowerCase()}{email.trim() ? `, using ${email.trim()}` : ""}. The role decides what they can see and record.</p>
      </SignedConfirm> : null}
    </Block>
  );
}

