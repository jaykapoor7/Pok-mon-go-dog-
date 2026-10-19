"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight, Camera, Check, MapPin } from "lucide-react";
import { AudienceTask } from "./AudienceTask";
import { WORK_IMAGES, creditLine, type WorkImageKey } from "@/lib/art/sources";

export type Queue = { condition: string; locality: string; days: number; critical: boolean }[];
export type CityBrief = { city: string; animals: number; cells: number; sterilised: number; ster_unknown: number; cases: number } | null;
export type Loc = { name: string; open: number };
type Box = [number, number, number, number];
const f = (n: number) => n.toLocaleString("en-IN");
const WAYS = [
  { k: "res", who: "Residents", verb: "Report animals. Follow updates.", say: "Add an observation, find animals near you and follow recorded updates.", href: "/community/report", cta: "Report an animal" },
  { k: "ngo", who: "Organisations", verb: "Keep the next step clear.", say: "Review requests, assign cases and keep care and follow-ups together.", href: "/for-ngos", cta: "Explore NGO workspaces" },
  { k: "city", who: "Municipal teams", verb: "Read the city, area by area.", say: "Compare recorded care and requests, with gaps and unknowns in view.", href: "/for-governments", cta: "Explore city intelligence" },
  { k: "fund", who: "Partners and funders", verb: "Trace the evidence.", say: "Read sourced reports that distinguish imported history from live work.", href: "/for-funders", cta: "Explore evidence reporting" },
] as const;
export const PLACES: Record<string, { work: WorkImageKey; hot: Box; pos: string }> = {
  res: { work: "mithilaChildren", hot: [0.3, 0.3, 0.2, 0.2], pos: "50% 45%" },
  ngo: { work: "dogWithPups", hot: [0.42, 0.52, 0.24, 0.2], pos: "50% 60%" },
  city: { work: "kalamkariPalace", hot: [0.38, 0.28, 0.24, 0.22], pos: "50% 40%" },
  fund: { work: "mithilaTwoWomen", hot: [0.42, 0.4, 0.16, 0.2], pos: "50% 45%" },
};

export function Commons({ brief, locs, map }: { map?: ReactNode; queue: Queue; brief: CityBrief; locs: Loc[]; place: string }) {
  const [i, setI] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const chooseKey = (e: KeyboardEvent, j: number) => {
    let next: number;
    if (e.key === "ArrowRight") next = (j + 1) % WAYS.length;
    else if (e.key === "ArrowLeft") next = (j + WAYS.length - 1) % WAYS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = WAYS.length - 1;
    else return;
    e.preventDefault(); setI(next); tabs.current[next]?.focus();
  };
  const w = WAYS[i];
  return <div className="pr-commons">
    <header><h2 id="ecosystem-title">One ecosystem. Four ways in.</h2></header>
    <div className="pr-tabs" role="tablist" aria-label="Who StrayPaw serves">
      {WAYS.map((way, j) => <button key={way.k} ref={el => { tabs.current[j] = el; }} id={`ecosystem-tab-${way.k}`} type="button" role="tab" aria-controls="ecosystem-panel" aria-selected={i === j} tabIndex={i === j ? 0 : -1} onClick={() => setI(j)} onKeyDown={e => chooseKey(e, j)}>{way.who}<ArrowUpRight size={20} aria-hidden /></button>)}
    </div>
    <div id="ecosystem-panel" className="pr-audience" role="tabpanel" tabIndex={0} aria-labelledby={`ecosystem-tab-${w.k}`}>
      <div className="lp-audience-bar"><h3>{w.verb}</h3><Link href={w.href}>{w.cta} <ArrowUpRight size={15} aria-hidden /></Link></div>
      <AudienceTask kind={w.k} brief={brief} locs={locs} map={map} />
    </div>
  </div>;
}

export function SoftwarePreview({ kind, queue, brief, locs, place = "Your area" }: { kind: string; queue: Queue; brief: CityBrief; locs: Loc[]; place?: string }) {
  const w = { k: kind };
  return <div className="pr-preview" data-ui>
        {w.k === "res" && (
          <article className="ec-scr">
            <header><b>Report an animal</b><small>Community · illustrative form preview</small></header>
            <ol className="ec-form">
              <li><Camera size={16} aria-hidden /><span><b>Photo</b><small>Photo upload · sensitive images are veiled</small></span><Check size={15} aria-hidden /></li>
              <li><MapPin size={16} aria-hidden /><span><b>Where</b><small>{place} · placed to about 0.7 km²</small></span><Check size={15} aria-hidden /></li>
              <li><i aria-hidden /><span><b>What you saw</b><small>Condition and what you saw</small></span><Check size={15} aria-hidden /></li>
            </ol>
            <p className="ec-receipt"><b>Received</b><span>Not yet accepted by an organisation. You will see when it is.</span></p>
          </article>
        )}
        {w.k === "ngo" && (
          <article className="ec-scr">
            <header><b>Today&rsquo;s work</b><small>NGO workspace · live record</small></header>
            {queue.length === 0 && <p className="ec-note">No public queue is available right now.</p>}
            <ol className="ec-q">{queue.slice(0, 5).map((q, j) => <li key={j} className={q.critical ? "is-crit" : ""}><b>{q.condition}</b><span>{q.locality}</span><em>{q.days === 0 ? "today" : `${q.days}d`}</em></li>)}</ol>
            <p className="ec-note">Real open requests on the public record. No organisation is named.</p>
          </article>
        )}
        {w.k === "city" && (
          <article className="ec-scr">
            <header><b>{brief?.city ?? "City"} brief</b><small>Municipal view · live record</small></header>
            {!brief && <p className="ec-note">Public figures are unavailable right now.</p>}
            {brief && <dl className="ec-figs"><div><dt>Animals on the record</dt><dd>{f(brief.animals)}</dd></div><div><dt>Mapped areas</dt><dd>{f(brief.cells)}</dd></div><div><dt>Recorded sterilised</dt><dd>{f(brief.sterilised)}</dd></div><div><dt>Not recorded</dt><dd>{f(brief.ster_unknown)}</dd></div></dl>}
            <ol className="ec-bars">{locs.slice(0, 4).map((l) => <li key={l.name}><span>{l.name}</span><b>{f(l.open)}</b><i style={{ width: `${(l.open / Math.max(1, locs[0]?.open ?? 1)) * 100}%` }} /></li>)}</ol>
            <p className="ec-note">Open requests by locality. Unknown sterilisation is never counted as no.</p>
          </article>
        )}
        {w.k === "fund" && (
          <article className="ec-scr">
            <header><b>Evidence of work</b><small>Report · {brief?.city ?? "city"} · public record</small></header>
            {!brief && <p className="ec-note">Public figures are unavailable right now.</p>}
            {brief && <dl className="ec-figs"><div><dt>Requests for help</dt><dd>{f(brief.cases)}</dd></div><div><dt>Animals on the record</dt><dd>{f(brief.animals)}</dd></div></dl>}
            <ul className="ec-checks"><li><Check size={14} aria-hidden />Every figure names its source</li><li><Check size={14} aria-hidden />Imported history labelled apart from live work</li><li><Check size={14} aria-hidden />Exports for partners, as PDF</li></ul>
          </article>
        )}
  </div>;
}

/** One of the four works on its own (the Solutions page uses them), credited. */
export function PlaceArt({ k, className }: { k: string; className?: string }) {
  const pl = PLACES[k]; if (!pl) return null;
  const im = WORK_IMAGES[pl.work];
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={im.src} width={im.w} height={im.h} alt="" loading="lazy" decoding="async" style={{ objectPosition: pl.pos }} />
      <figcaption>{creditLine(pl.work)}</figcaption>
    </figure>
  );
}
