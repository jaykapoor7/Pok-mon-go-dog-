"use client";

/* ════════════════════════════════════════════════════════════════════
   01 The world · 02 The world becomes intelligent.

   One scene, held on screen while the page scrolls past it. At first:
   the hillside, the sky, the headline. Scrolling, the camera rises; the
   ground settles into a map; points appear where animals were met, and
   one of them is followed through the line of care, each stage a small
   record on the ground it happened on:

     Capture → Identity → Treatment → Release → Evidence → Verification

   The points are real buttons placed over the scene; any of them opens
   its record. The records are illustrative and say so.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { World, type Marker, type Projected } from "./world/World";
import { LIVE_DEMO_URL } from "@/lib/demo-site";

type Step = { id: string; x: number; z: number; k: string; title: string; facts: [string, string][]; who: string };
const STEPS: Step[] = [
  { id: "capture", x: -14, z: -3, k: "Capture", title: "SP-1042 · brown female", facts: [["Where", "Market gate, Ward 14"], ["When", "07:42 · GPS ±6 m"], ["By", "Field team, on a phone"]], who: "Recorded in the field" },
  { id: "identity", x: -8, z: -12, k: "Identity", title: "One animal, one record", facts: [["Match", "Ear notch and two photos"], ["Checked", "1 possible duplicate"], ["Result", "Same animal as SP-0977"]], who: "Checked by the coordinator" },
  { id: "treatment", x: 0, z: -8, k: "Treatment", title: "Sterilised and vaccinated", facts: [["Procedure", "Sterilisation"], ["Vaccine", "Anti-rabies, batch noted"], ["Signed", "Veterinarian, 11:20"]], who: "Signed by the vet" },
  { id: "release", x: 7, z: -16, k: "Release", title: "Back where she was found", facts: [["Where", "Capture point, ±9 m"], ["When", "Next morning, 06:10"], ["Photo", "Release photo attached"]], who: "Recorded by the field team" },
  { id: "evidence", x: 12, z: -10, k: "Evidence", title: "Every item in place", facts: [["Items", "5 of 5"], ["Gaps", "None"], ["Trail", "Who, when, from where"]], who: "Checked by Kaju, confirmed by a person" },
  { id: "verify", x: 17, z: -23, k: "Verification", title: "Ready for the municipal reviewer", facts: [["Package", "Ward 14 · October"], ["Each figure", "Opens its records"], ["Decision", "The office's, not ours"]], who: "Reviewed by the municipal office" },
];
/* Other animals met on the same ground: points only, to show the record is everywhere. */
const SCATTER: Marker[] = Array.from({ length: 26 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678;
  return { id: `s${i}`, x: -24 + (a - Math.floor(a)) * 50, z: -36 + (b - Math.floor(b)) * 40, lift: 0.2 };
});
const MARKERS: Marker[] = [...STEPS.map((s) => ({ id: s.id, x: s.x, z: s.z, lift: 0.35 })), ...SCATTER];
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const band = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

export function Story() {
  const box = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [p, setP] = useState(0);
  const [ok, setOk] = useState(true);
  const [still, setStill] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const dots = useRef<Record<string, HTMLElement | null>>({});
  const path = useRef<SVGPathElement>(null);
  const pts = useRef<Projected[]>([]);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const on = () => {
      const el = box.current; if (!el) return;
      const r = el.getBoundingClientRect(), span = el.offsetHeight - window.innerHeight;
      const v = clamp(-r.top / Math.max(1, span));
      progress.current = v; setP(v);
    };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);

  /* The scene hands over where each point is; the buttons and the line follow, without re-rendering React. */
  const place = useCallback((list: Projected[]) => {
    pts.current = list;
    for (const q of list) { const el = dots.current[q.id]; if (el) { el.style.transform = `translate3d(${q.x}px, ${q.y}px, 0)`; el.dataset.vis = q.vis ? "1" : "0"; } }
    const chain = STEPS.map((s) => list.find((q) => q.id === s.id)!).filter(Boolean);
    if (path.current && chain.length) path.current.setAttribute("d", chain.map((q, i) => (i === 0 ? `M${q.x},${q.y}` : `Q${(chain[i - 1].x + q.x) / 2},${Math.min(chain[i - 1].y, q.y) - 26} ${q.x},${q.y}`)).join(" "));
  }, []);

  /* What the scroll has reached: the headline, then the points, then the line of care, one stage at a time. */
  const hero = 1 - band(p, 0.04, 0.16);
  const field = band(p, 0.2, 0.36);
  const chain = band(p, 0.46, 0.9);
  const at = Math.min(STEPS.length - 1, Math.floor(chain * STEPS.length));
  const shown = open ?? (chain > 0.01 ? STEPS[at].id : null);
  const step = STEPS.find((s) => s.id === shown) ?? null;

  return (
    <div ref={box} className={`cn8-story${still ? " is-still" : ""}`} style={{ ["--p" as string]: p }}>
      <div className="cn8-stage">
        <div className={`cn8-world${ok ? "" : " is-flat"}`}>
          {ok ? <World progress={progress} markers={MARKERS} onProject={place} onReady={setOk} /> : null}
          <span className="cn8-sky" aria-hidden />
        </div>

        {/* the points on the ground, and the line of care between the six that are followed */}
        <div className="cn8-layer" style={{ opacity: field }} aria-hidden={field < 0.05}>
          <svg className="cn8-line" width="100%" height="100%" aria-hidden><path ref={path} pathLength={1} style={{ strokeDashoffset: 1 - chain }} /></svg>
          {SCATTER.map((m, i) => <span key={m.id} ref={(el) => { dots.current[m.id] = el; }} className="cn8-dot" style={{ ["--i" as string]: i }} aria-hidden />)}
          {STEPS.map((s, i) => (
            <button key={s.id} ref={(el) => { dots.current[s.id] = el; }} type="button" className={`cn8-pin${shown === s.id ? " is-on" : ""}${chain * STEPS.length > i ? " is-done" : ""}`} tabIndex={field > 0.5 ? 0 : -1}
              onClick={() => setOpen((v) => (v === s.id ? null : s.id))} aria-pressed={shown === s.id} aria-label={`${s.k}: ${s.title}`}>
              <i aria-hidden /><span>{s.k}</span>
            </button>
          ))}
        </div>

        {/* 01 · the world */}
        <div className="cn8-hero" style={{ opacity: hero, transform: `translateY(${(1 - hero) * -24}px)` }} aria-hidden={hero < 0.05}>
          <h1 className="cn8-h1"><span>The whole world,</span> <span>connected.</span></h1>
          <p className="cn8-sub">StrayPaw is one connected platform for animal care, programme verification and public-health intelligence. Every animal, treatment and report on one record that anyone responsible can trace.</p>
          <div className="cn8-acts">
            <a href={LIVE_DEMO_URL} className="cn8-btn is-primary is-lg" tabIndex={hero < 0.5 ? -1 : 0}>Explore live demo<ArrowRight size={16} aria-hidden /></a>
            <a href="#how" className="cn8-btn is-ghost is-lg" tabIndex={hero < 0.5 ? -1 : 0} onClick={(e) => { e.preventDefault(); const el = box.current; if (el) window.scrollTo({ top: el.offsetTop + (el.offsetHeight - window.innerHeight) * 0.5, behavior: still ? "auto" : "smooth" }); }}>See how it connects</a>
          </div>
        </div>
        <span className="cn8-cue" style={{ opacity: hero }} aria-hidden><ArrowDown size={16} /></span>

        {/* 02 · the world becomes intelligent */}
        <div id="how" className="cn8-copy" style={{ opacity: field * (1 - band(p, 0.42, 0.5)) }} aria-hidden={field < 0.05}>
          <p className="cn8-k">The world becomes legible</p>
          <h2>Every animal met, treated or released becomes a point on one shared record.</h2>
        </div>
        <div className="cn8-copy is-chain" style={{ opacity: band(p, 0.44, 0.52) }} aria-hidden={chain < 0.01}>
          <p className="cn8-k">One animal, followed</p>
          <ol className="cn8-steps">{STEPS.map((s, i) => <li key={s.id} className={i < at || chain >= 0.999 ? "is-done" : i === at ? "is-on" : undefined}><button type="button" onClick={() => setOpen(s.id)} tabIndex={chain > 0.01 ? 0 : -1}>{s.k}</button></li>)}</ol>
          <p className="cn8-note">From the street to the municipal desk, each stage is recorded by the person who did it, with where and when.</p>
        </div>

        {/* the record of the stage in view */}
        {step ? (
          <aside className="cn8-card" key={step.id} aria-live="polite">
            <p className="cn8-card-k"><span className="cn8-sq" aria-hidden />{step.k}<em>Illustrative record</em></p>
            <h3>{step.title}</h3>
            <dl>{step.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            <p className="cn8-card-who">{step.who}</p>
            <Link href="/platform" className="cn8-card-go">See the record in the platform<ArrowRight size={13} aria-hidden /></Link>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
