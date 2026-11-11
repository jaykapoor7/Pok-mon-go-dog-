"use client";

/* A hospital or health centre's day: who is due a dose, who the public told
   us about, and which presentations still need a clinician. */
import Link from "next/link";
import { useState } from "react";
import { Phone, Plus } from "lucide-react";
import { useOh } from "../Shell";
import { call, daysFrom, fmtDate, relDay, today, useRead, AGE, REMINDER, SPECIES, type DueDose, type Notice, type RegisterRow } from "../data";
import { Chip, Empty, Failed, Head, Loading, Section, Seg, Sheet, Stat, useToast } from "../ui";

export function ClinicToday() {
  const { place, reload: reloadPlaces } = useOh();
  const id = place!.institution_id, role = place!.role;
  const due = useRead<DueDose[]>(() => call("oh_clinic_due", { p_facility: id }), `due:${id}`);
  const notices = useRead<Notice[]>(() => call("oh_clinic_notices", { p_facility: id }), `notices:${id}`);
  const waiting = useRead<RegisterRow[]>(() => call("oh_clinic_register", { p_facility: id, p_filter: "needs_assessment", p_limit: 20 }), `wait:${id}`);
  const [dose, setDose] = useState<DueDose | null>(null);
  const toast = useToast();
  const t = today();
  const dueToday = due.data?.filter((d) => d.due_on === t).length;
  const overdue = due.data?.filter((d) => d.due_on < t).length;
  const canDose = role === "nurse" || role === "clinician";
  const refresh = () => { due.reload(); notices.reload(); waiting.reload(); reloadPlaces(); };

  const logCall = async (d: DueDose, outcome: string) => {
    const r = await call("oh_log_reminder", { p_dose: d.dose_id, p_outcome: outcome });
    if (r.error) toast(r.error, "flame"); else { toast(`Logged: ${REMINDER[outcome].toLowerCase()}.`); due.reload(); }
  };
  const contacted = async (n: Notice) => {
    const r = await call("oh_update_notice", { p_notice: n.id, p_status: "contacted" });
    if (r.error) toast(r.error, "flame"); else { toast("Marked as contacted."); notices.reload(); reloadPlaces(); }
  };

  return (
    <main className="oh-page" id="main-content">
      <Head eyebrow={place!.programme.name} title={`Today at ${place!.short_name ?? place!.name}`} lede="Doses due, notices from the public and presentations waiting for a clinician."
        actions={<Link className="oh-btn primary" href={`/workspace/${id}/new`}><Plus size={16} aria-hidden />Record a bite</Link>} />
      <dl className="oh-stats">
        <Stat label="Due today" value={due.error ? null : dueToday} href="#due" />
        <Stat label="Overdue" value={due.error ? null : overdue} tone={overdue ? "flame" : undefined} href="#due" note="Not yet given" />
        <Stat label="Waiting for a clinician" value={waiting.error ? null : waiting.data?.length} href={`/workspace/${id}/register?filter=needs_assessment`} note="Category or course not recorded" />
        <Stat label="Notices from the public" value={notices.error ? null : notices.data?.length} tone={notices.data?.length ? "amber" : undefined} href="#notices" />
      </dl>

      <div className="oh-grid">
        <Section title="Doses due" note="Today, tomorrow and overdue" id="due">
          {due.loading && !due.data ? <Loading /> : due.error ? <Failed error={due.error} retry={due.reload} /> : !due.data?.length ? <Empty title="No doses due">Everyone on a course is up to date.</Empty> : (
            <div className="oh-rows">
              {due.data.map((d) => {
                const late = d.due_on < t;
                return (
                  <div className="oh-row" key={d.dose_id}>
                    <span className="oh-row-mark" data-tone={late ? "flame" : d.due_on === t ? "blue" : undefined} aria-hidden />
                    <Link href={`/workspace/${id}/record/${d.exposure_id}`} className="oh-row-main">
                      <b>Dose {d.dose_no} of {d.doses_total} · {d.patient_ref ?? d.code}</b>
                      <span>{AGE[d.age_band] ?? d.age_band} · {late ? `${-daysFrom(d.due_on)} day${daysFrom(d.due_on) === -1 ? "" : "s"} overdue` : relDay(d.due_on)}{d.last_reminder ? ` · ${REMINDER[d.last_reminder.outcome]} ${relDay(d.last_reminder.at).toLowerCase()}` : ""}</span>
                    </Link>
                    <div className="oh-row-meta">
                      {d.phone ? <a className="oh-btn small" href={`tel:${d.phone.replace(/\s/g, "")}`} aria-label={`Call about ${d.patient_ref ?? d.code}`}><Phone size={14} aria-hidden />Call</a> : <Chip plain>No consent to call</Chip>}
                      {d.phone ? (
                        <select className="oh-btn small" aria-label="Log the call" defaultValue="" onChange={(e) => { if (e.target.value) logCall(d, e.target.value); e.target.value = ""; }}>
                          <option value="" disabled>Log call</option>
                          {Object.entries(REMINDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : null}
                      {canDose ? <button type="button" className="oh-btn small primary" onClick={() => setDose(d)}>Record dose</button> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="oh-note" style={{ marginTop: 10 }}>Reminders are made by phone from the clinic. Automatic SMS or WhatsApp is <b>not connected</b>.</p>
        </Section>

        <div className="oh-grid halves">
          <Section title="Notices from the public" note="Not medical records" id="notices">
            {notices.loading && !notices.data ? <Loading rows={2} /> : notices.error ? <Failed error={notices.error} retry={notices.reload} /> : !notices.data?.length ? <Empty title="No new notices" /> : (
              <div className="oh-rows">
                {notices.data.map((n) => (
                  <div className="oh-row" key={n.id}>
                    <span className="oh-row-mark" data-tone={n.status === "new" ? "amber" : undefined} aria-hidden />
                    <div className="oh-row-main"><b>{SPECIES[n.animal_species]} · {n.ward ?? "Ward not given"}</b><span className="wrap">{fmtDate(n.happened_on)} · {n.animal_description ?? "No description"}{n.place ? ` · ${n.place}` : ""}</span></div>
                    <div className="oh-row-meta">
                      {n.callback_phone ? <a className="oh-btn small" href={`tel:${n.callback_phone.replace(/\s/g, "")}`}><Phone size={14} aria-hidden />Call</a> : <Chip plain>No callback</Chip>}
                      {n.status === "new" ? <button type="button" className="oh-btn small" onClick={() => contacted(n)}>Contacted</button> : <Chip tone="blue">Contacted</Chip>}
                      <Link className="oh-btn small" href={`/workspace/${id}/new?notice=${n.id}&ward=${encodeURIComponent(n.ward ?? "")}&species=${n.animal_species}&on=${n.happened_on}&animal=${encodeURIComponent(n.animal_description ?? "")}&place=${encodeURIComponent(n.place ?? "")}`}>Patient came in</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
          <Section title="Waiting for a clinician">
            {waiting.loading && !waiting.data ? <Loading rows={2} /> : waiting.error ? <Failed error={waiting.error} retry={waiting.reload} /> : !waiting.data?.length ? <Empty title="Nothing waiting" /> : (
              <div className="oh-rows">
                {waiting.data.slice(0, 6).map((r) => (
                  <Link className="oh-row" key={r.id} href={`/workspace/${id}/record/${r.id}`}>
                    <div className="oh-row-main"><b>{r.patient_ref ?? r.code}</b><span>{fmtDate(r.presented_on)} · {SPECIES[r.species]} {r.kind.replace("_", " ")} · {r.ward ?? "Ward not recorded"}</span></div>
                    <div className="oh-row-meta">{r.category === "not_recorded" ? <Chip tone="amber">Category not recorded</Chip> : <Chip tone="amber">No course yet</Chip>}</div>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
      {dose ? <DoseSheet dose={dose} onClose={() => setDose(null)} onDone={(msg) => { setDose(null); toast(msg); refresh(); }} /> : null}
    </main>
  );
}

export function DoseSheet({ dose, onClose, onDone }: { dose: { dose_id: string; dose_no: number; due_on: string; label?: string }; onClose: () => void; onDone: (msg: string) => void }) {
  const [status, setStatus] = useState<"given" | "missed">("given");
  const [on, setOn] = useState(today()), [batch, setBatch] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call<{ remaining: number }>("oh_record_dose", { p_dose: dose.dose_id, p_status: status, p_given_on: on, p_batch: batch || null });
    setBusy(false);
    if (r.error) setErr(r.error); else onDone(status === "given" ? (r.data?.remaining === 0 ? `Dose ${dose.dose_no} recorded. That was the last prescribed dose.` : `Dose ${dose.dose_no} recorded.`) : `Dose ${dose.dose_no} recorded as missed.`);
  };
  return (
    <Sheet title={`Record dose ${dose.dose_no}`} note={`Due ${fmtDate(dose.due_on, { day: "numeric", month: "long" })}${dose.label ? ` · ${dose.label}` : ""}`} onClose={onClose}
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button></>}>
      <Seg name="dose-status" value={status} onChange={setStatus} options={[["given", "Given"], ["missed", "Missed"]]} />
      {status === "given" ? (
        <div className="oh-fields">
          <label className="oh-field"><span>Date given</span><input type="date" value={on} max={today()} onChange={(e) => setOn(e.target.value)} /></label>
          <label className="oh-field"><span>Vaccine batch</span><input value={batch} maxLength={40} onChange={(e) => setBatch(e.target.value)} placeholder="As printed on the vial" /></label>
        </div>
      ) : <p className="oh-note">A missed dose stays on the record. The clinician decides whether to reschedule or close the course.</p>}
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}
