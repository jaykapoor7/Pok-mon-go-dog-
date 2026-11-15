"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Lock, Plus, Stethoscope, X } from "lucide-react";
import { AGE, AUDIT, COURSE, EXPOSURE_KIND, HANDOFF, REMINDER, SERVICE_LABEL, SERVICE_SHORT, SERVICE_STATUS, SEX, SPECIES, TRANSFER, WASHED, call, fmtDate, useRead, type Dose, type Exposure, type Place, type ReferralOption, type TransferOut } from "@/oh/data";
import { Shell } from "../../Shell";
import { Chip, Sample } from "../../ui";
import { Confirm, Denied, Failed, Field, Modal, Props, RecordHead, Skeleton, Timeline, dayTime, toast, useAct } from "../../kit";
import { useLive } from "../../live";
import type { Tone } from "../../fixtures";
import { ago, can, indiaToday, isFacilityKind, placeOf, usePlaces } from "../../data/govhealth";
import { sampleExposure } from "../../data/govhealth-samples";
import { Block, Opening, Seg, SignedConfirm, TryLink } from "../gh/parts";

/* One presentation, start to finish: what happened, the clinician's assessment and prescription, every dose, the
   reminder calls, any referral, and what the animal team found. StrayPaw records clinical decisions and never makes
   them: the category is the clinician's, the regimen and every dose date are entered by the clinician, and nothing
   here computes or suggests a schedule. Patient identity is shown only to facility staff with the register. */

const CAT_TONE: Record<string, Tone> = { I: "plain", II: "accent", III: "bad", not_recorded: "warn" };
const COURSE_TONE: Record<string, Tone> = { active: "accent", completed: "ok", discontinued: "plain", lost_to_follow_up: "bad" };
const XTONE: Record<string, Tone> = { sent: "accent", arrived: "ok", not_arrived: "bad", withdrawn: "plain" };

export function ExposureRecord({ id }: { id: string }) {
  const live = useLive();
  const org = live.orgFor("healthcare");
  const pl = usePlaces(live.ready && !!live.org);
  if (!live.ready || (live.org && pl.loading)) return <Opening ws="health" crumb={["Bite cases", "Record"]} />;
  if (!live.org) return <ExposureView sample e={sampleExposure(id)} place={null} transfers={[]} reload={() => {}} />;
  const place = placeOf(pl.places, org?.org_id);
  if (!org || org.kind === "veterinary" || !isFacilityKind(org.kind) || !can(place, "view_register")) return (
    <Shell ws="health" crumb={["Bite cases", "Record"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Clinical record</h1>
      <Denied what="Only the treating facility's staff open this record" why={org && isFacilityKind(org.kind) ? `Your role at ${org.name} does not include the bite register. A clinician, nurse or records officer of the facility can open it.` : "Bite records stay with the hospital or health centre that treats the person. Other partners see only the animal facts needed for a follow-up."} back={{ href: "/health/today", label: "Back to Today" }} /></div></Shell>
  );
  return <LiveExposure id={id} place={place!} />;
}

function LiveExposure({ id, place }: { id: string; place: Place }) {
  /* Reading this record writes "record opened" to its audit history, so it is read once and again only after a change. */
  const rec = useRead<Exposure>(() => call("oh_clinic_exposure", { p_exposure: id }), `nx-exp:${id}`);
  const xf = useRead<TransferOut[]>(() => call("oh_exposure_transfers", { p_exposure: id }), `nx-expx:${id}`);
  if (rec.loading && !rec.data) return <Opening ws="health" crumb={["Bite cases", "Record"]} />;
  if (rec.error && /Only staff|permission/i.test(rec.error)) return <Shell ws="health" crumb={["Bite cases", "Record"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Clinical record</h1><Denied what="This record belongs to another facility" why={rec.error} back={{ href: "/health/bites", label: "Back to bite cases" }} /></div></Shell>;
  if (rec.error || !rec.data) return <Shell ws="health" crumb={["Bite cases", "Record"]}><div className="nx-page"><Failed error={rec.error ?? "This record was not found."} retry={rec.reload} /></div></Shell>;
  return <ExposureView sample={false} e={rec.data} place={place} transfers={/does not exist|not set up/i.test(xf.error ?? "") ? null : xf.data ?? []} reload={() => { rec.reload(); xf.reload(); }} />;
}

function ExposureView({ sample, e, place, transfers, reload }: { sample: boolean; e: Exposure; place: Place | null; transfers: TransferOut[] | null; reload: () => void }) {
  const live = useLive();
  const caps = new Set(sample ? ["record_exposure", "log_reminder"] : place?.capabilities ?? []);
  const clinician = e.can.prescribe, assess = e.can.assess, canDose = e.can.record_dose;
  const t = e.today ?? indiaToday();
  const [cat, setCat] = useState<string | null>(null);
  const [changeCat, setChangeCat] = useState(false);
  const [dose, setDose] = useState<Dose | null>(null);
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState(false);
  const [refer, setRefer] = useState(false);
  const [withdraw, setWithdraw] = useState<TransferOut | null>(null);
  const { busy, run } = useAct();
  const nextDue = e.doses.find((d) => d.status === "due") ?? null;
  const setWashed = async (v: string) => {
    const before = e.wound_washed;
    const r = await run("wash", () => call("oh_set_wound_washed", { p_exposure: e.id, p_value: v }), { ok: `Wound washing recorded: ${(WASHED[v] ?? v).toLowerCase()}.`, undo: () => call("oh_set_wound_washed", { p_exposure: e.id, p_value: before }).then(() => reload()) });
    if (r.ok) reload();
  };
  const setCategory = async (c: string) => { const r = await run("cat", () => call("oh_set_category", { p_exposure: e.id, p_category: c }), { ok: `Category ${c} recorded in your name.` }); setCat(null); if (r.ok) { setChangeCat(false); reload(); } };
  const logCall = async (args: { p_dose: string | null; p_course: string | null }, outcome: string) => { const r = await run("call", () => call("oh_log_reminder", { p_dose: args.p_dose, p_outcome: outcome, p_course: args.p_course }), { ok: `Logged: ${(REMINDER[outcome] ?? outcome).toLowerCase()}.` }); if (r.ok) reload(); };
  const doWithdraw = async (x: TransferOut) => { const r = await run("wd", () => call("oh_transfer_act", { p_transfer: x.id, p_action: "withdrawn" }), { ok: "Referral withdrawn. The other facility no longer expects the person." }); setWithdraw(null); if (r.ok) reload(); };
  const history = e.history.filter((h) => h.action !== "read").slice(-15).reverse();
  const opened = e.history.filter((h) => h.action === "read").length;

  const catControl = assess && (e.category === "not_recorded" || changeCat)
    ? <span className="gh-acts">{["I", "II", "III"].map((c) => sample ? <TryLink key={c} sm quiet>Category {c}</TryLink> : <button key={c} type="button" className="nx-btn is-sm is-quiet" disabled={!!busy} onClick={() => setCat(c)}>Category {c}</button>)}{changeCat ? <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setChangeCat(false)}>Keep {e.category}</button> : null}</span>
    : e.category === "not_recorded" ? <span className="nx-t3">Waiting for a clinician</span>
    : <span>Category {e.category}{e.category_by_name ? <span className="nx-t3">, {e.category_by_name}</span> : null}{assess && !sample ? <button type="button" className="gh-link" style={{ marginLeft: 6 }} onClick={() => setChangeCat(true)}>Change</button> : null}</span>;
  const washControl = caps.has("record_exposure")
    ? (sample ? <span>{WASHED[e.wound_washed] ?? e.wound_washed}</span> : <select aria-label="Wound washing" value={e.wound_washed} disabled={!!busy} onChange={(ev) => void setWashed(ev.target.value)} style={{ minHeight: 30, borderRadius: 6, border: 0, boxShadow: "inset 0 0 0 1px var(--line-2)", background: "var(--bg)", color: "var(--ink)", font: "inherit", padding: "0 6px" }}>{Object.entries(WASHED).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>)
    : <span>{WASHED[e.wound_washed] ?? e.wound_washed}</span>;

  return (
    <Shell ws="health" crumb={["Bite cases", e.patient_ref ?? e.code]}>
      <RecordHead av={<Stethoscope size={18} />} title={<><span className="gh-code">{e.patient_ref ?? e.code}</span>{sample ? <Sample /> : null}</>}
        sub={<>{e.patient_ref ? <span className="gh-code">{e.code} · </span> : null}{SPECIES[e.animal_species] ?? e.animal_species} {(EXPOSURE_KIND[e.exposure_kind] ?? e.exposure_kind).toLowerCase()} on {fmtDate(e.exposure_on, { day: "numeric", month: "long" })}{e.area ? ` in ${e.area}` : ""} </>}
        chips={<><Chip tone={CAT_TONE[e.category] ?? "plain"}>{e.category === "not_recorded" ? "Category not recorded" : `Category ${e.category}`}</Chip>{e.course ? <Chip tone={COURSE_TONE[e.course.status] ?? "plain"}>{COURSE[e.course.status]?.label ?? e.course.status}</Chip> : <Chip>No course</Chip>}</>}
        actions={assess ? (sample ? <TryLink sm quiet>Refer this person</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={() => setRefer(true)}>Refer this person<ArrowRight size={13} /></button>) : undefined} />
      <div className="nx-rec" style={{ marginTop: 16, borderTop: "1px solid var(--line)" }}>
        <section aria-label="Presentation">
          <h3 className="nx-h3">Presentation</h3>
          <Props items={[
            ["Category", catControl],
            ["Wound washing", washControl],
            ["Presented", fmtDate(e.presented_on, { day: "numeric", month: "long" })],
            ["Came by", e.source === "citizen_notice" ? "Public notice" : e.source === "referral" ? "Referral" : "Walk-in"],
            ["Age", AGE[e.age_band] ?? e.age_band],
            ["Sex", SEX[e.sex] ?? e.sex],
            ["Reminder calls", e.reminder_consent && e.contact_phone ? <a key="t" href={`tel:${e.contact_phone.replace(/\s/g, "")}`} className="gh-link">{e.contact_phone}</a> : "No consent"],
            ["Animal", `${SPECIES[e.animal_species] ?? e.animal_species}, ${e.animal_ownership === "community" ? "street or community" : e.animal_ownership === "owned" ? "someone's pet" : "owner not known"}`],
            ["Looked like", e.animal_description],
            ["Where it is", e.animal_place],
          ]} />
          <p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>Patient details stay with this facility. Partners see only the animal facts needed for a follow-up. Kaju does not read this record.</span></p>
        </section>

        <section aria-label="Course">
          <Block title="Course" note={e.course ? `${e.course.regimen} · immunoglobulin ${e.course.rig_given ? "given" : "not given"} · prescribed by ${e.course.prescribed_by_name ?? "a clinician"}, ${fmtDate(e.course.prescribed_at)}` : undefined}
            action={clinician && e.course?.status === "active" ? (sample ? <><TryLink sm quiet><Plus size={13} />Add a dose date</TryLink><TryLink sm quiet>Close early</TryLink></> : <><button type="button" className="nx-btn is-sm is-quiet" onClick={() => setAdding(true)}><Plus size={13} />Add a dose date</button><button type="button" className="nx-btn is-sm is-quiet" onClick={() => setClosing(true)}>Close early</button></>) : undefined}>
            {!e.course ? (
              clinician ? (e.category === "not_recorded" ? <p className="nx-sub">Record the category first. Then prescribe from here.</p> : <Prescribe sample={sample} e={e} onDone={reload} />)
                : <p className="nx-sub">No course prescribed. A clinician prescribes from this page.</p>
            ) : (
              <ul className="gh-list" aria-label="Doses">{e.doses.map((d) => { const late = d.status === "due" && d.due_on < t; return (
                <li key={d.id}><div><b>Dose {d.dose_no}</b><small>{d.status === "given" ? `Given ${fmtDate(d.given_on)}${d.given_by_name ? ` by ${d.given_by_name}` : ""}${d.batch ? ` · batch ${d.batch}` : ""}` : d.status === "missed" ? `Missed · was due ${fmtDate(d.due_on)}` : d.status === "cancelled" ? `Cancelled · was due ${fmtDate(d.due_on)}` : `${late ? "Overdue since" : "Due"} ${fmtDate(d.due_on, { weekday: "short", day: "numeric", month: "short" })}`}</small></div>
                  <span className="gh-row-a"><Chip tone={d.status === "given" ? "ok" : d.status === "missed" || late ? "bad" : d.status === "cancelled" ? "plain" : d.due_on === t ? "accent" : "plain"}>{d.status === "given" ? "Given" : d.status === "missed" ? "Missed" : d.status === "cancelled" ? "Cancelled" : late ? "Overdue" : d.due_on === t ? "Today" : "Due"}</Chip>
                    {d.status === "due" && canDose && d.id === nextDue?.id ? (sample ? <TryLink sm>Record</TryLink> : <button type="button" className="nx-btn is-sm" onClick={() => setDose(d)}>Record</button>) : null}</span></li>); })}</ul>
            )}
            {e.course?.status_note ? <p className="nx-foot">{e.course.status_note}</p> : null}
            <p className="nx-foot">StrayPaw does not calculate a schedule. Every dose date here was entered by the clinician.</p>
          </Block>
          <Referrals sample={sample} transfers={transfers} canRefer={assess} onRefer={() => setRefer(true)} onWithdraw={setWithdraw} />
        </section>

        <aside aria-label="Follow-up and history">
          <Block title="Reminder calls" note={e.reminder_consent && e.contact_phone ? "Phone calls from the clinic, logged here. Automatic SMS or WhatsApp is not connected." : "The patient did not agree to be called."}>
            {e.reminder_consent && e.contact_phone && caps.has("log_reminder") ? (
              nextDue ? <Field label={`Dose ${nextDue.dose_no}, due ${fmtDate(nextDue.due_on)}`}>{sample ? <TryLink sm quiet>Log a call</TryLink> : <select aria-label="Log a reminder call" defaultValue="" disabled={!!busy} onChange={(ev) => { if (ev.target.value) void logCall({ p_dose: nextDue.id, p_course: null }, ev.target.value); ev.target.value = ""; }}><option value="" disabled>Log a call</option>{Object.entries(REMINDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
                : e.course?.status === "completed" ? <Field label="Course complete: tell the patient">{sample ? <TryLink sm quiet>Log a call</TryLink> : <select aria-label="Log the completion call" defaultValue="" disabled={!!busy} onChange={(ev) => { if (ev.target.value) void logCall({ p_dose: null, p_course: e.course!.id }, ev.target.value); ev.target.value = ""; }}><option value="" disabled>Log a call</option>{Object.entries(REMINDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
                : <p className="nx-sub">No dose is due.</p>
            ) : null}
          </Block>
          <Block title="Animal follow-up" note="Shared without patient details">
            {e.handoff ? <ul className="gh-list"><li><div><b>{e.handoff.outcome ?? "Waiting for the team to report what they found."}</b><small>{e.handoff.to}</small></div><span className="gh-row-a"><Chip tone={e.handoff.status === "done" ? "ok" : e.handoff.status === "declined" ? "plain" : "accent"}>{HANDOFF[e.handoff.status]?.label ?? e.handoff.status}</Chip></span></li></ul>
              : <p className="nx-sub">{e.animal_ownership === "owned" ? "The animal is someone's pet; no field follow-up was asked for." : e.area ? "No follow-up was asked for, or no animal team covers this area." : "No area was recorded, so no follow-up was sent."}</p>}
          </Block>
          <Block title="History" note={`Who did what, kept for audit.${opened ? ` Opened ${opened} ${opened === 1 ? "time" : "times"}.` : ""}`}>
            <Timeline items={history.map((h, i) => ({ id: `${h.at}${i}`, when: dayTime(h.at), title: AUDIT[h.action] ?? h.action.replace(/_/g, " ") }))} empty="No changes since it was recorded." />
          </Block>
        </aside>
      </div>
      {cat ? <SignedConfirm title={`Record category ${cat}`} who={live.userName} where={place?.name} busy={busy === "cat"} confirm={`Record category ${cat}`} onClose={() => setCat(null)} onConfirm={() => void setCategory(cat)} tick="This is my clinical assessment of this exposure.">
        <p>The record shows category {cat}, assessed by you. StrayPaw records it; it does not assess.</p></SignedConfirm> : null}
      {dose ? <DoseModal dose={{ dose_id: dose.id, dose_no: dose.dose_no, due_on: dose.due_on, label: e.patient_ref ?? e.code }} onClose={() => setDose(null)} onDone={() => { setDose(null); reload(); }} /> : null}
      {adding && e.course ? <AddDose courseId={e.course.id} onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} /> : null}
      {closing && e.course ? <CloseCourse courseId={e.course.id} onClose={() => setClosing(false)} onDone={() => { setClosing(false); reload(); }} /> : null}
      {refer ? <ReferModal exposureId={e.id} onClose={() => setRefer(false)} onDone={() => { setRefer(false); reload(); }} /> : null}
      {withdraw ? <Confirm title="Withdraw this referral" danger busy={busy === "wd"} confirm="Withdraw" onClose={() => setWithdraw(null)} onConfirm={() => void doWithdraw(withdraw)}><p>{withdraw.to_short ?? withdraw.to} will no longer expect this person for {(SERVICE_LABEL[withdraw.service] ?? withdraw.service).toLowerCase()}. The withdrawal is recorded in the history.</p></Confirm> : null}
    </Shell>
  );
}

function Referrals({ sample, transfers, canRefer, onRefer, onWithdraw }: { sample: boolean; transfers: TransferOut[] | null; canRefer: boolean; onRefer: () => void; onWithdraw: (x: TransferOut) => void }) {
  if (transfers === null) return null;
  const rows = sample ? [] : transfers;
  return (
    <Block title="Referral" note="The receiving facility sees the bite code and what is needed, never who the person is." action={canRefer ? (sample ? <TryLink sm quiet>Refer</TryLink> : <button type="button" className="nx-btn is-sm is-quiet" onClick={onRefer}>Refer</button>) : undefined}>
      {rows.length ? <ul className="gh-list">{rows.map((r) => <li key={r.id}><div><b>{SERVICE_LABEL[r.service] ?? r.service} at {r.to_short ?? r.to}</b><small>{r.status === "sent" ? `Referred ${dayTime(r.sent_at)}${r.sent_by ? ` by ${r.sent_by}` : ""}` : `${TRANSFER[r.status]?.label ?? r.status}${r.closed_at ? `, ${fmtDate(r.closed_at)}` : ""}${r.closed_by ? ` · ${r.closed_by}` : ""}`}{r.note ? ` · ${r.note}` : ""}</small></div>
        <span className="gh-row-a"><Chip tone={XTONE[r.status] ?? "plain"}>{TRANSFER[r.status]?.label ?? r.status}</Chip>{r.status === "sent" && canRefer ? <button type="button" className="nx-btn is-sm is-quiet" onClick={() => onWithdraw(r)}>Withdraw</button> : null}</span></li>)}</ul>
        : <p className="nx-sub">{canRefer ? "Not referred. Refer when this facility cannot give what the person needs." : "Not referred. A clinician refers from this page."}</p>}
    </Block>
  );
}

/* ── The clinician's prescription: regimen and every date, as entered ── */
function Prescribe({ sample, e, onDone }: { sample: boolean; e: Exposure; onDone: () => void }) {
  const live = useLive();
  const [regimen, setRegimen] = useState(""), [rig, setRig] = useState(false), [dates, setDates] = useState<string[]>([""]);
  const [asking, setAsking] = useState(false);
  const { busy, run } = useAct();
  const filled = dates.filter(Boolean);
  const bad = filled.some((d, i) => d < e.exposure_on || (i > 0 && d < filled[i - 1]));
  const ok = regimen.trim().length >= 2 && filled.length >= 1 && filled.length <= 12 && !bad;
  const save = async () => { const r = await run("rx", () => call("oh_prescribe", { p_exposure: e.id, p_regimen: regimen.trim(), p_rig_given: rig, p_due_dates: filled }), { ok: "Course saved in your name. Each dose appears on Today and in Doses due when it is due." }); setAsking(false); if (r.ok) onDone(); };
  return (
    <div className="gh-form">
      <p className="nx-note"><Lock size={13} /><span><b>StrayPaw does not calculate or suggest a schedule.</b> Write the regimen as in your facility&apos;s protocol and enter the date you set for each dose.</span></p>
      <Field label="Regimen"><input value={regimen} maxLength={160} onChange={(ev) => setRegimen(ev.target.value)} placeholder="As written in your protocol" /></Field>
      <label className="gh-tick"><input type="checkbox" checked={rig} onChange={(ev) => setRig(ev.target.checked)} /><span>Rabies immunoglobulin given</span></label>
      <div className="nx-field"><span>Dose dates</span>
        {dates.map((d, i) => <div key={i} className="gh-acts"><span className="nx-t3" style={{ width: 52 }}>Dose {i + 1}</span><input type="date" aria-label={`Dose ${i + 1} date`} value={d} min={e.exposure_on} onChange={(ev) => setDates(dates.map((x, j) => (j === i ? ev.target.value : x)))} style={{ width: "auto", flex: "1 1 160px" }} />{dates.length > 1 ? <button type="button" className="nx-ib" aria-label={`Remove dose ${i + 1}`} onClick={() => setDates(dates.filter((_, j) => j !== i))}><X size={14} /></button> : null}</div>)}
        {dates.length < 12 ? <div><button type="button" className="nx-btn is-sm is-quiet" onClick={() => setDates([...dates, ""])}><Plus size={13} />Add a dose date</button></div> : null}
        {bad ? <small className="gh-err">Dates must be on or after the exposure ({fmtDate(e.exposure_on)}) and in order.</small> : null}
      </div>
      <div className="gh-acts">{sample ? <TryLink sm>Save prescription</TryLink> : <button type="button" className="nx-btn is-sm" disabled={!ok || !!busy} onClick={() => setAsking(true)}>Save prescription</button>}</div>
      {asking ? <SignedConfirm title="Save this prescription" who={live.userName} busy={busy === "rx"} confirm="Save prescription" onClose={() => setAsking(false)} onConfirm={() => void save()} tick="This is the course I prescribed.">
        <p>{regimen.trim()}; immunoglobulin {rig ? "given" : "not given"}.</p>
        <ul>{filled.map((d, i) => <li key={i}>Dose {i + 1}: {fmtDate(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</li>)}</ul>
      </SignedConfirm> : null}
    </div>
  );
}

/** Record a dose as given or missed. Used on the record and from the list of doses due. */
export function DoseModal({ dose, onClose, onDone }: { dose: { dose_id: string; dose_no: number; due_on: string; label?: string }; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<"given" | "missed">("given");
  const [on, setOn] = useState(indiaToday()), [batch, setBatch] = useState("");
  const { busy, run } = useAct();
  const save = async () => { const r = await run("dose", () => call<{ remaining: number; completed: boolean }>("oh_record_dose", { p_dose: dose.dose_id, p_status: status, p_given_on: status === "given" ? on : null, p_batch: batch.trim() || null }), { ok: (x) => { const d = (x as { data?: { completed?: boolean } | null }).data; return status === "given" ? (d?.completed ? `Dose ${dose.dose_no} recorded. The course is complete.` : `Dose ${dose.dose_no} recorded.`) : `Dose ${dose.dose_no} recorded as missed.`; } }); if (r.ok) onDone(); };
  return <Modal title={`Record dose ${dose.dose_no}`} onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || (status === "given" && !on)} onClick={() => void save()}>Save</button></>}>
    <p className="nx-sub" style={{ marginTop: 0 }}>Due {fmtDate(dose.due_on, { day: "numeric", month: "long" })}{dose.label ? ` · ${dose.label}` : ""}. Recorded in your name.</p>
    <Seg name="dose-status" label="Dose outcome" value={status} onChange={setStatus} options={[["given", "Given"], ["missed", "Missed"]]} />
    {status === "given" ? <div className="nx-fields gh-fields"><Field label="Date given"><input type="date" value={on} max={indiaToday()} onChange={(ev) => setOn(ev.target.value)} /></Field><Field label="Vaccine batch"><input value={batch} maxLength={40} onChange={(ev) => setBatch(ev.target.value)} placeholder="As printed on the vial" /></Field></div>
      : <p className="nx-note"><span>A missed dose stays on the record. The clinician decides whether to add a new date or close the course.</span></p>}
  </Modal>;
}

function AddDose({ courseId, onClose, onDone }: { courseId: string; onClose: () => void; onDone: () => void }) {
  const [on, setOn] = useState("");
  const { busy, run } = useAct();
  const save = async () => { const r = await run("add", () => call("oh_add_dose", { p_course: courseId, p_due_on: on }), { ok: `Dose date added for ${fmtDate(on)}.` }); if (r.ok) onDone(); };
  return <Modal title="Add a dose date" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || !on} onClick={() => void save()}>Add date</button></>}>
    <p className="nx-sub" style={{ marginTop: 0 }}>For example after a missed dose. The date is yours; StrayPaw does not calculate one.</p>
    <Field label="Date" hint="Today or later. A course has at most 12 doses."><input type="date" value={on} min={indiaToday()} onChange={(ev) => setOn(ev.target.value)} autoFocus /></Field>
  </Modal>;
}

function CloseCourse({ courseId, onClose, onDone }: { courseId: string; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<"lost_to_follow_up" | "discontinued">("lost_to_follow_up"), [note, setNote] = useState("");
  const { busy, run } = useAct();
  const save = async () => { const r = await run("close", () => call("oh_set_course_status", { p_course: courseId, p_status: status, p_note: note.trim() || null }), { ok: status === "lost_to_follow_up" ? "Marked as did not return. Remaining doses are cancelled." : "Course stopped. Remaining doses are cancelled." }); if (r.ok) onDone(); };
  return <Modal title="Close the course early" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn is-danger" disabled={!!busy} onClick={() => void save()}>Close course</button></>}>
    <p className="nx-sub" style={{ marginTop: 0 }}>Doses still due are cancelled. This is recorded in the history in your name.</p>
    <Seg name="close" label="Reason" value={status} onChange={setStatus} options={[["lost_to_follow_up", "Patient did not return"], ["discontinued", "Stopped by clinician"]]} />
    <Field label="Note"><textarea value={note} maxLength={300} onChange={(ev) => setNote(ev.target.value)} placeholder="For example: two calls unanswered" /></Field>
  </Modal>;
}

type Need = "arv" | "rig" | "wound_care";
function ReferModal({ exposureId, onClose, onDone }: { exposureId: string; onClose: () => void; onDone: () => void }) {
  const opts = useRead<ReferralOption[]>(() => call("oh_referral_options", { p_exposure: exposureId }), `nx-refopt:${exposureId}`);
  const [need, setNeed] = useState<Need>("rig");
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { busy, run } = useAct();
  /* The programme's pathway for this need first, then places that last confirmed it available; the name breaks ties. */
  const ranked = useMemo(() => {
    const rank = (o: ReferralOption) => { const s = o.services.find((x) => x.service === need); return (o.pathways.includes(need) ? 0 : 4) + (s?.status === "available" ? 0 : s?.status === "limited" ? 1 : s?.status === "unavailable" ? 3 : 2); };
    return [...(opts.data ?? [])].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [opts.data, need]);
  const chosen = to && ranked.some((o) => o.id === to) ? to : null;
  const target = ranked.find((o) => o.id === chosen);
  const save = async () => { if (!chosen) return; const r = await run("refer", () => call("oh_refer_exposure", { p_exposure: exposureId, p_to: chosen, p_service: need, p_note: note.trim() || null }), { ok: `Referred for ${SERVICE_SHORT[need].toLowerCase()} to ${target?.short_name ?? target?.name}. They mark whether the person arrived.` }); if (r.ok) onDone(); };
  return <Modal title="Refer this person" wide onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || !chosen} onClick={() => void save()}>Refer<ArrowRight size={13} /></button></>}>
    <p className="nx-sub" style={{ marginTop: 0 }}>The other facility sees the bite code, its category and the need. Never the person&apos;s name or phone number.</p>
    <Seg name="need" label="They need" value={need} onChange={(v) => { setNeed(v); setTo(null); }} options={[["arv", "Vaccine"], ["rig", "Immunoglobulin"], ["wound_care", "Wound washing"]]} />
    {opts.loading && !opts.data ? <Skeleton rows={3} /> : opts.error ? <Failed error={opts.error} retry={opts.reload} /> : !ranked.length ? <p className="nx-sub">No other facility is in this programme yet.</p> : (
      <div role="radiogroup" aria-label="Where" className="gh-list">{ranked.map((o) => { const s = o.services.find((x) => x.service === need); const st = s ? SERVICE_STATUS[s.status] : null; return (
        <label key={o.id} className="gh-tick" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", alignItems: "center" }}><input type="radio" name="refer-to" checked={chosen === o.id} onChange={() => setTo(o.id)} />
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 500 }}>{o.short_name ?? o.name}</b><small style={{ display: "block", color: "var(--ink-3)" }}>{[o.area, o.pathways.includes(need) ? "Programme pathway" : null].filter(Boolean).join(" · ") || o.name}</small></span>
          <span className="gh-state">{st ? <Chip tone={s!.status === "available" ? "ok" : s!.status === "limited" ? "warn" : s!.status === "unavailable" ? "bad" : "plain"}>{st.label}</Chip> : <Chip>Never confirmed</Chip>}{s ? <small className="nx-t3">confirmed {ago(s.verified_at)}</small> : null}</span></label>); })}</div>)}
    <Field label="Note for the other facility (optional)" hint="Never the person's name or phone number."><textarea value={note} maxLength={300} onChange={(ev) => setNote(ev.target.value)} placeholder="For example: needs immunoglobulin today; leaving now by auto" /></Field>
    <p className="gh-hint">A confirmation is what a person at that facility said, with its date. It is not a stock count; call before sending someone.</p>
  </Modal>;
}

/** "Record the dose" from the list of doses due, for nurses and clinicians of the facility. */
export function PepDose({ sample, orgId, dose, onDone }: { sample: boolean; orgId: string | null; dose: { dose_id: string; dose_no: number; due_on: string; label?: string } | null; onDone: () => void }) {
  const pl = usePlaces(!sample);
  const [open, setOpen] = useState(false);
  if (sample) return <div className="gh-steps" style={{ marginTop: 14 }}><TryLink sm>Record the dose</TryLink></div>;
  if (!dose || !can(placeOf(pl.places, orgId), "record_dose")) return null;
  return <><div className="gh-steps" style={{ marginTop: 14 }}><button type="button" className="nx-btn is-sm" onClick={() => setOpen(true)}>Record the dose</button></div>{open ? <DoseModal dose={dose} onClose={() => setOpen(false)} onDone={() => { setOpen(false); onDone(); }} /> : null}</>;
}
