"use client";

/* One presentation, start to finish: what happened, the clinician's
   assessment and prescription, every dose, and what the animal team found. */
import Link from "next/link";
import { useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { usePlaces } from "../places";
import { call, fmtDate, fmtTime, today, useRead, AGE, AUDIT, COURSE, EXPOSURE_KIND, HANDOFF, SEX, SPECIES, WASHED, type Exposure, type Place } from "../data";
import { Chip, Failed, Head, Loading, Page, Section, Seg, Sheet, useToast } from "../ui";
import { Rail } from "@/sp/ui/Rail";
import { DoseSheet } from "./facility";

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

  return (
    <Page illustrative={place.illustrative}>
      {/* Where the record is, from what has been recorded on it. It states; it does not advise. */}
      <Rail label="Where this record is" steps={[{ title: "Recorded", href: `/workspace/${place.organisation_id}/register`, hint: "The bite register" }, { title: "Category" }, { title: "Course" }]}
        at={e.category === "not_recorded" ? 1 : 2} ended={!!e.course && e.course.status !== "active"}
        end={e.course && e.course.status !== "active" ? COURSE[e.course.status].label : "Course closed"} tone={e.course?.status === "completed" ? "green" : "plain"} />
      <Head eyebrow={<><Link href={`/workspace/${place.organisation_id}/register`}>Bite register</Link><span aria-hidden>/</span><span>{e.code}</span></>}
        title={e.patient_ref ?? e.code}
        lede={`${SPECIES[e.animal_species]} ${(EXPOSURE_KIND[e.exposure_kind] ?? e.exposure_kind).toLowerCase()} on ${fmtDate(e.exposure_on, { day: "numeric", month: "long" })}${e.area ? ` in ${e.area}` : ""}.`}
        actions={<>
          {e.category === "not_recorded" ? <Chip tone="amber">Category not recorded</Chip> : <Chip tone={e.category === "III" ? "flame" : "blue"}>Category {e.category}</Chip>}
          {e.course ? <Chip tone={COURSE[e.course.status].tone}>{COURSE[e.course.status].label}</Chip> : null}
        </>} />

      <div className="oh-grid two">
        <div>
          <Section title="Course">
            {!e.course ? (
              clinician ? (e.category === "not_recorded" ? <p className="oh-note">Record the category first.</p> : <Prescribe exposureId={e.id} exposureOn={e.exposure_on} startOpen={e.category !== "I"} onDone={() => { toast("Course saved. The doses now appear on Today when due."); refresh(); }} />)
                : <p className="oh-note">No course prescribed. A clinician prescribes from this page.</p>
            ) : (
              <div className="oh-card pad">
                <dl className="oh-facts" style={{ marginBottom: 16 }}>
                  <div><dt>Regimen, as prescribed</dt><dd>{e.course.regimen}</dd></div>
                  <div><dt>Immunoglobulin</dt><dd>{e.course.rig_given ? "Given" : "Not given"}</dd></div>
                  <div><dt>Prescribed by</dt><dd>{e.course.prescribed_by_name ?? "Clinician"}, {fmtDate(e.course.prescribed_at)}</dd></div>
                </dl>
                <ol className="oh-steps" aria-label="Doses">
                  {e.doses.map((d) => {
                    const state = d.status === "given" ? "done" : d.status === "cancelled" || d.status === "missed" ? "off" : d.due_on < t ? "late" : "due";
                    return (
                      <li className="oh-step" key={d.id} data-state={state}>
                        <i aria-hidden>{d.status === "given" ? <Check size={13} strokeWidth={3} /> : d.status === "missed" ? <X size={12} color="var(--flame)" /> : d.status === "cancelled" ? <Minus size={12} color="var(--faint)" /> : null}</i>
                        <div><b>Dose {d.dose_no}</b><span>{d.status === "given" ? `Given ${fmtDate(d.given_on)}${d.given_by_name ? ` by ${d.given_by_name}` : ""}${d.batch ? ` · batch ${d.batch}` : ""}` : d.status === "missed" ? `Missed (due ${fmtDate(d.due_on)})` : d.status === "cancelled" ? "Cancelled" : `${d.due_on < t ? "Overdue since" : "Due"} ${fmtDate(d.due_on, { weekday: "short", day: "numeric", month: "short" })}`}</span></div>
                        {d.status === "due" && canDose && d === nextDose ? <button type="button" className="oh-btn small primary" onClick={() => setDose(d)}>Record</button> : <span />}
                      </li>
                    );
                  })}
                </ol>
                {e.course.status_note ? <p className="oh-note" style={{ marginTop: 12 }}>{e.course.status_note}</p> : null}
                {clinician && e.course.status === "active" ? <div className="oh-actions" style={{ marginTop: 14 }}><button type="button" className="oh-btn small" onClick={() => setAdding(true)}>Add a dose date</button><button type="button" className="oh-btn small" onClick={() => setClosing(true)}>Close the course early</button></div> : null}
              </div>
            )}
          </Section>

          <Section title="Animal follow-up" note="Shared with the animal team without patient details">
            {e.handoff ? (
              <div className="oh-card pad">
                <p style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><Chip tone={HANDOFF[e.handoff.status].tone}>{HANDOFF[e.handoff.status].label}</Chip><span style={{ color: "var(--muted)", fontSize: 12 }}>{e.handoff.to}</span></p>
                <p style={{ color: "var(--ink)" }}>{e.handoff.outcome ?? "Waiting for the team to report what they found."}</p>
              </div>
            ) : <p className="oh-note">{e.animal_ownership === "owned" ? "The animal is someone's pet; no field follow-up was requested." : e.area ? "No animal team is assigned to this area, or no follow-up was requested." : "No area was recorded, so no follow-up was sent."}</p>}
          </Section>
        </div>

        <div>
          <Section title="Assessment">
            <div className="oh-card pad">
              {e.category === "not_recorded" ? (clinician ? (
                <><p style={{ marginBottom: 10 }}>Record the category you assessed.</p><div className="oh-actions">{["I", "II", "III"].map((c) => <button key={c} type="button" className="oh-btn" onClick={() => setCategory(c)}>Category {c}</button>)}</div></>
              ) : <p>Waiting for a clinician.</p>) : <p style={{ color: "var(--ink)" }}>Category {e.category}<span style={{ color: "var(--muted)" }}>{e.category_by_name ? `, recorded by ${e.category_by_name}` : ""}</span></p>}
            </div>
          </Section>
          <Section title="Details">
            <dl className="oh-facts">
              <div><dt>Presented</dt><dd>{fmtDate(e.presented_on, { day: "numeric", month: "long" })}</dd></div>
              <div><dt>Age</dt><dd>{AGE[e.age_band]}</dd></div>
              <div><dt>Sex</dt><dd>{SEX[e.sex]}</dd></div>
              <div><dt>Came by</dt><dd>{e.source === "citizen_notice" ? "Public notice" : e.source === "referral" ? "Referral" : "Walk-in"}</dd></div>
              <div><dt>Animal</dt><dd>{SPECIES[e.animal_species]}, {e.animal_ownership === "community" ? "street" : e.animal_ownership === "owned" ? "pet" : "owner not known"}</dd></div>
              <div><dt>Description</dt><dd>{e.animal_description ?? "Not recorded"}</dd></div>
              <div><dt>Where the animal is</dt><dd>{e.animal_place ?? "Not recorded"}</dd></div>
              <div><dt>Wound washing</dt><dd>{e.wound_washed === "not_recorded" && canDose ? <select className="oh-btn small" aria-label="Record wound washing" defaultValue="" onChange={(ev) => { if (ev.target.value) void setWashed(ev.target.value); }}><option value="" disabled>Record</option>{Object.entries(WASHED).filter(([k]) => k !== "not_recorded").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> : WASHED[e.wound_washed] ?? e.wound_washed}</dd></div>
              <div><dt>Reminder calls</dt><dd>{e.reminder_consent ? e.contact_phone : "No consent"}</dd></div>
            </dl>
          </Section>
          <Section title="History" note="Who did what, kept for audit">
            <ol className="oh-rows" style={{ maxHeight: 280, overflowY: "auto" }}>
              {e.history.filter((h) => h.action !== "read").slice(-12).map((h, i) => <li key={i} className="oh-row" style={{ minHeight: 44 }}><div className="oh-row-main"><b style={{ fontWeight: 500 }}>{AUDIT[h.action] ?? h.action}</b></div><div className="oh-row-meta">{fmtTime(h.at)}</div></li>)}
              {!e.history.some((h) => h.action !== "read") ? <li className="oh-row"><div className="oh-row-main"><span>{place.illustrative ? "Loaded with the illustrative data." : "No changes since it was recorded."}</span></div></li> : null}
            </ol>
          </Section>
        </div>
      </div>
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
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || !on} onClick={() => void save()}>Add date</button></>}>
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
  if (!open) return <div className="oh-card pad" style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}><p>No course prescribed.</p><button type="button" className="oh-btn" onClick={() => setOpen(true)}>Prescribe a course</button></div>;
  return (
    <div className="oh-card pad" style={{ display: "grid", gap: 16 }}>
      <p className="oh-note blue"><b>StrayPaw does not calculate a schedule.</b> Write the regimen as in your facility&apos;s protocol and enter the date you set for each dose.</p>
      <label className="oh-field"><span>Regimen</span><input value={regimen} onChange={(e) => setRegimen(e.target.value)} maxLength={160} placeholder="As written in your protocol" /></label>
      <label className="oh-check"><input type="checkbox" checked={rig} onChange={(e) => setRig(e.target.checked)} /><span>Rabies immunoglobulin given</span></label>
      <div className="oh-field"><span>Dose dates</span>
        <div style={{ display: "grid", gap: 8 }}>
          {dates.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ width: 64, color: "var(--muted)", fontSize: 12 }}>Dose {i + 1}</span>
              <input type="date" className="oh-input" value={d} min={exposureOn} onChange={(e) => setDates(dates.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Dose ${i + 1} date`} />
              {dates.length > 1 ? <button type="button" className="oh-btn small" aria-label={`Remove dose ${i + 1}`} onClick={() => setDates(dates.filter((_, j) => j !== i))}><X size={14} /></button> : null}
            </div>
          ))}
          {dates.length < 10 ? <button type="button" className="oh-btn small quiet" style={{ justifySelf: "start" }} onClick={() => setDates([...dates, ""])}><Plus size={14} aria-hidden />Add a dose date</button> : null}
        </div>
      </div>
      {err ? <Failed error={err} /> : null}
      <div className="oh-submit"><button type="button" className="oh-btn primary" disabled={busy || regimen.trim().length < 2 || !dates.some(Boolean)} onClick={() => void save()}>{busy ? "Saving…" : "Save prescription"}</button></div>
    </div>
  );
}

function CloseCourse({ courseId, onClose, onDone }: { courseId: string; onClose: () => void; onDone: (m: string) => void }) {
  const [status, setStatus] = useState<"lost_to_follow_up" | "discontinued">("lost_to_follow_up"), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); const r = await call("oh_set_course_status", { p_course: courseId, p_status: status, p_note: note || null }); setBusy(false); if (r.error) setErr(r.error); else onDone(status === "lost_to_follow_up" ? "Marked as did not return." : "Course stopped."); };
  return (
    <Sheet title="Close the course early" note="Remaining doses are cancelled. This is recorded in the history." onClose={onClose}
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn urgent" disabled={busy} onClick={() => void save()}>Close course</button></>}>
      <Seg name="close" label="Reason" value={status} onChange={setStatus} options={[["lost_to_follow_up", "Patient did not return"], ["discontinued", "Stopped by clinician"]]} />
      <label className="oh-field"><span>Note</span><textarea value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="For example: two calls unanswered" /></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}
