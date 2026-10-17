/* ════════════════════════════════════════════════════════════════════
   Education · Workshops: run a session (decision 032).

   Two shelves, kept apart so authorship is never blurred:
     · session plans written by StrayPaw from its own Academy lessons,
       with timings, materials and safeguarding;
     · classroom material by The Kind Hour Foundation, credited, linked to
       the source files, with StrayPaw's facilitation notes labelled as
       ours. Their decks are not rewritten here.
   Classroom work never becomes a live report.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { EDUCATION_PARTNERS, KIND_HOUR_MATERIALS } from "@/lib/platform/education";
import { ArtSlot } from "../ui";
import { COURSES } from "./content";
import { PrintButton } from "./PrintButton";
import "./learn.css";

const lesson = (c: string, l: string) => { const x = COURSES.find((k) => k.id === c)!; return { c: x, l: x.lessons.find((k) => k.id === l)! }; };
const PLANS = [
  { id: "safe-street", title: "Safe around street dogs", who: "Classes 3 to 8, with a teacher present", minutes: 45, steps: [
    { m: 5, t: "Ask: which dogs live near our school? What do they do all day? Write words on the board; no names of children's homes." },
    { m: 12, ...lesson("on-the-street", "a-calm-encounter") },
    { m: 12, ...lesson("on-the-street", "after-a-bite") },
    { m: 10, ...lesson("on-the-street", "observe-dont-assume") },
    { m: 6, t: "Close: each child says one thing they will do differently. Share the helpline card." },
  ] },
  { id: "read-the-map", title: "Reading a map of animals", who: "Senior school, college, council staff", minutes: 60, steps: [
    { m: 5, t: "Show a city on the StrayPaw map. Ask: what does an empty area mean?" },
    { m: 15, ...lesson("reading-the-record", "unknown-is-not-zero") },
    { m: 12, ...lesson("reading-the-record", "areas-not-spots") },
    { m: 10, ...lesson("reading-the-record", "count-the-right-thing") },
    { m: 13, ...lesson("how-populations-change", "a-number-needs-a-whole") },
    { m: 5, t: "Close: open one city's Insights and find a finding's limit together." },
  ] },
  { id: "volunteer-start", title: "First evening for new volunteers", who: "Adults joining an organisation", minutes: 50, steps: [
    { m: 10, ...lesson("on-the-street", "observe-dont-assume") },
    { m: 15, ...lesson("reporting-well", "practice-report") },
    { m: 15, ...lesson("how-populations-change", "a-model-street") },
    { m: 10, t: "Close: walk through what happens after a real report, from received to accepted, using the organisation's own queue." },
  ] },
];

export function Workshops() {
  const kh = EDUCATION_PARTNERS.find((p) => p.id === "the-kind-hour-foundation")!;
  return (
    <div className="ac">
      <header className="ac-cover is-slim">
        <div className="ac-title">
          <p className="k">Education · workshops</p>
          <h1 className="display">Run a session</h1>
          <p className="lede">Plans you can teach from tomorrow, and real classroom material from an organisation that has taught it for years.</p>
          <div className="row no-print"><PrintButton /></div>
        </div>
        <ArtSlot id="workshop-scenes" />
      </header>

      <section className="ws-sec">
        <h2 className="h2">Session plans <small className="small">written by StrayPaw from the Academy lessons</small></h2>
        <div className="ws-plans">
          {PLANS.map((p) => (
            <article key={p.id} className="ws-plan">
              <p className="k">{p.minutes} minutes · {p.who}</p>
              <h3 className="serif">{p.title}</h3>
              <ol className="ws-run">
                {p.steps.map((s, i) => <li key={i}><span className="mono">{s.m}′</span>{"l" in s ? <span><Link className="link" href={`/learn/courses/${s.c.id}/${s.l.id}`}>{s.l.title}</Link><small> · from {s.c.title}. Remember: {s.l.takeaway}</small></span> : <span>{s.t}</span>}</li>)}
              </ol>
            </article>
          ))}
        </div>
        <div className="ws-safe">
          <h3 className="h3">Safeguarding, every session</h3>
          <ul>
            <li>Never bring a street animal into a classroom or ask children to approach, feed or touch one.</li>
            <li>Photographs of children need the school&rsquo;s and guardians&rsquo; consent; none are needed to run these plans.</li>
            <li>Practice reports stay practice. Real reports are made by an adult, about a real animal, in the Report flow.</li>
            <li>If a child mentions a bite, follow the school&rsquo;s first-aid procedure and the after-a-bite steps the same day.</li>
          </ul>
        </div>
      </section>

      <section className="ws-sec">
        <h2 className="h2">From {kh.name} <small className="small">{kh.city} · their material, their words</small></h2>
        <p className="body ws-credit">{kh.summary} <a className="link" href={kh.url} target="_blank" rel="noreferrer">{kh.source} <ExternalLink size={12} aria-hidden /></a></p>
        <ul className="ws-decks">
          {KIND_HOUR_MATERIALS.map((m) => (
            <li key={m.id} className={m.id === "hello" ? "is-sensitive" : ""}>
              <div><b className="serif">{m.title}</b><small>{m.audience} · {m.slides} slides · {m.languages}</small></div>
              <p>{m.purpose}</p>
              <p className="ws-note"><b>StrayPaw&rsquo;s note for facilitators:</b> {m.facilitatorNote}</p>
              <a className="btn is-s" href={m.driveUrl} target="_blank" rel="noreferrer">Open the original <ExternalLink size={13} aria-hidden /></a>
            </li>
          ))}
        </ul>
        <p className="small">Decks open on The Kind Hour Foundation&rsquo;s shared drive. StrayPaw links to them and does not host, edit or claim them.</p>
      </section>
    </div>
  );
}
