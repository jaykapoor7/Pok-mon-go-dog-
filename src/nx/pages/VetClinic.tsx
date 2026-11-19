"use client";

import { About, GhMark } from "./gh/parts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, FilePlus2, PenLine, Plus } from "lucide-react";
import { ListPage, type Col } from "../ListPage";
import { Shell } from "../Shell";
import { Chip } from "../ui";
import { Confirm, Empty, Field, Modal, Section, Skeleton, Timeline, day, dayTime, todayIso, useAct, words } from "../kit";
import { useLive, useTasks, type Workspace } from "../live";
import { getSupabase } from "@/lib/supabase";
import { AtKaju } from "../AtKaju";
import { Grid, Meter, Panel, Rows, TasksPanel, Tile, Tiles, type Item } from "../HomeCards";

/* An independent veterinary clinic's own work: its patients, clinical records signed by its veterinarians, and its
   appointments. A record is a draft until a veterinarian signs it, and a signed record does not change. A partner NGO
   that brought an animal sees only that something was done and when the next visit is due. */

type Patient = { id: string; name: string; species: string; sex: string; age_note: string | null; marks: string | null; brought_by: string; ngo_id: string | null; notes: string | null; created_at: string };
type Encounter = { id: string; patient_id: string; kind: string; occurred_on: string; findings: string | null; diagnosis: string | null; treatment: string | null; vaccine: string | null; batch: string | null; next_due: string | null; clinician_name: string | null; signed_at: string | null; created_at: string };
type Appt = { id: string; vet_patient_id: string | null; title: string; kind: string; starts_at: string; status: string; note: string | null };
const KIND = ["exam", "vaccination", "sterilisation", "treatment", "followup", "other"];

function useClinic(clinic: Workspace) {
  const db = getSupabase();
  const [pats, setPats] = useState<Patient[] | null>(null);
  const [encs, setEncs] = useState<Encounter[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    if (!db) return;
    void Promise.all([
      db.from("nx_vet_patients").select("id,name,species,sex,age_note,marks,brought_by,ngo_id,notes,created_at").eq("clinic_id", clinic.org_id).order("created_at", { ascending: false }).limit(500),
      db.from("nx_vet_encounters").select("id,patient_id,kind,occurred_on,findings,diagnosis,treatment,vaccine,batch,next_due,clinician_name,signed_at,created_at").eq("clinic_id", clinic.org_id).order("occurred_on", { ascending: false }).limit(1000),
      db.from("nx_appointments").select("id,vet_patient_id,title,kind,starts_at,status,note").eq("org_id", clinic.org_id).order("starts_at").limit(300),
    ]).then(([p, e, a]) => { setPats(p.error ? [] : (p.data ?? []) as Patient[]); setEncs((e.data ?? []) as Encounter[]); setAppts((a.data ?? []) as Appt[]); });
  }, [db, clinic.org_id, tick]);
  return { pats, encs, appts, reload };
}

function EncounterForm({ clinic, patient, onDone }: { clinic: Workspace; patient: Patient; onDone: () => void }) {
  const [f, setF] = useState({ kind: "exam", occurred_on: todayIso(), findings: "", diagnosis: "", treatment: "", vaccine: "", batch: "", next_due: "" });
  const { busy, run } = useAct();
  const save = () => run("enc", async () => await getSupabase()!.from("nx_vet_encounters").insert({ clinic_id: clinic.org_id, patient_id: patient.id, kind: f.kind, occurred_on: f.occurred_on, findings: f.findings || null, diagnosis: f.diagnosis || null, treatment: f.treatment || null, vaccine: f.vaccine || null, batch: f.batch || null, next_due: f.next_due || null }), { ok: "Saved as a draft. A veterinarian signs it." }).then((r) => { if (r.ok) onDone(); });
  return (
    <Modal title={`Clinical record for ${patient.name}`} wide onClose={onDone} foot={<><button type="button" className="nx-btn is-quiet" onClick={onDone}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy} onClick={() => void save()}>Save draft</button></>}>
      <div className="nx-fields">
        <Field label="What"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KIND.map((k) => <option key={k} value={k}>{words(k)}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={f.occurred_on} max={todayIso()} onChange={(e) => setF({ ...f, occurred_on: e.target.value })} /></Field>
        <Field label="Findings" wide><textarea rows={3} value={f.findings} onChange={(e) => setF({ ...f, findings: e.target.value })} /></Field>
        <Field label="Diagnosis" wide hint="Written and signed by the veterinarian. Kaju never suggests one."><input value={f.diagnosis} onChange={(e) => setF({ ...f, diagnosis: e.target.value })} /></Field>
        <Field label="Treatment" wide><textarea rows={2} value={f.treatment} onChange={(e) => setF({ ...f, treatment: e.target.value })} /></Field>
        {f.kind === "vaccination" ? <><Field label="Vaccine"><input value={f.vaccine} onChange={(e) => setF({ ...f, vaccine: e.target.value })} /></Field><Field label="Batch"><input value={f.batch} onChange={(e) => setF({ ...f, batch: e.target.value })} /></Field></> : null}
        <Field label="Next visit due"><input type="date" value={f.next_due} min={todayIso()} onChange={(e) => setF({ ...f, next_due: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/** Patients of the clinic, with each one's signed history in the drawer. */
export function ClinicPatients({ clinic }: { clinic: Workspace }) {
  const { pats, encs, appts, reload } = useClinic(clinic);
  const [adding, setAdding] = useState(false);
  const [p, setP] = useState({ name: "", species: "dog", sex: "unknown", age_note: "", marks: "", brought_by: "community", notes: "" });
  const [recFor, setRecFor] = useState<Patient | null>(null);
  const [signing, setSigning] = useState<Encounter | null>(null);
  const [booking, setBooking] = useState<Patient | null>(null);
  const [b, setB] = useState({ title: "", when: "", kind: "check" });
  const { busy, run } = useAct();
  const vet = ["clinician", "lead"].includes(clinic.role);
  const last = (id: string) => encs.find((e) => e.patient_id === id && e.signed_at);
  const cols: Col<Patient>[] = [
    { label: "Patient", width: "minmax(0,1.6fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.name}</b><small>{words(r.species)} · {words(r.sex)}{r.age_note ? ` · ${r.age_note}` : ""}</small></span></span> },
    { label: "Brought by", width: "130px", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.brought_by === "ngo" ? "Partner NGO" : words(r.brought_by)}</span> },
    { label: "Last signed record", width: "180px", hideOnPhone: true, render: (r) => { const e = last(r.id); return e ? <span className="nx-t2">{words(e.kind)} · {day(e.occurred_on)}</span> : <span className="nx-t3">None yet</span>; } },
    { label: "Drafts", width: "80px", render: (r) => { const n = encs.filter((e) => e.patient_id === r.id && !e.signed_at).length; return n ? <Chip tone="warn">{n}</Chip> : <span className="nx-t3">—</span>; } },
  ];
  return (
    <>
      <ListPage ws="health" crumb={["Healthcare", "Patients"]} eyebrow={clinic.name} title="Patients" sub={<>The clinic&apos;s own patients. <About>Clinical records are drafts until a veterinarian signs them.</About><GhMark /></>}
        action={<button type="button" className="nx-btn is-keep" onClick={() => setAdding(true)}><Plus size={13} />Add a patient</button>} sample={false}
        views={[{ id: "all", label: "All", test: () => true }, { id: "drafts", label: "Unsigned records", test: (r) => encs.some((e) => e.patient_id === r.id && !e.signed_at) }, { id: "ngo", label: "From partner NGOs", test: (r) => r.brought_by === "ngo" }]}
        columns={cols} rows={pats ?? []} rowKey={(r) => r.id} rowLabel={(r) => r.name} search={(r) => `${r.name} ${r.marks ?? ""}`} loading={pats === null}
        empty={{ none: "No patients yet", hint: "Add the first patient to start its clinical record." }}
        preview={(r) => ({ title: r.name, sub: `${words(r.species)} · ${words(r.sex)}${r.marks ? ` · ${r.marks}` : ""}`, body: <>
          <div className="nx-run-act" style={{ marginBottom: 12 }}><button type="button" className="nx-btn is-sm" onClick={() => setRecFor(r)}><FilePlus2 size={12} />Add a clinical record</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => { setB({ title: `Check: ${r.name}`, when: "", kind: "check" }); setBooking(r); }}><CalendarPlus size={12} />Book a visit</button></div>
          <Section title="Clinical history" count={encs.filter((e) => e.patient_id === r.id).length}>
            <Timeline empty="No records yet." items={encs.filter((e) => e.patient_id === r.id).map((e) => ({ id: e.id, when: `${day(e.occurred_on)}${e.signed_at ? ` · signed${e.clinician_name ? ` by ${e.clinician_name}` : ""}` : " · draft"}`, tone: e.signed_at ? "ok" as const : "warn" as const, title: words(e.kind),
              body: [e.findings, e.diagnosis && `Diagnosis: ${e.diagnosis}`, e.treatment && `Treatment: ${e.treatment}`, e.vaccine && `Vaccine: ${e.vaccine}${e.batch ? `, batch ${e.batch}` : ""}`, e.next_due && `Next visit due ${day(e.next_due)}`].filter(Boolean).join("\n") || undefined,
              action: !e.signed_at && vet ? <button type="button" className="nx-btn is-sm" onClick={() => setSigning(e)}><PenLine size={12} />Sign</button> : undefined }))} />
          </Section>
          <Section title="Visits booked" count={appts.filter((a) => a.vet_patient_id === r.id && a.status === "booked").length}>
            {appts.filter((a) => a.vet_patient_id === r.id).length ? <ul className="nx-feed">{appts.filter((a) => a.vet_patient_id === r.id).map((a) => <li key={a.id} style={{ gridTemplateColumns: "minmax(0,1fr)" }}><div><b>{a.title}</b><small>{dayTime(a.starts_at)} · {words(a.status)}</small></div></li>)}</ul> : <p className="nx-sub">None booked.</p>}
          </Section>
          {r.brought_by === "ngo" ? <p className="nx-note"><span>The NGO that brought {r.name} sees only that a procedure was done and when the next visit is due, never findings or diagnosis.</span></p> : null}
        </> })} />
      {adding ? <Modal title="Add a patient" onClose={() => setAdding(false)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setAdding(false)}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || !p.name.trim()} onClick={() => void run("add", async () => await getSupabase()!.from("nx_vet_patients").insert({ clinic_id: clinic.org_id, name: p.name.trim(), species: p.species, sex: p.sex, age_note: p.age_note || null, marks: p.marks || null, brought_by: p.brought_by, notes: p.notes || null }), { ok: `${p.name} added.` }).then((x) => { if (x.ok) { setAdding(false); setP({ ...p, name: "", marks: "", notes: "", age_note: "" }); reload(); } })}>Add</button></>}>
        <div className="nx-fields">
          <Field label="Name or description" wide><input value={p.name} maxLength={120} autoFocus onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Brownie, or 'brown female near the market'" /></Field>
          <Field label="Species"><select value={p.species} onChange={(e) => setP({ ...p, species: e.target.value })}><option value="dog">Dog</option><option value="cat">Cat</option><option value="other">Other</option></select></Field>
          <Field label="Sex"><select value={p.sex} onChange={(e) => setP({ ...p, sex: e.target.value })}><option value="unknown">Not known</option><option value="female">Female</option><option value="male">Male</option></select></Field>
          <Field label="Age"><input value={p.age_note} maxLength={60} onChange={(e) => setP({ ...p, age_note: e.target.value })} placeholder="About 2 years" /></Field>
          <Field label="Brought by"><select value={p.brought_by} onChange={(e) => setP({ ...p, brought_by: e.target.value })}><option value="community">Community member</option><option value="owner">Owner</option><option value="ngo">Partner NGO</option><option value="unknown">Not recorded</option></select></Field>
          <Field label="Marks" wide><input value={p.marks} maxLength={300} onChange={(e) => setP({ ...p, marks: e.target.value })} placeholder="Ear notch, collar colour, scars" /></Field>
        </div>
      </Modal> : null}
      {recFor ? <EncounterForm clinic={clinic} patient={recFor} onDone={() => { setRecFor(null); reload(); }} /> : null}
      {signing ? <Confirm title="Sign this clinical record?" confirm="Sign" busy={!!busy} onClose={() => setSigning(null)} onConfirm={() => void run("sign", async () => await getSupabase()!.rpc("nx_vet_sign", { p_encounter: signing.id }), { ok: "Signed. The record is now fixed." }).then(() => { setSigning(null); reload(); })}><p>You sign as this clinic&apos;s veterinarian. After signing, the record cannot be changed; a correction is a new record.</p></Confirm> : null}
      {booking ? <Modal title={`Book a visit for ${booking.name}`} onClose={() => setBooking(null)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setBooking(null)}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || !b.when || b.title.trim().length < 2} onClick={() => void run("book", async () => await getSupabase()!.from("nx_appointments").insert({ org_id: clinic.org_id, vet_patient_id: booking.id, title: b.title.trim(), kind: b.kind, starts_at: new Date(b.when).toISOString() }), { ok: "Booked." }).then((x) => { if (x.ok) { setBooking(null); reload(); } })}>Book</button></>}>
        <div className="nx-fields">
          <Field label="What" wide><input value={b.title} maxLength={160} onChange={(e) => setB({ ...b, title: e.target.value })} /></Field>
          <Field label="When"><input type="datetime-local" value={b.when} onChange={(e) => setB({ ...b, when: e.target.value })} /></Field>
          <Field label="Kind"><select value={b.kind} onChange={(e) => setB({ ...b, kind: e.target.value })}><option value="check">Check</option><option value="procedure">Procedure</option><option value="vaccination">Vaccination</option><option value="recovery">Recovery</option><option value="other">Other</option></select></Field>
        </div>
      </Modal> : null}
    </>
  );
}

/** The clinic's day: @Kaju, four figures, and visits today, unsigned records and follow-ups due side by side. */
export function ClinicToday({ clinic }: { clinic: Workspace }) {
  const { pats, encs, appts } = useClinic(clinic);
  const live = useLive();
  const tasks = useTasks(clinic.org_id);
  const today = todayIso();
  const visits = useMemo(() => appts.filter((a) => a.status === "booked" && a.starts_at.slice(0, 10) <= today), [appts, today]);
  const drafts = encs.filter((e) => !e.signed_at);
  const due = encs.filter((e) => e.signed_at && e.next_due && e.next_due <= today);
  const name = (id: string | null) => pats?.find((p) => p.id === id)?.name ?? "Patient";
  const ready = pats !== null;
  const n = (v: number) => (ready ? v : undefined);
  const fromNgo = (pats ?? []).filter((p) => p.brought_by === "ngo").length;
  return (
    <Shell ws="health" crumb={["Healthcare", "Today"]}>
      <div className="nx-page hm-page">
        <div className="nx-head"><div><p className="nx-eyebrow">{clinic.name} · Veterinary clinic</p><h1 className="nx-h1">Today</h1><p className="nx-sub">{ready ? <About>A clinical record is a draft until a veterinarian signs it; a signed record does not change.</About> : "Reading the clinic's day…"}<GhMark /></p></div></div>
        <AtKaju role="vet" note="Kaju reads only what you can open. Clinical decisions stay with you." />
        <Tiles>
          <Tile label="Visits today" n={n(visits.length)} href="/health/appointments" />
          <Tile label="Records to sign" n={n(drafts.length)} tone={drafts.length ? "warn" : "plain"} href="/health/patients" />
          <Tile label="Follow-up visits due" n={n(due.length)} tone={due.length ? "warn" : "plain"} href="/health/patients" />
          <Tile label="Patients" n={n((pats ?? []).length)} href="/health/patients" visual={pats && pats.length ? <Meter part={fromNgo} whole={pats.length} tone="blue" label={`${fromNgo} brought by partner NGOs`} /> : null} />
        </Tiles>
        <Grid cols={2}>
          <Panel id="ct-v" title="Visits today">
            <Rows items={ready ? visits.map((a): Item => ({ id: a.id, title: a.title, meta: name(a.vet_patient_id), href: "/health/appointments", icon: <CalendarPlus size={16} />, tone: "blue", chip: { text: dayTime(a.starts_at), tone: "blue" } })) : null} all={{ href: "/health/appointments" }} empty="Nothing booked for today." />
          </Panel>
          <Panel id="ct-d" title="Waiting for a signature">
            <Rows items={ready ? drafts.map((e): Item => ({ id: e.id, title: `${name(e.patient_id)}: ${words(e.kind)}`, meta: day(e.occurred_on), href: "/health/patients", icon: <PenLine size={16} />, tone: "warn", chip: { text: "Draft", tone: "warn" } })) : null} all={{ href: "/health/patients" }} empty="Every record is signed." />
          </Panel>
          <Panel id="ct-f" title="Follow-up visits due">
            <Rows items={ready ? due.map((e): Item => ({ id: e.id, title: name(e.patient_id), meta: `After ${words(e.kind).toLowerCase()}`, href: "/health/patients", icon: <CalendarPlus size={16} />, tone: "warn", chip: { text: `Due ${day(e.next_due)}`, tone: "warn" } })) : null} all={{ href: "/health/patients" }} empty="No follow-ups are due." />
          </Panel>
          <TasksPanel orgId={clinic.org_id} userId={live.userId} tasks={tasks} />
        </Grid>
      </div>
    </Shell>
  );
}

/** A partner NGO's view of animals it brought to clinics: status only. */
export function SharedClinicStatus({ ngoId }: { ngoId: string }) {
  type Shared = { patient_id: string; patient_name: string; clinic: string; last_kind: string | null; last_on: string | null; next_due: string | null };
  const [rows, setRows] = useState<Shared[] | null>(null);
  useEffect(() => { void getSupabase()?.rpc("nx_vet_shared_for_ngo", { p_ngo: ngoId }).then(({ data, error }) => setRows(error ? [] : (data ?? []) as Shared[])); }, [ngoId]);
  if (!rows?.length) return null;
  return <Section title="At partner clinics" count={rows.length}><ul className="nx-feed">{rows.map((r) => <li key={r.patient_id} style={{ gridTemplateColumns: "minmax(0,1fr)" }}><div><b>{r.patient_name}</b><small>{r.clinic} · {r.last_kind ? `${words(r.last_kind)} on ${day(r.last_on)}` : "Not yet treated"}{r.next_due ? ` · next visit ${day(r.next_due)}` : ""}</small></div></li>)}</ul></Section>;
}
