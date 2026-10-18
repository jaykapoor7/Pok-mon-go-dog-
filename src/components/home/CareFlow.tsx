"use client";

/* ════════════════════════════════════════════════════════════════════
   WhatsApp → CareOS: how a message becomes work.

   Left, a resident's WhatsApp conversation; right, the same report in the
   NGO workspace. Each step advances both sides together: the message
   arrives in the inbox, the photo and the place attach, the NGO opens a
   case and assigns it, care is recorded, a follow-up is set, and the
   animal's record carries the line. The conversation is an example (no
   real person, no real case); the workspace states are the product's own.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { CheckCheck, MapPin, Camera } from "lucide-react";
import { useSceneStep } from "./Scene";

type Msg = { from: "them" | "us"; text?: string; photo?: boolean; place?: string; at: string };
const STEPS: { msgs: Msg[]; title: string; note: string }[] = [
  { msgs: [{ from: "them", text: "Hi, there is a brown dog near the bus stand. Its back leg is bleeding.", at: "8:42" }], title: "A message arrives", note: "Into the organisation's inbox." },
  { msgs: [{ from: "them", photo: true, at: "8:43" }, { from: "them", place: "Gandhipuram bus stand", at: "8:43" }], title: "Photo and place", note: "Attached to the report." },
  { msgs: [{ from: "them", text: "It can't put weight on the leg. It has been here since morning.", at: "8:45" }], title: "Triage", note: "Urgent. A case is opened." },
  { msgs: [{ from: "us", text: "Thank you. A team from the rescue is on the way.", at: "8:51" }], title: "Assigned", note: "The case has an owner." },
  { msgs: [{ from: "us", text: "The dog is being treated. We'll check on it again on Friday.", at: "13:10" }], title: "Treated", note: "Care recorded. Follow-up set." },
  { msgs: [], title: "On the record", note: "For whoever helps it next." },
];

export const CARE_STEPS = STEPS.length;

/* The step comes from the scroll scene around it: reading down the page plays the story. */
export function CareFlow() {
  const step = useSceneStep();
  const chat = useRef<HTMLOListElement>(null);
  const shown = STEPS.slice(0, step + 1).flatMap((s) => s.msgs);
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
          <header><b>Inbox</b><span className="cf-pill">WhatsApp</span><span className="cf-step-t">{STEPS[step].title}</span></header>
          <article className={`cf-ticket${step >= 2 ? " is-case" : ""}`}>
            <div className="cf-row">
              <span className={`cf-badge${step >= 2 ? " is-urgent" : ""}`}>{step >= 2 ? "Urgent" : "New"}</span>
              <span className="cf-code">{step >= 2 ? "Case SP-24117" : "Message"}</span>
              <span className="cf-ago">8:42</span>
            </div>
            <b className="cf-t">{step >= 2 ? "Leg wound, cannot bear weight" : "Brown dog, back leg bleeding"}</b>
            <dl className="cf-facts">
              <div className={step >= 1 ? "is-on" : ""}><dt>Place</dt><dd>{step >= 1 ? "Gandhipuram · area" : "Not yet"}</dd></div>
              <div className={step >= 1 ? "is-on" : ""}><dt>Photo</dt><dd>{step >= 1 ? "1, veiled" : "Not yet"}</dd></div>
              <div className={step >= 3 ? "is-on" : ""}><dt>Held by</dt><dd>{step >= 3 ? "Field team" : "Nobody yet"}</dd></div>
              <div className={step >= 4 ? "is-on" : ""}><dt>Next</dt><dd>{step >= 4 ? "Recheck, Friday" : "—"}</dd></div>
            </dl>
          </article>
          <ol className="cf-history" aria-label="The animal's record">
            {[["Reported on WhatsApp", 0], ["Case opened, urgent", 2], ["Assigned to the field team", 3], ["Wound care recorded", 4], ["Follow-up scheduled", 4]].map(([t, at]) => (
              <li key={t as string} className={step >= (at as number) ? "is-on" : ""}>{t}</li>
            ))}
          </ol>
        </section>
      </div>

      <ol className="cf-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((x, i) => <li key={x.title} aria-current={i === step ? "step" : undefined}><span>{x.title}</span></li>)}
      </ol>
      <p className="cf-note" aria-live="polite"><b>{STEPS[step].title}.</b> {STEPS[step].note}</p>
    </div>
  );
}
