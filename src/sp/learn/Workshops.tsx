"use client";

/* ════════════════════════════════════════════════════════════════════
   Workshops: choose a session, then run it one activity at a time.

   The facilitator sees where the group is (a numbered track), the one
   thing to do now (a prompt and, for a lesson, its exercise on screen),
   and Back / Next. Background for the facilitator, the full plan and the
   safeguarding rules are one tap away, never in the way. Each session
   ends with a closing question and suggests The Kind Hour Foundation's
   documents to teach alongside it.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, RotateCcw, Users } from "lucide-react";
import { PLANS } from "./workshop-plans";
import { Exercise } from "./Interactives";
import { KindHourLibrary } from "./KindHourLibrary";
import { MobileDetails } from "../ui/MobileDetails";
import "./learn.css";
import "./academy.css";

export function Workshops() {
  const [plan, setPlan] = useState(0);
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [finished, setFinished] = useState(false);
  const p = PLANS[plan], activity = p.steps[step];
  const exercise = "l" in activity ? activity.l.blocks.find((b) => b.kind === "do") : null;
  const move = (n: number) => { setStep(n); setComplete(false); setFinished(false); };
  const title = "l" in activity ? activity.l.title : step === 0 ? "Start the conversation" : "Bring it together";
  return (
    <div className="acx">
      <header className="acx-cover is-slim">
        <p className="acx-k">StrayPaw Academy · workshops</p>
        <h1>Run a session.</h1>
        <p className="acx-lede">Pick a session for your group, then lead it one activity at a time. Every exercise works on a projector or a single phone.</p>
      </header>

      <section className="wsx" aria-labelledby="wsx-pick">
        <h2 id="wsx-pick" className="sr-only">Choose a session</h2>
        <div className="wsx-pick" role="radiogroup" aria-label="Sessions">
          {PLANS.map((x, i) => (
            <button key={x.id} type="button" role="radio" aria-checked={plan === i} onClick={() => { setPlan(i); move(0); }}>
              <b>{x.title}</b>
              <span><Users size={14} aria-hidden />{x.who}</span>
              <span><Clock size={14} aria-hidden />{x.minutes} minutes · {x.steps.length} activities</span>
            </button>
          ))}
        </div>

        <div className="wsx-run">
          <ol className="wsx-track" aria-label={`${p.title}: activity ${step + 1} of ${p.steps.length}`}>
            {p.steps.map((x, i) => (
              <li key={i} className={finished || i < step ? "is-past" : i === step ? "is-now" : ""}>
                <button type="button" onClick={() => move(i)} aria-current={!finished && step === i ? "step" : undefined} aria-label={`Activity ${i + 1}: ${"l" in x ? x.l.title : i === 0 ? "Start the conversation" : "Bring it together"}, ${x.m} minutes`}>
                  <span>{finished || i < step ? <Check size={14} aria-hidden /> : i + 1}</span>
                </button>
              </li>
            ))}
          </ol>

          {finished ? (
            <div className="wsx-card is-finish" role="status">
              <p className="wsx-time">Session complete</p>
              <h3>Take it beyond the room.</h3>
              <p className="wsx-prompt">Ask each person to name one observation they can support and one thing they will do differently.</p>
              <div className="wsx-row"><Link className="btn is-ink" href="/learn/resources">Practise a report</Link><button type="button" className="btn" onClick={() => move(0)}><RotateCcw size={16} aria-hidden /> Run it again</button></div>
            </div>
          ) : (
            <div className="wsx-card" key={`${p.id}-${step}`}>
              <p className="wsx-time">Activity {step + 1} of {p.steps.length} · {activity.m} minutes{complete && <span className="pill is-care"><Check size={12} aria-hidden /> Exercise done</span>}</p>
              <h3>{title}</h3>
              {"l" in activity ? (
                <>
                  <p className="wsx-prompt">{exercise?.kind === "do" ? exercise.prompt : activity.l.takeaway}</p>
                  {exercise?.kind === "do" && <div className="wsx-ex"><Exercise id={exercise.id} onDone={() => setComplete(true)} /></div>}
                  <MobileDetails label="Background for the facilitator" className="wsx-fold">
                    <div className="wsx-bg">{activity.l.blocks.filter((b) => b.kind !== "do").map((b, i) => <p key={i}>{"body" in b ? b.body : null}</p>)}<p className="wsx-take"><b>What to remember</b>{activity.l.takeaway}</p><Link className="link" href={`/learn/courses/${activity.c.id}/${activity.l.id}`}>Open the full lesson</Link></div>
                  </MobileDetails>
                </>
              ) : <p className="wsx-prompt">{activity.t}</p>}
            </div>
          )}

          {!finished && (
            <nav className="wsx-nav" aria-label="Workshop activities">
              <button type="button" className="btn" disabled={step === 0} onClick={() => move(step - 1)}><ArrowLeft size={16} aria-hidden />Back</button>
              <button type="button" className="btn is-ink" onClick={() => (step === p.steps.length - 1 ? setFinished(true) : move(step + 1))}>{step === p.steps.length - 1 ? "Finish the session" : "Next activity"}<ArrowRight size={16} aria-hidden /></button>
            </nav>
          )}

          <MobileDetails label="Full plan and safeguarding" className="wsx-fold wsx-plan">
            <ol>{p.steps.map((s, i) => <li key={i}><b>{s.m} min</b><span>{"l" in s ? s.l.title : s.t}</span></li>)}</ol>
            <ul className="wsx-safe">
              <li>Never bring a street animal into a classroom or ask children to approach, feed or touch one.</li>
              <li>Do not collect children’s home locations or photographs for these activities.</li>
              <li>Practice reports stay practice. Real reports are made by an adult in the Report flow.</li>
              <li>If a child mentions a bite, follow the school’s first-aid procedure and seek medical care promptly.</li>
            </ul>
          </MobileDetails>
        </div>
      </section>

      <KindHourLibrary ids={p.docs} title={`Pair “${p.title}” with`} />
    </div>
  );
}
