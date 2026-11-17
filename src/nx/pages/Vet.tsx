"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, CalendarPlus, Lock, Stethoscope } from "lucide-react";
import { dueFollowups, type DueFollowup } from "@/lib/ops";
import { STAGE_LABEL, stageOf, verificationQueue, type QueueRow } from "@/lib/abc";
import { ListPage, type Col } from "../ListPage";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { VET_APPTS, VET_CASES, VET_PROCS, type Tone, type VetAppt, type VetCase, type VetProc } from "../fixtures";
import { HealthToday } from "./Health";
import { bookAppointment, setAppointmentStatus, useAppointments, useCases, useDogs, useLive, useTasks, type Appointment, type Case, type Dog } from "../live";
import { ClinicPatients, ClinicToday } from "./VetClinic";
import { AtKaju } from "../AtKaju";
import { Grid, Panel, Rows, Split, TasksPanel, Tile, Tiles, type Item } from "../HomeCards";
import { animalLine, animalSearch } from "../animalLabel";
import { useAnimalRefs } from "../data/animals";

/* The veterinary experience, inside Healthcare, for a veterinarian of an NGO. It reads that NGO's own animals, cases,
   procedures and follow-ups; appointments are the only new record. Clinical findings and sign-offs are recorded on
   the case pages that already hold them. Kaju reads none of this, and nothing here decides a treatment. */

const SEV: Record<string, Tone> = { critical: "bad", high: "warn", normal: "plain", low: "plain" };
const SEV_ORDER = ["critical", "high", "normal", "low"];
const CLINICAL = new Set(["injury", "rescue", "other", "medical", "treatment"]);
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();
const dayOf = (iso: string): VetAppt["day"] => { const d = new Date(iso), t = new Date(); t.setHours(0, 0, 0, 0); const n = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - t.getTime()) / 864e5); return n < 0 ? "Past" : n === 0 ? "Today" : n === 1 ? "Tomorrow" : "Later"; };
const whenOf = (iso: string) => { const k = dayOf(iso); return k === "Today" ? `Today ${hhmm(iso)}` : k === "Tomorrow" ? `Tomorrow ${hhmm(iso)}` : new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); };
/** The animal as the register names it: "Tiger (132)" or "Dog 128". */
const animalName = (d: Dog | undefined) => (d ? animalLine(d) : "Animal not linked");
const KIND: Record<string, string> = { check: "Check", procedure: "Procedure", vaccination: "Vaccination", recovery: "Recovery check", other: "Other" };
const STATUS: Record<Appointment["status"], [string, Tone]> = { booked: ["Booked", "accent"], done: ["Done", "ok"], missed: ["Missed", "bad"], cancelled: ["Cancelled", "plain"] };

/** The NGO this veterinarian works for, or null; sample when signed out. */
function useVet() {
  const live = useLive();
  const vet = live.orgFor("healthcare");
  const isVet = vet?.kind === "veterinary";
  return { live, vet: isVet ? vet : null, orgId: live.org && isVet ? vet!.org_id : null, sample: live.ready && !live.org };
}
function Gate({ crumb, v, children }: { crumb: string; v: ReturnType<typeof useVet>; children: () => ReactNode }) {
  if (!v.live.ready) return <Shell ws="health" crumb={["Healthcare", crumb]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (!v.sample && !v.vet) return <Shell ws="health" crumb={["Healthcare", crumb]}><div className="nx-page"><h1 className="nx-h1">{crumb}</h1><p className="nx-sub">This is a veterinarian&apos;s view of an NGO&apos;s animals. Your account is not a veterinarian in an NGO; the role is given by the organisation&apos;s lead.</p></div></Shell>;
  return <>{children()}</>;
}

/* ── Appointments ─────────────────────────────────────────────────── */
type ApRow = { id: string; title: string; kind: string; animal: string; dogId: string | null; when: string; day: VetAppt["day"]; at: number; status: Appointment["status"]; vet: string };
export function Appointments() {
  const v = useVet();
  const ap = useAppointments(v.orgId);
  const dogs = useDogs(v.orgId);
  const [booking, setBooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const dogMap = useMemo(() => new Map((dogs.rows ?? []).map((d) => [d.id, d])), [dogs.rows]);
  const rows: ApRow[] = v.sample ? VET_APPTS.map((a, i) => ({ ...a, dogId: null, at: i })) : (ap.rows ?? []).map((a) => ({ id: a.id, title: a.title, kind: a.kind, animal: animalName(a.dog_id ? dogMap.get(a.dog_id) : undefined), dogId: a.dog_id, when: whenOf(a.starts_at), day: dayOf(a.starts_at), at: Date.parse(a.starts_at), status: a.status, vet: a.vet_name ?? "—" }));
  const today = rows.filter((r) => r.day === "Today" && r.status === "booked").length;
  const book = async (f: FormData) => {
    if (v.sample) { setMsg("Sample data: sign in as a veterinarian to book."); setBooking(false); return; }
    const date = String(f.get("date") ?? ""), time = String(f.get("time") ?? "09:00");
    if (!date) { setMsg("Choose a date."); return; }
    setBusy(true);
    const { error } = await bookAppointment({ org_id: v.orgId!, dog_id: String(f.get("dog") ?? "") || null, title: String(f.get("title") ?? "").trim(), kind: String(f.get("kind") ?? "check"), starts_at: new Date(`${date}T${time}`).toISOString(), duration_min: Number(f.get("duration")) || 30, vet_name: String(f.get("vet") ?? "").trim() || v.live.userName, note: String(f.get("note") ?? "").trim() || null });
    setBusy(false);
    if (error) { setMsg(/check/.test(error.message) ? "Give the appointment a short title." : error.message); return; }
    setBooking(false); setMsg("Booked."); ap.reload();
  };
  const mark = async (r: ApRow, s: Appointment["status"]) => {
    if (v.sample) { setMsg("Sample data: sign in to update appointments."); return; }
    const { error } = await setAppointmentStatus(r.id, s); setMsg(error ? error.message : `Marked ${STATUS[s][0].toLowerCase()}.`); ap.reload();
  };
  const cols: Col<ApRow>[] = [
    { label: "Appointment", width: "minmax(0, 1.5fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.title}</b><small>{r.animal}<span className="nx-only-s"> · {r.when}</span></small></span></span> },
    { label: "When", width: "170px", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.when}</span> },
    { label: "Kind", width: "120px", hideOnPhone: true, render: (r) => <span className="nx-t3">{KIND[r.kind] ?? r.kind}</span> },
    { label: "State", width: "100px", render: (r) => <Chip tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Chip> },
  ];
  const needle = animalSearch(q).toLowerCase();
  const free = (dogs.rows ?? []).filter((d) => `${animalLine(d)} ${d.straypaw_id ?? ""} ${d.code ?? ""}`.toLowerCase().includes(needle)).slice(0, 50);
  return <Gate crumb="Appointments" v={v}>{() => <>
    <ListPage ws="health" crumb={["Healthcare", "Appointments"]} title="Appointments" sample={v.sample} eyebrow={v.sample ? "Kind Hour · Veterinary" : v.vet!.name}
      sub={!v.sample && ap.rows === null ? "Reading appointments…" : <><b className="num">{today}</b> booked for today. Booking a visit is not a clinical decision; findings are recorded on the animal&apos;s case.</>}
      action={<button type="button" className="nx-btn is-keep" onClick={() => setBooking(true)}><CalendarPlus size={14} />Book</button>}
      views={[{ id: "today", label: "Today", test: (r: ApRow) => r.day === "Today" }, { id: "next", label: "Coming up", test: (r: ApRow) => r.day !== "Past" && r.status === "booked" }, { id: "past", label: "Past", test: (r: ApRow) => r.day === "Past" }, { id: "all", label: "All", test: () => true }]}
      columns={cols} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.title} search={(r) => `${r.title} ${r.animal}`} sort={(a, b) => a.at - b.at}
      preview={(r) => ({ title: r.title, sub: <><Chip tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Chip> <span className="nx-t3">{r.when}</span></>, body: <>
        <dl className="nx-props"><div><dt>Animal</dt><dd>{r.dogId ? <Link href={`/ngo/animals/${r.dogId}`} style={{ color: "var(--accent)" }}>{r.animal}</Link> : r.animal}</dd></div><div><dt>Kind</dt><dd>{KIND[r.kind] ?? r.kind}</dd></div><div><dt>Veterinarian</dt><dd>{r.vet}</dd></div></dl>
        {r.status === "booked" ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}><button type="button" className="nx-btn is-sm" onClick={() => mark(r, "done")}>Mark done</button><button type="button" className="nx-btn is-sm is-quiet" onClick={() => mark(r, "missed")}>Missed</button><button type="button" className="nx-btn is-sm is-quiet" onClick={() => mark(r, "cancelled")}>Cancel</button></div> : null}
        {msg ? <p className="nx-foot" role="status">{msg}</p> : null}
        <p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>Marking a visit done records that it happened. What was found and done goes on the case, signed by the veterinarian.</span></p></> })}
      loading={!v.sample && ap.rows === null} error={ap.error} note={msg} empty={{ none: "No appointments yet", hint: "Book a check, procedure or recovery visit for an animal on the register." }} />
    {booking ? <div className="nx-modal" role="dialog" aria-label="Book an appointment" onKeyDown={(e) => { if (e.key === "Escape") setBooking(false); }}>
      <form className="nx-modal-b nx-form" onSubmit={(e) => { e.preventDefault(); void book(new FormData(e.currentTarget)); }}>
        <h2 className="nx-h3" style={{ marginTop: 0, fontSize: 15 }}>Book an appointment</h2>
        <label>What<input name="title" required minLength={2} maxLength={160} autoFocus placeholder="Recovery check after sterilisation" /></label>
        <label>Animal<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find by name or ID" aria-label="Find an animal" /><select name="dog" defaultValue=""><option value="">Not on the register</option>{free.map((d) => <option key={d.id} value={d.id}>{animalName(d)}</option>)}</select></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label>Kind<select name="kind" defaultValue="check">{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label>Date<input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label>Time<input type="time" name="time" defaultValue="10:00" /></label>
          <label>Minutes<select name="duration" defaultValue="30"><option>15</option><option>30</option><option>45</option><option>60</option><option>90</option></select></label>
        </div>
        <label>Veterinarian<input name="vet" maxLength={120} placeholder={v.live.userName ?? "Name"} /></label>
        <label>Note<textarea name="note" rows={2} maxLength={1000} /></label>
        <div style={{ display: "flex", gap: 8 }}><button type="submit" className="nx-btn" disabled={busy}>{busy ? "Booking…" : "Book"}</button><button type="button" className="nx-btn is-quiet" onClick={() => setBooking(false)}>Cancel</button></div>
      </form>
    </div> : null}
  </>}</Gate>;
}

/* ── Clinical care and patients (from the NGO's open cases) ───────── */
type CareRow = VetCase & { dogId: string | null; caseHref?: string };
function useCare(v: ReturnType<typeof useVet>) {
  const cases = useCases(v.orgId);
  const dogs = useDogs(v.orgId);
  const dogMap = useMemo(() => new Map((dogs.rows ?? []).map((d) => [d.id, d])), [dogs.rows]);
  const rows: CareRow[] = v.sample ? VET_CASES.map((c) => ({ ...c, dogId: null })) : (cases.rows ?? []).filter((c: Case) => !c.resolved_at && CLINICAL.has((c.category ?? "").toLowerCase()) && !/imported_historical/.test(c.provenance ?? "")).map((c) => ({
    id: c.id, code: c.case_code && c.case_code.length > 14 ? `${c.case_code.slice(0, 4)}…${c.case_code.slice(-6)}` : c.case_code ?? c.id.slice(0, 8).toUpperCase(), title: c.title ?? "Case", animal: animalName(c.dog_id ? dogMap.get(c.dog_id) : undefined), category: (c.category ?? "other").replace(/^./, (x) => x.toUpperCase()), severity: (SEV_ORDER.includes(c.severity ?? "") ? c.severity : "normal") as VetCase["severity"], next: c.next_action ?? "No next step written", updated: c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—", dogId: c.dog_id, caseHref: `/ngo/cases/${c.id}` }));
  return { rows, loading: !v.sample && cases.rows === null, error: cases.error, all: cases.rows ?? [], dogMap };
}
const careCols: Col<CareRow>[] = [
  { label: "Case", width: "minmax(0, 1.5fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.title}</b><small>{r.animal} · {r.code}</small></span></span> },
  { label: "Next", width: "minmax(0, 1.2fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.next}</span> },
  { label: "Kind", width: "90px", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.category}</span> },
  { label: "Severity", width: "100px", render: (r) => <Chip tone={SEV[r.severity] ?? "plain"}>{r.severity.replace(/^./, (x) => x.toUpperCase())}</Chip> },
];
const careNote = <p className="nx-note" style={{ marginTop: 14 }}><Stethoscope size={13} /><span>Examination findings, treatment and sign-off are recorded on the case by the veterinarian. StrayPaw does not suggest diagnoses or treatments.</span></p>;
export function ClinicalCare() {
  const v = useVet(); const c = useCare(v);
  return <Gate crumb="Clinical care" v={v}>{() => <ListPage ws="health" crumb={["Healthcare", "Clinical care"]} title="Clinical care" sample={v.sample} eyebrow={v.sample ? "Kind Hour · Veterinary" : v.vet!.name}
    sub={c.loading ? "Reading cases…" : <><b className="num">{c.rows.filter((r) => r.severity === "critical" || r.severity === "high").length}</b> critical or high of {c.rows.length} open injury, rescue and treatment cases. Most urgent first.</>}
    views={[{ id: "urgent", label: "Critical and high", test: (r: CareRow) => r.severity === "critical" || r.severity === "high" }, { id: "all", label: "All open", test: () => true }]}
    columns={careCols} rows={c.rows} rowKey={(r) => r.id} rowLabel={(r) => r.title} search={(r) => `${r.title} ${r.animal} ${r.code}`} sort={(a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)}
    preview={(r) => ({ title: r.title, sub: <><Chip tone={SEV[r.severity] ?? "plain"}>{r.severity}</Chip> {r.category}</>, body: <><dl className="nx-props"><div><dt>Animal</dt><dd>{r.dogId ? <Link href={`/ngo/animals/${r.dogId}`} style={{ color: "var(--accent)" }}>{r.animal}</Link> : r.animal}</dd></div><div><dt>Case</dt><dd className="num">{r.code}</dd></div><div><dt>Next step</dt><dd>{r.next}</dd></div><div><dt>Updated</dt><dd>{r.updated}</dd></div></dl>{careNote}</>, href: r.caseHref, hrefLabel: "Open the case", hrefNote: "Notes, treatment and sign-off are on the case." })}
    loading={c.loading} error={c.error} empty={{ none: "No open clinical cases", hint: "Injury, rescue and treatment cases appear here while they are open." }} />}</Gate>;
}

type PatRow = { id: string; animal: string; cases: number; worst: VetCase["severity"]; titles: string; dogId: string | null };
export function Patients() {
  const live = useLive(); const hc = live.orgFor("healthcare");
  if (live.org && hc?.source === "vet_clinic") return <ClinicPatients clinic={hc} />;
  return <NgoPatients />;
}
function NgoPatients() {
  const v = useVet(); const c = useCare(v);
  const rows: PatRow[] = useMemo(() => {
    const by = new Map<string, CareRow[]>();
    for (const r of c.rows) { const k = r.dogId ?? r.animal; by.set(k, [...(by.get(k) ?? []), r]); }
    return [...by].map(([k, rs]) => ({ id: k, animal: rs[0].animal, cases: rs.length, worst: rs.map((x) => x.severity).sort((a, b) => SEV_ORDER.indexOf(a) - SEV_ORDER.indexOf(b))[0], titles: rs.map((x) => x.title).join(" · "), dogId: rs[0].dogId }));
  }, [c.rows]);
  const cols: Col<PatRow>[] = [
    { label: "Animal", width: "minmax(0, 1.2fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.animal}</b><small>{r.titles}</small></span></span> },
    { label: "Open cases", width: "100px", hideOnPhone: true, render: (r) => <span className="num">{r.cases}</span> },
    { label: "Most urgent", width: "120px", render: (r) => <Chip tone={SEV[r.worst] ?? "plain"}>{r.worst.replace(/^./, (x) => x.toUpperCase())}</Chip> },
  ];
  return <Gate crumb="Patients" v={v}>{() => <ListPage ws="health" crumb={["Healthcare", "Patients"]} title="Patients" sample={v.sample} eyebrow={v.sample ? "Kind Hour · Veterinary" : v.vet!.name}
    sub={c.loading ? "Reading patients…" : <><b className="num">{rows.length}</b> {rows.length === 1 ? "animal is" : "animals are"} under clinical care. An animal with no open injury, rescue or treatment case is not listed.</>}
    views={[{ id: "all", label: "Under care", test: () => true }, { id: "urgent", label: "Critical or high", test: (r: PatRow) => r.worst === "critical" || r.worst === "high" }]}
    columns={cols} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.animal} search={(r) => `${r.animal} ${r.titles}`} sort={(a, b) => SEV_ORDER.indexOf(a.worst) - SEV_ORDER.indexOf(b.worst)}
    preview={(r) => ({ title: r.animal, sub: `${r.cases} open ${r.cases === 1 ? "case" : "cases"}`, body: <><p>{r.titles}</p>{careNote}</>, href: r.dogId ? `/ngo/animals/${r.dogId}` : undefined, hrefLabel: "Open the animal", hrefNote: "Its full history, cases and procedures are on the record." })}
    loading={c.loading} error={c.error} empty={{ none: "No animals under care", hint: "Animals appear here while they have an open clinical case." }} />}</Gate>;
}

/* ── Procedures: the ABC queue, from the veterinarian's side ──────── */
type ProcRow = VetProc & { href?: string };
const PROC_TONE: Record<string, Tone> = { "Waiting for vet": "warn", "Needs evidence": "bad", Signed: "ok" };
export function Procedures() {
  const v = useVet();
  const [q, setQ] = useState<QueueRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!v.orgId) return; let alive = true; verificationQueue().then((r) => { if (alive) setQ(r); }).catch((e: unknown) => { if (alive) { setQ([]); setErr(e instanceof Error ? e.message : "The procedure queue could not be read."); } }); return () => { alive = false; }; }, [v.orgId]);
  const rows: ProcRow[] = v.sample ? VET_PROCS.map((p) => ({ ...p, href: `/health/procedures/${p.id}` })) : (q ?? []).filter((r) => !/imported_historical/.test(r.provenance ?? "")).map((r) => { const st = stageOf(r); return { id: r.case_id, code: r.case_code && r.case_code.length > 14 ? `${r.case_code.slice(0, 4)}…${r.case_code.slice(-6)}` : r.case_code ?? r.case_id.slice(0, 8).toUpperCase(), animal: r.title ?? "Procedure", stage: r.vet_authorised ? "Signed" : st === "vet" ? "Waiting for vet" : st === "evidence" ? "Needs evidence" : (STAGE_LABEL[st] as VetProc["stage"]), missing: r.missing.map((m) => m.replace(/_/g, " ")), vet: r.vet_name, when: new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), href: `/health/procedures/${r.case_id}` }; });
  const waiting = rows.filter((r) => r.stage === "Waiting for vet").length;
  const cols: Col<ProcRow>[] = [
    { label: "Procedure", width: "minmax(0, 1.4fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.animal}</b><small>{r.code} · {r.when}{r.missing.length ? ` · missing ${r.missing.join(", ")}` : ""}</small></span></span> },
    { label: "Signed by", width: "minmax(0, .8fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.vet ?? "—"}</span> },
    { label: "State", width: "140px", render: (r) => <Chip tone={PROC_TONE[r.stage] ?? "plain"}>{r.stage}</Chip> },
  ];
  return <Gate crumb="Procedures" v={v}>{() => <ListPage ws="health" crumb={["Healthcare", "Procedures"]} title="Procedures" sample={v.sample} eyebrow={v.sample ? "Kind Hour · Veterinary" : v.vet!.name}
    sub={!v.sample && q === null ? "Reading procedures…" : <><b className="num">{waiting}</b> {waiting === 1 ? "procedure waits" : "procedures wait"} for a veterinarian&apos;s sign-off. Only a veterinarian can sign, and the signature names them.</>}
    views={[{ id: "vet", label: "Waiting for you", test: (r: ProcRow) => r.stage === "Waiting for vet" }, { id: "ev", label: "Needs evidence", test: (r: ProcRow) => r.stage === "Needs evidence" }, { id: "signed", label: "Signed", test: (r: ProcRow) => r.stage === "Signed" }, { id: "all", label: "All", test: () => true }]}
    columns={cols} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.code} search={(r) => `${r.code} ${r.animal}`}
    preview={(r) => ({ title: r.animal, sub: <><Chip tone={PROC_TONE[r.stage] ?? "plain"}>{r.stage}</Chip> <span className="num nx-t3">{r.code}</span></>, body: <><dl className="nx-props"><div><dt>Missing</dt><dd>{r.missing.length ? r.missing.join(", ") : "Nothing"}</dd></div><div><dt>Signed by</dt><dd>{r.vet ?? "Not signed"}</dd></div><div><dt>Recorded</dt><dd>{r.when}</dd></div></dl><p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>Signing confirms the surgery record as the veterinarian&apos;s own. It is never done for you, and StrayPaw keeps who signed and when.</span></p></>, href: r.href, hrefLabel: "Review and sign", hrefNote: "The sign-off is on the procedure's page." })}
    loading={!v.sample && q === null} error={err} empty={{ none: "No procedures recorded", hint: "Sterilisation records appear here as they are filed." }} />}</Gate>;
}

/* ── Follow-ups ───────────────────────────────────────────────────── */
type FuRow = { id: string; what: string; animal: string; when: string; day: VetAppt["day"] | "Overdue"; at: number; href?: string };
export function VetFollowups() {
  const v = useVet();
  const [fs, setFs] = useState<DueFollowup[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!v.orgId) return; let alive = true; dueFollowups().then((r) => { if (alive) setFs(r); }).catch((e: unknown) => { if (alive) { setFs([]); setErr(e instanceof Error ? e.message : "Follow-ups could not be read."); } }); return () => { alive = false; }; }, [v.orgId]);
  const refs = useAnimalRefs(v.orgId, (fs ?? []).map((f) => f.dog_id));
  const rows: FuRow[] = v.sample ? [
    { id: "f1", what: "Day 7 observation after a bite report", animal: "Tan female (1107)", when: "12 Nov", day: "Overdue", at: 0 },
    { id: "f2", what: "Recovery check after sterilisation", animal: "Bhura (987)", when: "Today", day: "Today", at: 1 },
    { id: "f3", what: "Second mange dose", animal: "Laila (877)", when: "Fri 21 Nov", day: "Later", at: 2 },
  ] : (fs ?? []).filter((f) => f.source !== "historical_import").map((f) => { const d = dayOf(f.due_at); return { id: f.id, what: f.note || (f.kind ?? "Follow-up").replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase()), animal: f.dog_id ? animalLine(refs?.get(f.dog_id) ?? { id: f.dog_id, name: f.animal_name, straypaw_id: f.straypaw_id }) : "Animal not linked", when: whenOf(f.due_at), day: d === "Past" ? "Overdue" : d, at: Date.parse(f.due_at), href: f.case_id ? `/ngo/cases/${f.case_id}` : undefined }; });
  const late = rows.filter((r) => r.day === "Overdue").length;
  const cols: Col<FuRow>[] = [
    { label: "Follow-up", width: "minmax(0, 1.5fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.what}</b><small>{r.animal}</small></span></span> },
    { label: "Due", width: "150px", render: (r) => <Chip tone={r.day === "Overdue" ? "bad" : r.day === "Today" ? "accent" : "plain"}>{r.day === "Overdue" ? `Overdue · ${r.when}` : r.when}</Chip> },
  ];
  return <Gate crumb="Follow-ups" v={v}>{() => <ListPage ws="health" crumb={["Healthcare", "Follow-ups"]} title="Follow-ups" sample={v.sample} eyebrow={v.sample ? "Kind Hour · Veterinary" : v.vet!.name}
    sub={!v.sample && fs === null ? "Reading follow-ups…" : <><b className="num">{rows.length}</b> due in the next 7 days{late ? <>, <b className="num">{late}</b> overdue</> : null}. Follow-ups from imported registers are left out.</>}
    views={[{ id: "all", label: "Next 7 days", test: () => true }, { id: "late", label: "Overdue", test: (r: FuRow) => r.day === "Overdue" }]}
    columns={cols} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.what} search={(r) => `${r.what} ${r.animal}`} sort={(a, b) => a.at - b.at}
    preview={(r) => ({ title: r.what, sub: r.animal, body: <><dl className="nx-props"><div><dt>Due</dt><dd>{r.when}</dd></div></dl>{careNote}</>, href: r.href, hrefLabel: "Open the case" })}
    loading={!v.sample && fs === null} error={err} empty={{ none: "No follow-ups due", hint: "Follow-ups scheduled on cases appear here." }} />}</Gate>;
}

/* ── Today ────────────────────────────────────────────────────────── */
export function VetToday() {
  const v = useVet();
  const ap = useAppointments(v.orgId);
  const tasks = useTasks(v.orgId);
  const c = useCare(v);
  const [q, setQ] = useState<QueueRow[] | null>(null);
  const [qErr, setQErr] = useState<string | null>(null);
  useEffect(() => { if (!v.orgId) return; let alive = true; verificationQueue().then((r) => { if (alive) setQ(r); }).catch((e: unknown) => { if (alive) setQErr(e instanceof Error ? e.message : "The procedure queue could not be read."); }); return () => { alive = false; }; }, [v.orgId]);
  const appts = v.sample ? VET_APPTS.filter((a) => a.day === "Today") : (ap.rows ?? []).filter((a) => dayOf(a.starts_at) === "Today" && a.status === "booked").map((a) => ({ id: a.id, title: a.title, animal: animalName(a.dog_id ? c.dogMap.get(a.dog_id) : undefined), when: hhmm(a.starts_at) }));
  const signRows: ProcRow[] = v.sample ? VET_PROCS.filter((p) => p.stage === "Waiting for vet").map((p) => ({ ...p, href: `/health/procedures/${p.id}` })) : (q ?? []).filter((r) => !r.vet_authorised && stageOf(r) === "vet" && !/imported_historical/.test(r.provenance ?? "")).map((r) => ({ id: r.case_id, code: r.case_code && r.case_code.length > 14 ? `${r.case_code.slice(0, 4)}…${r.case_code.slice(-6)}` : r.case_code ?? r.case_id.slice(0, 8).toUpperCase(), animal: r.title ?? "Procedure", stage: "Waiting for vet" as const, missing: r.missing.map((m) => m.replace(/_/g, " ")), vet: r.vet_name, when: new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), href: `/health/procedures/${r.case_id}` }));
  const urgent = c.rows.filter((r) => r.severity === "critical" || r.severity === "high");
  /* undefined while a read is under way, null when it failed: a figure is never a zero that was not counted. */
  const apN = v.sample ? appts.length : ap.error ? null : ap.rows ? appts.length : undefined;
  const signN = v.sample ? signRows.length : qErr ? null : q ? signRows.length : undefined;
  const careN = v.sample ? c.rows.length : c.error ? null : c.loading ? undefined : c.rows.length;
  const sev = (s: string) => c.rows.filter((r) => r.severity === s).length;
  return <Gate crumb="Today" v={v}>{() => (
    <Shell ws="health" crumb={["Healthcare", "Today"]}>
      <div className="nx-page hm-page">
        <div className="nx-head"><div><p className="nx-eyebrow">{v.sample ? "Kind Hour · Veterinary" : v.vet!.name}{v.sample ? <Sample /> : null}</p><h1 className="nx-h1">Today</h1><p className="nx-sub">{apN === undefined || signN === undefined ? "Reading your day…" : "Booking a visit is not a clinical decision; findings and sign-offs are recorded on the case."}</p></div></div>
        <AtKaju role="vet" note="Kaju reads only what you can open. Clinical decisions stay with you." />
        <Tiles>
          <Tile label="Appointments today" n={apN} href="/health/appointments" />
          <Tile label="Waiting for your sign-off" n={signN} tone={signN ? "warn" : "plain"} href="/health/procedures" />
          <Tile label="Critical or high cases" n={careN === undefined || careN === null ? careN : urgent.length} tone={urgent.length ? "bad" : "plain"} href="/health/care" />
          <Tile label="Open clinical cases" n={careN} href="/health/care?view=all"
            visual={c.rows.length ? <Split parts={[{ n: sev("critical"), tone: "bad", label: "critical" }, { n: sev("high"), tone: "warn", label: "high" }, { n: sev("normal") + sev("low"), tone: "plain", label: "other" }]} /> : null} />
        </Tiles>
        <Grid cols={v.orgId ? 2 : 3}>
          <Panel id="vt-a" title="Appointments today">
            <Rows items={v.sample || ap.rows ? appts.map((a): Item => ({ id: a.id, title: a.title, meta: a.animal, href: "/health/appointments", icon: <CalendarPlus size={16} />, tone: "blue", chip: { text: a.when, tone: "blue" } })) : null}
              error={ap.error} all={{ href: "/health/appointments" }} empty="Nothing booked for today." />
          </Panel>
          <Panel id="vt-u" title="Most urgent">
            <Rows items={v.sample || !c.loading ? urgent.map((r): Item => ({ id: r.id, title: r.title, meta: `${r.animal} · ${r.next}`, href: r.caseHref, icon: <Stethoscope size={16} />, tone: r.severity === "critical" ? "bad" : "warn", chip: { text: r.severity.replace(/^./, (x) => x.toUpperCase()), tone: r.severity === "critical" ? "bad" : "warn" } })) : null}
              error={c.error} all={{ href: "/health/care" }} empty="No critical or high cases are open." />
          </Panel>
          <Panel id="vt-s" title="Waiting for your sign-off">
            <Rows items={v.sample || q ? signRows.map((r): Item => ({ id: r.id, title: r.animal, meta: `${r.code} · ${r.when}${r.missing.length ? ` · missing ${r.missing.join(", ")}` : ""}`, href: r.href, icon: <Lock size={16} />, tone: "warn", chip: { text: "Sign", tone: "warn" } })) : null}
              error={qErr} all={{ href: "/health/procedures" }} empty="Nothing waits for your signature." />
          </Panel>
          {v.orgId ? <TasksPanel orgId={v.orgId} userId={v.live.userId} tasks={tasks} /> : null}
        </Grid>
        <p className="hm-note" style={{ marginTop: 16 }}>This view reads {v.sample ? "the NGO" : v.vet!.name}&apos;s own animals and cases. StrayPaw does not suggest diagnoses or treatments; only a veterinarian signs a procedure.</p>
      </div>
    </Shell>
  )}</Gate>;
}

/** Healthcare's Today: a veterinarian of an NGO gets their day; a clinic or laboratory gets theirs. */
export function HealthHome() {
  const live = useLive();
  const hc = live.orgFor("healthcare");
  /* An independent clinic keeps its own patients; a veterinarian of an NGO works on that NGO's animals. */
  if (live.org && hc?.source === "vet_clinic") return <ClinicToday clinic={hc} />;
  return hc?.kind === "veterinary" ? <VetToday /> : <HealthToday />;
}
