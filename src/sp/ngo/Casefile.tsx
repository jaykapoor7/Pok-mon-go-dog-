"use client";

/* ════════════════════════════════════════════════════════════════════
   One animal, the professional depth (decision 019).

   The same canonical animal as /animal/[id], read under the member's own
   session: the organisation's own register row (private notes, owner
   contact, exact place where recorded), every case it holds on this
   animal, care events with who recorded them, follow-ups that survive
   closures, and the operational timeline. Clinical records are labelled
   by what they are: recorded by an organisation, not clinician-signed
   unless a verified sign-off exists (no such sign-off backend yet).
   ════════════════════════════════════════════════════════════════════ */

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

type OrgCase = { id: string; case_code: string | null; condition_class: string | null; status_class: string | null; occurred_at: string | null; assignee_name: string | null; provenance: string | null };
type Fu = { id: string; due_at: string; status: string; kind: string | null; note: string | null; case_id: string | null };

export function Casefile({ id }: { id: string }) {
  const mem = useMembership();
  const [dog, setDog] = useState<Dog | null | "missing" | "error">(null);
  const [cases, setCases] = useState<OrgCase[]>([]);
  const [care, setCare] = useState<MedicalEvent[]>([]);
  const [fus, setFus] = useState<Fu[]>([]);
  const [timeline, setTimeline] = useState<AnimalTimelineEvent[]>([]);
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
      if (!d.data) { setDog("missing"); return; }
      setDog(mapDog(d.data)); setCases((c.data ?? []) as OrgCase[]); setFus((f.data ?? []) as Fu[]);
      const [m, t] = await Promise.all([getMedicalEvents(id), getAnimalTimeline(id)]);
      setCare(m); setTimeline(t);
    } catch { setDog("error"); }
  }, [id]);
  useEffect(() => { if (mem.member) void load(); }, [mem.member, load]);

  return (
    <NgoGate title="Casefile" lede="Your organisation's private record of one animal.">
      {dog === null ? <div className="ngo-page"><div className="skel" style={{ height: 320, margin: 28 }} /></div>
        : dog === "missing" ? <div className="ngo-page"><State kind="forbidden" title="Not in your register" action={<Link className="btn" href={`/animal/${id}`}>Open the public record</Link>}>This animal is not held by your organisation. Its public record is open to everyone; cross-organisation access to private detail needs a granted request.</State></div>
        : dog === "error" ? <div className="ngo-page"><State kind="error" title="Not read" action={<button type="button" className="btn" onClick={() => void load()}>Try again</button>}>The casefile could not be read. Nothing was changed.</State></div>
        : (
          <div className="cf">
            <header className="cf-head">
              <Portrait src={dog.cover_photo || null} tag={dog.straypaw_id ?? dog.id.slice(0, 6)} sensitive={!!dog.needs_help} size="l" />
              <div className="stack" style={{ ["--g" as string]: "12px" }}>
                <p className="k">Casefile · private to {mem.org?.name ?? "your organisation"}</p>
                <h1 className="display">{animalTitle({ name: dog.name, straypaw_id: dog.straypaw_id ?? null, id: dog.id })}</h1>
                <p className="mono small">{dog.straypaw_id ?? "StrayPaw ID pending"}{dog.code ? ` · your code ${dog.code}` : ""}{dog.provenance === "imported_historical_record" ? " · imported" : ""}</p>
                <dl className="ledger">
                  <div><dt>Place</dt><dd>{[dog.zone, dog.city].filter(Boolean).join(", ") || "not recorded"} <small>· {dog.lat && dog.lng ? "exact point held privately" : "locality only"}</small></dd></div>
                  <div><dt>Sterilisation</dt><dd>{dog.sterilisation_status === "sterilised" ? "Recorded sterilised" : dog.sterilisation_status === "not_sterilised" ? "Recorded not sterilised" : "Not recorded"}</dd></div>
                  <div><dt>Vaccination</dt><dd>{dog.vaccination_status === "vaccinated" ? "Recorded vaccinated" : dog.vaccination_status === "not_vaccinated" ? "Recorded not vaccinated" : "Not recorded"}</dd></div>
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
                {cases.length ? <ul className="cf-cases">{cases.map((c) => <li key={c.id}><Link href={`/ngo/cases/${c.id}`}><span className="mono">{c.case_code ?? "Case"}</span><b>{c.condition_class ?? "Request"}</b><span className="pill">{STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.label ?? "Status not recorded"}</span><small>{day(c.occurred_at)}{c.assignee_name ? ` · ${c.assignee_name}` : ""}{c.provenance === "imported_historical_record" ? " · imported" : ""}</small><ArrowUpRight size={14} aria-hidden /></Link></li>)}</ul> : <p className="small">No case on this animal in your organisation.</p>}
                <h2 className="h2">Follow-ups</h2>
                {fus.length ? <ul className="fus">{fus.map((f) => <li key={f.id}><span><b>{(f.kind ?? "Recheck").replace(/_/g, " ")}</b><small>{f.note ?? ""}</small></span><span className={`pill ${f.status === "done" ? "is-care" : f.status === "missed" ? "is-caution" : Date.parse(f.due_at) < Date.now() && f.status === "upcoming" ? "is-urgent" : "is-info"}`}>{f.status} · {day(f.due_at)}</span></li>)}</ul> : <p className="small">No follow-ups on this animal.</p>}
                <h2 className="h2">Timeline</h2>
                {timeline.length ? <ol className="chrono">{timeline.slice(0, 40).map((t) => <li key={t.id} className={t.medicalEventId ? "is-care" : ""}><time className="mono">{day(t.occurred_at)}</time><span><b>{t.title}</b>{t.details ? <> · {t.details}</> : null}</span><small>{t.provenance.replace(/_/g, " ")}</small></li>)}</ol> : <p className="small">No operational events yet.</p>}
              </section>
              <aside className="cf-side">
                <CareForm dogId={dog.id} onDone={load} />
                <section className="cf-card">
                  <h3 className="h3">Care on record <span className="mono small">{care.length}</span></h3>
                  {care.length ? <ul className="cf-care">{care.slice(0, 12).map((m) => <li key={m.id}><b>{MEDICAL_KINDS.find((k) => k.id === m.kind)?.label ?? m.kind}</b><small>{day(m.event_date)}{m.performed_by ? ` · ${m.performed_by}` : ""}</small>{m.notes && <p>{m.notes}</p>}</li>)}</ul> : <p className="small">No care events recorded.</p>}
                  <p className="small">Each is recorded by an organisation. A named vet in a note is not an authenticated sign-off.</p>
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
      <h3 className="h3">Record care</h3>
      <div className="field"><label htmlFor="ck">What</label><select id="ck" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>{MEDICAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></div>
      <div className="field"><label htmlFor="cd">When</label><input id="cd" type="date" className="input" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="field"><label htmlFor="cb">Done by <span className="small">optional</span></label><input id="cb" className="input" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Clinic or person" /></div>
      <div className="field"><label htmlFor="cn">Notes <span className="small">optional</span></label><textarea id="cn" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <button type="submit" className="btn is-ink is-s" disabled={state === "pending"}>{state === "pending" ? "Sending…" : "Add to the history"}</button>
      <div aria-live="polite">{state === "pending" ? <Ack state="pending">Sending to the record…</Ack> : receipt ? (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not saved: {receipt.error}</Ack>) : null}</div>
    </form>
  );
}
