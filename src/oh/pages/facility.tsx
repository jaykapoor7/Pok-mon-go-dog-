"use client";

/* A hospital or health centre: its day, its bite register and the desk form.
   Patients are identified by the facility's own register number; no name
   is stored. Clinicians record the category and prescribe; the software
   never assesses, schedules or suggests a treatment. */
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ArrowLeftRight, Check, Megaphone, Phone, Stethoscope, Syringe } from "lucide-react";
import { Btn, Lanes, More, Note, Panel, SearchBox, Table, Tag, Tools, type Col, type Lane } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { usePlaces, primaryProgramme, isFacility } from "../places";
import { call, daysFrom, fmtDate, relDay, today, useRead, AGE, COURSE, EXPOSURE_KIND, REMINDER, SERVICE_LABEL, SEX, SPECIES, TRANSFER, WASHED, type Alert, type Area, type ClinicDue, type ClinicTransfers, type DueDose, type Notice, type Place, type RegisterRow, type TransferIn } from "../data";
import { Chip, Empty, Failed, Head, Loading, Page, Row, Rows, Section, Seg, Sheet, toneOf, useToast } from "../ui";

/** The place this page belongs to, or a clear message why it cannot open. */
export function usePlaceParam(): { place: Place | null; ready: boolean } {
  const { id } = useParams<{ id: string }>();
  const { places, ready } = usePlaces();
  return { place: places.find((p) => p.organisation_id === id) ?? null, ready };
}

export function NotHere({ ready }: { ready: boolean }) {
  if (!ready) return <Page><Loading rows={4} /></Page>;
  return <Page><Empty title="You are not a member of this place">Ask your programme coordinator to add you, or go back to <Link className="oh-link" href="/today">Today</Link>.</Empty></Page>;
}

type DayLane = "due" | "done" | "notices" | "waiting" | "referrals";
const tel = (p: string) => `tel:${p.replace(/\s/g, "")}`;
const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export function ClinicToday({ place }: { place: Place }) {
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

  const nNotices = notices.data?.filter((n) => n.status === "new").length ?? 0;
  const nWaiting = waiting.data?.length ?? 0;
  const xIn = xfer.data?.incoming ?? [], xOut = xfer.data?.outgoing ?? [];
  const nIn = xIn.filter((r) => r.status === "sent").length;
  const [lane, setLane] = usePageState<DayLane>("lane", "due");
  /* What the lists below do not already show: a confirmed case, vaccine readiness, a lapsed confirmation. */
  const notes = mine.filter((a) => a.kind !== "doses_overdue" && a.kind !== "courses_completed").slice(0, 3);
  const lanes: Lane<DayLane>[] = [
    { id: "due", label: "Doses due", count: list.length, tone: overdue ? "flame" : undefined },
    { id: "done", label: "Completed", count: due.data?.completed?.length ?? 0 },
    { id: "notices", label: "From the public", count: nNotices, tone: nNotices ? "amber" : undefined },
    ...(canAssess ? [{ id: "waiting" as const, label: "Waiting for a clinician", count: nWaiting }] : []),
    ...(xferReady && (xIn.length || xOut.length) ? [{ id: "referrals" as const, label: "Referrals", count: nIn, tone: nIn ? "blue" as const : undefined }] : []),
  ];
  const at: DayLane = lanes.some((l) => l.id === lane) ? lane : "due";
  const todayN = due.data ? list.filter((d) => d.due_on === t).length : 0;
  /* The sentence: what is due today and what is late. The other lists carry their own counts on their lanes. */
  const sum = due.error ? "The doses due could not be read." : !due.data ? "Reading the day's doses…"
    : !list.length ? "No doses are due. Everyone in a course is up to date."
    : <><b>{todayN}</b> {todayN === 1 ? "dose is" : "doses are"} due today{overdue ? <>, <span className="is-hot">{overdue} overdue</span></> : null}{list.length - todayN - (overdue ?? 0) > 0 ? <>, {list.length - todayN - (overdue ?? 0)} coming up</> : null}.</>;

  return (
    <Page illustrative={place.illustrative}>
      <Head title="Home" lede={sum} />
      {due.error ? <Failed error={due.error} retry={due.reload} /> : null}
      {notes.map((a) => (
        <Note key={a.key} tone={a.severity === "urgent" ? "flame" : "amber"}
          action={<Btn small href={a.kind === "pep_readiness" ? `/workspace/${id}/services` : a.kind === "positive_result" ? `/workspace/${id}/register` : "#oh-work"}>{a.kind === "positive_result" ? "Open the register" : "Open"}</Btn>}>
          <b>{a.title}{a.n > 1 ? ` (${a.n})` : ""}</b>{a.kind === "positive_result" ? ` · ${a.area ?? "In the programme"} · check bites recorded from this locality` : a.area ? ` · ${a.area}` : ""}
        </Note>
      ))}
      {/* No Kaju box here: Kaju never reads patient records, doses or courses, so it cannot answer questions about them. */}

      <Tools><Lanes label="The day's lists" lanes={lanes} value={at} onChange={setLane} /></Tools>
      <Panel id="oh-work" aria-label="The day's lists">
        {at === "due" ? (due.loading && !due.data ? <Loading /> : !list.length ? <Empty title="No doses due">Everyone in a course is up to date.</Empty> : (
          <More items={list} cap={10} noun="doses">{(shown) => (
            <Rows label="Doses due">
              {shown.map((d) => {
                const late = d.due_on < t;
                return (
                  <Row key={d.dose_id} href={`/workspace/${id}/record/${d.exposure_id}`} icon={<Syringe size={14} />} tone={late ? "flame" : d.due_on === t ? "blue" : "plain"}
                    title={<span className="oh-code">{d.patient_ref ?? d.code}</span>}
                    meta={<>Dose {d.dose_no} of {d.doses_total} · {AGE[d.age_band] ?? d.age_band} · {late ? <span className="oh-hot">{days(-daysFrom(d.due_on))} overdue</span> : relDay(d.due_on)}{d.last_reminder ? ` · ${REMINDER[d.last_reminder.outcome]} ${relDay(d.last_reminder.at).toLowerCase()}` : ""}</>}
                    end={<>
                      {d.phone ? <a className="oh-icon-btn" href={tel(d.phone)} aria-label={`Call about ${d.patient_ref ?? d.code}`} data-tip="Call"><Phone size={14} aria-hidden /></a> : <Tag>No consent to call</Tag>}
                      {d.phone ? <LogCall onLog={(o) => void logCall({ p_dose: d.dose_id }, o)} /> : null}
                      {canDose ? <Btn small onClick={() => setDose(d)}>Record dose</Btn> : null}
                    </>} />
                );
              })}
            </Rows>
          )}</More>
        )) : null}

        {at === "done" ? (!due.data?.completed?.length ? <Empty title="No course completed recently" /> : (
          <Rows label="Courses completed">
            {due.data.completed.map((c) => (
              <Row key={c.course_id} href={`/workspace/${id}/record/${c.exposure_id}`} icon={<Check size={14} />} tone="green"
                title={<span className="oh-code">{c.patient_ref ?? c.code}</span>} meta={`Completed ${relDay(c.completed_at).toLowerCase()}`}
                end={<>
                  {c.phone ? <a className="oh-icon-btn" href={tel(c.phone)} aria-label={`Call about ${c.patient_ref ?? c.code}`} data-tip="Call"><Phone size={14} aria-hidden /></a> : <Tag>No consent to call</Tag>}
                  {c.phone && !c.told ? <LogCall onLog={(o) => void logCall({ p_course: c.course_id }, o)} /> : c.told ? <Tag tone="green">Told</Tag> : null}
                </>} />
            ))}
          </Rows>
        )) : null}

        {at === "notices" ? (notices.loading && !notices.data ? <Loading rows={2} /> : notices.error ? <Failed error={notices.error} retry={notices.reload} /> : !notices.data?.length ? <Empty title="No notices" /> : (
          <Rows label="Notices from the public">
            {notices.data.map((n) => (
              <Row key={n.id} icon={<Megaphone size={14} />} tone={n.status === "new" ? "amber" : "plain"}
                title={`${SPECIES[n.animal_species]} · ${n.area ?? "Area not given"}`} meta={`${fmtDate(n.happened_on)} · ${n.animal_description ?? "No description"}${n.place ? ` · ${n.place}` : ""}`}
                end={<>
                  {n.callback_phone ? <a className="oh-icon-btn" href={tel(n.callback_phone)} aria-label="Call back" data-tip="Call"><Phone size={14} aria-hidden /></a> : <Tag>No callback</Tag>}
                  {n.status === "new" ? <Btn small variant="quiet" onClick={() => void contacted(n)}>Contacted</Btn> : <Tag tone="blue">{n.status === "presented" ? "Came in" : "Contacted"}</Tag>}
                  {n.status !== "presented" ? <Btn small href={`/workspace/${id}/new?notice=${n.id}&area=${encodeURIComponent(n.area ?? "")}&species=${n.animal_species}&on=${n.happened_on}&animal=${encodeURIComponent(n.animal_description ?? "")}&place=${encodeURIComponent(n.place ?? "")}`}>Patient came in</Btn> : null}
                </>} />
            ))}
          </Rows>
        )) : null}

        {at === "waiting" ? (waiting.loading && !waiting.data ? <Loading rows={2} /> : waiting.error ? <Failed error={waiting.error} retry={waiting.reload} /> : !waiting.data?.length ? <Empty title="Nothing waiting" /> : (
          <Rows label="Waiting for a clinician">
            {waiting.data.slice(0, 12).map((r) => (
              <Row key={r.id} href={`/workspace/${id}/record/${r.id}`} icon={<Stethoscope size={14} />} tone="violet"
                title={<span className="oh-code">{r.patient_ref ?? r.code}</span>} meta={`${fmtDate(r.presented_on)} · ${SPECIES[r.species]} ${EXPOSURE_KIND[r.kind]?.toLowerCase() ?? r.kind} · ${r.area ?? "Area not recorded"}`}
                end={<Tag tone="amber">{r.category === "not_recorded" ? "Category not recorded" : "No course yet"}</Tag>} />
            ))}
          </Rows>
        )) : null}

        {/* Referred here: the bite code, its category and what is needed, never who the person is. Sent elsewhere: whether they arrived. */}
        {at === "referrals" ? (xfer.error && !xferReady ? <Failed error={xfer.error} retry={xfer.reload} /> : (
          <>
            {xIn.length ? <h3 className="oh-sub">Referred here</h3> : null}
            {xIn.length ? (
              <Rows label="Referred here">
                {xIn.map((r) => (
                  <Row key={r.id} icon={<ArrowLeftRight size={14} />} tone={r.status === "sent" ? "blue" : r.status === "arrived" ? "green" : "plain"}
                    title={<>{SERVICE_LABEL[r.service] ?? r.service} · <span className="oh-code">{r.code}</span></>}
                    meta={`From ${r.from_short ?? r.from} · ${r.category === "not_recorded" ? "category not recorded" : `category ${r.category}`} · ${SPECIES[r.animal_species] ?? r.animal_species}, ${fmtDate(r.exposure_on)} · referred ${relDay(r.sent_at).toLowerCase()}${r.note ? ` · ${r.note}` : ""}`}
                    end={r.status === "sent" ? <>
                      <Btn small variant="quiet" onClick={() => void markTransfer(r, "not_arrived")}>Did not arrive</Btn>
                      <Btn small onClick={() => void markTransfer(r, "arrived")}>Arrived</Btn>
                    </> : <Chip tone={TRANSFER[r.status]?.tone}>{TRANSFER[r.status]?.label ?? r.status}</Chip>} />
                ))}
              </Rows>
            ) : null}
            {xOut.length ? <h3 className="oh-sub">Sent elsewhere</h3> : null}
            {xOut.length ? (
              <Rows label="Sent elsewhere">
                {xOut.map((r) => (
                  <Row key={r.id} href={r.exposure_id ? `/workspace/${id}/record/${r.exposure_id}` : null} icon={<ArrowLeftRight size={14} />} tone={r.status === "not_arrived" ? "flame" : r.status === "arrived" ? "green" : "plain"}
                    title={<>{SERVICE_LABEL[r.service] ?? r.service} · <span className="oh-code">{r.code}</span></>}
                    meta={`To ${r.to_short ?? r.to} · referred ${relDay(r.sent_at).toLowerCase()}${r.closed_at ? ` · marked ${relDay(r.closed_at).toLowerCase()}` : ""}`}
                    end={<Chip tone={TRANSFER[r.status]?.tone}>{r.status === "sent" ? "Not marked yet" : TRANSFER[r.status]?.label ?? r.status}</Chip>} />
                ))}
              </Rows>
            ) : null}
          </>
        )) : null}
      </Panel>
      {at === "due" ? <p className="oh-foot">Reminders are phone calls from the clinic, logged here. Automatic SMS or WhatsApp is <b>not connected</b>.</p> : null}
      {dose ? <DoseSheet dose={dose} onClose={() => setDose(null)} onDone={(msg) => { setDose(null); toast(msg); refresh(); }} /> : null}
    </Page>
  );
}

export function LogCall({ onLog }: { onLog: (outcome: string) => void }) {
  return (
    <select className="oh-select" aria-label="Log the call" defaultValue="" onChange={(e) => { if (e.target.value) onLog(e.target.value); e.target.value = ""; }}>
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
      foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</Btn></>}>
      <Seg name="dose-status" label="Dose outcome" value={status} onChange={setStatus} options={[["given", "Given"], ["missed", "Missed"]]} />
      {status === "given" ? (
        <div className="oh-fields">
          <label className="oh-field"><span>Date given</span><input type="date" value={on} max={today()} onChange={(e) => setOn(e.target.value)} /></label>
          <label className="oh-field"><span>Vaccine batch</span><input value={batch} maxLength={40} onChange={(e) => setBatch(e.target.value)} placeholder="As printed on the vial" /></label>
        </div>
      ) : <Note>A missed dose stays on the record. The clinician decides whether to add a new date or close the course.</Note>}
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

const FILTERS: Lane<string>[] = [{ id: "all", label: "All" }, { id: "needs_assessment", label: "Waiting for a clinician" }, { id: "active", label: "In course" }, { id: "closed", label: "Closed" }];

export function Register({ place }: { place: Place }) {
  const sp = useSearchParams();
  const [filter, setFilter] = usePageState<string>("lane", sp.get("filter") ?? "all");
  const [q, setQ] = usePageState<string>("q", "");
  const id = place.organisation_id;
  const rows = useRead<RegisterRow[]>(() => call("oh_clinic_register", { p_facility: id, p_filter: filter, p_limit: 200 }), `reg:${id}:${filter}`);
  const needle = q.trim().toLowerCase();
  const all = rows.data ?? [];
  const list = needle ? all.filter((r) => [r.patient_ref, r.code, r.area, SPECIES[r.species], EXPOSURE_KIND[r.kind]].some((v) => v?.toLowerCase().includes(needle))) : all;
  const late = all.filter((r) => r.next_due && daysFrom(r.next_due) < 0).length;
  const cols: Col<RegisterRow>[] = [
    { key: "code", label: "Bite", width: "minmax(0, 1.4fr)", render: (r) => <span className="oh-code">{r.patient_ref ?? r.code}</span> },
    { key: "date", label: "Date", width: "72px", render: (r) => fmtDate(r.exposure_on) },
    { key: "cat", label: "Category", width: "112px", keep: true, render: (r) => r.category === "not_recorded" ? <Tag tone="amber">Not recorded</Tag> : <Tag tone={r.category === "III" ? "flame" : "plain"}>Category {r.category}</Tag> },
    { key: "animal", label: "Animal", width: "minmax(0, 1fr)", render: (r) => `${SPECIES[r.species]} · ${(EXPOSURE_KIND[r.kind] ?? r.kind).toLowerCase()}` },
    { key: "area", label: "Area", width: "minmax(0, 1fr)", render: (r) => r.area ?? <span className="oh-quiet">Not recorded</span> },
    { key: "person", label: "Age, sex", width: "minmax(0, 1fr)", render: (r) => `${AGE[r.age_band]} · ${SEX[r.sex]}` },
    { key: "course", label: "Course", width: "152px", render: (r) => r.course_status ? <><Tag tone={toneOf(COURSE[r.course_status]?.tone)}>{COURSE[r.course_status]?.label ?? r.course_status}</Tag>{r.doses_total ? <span className="oh-quiet num"> {r.doses_given}/{r.doses_total}</span> : null}</> : <span className="oh-quiet">None</span> },
    { key: "next", label: "Next dose", width: "104px", align: "end", render: (r) => r.next_due ? (daysFrom(r.next_due) < 0 ? <span className="oh-hot">{relDay(r.next_due)}</span> : relDay(r.next_due)) : "–" },
  ];
  return (
    <Page illustrative={place.illustrative} wide>
      <Head title="Bite register" lede={rows.error ? "The register could not be read." : !rows.data ? "Reading the register…" : <><b>{all.length}</b> {all.length === 1 ? "presentation" : "presentations"} shown{late ? <>, <span className="is-hot">{late} with a dose overdue</span></> : null}. Opening a record is logged.</>} />
      <Tools end={<SearchBox value={q} onChange={setQ} placeholder="Register number, area" label="Search the register" />}><Lanes label="Show" lanes={FILTERS} value={filter} onChange={setFilter} /></Tools>
      {rows.loading && !rows.data ? <Loading rows={8} /> : rows.error ? <Failed error={rows.error} retry={rows.reload} /> : !list.length ? <Empty title={needle ? "Nothing matches that search" : "No presentations here yet"} /> : (
        <Panel><More items={list} cap={20} noun="presentations">{(shown) => <Table label="Bite register" cols={cols} rows={shown} rowKey={(r) => r.id} href={(r) => `/workspace/${id}/record/${r.id}`} />}</More></Panel>
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
    <Page illustrative={place.illustrative} narrow>
      <Head title="Record a bite" lede="About a minute. The patient is identified by your own register number; no name is stored." />
      {fromNotice ? <Note tone="blue">Started from a notice the public left. Its details are filled in; check them with the patient.</Note> : null}
      {fromReferral ? <Note tone="blue">Referred from {sp.get("from") ?? "another facility"}{sp.get("code") ? `, where the bite is ${sp.get("code")}` : ""}. The date and animal are filled in; check them with the patient. The animal follow-up was requested there, so it is off here.</Note> : null}
      <form className="oh-form" onSubmit={submit}>
        <Section title="What happened">
          <div className="oh-fields">
            <div className="oh-field"><span>Type of exposure</span><Seg name="kind" label="Type of exposure" value={f.kind} onChange={(v) => set("kind", v)} options={Object.entries(EXPOSURE_KIND) as [string, string][]} /></div>
            <label className="oh-field"><span>Date it happened</span><input type="date" required value={f.exposure_on} max={today()} onChange={(e) => set("exposure_on", e.target.value)} /></label>
            <label className="oh-field"><span>Area</span>
              <select value={areaId} onChange={(e) => set("area", e.target.value)} disabled={!areas.data}>
                <option value="">Not known</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <small>Where it happened, not where the patient lives.</small>
            </label>
            <div className="oh-field"><span>Wound washing</span><Seg name="washed" label="Wound washing" value={f.washed} onChange={(v) => set("washed", v)} options={Object.entries(WASHED) as [string, string][]} /></div>
          </div>
        </Section>

        <Section title="Patient">
          <div className="oh-fields">
            <label className="oh-field"><span>Your register number</span><input value={f.ref} maxLength={40} onChange={(e) => set("ref", e.target.value)} placeholder="e.g. OPD number" autoComplete="off" /></label>
            <label className="oh-check"><input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /><span>The patient agrees to be called about their doses.</span></label>
            {f.consent ? <label className="oh-field"><span>Phone for reminders</span><input type="tel" inputMode="tel" value={f.phone} pattern="[0-9+ ]{8,16}" onChange={(e) => set("phone", e.target.value)} /><small>Seen only by staff at this facility.</small></label> : null}
          </div>
        </Section>
        <Section title="Age and sex" fold="age-sex" open={false} note="Optional">
          <div className="oh-fields">
            <label className="oh-field"><span>Age</span><select value={f.age} onChange={(e) => set("age", e.target.value)}>{Object.entries(AGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <div className="oh-field"><span>Sex</span><Seg name="sex" label="Sex" value={f.sex} onChange={(v) => set("sex", v)} options={Object.entries(SEX) as [string, string][]} /></div>
          </div>
        </Section>

        <Section title="The animal">
          <div className="oh-fields">
            <div className="oh-field"><span>Animal</span><Seg name="species" label="Animal" value={f.species} onChange={(v) => set("species", v)} options={Object.entries(SPECIES) as [string, string][]} /></div>
            <div className="oh-field"><span>Whose animal</span><Seg name="own" label="Whose animal" value={f.ownership} onChange={(v) => set("ownership", v)} options={[["community", "Street or community"], ["owned", "Someone's pet"], ["unknown", "Not known"]]} /></div>
            <label className="oh-field"><span>What it looked like</span><input value={f.animal} maxLength={300} onChange={(e) => set("animal", e.target.value)} placeholder="Colour, size, collar, marks" /></label>
            <label className="oh-field"><span>Where it can be found</span><input value={f.place} maxLength={200} onChange={(e) => set("place", e.target.value)} placeholder="Landmark or street" /></label>
            {f.ownership !== "owned" ? (
              <label className="oh-check"><input type="checkbox" checked={f.followup} onChange={(e) => set("followup", e.target.checked)} /><span>Ask the area&apos;s animal team to find and observe the animal. They receive the description and place only, never patient details.</span></label>
            ) : null}
          </div>
        </Section>

        <Section title="Clinical assessment">
          {clinician ? (
            <div className="oh-field"><span>Exposure category <small>The category you assessed. StrayPaw records it; it does not assess.</small></span>
              <Seg name="category" label="Exposure category" value={f.category} onChange={(v) => set("category", v)} options={[["I", "Category I"], ["II", "Category II"], ["III", "Category III"], ["not_recorded", "Assess later"]]} />
            </div>
          ) : <Note>A clinician records the exposure category and any course. This presentation will wait for them on Home.</Note>}
        </Section>

        {err ? <Failed error={err} /> : null}
        <div className="oh-submit"><Btn variant="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save presentation"}</Btn><Btn onClick={() => router.back()}>Cancel</Btn></div>
      </form>
    </Page>
  );
}
