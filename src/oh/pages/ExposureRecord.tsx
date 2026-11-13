"use client";

/* One presentation, start to finish: what happened, the clinician's
   assessment and prescription, every dose, and what the animal team found. */
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Btn, Note, Panel, Props, Split, Table, Tag, type Col } from "@/ws/kit";
import { usePlaces } from "../places";
import { call, fmtDate, fmtTime, today, useRead, AGE, AUDIT, COURSE, EXPOSURE_KIND, HANDOFF, SEX, SPECIES, WASHED, type Dose, type Exposure, type Place } from "../data";
import { Chip, Failed, Head, Loading, Page, Row, Rows, Section, Seg, Sheet, useToast } from "../ui";
import { DoseSheet } from "./facility";
import { Referral } from "./Referral";

export function ExposureRecord({ id, place }: { id: string; place: Place }) {
  const { reload: reloadPlaces } = usePlaces();
  const rec = useRead<Exposure>(() => call("oh_clinic_exposure", { p_exposure: id }), `exp:${id}`);
  const toast = useToast();
  const [dose, setDose] = useState<Exposure["doses"][number] | null>(null);
  const [closing, setClosing] = useState(false);
  const [adding, setAdding] = useState(false);
  if (rec.loading && !rec.data) return <Page><Loading rows={5} /></Page>;
  if (rec.error || !rec.data) return <Page><Failed error={rec.error ?? "Record not found."} retry={rec.reload} /></Page>;
  const e = rec.data, clinician = e.can.prescribe, canDose = e.can.record_dose, t = e.today ?? today();
  const refresh = () => { rec.reload(); reloadPlaces(); };
  const setWashed = async (v: string) => { const r = await call("oh_set_wound_washed", { p_exposure: e.id, p_value: v }); if (r.error) toast(r.error, "flame"); else { toast("Wound washing recorded."); refresh(); } };
  const setCategory = async (c: string) => { const r = await call("oh_set_category", { p_exposure: e.id, p_category: c }); if (r.error) toast(r.error, "flame"); else { toast(`Category ${c} recorded.`); refresh(); } };
  const nextDose = e.doses.find((d) => d.status === "due");
  const doseCols: Col<Dose>[] = [
    { key: "no", label: "Dose", width: "64px", render: (d) => `Dose ${d.dose_no}` },
    { key: "state", label: "Status", width: "96px", keep: true, render: (d) => d.status === "given" ? <Tag tone="green">Given</Tag> : d.status === "missed" ? <Tag tone="flame">Missed</Tag> : d.status === "cancelled" ? <Tag>Cancelled</Tag> : d.due_on < t ? <Tag tone="flame">Overdue</Tag> : <Tag tone="blue">Due</Tag> },
    { key: "when", label: "When", width: "minmax(0, 1fr)", keep: true, render: (d) => d.status === "given" ? `${fmtDate(d.given_on)}${d.given_by_name ? ` by ${d.given_by_name}` : ""}${d.batch ? ` · batch ${d.batch}` : ""}` : d.status === "missed" ? `Was due ${fmtDate(d.due_on)}` : d.status === "cancelled" ? "" : `${d.due_on < t ? "Since" : ""} ${fmtDate(d.due_on, { weekday: "short", day: "numeric", month: "short" })}` },
    { key: "act", label: "", width: "88px", align: "end", keep: true, render: (d) => d.status === "due" && canDose && d === nextDose ? <Btn small onClick={() => setDose(d)}>Record</Btn> : null },
  ];
  const history = e.history.filter((h) => h.action !== "read").slice(-12);

  return (
    <Page illustrative={place.illustrative}>
      {/* The head states where the record is, from what has been recorded on it. It does not advise. */}
      <Head title={e.patient_ref ?? e.code}
        lede={`${e.patient_ref ? `${e.code} · ` : ""}${SPECIES[e.animal_species]} ${(EXPOSURE_KIND[e.exposure_kind] ?? e.exposure_kind).toLowerCase()} on ${fmtDate(e.exposure_on, { day: "numeric", month: "long" })}${e.area ? ` in ${e.area}` : ""}.`}
        actions={<>
          {e.category === "not_recorded" ? <Tag tone="amber">Category not recorded</Tag> : <Tag tone={e.category === "III" ? "flame" : "blue"}>Category {e.category}</Tag>}
          {e.course ? <Chip tone={COURSE[e.course.status].tone}>{COURSE[e.course.status].label}</Chip> : <Tag>No course</Tag>}
        </>} />

      <Split side={<>
        <Section title="Exposure">
          <Props items={[
            { label: "Category", value: e.category === "not_recorded" ? (clinician ? <span className="oh-inline">{["I", "II", "III"].map((c) => <Btn key={c} small onClick={() => void setCategory(c)}>Category {c}</Btn>)}</span> : "Waiting for a clinician") : <>Category {e.category}{e.category_by_name ? <span className="oh-quiet">, recorded by {e.category_by_name}</span> : null}</> },
            { label: "Wound washing", value: e.wound_washed === "not_recorded" && canDose ? <select className="oh-select" aria-label="Record wound washing" defaultValue="" onChange={(ev) => { if (ev.target.value) void setWashed(ev.target.value); }}><option value="" disabled>Record</option>{Object.entries(WASHED).filter(([k]) => k !== "not_recorded").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> : WASHED[e.wound_washed] ?? e.wound_washed },
            { label: "Presented", value: fmtDate(e.presented_on, { day: "numeric", month: "long" }) },
            { label: "Came by", value: e.source === "citizen_notice" ? "Public notice" : e.source === "referral" ? "Referral" : "Walk-in" },
            { label: "Age", value: AGE[e.age_band] },
            { label: "Sex", value: SEX[e.sex] },
            { label: "Reminder calls", value: e.reminder_consent ? e.contact_phone : "No consent" },
            { label: "Animal", value: `${SPECIES[e.animal_species]}, ${e.animal_ownership === "community" ? "street" : e.animal_ownership === "owned" ? "pet" : "owner not known"}` },
            { label: "Description", value: e.animal_description ?? "Not recorded" },
            { label: "Where it is", value: e.animal_place ?? "Not recorded" },
          ]} />
        </Section>
        <Section title="Animal follow-up" note="Shared without patient details">
          {e.handoff ? (
            <Panel><Rows><Row title={e.handoff.outcome ?? "Waiting for the team to report what they found."} meta={e.handoff.to} end={<Chip tone={HANDOFF[e.handoff.status].tone}>{HANDOFF[e.handoff.status].label}</Chip>} /></Rows></Panel>
          ) : <p className="oh-foot">{e.animal_ownership === "owned" ? "The animal is someone's pet; no field follow-up was requested." : e.area ? "No animal team is assigned to this area, or no follow-up was requested." : "No area was recorded, so no follow-up was sent."}</p>}
        </Section>
      </>}>
        <Section title="Course" note={e.course ? `${e.course.regimen} · immunoglobulin ${e.course.rig_given ? "given" : "not given"} · prescribed by ${e.course.prescribed_by_name ?? "Clinician"}, ${fmtDate(e.course.prescribed_at)}` : undefined}
          action={clinician && e.course?.status === "active" ? <><Btn small variant="quiet" onClick={() => setAdding(true)}>Add a dose date</Btn><Btn small variant="quiet" onClick={() => setClosing(true)}>Close the course early</Btn></> : undefined}>
          {!e.course ? (
            clinician ? (e.category === "not_recorded" ? <Note>Record the category first.</Note> : <Prescribe exposureId={e.id} exposureOn={e.exposure_on} startOpen={e.category !== "I"} onDone={() => { toast("Course saved. The doses now appear on Home when due."); refresh(); }} />)
              : <Note>No course prescribed. A clinician prescribes from this page.</Note>
          ) : (
            <>
              <Panel><Table label="Doses" cols={doseCols} rows={e.doses} rowKey={(d) => d.id} /></Panel>
              {e.course.status_note ? <p className="oh-foot">{e.course.status_note}</p> : null}
            </>
          )}
        </Section>

        <Referral exposureId={e.id} canRefer={e.can.assess} onChange={refresh} />

        <Section title="History" fold="history" open={false} count={history.length} note="Who did what, kept for audit">
          <Panel>
            <Rows label="History of this record">
              {history.map((h, i) => <Row key={i} title={AUDIT[h.action] ?? h.action} end={fmtTime(h.at)} />)}
              {!history.length ? <Row title={place.illustrative ? "Loaded with the illustrative data." : "No changes since it was recorded."} /> : null}
            </Rows>
          </Panel>
        </Section>
      </Split>
      {dose ? <DoseSheet dose={{ dose_id: dose.id, dose_no: dose.dose_no, due_on: dose.due_on, label: e.patient_ref ?? e.code }} onClose={() => setDose(null)} onDone={(m) => { setDose(null); toast(m); refresh(); }} /> : null}
      {adding && e.course ? <AddDose courseId={e.course.id} min={e.exposure_on} onClose={() => setAdding(false)} onDone={(m) => { setAdding(false); toast(m); refresh(); }} /> : null}
      {closing && e.course ? <CloseCourse courseId={e.course.id} onClose={() => setClosing(false)} onDone={(m) => { setClosing(false); toast(m); refresh(); }} /> : null}
    </Page>
  );
}

function AddDose({ courseId, min, onClose, onDone }: { courseId: string; min: string; onClose: () => void; onDone: (m: string) => void }) {
  const [on, setOn] = useState(today()), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); const r = await call("oh_add_dose", { p_course: courseId, p_due_on: on }); setBusy(false); if (r.error) setErr(r.error); else onDone("Dose date added. It appears on Today when due."); };
  return (
    <Sheet title="Add a dose date" note="For example after a missed dose. The date is yours; StrayPaw does not calculate one." onClose={onClose}
      foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy || !on} onClick={() => void save()}>Add date</Btn></>}>
      <label className="oh-field"><span>Date</span><input type="date" value={on} min={min} onChange={(e) => setOn(e.target.value)} /></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

function Prescribe({ exposureId, exposureOn, onDone, startOpen }: { exposureId: string; exposureOn: string; onDone: () => void; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [regimen, setRegimen] = useState(""), [rig, setRig] = useState(false), [dates, setDates] = useState<string[]>([today()]);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call("oh_prescribe", { p_exposure: exposureId, p_regimen: regimen, p_rig_given: rig, p_due_dates: dates.filter(Boolean) });
    setBusy(false); if (r.error) setErr(r.error); else onDone();
  };
  if (!open) return <Note action={<Btn small onClick={() => setOpen(true)}>Prescribe a course</Btn>}>No course prescribed.</Note>;
  return (
    <div className="oh-fields oh-form">
      <Note tone="blue"><span><b>StrayPaw does not calculate a schedule.</b> Write the regimen as in your facility&apos;s protocol and enter the date you set for each dose.</span></Note>
      <label className="oh-field"><span>Regimen</span><input value={regimen} onChange={(e) => setRegimen(e.target.value)} maxLength={160} placeholder="As written in your protocol" /></label>
      <label className="oh-check"><input type="checkbox" checked={rig} onChange={(e) => setRig(e.target.checked)} /><span>Rabies immunoglobulin given</span></label>
      <div className="oh-field"><span>Dose dates</span>
        <div className="oh-fields">
          {dates.map((d, i) => (
            <div key={i} className="oh-inline">
              <span className="oh-quiet">Dose {i + 1}</span>
              <input type="date" className="oh-input" value={d} min={exposureOn} onChange={(e) => setDates(dates.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Dose ${i + 1} date`} />
              {dates.length > 1 ? <button type="button" className="oh-icon-btn" aria-label={`Remove dose ${i + 1}`} onClick={() => setDates(dates.filter((_, j) => j !== i))}><X size={14} aria-hidden /></button> : null}
            </div>
          ))}
          {dates.length < 10 ? <div><Btn small variant="quiet" icon={<Plus size={14} />} onClick={() => setDates([...dates, ""])}>Add a dose date</Btn></div> : null}
        </div>
      </div>
      {err ? <Failed error={err} /> : null}
      <div><Btn variant="primary" disabled={busy || regimen.trim().length < 2 || !dates.some(Boolean)} onClick={() => void save()}>{busy ? "Saving…" : "Save prescription"}</Btn></div>
    </div>
  );
}

function CloseCourse({ courseId, onClose, onDone }: { courseId: string; onClose: () => void; onDone: (m: string) => void }) {
  const [status, setStatus] = useState<"lost_to_follow_up" | "discontinued">("lost_to_follow_up"), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); const r = await call("oh_set_course_status", { p_course: courseId, p_status: status, p_note: note || null }); setBusy(false); if (r.error) setErr(r.error); else onDone(status === "lost_to_follow_up" ? "Marked as did not return." : "Course stopped."); };
  return (
    <Sheet title="Close the course early" note="Remaining doses are cancelled. This is recorded in the history." onClose={onClose}
      foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="danger" disabled={busy} onClick={() => void save()}>Close course</Btn></>}>
      <Seg name="close" label="Reason" value={status} onChange={setStatus} options={[["lost_to_follow_up", "Patient did not return"], ["discontinued", "Stopped by clinician"]]} />
      <label className="oh-field"><span>Note</span><textarea value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="For example: two calls unanswered" /></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}
