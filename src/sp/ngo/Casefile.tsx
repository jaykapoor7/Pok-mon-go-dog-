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

import { shortCode } from "@/lib/caseCode";
import {clinicalNarrative} from '@/lib/clinical-narrative';
import {OperationsPanel} from './OperationsPanel';
import { Identifiers } from "./Identifiers";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Eye, Lock, Sparkles } from "lucide-react";
import { useAi } from "@/sp3/ai/AiPanel";
import { getSupabase } from "@/lib/supabase";
import { mapDog } from "@/lib/data";
import { getAnimalTimeline, getMedicalEvents, type AnimalTimelineEvent } from "@/lib/animal-actions";
import { animalTitle } from "@/lib/animal-name";
import { MEDICAL_KINDS, type Dog, type MedicalEvent } from "@/lib/types";
import { STATUS_META, type StatusClass } from "@/lib/register/taxonomy";
import { Btn, Empty, Head, More, Note, Page, Panel, Props, Row, Rows, Section, Split, Table, Tag, type Col } from "@/ws/kit";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { Ack, day } from "../ui";
import { recordCare, setNeedsHelp, type Receipt } from "../data/work";
import { SkelRows } from "../abc/Pager";
import { NgoGate } from "./Gate";
import { DeleteRecord } from "../ui/DeleteRecord";
import "./ngo.css";
import "./Casefile.k.css";

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

  const caseCols: Col<OrgCase>[] = [
    { key: "what", label: "Case", width: "minmax(0, 1.4fr)", render: (c) => c.condition_class ?? "Request" },
    { key: "code", label: "Code", width: "96px", render: (c) => <span className="kx-code">{shortCode(c.case_code)}</span> },
    { key: "state", label: "Status", width: "136px", keep: true, render: (c) => <Tag tone={TONE_OF[c.status_class ?? "unknown"] ?? "plain"}>{STATUS_META[(c.status_class ?? "unknown") as StatusClass]?.label ?? "Status not recorded"}</Tag> },
    { key: "when", label: "Date", width: "96px", render: (c) => <span className="kx-num">{day(c.occurred_at)}</span> },
    { key: "who", label: "Held by", render: (c) => <>{c.assignee_name ?? <span className="kx-none">No one</span>}{c.provenance === "imported_historical_record" ? " · imported" : ""}</> },
  ];

  return (
    <NgoGate title="Casefile" lede="Your organisation's private record of one animal.">
      {dog === null ? <Page><SkelRows n={6} label="Reading the animal's record" /></Page>
        : dog === "missing" ? <Page><Empty title="Not in your register" action={<Btn href={`/animal/${id}`}>Open the public record</Btn>}>This animal belongs to another organisation.</Empty></Page>
        : dog === "error" ? <Page><Empty title="Didn't load" action={<Btn onClick={() => void load()}>Try again</Btn>}>The casefile could not be read. Nothing was changed.</Empty></Page>
        : (
          <Page className="ka2">
            <div className="ka2-top">
              <div className="ka2-photo"><Portrait src={dog.cover_photo || null} tag={shortId(dog.straypaw_id) ?? dog.id.slice(0, 6)} sensitive={!!dog.needs_help} size="s" /></div>
              <div className="ka2-who">
                <Head title={animalTitle({ name: dog.name,city:dog.city,zone:dog.zone, straypaw_id: dog.straypaw_id ?? null, id: dog.id })}
                  eyebrow={<span className="ka2-k"><Lock size={12} aria-hidden />Private to {mem.org?.name ?? "your organisation"}</span>}
                  sum={<><span className="ka2-id" title={dog.straypaw_id ?? undefined}>{shortId(dog.straypaw_id) ?? "StrayPaw ID pending"}</span>{dog.code ? <> · Your code {dog.code}</> : null} · {[dog.zone, dog.city].filter(Boolean).join(", ") || "Place not recorded"} ({dog.lat && dog.lng ? "exact point held privately" : "locality only"})</>}
                  actions={<>
                    {live?.case_code ? <Btn variant="quiet" icon={<Sparkles size={14} />} onClick={() => ai.prefill(`Follow up on ${shortCode(live.case_code)} tomorrow: `)} disabled={ai.busy}>Follow-up with Kaju</Btn> : null}
                    <Btn disabled={busy} onClick={async () => { setBusy(true); setReceipt(null); const r = await setNeedsHelp(dog.id, !dog.needs_help); setReceipt(r); setBusy(false); if (r.ok) void load(); }}>{dog.needs_help ? "Clear the needs-help flag" : "Flag as needing help"}</Btn>
                  </>} />
                <ul className="ka2-facts" aria-label="What is recorded about this animal">
                  <li><Tag tone={ster === "sterilised" ? "green" : ster === "not_sterilised" ? "amber" : "plain"}>{ster === "sterilised" ? "Sterilised" : ster === "not_sterilised" ? "Not sterilised" : "Sterilisation not recorded"}</Tag></li>
                  <li><Tag tone={vacc === "vaccinated" ? "green" : vacc === "not_vaccinated" ? "amber" : "plain"}>{vacc === "vaccinated" ? "Vaccinated" : vacc === "not_vaccinated" ? "Not vaccinated" : "Vaccination not recorded"}</Tag></li>
                  <li><Tag tone={dog.needs_help ? "flame" : "plain"}>{dog.needs_help ? "Needs help" : "Not flagged as needing help"}</Tag></li>
                  {dog.provenance === "imported_historical_record" ? <li><Tag>Imported</Tag></li> : null}
                </ul>
              </div>
            </div>
            <div className="kx-live" aria-live="polite">{receipt && (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not saved: {receipt.error}</Ack>)}</div>

            {/* An animal already in the line says so, and its one action is to open that case, not to start a second one. */}
            <div className="ka2-line" role="group" aria-label="This animal in the line of work">
              {live ? (
                <Note tone="blue" action={<span className="kx-acts"><Btn small variant="quiet" href={`/ngo/cases/new?dog=${dog.id}`}>Open another case</Btn><Btn small variant="primary" href={`/ngo/cases/${live.id}`}>Open its case</Btn></span>}>
                  <b>In the line now:</b> {live.condition_class && live.condition_class !== "Not recorded" ? live.condition_class : "an open case"}, {STATUS_META[(live.status_class ?? "unknown") as StatusClass]?.label?.toLowerCase() ?? "open"}{live.assignee_name ? `, held by ${live.assignee_name}` : ""}.
                </Note>
              ) : (
                <Note action={<Btn small variant="primary" href={`/ngo/cases/new?dog=${dog.id}`}>Open a case for this animal</Btn>}><b>Not in the line.</b> No open case on this animal in your organisation.</Note>
              )}
            </div>
            {dog.intake_notes ? <p className="ka2-note">{dog.intake_notes}</p> : null}

            <Split side={<>
              {identifiers && <Identifiers dogId={dog.id} />}
              <Section title="Record care" fold="care-form" open={false}><CareForm dogId={dog.id} onDone={load} /></Section>
              <Section title="Also">
                <Panel><Rows><Row href={`/animal/${dog.id}`} icon={<Eye size={14} />} title="Public record" meta="What anyone can see of this animal" /></Rows></Panel>
                {dog.owner_name ? <Props items={[{ label: "Carer", value: <>{dog.owner_name} <span className="kx-none">(contact private)</span></> }]} /> : null}
              </Section>
            </>}>
              <Section title="Care on record" count={care ? care.length : null}>
                {sourceErrors.care ? <p className="kx-said" data-tone="err" role="alert">{sourceErrors.care} <Btn small onClick={() => void load()}>Read clinical records again</Btn></p>
                  : care === null ? <Panel><SkelRows n={3} label="Reading clinical records" /></Panel>
                  : care.length ? <Panel><More items={care} cap={6} noun="care records">{(shown) => <ul className="k-rows">{shown.map((m) => <CareRow key={m.id} m={m} onDone={load} />)}</ul>}</More></Panel>
                  : <p className="kx-quiet">No care events recorded.</p>}
              </Section>

              {/* Each fact once: a list that holds only the case already named above is left out. */}
              {(sourceErrors.cases || cases.length > (live ? 1 : 0)) && <Section title={live ? "Every case" : "Cases"} count={sourceErrors.cases ? null : cases.length}>
                {sourceErrors.cases ? <p className="kx-said" data-tone="err" role="alert">{sourceErrors.cases}</p>
                  : <Panel><More items={cases} cap={6} noun="cases">{(shown) => <Table cols={caseCols} rows={shown} rowKey={(c) => c.id} href={(c) => `/ngo/cases/${c.id}`} label="Cases on this animal" />}</More></Panel>}
              </Section>}

              {(sourceErrors.followups || fus.length > 0) && <Section title="Follow-ups" count={sourceErrors.followups ? null : openFus.length ? `${openFus.length} due` : fus.length}>
                {sourceErrors.followups ? <p className="kx-said" data-tone="err" role="alert">{sourceErrors.followups}</p>
                  : <Panel><More items={fus} cap={5} noun="follow-ups">{(shown) => <ul className="k-rows">{shown.map((f) => { const late = f.status === "upcoming" && Date.parse(f.due_at) < Date.now(); return (
                    <li key={f.id}><div className="k-row"><span className="k-row-t"><b className="ka2-cap">{(f.kind ?? "Recheck").replace(/_/g, " ")}</b>{f.note ? <small>{f.note}</small> : null}</span><span className="k-row-e"><Tag tone={f.status === "done" ? "green" : late ? "flame" : f.status === "upcoming" ? "amber" : "plain"}>{f.status === "upcoming" ? (late ? "Late" : "Due") : f.status}</Tag><time>{day(f.due_at)}</time><DeleteRecord kind="followup" id={f.id} what="this follow-up" onDone={() => void load()} /></span></div></li>); })}</ul>}</More></Panel>}
              </Section>}

              <OperationsPanel dogId={id} readOnly title="Reported on its cases" hideEmpty wrap="ka2-ops" />

              {(sourceErrors.timeline || timeline === null || timeline.length > 0) && <Section title="Earlier source timeline" count={timeline ? timeline.length : null} fold="timeline" open={false}>
                {sourceErrors.timeline ? <p className="kx-said" data-tone="err" role="alert">{sourceErrors.timeline}</p> : timeline === null ? <p className="kx-quiet" role="status">Reading source history…</p> : timeline.length ? <Panel><More items={timeline.slice(0, 40)} cap={8} noun="entries">{(shown) => <ul className="k-rows">{shown.map((t) => <li key={t.id}><div className="k-row"><span className="k-row-t"><b>{t.title}</b>{t.details ? <small title={clinicalNarrative(t.details)}>{clinicalNarrative(t.details)}</small> : null}</span><span className="k-row-e"><Tag tone={t.medicalEventId ? "green" : "plain"}>{t.provenance.replace(/_/g, " ")}</Tag><time>{day(t.occurred_at)}</time><DeleteRecord kind="timeline" id={t.id} what="this history entry" onDone={() => void load()} /></span></div></li>)}</ul>}</More></Panel> : <p className="kx-quiet">No earlier timeline entries. Structured operations are shown separately.</p>}
              </Section>}
            </Split>
          </Page>
        )}
    </NgoGate>
  );
}

/* One care event: what, when and by whom on one line. A note opens in place, with the complete source note behind it. */
function CareRow({ m, onDone }: { m: MedicalEvent; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const told = m.notes ? clinicalNarrative(m.notes) : "";
  const label = MEDICAL_KINDS.find((k) => k.id === m.kind)?.label ?? m.kind;
  const text = <span className="k-row-t"><b>{label}</b>{told ? <small>{told}</small> : null}</span>;
  return (
    <li>
      <div className="ka2-row">
        {m.notes ? <button type="button" className="k-row" aria-expanded={open} onClick={() => setOpen((v) => !v)}><ChevronRight size={14} aria-hidden className={`ka2-chev${open ? " is-on" : ""}`} />{text}</button> : <div className="k-row"><span className="ka2-chev" aria-hidden />{text}</div>}
        <span className="k-row-e ka2-row-e">{m.performed_by ? <span className="ka2-by">{m.performed_by}</span> : null}<time>{day(m.event_date)}</time><DeleteRecord kind="care" id={m.id} what="this care record" onDone={() => void onDone()} /></span>
      </div>
      {open && m.notes ? <div className="ka2-open"><p>{told}</p>{told !== m.notes && <details className="ka2-src"><summary>Read the complete source note</summary><p>{m.notes}</p></details>}</div> : null}
    </li>
  );
}

const TONE_OF: Record<string, "blue" | "amber" | "green" | "flame" | "plain"> = { open: "blue", in_progress: "amber", closed: "green", other_ngo: "plain", no_action: "plain", not_attended: "flame", unknown: "plain" };

function CareForm({ dogId, onDone }: { dogId: string; onDone: () => Promise<void> }) {
  const [kind, setKind] = useState("vaccination");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [by, setBy] = useState("");
  const [state, setState] = useState<"idle" | "pending">("idle");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  return (
    <form className="kx-form" onSubmit={async (e) => { e.preventDefault(); setState("pending"); setReceipt(null); const r = await recordCare(dogId, { kind, date, notes: notes.trim(), by: by.trim() }); setReceipt(r); setState("idle"); if (r.ok) { setNotes(""); await onDone(); } }}>
      <div className="kx-f"><label htmlFor="ck">What</label><select id="ck" className="kx-in" value={kind} onChange={(e) => setKind(e.target.value)}>{MEDICAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></div>
      <div className="kx-f"><label htmlFor="cd">When</label><input id="cd" type="date" className="kx-in" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="kx-f"><label htmlFor="cb">Done by (optional)</label><input id="cb" className="kx-in" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Clinic or person" /></div>
      <div className="kx-f"><label htmlFor="cn">Notes (optional)</label><textarea id="cn" className="kx-in" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="kx-acts"><Btn type="submit" disabled={state === "pending"}>{state === "pending" ? "Sending…" : "Add to the history"}</Btn>{(notes || by) && <Btn variant="quiet" disabled={state === "pending"} onClick={() => { setNotes(""); setBy(""); }}>Clear</Btn>}</div>
      <div aria-live="polite">{state === "pending" ? <Ack state="pending">Sending to the record…</Ack> : receipt ? (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not saved: {receipt.error}</Ack>) : null}</div>
    </form>
  );
}
