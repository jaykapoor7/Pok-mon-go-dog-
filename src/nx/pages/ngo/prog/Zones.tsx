"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Download, Plus } from "lucide-react";
import type { CampaignStats } from "@/lib/campaigns";
import { downloadCsv } from "@/lib/csv";
import type { Survey } from "@/lib/types";
import { useRead } from "@/oh/data";
import { leadOrCoord, read, readMembers, requestFor, type Member } from "../../../data/ngo-setup";
import { assessSurvey, readAssessments, readBoundary, readDrives, readSurveys, readZoneProgress, readZones, reviewSurvey, surveyResult, zoneAction, type Assessment, type AssessmentResult, type Zone, type ZoneAction, type ZoneProgress } from "../../../data/ngo-programmes";
import { Confirm, Failed, Field, FilePick, Modal, Props, Skeleton, dayTime, errText, useAct } from "../../../kit";
import { Chip } from "../../../ui";
import type { Tone } from "../../../fixtures";
import { Drawer, Grid, Tools, TryLink, Views, type GCol, type Who } from "../frame";
import { S_DRIVES, S_MEMBERS, S_ZONES } from "../sample";

/* Working zones: the boundaries a drive is worked in, who is assigned, how far along it is, and what was recorded
   inside each one. Every change goes through zone_action with a confirmation and is checked against the zone row and
   the audit log before the page says it happened. Completing an assignment never stands for coverage. */

const LABEL: Record<Zone["status"], string> = { assigned: "Assigned work", reported_complete: "Reported complete", supervisor_reviewed: "Supervisor reviewed" };
const TONE: Record<Zone["status"], Tone> = { assigned: "accent", reported_complete: "warn", supervisor_reviewed: "ok" };
const ASK: Record<ZoneAction, string> = { create: "Create this working zone?", assign: "Assign this member to the zone?", unassign: "Remove this assignment? Its audit history stays.", report_complete: "Report the assigned work complete? This does not verify coverage.", review_completion: "Record the supervisor review? This does not accept any municipal claim." };
const DONE: Record<ZoneAction, string> = { create: "Working zone created; the zone and its audit were checked.", assign: "Member assigned; the assignment was checked.", unassign: "Assignment removed; checked.", report_complete: "Reported complete; the zone and its audit were checked.", review_completion: "Supervisor review recorded; checked." };
type Data = { zones: Zone[]; drives: CampaignStats[]; members: Member[] };

export function ZonesTab({ who }: { who: Who }) {
  const leader = who.sample || leadOrCoord(who.role);
  const r = useRead<Data>(() => read(async () => { const [z, d, m] = await Promise.all([readZones(), readDrives(false), leader ? readMembers().catch(() => [] as Member[]) : Promise.resolve([] as Member[])]); return { zones: z, drives: d, members: m }; }), `ns:zones:${leader}`, !who.sample && !!who.ngo);
  const [mine, setMine] = useState<"all" | "mine">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={4} label="Reading working zones" />;
  if (!who.sample && r.error && !r.data) return <Failed error={errText(r.error)} retry={r.reload} />;
  const d: Data = who.sample ? { zones: S_ZONES, drives: S_DRIVES, members: S_MEMBERS } : r.data!;
  const me = who.sample ? "u3" : who.userId;
  const shown = d.zones.filter((z) => mine === "all" || (!!me && z.staff.includes(me)));
  const waiting = d.zones.filter((z) => z.status === "reported_complete").length;
  const driveName = (id: string) => d.drives.find((x) => x.id === id)?.name ?? "A drive";
  const open = d.zones.find((z) => z.id === openId) ?? null;
  const cols: GCol<Zone>[] = [
    { label: "Zone", width: "minmax(0, 1.5fr)", render: (z) => <span className="nx-cell-main"><span><b>{z.name}</b><small>{driveName(z.campaign_id)}<span className="nx-only-s"> · {z.staff.length} assigned</span></small></span></span> },
    { label: "Planned", width: "88px", render: (z) => <span className="num nx-t2">{z.planned ?? "—"}</span> },
    { label: "Staff", width: "80px", render: (z) => <span className="num nx-t2">{z.staff.length}</span> },
    { label: "Updated", width: "130px", render: (z) => <span className="nx-t3">{dayTime(z.updated_at)}</span> },
    { label: "Status", width: "160px", keep: true, render: (z) => <Chip tone={TONE[z.status]}>{LABEL[z.status]}</Chip> },
  ];
  return (
    <>
      <Tools end={who.sample ? <TryLink small><Plus size={13} />Create a working zone</TryLink> : leader ? <button type="button" className="nx-btn is-sm" onClick={() => setMaking(true)}><Plus size={13} />Create a working zone</button> : null}>
        <span className="ns-sum">{d.zones.length ? <><b>{d.zones.length}</b> working {d.zones.length === 1 ? "zone" : "zones"}{waiting ? <>, <b>{waiting}</b> reported complete and waiting for supervisor review</> : null}.</> : "No working zones recorded. A coordinator can add a drive boundary and assign staff."}</span>
      </Tools>
      <Views id="zn" value={mine} onChange={setMine} views={[{ id: "all", label: "All zones", count: d.zones.length }, { id: "mine", label: "Assigned to me", count: d.zones.filter((z) => !!me && z.staff.includes(me)).length }]} />
      <Grid label="Working zones" cols={cols} rows={shown} rowKey={(z) => z.id} rowLabel={(z) => z.name} onOpen={(z) => setOpenId(z.id)} openKey={openId}
        empty={<><b>{d.zones.length ? "No zone is assigned to you" : "No working zones recorded"}</b><p>{d.zones.length ? "Choose All zones to see every zone." : "A coordinator can add a drive boundary and assign staff."}</p></>} />
      <AnimatePresence>{open ? <Drawer key={open.id} head={driveName(open.campaign_id)} title={open.name} sub={<Chip tone={TONE[open.status]}>{LABEL[open.status]}</Chip>} onClose={() => setOpenId(null)}>
        <ZoneDetail sample={who.sample} zone={open} leader={leader} me={me} members={d.members} onChanged={r.reload} />
      </Drawer> : null}</AnimatePresence>
      {making ? <NewZone drives={d.drives.filter((x) => !x.archived)} onClose={() => setMaking(false)} onDone={() => { setMaking(false); r.reload(); }} /> : null}
    </>
  );
}

function useZoneAct(onChanged: () => void) {
  const { busy, run } = useAct();
  const requests = useRef(new Map<string, string>());
  const [asking, setAsking] = useState<{ zone: string; action: ZoneAction; payload: Record<string, unknown>; after?: () => void } | null>(null);
  const go = () => { if (!asking) return; const a = asking; void run(`z:${a.action}`, () => zoneAction(requestFor(requests.current, [a.zone, a.action, a.payload]), a.zone, a.action, a.payload), { ok: DONE[a.action] }).then((x) => { setAsking(null); if (x.ok) { a.after?.(); onChanged(); } }); };
  const dialog = asking ? <Confirm title={ASK[asking.action].replace(/\?.*$/, "")} confirm="Confirm" busy={busy?.startsWith("z:")} onClose={() => setAsking(null)} onConfirm={go}><p>{ASK[asking.action]}</p></Confirm> : null;
  return { busy, ask: setAsking, dialog };
}

function ZoneDetail({ sample, zone, leader, me, members, onChanged }: { sample: boolean; zone: Zone; leader: boolean; me: string | null; members: Member[]; onChanged: () => void }) {
  const { busy, ask, dialog } = useZoneAct(onChanged);
  const [person, setPerson] = useState("");
  const [note, setNote] = useState("");
  const canReport = zone.status === "assigned" && !!me && zone.staff.includes(me);
  const canReview = zone.status === "reported_complete" && leader;
  return (
    <>
      <Props items={[["Planned", zone.planned ?? "Not recorded"], ["Assigned staff", zone.staff.length ? zone.staff.map((id) => members.find((m) => m.user_id === id)?.name ?? "Former or unavailable member").join(", ") : "No one yet"], ["Updated", dayTime(zone.updated_at)]]} />
      {zone.note ? <p className="nx-note" style={{ marginTop: 12 }}><span>{zone.note}</span></p> : null}
      {leader ? <>
        <h3 className="nx-h3">Assignment</h3>
        {sample ? <TryLink quiet small>Assign a member</TryLink> : <div className="nx-fields">
          <Field label="Member"><select value={person} onChange={(e) => setPerson(e.target.value)}><option value="">Choose a member</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name} · {m.role.replace(/_/g, " ")}</option>)}</select></Field>
          <div style={{ display: "flex", gap: 6, alignItems: "end", flexWrap: "wrap" }}>
            <button type="button" className="nx-btn is-sm" disabled={!!busy || !person || zone.staff.includes(person)} onClick={() => ask({ zone: zone.id, action: "assign", payload: { user_id: person } })}>Assign</button>
            <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy || !zone.staff.includes(person)} onClick={() => ask({ zone: zone.id, action: "unassign", payload: { user_id: person } })}>Remove assignment</button>
          </div>
        </div>}
      </> : null}
      {canReport || canReview ? <>
        <h3 className="nx-h3">{canReport ? "Report the work complete" : "Supervisor review"}</h3>
        {sample ? <TryLink small>{canReport ? "Report work complete" : "Record supervisor review"}</TryLink> : <div className="ns-compose">
          <label className="nx-field"><span>{canReport ? "Completion note" : "Review note"}</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1500} /></label>
          <div><button type="button" className="nx-btn is-sm" disabled={!!busy || !note.trim()} onClick={() => ask({ zone: zone.id, action: canReport ? "report_complete" : "review_completion", payload: { note }, after: () => setNote("") })}>{canReport ? "Report work complete" : "Record supervisor review"}</button></div>
        </div>}
      </> : null}
      <h3 className="nx-h3">Activity and survey reporting</h3>
      {sample ? <p className="nx-sub">Signed in, this shows what was recorded inside the boundary for a period, and survey assessments of it.</p> : <ZoneReport zoneId={zone.id} leader={leader} me={me} />}
      {dialog}
    </>
  );
}

function ZoneReport({ zoneId, leader, me }: { zoneId: string; leader: boolean; me: string | null }) {
  const today = new Date().toISOString().slice(0, 10);
  const { busy, run } = useAct();
  const requests = useRef(new Map<string, string>());
  const [range, setRange] = useState({ start: `${today.slice(0, 7)}-01`, end: today });
  const [d, setD] = useState<{ progress: ZoneProgress; surveys: Survey[]; assessments: Assessment[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AssessmentResult>>({});
  const [form, setForm] = useState({ survey: "", method: "field_sample", version: 1, reference: "" });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [asking, setAsking] = useState<null | { kind: "assess" } | { kind: "review"; id: string; decision: "confirmed" | "returned" }>(null);
  const load = useCallback(async () => {
    try { const [p, s, a] = await Promise.all([readZoneProgress(zoneId, range.start, range.end), readSurveys(), readAssessments(zoneId)]); setD({ progress: p, surveys: s, assessments: a }); setResults({}); setErr(null); }
    catch (e) { setErr(errText(e)); }
  }, [zoneId, range.start, range.end]);
  useEffect(() => { void load(); }, [load]);
  const p = d?.progress;
  const figs: [string, number | null][] = p ? [["Planned interventions", p.planned], ["Field records", p.field_records], ["Reported sterilisations", p.reported_sterilisations], ["Reported ARV vaccinations", p.reported_vaccinations], ["Awaiting coordinator review", p.awaiting_coordinator_review], ["With veterinary authorisation", p.veterinarian_authorised_cases], ["With coordinator evidence review", p.coordinator_reviewed_cases], ["Municipally accepted", p.municipally_accepted_cases]] : [];
  const assess = () => void run("assess", () => assessSurvey(requestFor(requests.current, [form.survey, form.method, form.version, form.reference]), zoneId, form.survey, form.method, form.version, form.reference), { ok: "Assessment saved; the source and audit were checked." }).then((x) => { setAsking(null); if (x.ok) void load(); });
  const review = (id: string, decision: "confirmed" | "returned") => void run(`rv:${id}`, () => reviewSurvey(requestFor(requests.current, [id, decision, notes[id]]), id, decision, notes[id] ?? ""), { ok: decision === "confirmed" ? "Method confirmed; checked." : "Assessment returned; checked." }).then((x) => { setAsking(null); if (x.ok) void load(); });
  return (
    <div className="ns-stack">
      <div className="nx-fields">
        <Field label="From"><input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} /></Field>
        <Field label="To"><input type="date" min={range.start} value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} /></Field>
      </div>
      {err ? <Failed error={err} retry={() => void load()} /> : !p ? <Skeleton rows={4} label="Reading zone reporting" /> : <>
        <dl className="ns-dl">{figs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v ?? "Unknown"}</dd></div>)}</dl>
        <p className="ns-small">{p.basis}. Generated {dayTime(p.generated_at)}. Assignment completion does not establish coverage. Source: {p.source_provenance.map((v) => `${v.provenance.replace(/_/g, " ")} ${v.records}`).join(" · ") || "no structured records in this period"}.</p>
        <div><button type="button" className="nx-btn is-quiet is-sm" onClick={() => downloadCsv(`zone-${zoneId}-${range.start}-${range.end}.csv`, [{ ...p, source_provenance: JSON.stringify(p.source_provenance), coverage_percent: "Unknown; see separately reviewed survey assessment" }])}><Download size={12} />Activity CSV</button></div>
        <h3 className="nx-h3">Survey assessment</h3>
        <div className="nx-fields">
          <Field label="Source survey"><select value={form.survey} onChange={(e) => setForm({ ...form, survey: e.target.value })}><option value="">Choose a survey</option>{d!.surveys.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>
          <Field label="Documented method"><select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="field_sample">Field sample · observed proportion only</option><option value="complete_census">Documented complete census · needs separate review</option></select></Field>
          <Field label="Method version"><input type="number" min={1} step={1} value={form.version} onChange={(e) => setForm({ ...form, version: Number(e.target.value) })} /></Field>
          <Field label="Method and completeness source"><input value={form.reference} maxLength={2000} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
        </div>
        <div><button type="button" className="nx-btn is-sm" disabled={!!busy || !form.survey || !form.reference.trim() || form.version < 1} onClick={() => setAsking({ kind: "assess" })}>Prepare survey assessment</button></div>
        {d!.assessments.length ? <ul className="ns-conn" aria-label="Survey assessments">{d!.assessments.map((a) => { const res = results[a.id]; return <li key={a.id}>
          <div className="ns-conn-h" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}><span className="ns-conn-t"><b>{a.method === "field_sample" ? "Field sample" : "Reported complete census"} · {dayTime(a.created_at)}</b><small>Source: {a.source_reference}</small></span>
            <span className="ns-conn-e"><Link className="nx-btn is-quiet is-sm" href={`/next/ngo/programmes/surveys/${a.survey_id}`}>Observations</Link><button type="button" className="nx-btn is-quiet is-sm" onClick={() => void surveyResult(a.id).then((v) => setResults((o) => ({ ...o, [a.id]: v }))).catch(() => setErr("The assessment could not be read."))}>Read result</button></span></div>
          {res ? <div className="ns-stack">
            <p className="nx-sub">Observations <b>{res.observations}</b> · animals <b>{res.animals ?? "Unknown"}</b> · observed marked <b>{res.observed_marked_percent === null ? "Unknown" : `${res.observed_marked_percent}%`}</b> · population coverage <b>{res.coverage_percent === null ? "Unknown" : `${res.coverage_percent}%`}</b></p>
            <p className="nx-sub">{res.interpretation}</p>
            {res.limitations.length ? <ul className="ns-list">{res.limitations.map((l) => <li key={l}>{l}</li>)}</ul> : null}
            <p className="ns-small">{res.review ? `${res.review.decision} by ${res.review.actor} · ${res.review.note}` : "No independent method review recorded."}</p>
            <div><button type="button" className="nx-btn is-quiet is-sm" onClick={() => downloadCsv(`survey-assessment-${a.id}.csv`, [{ ...res, review: JSON.stringify(res.review), limitations: res.limitations.join("; ") }])}><Download size={12} />Assessment CSV</button></div>
          </div> : null}
          {leader && me !== a.created_by ? <div className="ns-compose">
            <label className="nx-field"><span>Method review note</span><textarea value={notes[a.id] ?? ""} maxLength={3000} onChange={(e) => setNotes((v) => ({ ...v, [a.id]: e.target.value }))} /></label>
            <div className="ns-row-acts" style={{ justifyContent: "flex-start" }}><button type="button" className="nx-btn is-sm" disabled={!!busy || !notes[a.id]?.trim()} onClick={() => setAsking({ kind: "review", id: a.id, decision: "confirmed" })}>Confirm method and completeness</button><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy || !notes[a.id]?.trim()} onClick={() => setAsking({ kind: "review", id: a.id, decision: "returned" })}>Return assessment</button></div>
          </div> : null}
        </li>; })}</ul> : null}
      </>}
      {asking?.kind === "assess" ? <Confirm title="Save a survey assessment" confirm="Save assessment" busy={busy === "assess"} onClose={() => setAsking(null)} onConfirm={assess}><p>An immutable assessment of the survey&apos;s current observations for this zone. No coverage or clinical outcome is assumed.</p></Confirm> : null}
      {asking?.kind === "review" ? <Confirm title={asking.decision === "confirmed" ? "Confirm the method" : "Return the assessment"} confirm={asking.decision === "confirmed" ? "Confirm" : "Return"} busy={busy === `rv:${asking.id}`} onClose={() => setAsking(null)} onConfirm={() => review(asking.id, asking.decision)}><p>{asking.decision === "confirmed" ? "Confirm the documented method and census completeness" : "Return this method assessment"}? This is not veterinary or municipal certification. Recorded in your name.</p></Confirm> : null}
    </div>
  );
}

function NewZone({ drives, onClose, onDone }: { drives: CampaignStats[]; onClose: () => void; onDone: () => void }) {
  const { busy, ask, dialog } = useZoneAct(onDone);
  const zoneId = useRef(crypto.randomUUID());
  const [f, setF] = useState({ name: "", campaign: "", planned: "" });
  const [geometry, setGeometry] = useState<unknown>(null);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const ok = f.name.trim().length >= 3 && !!f.campaign && !!geometry;
  if (dialog) return dialog;
  return (
    <Modal title="Create a working zone" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!ok || !!busy} onClick={() => ask({ zone: zoneId.current, action: "create", payload: { name: f.name, campaign_id: f.campaign, planned: f.planned, geometry } })}>Review</button></>}>
      <div className="nx-fields">
        <Field label="Zone name" wide><input value={f.name} minLength={3} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Drive"><select value={f.campaign} onChange={(e) => setF({ ...f, campaign: e.target.value })}><option value="">Choose an active drive</option>{drives.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Planned interventions (optional)"><input type="number" min={0} max={1000000} value={f.planned} onChange={(e) => setF({ ...f, planned: e.target.value })} /></Field>
      </div>
      <div className="ns-stack" style={{ gap: 6 }}>
        <span className="ns-small">Boundary: one Polygon or MultiPolygon GeoJSON file, under 90 KB.</span>
        <div><FilePick label={fileName || "Choose a boundary file"} accept=".json,.geojson,application/geo+json" onFiles={async ([file]) => { setGeometry(null); setFileName(""); try { setGeometry(await readBoundary(file)); setFileName(file.name); setErr(null); } catch (e) { setErr(errText(e)); } }} /></div>
        {err ? <p className="ns-note-bad" role="alert">{err}</p> : null}
      </div>
    </Modal>
  );
}
