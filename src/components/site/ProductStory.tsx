"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import type { Dog } from "@/lib/types";

const VIEWS = [
  {
    eyebrow: "A sighting becomes a record",
    title: "What you saw stays findable.",
    body: "A neighbour adds only what they know. The photo, place and visible details stay together, ready for the next person who sees the same animal.",
    Icon: MapPin,
  },
  {
    eyebrow: "A record carries context",
    title: "The next visit starts somewhere.",
    body: "Feeders and local carers can return to a dog, note routine or care status, and avoid rebuilding the story from memory each time.",
    Icon: UsersRound,
  },
  {
    eyebrow: "Context becomes field work",
    title: "Teams can turn a sighting into responsibility.",
    body: "An organisation sees what needs review, creates a case when needed, and records the work against the animal—not as an anonymous total.",
    Icon: ShieldCheck,
  },
] as const;

/** One small, calm scroll sequence. It opens the same record through the
 * people who use it rather than cycling through generic product screens. */
export function ProductStory({ dogs: _dogs }: { dogs: Dog[] }) {
  const section = useRef<HTMLElement>(null);
  const [view, setView] = useState(0);

  useEffect(() => {
    const update = () => {
      const node = section.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const progress = Math.max(0, Math.min(0.999, -rect.top / Math.max(rect.height - innerHeight, 1)));
      setView(Math.min(VIEWS.length - 1, Math.floor(progress * VIEWS.length)));
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => { removeEventListener("scroll", update); removeEventListener("resize", update); };
  }, []);

  const active = VIEWS[view];
  return (
    <section ref={section} className="product-story product-record-story" data-view={view} aria-label="How a StrayPaw record supports people in the field">
      <div className="product-story-sticky">
        <header className="product-story-copy">
          <span className="field-eyebrow">{active.eyebrow}</span>
          <h2>{active.title}</h2>
          <p>{active.body}</p>
          <div className="record-story-rail" aria-label={`View ${view + 1} of ${VIEWS.length}`}>
            {VIEWS.map((item, index) => <button key={item.title} type="button" aria-label={item.eyebrow} className={index === view ? "on" : ""} onClick={() => setView(index)}><item.Icon size={15} /><span>{item.eyebrow}</span></button>)}
          </div>
        </header>

        <div className="record-story-surface" aria-live="polite">
          <div className="record-story-grid" aria-hidden />
          <div className="record-story-record">
            <header><span>FIELD RECORD</span><span className="record-story-dot">Active</span></header>
            <div className="record-story-profile"><div className="record-story-avatar"><Crosshair size={21} /></div><div><span>STREET ANIMAL</span><b>Known by place, not a guess</b></div></div>
            <dl>
              <div><dt>Latest sighting</dt><dd><MapPin size={13} /> Pin confirmed</dd></div>
              <div><dt>Visible identifiers</dt><dd>Photo · notes · care status</dd></div>
              <div><dt>History</dt><dd>Kept with this record</dd></div>
            </dl>
          </div>

          <div className="record-story-layer record-story-neighbour"><span>NEIGHBOUR</span><b>Photo saved</b><small><Check size={13} /> Location added</small></div>
          <div className="record-story-layer record-story-feeder"><span>LOCAL CARE</span><b>Return to this dog</b><small><Check size={13} /> Routine remembered</small></div>
          <div className="record-story-layer record-story-team"><span>FIELD TEAM</span><b>Ready for review</b><small><Check size={13} /> Case can be opened</small></div>
          <p className="record-story-footer">The same record, opened at the right depth for each person.</p>
        </div>
      </div>
    </section>
  );
}
