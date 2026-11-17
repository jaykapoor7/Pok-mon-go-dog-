"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { call as rpc } from "@/oh/data";
import { FlaskConical, Info, Lock, Route, Stethoscope, Syringe } from "lucide-react";
import { SERVICE_LABEL, call, select, useNames, useRead, type ClinicDue, type ClinicTransfers, type Notice, type RegisterRow, type Sample } from "@/oh/data";
import { ListPage, type Col } from "../ListPage";
import { Shell } from "../Shell";
import { Chip, Sample as SampleChip } from "../ui";
import { BITES, CLINIC, LAB_SAMPLES, REFERRALS, type Tone } from "../fixtures";
import { useLive, type Workspace } from "../live";
import { useAct } from "../kit";
import { LabSteps } from "./health/Lab";
import { PepDose } from "./health/Exposure";
import { AtKaju } from "../AtKaju";
import { Grid, MiniBars, Panel, Rows, Split, Tile, Tiles, type Item } from "../HomeCards";

/* Healthcare: one workspace, a different experience for a clinic and for a laboratory. Everything here is read
   from the restricted health records through the functions the current app already uses, as the signed-in person.
   Rows open the clinical record or the sample, where the work is recorded. Kaju reads these records only for someone who
   can open them here, and never makes a clinical or laboratory decision. */

export const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const today = () => new Date().toISOString().slice(0, 10);
const COURSE: Record<string, Tone> = { "Waiting for a clinician": "warn", "In course": "accent", Completed: "ok", "Did not return": "bad" };
export const STATUS: Record<string, Tone> = { Collected: "plain", Dispatched: "plain", Received: "accent", Testing: "warn", Resulted: "ok", Rejected: "bad" };
export const word = (v: string | null | undefined) => (v ? v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "—");
export const isLab = (o: Workspace | null) => o?.kind === "laboratory";
const privacy = <p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>Patient details stay with the treating facility. Partners see only the animal facts needed for a follow-up. Kaju reads these records only for someone who can open them here, and never makes a clinical decision.</span></p>;

/** The clinic or laboratory this person works in. A veterinarian of an NGO is not one: their view is the veterinary one. */
export function useClinic() { const live = useLive(); const h = live.orgFor("healthcare"); return h?.kind === "veterinary" ? null : h; }
export function NotHealth({ crumb }: { crumb: string }) {
  return <Shell ws="health" crumb={["Healthcare", crumb]}><div className="nx-page"><h1 className="nx-h1">{crumb}</h1><p className="nx-sub">Your account is not part of a hospital, clinic or laboratory, so there are no clinical records here. Access to clinical records is granted by the facility; it cannot be chosen from a menu.</p></div></Shell>;
}

/* ── Bite register ─────────────────────────────────────────────────── */
type BiteRow = { id: string; code: string; ref: string; age: string; category: string; species: string; area: string; on: string; course: string; doses: string; next: string | null; late: boolean; href?: string };
const biteCols: Col<BiteRow>[] = [
  { label: "Presentation", width: "minmax(0, 1.4fr)", render: (r) => <span className="nx-cell-main"><span><b className="num">{r.code}</b><small>{r.ref} · {r.age}<span className="nx-only-s"> · {r.area}</span></small></span></span> },
  { label: "Category", width: "120px", render: (r) => <Chip tone={r.category === "III" ? "bad" : r.category === "Not yet assessed" ? "warn" : "plain"}>{r.category === "Not yet assessed" ? "Not assessed" : `Category ${r.category}`}</Chip> },
  { label: "Animal", width: "88px", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.species}</span> },
  { label: "Area", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.area}</span> },
  { label: "Course", width: "150px", hideOnPhone: true, render: (r) => <Chip tone={COURSE[r.course] ?? "plain"}>{r.course}</Chip> },
  { label: "Next dose", width: "120px", hideOnPhone: true, render: (r) => <span className="nx-t3" style={r.late ? { color: "var(--bad)", fontWeight: 500 } : undefined}>{r.next ?? "—"}</span> },
];
const biteViews = [
  { id: "all", label: "All", test: () => true },
  { id: "wait", label: "Waiting for a clinician", test: (r: BiteRow) => r.course === "Waiting for a clinician" },
  { id: "course", label: "In course", test: (r: BiteRow) => r.course === "In course" },
  { id: "late", label: "Dose overdue", test: (r: BiteRow) => r.late },
  { id: "closed", label: "Closed", test: (r: BiteRow) => r.course === "Completed" || r.course === "Did not return" },
];
const bitePreview = (r: BiteRow) => ({
  title: <span className="num">{r.code}</span>, sub: <>{r.ref} · {r.on} <Chip tone={COURSE[r.course] ?? "plain"}>{r.course}</Chip></>,
  body: <><dl className="nx-props"><div><dt>Category</dt><dd>{r.category}</dd></div><div><dt>Age band</dt><dd>{r.age}</dd></div><div><dt>Animal</dt><dd>{r.species}</dd></div><div><dt>Area</dt><dd>{r.area}</dd></div><div><dt>Doses</dt><dd>{r.doses}</dd></div><div><dt>Next dose</dt><dd>{r.next ?? "—"}</dd></div></dl>{privacy}</>,
  href: r.href, hrefLabel: "Open the clinical record", hrefNote: "Assessment, prescription and doses are recorded in the clinical record, by the clinician.",
});

function shapeBite(r: RegisterRow): BiteRow {
  const t = today(), late = !!r.next_due && r.next_due < t;
  const course = r.category === "pending" || !r.course_status ? (r.category === "I" ? "Completed" : "Waiting for a clinician") : r.course_status === "completed" ? "Completed" : r.course_status === "lost_to_follow_up" ? "Did not return" : "In course";
  return { id: r.id, code: r.code, ref: r.patient_ref ?? "No reference", age: r.age_band, category: r.category === "pending" ? "Not yet assessed" : r.category, species: word(r.species), area: r.area ?? "—", on: d(r.exposure_on), course, doses: r.doses_total ? `${r.doses_given} of ${r.doses_total} given` : "—", next: r.next_due ? (late ? `Overdue since ${d(r.next_due)}` : r.next_due === t ? "Today" : d(r.next_due)) : null, late, href: `/health/bites/${r.id}` };
}

export function Bites() {
  const live = useLive(); const org = useClinic();
  const reg = useRead<RegisterRow[]>(() => call("oh_clinic_register", { p_facility: org!.org_id, p_filter: "all", p_limit: 300 }), `nx-reg:${org?.org_id}`, !!org && !isLab(org));
  const rows = useMemo(() => (org && reg.data ? reg.data.map((r) => shapeBite(r)) : []), [org, reg.data]);
  if (!live.ready) return <Shell ws="health" crumb={["Healthcare", "Bite cases"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const sample = !live.org;
  if (!sample && (!org || isLab(org))) return <NotHealth crumb="Bite cases" />;
  const list = sample ? BITES.map((b) => ({ ...b, late: (b.next ?? "").startsWith("Overdue"), href: `/health/bites/${b.id}` })) : rows;
  return <ListPage ws="health" crumb={["Healthcare", "Bite cases"]} eyebrow={sample ? CLINIC.name : org!.name} title="Bite cases" sample={sample}
    sub={sample || reg.data ? <><b className="num">{list.filter((r) => r.course === "Waiting for a clinician").length}</b> waiting for a clinician, <b className="num">{list.filter((r) => r.late).length}</b> with a dose overdue. Categories and doses are entered by clinicians.</> : "Reading the register…"}
    views={biteViews} columns={biteCols} rows={list} rowKey={(r) => r.id} rowLabel={(r) => r.code} search={(r) => `${r.code} ${r.ref} ${r.area}`}
    preview={bitePreview} loading={!sample && !reg.data && !reg.error} error={reg.error} empty={{ none: "No bites recorded yet", hint: "Each presentation is recorded by the clinic." }}
    action={<Link href="/health/bites/new" className="nx-btn is-keep">Record a bite</Link>} />;
}

/* ── PEP doses due ─────────────────────────────────────────────────── */
type DoseRow = { id: string; code: string; ref: string; dose: string; due: string; late: boolean; isToday: boolean; reminder: string; href?: string; doseNo?: number; dueOn?: string };
const doseCols: Col<DoseRow>[] = [
  { label: "Presentation", width: "minmax(0, 1.3fr)", render: (r) => <span className="nx-cell-main"><span><b className="num">{r.code}</b><small>{r.ref}</small></span></span> },
  { label: "Dose", width: "140px", render: (r) => <span className="nx-t2">{r.dose}</span> },
  { label: "Due", width: "150px", render: (r) => r.late ? <Chip tone="bad">{r.due}</Chip> : r.isToday ? <Chip tone="accent">Today</Chip> : <span className="nx-t3">{r.due}</span> },
  { label: "Last reminder", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.reminder}</span> },
];
const SAMPLE_DOSES: DoseRow[] = [
  { id: "p1", code: "BX-2611-9C1D", ref: "OPD-ILL-0409", dose: "Dose 3", due: "Today", late: false, isToday: true, reminder: "Called yesterday, answered", href: "/health/bites/b2" },
  { id: "p2", code: "BX-2611-27E0", ref: "OPD-ILL-0398", dose: "Dose 4", due: "Today", late: false, isToday: true, reminder: "None yet", href: "/health/bites/b3" },
  { id: "p3", code: "BX-2611-B7A3", ref: "OPD-ILL-0391", dose: "Dose 3", due: "Overdue 3 days", late: true, isToday: false, reminder: "Called 2 days ago, no answer", href: "/health/bites/b4" },
];
export function Pep() {
  const live = useLive(); const org = useClinic();
  const due = useRead<ClinicDue>(() => call("oh_clinic_due", { p_facility: org!.org_id }), `nx-due:${org?.org_id}`, !!org && !isLab(org));
  const rows = useMemo<DoseRow[]>(() => (org && due.data ? due.data.due.map((x) => { const t = due.data!.today, late = x.due_on < t; return { id: x.dose_id, code: x.code, ref: x.patient_ref ?? "No reference", dose: `Dose ${x.dose_no} of ${x.doses_total}`, due: late ? `Overdue since ${d(x.due_on)}` : x.due_on === t ? "Today" : d(x.due_on), late, isToday: x.due_on === t, reminder: x.last_reminder ? `${d(x.last_reminder.at)}, ${word(x.last_reminder.outcome).toLowerCase()}` : "None yet", href: `/health/bites/${x.exposure_id}`, doseNo: x.dose_no, dueOn: x.due_on }; }) : []), [org, due.data]);
  if (!live.ready) return <Shell ws="health" crumb={["Healthcare", "PEP"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const sample = !live.org;
  if (!sample && (!org || isLab(org))) return <NotHealth crumb="PEP" />;
  const list = sample ? SAMPLE_DOSES : rows;
  return <ListPage ws="health" crumb={["Healthcare", "PEP"]} eyebrow={sample ? CLINIC.name : org!.name} title="Doses due" sample={sample}
    sub={sample || due.data ? <><b className="num">{list.filter((r) => r.isToday).length}</b> due today, <b className="num">{list.filter((r) => r.late).length}</b> overdue. Schedules are the clinician&apos;s; StrayPaw only counts the days.</> : "Reading doses…"}
    views={[{ id: "all", label: "All due", test: () => true }, { id: "today", label: "Today", test: (r: DoseRow) => r.isToday }, { id: "late", label: "Overdue", test: (r: DoseRow) => r.late }]}
    columns={doseCols} rows={list} rowKey={(r) => r.id} rowLabel={(r) => `${r.code}, ${r.dose}`} sort={(a, b) => Number(b.late) - Number(a.late)}
    preview={(r) => ({ title: <span className="num">{r.code}</span>, sub: <>{r.ref} · {r.dose}</>, body: <><dl className="nx-props"><div><dt>Due</dt><dd>{r.due}</dd></div><div><dt>Reminder</dt><dd style={{ fontWeight: 400 }}>{r.reminder}</dd></div></dl><PepDose sample={sample} orgId={org?.org_id ?? null} dose={r.doseNo && r.dueOn ? { dose_id: r.id, dose_no: r.doseNo, due_on: r.dueOn, label: r.ref } : null} onDone={due.reload} /><p className="nx-note" style={{ marginTop: 14 }}><Info size={13} /><span>A dose counts as given only when a person records it at the clinic. A reminder sent is not a dose given.</span></p>{privacy}</>, href: r.href, hrefLabel: "Open the clinical record", hrefNote: "The course, every dose and the reminder calls are in the clinical record." })}
    loading={!sample && !due.data && !due.error} error={due.error} empty={{ none: "No doses are due", hint: "Everyone in a course is up to date." }} />;
}

/* ── Laboratory samples ────────────────────────────────────────────── */
type SRow = { raw?: Sample; id: string; code: string; species: string; type: string; from: string; area: string; collected: string; status: string; result: string | null; days: number; href?: string };
const sCols: Col<SRow>[] = [
  { label: "Sample", width: "minmax(0, 1.3fr)", render: (r) => <span className="nx-cell-main"><span><b className="num">{r.code}</b><small>{r.species} · {r.type}<span className="nx-only-s"> · {r.from}</span></small></span></span> },
  { label: "From", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.from}</span> },
  { label: "Collected", width: "120px", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.collected}</span> },
  { label: "Status", width: "120px", render: (r) => <Chip tone={STATUS[r.status] ?? "plain"}>{r.status}</Chip> },
  { label: "Result", width: "110px", render: (r) => r.result ? <Chip tone={r.result === "Positive" ? "bad" : "plain"}>{r.result}</Chip> : <span className="nx-t3">Not released</span> },
];
/* The register of every sample sent here. Testing and Results are their own pages; this one is about arrival. */
const sViews = [
  { id: "all", label: "All samples", test: () => true },
  { id: "transit", label: "Arriving", test: (r: SRow) => r.status === "Dispatched" || r.status === "Collected" },
  { id: "rej", label: "Rejected", test: (r: SRow) => r.status === "Rejected" },
];
export function Samples({ title = "Samples" }: { title?: string }) {
  const live = useLive(); const org = useClinic();
  const rows = useRead<Sample[]>(() => select<Sample>("oh_samples", { laboratory_id: org!.org_id }), `nx-lab:${org?.org_id}`, !!org && isLab(org));
  const names = useNames(!!org && isLab(org));
  const now = Date.now();
  const list = useMemo<SRow[]>(() => (org && rows.data ? rows.data.map((s) => ({ id: s.id, code: s.code, species: word(s.species), type: word(s.sample_type), from: names.org(s.submitted_by) ?? "Submitting partner", area: s.place ?? names.area(s.area_id) ?? "—", collected: d(s.collected_on), status: word(s.status), result: s.status === "resulted" && s.result ? word(s.result) : null, days: Math.floor((now - Date.parse(s.collected_on)) / 864e5), href: `/health/samples/${s.id}`, raw: s })) : []), [org, rows.data, now, names]);
  if (!live.ready) return <Shell ws="health" crumb={["Healthcare", title]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const sample = !live.org;
  if (!sample && !isLab(org)) return <Shell ws="health" crumb={["Healthcare", title]}><div className="nx-page"><h1 className="nx-h1">{title}</h1><p className="nx-sub">Receiving and testing samples is a laboratory&apos;s work. {org ? `${org.name} is not a laboratory.` : "Your account is not part of a laboratory."}</p><p style={{ marginTop: 16 }}><Link href="/health/samples/new" className="nx-btn is-quiet">Send a sample to a laboratory</Link></p></div></Shell>;
  const data: SRow[] = sample ? LAB_SAMPLES.map((r) => ({ ...r, href: `/health/samples/${r.id}` })) : list;
  const queue = data.filter((r) => r.status !== "Resulted");
  return <ListPage ws="health" crumb={["Healthcare", title]} eyebrow={sample ? "Reference Rabies Diagnostic Laboratory" : org!.name} title={title} sample={sample}
    sub={sample || rows.data ? <><b className="num">{queue.length}</b> in the queue{queue.length ? <>, the oldest collected <b className="num">{Math.max(...queue.map((r) => r.days))}</b> days ago</> : null}. A result is released when a laboratory scientist records it with the method and validates it.</> : "Reading samples…"}
    views={sViews} columns={sCols} rows={data} rowKey={(r) => r.id} rowLabel={(r) => r.code} search={(r) => `${r.code} ${r.species} ${r.from} ${r.area}`} sort={(a, b) => b.days - a.days}
    preview={(r) => ({ title: <span className="num">{r.code}</span>, sub: <>{r.species} · {r.type} <Chip tone={STATUS[r.status] ?? "plain"}>{r.status}</Chip></>, body: <><dl className="nx-props"><div><dt>From</dt><dd>{r.from}</dd></div><div><dt>Place</dt><dd>{r.area}</dd></div><div><dt>Collected</dt><dd>{r.collected}</dd></div><div><dt>Result</dt><dd>{r.result ?? "Not released"}</dd></div></dl>{sample ? <LabSteps compact sample s={{ id: r.id, code: r.code, status: r.status.toLowerCase(), species: r.species.toLowerCase(), sample_type: r.type.toLowerCase().replace(/ /g, "_") }} onDone={() => {}} /> : r.raw ? <LabSteps compact s={r.raw} onDone={rows.reload} /> : null}<p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>Receiving, testing and releasing a result are steps taken by named laboratory staff. Kaju never interprets or releases a result.</span></p></>, href: r.href, hrefLabel: "Open the sample", hrefNote: "Chain of custody and the result are recorded on the sample." })}
    loading={!sample && !rows.data && !rows.error} error={rows.error} empty={{ none: "No samples have been sent to this laboratory", hint: "Partners send samples from their workspace." }} />;
}

/* ── Today: a clinic's day, or a laboratory's queue ───────────────── */
export function HealthToday() {
  const live = useLive(); const org = useClinic();
  const clinic = !!org && !isLab(org);
  const due = useRead<ClinicDue>(() => call("oh_clinic_due", { p_facility: org!.org_id }), `nx-due:${org?.org_id}`, clinic);
  const notices = useRead<Notice[]>(() => call("oh_clinic_notices", { p_facility: org!.org_id }), `nx-not:${org?.org_id}`, clinic);
  /* The same reads, with the same keys, as the Bite cases and Referrals pages, so each figure is the count of the list it
     opens (and coming back to either page shows it at once). */
  const reg = useRead<RegisterRow[]>(() => call("oh_clinic_register", { p_facility: org!.org_id, p_filter: "all", p_limit: 300 }), `nx-reg:${org?.org_id}`, clinic);
  const tr = useRead<ClinicTransfers>(() => call("oh_clinic_transfers", { p_facility: org!.org_id }), `nx-tr:${org?.org_id}`, clinic);
  const [allNotices, setAllNotices] = useState(false);
  // Until the session is known (live.org is null) the sample page below is shown: it paints first, and members never see it.
  if (live.org && isLab(org)) return <LabToday org={org!} />;
  const sample = !live.org;
  if (!sample && !org) return <NotHealth crumb="Today" />;
  const t = due.data?.today ?? today();
  /* A figure is a number the database returned, undefined while it is read, or null when the read failed. */
  const st = <T,>(r: { data: T | null; error: string | null }, f: (d: T) => number) => (r.error ? null : r.data ? f(r.data) : undefined);
  const doses = sample ? SAMPLE_DOSES.filter((x) => x.isToday).length : st(due, (x) => x.due.filter((y) => y.due_on === t).length);
  const late = sample ? SAMPLE_DOSES.filter((x) => x.late).length : st(due, (x) => x.due.filter((y) => y.due_on < t).length);
  /* Waiting for a clinician as the Bite cases page decides it (shapeBite), from the same register read. */
  const waitList: { id: string; code: string; meta: string; on: string | null }[] | null = sample
    ? BITES.filter((b) => b.course === "Waiting for a clinician").map((b) => ({ id: b.id, code: b.code, meta: `${b.ref} · ${b.species} · ${b.area}`, on: null }))
    : reg.data ? reg.data.map((r) => ({ r, b: shapeBite(r) })).filter((x) => x.b.course === "Waiting for a clinician").map(({ r, b }) => ({ id: r.id, code: r.code, meta: `${b.ref} · ${b.species} · ${b.area} · ${b.on}`, on: r.exposure_on })) : null;
  const waitN = sample ? waitList!.length : st(reg, () => waitList!.length);
  /* People referred here who have not arrived yet, as the Referrals page's "On the way here". */
  const coming = sample ? REFERRALS.filter((r) => r.dir === "in" && r.status === "Referred").map((r) => ({ id: r.id, code: r.code, meta: `From ${r.other} · ${r.service}`, sent: r.sent }))
    : tr.data ? tr.data.incoming.filter((x) => x.status === "sent").map((x) => ({ id: x.id, code: x.code, meta: `From ${x.from_short ?? x.from} · ${SERVICE_LABEL[x.service] ?? word(x.service)}`, sent: d(x.sent_at) })) : null;
  const comingN = sample ? coming!.length : st(tr, () => coming!.length);
  const fresh = sample ? null : notices.data ? notices.data.filter((n) => n.status === "new") : null;
  /* The dose load: overdue, today and each of the next six days, from the same list the PEP page reads. */
  const dueList = sample ? [...SAMPLE_DOSES.filter((x) => x.late).map(() => ({ due_on: "" })), ...SAMPLE_DOSES.filter((x) => x.isToday).map(() => ({ due_on: t }))] : due.data?.due ?? null;
  const week = dueList ? [{ key: "Overdue", n: dueList.filter((x) => x.due_on < t).length, tone: "warn" as const }, ...Array.from({ length: 7 }, (_, i) => { const dd = new Date(`${t}T12:00:00`); dd.setDate(dd.getDate() + i); const iso = dd.toISOString().slice(0, 10); return { key: i === 0 ? "Today" : dd.toLocaleDateString("en-IN", { weekday: "short" }), n: dueList.filter((x) => x.due_on === iso).length, tone: i === 0 ? "blue" as const : "plain" as const }; })] : null;
  const oldestLate = !sample && due.data ? due.data.due.filter((x) => x.due_on < t).map((x) => x.due_on).sort()[0] ?? null : null;
  const waitDays = (waitList ?? []).filter((r) => r.on).map((r) => Math.floor((Date.now() - Date.parse(r.on!)) / 864e5));
  const oldestWait = !sample && waitDays.length ? Math.max(...waitDays) : null;
  const doseRows: Item[] | null = sample
    ? SAMPLE_DOSES.map((x) => ({ id: x.id, title: <span className="num">{x.code}</span>, meta: `${x.ref} · ${x.dose}`, href: x.href, icon: <Syringe size={16} />, tone: x.late ? "warn" as const : "blue" as const, chip: { text: x.late ? x.due : "Today", tone: x.late ? "warn" as const : "blue" as const }, kaju: `Add a task: call about ${x.code}, ${x.dose.toLowerCase()}, today`, kajuLabel: `Make a task with @Kaju for ${x.code}` }))
    : due.data ? [...due.data.due].sort((a, b) => a.due_on.localeCompare(b.due_on)).map((x) => { const lt = x.due_on < t; return { id: x.dose_id, title: <span className="num">{x.code}</span>, meta: `${x.patient_ref ?? "No reference"} · Dose ${x.dose_no} of ${x.doses_total}${x.last_reminder ? ` · reminded ${d(x.last_reminder.at)}` : ""}`, href: `/health/bites/${x.exposure_id}`, icon: <Syringe size={16} />, tone: lt ? "warn" as const : "blue" as const, chip: { text: lt ? `Overdue since ${d(x.due_on)}` : x.due_on === t ? "Today" : d(x.due_on), tone: lt ? "warn" as const : x.due_on === t ? "blue" as const : "plain" as const }, kaju: `Add a task: call about ${x.code}, dose ${x.dose_no}, today`, kajuLabel: `Make a task with @Kaju for ${x.code}` }; }) : null;
  const waitRows: Item[] | null = waitList ? waitList.map((r) => ({ id: r.id, title: <span className="num">{r.code}</span>, meta: r.meta, href: `/health/bites/${r.id}`, icon: <Stethoscope size={16} />, tone: "warn" as const, chip: { text: "Assess", tone: "warn" as const } })) : null;
  const comingRows: Item[] | null = coming ? coming.map((r) => ({ id: r.id, title: <span className="num">{r.code}</span>, meta: r.meta, href: "/health/referrals?view=in", icon: <Route size={16} />, tone: "blue" as const, chip: { text: `Sent ${r.sent}`, tone: "plain" as const } })) : null;
  const noticeRows = sample ? [{ id: "n1", what: "Brown dog, unprovoked bite", where: "Near a park · today", cb: true, phone: null as string | null, raw: null as Notice | null }, { id: "n2", what: "Puppy, scratch on a child's hand", where: "Outside a school · yesterday", cb: false, phone: null, raw: null }]
    : (fresh ?? []).map((n) => ({ id: n.id, what: n.animal_description ?? word(n.animal_species), where: `${n.place ?? n.area ?? "Place not given"} · ${d(n.happened_on)}`, cb: n.callback_consent, phone: n.callback_phone, raw: n }));
  const who = "Patient details stay with the treating facility. Partners see only the animal facts needed for a follow-up. Kaju reads these records only for someone who can open them here, and never makes a clinical decision.";
  return (
    <Shell ws="health" crumb={["Healthcare", "Today"]}>
      <div className="nx-page hm-page">
        <div className="nx-head"><div><p className="nx-eyebrow">{sample ? CLINIC.name : org!.name}{sample ? <SampleChip /> : null}</p><h1 className="nx-h1">Today</h1><p className="nx-sub">{doses === undefined ? "Reading the day…" : doses === null ? "The doses due could not be read, so nothing is shown as clear." : <><b className="num">{doses}</b> {doses === 1 ? "dose" : "doses"} due today{late ? <>, <b className="num">{late}</b> overdue</> : null}. <b className="num">{waitN ?? "—"}</b> waiting for a clinician.</>}</p></div>
          <Link href="/health/bites/new" className="nx-btn is-keep">Record a bite</Link></div>
        <AtKaju role="clinic" note="Kaju reads only what you can open. Clinical decisions stay with you." />
        <Tiles>
          <Tile label="Doses due today" n={doses} tone={doses ? "blue" : "plain"} href="/health/pep?view=today" visual={week ? <MiniBars label="Overdue, then the next 7 days" values={week} /> : null} />
          <Tile label="Doses overdue" n={late} tone={late ? "warn" : "plain"} href="/health/pep?view=late" note={oldestLate ? `The oldest due since ${d(oldestLate)}` : sample && late ? "The oldest due 3 days ago" : undefined} />
          <Tile label="Waiting for a clinician" n={waitN} tone={waitN ? "warn" : "plain"} href="/health/bites?view=wait" note={oldestWait !== null ? `The longest since an exposure ${oldestWait === 0 ? "today" : `${oldestWait} ${oldestWait === 1 ? "day" : "days"} ago`}` : sample ? "Category and course are set by a clinician" : undefined} />
          <Tile label="Referred here, on the way" n={comingN} tone={comingN ? "blue" : "plain"} href="/health/referrals?view=in" note="Sent by another facility, not arrived yet" />
        </Tiles>
        <Grid cols={3}>
          <Panel id="h-wait" title="Waiting for a clinician">
            <Rows items={waitRows} error={reg.error} retry={reg.reload} all={{ href: "/health/bites?view=wait" }} empty="Nobody is waiting for an assessment." />
          </Panel>
          <Panel id="h-dose" title="Doses due" foot={<span>A dose counts as given only when it is recorded at the clinic.</span>}>
            <Rows items={doseRows} error={due.error} retry={due.reload} all={{ href: "/health/pep" }} empty="No doses are due. Everyone in a course is up to date." />
          </Panel>
          <Panel id="h-not" title="Notices from the public" count={sample ? noticeRows.length : fresh?.length}>
            {!sample && notices.error ? <Rows items={null} error={notices.error} retry={notices.reload} empty="" /> : !sample && !notices.data ? <Rows items={null} empty="" /> : noticeRows.length ? (
              <ul className="hm-rows">{(allNotices ? noticeRows.slice(0, 30) : noticeRows.slice(0, 5)).map((n) => (
                <li key={n.id} className="hm-row">
                  <div className="hm-row-m"><span className="hm-row-i t-blue" aria-hidden><Info size={16} /></span><span className="hm-row-t"><b>{n.what}</b><small><span className="hm-row-meta">{n.where} · {n.cb ? "asked to be called back" : "no callback requested"}{n.phone ? <> · <a href={`tel:${n.phone.replace(/\s/g, "")}`} className="hm-link">{n.phone}</a></> : null}</span></small><NoticeActions sample={sample} n={n.raw} onDone={() => notices.reload()} /></span></div>
                </li>))}</ul>
            ) : <p className="hm-empty">No new notices.</p>}
            {noticeRows.length > 5 ? <button type="button" className="hm-all" aria-expanded={allNotices} onClick={() => setAllNotices((a) => !a)}>{allNotices ? "Show fewer" : `Show all ${Math.min(noticeRows.length, 30)}`}</button> : null}
          </Panel>
        </Grid>
        {sample || coming?.length || tr.error ? <Grid cols={2}>
          <Panel id="h-ref" title="Referred here, on the way">
            <Rows items={comingRows} error={tr.error} retry={tr.reload} all={{ href: "/health/referrals?view=in" }} empty="Nobody is on the way here." />
          </Panel>
          <Panel id="h-priv" title="Who sees what"><p className="hm-empty">{who}</p></Panel>
        </Grid> : <p className="hm-note hm-foot-note">{who}</p>}
      </div>
    </Shell>
  );
}

/** A laboratory's day: what is on its way, what is in the laboratory and for how long, and what was released. Each figure
    counts the list it opens (Samples, Testing, Results), from the same read with the same key, so the pages share it. */
function LabToday({ org }: { org: Workspace }) {
  const rows = useRead<Sample[]>(() => select<Sample>("oh_samples", { laboratory_id: org.org_id }), `nx-lab:${org.org_id}`, true);
  const names = useNames(true);
  const now = Date.now();
  const all = rows.data ?? [];
  const age = (s: Sample) => Math.max(0, Math.floor((now - Date.parse(s.collected_on)) / 864e5));
  const arriving = all.filter((s) => s.status === "collected" || s.status === "dispatched").sort((a, b) => age(b) - age(a));
  const received = all.filter((s) => s.status === "received"), testing = all.filter((s) => s.status === "testing");
  const inLab = [...received, ...testing].sort((a, b) => age(b) - age(a));
  const released = all.filter((s) => s.status === "resulted").sort((a, b) => Date.parse(b.resulted_at ?? b.created_at) - Date.parse(a.resulted_at ?? a.created_at));
  const rejected = all.filter((s) => s.status === "rejected");
  const n = (v: number) => (rows.error ? null : rows.data ? v : undefined);
  const res = (r: string) => released.filter((s) => s.result === r).length;
  const item = (s: Sample, chip: Item["chip"]): Item => ({ id: s.id, title: <span className="num">{s.code}</span>, meta: `${word(s.species)} · ${word(s.sample_type)} · ${names.org(s.submitted_by) ?? "Submitting partner"}`, href: `/health/samples/${s.id}`, icon: <FlaskConical size={16} />, tone: chip?.tone ?? "plain", chip });
  const days = (k: number) => `${k} ${k === 1 ? "day" : "days"}`;
  return (
    <Shell ws="health" crumb={["Healthcare", "Work queue"]}>
      <div className="nx-page hm-page">
        <div className="nx-head"><div><p className="nx-eyebrow">{org.name}</p><h1 className="nx-h1">Work queue</h1><p className="nx-sub">{rows.error ? "Samples could not be read, so nothing is shown as clear." : !rows.data ? "Reading samples…" : "A result is released when a laboratory scientist records it with the method and validates it."}</p></div></div>
        <AtKaju role="lab" note="Kaju reads only what you can open. Results are released by laboratory staff, never by Kaju." />
        <Tiles>
          <Tile label="On the way here" n={n(arriving.length)} href="/health/samples?view=transit" note={arriving[0] ? `The oldest collected ${days(age(arriving[0]))} ago` : undefined} />
          <Tile label="In the laboratory" n={n(inLab.length)} tone={inLab.some((s) => age(s) > 5) ? "warn" : "plain"} href="/health/testing"
            visual={inLab.length ? <Split parts={[{ n: received.length, tone: "blue", label: "received" }, { n: testing.length, tone: "warn", label: "testing" }]} /> : null} />
          <Tile label="Results released" n={n(released.length)} href="/health/results"
            visual={released.length ? <Split parts={[{ n: res("negative"), tone: "ok", label: "negative" }, { n: res("positive"), tone: "bad", label: "positive" }, { n: released.length - res("negative") - res("positive"), tone: "plain", label: "other" }]} /> : null} />
          <Tile label="Rejected" n={n(rejected.length)} href="/health/samples?view=rej" />
        </Tiles>
        <Grid cols={3}>
          <Panel id="l-t" title="In the laboratory, oldest first">
            <Rows items={rows.data ? inLab.map((s) => item(s, { text: `${word(s.status)} · ${days(age(s))}`, tone: age(s) > 5 ? "warn" : "plain" })) : null} error={rows.error} retry={rows.reload} all={{ href: "/health/testing" }} empty="Nothing is in the laboratory." />
          </Panel>
          <Panel id="l-a" title="On the way here">
            <Rows items={rows.data ? arriving.map((s) => item(s, { text: `${word(s.status)} · ${days(age(s))}`, tone: "plain" })) : null} error={rows.error} all={{ href: "/health/samples?view=transit" }} empty="No sample is on its way." />
          </Panel>
          <Panel id="l-r" title="Released recently">
            <Rows items={rows.data ? released.map((s) => item(s, { text: `${word(s.result)} · ${d(s.resulted_at)}`, tone: s.result === "positive" ? "bad" : s.result === "negative" ? "ok" : "plain" })) : null} error={rows.error} all={{ href: "/health/results" }} empty="No result has been released yet." />
          </Panel>
        </Grid>
        <p className="hm-note hm-foot-note">Days are counted from collection. Receiving, testing and releasing a result are steps taken by named laboratory staff. Kaju never interprets or releases a result.</p>
      </div>
    </Shell>
  );
}

/** A notice the public left: mark it contacted, or start the bite record from it when the person comes in. */
function NoticeActions({ sample, n, onDone }: { sample: boolean; n: Notice | null; onDone: () => void }) {
  const { busy, run } = useAct();
  if (sample || !n) return <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}><Link href="/try" className="nx-btn is-sm is-quiet" title="Opens the live demo, where this works">Contacted</Link><Link href="/health/bites/new?notice=sample" className="nx-btn is-sm is-quiet">Patient came in</Link></div>;
  const q = new URLSearchParams({ notice: n.id, species: n.animal_species, on: n.happened_on, ...(n.area ? { area: n.area } : {}), ...(n.animal_description ? { animal: n.animal_description } : {}), ...(n.place ? { place: n.place } : {}) });
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
    <button type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={async () => { const r = await run("notice", () => rpc("oh_update_notice", { p_notice: n.id, p_status: "contacted" }), { ok: "Marked as contacted." }); if (r.ok) onDone(); }}>Contacted</button>
    <Link href={`/health/bites/new?${q.toString()}`} className="nx-btn is-sm is-quiet">Patient came in</Link>
  </div>;
}
