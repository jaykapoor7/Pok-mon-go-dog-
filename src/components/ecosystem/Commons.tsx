"use client";

/* ════════════════════════════════════════════════════════════════════
   03 · One Ecosystem. Four places in one painted street, and the real
   software each of them uses, unfolding out of the painting.

   The street runs through a resident's home, an NGO's clinic, the ward
   office and the banyan where partners meet. Choosing who you are (or
   scrolling) carries the camera along the street to that place; then
   the object in their hands (the resident's phone, the clinic's ledger,
   the ward's notice-board map, the partners' report scroll) unfolds into
   the StrayPaw surface they actually use, growing out of the object's
   own outline (a shared-element transition) and folding back into it
   when you move on. Queue rows, city figures and evidence counts are
   live; the report form shows the real flow.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Camera, Check, MapPin } from "lucide-react";
import { useStage } from "@/components/bindu/stage";
import * as A from "@/components/world/art";

export type Queue = { condition: string; locality: string; days: number; critical: boolean }[];
export type CityBrief = { city: string; animals: number; cells: number; sterilised: number; ster_unknown: number; cases: number } | null;
export type Loc = { name: string; open: number };

type Box = [number, number, number, number];
const VW = 600, VH = 440, TOP = 120, SH = VH - TOP;
/* each place is painted taller than it is shown; the window keeps the street and what stands on it */
const zoom = (b: Box): Box => [b[0], b[1] - TOP, b[2], b[3]];
const f = (n: number) => n.toLocaleString("en-IN");

/* A Warli figure's phone, in scene units, for a figure drawn at (x, y) and scale s. */
const personAt = (x: number, y: number, s: number, flip = false) => (lx: number, ly: number): [number, number] => [x + (flip ? -1 : 1) * (lx - 10) * s, y + (ly - 34) * s];

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

/* ── the four painted places; each paints itself and names the object that becomes software ── */
type Scene = { paint: (c: CanvasRenderingContext2D, t: number) => void; hot: Box };
function road(c: CanvasRenderingContext2D) {
  c.fillStyle = A.C.marigold; c.fillRect(0, 372, VW, 30);
  c.strokeStyle = A.C.ink; c.lineWidth = 1.4; for (const y of [372, 376, 398, 402]) { c.beginPath(); c.moveTo(0, y); c.lineTo(VW, y); c.stroke(); }
  c.strokeStyle = A.C.coral; c.lineWidth = 1.6; c.setLineDash([6, 10]); c.beginPath(); c.moveTo(0, 387); c.lineTo(VW, 387); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#e9dcc4"; c.fillRect(0, 402, VW, VH - 402);
}
function backdrop(c: CanvasRenderingContext2D, seed: number, t: number, sunAt: [number, number]) {
  A.paper(c, VW, VH, seed);
  /* the sky, filled the Gond way: rows of small marks in pale pigment, never a blank field */
  const sky = new Path2D(); sky.rect(0, 0, VW, 360);
  c.save(); c.clip(sky); c.strokeStyle = ["#e8c98f", "#e9b8b8", "#bfd6b4", "#e7c3a0"][seed % 4]; c.globalAlpha = 0.55; c.lineWidth = 1; c.lineCap = "round";
  for (let y = 18, r = 0; y < 360; y += 14, r++) for (let x = (r % 2) * 9; x < VW; x += 18) { c.beginPath(); c.moveTo(x - 2.5, y + 1.5); c.quadraticCurveTo(x, y - 2, x + 2.5, y + 1.5); c.stroke(); }
  c.restore();
  for (let i = 0; i < 7; i++) A.wash(c, 40 + ((i * 97 + seed * 31) % 560), 70 + ((i * 53 + seed * 17) % 240), 90, [A.C.marigoldPale, A.C.rosePale, A.C.greenPale, A.C.saffronPale][i % 4], 0.85);
  /* hills on the horizon, as Madhubani draws them: scalloped and outlined twice */
  c.fillStyle = A.C.greenPale; c.strokeStyle = A.C.ink; c.lineWidth = 1.1;
  c.beginPath(); c.moveTo(0, 360); for (let x = 0; x <= VW; x += 60) c.quadraticCurveTo(x + 30, 300 - ((x / 60 + seed) % 3) * 16, x + 60, 360); c.closePath(); c.fill(); c.stroke();
  c.save(); c.translate(...sunAt); A.sun(c, 26, t * 0.15); c.restore();
  A.ground(c, 0, VW, 360, 12); road(c);
}
const dog = (c: CanvasRenderingContext2D, x: number, y: number, s: number, pose: A.Pose, coat: number, t: number, flip = false) => {
  c.save(); c.translate(x, y); c.scale(flip ? -s : s, s); c.translate(-31, -39); A.dogTail(c, pose, t * (pose === "lie" ? 1.2 : 6)); A.dogBody(c, pose, A.COATS[coat], coat + 1); c.restore();
};
const fig = (c: CanvasRenderingContext2D, x: number, y: number, s: number, act: A.Act, t: number, flip = false) => {
  c.save(); c.translate(x, y); c.scale(flip ? -s : s, s); c.translate(-10, -34); A.person(c, act, t * 3); c.restore();
};
const birds = (c: CanvasRenderingContext2D, t: number, x0: number) => { for (let i = 0; i < 3; i++) { c.save(); c.translate(x0 + i * 40 + Math.sin(t * 0.7 + i) * 14, 90 + i * 16 + Math.cos(t * 0.9 + i) * 8); c.scale(1.6, 1.6); A.bird(c, t * 8 + i); c.restore(); } };

export const SCENES: Record<string, Scene> = {
  res: (() => {
    const at = personAt(392, 368, 2.8);
    const [px, py] = at(14.2, 3), [qx, qy] = at(17.8, 9.2);
    return {
      hot: [px, py, qx - px, qy - py],
      paint: (c, t) => {
        backdrop(c, 1, t, [520, 74]);
        c.save(); c.translate(80, 362); A.house(c, 11, 4.2); c.restore();
        c.save(); c.translate(205, 362); A.house(c, 4, 3.4); c.restore();
        c.save(); c.translate(292, 362); A.palm(c, 3, t, 3); c.restore();
        birds(c, t, 120);
        fig(c, 392, 368, 2.8, "phone", t);
        c.save(); c.translate(40, 362); A.palm(c, 9, t, 2.6); c.restore();
        dog(c, 486, 372, 1.6, "stand", 0, t, true);
        fig(c, 150, 424, 2.2, "feed", t);
        dog(c, 236, 428, 1.5, "lie", 1, t);
        c.save(); c.translate(560, 362); A.tree(c, 21, t, 2.4); c.restore();
              },
    };
  })(),
  ngo: {
    hot: [200, 324, 82, 26],
    paint: (c, t) => {
      backdrop(c, 2, t, [80, 70]);
      c.save(); c.translate(120, 362); A.landmark(c, "clinic", 4.2); c.restore();
      c.save(); c.translate(240, 366); A.ledger(c, 1.9); c.restore();
      c.save(); c.translate(372, 380); A.van(c, 2.3); c.restore();
      fig(c, 500, 368, 2.6, "carry", t);
      dog(c, 556, 334, 1.05, "lie", 3, t, true);
      c.save(); c.translate(560, 362); A.tree(c, 6, t, 2.1); c.restore();
      dog(c, 300, 432, 1.5, "sit", 2, t);
      birds(c, t, 330);
          },
  },
  city: {
    hot: [330 - 34 * 2.7, 366 - 64 * 2.7, 68 * 2.7, 40 * 2.7],
    paint: (c, t) => {
      backdrop(c, 3, t, [530, 70]);
      c.save(); c.translate(130, 362); A.landmark(c, "office", 4.6); c.restore();
      c.save(); c.translate(330, 366); A.board(c, 2.7); c.restore();
      fig(c, 440, 368, 2.5, "wave", t, true);
      c.save(); c.translate(530, 392); c.scale(1.5, 1.5); c.translate(-36, -49); A.cow(c, t, 5); c.restore();
      c.save(); c.translate(40, 362); A.palm(c, 7, t, 2.4); c.restore();
      dog(c, 250, 432, 1.45, "stand", 4, t);
      birds(c, t, 160);
          },
  },
  fund: {
    hot: [300 - 19 * 2.2, 318 - 22 * 2.2, 38 * 2.2, 45 * 2.2],
    paint: (c, t) => {
      backdrop(c, 4, t, [90, 70]);
      c.save(); c.translate(300, 362); A.tree(c, 12, t, 4.6); c.restore();
      A.bunting(c, [360, 150], [590, 120], 30);
      c.save(); c.translate(520, 362); A.landmark(c, "shop", 3.4); c.restore();
      fig(c, 222, 370, 2.3, "sit", t);
      fig(c, 380, 370, 2.3, "sit", t, true);
      c.save(); c.translate(300, 318); A.scroll(c, 2.2); c.restore();
      dog(c, 120, 430, 1.3, "lie", 0, t);
      c.save(); c.translate(52, 362); A.temple(c, 2.2); c.restore();
          },
  },
};

export function Commons({ queue, brief, locs, place }: { queue: Queue; brief: CityBrief; locs: Loc[]; place: string }) {
  const { step, still } = useStage();
  const wrap = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null);
  const cvs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [i, setI] = useState(0);
  const cur = still ? 0 : Math.max(0, Math.min(3, step));
  useEffect(() => setI(cur), [cur]);

  /* paint every place once; animate the one in view */
  useEffect(() => {
    let raf = 0, alive = true, last = 0;
    const t0 = performance.now();
    const paint = (j: number, t: number) => {
      const c = cvs.current[j]; if (!c) return;
      const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
      const dpr = Math.min(w < 500 ? 1.75 : 2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const x = c.getContext("2d")!; const s = w / VW;
      x.setTransform(dpr * s, 0, 0, dpr * s, 0, 0); x.clearRect(0, 0, VW, SH);
      x.save(); x.translate(0, -TOP); SCENES[WAYS[j].k].paint(x, t); x.restore(); A.border(x, 4, 4, VW - 8, SH - 8, 14);
    };
    const all = () => WAYS.forEach((_, j) => paint(j, 0));
    all();
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !raf && !still) raf = requestAnimationFrame(loop); }, { rootMargin: "100px" });
    const loop = (now: number) => {
      raf = 0; if (!alive) return;
      if (now - last > 50) { last = now; paint(iRef.current, (now - t0) / 1000); }
      const r = wrap.current?.getBoundingClientRect();
      if (r && r.bottom > 0 && r.top < innerHeight) raf = requestAnimationFrame(loop);
    };
    if (wrap.current) io.observe(wrap.current);
    const ro = new ResizeObserver(all); cvs.current.forEach((c) => c && ro.observe(c));
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [still]);
  const iRef = useRef(0); iRef.current = i;

  /* the software unfolds out of the object in their hands (and folds back into it) */
  useLayoutEffect(() => {
    const pn = panel.current; if (!pn) return;
    if (still || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { pn.dataset.open = "1"; return; }
    pn.style.transition = "opacity 0.2s"; pn.style.opacity = "0"; pn.dataset.open = "0";
    /* let the camera arrive, then grow the surface out of the object's outline */
    const t1 = window.setTimeout(() => {
      const c = cvs.current[i]; if (!c) return;
      const scene = { hot: zoom(SCENES[WAYS[i].k].hot) }, s = c.clientWidth / VW, oy = 0;
      const cr = c.getBoundingClientRect(); pn.style.transition = "none"; pn.style.transform = "none";
      const pr = pn.getBoundingClientRect();
      const hx = cr.left + scene.hot[0] * s, hy = cr.top + oy + scene.hot[1] * s, hw = Math.max(8, scene.hot[2] * s), hh = Math.max(8, scene.hot[3] * s);
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
          {WAYS.map((x, j) => <canvas key={x.k} ref={(el) => { cvs.current[j] = el; }} className={`ec-place${i === j ? " is-on" : ""}`} />)}
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

/** One painted place on its own (the Solutions page uses them), alive while on screen. */
export function PlaceCanvas({ k, className }: { k: keyof typeof SCENES | string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || !SCENES[k]) return;
    let raf = 0, alive = true, last = 0, on = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches, t0 = performance.now();
    const paint = (t: number) => {
      const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
      const dpr = Math.min(w < 500 ? 1.75 : 2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const x = c.getContext("2d")!, s = w / VW;
      x.setTransform(dpr * s, 0, 0, dpr * s, 0, 0); x.clearRect(0, 0, VW, SH);
      x.save(); x.translate(0, -TOP); SCENES[k].paint(x, t); x.restore(); A.border(x, 4, 4, VW - 8, SH - 8, 14);
    };
    const loop = (now: number) => { raf = 0; if (!alive || !on) return; if (now - last > 50) { last = now; paint((now - t0) / 1000); } raf = requestAnimationFrame(loop); };
    paint(0);
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting && !reduce; if (on && !raf) raf = requestAnimationFrame(loop); });
    io.observe(c);
    const ro = new ResizeObserver(() => paint((performance.now() - t0) / 1000)); ro.observe(c);
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [k]);
  return <canvas ref={ref} className={className} aria-hidden />;
}
