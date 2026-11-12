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
import { ArrowUpRight, ChevronDown, Eye, HeartPulse, Lock, MapPin, Plus, Scissors, Sparkles, Syringe, UserRound } from "lucide-react";
import { useAi } from "@/sp3/ai/AiPanel";
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
import "./pipeline.css";
import "./record.css";
import { DeleteRecord } from "../ui/DeleteRecord";

/** SPA-DOG-ACC70743182B… reads as SPA-DOG-ACC707: enough to tell animals apart on screen. */
const shortId = (id: string | null | undefined) => (id ? id.replace(/^([A-Z]+-[A-Z]+)-([0-9A-F]{6})[0-9A-F]{6,}$/i, (_m, p: string, h: string) => `${p}-${h.toUpperCase()}`) : null);

type OrgCase = { id: string; case_code: string | null; condition_class: string | null; status_class: string | null; occurred_at: string | null; assignee_name: string | null; provenance: string | null };
type Fu = { id: string; due_at: string; status: string; kind: string | null; note: string | null; case_id: string | null };

export function Casefile({ id, identifiers = false }: { id: string; identifiers?: boolean }) {
  const mem = useMembership();
  const ai = useAi();
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
  /* The case this animal is in the line with, if any: the newest one still open in this organisation. */
  const live = cases.find((c) => ["open", "in_progress"].includes(c.status_class ?? "") && c.provenance !== "imported_historical_record") ?? null;

  const ster = dog && typeof dog === "object" ? dog.sterilisation_status : null;
  const vacc = dog && typeof dog === "object" ? dog.vaccination_status : null;
  const openFus = fus.filter((f) => f.status === "upcoming");

  return (
    <NgoGate title="Casefile" lede="Your organisation's private record of one animal.">
      {dog === null ? <div className="kr" aria-busy="true"><i className="kr-skel is-head" /><div className="kr-grid"><i className="kr-skel" /><i className="kr-skel" /></div></div>
        : dog === "missing" ? <div className="ngo-page"><State kind="forbidden" title="Not in your register" action={<Link className="btn" href={`/animal/${id}`}>Open the public record</Link>}>This animal belongs to another organisation.</State></div>
        : dog === "error" ? <div className="ngo-page"><State kind="error" title="Didn't load" action={<button type="button" className="btn" onClick={() => void load()}>Try again</button>}>The casefile could not be read. Nothing was changed.</State></div>
        : (
          <article className="kr ka">
            <header className="ka-head">
              <div className="ka-photo"><Portrait src={dog.cover_photo || null} tag={shortId(dog.straypaw_id) ?? dog.id.slice(0, 6)} sensitive={!!dog.needs_help} size="l" /></div>
              <div className="ka-who">
                <p className="ka-k"><Lock size={12} aria-hidden />Private to {mem.org?.name ?? "your organisation"}{live?.case_code ? <button type="button" className="kr-ask" onClick={() => ai.prefill(`Follow up on ${shortCode(live.case_code)} tomorrow: `)} disabled={ai.busy}><Sparkles size={13} aria-hidden />Follow-up with Kaju</button> : null}</p>
                <h1 className="kr-title">{animalTitle({ name: dog.name,city:dog.city,zone:dog.zone, straypaw_id: dog.straypaw_id ?? null, id: dog.id })}</h1>
                <div className="kr-id">
                  <span className="kr-code" title={dog.straypaw_id ?? undefined}>{shortId(dog.straypaw_id) ?? "StrayPaw ID pending"}</span>
                  {dog.code ? <span className="kr-chip" data-tone="plain">Your code {dog.code}</span> : null}
                  {dog.provenance === "imported_historical_record" ? <span className="kr-chip" data-tone="plain">Imported</span> : null}
                </div>
                <ul className="ka-state" aria-label="What is recorded about this animal">
                  <li data-tone={ster === "sterilised" ? "green" : ster === "not_sterilised" ? "amber" : "plain"}><Scissors size={16} aria-hidden /><span><small>Sterilisation</small><b>{ster === "sterilised" ? "Sterilised" : ster === "not_sterilised" ? "Not sterilised" : "Not recorded"}</b></span></li>
                  <li data-tone={vacc === "vaccinated" ? "green" : vacc === "not_vaccinated" ? "amber" : "plain"}><Syringe size={16} aria-hidden /><span><small>Vaccination</small><b>{vacc === "vaccinated" ? "Vaccinated" : vacc === "not_vaccinated" ? "Not vaccinated" : "Not recorded"}</b></span></li>
                  <li data-tone={dog.needs_help ? "flame" : "plain"}><HeartPulse size={16} aria-hidden /><span><small>Needs help</small><b>{dog.needs_help ? "Flagged" : "Not flagged"}</b></span></li>
                </ul>
                <ul className="kr-meta">
                  <li><MapPin size={15} aria-hidden /><span>{[dog.zone, dog.city].filter(Boolean).join(", ") || "Place not recorded"}<small>{dog.lat && dog.lng ? "exact point held privately" : "locality only"}</small></span></li>
                  {dog.owner_name ? <li><UserRound size={15} aria-hidden /><span>Carer {dog.owner_name}<small>contact private</small></span></li> : null}
                </ul>
                {dog.intake_notes ? <p className="ka-note">{dog.intake_notes}</p> : null}
              </div>
            </header>

            {/* An animal already in the line says so, and its one action is to open that case, not to start a second one. */}
            <section className={`ka-line${live ? " is-live" : ""}`} aria-label="This animal in the line of work">
              {live ? (
                <>
                  <span className="ka-pulse" aria-hidden />
                  <p><b>In the line now:</b> {live.condition_class && live.condition_class !== "Not recorded" ? live.condition_class : "an open case"}, {STATUS_META[(live.status_class ?? "unknown") as StatusClass]?.label?.toLowerCase() ?? "open"}{live.assignee_name ? `, held by ${live.assignee_name}` : ""}.</p>
                  <div className="ka-acts">
                    <Link className="btn is-ink is-s" href={`/ngo/cases/${live.id}`}>Open its case <ArrowUpRight size={14} aria-hidden /></Link>
                    <Link className="btn is-s" href={`/ngo/cases/new?dog=${dog.id}`}>Open another case</Link>
                  </div>
                </>
              ) : (
                <>
                  <p><b>Not in the line.</b> No open case on this animal in your organisation.</p>
                  <div className="ka-acts"><Link className="btn is-ink is-s" href={`/ngo/cases/new?dog=${dog.id}`}>Open a case for this animal</Link></div>
                </>
              )}
              <div className="ka-acts is-quiet">
                <button type="button" className="btn is-s" disabled={busy} onClick={async () => { setBusy(true); setReceipt(null); const r = await setNeedsHelp(dog.id, !dog.needs_help); setReceipt(r); setBusy(false); if (r.ok) void load(); }}>{dog.needs_help ? "Clear the needs-help flag" : "Flag as needing help"}</button>
                <Link className="btn is-ghost is-s" href={`/animal/${dog.id}`}><Eye size={14} aria-hidden /> Public record</Link>
              </div>
              <div className="ka-said" aria-live="polite">{receipt && (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not saved: {receipt.error}</Ack>)}</div>
            </section>

            <div className="kr-grid">
              <div className="kr-main">
                <section className="kr-story" aria-labelledby="ka-cases-h">
                  <div className="kr-sec-head"><h2 id="ka-cases-h">Cases</h2><b className="kr-n">{cases.length}</b></div>
                  {sourceErrors.cases ? <p className="kr-alert" role="alert">{sourceErrors.cases}</p> : cases.length ? (
                    <ul className="kr-rel is-wide">{cases.map((c) => <li key={c.id}><Link href={`/ngo/cases/${c.id}`}><i data-tone={TONE_OF[c.status_class ?? "unknown"] ?? "plain"} aria-hidden /><span><b>{c.condition_class ?? "Request"}</b><small><span className="mono">{shortCode(c.case_code)}</span> · {STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.label ?? "Status not recorded"} · {day(c.occurred_at)}{c.assignee_name ? ` · ${c.assignee_name}` : ""}{c.provenance === "imported_historical_record" ? " · imported" : ""}</small></span><ArrowUpRight size={14} aria-hidden /></Link></li>)}</ul>
                  ) : <p className="kr-quiet">No case on this animal in your organisation.</p>}
                </section>

                <section className="kr-story" aria-labelledby="ka-fus-h">
                  <div className="kr-sec-head"><h2 id="ka-fus-h">Follow-ups</h2><b className="kr-n">{openFus.length ? `${openFus.length} due` : fus.length}</b></div>
                  {sourceErrors.followups ? <p className="kr-alert" role="alert">{sourceErrors.followups}</p> : fus.length ? (
                    <ol className="kr-line">{fus.map((f, i) => { const late = f.status === "upcoming" && Date.parse(f.due_at) < Date.now(); return (
                      <li key={f.id} data-k={f.status === "done" ? "care" : late ? "late" : f.status === "upcoming" ? "ahead" : "update"} style={{ ["--j" as string]: i }}>
                        <i className="kr-dot" aria-hidden />
                        <div className="kr-ev"><p className="kr-ev-t">{(f.kind ?? "Recheck").replace(/_/g, " ")}{f.note ? <span className="kr-ev-sub"> · {f.note}</span> : null}</p><p className="kr-ev-m"><span className="kr-ev-k">{f.status === "upcoming" ? (late ? "Late" : "Due") : f.status}</span><time>{day(f.due_at)}</time></p></div>
                        <DeleteRecord kind="followup" id={f.id} what="this follow-up" onDone={() => void load()} />
                      </li>); })}</ol>
                  ) : <p className="kr-quiet">No follow-ups on this animal.</p>}
                </section>

                <div className="kr-ops"><OperationsPanel dogId={id} readOnly /></div>

                {(sourceErrors.timeline || timeline === null || timeline.length > 0) && <details className="kr-fold">
                  <summary><span>Earlier source timeline{timeline ? <b className="kr-n">{timeline.length}</b> : null}</span><ChevronDown size={15} aria-hidden /></summary>
                  {sourceErrors.timeline ? <p className="kr-alert" role="alert">{sourceErrors.timeline}</p> : timeline === null ? <p className="kr-quiet" role="status">Reading source history…</p> : timeline.length ? <ol className="kr-line">{timeline.slice(0, 40).map((t, i) => <li key={t.id} data-k={t.medicalEventId ? "care" : "update"} style={{ ["--j" as string]: i }}><i className="kr-dot" aria-hidden /><div className="kr-ev"><p className="kr-ev-t">{t.title}{t.details ? <span className="kr-ev-sub"> · {clinicalNarrative(t.details)}</span> : null}</p><p className="kr-ev-m"><span className="kr-ev-k">{t.provenance.replace(/_/g, " ")}</span><time>{day(t.occurred_at)}</time></p></div><DeleteRecord kind="timeline" id={t.id} what="this history entry" onDone={() => void load()} /></li>)}</ol> : <p className="kr-quiet">No earlier timeline entries. Structured operations are shown separately.</p>}
                </details>}
              </div>

              <aside className="kr-side" aria-label="Care on this animal">
                <section className="kr-card">
                  <h2 className="kr-card-k">Care on record<b className="kr-n">{care?.length ?? "–"}</b></h2>
                  {sourceErrors.care ? <p className="kr-alert" role="alert">{sourceErrors.care} <button className="btn is-s" onClick={() => void load()}>Read clinical records again</button></p> : care === null ? <p className="kr-quiet" role="status">Reading clinical records…</p> : care.length ? (
                    <ol className="kr-line is-tight">{care.slice(0, 12).map((m, i) => <li key={m.id} data-k="care" style={{ ["--j" as string]: i }}><i className="kr-dot" aria-hidden /><div className="kr-ev"><p className="kr-ev-t">{MEDICAL_KINDS.find((k) => k.id === m.kind)?.label ?? m.kind}</p><p className="kr-ev-m"><time>{day(m.event_date)}</time>{m.performed_by ? <span>{m.performed_by}</span> : null}</p>{m.notes && <><p className="kr-ev-note">{clinicalNarrative(m.notes)}</p>{clinicalNarrative(m.notes) !== m.notes && <details className="kr-src"><summary>Read the complete source note</summary><p>{m.notes}</p></details>}</>}</div><DeleteRecord kind="care" id={m.id} what="this care record" onDone={() => void load()} /></li>)}</ol>
                  ) : <p className="kr-quiet">No care events recorded.</p>}
                  <details className="kr-add"><summary><Plus size={15} aria-hidden />Record care</summary><CareForm dogId={dog.id} onDone={load} /></details>
                </section>
                {identifiers && <Identifiers dogId={dog.id} />}
              </aside>
            </div>
          </article>
        )}
    </NgoGate>
  );
}

const TONE_OF: Record<string, string> = { open: "blue", in_progress: "amber", closed: "green", other_ngo: "plain", no_action: "plain", not_attended: "flame", unknown: "plain" };

function CareForm({ dogId, onDone }: { dogId: string; onDone: () => Promise<void> }) {
  const [kind, setKind] = useState("vaccination");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [by, setBy] = useState("");
  const [state, setState] = useState<"idle" | "pending">("idle");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  return (
    <form className="kr-form" onSubmit={async (e) => { e.preventDefault(); setState("pending"); setReceipt(null); const r = await recordCare(dogId, { kind, date, notes: notes.trim(), by: by.trim() }); setReceipt(r); setState("idle"); if (r.ok) { setNotes(""); await onDone(); } }}>
      <div className="field"><label htmlFor="ck">What</label><select id="ck" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>{MEDICAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></div>
      <div className="field"><label htmlFor="cd">When</label><input id="cd" type="date" className="input" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="field"><label htmlFor="cb">Done by <span className="small">optional</span></label><input id="cb" className="input" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Clinic or person" /></div>
      <div className="field"><label htmlFor="cn">Notes <span className="small">optional</span></label><textarea id="cn" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <button type="submit" className="btn is-ink is-s" disabled={state === "pending"}>{state === "pending" ? "Sending…" : "Add to the history"}</button>{(notes || by) && <CancelButton label="Clear" disabled={state === "pending"} onCancel={() => { setNotes(""); setBy(""); }} />}
      <div aria-live="polite">{state === "pending" ? <Ack state="pending">Sending to the record…</Ack> : receipt ? (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not saved: {receipt.error}</Ack>) : null}</div>
    </form>
  );
}
