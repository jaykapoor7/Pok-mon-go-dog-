"use client";

/* Workshops (/learn/workshops): choose a session, then run it one activity
   at a time. The track beside it is where the group is; every exercise works
   on a projector or a single phone. Background, the full plan and the
   safeguarding rules sit one tap away; the session ends with a closing
   question and The Kind Hour Foundation's documents to pair. */

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { PLANS } from "@/sp/learn/workshop-plans";
import { Exercise } from "@/sp/learn/Interactives";
import { Body, Btn, Fold, Head, Lanes, LinkBtn, Sec, Split, Tag } from "../kit";
import { KindHourLibrary } from "./KindHour";
import "./learn.css";

export function Workshops() {
  const [planId, setPlanId] = useState<string>(PLANS[0].id);
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
  return (
    <>
      <Head back="/learn" eyebrow="StrayPaw Academy" title="Workshops" sum={<><b>{p.title}</b>: {p.who}, {p.minutes} minutes, {p.steps.length} activities. Every exercise works on a projector or a single phone.</>} />
      <Body>
        <Lanes label="Sessions" value={p.id} onChange={choose} lanes={PLANS.map((x) => ({ id: x.id, label: x.title }))} />
        <Split side={
          <Sec title="Where the group is" count={`${Math.min(at + 1, last + 1)} of ${last + 1}`}>
            <ol className="lx-track" aria-label={`${p.title}: where the group is`}>
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
          </Sec>
        }>
          <section className="lx-act" key={`${p.id}-${at}`} aria-labelledby="lrn-act-t">
            <p className="lx-do-k lrn-act-k"><span>{activity ? <>Activity {at + 1} of {p.steps.length} · {activity.m} minutes</> : "To close"}</span>{done.has(at) && <Tag tone="green">Exercise done</Tag>}</p>
            <h2 id="lrn-act-t" className="lx-act-t">{activity ? titleOf(at) : "Take it beyond the room."}</h2>
            {!activity ? (
              <>
                <p className="lx-do-p">Ask each person to name one observation they can support and one thing they will do differently.</p>
                <div><LinkBtn href="/learn/resources">Practise a report</LinkBtn></div>
              </>
            ) : "l" in activity ? (
              <>
                <p className="lx-do-p">{exercise?.kind === "do" ? exercise.prompt : activity.l.takeaway}</p>
                {exercise?.kind === "do" && <div className="lx-do"><div className="lx-ex"><Exercise id={exercise.id} onDone={() => setDone((d) => new Set(d).add(at))} /></div></div>}
                <Fold title="Background for the facilitator">
                  <div className="lx-bg">{activity.l.blocks.filter((b) => b.kind !== "do").map((b, k) => <p key={k}>{"body" in b ? b.body : null}</p>)}<p><b>What to remember.</b> {activity.l.takeaway}</p><p><Link className="pb-link" href={`/learn/courses/${activity.c.id}/${activity.l.id}`}>Open the full lesson</Link></p></div>
                </Fold>
              </>
            ) : <p className="lx-do-p">{activity.t}</p>}
            <div className="lx-nav">
              <Btn disabled={at === 0} onClick={() => setNow(at - 1)}>Previous</Btn>
              {at < last ? <Btn variant="primary" onClick={() => setNow(at + 1)}>{at === last - 1 ? "Close the session" : "Next activity"}</Btn> : <span />}
            </div>
          </section>
          <Fold title="Full plan and safeguarding">
            <ol className="lx-plan">{p.steps.map((s, i) => <li key={i}><b>{s.m} min</b><span>{"l" in s ? s.l.title : s.t}</span></li>)}</ol>
            <ul className="lx-safe">
              <li>Never bring a street animal into a classroom or ask children to approach, feed or touch one.</li>
              <li>Do not collect children’s home locations or photographs for these activities.</li>
              <li>Practice reports stay practice. Real reports are made by an adult in the Report flow.</li>
              <li>If a child mentions a bite, follow the school’s first-aid procedure and seek medical care promptly.</li>
            </ul>
          </Fold>
          <KindHourLibrary ids={p.docs} title={`Pair “${p.title}” with`} />
        </Split>
      </Body>
    </>
  );
}
