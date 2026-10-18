"use client";

/* ════════════════════════════════════════════════════════════════════
   One message, one record. A resident's WhatsApp messages fly, one by
   one, out of the conversation and into the fields of a StrayPaw record
   (a shared-element flight, measured on screen each time); the record
   becomes a case, a Madhubani border is drawn round it, and the team's
   replies fly back the other way into the chat. Then the page folds
   over to the animal's history, and again to its area.

   The steps come from scroll; the flights run once per step forward.
   The conversation and the case are an example; the flow is the product.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useLayoutEffect, useRef } from "react";
import { Camera, CheckCheck, MapPin } from "lucide-react";
import { useStage } from "./stage";

const STEPS = [
  { t: "Message", n: "A resident writes to the rescue line on WhatsApp. It lands as a report, not a lost chat." },
  { t: "Photo", n: "The photo goes on the report. A picture that may show an injury stays veiled." },
  { t: "Place", n: "The pin becomes an area, never a home address." },
  { t: "Case", n: "Triage makes it a case: urgent, with a code, one record from here on." },
  { t: "Owner", n: "Someone holds it. The resident hears back on the same chat." },
  { t: "Care", n: "Treatment is recorded, a recheck is scheduled, and the resident is told." },
  { t: "History", n: "The care stays with the animal, for whoever helps it next." },
  { t: "Area", n: "And it counts where it happened, so the city can see where help is needed." },
];
export const RELAY_STEPS = STEPS.length;

/* What flies where, and when. Forward flights go chat → record; replies go record → chat. */
const FLIGHTS: { at: number; from: string; to: string; label: string }[] = [
  { at: 0, from: "b-m1", to: "f-report", label: "Brown dog, back leg bleeding" },
  { at: 1, from: "b-m2", to: "f-photo", label: "1 photo · veiled" },
  { at: 2, from: "b-m3", to: "f-place", label: "Gandhipuram · area" },
  { at: 4, from: "f-held", to: "b-r1", label: "A team is on the way." },
  { at: 5, from: "f-care", to: "b-r2", label: "Treated. Recheck on Friday." },
];

export function Relay() {
  const { step, still } = useStage();
  const root = useRef<HTMLDivElement>(null);
  const prev = useRef(step);
  const chat = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const was = prev.current; prev.current = step;
    const box = root.current; if (!box || still || step <= was || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const base = box.getBoundingClientRect();
    for (const f of FLIGHTS.filter((x) => x.at > was && x.at <= step)) {
      const a = box.querySelector(`[data-k="${f.from}"]`), b = box.querySelector(`[data-k="${f.to}"]`); if (!a || !b) continue;
      const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
      const ghost = document.createElement("span");
      ghost.className = "mx-ghost"; ghost.textContent = f.label;
      box.appendChild(ghost);
      const gw = ghost.offsetWidth, gh = ghost.offsetHeight;
      const x1 = r1.left - base.left + r1.width / 2 - gw / 2, y1 = r1.top - base.top + r1.height / 2 - gh / 2;
      const x2 = r2.left - base.left + 8, y2 = r2.top - base.top + r2.height / 2 - gh / 2;
      const lift = Math.min(y1, y2) - 70;
      ghost.animate([
        { transform: `translate(${x1}px, ${y1}px) scale(0.9)`, opacity: 0 },
        { transform: `translate(${x1}px, ${y1}px) scale(1)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${(x1 + x2) / 2}px, ${lift}px) scale(1.06) rotate(${x2 > x1 ? 4 : -4}deg)`, offset: 0.55 },
        { transform: `translate(${x2}px, ${y2}px) scale(1)`, opacity: 1, offset: 0.92 },
        { transform: `translate(${x2}px, ${y2}px) scale(0.96)`, opacity: 0 },
      ], { duration: 980, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }).finished.then(() => ghost.remove(), () => ghost.remove());
    }
  }, [step, still]);

  useEffect(() => { const c = chat.current; if (c) c.scrollTo({ top: c.scrollHeight, behavior: "smooth" }); }, [step]);
  const on = (k: number) => (step >= k ? " is-on" : "");

  return (
    <div className="mx" ref={root} data-step={step}>
      <section className="mx-phone" aria-label="WhatsApp conversation, an example">
        <header><i aria-hidden>SP</i><span><b>StrayPaw Rescue</b><small>WhatsApp · example conversation</small></span></header>
        <ol ref={chat} aria-live="polite">
          <li className={`is-them${on(0)}`} data-k="b-m1"><p>Hi, there&rsquo;s a brown dog near the bus stand. Its back leg is bleeding.</p><small>8:42</small></li>
          <li className={`is-them${on(1)}`} data-k="b-m2"><p className="mx-photo"><Camera size={15} aria-hidden /> Photo · may show an injury</p><small>8:43</small></li>
          <li className={`is-them${on(2)}`} data-k="b-m3"><p className="mx-pin"><MapPin size={15} aria-hidden /> Gandhipuram bus stand</p><small>8:43</small></li>
          <li className={`is-us${on(4)}`} data-k="b-r1"><p>Thank you. A team is on the way.</p><small>8:51 <CheckCheck size={13} aria-hidden /></small></li>
          <li className={`is-us${on(5)}`} data-k="b-r2"><p>The dog is being treated. We&rsquo;ll check on it again on Friday.</p><small>13:10 <CheckCheck size={13} aria-hidden /></small></li>
        </ol>
      </section>

      <div className="mx-desk" data-page={step >= 7 ? "area" : step >= 6 ? "life" : "case"}>
        <article className={`mx-rec${step >= 3 ? " is-case" : ""}`} aria-label="The same report in StrayPaw">
          <i className="mx-border" aria-hidden />
          <div className="mx-head">
            <span className={`mx-chip${step >= 3 ? " is-urgent" : ""}`}>{step >= 3 ? "Urgent" : "New · WhatsApp"}</span>
            <code>{step >= 3 ? "Case SP-24117" : "Report"}</code>
            <span className="mx-time">8:42</span>
          </div>
          <dl className="mx-fields">
            <div className={`is-wide${on(0)}`} data-k="f-report"><dt>Report</dt><dd>{step >= 3 ? "Leg wound, cannot bear weight" : "Brown dog, back leg bleeding"}</dd></div>
            <div className={on(1)} data-k="f-photo"><dt>Photo</dt><dd>1, veiled</dd></div>
            <div className={on(2)} data-k="f-place"><dt>Place</dt><dd>Gandhipuram · area</dd></div>
            <div className={on(4)} data-k="f-held"><dt>Held by</dt><dd>{step >= 4 ? "Field team" : "Nobody yet"}</dd></div>
            <div className={on(5)} data-k="f-care"><dt>Care</dt><dd>{step >= 5 ? "Wound cleaned, dressed" : "—"}</dd></div>
            <div className={`is-wide${on(5)}`}><dt>Next</dt><dd>{step >= 5 ? "Recheck, Friday" : "—"}</dd></div>
          </dl>
          <p className="mx-stamp" aria-hidden>Case</p>
        </article>

        <article className="mx-life" aria-label="The animal's history, an example">
          <header><span className="mx-plate" aria-hidden /><div><b>SP-D-7KQ2</b><small>Male · adult · Gandhipuram · example</small></div></header>
          <ol>
            <li><time>Mar 2025</time><span>First on the record, a sighting</span></li>
            <li><time>Aug 2025</time><span>Sterilised, ear notched</span></li>
            <li className="is-now"><time>Today</time><span>Leg wound treated · case SP-24117</span></li>
            <li className="is-next"><time>Friday</time><span>Recheck due</span></li>
          </ol>
        </article>

        <article className="mx-area" aria-label="Open requests by area, an example">
          <svg viewBox="0 0 320 190" aria-hidden>
            {[[54, 58, 15], [104, 104, 22], [168, 52, 12], [214, 116, 27, 1], [266, 62, 14], [148, 158, 10], [40, 136, 9], [282, 150, 12]].map(([x, y, r, hot], i) => (
              <g key={i}><circle cx={x} cy={y} r={r} className={hot ? "mx-c is-hot" : "mx-c"} />{hot ? <circle cx={x} cy={y} r={r + 9} className="mx-ring" /> : null}</g>
            ))}
          </svg>
          <dl><div><dt>Gandhipuram</dt><dd>3 open · 1 treated today</dd></div><div><dt>Precision</dt><dd>An area of about 0.7 km², never an address</dd></div></dl>
        </article>
      </div>

      <div className="mx-rail">
        <ol aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].t}`}>
          {STEPS.map((s, i) => <li key={s.t} className={i < step ? "is-done" : i === step ? "is-now" : ""}>{s.t}</li>)}
        </ol>
        <p aria-live="polite">{STEPS[step].n}</p>
      </div>
    </div>
  );
}
