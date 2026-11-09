"use client";

/* ════════════════════════════════════════════════════════════════════
   One animal, the professional depth (decision 019).

   The same canonical animal as /animal/[id], read under the member's own
   session: the organisation's own register row (private notes, owner
   contact, exact place where recorded), every case it holds on this
   animal, care events with who recorded them, follow-ups that survive
   closures, and the operational timeline. Clinical records are labelled
   by what they are: recorded by an organisation, not clinician-signed
   unless a separately authenticated veterinary sign-off exists in the linked case.
   ════════════════════════════════════════════════════════════════════ */

import { CancelButton } from "@/sp/ui/CancelButton";
import { shortCode } from "@/lib/caseCode";
import {clinicalNarrative} from '@/lib/clinical-narrative';
import {OperationsPanel} from './OperationsPanel';
import { Identifiers } from "./Identifiers";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Eye } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { mapDog } from "@/lib/data";
import { getAnimalTimeline, getMedicalEvents, type AnimalTimelineEvent } from "@/lib/animal-actions";
import { animalTitle } from "@/lib/animal-name";
import { MEDICAL_KINDS, type Dog, type MedicalEvent } from "@/lib/types";
import { STATUS_META, type StatusClass } from "@/lib/register/taxonomy";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { Ack, State, day } from "../ui";
import { recordCare, setNeedsHelp, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./ngo.css";
import { DeleteRecord } from "../ui/DeleteRecord";

/** SPA-DOG-ACC70743182B… reads as SPA-DOG-ACC707: enough to tell animals apart on screen. */
const shortId = (id: string | null | undefined) => (id ? id.replace(/^([A-Z]+-[A-Z]+)-([0-9A-F]{6})[0-9A-F]{6,}$/i, (_m, p: string, h: string) => `${p}-${h.toUpperCase()}`) : null);

type OrgCase = { id: string; case_code: string | null; condition_class: string | null; status_class: string | null; occurred_at: string | null; assignee_name: string | null; provenance: string | null };
type Fu = { id: string; due_at: string; status: string; kind: string | null; note: string | null; case_id: string | null };

export function Casefile({ id, identifiers = false }: { id: string; identifiers?: boolean }) {
  const mem = useMembership();
  const [dog, setDog] = useState<Dog | null | "missing" | "error">(null);
  const [cases, setCases] = useState<OrgCase[]>([]);
  const [care, setCare] = useState<MedicalEvent[]|null>(null);
  const [fus, setFus] = useState<Fu[]>([]);
  const [timeline, setTimeline] = useState<AnimalTimelineEvent[]|null>(null);
  const [sourceErrors,setSourceErrors]=useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const load = useCallback(async () => {
    const supa = getSupabase(); if (!supa) { setDog("error"); return; }
    try {
      const { data: org } = await supa.rpc("my_ngo");
      const [d, c, f] = await Promise.all([
        supa.from("dogs").select("*").eq("id", id).eq("ngo_id", org).maybeSingle(),
        supa.from("org_case_facts").select("id,case_code,condition_class,status_class,occurred_at,assignee_name,provenance").eq("dog_id", id).order("occurred_at", { ascending: false }).limit(50),
        supa.from("animal_followups").select("id,due_at,status,kind,note,case_id").eq("dog_id", id).order("due_at", { ascending: false }).limit(50),
      ]);
      if (d.error) throw d.error;
      setSourceErrors({});if(c.error||f.error)setSourceErrors({cases:c.error?"Cases could not be read.":"",followups:f.error?"Follow-ups could not be read.":""});
      if (!d.data) { setDog("missing"); return; }
      setDog(mapDog(d.data)); setCases((c.data ?? []) as OrgCase[]); setFus((f.data ?? []) as Fu[]);
      const [m,t]=await Promise.allSettled([getMedicalEvents(id),getAnimalTimeline(id)]);
      if(m.status==="fulfilled")setCare(m.value);else setSourceErrors(v=>({...v,care:"Clinical records could not be read. Their count is unknown."}));
      if(t.status==="fulfilled")setTimeline(t.value);else setSourceErrors(v=>({...v,timeline:"The earlier source timeline could not be read."}));
    } catch { setDog("error"); }
  }, [id]);
  useEffect(() => { if (mem.member) void load(); }, [mem.member, load]);

  return (
    <NgoGate title="Casefile" lede="Your organisation's private record of one animal.">
      {dog === null ? <div className="ngo-page"><div className="skel" style={{ height: 320, margin: 28 }} /></div>
        : dog === "missing" ? <div className="ngo-page"><State kind="forbidden" title="Not in your register" action={<Link className="btn" href={`/animal/${id}`}>Open the public record</Link>}>This animal belongs to another organisation.</State></div>
        : dog === "error" ? <div className="ngo-page"><State kind="error" title="Didn't load" action={<button type="button" className="btn" onClick={() => void load()}>Try again</button>}>The casefile could not be read. Nothing was changed.</State></div>
        : (
          <div className="cf">
            <header className="cf-head">
              <Portrait src={dog.cover_photo || null} tag={shortId(dog.straypaw_id) ?? dog.id.slice(0, 6)} sensitive={!!dog.needs_help} size="l" />
              <div className="stack" style={{ ["--g" as string]: "12px" }}>
                <p className="k">Casefile · private to {mem.org?.name ?? "your organisation"}</p>
                <h1 className="display">{animalTitle({ name: dog.name,city:dog.city,zone:dog.zone, straypaw_id: dog.straypaw_id ?? null, id: dog.id })}</h1>
                <p className="mono small">{shortId(dog.straypaw_id) ?? "StrayPaw ID pending"}{dog.code ? ` · your code ${dog.code}` : ""}{dog.provenance === "imported_historical_record" ? " · imported" : ""}</p>
                <dl className="ledger">
                  <div><dt>Place</dt><dd>{[dog.zone, dog.city].filter(Boolean).join(", ") || "not recorded"} <small>· {dog.lat && dog.lng ? "exact point held privately" : "locality only"}</small></dd></div>
                  <div><dt>Sterilisation</dt><dd>{dog.sterilisation_status === "sterilised" ? "Sterilised" : dog.sterilisation_status === "not_sterilised" ? "Not sterilised" : "Not recorded"}</dd></div>
                  <div><dt>Vaccination</dt><dd>{dog.vaccination_status === "vaccinated" ? "Vaccinated" : dog.vaccination_status === "not_vaccinated" ? "Not vaccinated" : "Not recorded"}</dd></div>
                  {dog.owner_name && <div><dt>Carer</dt><dd>{dog.owner_name} <small>· contact private</small></dd></div>}
                  {dog.intake_notes && <div><dt>Intake note</dt><dd>{dog.intake_notes}</dd></div>}
                </dl>
                <div className="row">
                  <Link className="btn is-ink is-s" href={`/ngo/cases/new?dog=${dog.id}`}>Open a case for this animal</Link>
                  <button type="button" className="btn is-s" disabled={busy} onClick={async () => { setBusy(true); setReceipt(null); const r = await setNeedsHelp(dog.id, !dog.needs_help); setReceipt(r); setBusy(false); if (r.ok) void load(); }}>{dog.needs_help ? "Clear the needs-help flag" : "Flag as needing help"}</button>
                  <Link className="btn is-ghost is-s" href={`/animal/${dog.id}`}><Eye size={14} aria-hidden /> Public record</Link>
                </div>
                <div aria-live="polite">{receipt && (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not saved: {receipt.error}</Ack>)}</div>
              </div>
            </header>
            <div className="cf-body">
              <section className="cf-sec">
                <h2 className="h2">Cases</h2>
                {sourceErrors.cases?<p role="alert">{sourceErrors.cases}</p>:cases.length ? <ul className="cf-cases">{cases.map((c) => <li key={c.id}><Link href={`/ngo/cases/${c.id}`}><span className="mono">{shortCode(c.case_code)}</span><b>{c.condition_class ?? "Request"}</b><span className="pill">{STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.label ?? "Status not recorded"}</span><small>{day(c.occurred_at)}{c.assignee_name ? ` · ${c.assignee_name}` : ""}{c.provenance === "imported_historical_record" ? " · imported" : ""}</small><ArrowUpRight size={14} aria-hidden /></Link></li>)}</ul> : <p className="small">No case on this animal in your organisation.</p>}
                <h2 className="h2">Follow-ups</h2>
                {sourceErrors.followups?<p role="alert">{sourceErrors.followups}</p>:fus.length ? <ul className="fus">{fus.map((f) => <li key={f.id} className="dr-row"><span><b>{(f.kind ?? "Recheck").replace(/_/g, " ")}</b><small>{f.note ?? ""}</small></span><span className={`pill ${f.status === "done" ? "is-care" : f.status === "missed" ? "is-caution" : Date.parse(f.due_at) < Date.now() && f.status === "upcoming" ? "is-urgent" : "is-info"}`}>{f.status} · {day(f.due_at)}</span><DeleteRecord kind="followup" id={f.id} what="this follow-up" onDone={() => void load()} /></li>)}</ul> : <p className="small">No follow-ups on this animal.</p>}
                <OperationsPanel dogId={id} readOnly/>
                <details><summary>Earlier source timeline{timeline?` · ${timeline.length} ${timeline.length===1?"entry":"entries"}`:""}</summary>
                {sourceErrors.timeline?<p role="alert">{sourceErrors.timeline}</p>:timeline===null?<p role="status">Reading source history…</p>:timeline.length ? <ol className="chrono">{timeline.slice(0, 40).map((t) => <li key={t.id} className={`dr-row${t.medicalEventId ? " is-care" : ""}`}><time className="mono">{day(t.occurred_at)}</time><span><b>{t.title}</b>{t.details ? <> · {clinicalNarrative(t.details)}</> : null}</span><small>{t.provenance.replace(/_/g, " ")}</small><DeleteRecord kind="timeline" id={t.id} what="this history entry" onDone={() => void load()} /></li>)}</ol> : <p className="small">No earlier timeline entries. Structured operations are shown separately.</p>}</details>
              </section>
              <aside className="cf-side">
                <details className="cf-fold"><summary>Record care</summary><CareForm dogId={dog.id} onDone={load} /></details>
                {identifiers && <Identifiers dogId={dog.id} />}
                <section className="cf-card">
                  <h3 className="h3">Care on record <span className="mono small">{care?.length??"—"}</span></h3>
                  {sourceErrors.care?<p role="alert">{sourceErrors.care} <button className="btn" onClick={()=>void load()}>Read clinical records again</button></p>:care===null?<p role="status">Reading clinical records…</p>:care.length ? <ul className="cf-care">{care.slice(0, 12).map((m) => <li key={m.id} className="dr-row"><DeleteRecord kind="care" id={m.id} what="this care record" onDone={() => void load()} /><b>{MEDICAL_KINDS.find((k) => k.id === m.kind)?.label ?? m.kind}</b><small>{day(m.event_date)}{m.performed_by ? ` · ${m.performed_by}` : ""}</small>{m.notes && <><p style={{whiteSpace:"pre-line"}}>{clinicalNarrative(m.notes)}</p>{clinicalNarrative(m.notes)!==m.notes&&<details><summary>Read complete source note</summary><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{m.notes}</p></details>}</>}</li>)}</ul> : <p className="small">No care events recorded.</p>}
                </section>
              </aside>
            </div>
          </div>
        )}
    </NgoGate>
  );
}

function CareForm({ dogId, onDone }: { dogId: string; onDone: () => Promise<void> }) {
  const [kind, setKind] = useState("vaccination");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [by, setBy] = useState("");
  const [state, setState] = useState<"idle" | "pending">("idle");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  return (
    <form className="cf-card" onSubmit={async (e) => { e.preventDefault(); setState("pending"); setReceipt(null); const r = await recordCare(dogId, { kind, date, notes: notes.trim(), by: by.trim() }); setReceipt(r); setState("idle"); if (r.ok) { setNotes(""); await onDone(); } }}>
      <div className="field"><label htmlFor="ck">What</label><select id="ck" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>{MEDICAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></div>
      <div className="field"><label htmlFor="cd">When</label><input id="cd" type="date" className="input" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="field"><label htmlFor="cb">Done by <span className="small">optional</span></label><input id="cb" className="input" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Clinic or person" /></div>
      <div className="field"><label htmlFor="cn">Notes <span className="small">optional</span></label><textarea id="cn" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <button type="submit" className="btn is-ink is-s" disabled={state === "pending"}>{state === "pending" ? "Sending…" : "Add to the history"}</button>{(notes || by) && <CancelButton label="Clear" disabled={state === "pending"} onCancel={() => { setNotes(""); setBy(""); }} />}
      <div aria-live="polite">{state === "pending" ? <Ack state="pending">Sending to the record…</Ack> : receipt ? (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not saved: {receipt.error}</Ack>) : null}</div>
    </form>
  );
}
