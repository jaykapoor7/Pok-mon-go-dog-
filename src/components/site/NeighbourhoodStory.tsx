"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { NeighbourhoodModel } from "./NeighbourhoodModel";
import { ArrowUpRight } from "lucide-react";

const CHAPTERS = [
  { label: "01 / A familiar face", title: "It starts with someone you notice.", body: "One animal, on a street you know. A photo and a location give their story a place to begin." },
  { label: "02 / A little more context", title: "Their history comes into view.", body: "Each sighting adds context. Care records help the next person understand what has already happened." },
  { label: "03 / A neighbourhood of care", title: "People can follow through together.", body: "Neighbours and local teams can work from a shared record, with less lost between one visit and the next." },
];

export function NeighbourhoodStory({ hero = false }: { hero?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      if (media.matches) { setProgress(1); return; }
      const rect = root.current?.getBoundingClientRect();
      if (rect) setProgress(Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight))));
    };
    const motion = () => { setReduced(media.matches); update(); };
    const scroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    motion();
    addEventListener("scroll", scroll, { passive: true });
    addEventListener("resize", scroll);
    media.addEventListener("change", motion);
    return () => { cancelAnimationFrame(frame); removeEventListener("scroll", scroll); removeEventListener("resize", scroll); media.removeEventListener("change", motion); };
  }, []);
  const stage = Math.min(2, Math.floor(progress * 3));
  const copy = CHAPTERS[stage];
  return (
    <section ref={root} id={hero ? "top" : undefined} className={`neighbour-story ${hero ? "neighbour-hero" : ""} ${reduced ? "is-still" : ""}`} aria-label="How a shared animal record grows" style={{ "--journey": progress } as CSSProperties}>
      <div className="neighbour-sticky">
        <div className="neighbour-copy">
          <span className="field-eyebrow">One street. Many small acts of care.</span>
          {hero && <><h1>They live<br />here, <span>too.</span></h1><p className="neighbour-hero-intro">A shared map for street animals and the people who care for them. Start with a sighting. Help local teams follow through.</p><div className="field-actions"><Link href="/map" className="field-button field-button-dark">Explore the map <ArrowUpRight size={18}/></Link><Link href="/report" className="field-text-link">Report a sighting <ArrowUpRight size={16}/></Link></div></>}
          <span className="neighbour-chapter">{copy.label}</span>
          {hero ? <p className="neighbour-stage-caption">{copy.body}</p> : <><h2>{copy.title}</h2><p>{copy.body}</p></>}
          <div className="neighbour-progress" aria-hidden="true">{CHAPTERS.map((_, i) => <span key={i} className={i <= stage ? "on" : ""}/>)}</div>
          <span className="neighbour-scroll-note">{reduced ? "A shared record connects each visit." : "Scroll to follow the neighbourhood"}</span>
        </div>
        <div className="neighbour-scene" role="group" aria-label="Illustrative three-dimensional neighbourhood with a dog and connections to local care">
          <NeighbourhoodModel progress={progress} reduced={reduced}/>
          <div className="neighbour-floating-note" style={{opacity:Math.max(0,Math.min(1,(progress-.2)*5))}}><span>THE RECORD GROWS</span><b>Seen. Remembered. Cared for.</b><div>Sighting / Care history / Follow-up</div></div>
          <span className="neighbour-scene-label">An illustration of connected care · not a live map</span>
        </div>
      </div>
    </section>
  );
}
