"use client";

/* The laboratory's queue, in the order samples move: arriving, received,
   testing, then results. Each step is one press; a result needs a method. */
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { usePlaces, primaryProgramme } from "../places";
import { call, fmtDate, fmtTime, relDay, select, useNames, useRead, RESULT, SAMPLE, SAMPLE_TYPE, SPECIES, type Place, type Sample, type SampleEvent } from "../data";
import { Chip, Empty, Failed, Head, Loading, Page, Section, Seg, Sheet, Stat, useToast } from "../ui";

export function LabQueue({ place }: { place: Place }) {
  const { reload: reloadPlaces } = usePlaces();
  const id = place.organisation_id, prog = primaryProgramme(place);
  const samples = useRead<Sample[]>(() => select<Sample>("oh_samples", { laboratory_id: id }), `lab:${id}`);
  const names = useNames();
  const [act, setAct] = useState<{ s: Sample; step: "resulted" | "rejected" } | null>(null);
  const toast = useToast();
  const list = (samples.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const by = (st: string[]) => list.filter((s) => st.includes(s.status));
  const step = async (s: Sample, a: "received" | "testing") => {
    const r = await call("oh_sample_step", { p_sample: s.id, p_action: a });
    if (r.error) toast(r.error, "flame"); else { toast(a === "received" ? `${s.code} received.` : `${s.code} is now testing.`); samples.reload(); reloadPlaces(); }
  };
  const row = (s: Sample, action?: React.ReactNode) => (
    <div className="oh-row" key={s.id}>
      <span className="oh-row-mark" data-tone={s.result === "positive" ? "flame" : s.status === "dispatched" ? "amber" : s.status === "resulted" ? "green" : "blue"} aria-hidden />
      <Link className="oh-row-main" href={`/workspace/${id}/record/${s.id}`}>
        <b>{s.code} · {SPECIES[s.species]} {SAMPLE_TYPE[s.sample_type].toLowerCase()}</b>
        <span>From {names.org(s.submitted_by) ?? "a programme partner"} · {names.area(s.area_id) ?? "Area not recorded"} · collected {relDay(s.collected_on).toLowerCase()}</span>
      </Link>
      <div className="oh-row-meta">{s.result ? <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> : <Chip tone={SAMPLE[s.status].tone}>{SAMPLE[s.status].label}</Chip>}{action}</div>
    </div>
  );
  if (samples.loading && !samples.data) return <Page><Loading rows={5} /></Page>;
  if (samples.error) return <Page><Failed error={samples.error} retry={samples.reload} /></Page>;
  const arriving = by(["collected", "dispatched"]), received = by(["received"]), testing = by(["testing"]), done = by(["resulted", "rejected"]);
  return (
    <Page illustrative={place.illustrative}>
      <Head eyebrow={prog?.name} title="Samples" lede="Receive, test and report animal samples. Results go back to the team that sent each sample; a positive also alerts programme coordination with the area." />
      <dl className="oh-stats">
        <Stat label="Arriving" value={arriving.length} tone={arriving.length ? "amber" : undefined} href="#arriving" />
        <Stat label="Received" value={received.length} href="#received" />
        <Stat label="Testing" value={testing.length} href="#testing" />
        <Stat label="Positive, all time" value={list.filter((s) => s.result === "positive").length} tone={list.some((s) => s.result === "positive") ? "flame" : undefined} href="#results" />
      </dl>
      <div className="oh-grid halves">
        <Section title="Arriving" id="arriving">{arriving.length ? <div className="oh-rows">{arriving.map((s) => row(s, <><button type="button" className="oh-btn small primary" onClick={() => void step(s, "received")}>Receive</button><button type="button" className="oh-btn small" onClick={() => setAct({ s, step: "rejected" })}>Reject</button></>))}</div> : <Empty title="Nothing on its way" />}</Section>
        <Section title="Received and testing" id="received">{received.length + testing.length ? <div className="oh-rows">{received.map((s) => row(s, <button type="button" className="oh-btn small primary" onClick={() => void step(s, "testing")}>Start test</button>))}{testing.map((s) => row(s, <button type="button" className="oh-btn small primary" onClick={() => setAct({ s, step: "resulted" })}>Record result</button>))}</div> : <Empty title="Nothing in the laboratory" />}</Section>
      </div>
      <Section title="Results" note="Most recent first" id="results">{done.length ? <div className="oh-rows">{done.map((s) => row(s, s.resulted_at ? <span>{fmtDate(s.resulted_at)}</span> : null))}</div> : <Empty title="No results yet" />}</Section>
      {act ? <StepSheet sample={act.s} area={names.area(act.s.area_id)} step={act.step} onClose={() => setAct(null)} onDone={(m) => { setAct(null); toast(m); samples.reload(); reloadPlaces(); }} /> : null}
    </Page>
  );
}

export function StepSheet({ sample, area, step, onClose, onDone }: { sample: Sample; area: string | null; step: "resulted" | "rejected"; onClose: () => void; onDone: (m: string) => void }) {
  const [result, setResult] = useState<"negative" | "positive" | "inconclusive">("negative"), [method, setMethod] = useState(""), [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call("oh_sample_step", { p_sample: sample.id, p_action: step, p_note: note || null, p_result: step === "resulted" ? result : null, p_method: step === "resulted" ? method : null });
    setBusy(false);
    if (r.error) setErr(r.error); else onDone(step === "rejected" ? `${sample.code} rejected; the sender has the reason.` : result === "positive" ? `${sample.code}: positive. The sender and programme coordinators have been told.` : `${sample.code}: ${result}. The sender has the result.`);
  };
  return (
    <Sheet title={step === "resulted" ? `Result for ${sample.code}` : `Reject ${sample.code}`} note={`${SPECIES[sample.species]} ${SAMPLE_TYPE[sample.sample_type].toLowerCase()} · ${area ?? "area not recorded"}`} onClose={onClose}
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className={`oh-btn ${step === "resulted" && result === "positive" ? "urgent" : "primary"}`} disabled={busy || (step === "resulted" ? method.trim().length < 2 : note.trim().length < 3)} onClick={() => void save()}>{busy ? "Saving…" : step === "resulted" ? "Report result" : "Reject sample"}</button></>}>
      {step === "resulted" ? (
        <>
          <div className="oh-field"><span>Result</span><Seg name="result" label="Result" value={result} onChange={setResult} options={[["negative", "Negative"], ["positive", "Positive"], ["inconclusive", "Inconclusive"]]} /></div>
          <label className="oh-field"><span>Test method</span><input value={method} onChange={(e) => setMethod(e.target.value)} maxLength={120} placeholder="As validated in your laboratory" /></label>
          <label className="oh-field"><span>Note for the sender (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} /></label>
          {result === "positive" ? <p className="oh-note" style={{ background: "var(--flame-fill)", color: "#8f2a18" }}>A positive result alerts programme coordination at once, with the area and place, and goes back to the sender.</p> : null}
        </>
      ) : <label className="oh-field"><span>Why it cannot be tested</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} placeholder="For example: sample decomposed, cold chain broken" /></label>}
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}

const ACTION: Record<string, string> = { collected: "Collected", dispatched: "Sent to the laboratory", received: "Received by the laboratory", testing: "Testing started", resulted: "Result reported", rejected: "Rejected by the laboratory", note: "Note" };

export function SampleRecord({ id, place }: { id: string; place: Place }) {
  const { reload: reloadPlaces } = usePlaces();
  const rows = useRead<Sample[]>(() => select<Sample>("oh_samples", { id }), `sample:${id}`);
  const events = useRead<SampleEvent[]>(() => select<SampleEvent>("oh_sample_events", { sample_id: id }), `events:${id}`);
  const names = useNames();
  const name = { get: (x: string) => names.org(x, false) };
  const [act, setAct] = useState<"resulted" | "rejected" | null>(null);
  const toast = useToast();
  if (rows.loading && !rows.data) return <Page><Loading rows={4} /></Page>;
  if (rows.error) return <Page><Failed error={rows.error} retry={rows.reload} /></Page>;
  const s = rows.data?.[0];
  if (!s) return <Page><Empty title="This sample is not visible to you" /></Page>;
  const isLab = place.organisation_id === s.laboratory_id;
  const step = async (a: "received" | "testing") => { const r = await call("oh_sample_step", { p_sample: s.id, p_action: a }); if (r.error) toast(r.error, "flame"); else { rows.reload(); events.reload(); reloadPlaces(); } };
  const ev = (events.data ?? []).slice().sort((a, b) => a.at.localeCompare(b.at));
  return (
    <Page illustrative={place.illustrative}>
      <Head eyebrow={<Link href={`/workspace/${place.organisation_id}`}>{place.kind === "laboratory" ? "Samples" : "Partner requests"}</Link>} title={s.code}
        lede={`${SPECIES[s.species]} ${SAMPLE_TYPE[s.sample_type].toLowerCase()} from ${names.area(s.area_id) ?? "an area not recorded"}${s.place ? `, ${s.place}` : ""}.`}
        actions={<>{s.result ? <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> : <Chip tone={SAMPLE[s.status].tone}>{SAMPLE[s.status].label}</Chip>}
          {isLab && (s.status === "dispatched" || s.status === "collected") ? <button type="button" className="oh-btn primary" onClick={() => void step("received")}>Receive</button> : null}
          {isLab && s.status === "received" ? <button type="button" className="oh-btn primary" onClick={() => void step("testing")}>Start test</button> : null}
          {isLab && s.status === "testing" ? <button type="button" className="oh-btn primary" onClick={() => setAct("resulted")}>Record result</button> : null}
          {isLab && (s.status === "dispatched" || s.status === "received") ? <button type="button" className="oh-btn" onClick={() => setAct("rejected")}>Reject</button> : null}</>} />
      <div className="oh-grid two">
        <Section title="Chain of custody" note="Every hand the sample passed through">
          <ol className="oh-steps">
            {ev.map((e) => (
              <li key={e.id} className="oh-step" data-state="done">
                <i aria-hidden><Check size={13} strokeWidth={3} /></i>
                <div><b>{ACTION[e.action] ?? e.action}</b><span>{fmtTime(e.at)} · {e.actor_name ?? "Team member"}{e.organisation_id ? `, ${name.get(e.organisation_id) ?? ""}` : ""}{e.note ? ` · ${e.note}` : ""}</span></div><span />
              </li>
            ))}
          </ol>
        </Section>
        <Section title="Details">
          <dl className="oh-facts">
            <div><dt>Sent by</dt><dd>{name.get(s.submitted_by) ?? "Programme partner"}</dd></div>
            <div><dt>Laboratory</dt><dd>{name.get(s.laboratory_id) ?? "Laboratory"}</dd></div>
            <div><dt>Collected</dt><dd>{fmtDate(s.collected_on, { day: "numeric", month: "long" })}{s.collected_by_name ? ` by ${s.collected_by_name}` : ""}</dd></div>
            <div><dt>Why</dt><dd>{s.reason ?? "Not recorded"}</dd></div>
            {s.result ? <div><dt>Method</dt><dd>{s.method}</dd></div> : null}
            {s.result ? <div><dt>Reported</dt><dd>{fmtTime(s.resulted_at!)}{s.resulted_by_name ? `, ${s.resulted_by_name}` : ""}</dd></div> : null}
            {s.result_note ? <div style={{ gridColumn: "1 / -1" }}><dt>{s.status === "rejected" ? "Reason" : "Note"}</dt><dd>{s.result_note}</dd></div> : null}
          </dl>
        </Section>
      </div>
      {act ? <StepSheet sample={s} area={names.area(s.area_id)} step={act} onClose={() => setAct(null)} onDone={(m) => { setAct(null); toast(m); rows.reload(); events.reload(); reloadPlaces(); }} /> : null}
    </Page>
  );
}
