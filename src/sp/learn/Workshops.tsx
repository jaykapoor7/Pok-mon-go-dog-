"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { PLANS } from "./workshop-plans";
import { Exercise } from "./Interactives";
import { KindHourLibrary } from "./KindHourLibrary";
import { MobileDetails } from "../ui/MobileDetails";
import "./learn.css";
import "./academy-focus.css";

export function Workshops() {
  const [plan, setPlan] = useState(0);
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [finished, setFinished] = useState(false);
  const p = PLANS[plan], activity = p.steps[step];
  const exercise = "l" in activity ? activity.l.blocks.find(b => b.kind === "do") : null;
  const move = (n: number) => { setStep(n); setComplete(false); setFinished(false); };
  return <div className="ac academy-focus">
    <header className="academy-head"><p className="k">StrayPaw Academy · workshops</p><h1>Learn by doing.</h1><p>Choose a session. Work through one activity at a time, together.</p></header>
    <section className="workshop-studio" aria-label="Workshop facilitator">
      <label className="field studio-picker"><span className="label">Your session</span><select className="select" value={plan} onChange={e => { setPlan(Number(e.target.value)); move(0); }}>{PLANS.map((x,i) => <option key={x.id} value={i}>{x.title} · {x.minutes} min</option>)}</select></label>
      <header className="studio-heading"><h2>{p.title}</h2><p>{p.who} · {p.minutes} minutes</p><p className="studio-safe-note">Facilitator-led. Children need a teacher present. No animal contact; practice stays in this session.</p></header>
      <div className="studio-progress" aria-label={`Activity ${step+1} of ${p.steps.length}`}>{p.steps.map((x,i) => <button type="button" key={i} aria-current={step===i ? "step" : undefined} onClick={() => move(i)} aria-label={`Activity ${i+1}, ${x.m} minutes`}><span>{i+1}</span><i /></button>)}</div>
      {finished ? <div className="studio-finish" role="status"><Check size={32} aria-hidden /><h3>Take it beyond the session.</h3><p>Ask each learner to name one observation they can support and one action they will take differently.</p><Link className="btn is-ink" href="/learn/resources">Practise a report</Link><button type="button" className="btn" onClick={() => move(0)}><RotateCcw size={16} aria-hidden /> Run again</button></div> : <div className="studio-activity" key={`${p.id}-${step}`}>
        <p className="studio-time">Activity {step+1} of {p.steps.length} · {activity.m} minutes{complete && <span>Exercise completed</span>}</p>
        <h3>{"l" in activity ? activity.l.title : step===0 ? "Start the conversation" : "Bring it together"}</h3>
        {"l" in activity ? <><p className="studio-prompt">{exercise?.kind === "do" ? exercise.prompt : activity.l.takeaway}</p>{exercise?.kind === "do" && <Exercise id={exercise.id} onDone={() => setComplete(true)} />}<MobileDetails label="Facilitator background"><div className="studio-background">{activity.l.blocks.filter(b => b.kind !== "do").map((b,i) => <p key={i}>{"body" in b ? b.body : null}</p>)}<Link className="link" href={`/learn/courses/${activity.c.id}/${activity.l.id}`}>Open the full lesson</Link></div></MobileDetails></> : <p className="studio-prompt">{activity.t}</p>}
      </div>}
      {!finished && <nav className="studio-controls" aria-label="Workshop activities"><button type="button" className="btn" disabled={step===0} onClick={() => move(step-1)}><ArrowLeft size={16} aria-hidden />Back</button><button type="button" className="btn is-ink" onClick={() => step===p.steps.length-1 ? setFinished(true) : move(step+1)}>{step===p.steps.length-1 ? "Finish session" : "Next activity"}<ArrowRight size={16} aria-hidden /></button></nav>}
      <MobileDetails label="Session plan and safeguarding" className="studio-plan"><ol>{p.steps.map((s,i) => <li key={i}><b>{s.m} min</b><span>{"l" in s ? s.l.title : s.t}</span></li>)}</ol><ul className="studio-safeguarding"><li>Never bring a street animal into a classroom or ask children to approach, feed or touch one.</li><li>Do not collect children’s home locations or photographs for these activities.</li><li>Practice reports stay practice. Real reports are made by an adult in the Report flow.</li><li>If a child mentions a bite, follow the school’s first-aid procedure and seek medical care promptly.</li></ul></MobileDetails>
    </section>
    <KindHourLibrary />
  </div>;
}
