"use client";

/* The laboratory's queue, in the order samples move: arriving, received,
   testing, then results. Each step is one press; a result needs a method. */
import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Btn, Lanes, More, Note, Panel, Props, Split, Tag, Tools, type Lane } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { usePlaces } from "../places";
import { call, fmtDate, fmtTime, relDay, select, useNames, useRead, RESULT, SAMPLE, SAMPLE_TYPE, SPECIES, type Place, type Sample, type SampleEvent } from "../data";
import { Chip, Empty, Failed, Head, Loading, Page, Row, Rows, Section, Seg, Sheet, useToast, type Tone } from "../ui";

type Stage = "open" | "arriving" | "received" | "testing" | "done";

export function LabQueue({ place }: { place: Place }) {
  const { reload: reloadPlaces } = usePlaces();
  const id = place.organisation_id;
  const samples = useRead<Sample[]>(() => select<Sample>("oh_samples", { laboratory_id: id }), `lab:${id}`);
  const names = useNames();
  const [act, setAct] = useState<{ s: Sample; step: "resulted" | "rejected" } | null>(null);
  const [lane, setLane] = usePageState<Stage>("lane", "open");
  const toast = useToast();
  const list = (samples.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const by = (st: string[]) => list.filter((s) => st.includes(s.status));
  const step = async (s: Sample, a: "received" | "testing") => {
    const r = await call("oh_sample_step", { p_sample: s.id, p_action: a });
    if (r.error) toast(r.error, "flame"); else { toast(a === "received" ? `${s.code} received.` : `${s.code} is now testing.`); samples.reload(); reloadPlaces(); }
  };
  const tone = (s: Sample): Tone => s.result === "positive" ? "flame" : s.status === "dispatched" ? "amber" : s.status === "resulted" ? "green" : s.status === "testing" ? "violet" : "blue";
  const next = (s: Sample) => s.status === "collected" || s.status === "dispatched" ? <><Btn small variant="quiet" onClick={() => setAct({ s, step: "rejected" })}>Reject</Btn><Btn small onClick={() => void step(s, "received")}>Receive</Btn></>
    : s.status === "received" ? <Btn small onClick={() => void step(s, "testing")}>Start test</Btn>
    : s.status === "testing" ? <Btn small onClick={() => setAct({ s, step: "resulted" })}>Record result</Btn>
    : s.resulted_at ? <span>{fmtDate(s.resulted_at)}</span> : null;
  const row = (s: Sample) => (
    <Row key={s.id} href={`/workspace/${id}/record/${s.id}`} icon={<FlaskConical size={14} />} tone={tone(s)}
      title={<><span className="oh-code">{s.code}</span> · {SPECIES[s.species]} {SAMPLE_TYPE[s.sample_type].toLowerCase()}</>}
      meta={`From ${names.org(s.submitted_by) ?? "a programme partner"} · ${names.area(s.area_id) ?? "Area not recorded"} · collected ${relDay(s.collected_on).toLowerCase()}`}
      end={<>{s.result ? <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> : <Chip tone={SAMPLE[s.status].tone}>{SAMPLE[s.status].label}</Chip>}{next(s)}</>} />
  );
  if (samples.loading && !samples.data) return <Page><Head title="Home" lede="Reading the samples…" /><Loading rows={5} /></Page>;
  if (samples.error) return <Page><Head title="Home" lede="The samples could not be read." /><Failed error={samples.error} retry={samples.reload} /></Page>;
  const arriving = by(["collected", "dispatched"]), received = by(["received"]), testing = by(["testing"]), done = by(["resulted", "rejected"]);
  const open = arriving.length + received.length + testing.length;
  const lanes: Lane<Stage>[] = [
    { id: "open", label: "To do", count: open, tone: open ? "blue" : undefined },
    { id: "arriving", label: "Arriving", count: arriving.length },
    { id: "received", label: "Received", count: received.length },
    { id: "testing", label: "Testing", count: testing.length },
    { id: "done", label: "Reported", count: done.length },
  ];
  const groups: [string, Sample[], string][] = lane === "open" ? [["Arriving", arriving, ""], ["Received", received, ""], ["Testing", testing, ""]]
    : lane === "arriving" ? [["", arriving, "Nothing on its way"]] : lane === "received" ? [["", received, "Nothing waiting for a test"]] : lane === "testing" ? [["", testing, "Nothing being tested"]] : [["", done, "No results yet"]];
  const any = groups.some(([, g]) => g.length);
  return (
    <Page illustrative={place.illustrative}>
      {/* No Kaju box here: Kaju does not read laboratory samples or results. */}
      <Head title="Home" lede={open ? <><b>{arriving.length}</b> {arriving.length === 1 ? "sample is" : "samples are"} on the way, <b>{received.length}</b> waiting for a test and <b>{testing.length}</b> being tested.</> : "Nothing is on its way or in the laboratory."} />
      <Tools><Lanes label="Samples by stage" lanes={lanes} value={lane} onChange={setLane} /></Tools>
      <Panel>
        {!any ? <Empty title={lane === "open" ? "Nothing in the laboratory" : groups[0][2]} /> : groups.map(([title, g]) => g.length ? (
          <div key={title || lane}>
            {title ? <h3 className="oh-sub">{title}</h3> : null}
            <More items={g} cap={lane === "open" ? 6 : 12} noun="samples">{(shown) => <Rows label={title || "Samples"}>{shown.map(row)}</Rows>}</More>
          </div>
        ) : null)}
      </Panel>
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
      foot={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={busy || (step === "resulted" ? method.trim().length < 2 : note.trim().length < 3)} onClick={() => void save()}>{busy ? "Saving…" : step === "resulted" ? "Report result" : "Reject sample"}</Btn></>}>
      {step === "resulted" ? (
        <>
          <div className="oh-field"><span>Result</span><Seg name="result" label="Result" value={result} onChange={setResult} options={[["negative", "Negative"], ["positive", "Positive"], ["inconclusive", "Inconclusive"]]} /></div>
          <label className="oh-field"><span>Test method</span><input value={method} onChange={(e) => setMethod(e.target.value)} maxLength={120} placeholder="As validated in your laboratory" /></label>
          <label className="oh-field"><span>Note for the sender (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} /></label>
          {result === "positive" ? <Note tone="flame">A positive result alerts programme coordination at once, with the area and place, and goes back to the sender.</Note> : null}
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
  /* The one next step for the laboratory, from the sample's own status; rejecting stays beside it while it is still possible. */
  const nextStep = !isLab ? null : s.status === "dispatched" || s.status === "collected" ? <Btn variant="primary" onClick={() => void step("received")}>Receive</Btn>
    : s.status === "received" ? <Btn variant="primary" onClick={() => void step("testing")}>Start test</Btn>
    : s.status === "testing" ? <Btn variant="primary" onClick={() => setAct("resulted")}>Record result</Btn> : null;
  const canReject = isLab && (s.status === "dispatched" || s.status === "received");
  return (
    <Page illustrative={place.illustrative}>
      <Head title={s.code}
        lede={`${SPECIES[s.species]} ${SAMPLE_TYPE[s.sample_type].toLowerCase()} from ${names.area(s.area_id) ?? "an area not recorded"}${s.place ? `, ${s.place}` : ""}.`}
        actions={s.result ? <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> : <Chip tone={SAMPLE[s.status].tone}>{SAMPLE[s.status].label}</Chip>} />
      <Split side={<>
        <Section title="Result">
          {s.result ? <Props items={[
            { label: "Result", value: <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> },
            { label: "Method", value: s.method },
            { label: "Reported", value: `${fmtTime(s.resulted_at!)}${s.resulted_by_name ? `, ${s.resulted_by_name}` : ""}` },
            ...(s.result_note ? [{ label: "Note", value: s.result_note }] : []),
          ]} /> : s.status === "rejected" ? <Props items={[{ label: "Result", value: <Tag tone="flame">Rejected</Tag> }, ...(s.result_note ? [{ label: "Reason", value: s.result_note }] : [])]} />
            : nextStep || canReject ? <div className="oh-inline">{nextStep}{canReject ? <Btn onClick={() => setAct("rejected")}>Reject</Btn> : null}</div>
            : <p className="oh-foot">No result yet. The laboratory reports it here.</p>}
        </Section>
        <Section title="Sample">
          <Props items={[
            { label: "Sent by", value: name.get(s.submitted_by) ?? "Programme partner" },
            { label: "Laboratory", value: name.get(s.laboratory_id) ?? "Laboratory" },
            { label: "Collected", value: `${fmtDate(s.collected_on, { day: "numeric", month: "long" })}${s.collected_by_name ? ` by ${s.collected_by_name}` : ""}` },
            { label: "Why", value: s.reason ?? "Not recorded" },
          ]} />
        </Section>
      </>}>
        <Section title="Chain of custody" note="Every hand the sample passed through">
          {events.error ? <Failed error={events.error} retry={events.reload} /> : events.loading && !events.data ? <Loading rows={3} /> : (
            <Panel>
              <Rows label="Chain of custody">
                {ev.map((e) => <Row key={e.id} title={ACTION[e.action] ?? e.action} meta={`${e.actor_name ?? "Team member"}${e.organisation_id ? `, ${name.get(e.organisation_id) ?? ""}` : ""}${e.note ? ` · ${e.note}` : ""}`} end={fmtTime(e.at)} />)}
              </Rows>
            </Panel>
          )}
        </Section>
      </Split>
      {act ? <StepSheet sample={s} area={names.area(s.area_id)} step={act} onClose={() => setAct(null)} onDone={(m) => { setAct(null); toast(m); rows.reload(); events.reload(); reloadPlaces(); }} /> : null}
    </Page>
  );
}
