"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FlaskConical, Info, Lock } from "lucide-react";
import { KIND_LABEL, RESULT, SAMPLE, SAMPLE_TYPE, SPECIES, call, fmtDate, select, useNames, useRead, type Area, type Place, type Sample, type SampleEvent } from "@/oh/data";
import { Shell } from "../../Shell";
import { Chip, Sample as SampleChip } from "../../ui";
import { Confirm, Denied, Empty, Failed, Field, Modal, Props, RecordHead, Timeline, dayTime, useAct } from "../../kit";
import { useLive } from "../../live";
import type { Tone } from "../../fixtures";
import { indiaToday, placeOf, usePlaces } from "../../data/govhealth";
import { sampleSample } from "../../data/govhealth-samples";
import { About, ActBar, Block, GhMark, Opening, Seg, SignedConfirm, TryLink } from "../gh/parts";

/* Laboratory samples: sending one, and the sample's own record with its chain of custody. Each step is taken by
   named laboratory staff and recorded with their name; the database allows a step only from the status it follows
   (received from collected or dispatched; testing from received; a result from testing; rejected only from
   dispatched or received). Recording the result releases it to the sender, with the method. StrayPaw does not
   choose protocols or interpret results, and Kaju never does. */

const TONE: Record<string, Tone> = { collected: "plain", dispatched: "warn", received: "accent", testing: "accent", resulted: "ok", rejected: "bad" };
const ACTION: Record<string, string> = { collected: "Collected", dispatched: "Sent to the laboratory", received: "Received by the laboratory", testing: "Testing started", resulted: "Result recorded and released", rejected: "Rejected by the laboratory", note: "Note" };
export const sampleTone = (s: Pick<Sample, "status" | "result">): Tone => (s.result === "positive" ? "bad" : s.result === "inconclusive" ? "warn" : TONE[s.status] ?? "plain");

/** The next laboratory steps for one sample, as buttons, for the laboratory that received it. */
export function LabSteps({ s, sample, onDone, compact, bar }: { s: Pick<Sample, "id" | "code" | "status" | "species" | "sample_type">; sample?: boolean; onDone: () => void; compact?: boolean; /** On a phone: the next step at the thumb, Reject and Add a note under More. */ bar?: boolean }) {
  const [act, setAct] = useState<"resulted" | "rejected" | "note" | null>(null);
  const [ask, setAsk] = useState<"received" | "testing" | null>(null);
  const { busy, run } = useAct();
  const step = async (a: "received" | "testing") => { const r = await run(`step:${s.id}`, () => call("oh_sample_step", { p_sample: s.id, p_action: a }), { ok: a === "received" ? `${s.code} received. It is in the chain of custody in your name.` : `${s.code} is now testing.` }); setAsk(null); if (r.ok) onDone(); };
  const arriving = s.status === "collected" || s.status === "dispatched";
  const sm = compact ? "is-sm" : "";
  const dialogs = <>
    {ask ? <Confirm title={ask === "received" ? `Receive ${s.code}` : `Start testing ${s.code}`} busy={busy === `step:${s.id}`} confirm={ask === "received" ? "Mark received" : "Start testing"} onClose={() => setAsk(null)} onConfirm={() => void step(ask)}><p>{ask === "received" ? "Recorded now, in your name, as the laboratory taking custody of the sample." : "Recorded now, in your name. The result is entered when testing is complete."}</p></Confirm> : null}
    {act ? <StepModal s={s} step={act} onClose={() => setAct(null)} onDone={() => { setAct(null); onDone(); }} /> : null}
  </>;
  if (bar) {
    const rejectable = s.status === "dispatched" || s.status === "received";
    const primary = sample ? (arriving ? <TryLink>Receive</TryLink> : s.status === "received" ? <TryLink>Start testing</TryLink> : s.status === "testing" ? <TryLink>Record the result</TryLink> : null)
      : arriving ? <button type="button" className="nx-btn" disabled={!!busy} onClick={() => setAsk("received")}>Receive</button>
      : s.status === "received" ? <button type="button" className="nx-btn" disabled={!!busy} onClick={() => setAsk("testing")}>Start testing</button>
      : s.status === "testing" ? <button type="button" className="nx-btn" disabled={!!busy} onClick={() => setAct("resulted")}>Record the result</button> : null;
    const note = sample ? <TryLink quiet>Add a note</TryLink> : <button type="button" className="nx-btn is-quiet" disabled={!!busy} onClick={() => setAct("note")}>Add a note</button>;
    /* With no step left (released or rejected), Add a note is the one action and stands on its own. */
    return <>
      <ActBar label={s.code} more={primary ? <>{rejectable ? (sample ? <TryLink quiet>Reject the sample</TryLink> : <button type="button" className="nx-btn is-quiet" disabled={!!busy} onClick={() => setAct("rejected")}>Reject the sample</button>) : null}{note}</> : undefined}>{primary ?? note}</ActBar>
      {dialogs}
    </>;
  }
  if (sample) return <div className="gh-steps">{arriving ? <TryLink sm={compact}>Receive</TryLink> : s.status === "received" ? <TryLink sm={compact}>Start testing</TryLink> : s.status === "testing" ? <TryLink sm={compact}>Record the result</TryLink> : null}{s.status === "dispatched" || s.status === "received" ? <TryLink sm={compact} quiet>Reject</TryLink> : null}<TryLink sm={compact} quiet>Add a note</TryLink></div>;
  return (
    <>
      <div className="gh-steps">
        {arriving ? <button type="button" className={`nx-btn ${sm}`} disabled={!!busy} onClick={() => setAsk("received")}>Receive</button> : null}
        {s.status === "received" ? <button type="button" className={`nx-btn ${sm}`} disabled={!!busy} onClick={() => setAsk("testing")}>Start testing</button> : null}
        {s.status === "testing" ? <button type="button" className={`nx-btn ${sm}`} disabled={!!busy} onClick={() => setAct("resulted")}>Record the result</button> : null}
        {/* The database allows rejection from dispatched or received only, so it is not offered on a sample still marked collected. */}
        {s.status === "dispatched" || s.status === "received" ? <button type="button" className={`nx-btn is-quiet ${sm}`} disabled={!!busy} onClick={() => setAct("rejected")}>Reject</button> : null}
        <button type="button" className={`nx-btn is-quiet ${sm}`} disabled={!!busy} onClick={() => setAct("note")}>Add a note</button>
      </div>
      {dialogs}
    </>
  );
}

function StepModal({ s, step, onClose, onDone }: { s: Pick<Sample, "id" | "code" | "species" | "sample_type">; step: "resulted" | "rejected" | "note"; onClose: () => void; onDone: () => void }) {
  const live = useLive();
  const [result, setResult] = useState<"negative" | "positive" | "inconclusive">("negative"), [method, setMethod] = useState(""), [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const { busy, run } = useAct();
  const ok = step === "resulted" ? method.trim().length >= 2 : note.trim().length >= 3;
  const save = async () => {
    const r = await run("labstep", () => call("oh_sample_step", { p_sample: s.id, p_action: step, p_note: note.trim() || null, p_result: step === "resulted" ? result : null, p_method: step === "resulted" ? method.trim() : null }), { ok: step === "rejected" ? `${s.code} rejected. The sender has the reason.` : step === "note" ? "Note added to the chain of custody." : result === "positive" ? `${s.code}: positive. The sender and the programme coordinators have been told.` : `${s.code}: ${result}. The sender has the result.` });
    setAsking(false); if (r.ok) onDone();
  };
  const what = `${SPECIES[s.species] ?? s.species} ${(SAMPLE_TYPE[s.sample_type] ?? s.sample_type).toLowerCase()}`;
  return (
    <>
      <Modal title={step === "resulted" ? `Result for ${s.code}` : step === "rejected" ? `Reject ${s.code}` : `Note on ${s.code}`} onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className={`nx-btn ${step === "rejected" ? "is-danger" : ""}`} disabled={!ok || !!busy} onClick={() => (step === "note" ? void save() : setAsking(true))}>{step === "resulted" ? "Record the result" : step === "rejected" ? "Reject the sample" : "Add note"}</button></>}>
        <p className="nx-sub" style={{ marginTop: 0 }}>{what}</p>
        {step === "resulted" ? <>
          <div className="nx-field"><span>Result</span><Seg name="result" label="Result" value={result} onChange={setResult} options={[["negative", "Negative"], ["positive", "Positive"], ["inconclusive", "Inconclusive"]]} /></div>
          <Field label="Test method" hint="As validated in your laboratory."><input value={method} maxLength={120} onChange={(e) => setMethod(e.target.value)} autoFocus /></Field>
          <Field label="Note for the sender (optional)"><textarea value={note} maxLength={600} onChange={(e) => setNote(e.target.value)} /></Field>
          {result === "positive" ? <p className="nx-note"><Info size={13} /><span>A positive result alerts programme coordination at once, with the area and place, and goes back to the sender.</span></p> : null}
        </> : <Field label={step === "rejected" ? "Why it cannot be tested" : "Note"}><textarea value={note} maxLength={step === "rejected" ? 400 : 600} onChange={(e) => setNote(e.target.value)} autoFocus placeholder={step === "rejected" ? "For example: sample decomposed, cold chain broken" : "For example: container seal intact on arrival"} /></Field>}
      </Modal>
      {asking ? <SignedConfirm title={step === "resulted" ? `Release the result for ${s.code}` : `Reject ${s.code}`} who={live.userName} busy={busy === "labstep"} danger={step === "rejected"} confirm={step === "resulted" ? "Record and release" : "Reject"} onClose={() => setAsking(false)} onConfirm={() => void save()} tick={step === "resulted" ? "I tested this sample and this is the validated result." : "This sample cannot be tested, for the reason given."}>
        <p>{step === "resulted" ? `${result.replace(/^./, (c) => c.toUpperCase())}, by ${method.trim()}. Recording it releases it to the sender now${result === "positive" ? " and alerts the programme coordinators" : ""}. It cannot be changed afterwards.` : `The sender is told it could not be tested: “${note.trim()}”.`}</p>
      </SignedConfirm> : null}
    </>
  );
}

/* ── The sample's record ─────────────────────────────────────────── */
export function SampleRecord({ id }: { id: string }) {
  const live = useLive();
  const pl = usePlaces(live.ready && !!live.org);
  if (!live.ready || (live.org && pl.loading)) return <Opening ws="health" crumb={["Samples", "Sample"]} />;
  if (!live.org) { const x = sampleSample(id); return <SampleView sample s={x.s} events={x.events} from={x.from} lab={x.lab} area={x.s.place} isLab reload={() => {}} />; }
  return <LiveSample id={id} places={pl.places} />;
}

function LiveSample({ id, places }: { id: string; places: Place[] }) {
  const rows = useRead<Sample[]>(() => select<Sample>("oh_samples", { id }), `nx-smp:${id}`);
  const ev = useRead<SampleEvent[]>(() => select<SampleEvent>("oh_sample_events", { sample_id: id }, "id,sample_id,at,actor_name,organisation_id,action,note", 200), `nx-smpev:${id}`);
  const names = useNames(true);
  if (rows.loading && !rows.data) return <Opening ws="health" crumb={["Samples", "Sample"]} />;
  if (rows.error) return <Shell ws="health" crumb={["Samples", "Sample"]}><div className="nx-page"><Failed error={rows.error} retry={rows.reload} /></div></Shell>;
  const s = rows.data?.[0];
  if (!s) return <Shell ws="health" crumb={["Samples", "Sample"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Sample</h1><Empty title="This sample is not visible to you" hint="Only the team that sent it and the laboratory that received it can open a sample." action={<Link href="/health/samples" className="nx-btn is-quiet">Back to samples</Link>} /></div></Shell>;
  const lab = placeOf(places, s.laboratory_id);
  return <SampleView sample={false} s={s} events={ev.data ?? []} eventsError={ev.error} from={names.org(s.submitted_by, false) ?? "Programme partner"} lab={names.org(s.laboratory_id, false) ?? "Laboratory"} area={names.area(s.area_id)} isLab={!!lab && lab.capabilities.includes("lab_step")} reload={() => { rows.reload(); ev.reload(); }} />;
}

function SampleView({ sample, s, events, eventsError, from, lab, area, isLab, reload }: { sample: boolean; s: Sample; events: SampleEvent[]; eventsError?: string | null; from: string; lab: string; area: string | null; isLab: boolean; reload: () => void }) {
  const ordered = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const closed = s.status === "resulted" || s.status === "rejected";
  return (
    <Shell ws="health" crumb={["Samples", s.code]}>
      <RecordHead av={<FlaskConical size={18} />} title={<><span className="gh-code">{s.code}</span>{sample ? <SampleChip /> : null}</>}
        sub={<>{SPECIES[s.species] ?? s.species} {(SAMPLE_TYPE[s.sample_type] ?? s.sample_type).toLowerCase()} from {area ?? s.place ?? "an area not recorded"} · sent by {from} </>}
        chips={s.result ? <Chip tone={sampleTone(s)}>{RESULT[s.result]?.label ?? s.result}</Chip> : <Chip tone={TONE[s.status] ?? "plain"}>{SAMPLE[s.status]?.label ?? s.status}</Chip>} />
      <div className="nx-rec" style={{ marginTop: 16, borderTop: "1px solid var(--line)" }}>
        <section aria-label="Sample">
          <h3 className="nx-h3">Sample</h3>
          <Props items={[["Sent by", from], ["Laboratory", lab], ["Collected", `${fmtDate(s.collected_on, { day: "numeric", month: "long" })}${s.collected_by_name ? ` by ${s.collected_by_name}` : ""}`], ["Place", s.place], ["Why", s.reason]]} />
          <p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>Only the team that sent the sample and the laboratory see it. Kaju does not read samples or results.</span></p>
        </section>
        <section aria-label="Chain of custody">
          <Block title="Chain of custody" note="Every hand the sample passed through, with the time and the person.">
            {eventsError ? <Failed error={eventsError} retry={reload} /> : <Timeline items={ordered.map((e, i) => ({ id: String(e.id), when: dayTime(e.at), title: ACTION[e.action] ?? e.action, who: e.actor_name, body: e.note ?? undefined, tone: i === ordered.length - 1 ? (e.action === "rejected" ? "bad" : "accent") : "ok" }))} empty="No steps recorded yet." />}
          </Block>
        </section>
        <aside aria-label="Result and next step">
          <Block title="Result">
            {s.result ? <Props items={[["Result", <Chip key="r" tone={sampleTone(s)}>{RESULT[s.result]?.label ?? s.result}</Chip>], ["Method", s.method], ["Released", s.resulted_at ? `${dayTime(s.resulted_at)}${s.resulted_by_name ? `, ${s.resulted_by_name}` : ""}` : null], ...(s.result_note ? [["Note", s.result_note] as [string, string]] : [])]} />
              : s.status === "rejected" ? <Props items={[["Status", <Chip key="x" tone="bad">Rejected</Chip>], ["Reason", s.result_note]]} />
              : <p className="nx-sub">No result yet. The laboratory records it here.</p>}
          </Block>
          {isLab ? <Block title={closed ? "Notes" : "Next step"} note={closed ? "A released result cannot be changed. A note can still be added." : "Each step is recorded in your name."}>
            <div className="gh-desk"><LabSteps s={s} sample={sample} onDone={reload} /></div>
          </Block> : <p className="nx-foot">The laboratory takes each step. {s.status === "resulted" ? "The result has been released to you." : "You are told when the result is released."}</p>}
        </aside>
      </div>
      <GhMark />
      {isLab ? <LabSteps bar s={s} sample={sample} onDone={reload} /> : null}
    </Shell>
  );
}

/* ── Send a sample ───────────────────────────────────────────────── */
export type SampleQuery = { handoff?: string; area?: string; place?: string; from?: string };
export function NewSample({ q }: { q: SampleQuery }) {
  const live = useLive();
  const pl = usePlaces(live.ready && !!live.org);
  if (!live.ready || (live.org && pl.loading)) return <Opening ws="health" crumb={["Samples", "Send a sample"]} />;
  if (!live.org) return <SampleForm sample q={q} senders={[{ organisation_id: "s", name: "Animal Care Trust", kind: "ngo" } as Place]} />;
  const senders = pl.places.filter((p) => p.capabilities.includes("send_sample"));
  if (!senders.length) return <Shell ws="health" crumb={["Samples", "Send a sample"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Send a sample</h1><Denied what="Your role cannot send samples" why="Samples are sent by field teams, clinicians and programme coordinators. A laboratory receives them; it does not send them." back={{ href: "/health/today", label: "Back to Today" }} /></div></Shell>;
  return <SampleForm sample={false} q={q} senders={senders} />;
}

function SampleForm({ sample, q, senders }: { sample: boolean; q: SampleQuery; senders: Place[] }) {
  const router = useRouter();
  const [fromId, setFromId] = useState(senders.find((p) => p.organisation_id === q.from)?.organisation_id ?? senders[0]?.organisation_id ?? "");
  const names = useNames(!sample);
  const areas = useRead<Area[]>(() => call("oh_org_areas", { p_org: fromId }), `nx-areas:${fromId}`, !sample && !!fromId);
  const labs = sample ? [{ id: "lab", name: "Reference Rabies Diagnostic Laboratory" }] : names.orgs.filter((o) => o.kind === "laboratory");
  const [f, setF] = useState({ lab: "", species: "dog", type: "brain_tissue", on: indiaToday(), area: q.area ?? "", place: q.place ?? "", reason: "" });
  const [asking, setAsking] = useState(false);
  const { busy, run } = useAct();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const lab = f.lab || labs[0]?.id || "";
  const ready = !!lab && !!f.on && f.on <= indiaToday();
  const save = async () => {
    const r = await run("send", () => call<{ id: string; code: string }>("oh_submit_sample", { p_from: fromId, p_lab: lab, p_species: f.species, p_type: f.type, p_collected_on: f.on, p_area: f.area || null, p_place: f.place.trim() || null, p_reason: f.reason.trim() || null, p_handoff: q.handoff || null }), { ok: (x) => `Sample ${(x as { data?: { code?: string } | null }).data?.code ?? ""} is on its way. Write the code on the container.` });
    setAsking(false);
    const d = (r.result as { data?: { id: string } | null } | undefined)?.data;
    if (r.ok && d?.id) router.push(`/health/samples/${d.id}`);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); if (ready) setAsking(true); };
  return (
    <Shell ws="health" crumb={["Samples", "Send a sample"]}>
      <div className="nx-page" style={{ maxWidth: 820 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{senders.find((p) => p.organisation_id === fromId)?.name}{sample ? <SampleChip /> : null}</p><h1 className="nx-h1">Send a sample</h1><p className="nx-sub">You get a code to write on the container. <About>The laboratory sees it arriving and reports the result back to you.</About></p></div></div>
        <GhMark />
        {q.handoff ? <p className="nx-note" style={{ marginTop: 14 }}><Info size={13} /><span>Sent for a follow-up request. The sample is linked to it.</span></p> : null}
        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <Block title="The sample">
            <div className="nx-fields gh-fields">
              {senders.length > 1 ? <Field label="Sent by" wide><select value={fromId} onChange={(e) => setFromId(e.target.value)}>{senders.map((p) => <option key={p.organisation_id} value={p.organisation_id}>{p.name} · {KIND_LABEL[p.kind] ?? p.kind}</option>)}</select></Field> : null}
              <div className="nx-field is-wide"><span>Animal</span><Seg name="sp" label="Animal" value={f.species} onChange={(v) => set("species", v)} options={(Object.entries(SPECIES) as [string, string][]).filter(([k]) => k !== "unknown")} /></div>
              <div className="nx-field is-wide"><span>Sample</span><Seg name="type" label="Sample" value={f.type} onChange={(v) => set("type", v)} options={Object.entries(SAMPLE_TYPE) as [string, string][]} /></div>
              <Field label="Collected on"><input type="date" required max={indiaToday()} value={f.on} onChange={(e) => set("on", e.target.value)} /></Field>
              <Field label="Laboratory">{labs.length ? <select value={lab} onChange={(e) => set("lab", e.target.value)}>{labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select> : <select disabled><option>No laboratory in your programme</option></select>}</Field>
            </div>
            <p className="nx-note" style={{ marginTop: 10 }}><Info size={13} /><span>Follow the laboratory&apos;s own collection, packaging and cold-chain instructions. Only trained, vaccinated staff should collect samples.</span></p>
          </Block>
          <Block title="Where and why">
            <div className="nx-fields gh-fields">
              <Field label="Area"><select value={f.area} onChange={(e) => set("area", e.target.value)}><option value="">Not known</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
              <Field label="Place"><input value={f.place} maxLength={200} onChange={(e) => set("place", e.target.value)} placeholder="Landmark or street" /></Field>
              <Field label="What happened to the animal" wide><textarea value={f.reason} maxLength={400} onChange={(e) => set("reason", e.target.value)} placeholder="Signs seen, when it died, whether it bit anyone" /></Field>
            </div>
          </Block>
          <div className="gh-acts gh-savebar" style={{ marginTop: 22 }}>{sample ? <TryLink>Send sample</TryLink> : <button type="submit" className="nx-btn" disabled={!!busy || !ready}>Send sample</button>}<Link href="/health/samples" className="nx-btn is-quiet">Cancel</Link>{!labs.length && !sample && names.orgs.length ? <span className="gh-err">No laboratory is part of your programme yet.</span> : null}</div>
        </form>
        {asking ? <Confirm title="Send this sample" busy={busy === "send"} confirm="Send" onClose={() => setAsking(false)} onConfirm={() => void save()}><p>{SPECIES[f.species]} {(SAMPLE_TYPE[f.type] ?? f.type).toLowerCase()} collected {fmtDate(f.on, { day: "numeric", month: "long" })}, to {labs.find((l) => l.id === lab)?.name}. The laboratory sees it as on its way.</p></Confirm> : null}
      </div>
    </Shell>
  );
}
