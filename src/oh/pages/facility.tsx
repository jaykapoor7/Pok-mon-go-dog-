"use client";

/* A hospital or health centre: its day, its bite register and the desk form.
   Patients are identified by the facility's own register number; no name
   is stored. Clinicians record the category and prescribe; the software
   never assesses, schedules or suggests a treatment. */
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ArrowLeftRight, Check, Megaphone, Phone, Siren, Stethoscope, Syringe } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DailyHead, NeedsYou, type DailyRow } from "@/sp/ui/Daily";
import { Seg as Seg2 } from "@/sp/ui/Page";
import { usePlaces, primaryProgramme, isFacility } from "../places";
import { call, daysFrom, fmtDate, relDay, today, useRead, AGE, COURSE, EXPOSURE_KIND, REMINDER, SERVICE_LABEL, SEX, SPECIES, TRANSFER, WASHED, type Alert, type Area, type ClinicDue, type ClinicTransfers, type DueDose, type Notice, type Place, type RegisterRow, type TransferIn } from "../data";
import { AlertList, Chip, Empty, Failed, Head, Loading, Page, Section, Seg, Sheet, Stat, useToast } from "../ui";

/** The place this page belongs to, or a clear message why it cannot open. */
export function usePlaceParam(): { place: Place | null; ready: boolean } {
  const { id } = useParams<{ id: string }>();
  const { places, ready } = usePlaces();
  return { place: places.find((p) => p.organisation_id === id) ?? null, ready };
}

export function NotHere({ ready }: { ready: boolean }) {
  if (!ready) return <Page><Loading rows={4} /></Page>;
  return <Page><Empty title="You are not a member of this place">Ask your programme coordinator to add you, or go back to <Link className="oh-btn quiet small" href="/today">Today</Link>.</Empty></Page>;
}

export function ClinicToday({ place }: { place: Place }) {
  const { user } = useAuth();
  const { reload: reloadPlaces } = usePlaces();
  const id = place.organisation_id, prog = primaryProgramme(place);
  const due = useRead<ClinicDue>(() => call("oh_clinic_due", { p_facility: id }), `due:${id}`);
  const notices = useRead<Notice[]>(() => call("oh_clinic_notices", { p_facility: id }), `notices:${id}`);
  const waiting = useRead<RegisterRow[]>(() => call("oh_clinic_register", { p_facility: id, p_filter: "needs_assessment", p_limit: 20 }), `wait:${id}`);
  const alerts = useRead<Alert[]>(() => call("oh_alerts", { p_programme: prog?.id }), `alerts:${prog?.id}:${id}`, !!prog);
  /* Referrals between facilities (v2.6). Before that migration the function does not exist and the lane is not offered. */
  const xfer = useRead<ClinicTransfers>(() => call("oh_clinic_transfers", { p_facility: id }), `xfers:${id}`);
  const xferReady = !!xfer.data && !/could not find the function|does not exist|schema cache/i.test(xfer.error ?? "");
  const router = useRouter();
  const [dose, setDose] = useState<DueDose | null>(null);
  const toast = useToast();
  const t = due.data?.today ?? today();
  const list = due.data?.due ?? [];
  const overdue = due.data ? list.filter((d) => d.due_on < t).length : undefined;
  const canDose = place.capabilities.includes("record_dose");
  const canAssess = place.capabilities.includes("assess");
  /* This facility's own alerts, and confirmed cases anywhere in the programme; one row per kind and area. */
  const mine = [...(alerts.data ?? []).filter((a) => a.organisation_id === id || a.kind === "positive_result")
    .reduce((m, a) => { const k = `${a.kind}|${a.area ?? ""}`; const g = m.get(k); if (g) g.n++; else m.set(k, { ...a, n: 1 }); return m; }, new Map<string, Alert & { n: number }>()).values()];
  const refresh = () => { due.reload(); notices.reload(); waiting.reload(); alerts.reload(); xfer.reload(); reloadPlaces(); };
  const markTransfer = async (r: TransferIn, action: "arrived" | "not_arrived") => {
    const res = await call("oh_transfer_act", { p_transfer: r.id, p_action: action });
    if (res.error) { toast(res.error, "flame"); return; }
    xfer.reload(); reloadPlaces();
    if (action === "not_arrived") { toast(`Marked as not arrived. ${r.from_short ?? r.from} can see it.`); return; }
    toast("Marked as arrived. Record the bite here so the course is followed.");
    router.push(`/workspace/${id}/new?referral=${r.id}&from=${encodeURIComponent(r.from_short ?? r.from)}&code=${encodeURIComponent(r.code)}&species=${r.animal_species}&on=${r.exposure_on}`);
  };

  const logCall = async (args: { p_dose?: string; p_course?: string }, outcome: string) => {
    const r = await call("oh_log_reminder", { p_dose: args.p_dose ?? null, p_outcome: outcome, p_course: args.p_course ?? null });
    if (r.error) toast(r.error, "flame"); else { toast(`Logged: ${REMINDER[outcome].toLowerCase()}.`); due.reload(); }
  };
  const contacted = async (n: Notice) => {
    const r = await call("oh_update_notice", { p_notice: n.id, p_status: "contacted" });
    if (r.error) toast(r.error, "flame"); else { toast("Marked as contacted."); notices.reload(); reloadPlaces(); }
  };

  /* The daily brief, as the landing demo draws it: one sentence, what needs
     a person today, a line to Kaju, then one working list at a time. */
  const nNotices = notices.data?.filter((n) => n.status === "new").length ?? 0;
  const nWaiting = waiting.data?.length ?? 0;
  const xIn = xfer.data?.incoming ?? [], xOut = xfer.data?.outgoing ?? [];
  const nIn = xIn.filter((r) => r.status === "sent").length;
  const [lane, setLane] = useState<"due" | "done" | "notices" | "waiting" | "referrals">("due");
  /* Needs you: what the lists below do not already show (a confirmed case, vaccine readiness, a lapsed confirmation). Doses, notices,
     completions and bites waiting are the lists themselves, each once, with its count. */
  const rows: DailyRow[] = [
    ...mine.filter((a) => a.kind !== "doses_overdue" && a.kind !== "courses_completed").slice(0, 3).map((a) => ({ key: a.key, href: a.kind === "pep_readiness" ? `/workspace/${id}/services` : a.kind === "positive_result" ? `/workspace/${id}/register` : "#oh-work", tone: a.severity === "urgent" ? "flame" : "amber", icon: <Siren size={10} strokeWidth={2.4} />, title: <b>{a.title}{a.n > 1 ? ` (${a.n})` : ""}</b>, meta: a.kind === "positive_result" ? `${a.area ?? "In the programme"} · check bites recorded from this locality` : a.area ?? undefined, tag: a.severity === "urgent" ? "Urgent" : "Attention", verb: a.kind === "positive_result" ? "Open the register" : "Open" })),
  ];

  return (
    <Page illustrative={place.illustrative}>
      <div className="dy">
        <DailyHead place={place.short_name ?? place.name} name={user?.name} loading={!due.data && !due.error} />
        {due.error ? <Failed error={due.error} retry={due.reload} /> : null}
        {rows.length ? <NeedsYou rows={rows} /> : null}
        {/* No Kaju box here: Kaju never reads patient records, doses or courses, so it cannot answer questions about them. */}

        <section className="dy-sec" id="oh-work" aria-label="The day's lists">
          <div className="vw-bar">
            <Seg2 label="The day's lists" value={lane} onChange={(v) => setLane(v)} options={[
              { id: "due", label: "Doses due", count: list.length, tone: overdue ? "flame" : undefined },
              { id: "done", label: "Completed", count: due.data?.completed?.length ?? 0 },
              { id: "notices", label: "From the public", count: nNotices },
              ...(canAssess ? [{ id: "waiting" as const, label: "Waiting for a clinician", count: nWaiting }] : []),
              ...(xferReady && (xIn.length || xOut.length) ? [{ id: "referrals" as const, label: "Referrals", count: nIn }] : []),
            ]} />
          </div>

          {lane === "due" ? (due.loading && !due.data ? <Loading /> : !list.length ? <Empty title="No doses due">Everyone in a course is up to date.</Empty> : (
            <ul className="dy-work">
              {list.map((d, i) => {
                const late = d.due_on < t;
                return (
                  <li key={d.dose_id} style={{ ["--j" as string]: i }}>
                    <span className="dy-sq" data-c={late ? "flame" : d.due_on === t ? "blue" : "slate"} aria-hidden><Syringe size={10} strokeWidth={2.4} /></span>
                    <Link href={`/workspace/${id}/record/${d.exposure_id}`} className="dy-work-t"><b>Dose {d.dose_no} of {d.doses_total} · <span className="dy-code">{d.patient_ref ?? d.code}</span></b><small>{AGE[d.age_band] ?? d.age_band} · {late ? `${-daysFrom(d.due_on)} day${daysFrom(d.due_on) === -1 ? "" : "s"} overdue` : relDay(d.due_on)}{d.last_reminder ? ` · ${REMINDER[d.last_reminder.outcome]} ${relDay(d.last_reminder.at).toLowerCase()}` : ""}</small></Link>
                    <div className="dy-work-acts">
                      {d.phone ? <a className="oh-btn small" href={`tel:${d.phone.replace(/\s/g, "")}`} aria-label={`Call about ${d.patient_ref ?? d.code}`}><Phone size={14} aria-hidden />Call</a> : <Chip plain>No consent to call</Chip>}
                      {d.phone ? <LogCall onLog={(o) => void logCall({ p_dose: d.dose_id }, o)} /> : null}
                      {canDose ? <button type="button" className="oh-btn small primary" onClick={() => setDose(d)}>Record dose</button> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )) : null}
          {lane === "due" ? <p className="dy-foot">Reminders are phone calls from the clinic, logged here. Automatic SMS or WhatsApp is <b>not connected</b>.</p> : null}

          {lane === "done" ? (!due.data?.completed?.length ? <Empty title="No course completed recently" /> : (
            <ul className="dy-work">
              {due.data.completed.map((c, i) => (
                <li key={c.course_id} style={{ ["--j" as string]: i }}>
                  <span className="dy-sq" data-c="green" aria-hidden><Check size={10} strokeWidth={2.4} /></span>
                  <Link href={`/workspace/${id}/record/${c.exposure_id}`} className="dy-work-t"><b className="dy-code">{c.patient_ref ?? c.code}</b><small>Completed {relDay(c.completed_at).toLowerCase()}{c.told ? " · told" : ""}</small></Link>
                  <div className="dy-work-acts">
                    {c.phone ? <a className="oh-btn small" href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone size={14} aria-hidden />Call</a> : <Chip plain>No consent to call</Chip>}
                    {c.phone && !c.told ? <LogCall onLog={(o) => void logCall({ p_course: c.course_id }, o)} /> : c.told ? <Chip tone="green">Told</Chip> : null}
                  </div>
                </li>
              ))}
            </ul>
          )) : null}

          {lane === "notices" ? (notices.loading && !notices.data ? <Loading rows={2} /> : notices.error ? <Failed error={notices.error} retry={notices.reload} /> : !notices.data?.length ? <Empty title="No notices" /> : (
            <ul className="dy-work">
              {notices.data.map((n, i) => (
                <li key={n.id} style={{ ["--j" as string]: i }}>
                  <span className="dy-sq" data-c={n.status === "new" ? "amber" : "slate"} aria-hidden><Megaphone size={10} strokeWidth={2.4} /></span>
                  <div className="dy-work-t"><b>{SPECIES[n.animal_species]} · {n.area ?? "Area not given"}</b><small>{fmtDate(n.happened_on)} · {n.animal_description ?? "No description"}{n.place ? ` · ${n.place}` : ""}</small></div>
                  <div className="dy-work-acts">
                    {n.callback_phone ? <a className="oh-btn small" href={`tel:${n.callback_phone.replace(/\s/g, "")}`}><Phone size={14} aria-hidden />Call</a> : <Chip plain>No callback</Chip>}
                    {n.status === "new" ? <button type="button" className="oh-btn small" onClick={() => void contacted(n)}>Contacted</button> : <Chip tone="blue">{n.status === "presented" ? "Came in" : "Contacted"}</Chip>}
                    {n.status !== "presented" ? <Link className="oh-btn small" href={`/workspace/${id}/new?notice=${n.id}&area=${encodeURIComponent(n.area ?? "")}&species=${n.animal_species}&on=${n.happened_on}&animal=${encodeURIComponent(n.animal_description ?? "")}&place=${encodeURIComponent(n.place ?? "")}`}>Patient came in</Link> : null}
                  </div>
                </li>
              ))}
            </ul>
          )) : null}

          {lane === "waiting" ? (waiting.loading && !waiting.data ? <Loading rows={2} /> : waiting.error ? <Failed error={waiting.error} retry={waiting.reload} /> : !waiting.data?.length ? <Empty title="Nothing waiting" /> : (
            <ul className="dy-work">
              {waiting.data.slice(0, 12).map((r, i) => (
                <li key={r.id} style={{ ["--j" as string]: i }}>
                  <span className="dy-sq" data-c="violet" aria-hidden><Stethoscope size={10} strokeWidth={2.4} /></span>
                  <Link className="dy-work-t" href={`/workspace/${id}/record/${r.id}`}><b className="dy-code">{r.patient_ref ?? r.code}</b><small>{fmtDate(r.presented_on)} · {SPECIES[r.species]} {EXPOSURE_KIND[r.kind]?.toLowerCase() ?? r.kind} · {r.area ?? "Area not recorded"}</small></Link>
                  <div className="dy-work-acts">{r.category === "not_recorded" ? <Chip tone="amber">Category not recorded</Chip> : <Chip tone="amber">No course yet</Chip>}</div>
                </li>
              ))}
            </ul>
          )) : null}

          {/* Referred here: the bite code, its category and what is needed, never who the person is. Sent elsewhere: whether they arrived. */}
          {lane === "referrals" ? (xfer.error && !xferReady ? <Failed error={xfer.error} retry={xfer.reload} /> : (
            <>
              {xIn.length ? <h3 className="dy-sub">Referred here</h3> : null}
              {xIn.length ? (
                <ul className="dy-work">
                  {xIn.map((r, i) => (
                    <li key={r.id} style={{ ["--j" as string]: i }}>
                      <span className="dy-sq" data-c={r.status === "sent" ? "blue" : r.status === "arrived" ? "green" : "slate"} aria-hidden><ArrowLeftRight size={10} strokeWidth={2.4} /></span>
                      <div className="dy-work-t"><b>{SERVICE_LABEL[r.service] ?? r.service} · <span className="dy-code">{r.code}</span></b><small>From {r.from_short ?? r.from} · {r.category === "not_recorded" ? "category not recorded" : `category ${r.category}`} · {SPECIES[r.animal_species]?.toLowerCase() ?? r.animal_species} {fmtDate(r.exposure_on)} · referred {relDay(r.sent_at).toLowerCase()}{r.note ? ` · ${r.note}` : ""}</small></div>
                      <div className="dy-work-acts">
                        {r.status === "sent" ? <>
                          <button type="button" className="oh-btn small" onClick={() => void markTransfer(r, "not_arrived")}>Did not arrive</button>
                          <button type="button" className="oh-btn small primary" onClick={() => void markTransfer(r, "arrived")}>Arrived</button>
                        </> : <Chip tone={TRANSFER[r.status]?.tone}>{TRANSFER[r.status]?.label ?? r.status}</Chip>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {xOut.length ? <h3 className="dy-sub">Sent elsewhere</h3> : null}
              {xOut.length ? (
                <ul className="dy-work">
                  {xOut.map((r, i) => (
                    <li key={r.id} style={{ ["--j" as string]: i }}>
                      <span className="dy-sq" data-c={r.status === "not_arrived" ? "flame" : r.status === "arrived" ? "green" : "slate"} aria-hidden><ArrowLeftRight size={10} strokeWidth={2.4} /></span>
                      {r.exposure_id ? <Link className="dy-work-t" href={`/workspace/${id}/record/${r.exposure_id}`}><b>{SERVICE_LABEL[r.service] ?? r.service} · <span className="dy-code">{r.code}</span></b><small>To {r.to_short ?? r.to} · referred {relDay(r.sent_at).toLowerCase()}{r.closed_at ? ` · marked ${relDay(r.closed_at).toLowerCase()}` : ""}</small></Link> : null}
                      <div className="dy-work-acts"><Chip tone={TRANSFER[r.status]?.tone}>{r.status === "sent" ? "Not marked yet" : TRANSFER[r.status]?.label ?? r.status}</Chip></div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )) : null}
        </section>
      </div>
      {dose ? <DoseSheet dose={dose} onClose={() => setDose(null)} onDone={(msg) => { setDose(null); toast(msg); refresh(); }} /> : null}
    </Page>
  );
}

function LogCall({ onLog }: { onLog: (outcome: string) => void }) {
  return (
    <select className="oh-btn small" aria-label="Log the call" defaultValue="" onChange={(e) => { if (e.target.value) onLog(e.target.value); e.target.value = ""; }}>
      <option value="" disabled>Log call</option>
      {Object.entries(REMINDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

export function DoseSheet({ dose, onClose, onDone }: { dose: { dose_id: string; dose_no: number; due_on: string; label?: string }; onClose: () => void; onDone: (msg: string) => void }) {
  const [status, setStatus] = useState<"given" | "missed">("given");
  const [on, setOn] = useState(today()), [batch, setBatch] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call<{ remaining: number; completed: boolean }>("oh_record_dose", { p_dose: dose.dose_id, p_status: status, p_given_on: status === "given" ? on : null, p_batch: batch || null });
    setBusy(false);
    if (r.error) setErr(r.error); else onDone(status === "given" ? (r.data?.completed ? `Dose ${dose.dose_no} recorded. The course is complete.` : `Dose ${dose.dose_no} recorded.`) : `Dose ${dose.dose_no} recorded as missed.`);
  };
  return (
    <Sheet title={`Record dose ${dose.dose_no}`} note={`Due ${fmtDate(dose.due_on, { day: "numeric", month: "long" })}${dose.label ? ` · ${dose.label}` : ""}`} onClose={onClose}
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button></>}>
      <Seg name="dose-status" label="Dose outcome" value={status} onChange={setStatus} options={[["given", "Given"], ["missed", "Missed"]]} />
      {status === "given" ? (
        <div className="oh-fields">
          <label className="oh-field"><span>Date given</span><input type="date" value={on} max={today()} onChange={(e) => setOn(e.target.value)} /></label>
          <label className="oh-field"><span>Vaccine batch</span><input value={batch} maxLength={40} onChange={(e) => setBatch(e.target.value)} placeholder="As printed on the vial" /></label>
        </div>
      ) : <p className="oh-note">A missed dose stays on the record. The clinician decides whether to add a new date or close the course.</p>}
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

const FILTERS: [string, string][] = [["all", "All"], ["needs_assessment", "Waiting for a clinician"], ["active", "In course"], ["closed", "Closed"]];

export function Register({ place }: { place: Place }) {
  const sp = useSearchParams();
  const [filter, setFilter] = useState(sp.get("filter") ?? "all");
  const id = place.organisation_id;
  const rows = useRead<RegisterRow[]>(() => call("oh_clinic_register", { p_facility: id, p_filter: filter, p_limit: 200 }), `reg:${id}:${filter}`);
  return (
    <Page illustrative={place.illustrative} wide>
      <Head eyebrow={place.short_name ?? place.name} title="Bite register" lede="Every presentation at this facility. Opening a record is logged." />
      <div style={{ marginBottom: 16 }}><Seg name="filter" label="Show" value={filter} onChange={setFilter} options={FILTERS} /></div>
      {rows.loading && !rows.data ? <Loading rows={6} /> : rows.error ? <Failed error={rows.error} retry={rows.reload} /> : !rows.data?.length ? <Empty title="No presentations here yet" /> : (
        <div className="oh-table-wrap">
          <table className="oh-table">
            <thead><tr><th>Patient</th><th>Exposure</th><th>Area</th><th>Category</th><th>Course</th><th className="r">Doses</th><th>Next due</th></tr></thead>
            <tbody>
              {rows.data.map((r) => (
                <tr key={r.id} className="link" onClick={() => { window.location.href = `/workspace/${id}/record/${r.id}`; }}>
                  <td className="strong"><Link href={`/workspace/${id}/record/${r.id}`}>{r.patient_ref ?? r.code}</Link><div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 400 }}>{AGE[r.age_band]} · {SEX[r.sex]}</div></td>
                  <td>{EXPOSURE_KIND[r.kind] ?? r.kind} · {SPECIES[r.species]}<div style={{ color: "var(--muted)", fontSize: 12 }}>{fmtDate(r.exposure_on)}</div></td>
                  <td>{r.area ?? "Not recorded"}</td>
                  <td>{r.category === "not_recorded" ? <Chip tone="amber">Not recorded</Chip> : <Chip plain>Category {r.category}</Chip>}</td>
                  <td>{r.course_status ? <Chip tone={COURSE[r.course_status]?.tone}>{COURSE[r.course_status]?.label ?? r.course_status}</Chip> : <span style={{ color: "var(--muted)" }}>None</span>}</td>
                  <td className="r">{r.doses_total ? `${r.doses_given} / ${r.doses_total}` : "–"}</td>
                  <td>{r.next_due ? (daysFrom(r.next_due) < 0 ? <Chip tone="flame">{relDay(r.next_due)}</Chip> : relDay(r.next_due)) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

export function NewExposure({ place }: { place: Place }) { return <Suspense><NewExposureBody place={place} /></Suspense>; }

function NewExposureBody({ place }: { place: Place }) {
  const { reload } = usePlaces();
  const sp = useSearchParams(), router = useRouter(), toast = useToast();
  const areas = useRead<Area[]>(() => call("oh_org_areas", { p_org: place.organisation_id }), `areas:${place.organisation_id}`);
  const clinician = place.capabilities.includes("assess");
  const fromNotice = sp.get("notice");
  /* Arrived on a referral from another facility: its animal follow-up was requested there, so it is off here by default. */
  const fromReferral = sp.get("referral");
  const [f, setF] = useState({
    exposure_on: sp.get("on") ?? today(), kind: "bite", area: "", areaName: sp.get("area") ?? "", age: "not_recorded", sex: "not_recorded", ref: "",
    phone: "", consent: false, species: sp.get("species") ?? "dog", ownership: "unknown", animal: sp.get("animal") ?? "", place: sp.get("place") ?? "",
    followup: !fromReferral, category: "not_recorded", washed: "not_recorded",
  });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  if (!isFacility(place.kind)) return <Page><Empty title="Bites are recorded by hospitals and health centres" /></Page>;
  if (!place.capabilities.includes("record_exposure")) return <Page><Empty title="Your role here cannot record bites">A clinician, nurse or records officer at this facility can.</Empty></Page>;
  const areaId = f.area || areas.data?.find((a) => a.name === f.areaName)?.id || "";

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const r = await call<{ id: string; code: string; handoff_id: string | null }>("oh_record_exposure", {
      p_facility: place.organisation_id, p_exposure_on: f.exposure_on, p_kind: f.kind, p_area: areaId || null, p_age_band: f.age, p_sex: f.sex,
      p_patient_ref: f.ref || null, p_species: f.species, p_ownership: f.ownership, p_animal_description: f.animal || null, p_animal_place: f.place || null,
      p_category: clinician ? f.category : "not_recorded", p_source: fromNotice ? "citizen_notice" : fromReferral ? "referral" : "walk_in", p_notice: fromNotice || null,
      p_contact_phone: f.consent ? f.phone || null : null, p_reminder_consent: f.consent && !!f.phone, p_request_followup: f.followup && f.ownership !== "owned", p_wound_washed: f.washed,
    });
    setBusy(false);
    if (r.error || !r.data) { setErr(r.error ?? "Could not save."); return; }
    toast(r.data.handoff_id ? `Saved as ${r.data.code}. The area's animal team has been asked to follow up.` : `Saved as ${r.data.code}.`);
    reload();
    router.push(`/workspace/${place.organisation_id}/record/${r.data.id}`);
  };

  return (
    <Page illustrative={place.illustrative}>
      <Head eyebrow={place.short_name ?? place.name} title="Record a bite" lede="About a minute. The patient is identified by your own register number; no name is stored." />
      {fromNotice ? <p className="oh-note blue" style={{ marginBottom: 20 }}>Started from a notice the public left. Its details are filled in; check them with the patient.</p> : null}
      {fromReferral ? <p className="oh-note blue" style={{ marginBottom: 20 }}>Referred from {sp.get("from") ?? "another facility"}{sp.get("code") ? `, where the bite is ${sp.get("code")}` : ""}. The date and animal are filled in; check them with the patient. The animal follow-up was requested there, so it is off here.</p> : null}
      <form className="oh-form" onSubmit={submit}>
        <fieldset className="oh-fieldset">
          <legend>What happened</legend>
          <div className="oh-field full"><span>Type of exposure</span><Seg name="kind" label="Type of exposure" value={f.kind} onChange={(v) => set("kind", v)} options={Object.entries(EXPOSURE_KIND) as [string, string][]} /></div>
          <div className="oh-fields">
            <label className="oh-field"><span>Date it happened</span><input type="date" required value={f.exposure_on} max={today()} onChange={(e) => set("exposure_on", e.target.value)} /></label>
            <label className="oh-field"><span>Area</span>
              <select value={areaId} onChange={(e) => set("area", e.target.value)} disabled={!areas.data}>
                <option value="">Not known</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <small>Where it happened, not where the patient lives.</small>
            </label>
          </div>
          <div className="oh-field full"><span>Wound washing</span><Seg name="washed" label="Wound washing" value={f.washed} onChange={(v) => set("washed", v)} options={Object.entries(WASHED) as [string, string][]} /></div>
        </fieldset>

        <fieldset className="oh-fieldset">
          <legend>Patient</legend>
          <div className="oh-fields">
            <label className="oh-field"><span>Your register number</span><input value={f.ref} maxLength={40} onChange={(e) => set("ref", e.target.value)} placeholder="e.g. OPD number" autoComplete="off" /></label>
            <label className="oh-field"><span>Age</span><select value={f.age} onChange={(e) => set("age", e.target.value)}>{Object.entries(AGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <div className="oh-field full"><span>Sex</span><Seg name="sex" label="Sex" value={f.sex} onChange={(v) => set("sex", v)} options={Object.entries(SEX) as [string, string][]} /></div>
            <label className="oh-check" style={{ gridColumn: "1 / -1" }}><input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /><span>The patient agrees to be called about their doses.</span></label>
            {f.consent ? <label className="oh-field"><span>Phone for reminders</span><input type="tel" inputMode="tel" value={f.phone} pattern="[0-9+ ]{8,16}" onChange={(e) => set("phone", e.target.value)} /><small>Seen only by staff at this facility.</small></label> : null}
          </div>
        </fieldset>

        <fieldset className="oh-fieldset">
          <legend>The animal</legend>
          <div className="oh-field full"><span>Animal</span><Seg name="species" label="Animal" value={f.species} onChange={(v) => set("species", v)} options={Object.entries(SPECIES) as [string, string][]} /></div>
          <div className="oh-field full"><span>Whose animal</span><Seg name="own" label="Whose animal" value={f.ownership} onChange={(v) => set("ownership", v)} options={[["community", "Street or community"], ["owned", "Someone's pet"], ["unknown", "Not known"]]} /></div>
          <div className="oh-fields">
            <label className="oh-field"><span>What it looked like</span><input value={f.animal} maxLength={300} onChange={(e) => set("animal", e.target.value)} placeholder="Colour, size, collar, marks" /></label>
            <label className="oh-field"><span>Where it can be found</span><input value={f.place} maxLength={200} onChange={(e) => set("place", e.target.value)} placeholder="Landmark or street" /></label>
          </div>
          {f.ownership !== "owned" ? (
            <label className="oh-check"><input type="checkbox" checked={f.followup} onChange={(e) => set("followup", e.target.checked)} /><span>Ask the area&apos;s animal team to find and observe the animal. They receive the description and place only, never patient details.</span></label>
          ) : null}
        </fieldset>

        <fieldset className="oh-fieldset">
          <legend>Clinical assessment</legend>
          {clinician ? (
            <>
              <p>The category you assessed. StrayPaw records it; it does not assess.</p>
              <Seg name="category" label="Exposure category" value={f.category} onChange={(v) => set("category", v)} options={[["I", "Category I"], ["II", "Category II"], ["III", "Category III"], ["not_recorded", "Assess later"]]} />
            </>
          ) : <p className="oh-note">A clinician records the exposure category and any course. This presentation will wait for them on Today.</p>}
        </fieldset>

        {err ? <Failed error={err} /> : null}
        <div className="oh-submit"><button type="submit" className="oh-btn primary" disabled={busy}>{busy ? "Saving…" : "Save presentation"}</button><button type="button" className="oh-btn" onClick={() => router.back()}>Cancel</button></div>
      </form>
    </Page>
  );
}
