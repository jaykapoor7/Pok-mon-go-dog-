"use client";

/* Restored from 9ca5b49f: city → street, incoming field team, the animal
   travelling to care, a filling care ring, then the journey home. The
   original cubic routes and reversible scroll choreography are retained.
   This seven-day illustration is separate from the public animal record:
   it supplies no animal identity, clinical facts, GPS location or dates. */
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { Truck } from "lucide-react";
import { supportsWebGL2, NIGHT, groundStyle, underlay } from "@/components/map/basemap";
import { FOLK_CUTOUTS } from "@/lib/art/sources";

type Pt = [number, number];
type Geography = { city: string; box: [number, number, number, number] };
const STEPS = [
  { day: 0, what: "Reported", detail: "A photo, a place and an observation start the record." },
  { day: 1, what: "Picked up by the field team", detail: "After review and acceptance, a team coordinates the pickup." },
  { day: 2, what: "Care and follow-up", detail: "The team adds care and progress to the animal’s history." },
  { day: 7, what: "Returned to the same place", detail: "When appropriate, the team brings the animal back and records the update." },
];
// The historic timeline gives each event a pause, then time proportional to its days.
const EDGE = [0, 1 + 3 / 7, 2 + 6 / 7, 6];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (x: number) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const road = (a: Pt, b: Pt, bend: number) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], nx = -dy, ny = dx;
  return `M${a[0]},${a[1]} C${a[0] + dx * .3 + nx * bend},${a[1] + dy * .3 + ny * bend} ${a[0] + dx * .72 - nx * bend * .6},${a[1] + dy * .72 - ny * bend * .6} ${b[0]},${b[1]}`;
};

export function CaseDive({ geography }: { geography?: Geography }) {
  const section = useRef<HTMLElement>(null), mapEl = useRef<HTMLDivElement>(null);
  const dogEl = useRef<HTMLDivElement>(null), teamEl = useRef<HTMLDivElement>(null);
  const careEl = useRef<HTMLDivElement>(null), homeEl = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const actors = useRef<HTMLDivElement>(null), fill = useRef<SVGCircleElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const [calm, setCalm] = useState(false);
  const [time, setTime] = useState({ day: 0, step: 0 });
  const [mapReady, setMapReady] = useState(false);
  const box = geography?.box;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dead = false, raf = 0, map: MLMap | null = null, loaded = false;
    let from: { center: Pt; zoom: number } | null = null;
    const target: Pt | null = box ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : null;
    const frame = () => {
      raf = 0;
      const root = section.current, viewport = mapEl.current;
      if (!root || !viewport) return;
      const reduced = media.matches;
      const rect = root.getBoundingClientRect(), W = viewport.clientWidth, H = viewport.clientHeight;
      const phone = W < 760;
      const progress = reduced ? 1 : clamp(-rect.top / Math.max(1, rect.height - innerHeight));
      const zoom = reduced ? 1 : ease(clamp(progress / .34));
      if (map && loaded && from && target) {
        map.jumpTo({ center: [from.center[0] + (target[0] - from.center[0]) * zoom, from.center[1] + (target[1] - from.center[1]) * zoom], zoom: from.zoom + (15.6 - from.zoom) * zoom,
          padding: phone ? { top: 12, bottom: H * .5, left: 12, right: 12 } : { top: 40, bottom: 40, left: W * .38, right: 40 } });
      }
      const timeline = reduced ? 1 : clamp((progress - .38) / .54), pos = timeline * 6;
      let step = 0;
      while (step < 2 && pos > EDGE[step + 1]) step++;
      const fraction = clamp((pos - EDGE[step]) / (EDGE[step + 1] - EDGE[step]));
      const day = timeline === 1 ? 7 : Math.round(STEPS[step].day + (STEPS[step + 1].day - STEPS[step].day) * fraction);
      if (timeline === 1) step = 3;
      setTime(old => old.day === day && old.step === step ? old : { day, step });

      // These screen-space routes are illustrative, never animal GPS locations.
      const panelTop = panel.current ? panel.current.getBoundingClientRect().top - viewport.getBoundingClientRect().top : H * .55;
      const careY = phone ? Math.max(150, Math.min(H * .38, panelTop - 65)) : H * .66;
      const home: Pt = [W * (phone ? .63 : .66), phone ? Math.max(110, Math.min(H * .19, careY - 95)) : H * .31];
      const care: Pt = [W * (phone ? .25 : .8), careY];
      const start: Pt = [W + 80, H * .08];
      const routes = [road(start, home, .18), road(home, care, .22), road(care, home, .26)];
      const segment = (k: number) => clamp((pos - EDGE[k]) / (EDGE[k + 1] - EDGE[k]));
      const arrival = ease(segment(0)), toCare = ease(clamp(segment(1) / .7));
      const stay = clamp(segment(2) / .5), back = ease(clamp((segment(2) - .5) / .5));
      const amounts = [arrival, toCare, back];
      routes.forEach((d, i) => { const path = paths.current[i]; if (path) { path.setAttribute("d", d); path.style.strokeDashoffset = String(1 - amounts[i]); } });
      const at = (i: number, p: number): Pt => { const path = paths.current[i]; if (!path) return home; const point = path.getPointAtLength(path.getTotalLength() * p); return [point.x, point.y]; };
      let dog: Pt = home;
      if (!reduced) dog = back > 0 ? at(2, back) : toCare >= 1 ? care : toCare > 0 ? at(1, toCare) : home;
      // The team travels WITH the animal on both legs, including the return.
      let team: Pt = at(0, arrival);
      if (arrival >= 1) team = back > 0 ? at(2, back) : toCare >= 1 ? [care[0] - 12, care[1] - 56] : toCare > 0 ? at(1, toCare) : home;
      if (reduced) team = home;
      const place = (el: HTMLElement | null, p: Pt) => { if (el) el.style.transform = `translate3d(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px,0)`; };
      place(dogEl.current, dog); place(teamEl.current, team); place(careEl.current, care); place(homeEl.current, home);
      const fit = (el: HTMLElement | null | undefined, point: Pt, gap: number) => {
        if (!el) return;
        const width = el.offsetWidth;
        el.style.left = `${point[0] + gap + width < W - 12 ? gap : -gap - width}px`;
      };
      fit(teamEl.current?.querySelector("span"), team, 20);
      fit(careEl.current?.querySelector(".ld-dive-care-tag"), care, 42);
      fit(homeEl.current?.querySelector("span"), home, 32);
      actors.current?.classList.toggle("is-team", reduced || pos > .02);
      actors.current?.classList.toggle("is-care", reduced || toCare >= 1);
      actors.current?.classList.toggle("is-carried", !reduced && ((toCare > 0 && toCare < 1) || (back > 0 && back < 1)));
      actors.current?.classList.toggle("is-home", reduced || timeline === 1);
      if (fill.current) fill.current.style.strokeDashoffset = String(1 - (reduced ? 1 : Math.max(stay, back > 0 ? 1 : 0)));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const motion = () => { setCalm(media.matches); on(); };
    motion(); media.addEventListener("change", motion);
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    // Defer the optional geographic backdrop; the story works without WebGL or tiles.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (!box || !supportsWebGL2()) return;
      import("maplibre-gl").then(ml => {
        if (dead || !mapEl.current) return;
        ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        try {
          map = new ml.Map({ container: mapEl.current, style: groundStyle(NIGHT), bounds: box, interactive: false, fadeDuration: 0,
            attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap" } });
          map.on("load", () => {
            if (dead || !map) return;
            const camera = map.cameraForBounds(box, { padding: 40 });
            const center = camera?.center;
            from = { center: center ? Array.isArray(center) ? center as Pt : ["lng" in center ? center.lng : center.lon, center.lat] : target!, zoom: camera?.zoom ?? 11 };
            loaded = true; setMapReady(true); underlay(map, NIGHT).catch(() => {}); on();
          });
        } catch { /* The illustrated street remains usable. */ }
      }).catch(() => {});
    }, { rootMargin: "500px" });
    if (section.current) observer.observe(section.current);
    const resize = new ResizeObserver(() => { map?.resize(); on(); }); if (mapEl.current) resize.observe(mapEl.current);
    return () => { dead = true; observer.disconnect(); resize.disconnect(); media.removeEventListener("change", motion); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); map?.remove(); };
  }, [box]);

  return <section ref={section} id="request-journey" className={`ld-dive restored-request${calm ? " is-calm" : ""}`} aria-labelledby="ld-dive-title">
    <div className="ld-dive-stage">
      <svg className={`request-street${mapReady ? " has-map" : ""}`} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g className="request-blocks"><path d="M580 50h170v150H580zM820 50h220v150H820zM540 270h210v180H540zM820 270h230v180H820zM580 520h170v200H580zM820 520h240v200H820z"/></g><g className="request-streets"><path d="M780 0v800M450 235h750M450 485h750M1100 0v800"/><path d="M500 100Q640 390 530 800"/></g></svg>
      <div ref={mapEl} className="ld-dive-map" aria-hidden="true" />
      <div ref={actors} className="ld-dive-act is-acting" aria-hidden="true">
        <svg className="ld-dive-roads">{["team", "carry", "back"].map((name, i) => <path key={name} ref={el => { paths.current[i] = el; }} className={`is-${name}`} pathLength={1}/>)}</svg>
        <div ref={homeEl} className="ld-dive-home"><span>Back on the same street</span></div>
        <div ref={careEl} className="ld-dive-care"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" className="is-track"/><circle ref={fill} cx="32" cy="32" r="28" className="is-fill" pathLength={1}/></svg><b>+</b><span className="ld-dive-care-tag"><strong>Care & follow-up</strong><em>Added to the record</em></span></div>
        <div ref={teamEl} className="ld-dive-team"><span><Truck size={18}/>Field team</span></div>
        <div ref={dogEl} className="ld-dive-animal">{/* Existing licensed folk artwork; never presented as a real animal likeness. */}{/* eslint-disable-next-line @next/next/no-img-element */}<img src={FOLK_CUTOUTS.dogStanding.src} alt="" width={76} height={64}/></div>
      </div>
      <div ref={panel} className="ld-dive-panel">
        <p className="ld-dive-kicker">An illustrative seven-day journey</p>
        <h2 id="ld-dive-title">One request, followed to the end.</h2>
        <p className="ld-dive-day" aria-hidden="true"><span>Day</span><b>{time.day}</b><span>of 7</span></p>
        <ol className="ld-dive-steps" aria-label="Illustrative journey over seven days">{STEPS.map((step, i) => <li key={step.day} className={i < time.step ? "is-past" : i === time.step ? "is-now" : ""}><i aria-hidden/><span className="ld-dive-what"><b>{step.what}</b><span className="request-step-day">Day {step.day}</span></span><span className="ld-dive-detail">{step.detail}</span></li>)}</ol>
        <p className="ld-dive-note">Example only. Review, pickup, care and return depend on participating teams. No seven-day response or resolution is promised.</p>
        <a className="request-skip" href="#ecosystem">Continue to the people behind the care</a>
      </div>
      <p className="request-caption">Illustrative animal and routes{geography ? ` · ${geography.city} basemap` : " · schematic street"}. <a href="/art-credits">Artwork credits</a></p>
    </div>
  </section>;
}
