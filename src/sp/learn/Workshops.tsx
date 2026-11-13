"use client";

/* ════════════════════════════════════════════════════════════════════
   Workshops: choose a session, then scroll through it.

   Every activity of the session is on the page in order, each with its
   prompt and, for a lesson, its exercise. A track stays at the top and
   follows the scroll, so the facilitator always sees where the group is;
   nothing has to be pressed to move on. Background, the full plan and
   the safeguarding rules sit one tap away. The session ends with a
   closing question and The Kind Hour Foundation's documents to pair.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { Btn, Head, Lanes, Page, Panel, Section, Split, Tag, Tools } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { PLANS } from "./workshop-plans";
import { Exercise } from "./Interactives";
import { KindHourLibrary } from "./KindHourLibrary";
import "./learn.css";

export function Workshops() {
  const [planId, setPlanId] = usePageState<string>("plan", PLANS[0].id);
  const plan = Math.max(0, PLANS.findIndex((x) => x.id === planId));
  const [now, setNow] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const p = PLANS[plan];
  const titleOf = (i: number) => { const a = p.steps[i]; return "l" in a ? a.l.title : i === 0 ? "Start the conversation" : "Bring it together"; };
  const choose = (id: string) => { setPlanId(id); setNow(0); setDone(new Set()); };
  const last = p.steps.length;
  const at = Math.min(now, last);
  const activity = at < last ? p.steps[at] : null;
  const exercise = activity && "l" in activity ? activity.l.blocks.find((b) => b.kind === "do") : null;

  /* Choose a session; the list beside it is where the group is; one activity on screen at a time. */
  return (
    <Page>
      <Head title="Workshops" sum={<><b>{p.title}</b>: {p.who}, {p.minutes} minutes, {p.steps.length} activities. Every exercise works on a projector or a single phone.</>} />
      <Tools><Lanes label="Sessions" value={p.id} onChange={choose} lanes={PLANS.map((x) => ({ id: x.id, label: x.title }))} /></Tools>
      <Split side={
        <Section title="Where the group is" count={`${Math.min(at + 1, last + 1)} of ${last + 1}`}>
          <ol className="lrn-track" aria-label={`${p.title}: where the group is`}>
            {[...p.steps.map((_, i) => i), last].map((i) => (
              <li key={i}>
                <button type="button" aria-current={i === at ? "step" : undefined} onClick={() => setNow(i)}>
                  <span aria-hidden>{i === last || done.has(i) || i < at ? <Check size={12} /> : i + 1}</span>
                  <b>{i === last ? "Close the session" : titleOf(i)}</b>
                  <small>{i === last ? "" : `${p.steps[i].m} min`}</small>
                </button>
              </li>
            ))}
          </ol>
        </Section>
      }>
        <section className="lrn-act" key={`${p.id}-${at}`} aria-labelledby="lrn-act-t">
          <p className="lrn-act-k">{activity ? <>Activity {at + 1} of {p.steps.length} · {activity.m} minutes</> : "To close"}{done.has(at) && <Tag tone="green">Exercise done</Tag>}</p>
          <h2 id="lrn-act-t" className="lrn-act-t">{activity ? titleOf(at) : "Take it beyond the room."}</h2>
          {!activity ? (
            <>
              <p className="lrn-act-p">Ask each person to name one observation they can support and one thing they will do differently.</p>
              <p><Btn href="/learn/resources">Practise a report</Btn></p>
            </>
          ) : "l" in activity ? (
            <>
              <p className="lrn-act-p">{exercise?.kind === "do" ? exercise.prompt : activity.l.takeaway}</p>
              {exercise?.kind === "do" && <div className="lrn-do"><Exercise id={exercise.id} onDone={() => setDone((d) => new Set(d).add(at))} /></div>}
              <Section fold="background" open={false} title="Background for the facilitator">
                <div className="lrn-bg">{activity.l.blocks.filter((b) => b.kind !== "do").map((b, k) => <p key={k}>{"body" in b ? b.body : null}</p>)}<p><b>What to remember.</b> {activity.l.takeaway}</p><p><Link className="lrn-link" href={`/learn/courses/${activity.c.id}/${activity.l.id}`}>Open the full lesson</Link></p></div>
              </Section>
            </>
          ) : <p className="lrn-act-p">{activity.t}</p>}
          <div className="lrn-nav">
            <Btn disabled={at === 0} onClick={() => setNow(at - 1)}>Previous</Btn>
            {at < last ? <Btn variant="primary" onClick={() => setNow(at + 1)}>{at === last - 1 ? "Close the session" : "Next activity"}</Btn> : <span />}
          </div>
        </section>

        <Section fold="plan" open={false} title="Full plan and safeguarding">
          <Panel pad>
            <ol className="lrn-plan">{p.steps.map((s, i) => <li key={i}><b>{s.m} min</b><span>{"l" in s ? s.l.title : s.t}</span></li>)}</ol>
            <ul className="lrn-safe">
              <li>Never bring a street animal into a classroom or ask children to approach, feed or touch one.</li>
              <li>Do not collect children’s home locations or photographs for these activities.</li>
              <li>Practice reports stay practice. Real reports are made by an adult in the Report flow.</li>
              <li>If a child mentions a bite, follow the school’s first-aid procedure and seek medical care promptly.</li>
            </ul>
          </Panel>
        </Section>
        <KindHourLibrary ids={p.docs} title={`Pair “${p.title}” with`} />
      </Split>
    </Page>
  );
}
