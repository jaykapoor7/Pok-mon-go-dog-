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

  /* One piece of state, and it flips exactly once, during idle time after
     the page has painted — never while a finger is moving.

     Two things were making this section stutter, and only one of them was
     obvious. The first: setStage() ran from the scroll handler, and although
     React bailed out of most of those calls, the three that landed
     re-rendered a subtree holding two live MapLibre canvases. Measuring at
     4x CPU throttle on a 390px viewport, those three renders were exactly
     the three long tasks on the page.

     The second only showed up after fixing the first. Deferring the maps to
     an IntersectionObserver looked like the tidy fix — fewer WebGL contexts
     standing around — but it moved MapLibre's initialisation into the middle
     of the scroll that reaches them, and the numbers got worse, not better:
     p95 frame time 21ms -> 49ms, dropped frames 6 -> 14. What matters is not
     how many canvases exist at rest, it is that nothing expensive starts
     while the page is moving. So both maps are built once the browser is
     idle, well before the reader arrives. */
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    const node = section.current;
    if (!node) return;

    /* requestIdleCallback is unsupported in Safari, which is most of the
       phones this is for, so the timeout is the real path there rather than
       a fallback that never runs. */
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => setMapsReady(true), { timeout: 2000 })
      : window.setTimeout(() => setMapsReady(true), 600);

    let raf = 0;
    let lastStage = -1;
    /* Reading layout inside the scroll event forced a synchronous style and
       layout pass on every one of them. Coalescing into a frame means at
       most one read per painted frame, taken when the browser is about to
       do that work anyway. */
    const measure = () => {
      raf = 0;
      const { top, height } = node.getBoundingClientRect();
      const travelled = Math.max(0, Math.min(1, -top / Math.max(height - window.innerHeight, 1)));
      const stage = Math.min(3, Math.floor(travelled * 4.1));
      /* Only the stage is written, and only when it changes. An earlier
         revision also published `travelled` as a --p custom property "in
         case the CSS wanted it". Nothing read it, but writing a custom
         property invalidates computed style for the entire subtree, and
         this subtree holds two map canvases — it cost 5ms of style
         recalculation every frame for nothing. */
      if (stage !== lastStage) {
        lastStage = stage;
        node.dataset.stage = String(stage);
        /* Announce the step for anyone who cannot see the panels change.
           Keeping all four slides mounted put all four headings in the
           accessibility tree at once — opacity:0 hides a thing from eyes,
           not from a screen reader — so the three that are not the current
           step are taken back out of it here. */
        const live = node.querySelector<HTMLElement>(".product-story-progress");
        if (live) live.setAttribute("aria-label", `Step ${stage + 1} of 4`);
        node.querySelectorAll<HTMLElement>(".product-story-slide").forEach((slide, i) => {
          if (i === stage) slide.removeAttribute("aria-hidden");
          else slide.setAttribute("aria-hidden", "true");
        });
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={section} className="product-story" data-stage="0" aria-label="How StrayPaw turns a sighting into coordinated action">
      <div className="product-story-sticky">
        <header className="product-story-copy">
          {/* All four are in the DOM; CSS shows the one the scroll has
              reached. Swapping the strings in React was what dragged the
              maps through reconciliation. */}
          {COPY.map(([eyebrow, title, body], i) => (
            <div className="product-story-slide" data-slide={i} key={eyebrow} aria-hidden={i === 0 ? undefined : true}>
              <span className="field-eyebrow">{eyebrow}</span>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          ))}
          <div className="product-story-progress" aria-label="Step 1 of 4"><i /><i /><i /><i /></div>
        </header>
        <div className="product-story-surface">
          <div className="story-map">{mapsReady && <FieldMapPreview dogs={dogs} />}</div>
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
            <div className="story-nation-map">{mapsReady && <FieldMapPreview dogs={dogs} chrome={false} />}</div>
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
