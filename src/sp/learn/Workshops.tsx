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
import { useEffect, useRef, useState } from "react";
import { Check, Clock, Users } from "lucide-react";
import { PLANS } from "./workshop-plans";
import { Exercise } from "./Interactives";
import { KindHourLibrary } from "./KindHourLibrary";
import { MobileDetails } from "../ui/MobileDetails";
import "./learn.css";
import "./academy.css";

export function Workshops() {
  const [plan, setPlan] = useState(0);
  const [now, setNow] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const p = PLANS[plan];
  const run = useRef<HTMLDivElement>(null);
  const titleOf = (i: number) => { const a = p.steps[i]; return "l" in a ? a.l.title : i === 0 ? "Start the conversation" : "Bring it together"; };

  /* The activity nearest the upper part of the screen is the current one. */
  useEffect(() => {
    const root = run.current; if (!root) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setNow(Number((e.target as HTMLElement).dataset.i));
    }, { rootMargin: "-35% 0px -60% 0px" });
    root.querySelectorAll<HTMLElement>("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [plan]);

  const choose = (i: number) => { setPlan(i); setNow(0); setDone(new Set()); };
  const last = p.steps.length;
  return (
    <div className="acx">
      <header className="acx-cover is-slim">
        <p className="acx-k">StrayPaw Academy · workshops</p>
        <h1>Run a session.</h1>
        <p className="acx-lede">Pick a session, then scroll through it with your group. Every exercise works on a projector or a single phone.</p>
      </header>

      <section className="wsx" aria-labelledby="wsx-pick">
        <h2 id="wsx-pick" className="sr-only">Choose a session</h2>
        <div className="wsx-pick" role="radiogroup" aria-label="Sessions">
          {PLANS.map((x, i) => (
            <button key={x.id} type="button" role="radio" aria-checked={plan === i} onClick={() => choose(i)}>
              <b>{x.title}</b>
              <span><Users size={14} aria-hidden />{x.who}</span>
              <span><Clock size={14} aria-hidden />{x.minutes} minutes · {x.steps.length} activities</span>
            </button>
          ))}
        </div>

        <div className="wsx-run" ref={run} key={p.id}>
          <ol className="wsx-track" aria-label={`${p.title}: where the group is`}>
            {[...p.steps.map((_, i) => i), last].map((i) => (
              <li key={i} className={i < now ? "is-past" : i === now ? "is-now" : ""}>
                <a href={`#act-${p.id}-${i}`} aria-current={i === now ? "step" : undefined} aria-label={i === last ? "Close the session" : `Activity ${i + 1}: ${titleOf(i)}`}>
                  <span>{i === last ? <Check size={14} aria-hidden /> : done.has(i) || i < now ? <Check size={14} aria-hidden /> : i + 1}</span>
                </a>
              </li>
            ))}
          </ol>

          {p.steps.map((activity, i) => {
            const exercise = "l" in activity ? activity.l.blocks.find((b) => b.kind === "do") : null;
            return (
              <section key={i} id={`act-${p.id}-${i}`} data-i={i} className={`wsx-card${i === now ? " is-now" : ""}`} aria-labelledby={`act-${p.id}-${i}-t`}>
                <p className="wsx-time">Activity {i + 1} of {p.steps.length} · {activity.m} minutes{done.has(i) && <span className="pill is-care"><Check size={12} aria-hidden /> Exercise done</span>}</p>
                <h3 id={`act-${p.id}-${i}-t`}>{titleOf(i)}</h3>
                {"l" in activity ? (
                  <>
                    <p className="wsx-prompt">{exercise?.kind === "do" ? exercise.prompt : activity.l.takeaway}</p>
                    {exercise?.kind === "do" && <div className="wsx-ex"><Exercise id={exercise.id} onDone={() => setDone((d) => new Set(d).add(i))} /></div>}
                    <MobileDetails label="Background for the facilitator" className="wsx-fold">
                      <div className="wsx-bg">{activity.l.blocks.filter((b) => b.kind !== "do").map((b, k) => <p key={k}>{"body" in b ? b.body : null}</p>)}<p className="wsx-take"><b>What to remember</b>{activity.l.takeaway}</p><Link className="link" href={`/learn/courses/${activity.c.id}/${activity.l.id}`}>Open the full lesson</Link></div>
                    </MobileDetails>
                  </>
                ) : <p className="wsx-prompt">{activity.t}</p>}
              </section>
            );
          })}

          <section id={`act-${p.id}-${last}`} data-i={last} className={`wsx-card is-finish${now === last ? " is-now" : ""}`} aria-labelledby="wsx-close">
            <p className="wsx-time">To close</p>
            <h3 id="wsx-close">Take it beyond the room.</h3>
            <p className="wsx-prompt">Ask each person to name one observation they can support and one thing they will do differently.</p>
            <div className="wsx-row"><Link className="btn is-ink" href="/learn/resources">Practise a report</Link></div>
          </section>

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
