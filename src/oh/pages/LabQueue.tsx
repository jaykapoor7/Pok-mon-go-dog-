"use client";

/* The laboratory's queue, in the order samples move: arriving, received,
   testing, then results. Each step is one press; a result needs a method. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { useOh } from "../Shell";
import { call, fmtDate, relDay, select, useRead, RESULT, SAMPLE, SAMPLE_TYPE, SPECIES, type Institution, type Sample } from "../data";
import { Chip, Empty, Failed, Head, Loading, Section, Seg, Sheet, Stat, useToast } from "../ui";

export function LabQueue() {
  const { place, reload: reloadPlaces } = useOh();
  const id = place!.institution_id;
  const samples = useRead<Sample[]>(() => select<Sample>("oh_samples", { laboratory_id: id }), `lab:${id}`);
  const partners = useRead<Institution[]>(() => select<Institution>("oh_institutions", { programme_id: place!.programme.id }), `inst:${place!.programme.id}`);
  const name = useMemo(() => new Map((partners.data ?? []).map((i) => [i.id, i.short_name ?? i.name])), [partners.data]);
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
        <span>From {name.get(s.submitted_by) ?? "a programme partner"} · {s.ward ?? "Ward not recorded"} · collected {relDay(s.collected_on).toLowerCase()}</span>
      </Link>
      <div className="oh-row-meta">{s.result ? <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> : <Chip tone={SAMPLE[s.status].tone}>{SAMPLE[s.status].label}</Chip>}{action}</div>
    </div>
  );
  if (samples.loading && !samples.data) return <main className="oh-page"><Loading rows={5} /></main>;
  if (samples.error) return <main className="oh-page"><Failed error={samples.error} retry={samples.reload} /></main>;
  const arriving = by(["collected", "dispatched"]), received = by(["received"]), testing = by(["testing"]), done = by(["resulted", "rejected"]);
  return (
    <main className="oh-page" id="main-content">
      <Head eyebrow={place!.programme.name} title="Sample queue" lede="Receive, test and report animal samples. Results go back to the team that sent the sample; positives also go to the programme coordinators." />
      <dl className="oh-stats">
        <Stat label="Arriving" value={arriving.length} tone={arriving.length ? "amber" : undefined} href="#arriving" />
        <Stat label="Received" value={received.length} href="#received" />
        <Stat label="Testing" value={testing.length} href="#testing" />
        <Stat label="Positive, all time" value={list.filter((s) => s.result === "positive").length} tone={list.some((s) => s.result === "positive") ? "flame" : undefined} href="#results" />
      </dl>
      <div className="oh-grid halves">
        <Section title="Arriving" id="arriving">{arriving.length ? <div className="oh-rows">{arriving.map((s) => row(s, <><button type="button" className="oh-btn small primary" onClick={() => step(s, "received")}>Receive</button><button type="button" className="oh-btn small" onClick={() => setAct({ s, step: "rejected" })}>Reject</button></>))}</div> : <Empty title="Nothing on its way" />}</Section>
        <Section title="Received and testing" id="received">{received.length + testing.length ? <div className="oh-rows">{received.map((s) => row(s, <button type="button" className="oh-btn small primary" onClick={() => step(s, "testing")}>Start test</button>))}{testing.map((s) => row(s, <button type="button" className="oh-btn small primary" onClick={() => setAct({ s, step: "resulted" })}>Record result</button>))}</div> : <Empty title="Nothing in the laboratory" />}</Section>
      </div>
      <Section title="Results" note="Most recent first" id="results">{done.length ? <div className="oh-rows">{done.map((s) => row(s, s.resulted_at ? <span>{fmtDate(s.resulted_at)}</span> : null))}</div> : <Empty title="No results yet" />}</Section>
      {act ? <StepSheet sample={act.s} step={act.step} onClose={() => setAct(null)} onDone={(m) => { setAct(null); toast(m); samples.reload(); reloadPlaces(); }} /> : null}
    </main>
  );
}

export function StepSheet({ sample, step, onClose, onDone }: { sample: Sample; step: "resulted" | "rejected"; onClose: () => void; onDone: (m: string) => void }) {
  const [result, setResult] = useState<"negative" | "positive" | "inconclusive">("negative"), [method, setMethod] = useState(""), [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call("oh_sample_step", { p_sample: sample.id, p_action: step, p_note: note || null, p_result: step === "resulted" ? result : null, p_method: step === "resulted" ? method : null });
    setBusy(false);
    if (r.error) setErr(r.error); else onDone(step === "rejected" ? `${sample.code} rejected; the sender has the reason.` : result === "positive" ? `${sample.code}: positive. The sender and programme coordinators have been told.` : `${sample.code}: ${result}. The sender has the result.`);
  };
  return (
    <Sheet title={step === "resulted" ? `Result for ${sample.code}` : `Reject ${sample.code}`} note={`${SPECIES[sample.species]} ${SAMPLE_TYPE[sample.sample_type].toLowerCase()} · ${sample.ward ?? "ward not recorded"}`} onClose={onClose}
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className={`oh-btn ${step === "resulted" && result === "positive" ? "urgent" : "primary"}`} disabled={busy || (step === "resulted" ? method.trim().length < 2 : note.trim().length < 3)} onClick={save}>{busy ? "Saving…" : step === "resulted" ? "Report result" : "Reject sample"}</button></>}>
      {step === "resulted" ? (
        <>
          <div className="oh-field"><span>Result</span><Seg name="result" value={result} onChange={setResult} options={[["negative", "Negative"], ["positive", "Positive"], ["inconclusive", "Inconclusive"]]} /></div>
          <label className="oh-field"><span>Test method</span><input value={method} onChange={(e) => setMethod(e.target.value)} maxLength={120} placeholder="As validated in your laboratory" /></label>
          <label className="oh-field"><span>Note for the sender (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} /></label>
          {result === "positive" ? <p className="oh-note" style={{ background: "var(--flame-fill)", color: "#8f2a18" }}>A positive result alerts the programme coordinators and the municipal division at once, with the ward and place.</p> : null}
        </>
      ) : <label className="oh-field"><span>Why it cannot be tested</span><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} placeholder="For example: sample decomposed, cold chain broken" /></label>}
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}
