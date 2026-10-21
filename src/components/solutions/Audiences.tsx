"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { PlaceArt, SoftwarePreview, type Queue, type CityBrief, type Loc } from "@/components/ecosystem/Commons";

const VIEWS = [
  { id: "residents", kind: "res", tab: "Residents and volunteers", title: "Report animals. Follow updates.", text: "Add a photo, a place and what you saw. Follow the animal’s recorded history and updates after review.", note: "Submitting a report does not guarantee acceptance, rescue or treatment.", href: "/community/report", cta: "Report an animal" },
  { id: "ngos", kind: "ngo", tab: "Animal welfare organisations", title: "Keep your team’s work together.", text: "Review incoming requests, assign cases and record care and follow-ups alongside each animal’s history.", note: "Apply → Set up your workspace. Organisation access follows verification.", href: "/partner-apply", cta: "Apply for a workspace" },
  { id: "municipal", kind: "city", tab: "Municipal teams", title: "See recorded care, area by area.", text: "Compare requests, sterilisation and vaccination records across localities, with unknowns kept visible.", note: "Analysis areas are not wards. Coverage describes the record, not the animal population.", href: "/for-governments", cta: "Explore city intelligence" },
  { id: "partners", kind: "fund", tab: "Partners and funders", title: "Trace reported work to its source.", text: "Read evidence reports with source attribution and imported history distinguished from live work.", note: "A listing or credited dataset does not imply a partnership.", href: "/for-funders", cta: "Explore evidence reports" },
] as const;

export function Audiences({ queue, brief, locs }: { queue: Queue; brief: CityBrief; locs: Loc[] }) {
  const [i, setI] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const read = () => { const j = VIEWS.findIndex(v => v.id === window.location.hash.slice(1)); if (j >= 0) setI(j); };
    read(); window.addEventListener("hashchange", read); return () => window.removeEventListener("hashchange", read);
  }, []);
  const choose = (j: number, focus = false) => { setI(j); history.replaceState(history.state, "", `#${VIEWS[j].id}`); if (focus) tabs.current[j]?.focus(); };
  const onKey = (e: KeyboardEvent, j: number) => {
    let next: number;
    if (e.key === "ArrowRight") next = (j + 1) % VIEWS.length;
    else if (e.key === "ArrowLeft") next = (j + VIEWS.length - 1) % VIEWS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = VIEWS.length - 1;
    else return;
    e.preventDefault(); choose(next, true);
  };
  const v = VIEWS[i];
  return <div className="pr-solutions">
    <div className="pr-tabs" role="tablist" aria-label="Who StrayPaw is for">{VIEWS.map((view,j) => <button key={view.id} ref={el => { tabs.current[j] = el; }} id={`tab-${view.id}`} type="button" role="tab" aria-controls="solutions-panel" aria-selected={i === j} tabIndex={i === j ? 0 : -1} onClick={() => choose(j)} onKeyDown={e => onKey(e,j)}>{view.tab}</button>)}</div>
    <div id="solutions-panel" className="pr-audience" role="tabpanel" tabIndex={0} aria-labelledby={`tab-${v.id}`}>
      <div className="pr-audience-copy"><h2>{v.title}</h2><p>{v.text}</p><p className="pr-note">{v.note}</p><Link href={v.href}>{v.cta} <ArrowUpRight size={15} aria-hidden /></Link><PlaceArt k={v.kind} className="pr-audience-art" /></div>
      <SoftwarePreview kind={v.kind} queue={queue} brief={brief} locs={locs} />
    </div>
  </div>;
}
