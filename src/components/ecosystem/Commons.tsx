"use client";

/* ════════════════════════════════════════════════════════════════════
   03 · One Ecosystem. Four real paintings in one gallery, and the
   software each audience uses, unfolding out of them.

   Residents: a Mithila painting of a woman with two children at play.
   NGOs: an 18th-century Rajasthani painting of a dog with her pups.
   Municipal teams: a 17th-century Kalamkari hanging of figures in an
   architectural setting. Partners and funders: a Mithila painting of
   two women facing each other. Choosing who you are (or scrolling)
   carries the camera along the gallery to that work; then the
   StrayPaw surface they use grows out of the painting's heart (a
   shared-element transition) and folds back into it when you move on.
   Every work is open-licensed and credited. Queue rows, city figures and
   evidence counts are live; the report form shows the real flow.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Camera, Check, MapPin } from "lucide-react";
import { useStage } from "@/components/bindu/stage";
import { WORK_IMAGES, creditLine, type WorkImageKey } from "@/lib/art/sources";

export type Queue = { condition: string; locality: string; days: number; critical: boolean }[];
export type CityBrief = { city: string; animals: number; cells: number; sterilised: number; ster_unknown: number; cases: number } | null;
export type Loc = { name: string; open: number };

type Box = [number, number, number, number];
const f = (n: number) => n.toLocaleString("en-IN");

const WAYS = [
  {
    k: "res", who: "Residents and volunteers", verb: "Report and follow", say: "See an animal in need, report it in a minute, and see when an organisation takes it on.",
    can: ["Report on WhatsApp or the web", "Find an animal on the map", "Follow what happens next"], href: "/community/report", cta: "Report an animal", sol: "/solutions#residents",
  },
  {
    k: "ngo", who: "Animal welfare organisations", verb: "Run every rescue", say: "Every report lands in one inbox and becomes a case someone owns, with the animal's history attached.",
    can: ["Intake from WhatsApp and the web", "Assign, treat, follow up", "Keep each animal's history"], href: "/for-ngos", cta: "StrayPaw for NGOs", sol: "/solutions#ngos",
  },
  {
    k: "city", who: "Municipal teams", verb: "See the city", say: "Where help is requested, what care is recorded and what is not known, area by area.",
    can: ["Coverage and gaps by locality", "Unknowns kept apart from no", "Briefs you can publish"], href: "/for-governments", cta: "StrayPaw for cities", sol: "/solutions#municipal",
  },
  {
    k: "fund", who: "Partners and funders", verb: "Check the work", say: "Outcomes reported from the record, with every figure's source and scope named.",
    can: ["Evidence reports as PDF", "Live work apart from history", "Method published openly"], href: "/for-funders", cta: "StrayPaw for funders", sol: "/solutions#partners",
  },
] as const;

/* ── the four works; each names the part of the painting the software grows out of (fractions of the frame) ── */
export const PLACES: Record<string, { work: WorkImageKey; hot: Box; pos: string }> = {
  res: { work: "mithilaChildren", hot: [0.3, 0.3, 0.2, 0.2], pos: "50% 45%" },
  ngo: { work: "dogWithPups", hot: [0.42, 0.52, 0.24, 0.2], pos: "50% 60%" },
  city: { work: "kalamkariPalace", hot: [0.38, 0.28, 0.24, 0.22], pos: "50% 40%" },
  fund: { work: "mithilaTwoWomen", hot: [0.42, 0.4, 0.16, 0.2], pos: "50% 45%" },
};

export function Commons({ queue, brief, locs, place }: { queue: Queue; brief: CityBrief; locs: Loc[]; place: string }) {
  const { step, still } = useStage();
  const wrap = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null);
  const cvs = useRef<(HTMLElement | null)[]>([]);
  const [i, setI] = useState(0);
  const cur = still ? 0 : Math.max(0, Math.min(3, step));
  useEffect(() => setI(cur), [cur]);

  /* the software unfolds out of the object in their hands (and folds back into it) */
  useLayoutEffect(() => {
    const pn = panel.current; if (!pn) return;
    if (still || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { pn.dataset.open = "1"; return; }
    pn.style.transition = "opacity 0.2s"; pn.style.opacity = "0"; pn.dataset.open = "0";
    /* let the camera arrive, then grow the surface out of the object's outline */
    const t1 = window.setTimeout(() => {
      const c = cvs.current[i]; if (!c) return;
      const hot = PLACES[WAYS[i].k].hot, cr = c.getBoundingClientRect(); pn.style.transition = "none"; pn.style.transform = "none";
      const pr = pn.getBoundingClientRect();
      const hx = cr.left + hot[0] * cr.width, hy = cr.top + hot[1] * cr.height, hw = Math.max(8, hot[2] * cr.width), hh = Math.max(8, hot[3] * cr.height);
      pn.style.transformOrigin = "0 0";
      pn.style.transform = `translate(${hx - pr.left}px, ${hy - pr.top}px) scale(${hw / pr.width}, ${hh / pr.height})`; pn.style.opacity = "1";
      void pn.offsetWidth;
      pn.style.transition = "transform 0.7s cubic-bezier(0.2, 0.9, 0.2, 1)";
      pn.style.transform = "none";
    }, 380);
    const t2 = window.setTimeout(() => { pn.dataset.open = "1"; }, 760);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [i, still]);

  const jump = (j: number) => {
    const sec = wrap.current?.closest("section"); if (!sec) return;
    const top = sec.getBoundingClientRect().top + window.scrollY, span2 = sec.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span2 * ((j + 0.5) / WAYS.length), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const w = WAYS[i];

  return (
    <div className="ec" ref={wrap} data-k={w.k} style={{ ["--i" as string]: i }}>
      <div className="ec-copy">
        <h2>One ecosystem. <em>Four ways in.</em></h2>
        <div className="ec-tabs" role="tablist" aria-label="Who StrayPaw serves">
          {WAYS.map((x, j) => (
            <button key={x.k} type="button" role="tab" aria-selected={i === j} className={i === j ? "is-on" : ""} onClick={() => jump(j)}>
              <i aria-hidden>{String(j + 1).padStart(2, "0")}</i><b>{x.who}</b>
            </button>
          ))}
        </div>
        <div className="ec-say" key={w.k}>
          <p className="ec-verb">{w.verb}</p>
          <p>{w.say}</p>
          <ul>{w.can.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="ec-links"><Link href={w.href}>{w.cta} <ArrowUpRight size={14} aria-hidden /></Link><Link href={w.sol}>See the solution <ArrowUpRight size={14} aria-hidden /></Link></p>
        </div>
      </div>

      <div className="ec-world" aria-hidden>
        <div className="ec-track" ref={track}>
          {WAYS.map((x, j) => { const pl = PLACES[x.k], im = WORK_IMAGES[pl.work]; return (
            <figure key={x.k} ref={(el) => { cvs.current[j] = el; }} className={`ec-place${i === j ? " is-on" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.src} alt="" loading="lazy" decoding="async" style={{ objectPosition: pl.pos }} />
              <figcaption>{creditLine(pl.work)}</figcaption>
            </figure>
          ); })}
        </div>
      </div>

      <div className="ec-panel" ref={panel} data-k={w.k} role="tabpanel" aria-label={`${w.who}: the software`}>
        {w.k === "res" && (
          <article className="ec-scr">
            <header><b>Report an animal</b><small>Community · the real flow</small></header>
            <ol className="ec-form">
              <li><Camera size={16} aria-hidden /><span><b>Photo</b><small>1 added · blurred if it may show an injury</small></span><Check size={15} aria-hidden /></li>
              <li><MapPin size={16} aria-hidden /><span><b>Where</b><small>{place} · placed to about 0.7 km²</small></span><Check size={15} aria-hidden /></li>
              <li><i aria-hidden /><span><b>What you saw</b><small>Injured · bleeding back leg</small></span><Check size={15} aria-hidden /></li>
            </ol>
            <p className="ec-receipt"><b>Received</b><span>Not yet accepted by an organisation. You will see when it is.</span></p>
          </article>
        )}
        {w.k === "ngo" && (
          <article className="ec-scr">
            <header><b>Today&rsquo;s work</b><small>NGO workspace · live record</small></header>
            <ol className="ec-q">{queue.slice(0, 5).map((q, j) => <li key={j} className={q.critical ? "is-crit" : ""}><b>{q.condition}</b><span>{q.locality}</span><em>{q.days === 0 ? "today" : `${q.days}d`}</em></li>)}</ol>
            <p className="ec-note">Real open requests on the public record. No organisation is named.</p>
          </article>
        )}
        {w.k === "city" && (
          <article className="ec-scr">
            <header><b>{brief?.city ?? "City"} brief</b><small>Municipal view · live record</small></header>
            {brief && <dl className="ec-figs"><div><dt>Animals on the record</dt><dd>{f(brief.animals)}</dd></div><div><dt>Mapped areas</dt><dd>{f(brief.cells)}</dd></div><div><dt>Recorded sterilised</dt><dd>{f(brief.sterilised)}</dd></div><div><dt>Not recorded</dt><dd>{f(brief.ster_unknown)}</dd></div></dl>}
            <ol className="ec-bars">{locs.slice(0, 4).map((l) => <li key={l.name}><span>{l.name}</span><b>{f(l.open)}</b><i style={{ width: `${(l.open / Math.max(1, locs[0]?.open ?? 1)) * 100}%` }} /></li>)}</ol>
            <p className="ec-note">Open requests by locality. Unknown sterilisation is never counted as no.</p>
          </article>
        )}
        {w.k === "fund" && (
          <article className="ec-scr">
            <header><b>Evidence of work</b><small>Report · {brief?.city ?? "city"} · public record</small></header>
            {brief && <dl className="ec-figs"><div><dt>Requests for help</dt><dd>{f(brief.cases)}</dd></div><div><dt>Animals on the record</dt><dd>{f(brief.animals)}</dd></div></dl>}
            <ul className="ec-checks"><li><Check size={14} aria-hidden />Every figure names its source</li><li><Check size={14} aria-hidden />Imported history labelled apart from live work</li><li><Check size={14} aria-hidden />Exports for partners, as PDF</li></ul>
          </article>
        )}
      </div>
    </div>
  );
}

/** One of the four works on its own (the Solutions page uses them), credited. */
export function PlaceArt({ k, className }: { k: string; className?: string }) {
  const pl = PLACES[k]; if (!pl) return null;
  const im = WORK_IMAGES[pl.work];
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={im.src} alt="" loading="lazy" decoding="async" style={{ objectPosition: pl.pos }} />
      <figcaption>{creditLine(pl.work)}</figcaption>
    </figure>
  );
}
