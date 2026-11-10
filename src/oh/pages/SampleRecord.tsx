"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useOh } from "../Shell";
import { call, fmtDate, fmtTime, select, useRead, RESULT, SAMPLE, SAMPLE_TYPE, SPECIES, type Institution, type Sample, type SampleEvent } from "../data";
import { Chip, Empty, Failed, Head, Loading, Section, useToast } from "../ui";
import { StepSheet } from "./LabQueue";

const ACTION: Record<string, string> = { collected: "Collected", dispatched: "Sent to the laboratory", received: "Received by the laboratory", testing: "Testing started", resulted: "Result reported", rejected: "Rejected by the laboratory", note: "Note" };

export function SampleRecord({ id }: { id: string }) {
  const { place, reload: reloadPlaces } = useOh();
  const rows = useRead<Sample[]>(() => select<Sample>("oh_samples", { id }), `sample:${id}`);
  const events = useRead<SampleEvent[]>(() => select<SampleEvent>("oh_sample_events", { sample_id: id }), `events:${id}`);
  const partners = useRead<Institution[]>(() => select<Institution>("oh_institutions", { programme_id: place?.programme.id ?? "" }), `inst:${place?.programme.id}`, !!place);
  const name = useMemo(() => new Map((partners.data ?? []).map((i) => [i.id, i.name])), [partners.data]);
  const [act, setAct] = useState<"resulted" | "rejected" | null>(null);
  const toast = useToast();
  if (rows.loading && !rows.data) return <main className="oh-page"><Loading rows={4} /></main>;
  if (rows.error) return <main className="oh-page"><Failed error={rows.error} retry={rows.reload} /></main>;
  const s = rows.data?.[0];
  if (!s) return <main className="oh-page"><Empty title="This sample is not visible to you" /></main>;
  const isLab = place?.institution_id === s.laboratory_id;
  const step = async (a: "received" | "testing") => { const r = await call("oh_sample_step", { p_sample: s.id, p_action: a }); if (r.error) toast(r.error, "flame"); else { rows.reload(); events.reload(); reloadPlaces(); } };
  const ev = (events.data ?? []).slice().sort((a, b) => a.at.localeCompare(b.at));
  return (
    <main className="oh-page" id="main-content">
      <Head eyebrow={<Link href={`/workspace/${place!.institution_id}`}>{place!.kind === "laboratory" ? "Sample queue" : "Follow-ups"}</Link>} title={s.code}
        lede={`${SPECIES[s.species]} ${SAMPLE_TYPE[s.sample_type].toLowerCase()} from ${s.ward ?? "a ward not recorded"}${s.place ? `, ${s.place}` : ""}.`}
        actions={<>{s.result ? <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> : <Chip tone={SAMPLE[s.status].tone}>{SAMPLE[s.status].label}</Chip>}
          {isLab && (s.status === "dispatched" || s.status === "collected") ? <button type="button" className="oh-btn primary" onClick={() => step("received")}>Receive</button> : null}
          {isLab && s.status === "received" ? <button type="button" className="oh-btn primary" onClick={() => step("testing")}>Start test</button> : null}
          {isLab && s.status === "testing" ? <button type="button" className="oh-btn primary" onClick={() => setAct("resulted")}>Record result</button> : null}
          {isLab && (s.status === "dispatched" || s.status === "received") ? <button type="button" className="oh-btn" onClick={() => setAct("rejected")}>Reject</button> : null}</>} />
      <div className="oh-grid two">
        <Section title="Chain of custody" note="Every hand the sample passed through">
          <ol className="oh-steps">
            {ev.map((e) => (
              <li key={e.id} className="oh-step" data-state="done">
                <i aria-hidden><Check size={13} strokeWidth={3} /></i>
                <div><b>{ACTION[e.action] ?? e.action}</b><span>{fmtTime(e.at)} · {e.actor_name ?? "Team member"}{e.institution_id ? `, ${name.get(e.institution_id) ?? ""}` : ""}{e.note ? ` · ${e.note}` : ""}</span></div><span />
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
      {act ? <StepSheet sample={s} step={act} onClose={() => setAct(null)} onDone={(m) => { setAct(null); toast(m); rows.reload(); events.reload(); reloadPlaces(); }} /> : null}
    </main>
  );
}
