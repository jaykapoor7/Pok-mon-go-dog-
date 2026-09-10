"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MapPin, Radio, ShieldCheck, CircleDashed } from "lucide-react";
import { FieldMapPreview } from "./FieldMapPreview";
import type { Dog } from "@/lib/types";

const COPY = [
  ["01 / THE MAP", "A moment is given a place.", "A sighting starts on one shared map, with only the details somebody can genuinely see."],
  ["02 / THE RECORD", "A photo becomes something people can return to.", "The report holds the place, visual identifiers, and care status without asking a neighbour to become an expert."],
  ["03 / THE HANDOFF", "The right team can take responsibility.", "Incoming reports, cases, and care history stay connected, so a field visit does not start from a blank page."],
  ["04 / THE INFRASTRUCTURE", "One record joins a clearer national picture.", "Coverage and gaps become visible only where work has actually been recorded. That is the evidence better planning needs."],
] as const;

export function ProductStory({ dogs }: { dogs: Dog[] }) {
  const section = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const update = () => {
      const node = section.current;
      if (!node) return;
      const { top, height } = node.getBoundingClientRect();
      const travelled = Math.max(0, Math.min(1, -top / Math.max(height - window.innerHeight, 1)));
      setStage(Math.min(3, Math.floor(travelled * 4.1)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  const [eyebrow, title, body] = COPY[stage];
  return (
    <section ref={section} className="product-story" data-stage={stage} aria-label="How StrayPaw turns a sighting into coordinated action">
      <div className="product-story-sticky">
        <header className="product-story-copy">
          <span className="field-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{body}</p>
          <div className="product-story-progress" aria-label={`Step ${stage + 1} of 4`}><i className={stage >= 0 ? "on" : ""} /><i className={stage >= 1 ? "on" : ""} /><i className={stage >= 2 ? "on" : ""} /><i className={stage >= 3 ? "on" : ""} /></div>
        </header>
        <div className="product-story-surface">
          <div className="story-map"><FieldMapPreview dogs={dogs} /></div>
          <section className="story-report" aria-label="Sighting report">
            <header><span>NEW SIGHTING</span><b>Report from the street</b></header>
            <div className="story-report-row"><Radio size={16} /><span>Photo added</span><Check size={15} /></div>
            <div className="story-report-row"><MapPin size={16} /><span>Location pinned</span><Check size={15} /></div>
            <div className="story-report-row"><span className="story-status-dot" /><span>Ear-notch: unknown</span><small>Honest is useful</small></div>
            <footer>Save to shared record <Check size={15} /></footer>
          </section>
          <section className="story-dashboard" aria-label="NGO field workspace">
            <header><span>FIELD WORKSPACE</span><b>Incoming / Needs review</b><small>1 report</small></header>
            <div className="story-case"><span className="story-case-mark" /><div><b>New animal record</b><small>Photo · location · observer note</small></div><span>Open</span></div>
            <div className="story-case"><ShieldCheck size={17} /><div><b>Care history</b><small>Ready for the next visit</small></div><span>—</span></div>
          </section>
          <section className="story-nation" aria-label="Evidence view">
            <span>INDIA / COVERAGE VIEW</span>
            <div className="story-nation-map"><FieldMapPreview dogs={dogs} chrome={false} /></div>
            <div className="story-atlas-panel">
              <div><CircleDashed size={16} /><span>Coverage is not assumed</span></div>
              <p>Records become local evidence. Areas without a shared record stay visibly unmeasured.</p>
              <dl><div><i className="atlas-recorded" /> <dt>Recorded</dt><dd>Can be followed</dd></div><div><i className="atlas-unknown" /> <dt>Unknown</dt><dd>Needs a check</dd></div><div><i className="atlas-gap" /> <dt>Not measured</dt><dd>Not a zero</dd></div></dl>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
