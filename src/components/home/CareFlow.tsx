"use client";

/* ════════════════════════════════════════════════════════════════════
   One continuous system: Message → Case → Assignment → Care → Animal
   history → City intelligence.

   Left, a resident's WhatsApp conversation; right, the same report in
   StrayPaw. Scrolling plays the story (the step comes from the scroll
   scene): the message opens a case, the case gets an owner, care is
   recorded, the animal's history carries it, and the city view counts
   it in its area. The workspace turns to each view in 3D, the way the
   record moves between them. The conversation is an example: no real
   person, no real case.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { CheckCheck, MapPin, Camera } from "lucide-react";
import { useSceneStep } from "./Scene";

type Msg = { from: "them" | "us"; text?: string; photo?: boolean; place?: string; at: string };
const STEPS: { msgs: Msg[]; title: string; note: string; view: "inbox" | "animal" | "city" }[] = [
  { view: "inbox", title: "Message", note: "A resident reports on WhatsApp. It lands in the organisation's inbox.", msgs: [{ from: "them", text: "Hi, there is a brown dog near the bus stand. Its back leg is bleeding.", at: "8:42" }, { from: "them", photo: true, at: "8:43" }, { from: "them", place: "Gandhipuram bus stand", at: "8:43" }] },
  { view: "inbox", title: "Case", note: "Triage marks it urgent. One case, one record, from here on.", msgs: [{ from: "them", text: "It can't put weight on the leg.", at: "8:45" }] },
  { view: "inbox", title: "Assignment", note: "The case has an owner. The reporter hears back.", msgs: [{ from: "us", text: "Thank you. A team is on the way.", at: "8:51" }] },
  { view: "inbox", title: "Care", note: "Wound care is recorded. A recheck is scheduled.", msgs: [{ from: "us", text: "The dog is being treated. We'll check on it again on Friday.", at: "13:10" }] },
  { view: "animal", title: "Animal history", note: "The care lives on the animal, for whoever helps it next.", msgs: [] },
  { view: "city", title: "City intelligence", note: "The case counts in its area, never at an address.", msgs: [] },
];
export const CARE_STEPS = STEPS.length;

export function CareFlow() {
  const step = useSceneStep();
  const chat = useRef<HTMLOListElement>(null);
  const shown = STEPS.slice(0, step + 1).flatMap((s) => s.msgs);
  const view = STEPS[step].view;
  useEffect(() => { const c = chat.current; if (c) c.scrollTop = c.scrollHeight; }, [step]);

  return (
    <div className="cf">
      <div className="cf-stage" data-step={step}>
        <section className="cf-phone" aria-label="WhatsApp conversation, an example">
          <header><i aria-hidden>SP</i><span><b>StrayPaw · Rescue line</b><small>Example conversation</small></span></header>
          <ol ref={chat} aria-live="polite">
            {shown.map((m, i) => (
              <li key={i} className={`is-${m.from}`}>
                {m.text && <p>{m.text}</p>}
                {m.photo && <p className="cf-photo"><Camera size={15} aria-hidden /> Photo · may show an injury</p>}
                {m.place && <p className="cf-place"><MapPin size={15} aria-hidden /> {m.place}</p>}
                <small>{m.at}{m.from === "us" && <CheckCheck size={13} aria-hidden />}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="cf-work" aria-label="The same report in StrayPaw">
          <nav className="cf-views" aria-label="Workspace view">
            {(["inbox", "animal", "city"] as const).map((v) => <span key={v} aria-current={view === v ? "page" : undefined}>{v === "inbox" ? "Work" : v === "animal" ? "Animal" : "City"}</span>)}
          </nav>
          <div className="cf-panes" data-view={view}>
            <div className="cf-pane is-inbox" aria-hidden={view !== "inbox"}>
              <article className={`cf-ticket${step >= 1 ? " is-case" : ""}`}>
                <div className="cf-row">
                  <span className={`cf-badge${step >= 1 ? " is-urgent" : ""}`}>{step >= 1 ? "Urgent" : "New · WhatsApp"}</span>
                  <span className="cf-code">{step >= 1 ? "Case SP-24117" : "Message"}</span>
                  <span className="cf-ago">8:42</span>
                </div>
                <b className="cf-t">{step >= 1 ? "Leg wound, cannot bear weight" : "Brown dog, back leg bleeding"}</b>
                <dl className="cf-facts">
                  <div className="is-on"><dt>Place</dt><dd>Gandhipuram · area</dd></div>
                  <div className="is-on"><dt>Photo</dt><dd>1, veiled</dd></div>
                  <div className={step >= 2 ? "is-on" : ""}><dt>Held by</dt><dd>{step >= 2 ? "Field team" : "Nobody yet"}</dd></div>
                  <div className={step >= 3 ? "is-on" : ""}><dt>Next</dt><dd>{step >= 3 ? "Recheck, Friday" : "—"}</dd></div>
                </dl>
              </article>
              <ol className="cf-history" aria-label="On this case">
                {[["Reported on WhatsApp", 0], ["Case opened, urgent", 1], ["Assigned to the field team", 2], ["Wound care recorded", 3], ["Recheck scheduled for Friday", 3]].map(([t, at]) => (
                  <li key={t as string} className={step >= (at as number) ? "is-on" : ""}>{t}</li>
                ))}
              </ol>
            </div>
            <div className="cf-pane is-animal" aria-hidden={view !== "animal"}>
              <div className="cf-animal-id"><span className="cf-plate" aria-hidden /><div><b>SP-D-7KQ2</b><small>Male · adult · Gandhipuram · example</small></div></div>
              <ol className="cf-life">
                <li><time>Mar 2025</time>First on the record, a sighting</li>
                <li><time>Aug 2025</time>Sterilised, ear notched</li>
                <li className="is-now"><time>Today</time>Leg wound, treated · case SP-24117</li>
                <li className="is-next"><time>Friday</time>Recheck due</li>
              </ol>
            </div>
            <div className="cf-pane is-city" aria-hidden={view !== "city"}>
              <svg viewBox="0 0 320 170" role="img" aria-label="Open requests by area, example">
                {[[60, 60, 16, 0], [110, 100, 22, 0], [170, 55, 12, 0], [215, 110, 26, 1], [262, 62, 14, 0], [150, 140, 10, 0], [40, 125, 9, 0]].map(([x, y, r, hot], i) => (
                  <g key={i}><circle cx={x} cy={y} r={r} className={hot ? "cf-c is-hot" : "cf-c"} />{hot ? <circle cx={x} cy={y} r={r + 7} className="cf-ring" /> : null}</g>
                ))}
              </svg>
              <dl className="cf-facts"><div className="is-on"><dt>Gandhipuram</dt><dd>3 open · 1 treated today</dd></div><div className="is-on"><dt>Precision</dt><dd>Area ≈0.7 km²</dd></div></dl>
            </div>
          </div>
        </section>
      </div>

      <ol className="cf-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((x, i) => <li key={x.title} aria-current={i === step ? "step" : undefined} className={i < step ? "is-done" : ""}><span>{x.title}</span></li>)}
      </ol>
      <p className="cf-note" aria-live="polite">{STEPS[step].note}</p>
    </div>
  );
}
