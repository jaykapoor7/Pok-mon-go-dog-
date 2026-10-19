"use client";

/* ════════════════════════════════════════════════════════════════════
   One ecosystem, four ways in.

   The same streets of the sample city are drawn twice and kept in step:
   once as a hand-tinted folk map (roads engraved in turmeric and
   vermilion, buildings in terracotta, water rippled: the Map's own
   illustrated ground, real OpenStreetMap geometry) and once as the
   night atlas of the record, its areas standing as columns of light.
   As the page moves through the four people StrayPaw serves, an
   organic edge opens the drawing onto the record and the camera climbs
   from one street to the whole country. Beside it, the real software
   each of them uses comes in from its own direction.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { ArrowUpRight, Camera, Check, MapPin } from "lucide-react";
import { groundStyle as nightStyle, underlay, supportsWebGL2, NIGHT, GLYPHS } from "@/components/map/basemap";
import { groundStyle as folkStyle, drawGround } from "@/sp/map/ground";
import { useStage, span, ease } from "@/components/bindu/stage";
import { addRecord, areasGeo, camBetween, edgeGlow, fromCentres, setNight, type Cam, type Cell } from "@/components/bindu/mapkit";

export type Queue = { condition: string; locality: string; days: number; critical: boolean }[];
export type CityBrief = { city: string; animals: number; cells: number; sterilised: number; ster_unknown: number; cases: number } | null;
export type Loc = { name: string; open: number };

const WAYS = [
  { k: "res", who: "Residents and volunteers", say: "See an animal in need. Report it in a minute.", cta: "Report an animal", href: "/community/report" },
  { k: "ngo", who: "Animal welfare organisations", say: "Every report becomes a case someone owns.", cta: "StrayPaw for NGOs", href: "/for-ngos" },
  { k: "city", who: "Municipal teams", say: "Where help is needed, area by area, with the limits shown.", cta: "StrayPaw for cities", href: "/for-governments" },
  { k: "fund", who: "Partners and funders", say: "Outcomes you can check, not claims.", cta: "StrayPaw for funders", href: "/for-funders" },
] as const;
const f = (n: number) => n.toLocaleString("en-IN");

export function Ecosystem({ cells, focus, place, queue, brief, locs }: { cells: Cell[]; focus: [number, number]; place: string; queue: Queue; brief: CityBrief; locs: Loc[] }) {
  const { p, listen, step, still } = useStage();
  const folkEl = useRef<HTMLDivElement>(null), nightEl = useRef<HTMLDivElement>(null), wrap = useRef<HTMLDivElement>(null);
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    const a = folkEl.current, b = nightEl.current, w = wrap.current; if (!a || !b || !w) return;
    if (!supportsWebGL2()) { setFlat(true); return; }
    let folk: MLMap | null = null, night: MLMap | null = null, raf = 0, alive = true, on = false;
    const t0 = performance.now();
    const K: [number, Cam][] = [
      [0, { c: focus, z: 15.4, pitch: 0, bearing: 0 }],
      [0.3, { c: focus, z: 13.1, pitch: 50, bearing: -18 }],
      [0.58, { c: focus, z: 11.8, pitch: 58, bearing: 22 }],
      [0.86, { c: [80.2, 21.5], z: 4.3, pitch: 28, bearing: 0 }],
      [1, { c: [80.2, 21.5], z: 4.2, pitch: 24, bearing: -4 }],
    ];
    const frame = (now: number) => {
      raf = 0; if (!alive) return;
      const P = still ? 0.62 : p.current;
      let i = 0; while (i < K.length - 2 && P > K[i + 1][0]) i++;
      const cam = camBetween(K[i][1], K[i + 1][1], ease.inOut(span(P, K[i][0], K[i + 1][0])));
      const phone = w.clientWidth < 900, W = w.clientWidth, H = w.clientHeight;
      /* the place sits between the words (left) and the software (right); on a phone, above the sheet */
      const padding = phone ? { top: H * 0.16, bottom: H * 0.46, left: 0, right: 0 } : { left: W * 0.3, right: W * 0.37, top: 0, bottom: 0 };
      const view = { center: cam.c, zoom: cam.z, pitch: cam.pitch, bearing: cam.bearing, padding };
      folk?.jumpTo(view); night?.jumpTo(view);
      /* the organic edge: a breathing blob that opens from the reported place until it fills the frame */
      const r = ease.inOut(span(P, 0.14, 0.56)), R = r * Math.hypot(W, H) * 0.75, t = (now - t0) / 1000;
      const cx = phone ? W * 0.5 : W * 0.465, cy = phone ? H * 0.35 : H * 0.5, pts: string[] = [];
      for (let k = 0; k < 56; k++) {
        const th = (k / 56) * Math.PI * 2, rr = R * (1 + 0.09 * Math.sin(3 * th + t * 0.9) + 0.05 * Math.sin(5 * th - t * 1.3) + 0.03 * Math.sin(8 * th + t * 2));
        pts.push(`${(cx + Math.cos(th) * rr).toFixed(1)}px ${(cy + Math.sin(th) * rr).toFixed(1)}px`);
      }
      b.style.clipPath = r >= 0.999 ? "none" : r <= 0.001 ? "circle(0px at 50% 50%)" : `polygon(${pts.join(",")})`;
      w.style.setProperty("--edge", r.toFixed(3));
      if (on && !still) raf = requestAnimationFrame(frame);
    };
    const start = async () => {
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      if (!alive) return;
      const pr = Math.min(w.clientWidth < 900 ? 1.25 : 1.75, window.devicePixelRatio || 1);
      const opts = { interactive: false, attributionControl: false as const, fadeDuration: 0, maxPitch: 75, pixelRatio: pr, center: focus, zoom: 15.4 };
      folk = new ml.Map({ ...opts, container: a, style: { ...folkStyle(), glyphs: GLYPHS } });
      night = new ml.Map({ ...opts, container: b, style: { ...nightStyle(NIGHT), glyphs: GLYPHS }, attributionControl: { compact: true } });
      folk.on("load", () => { if (folk) drawGround(folk).then(() => frame(performance.now())).catch(() => {}); });
      night.on("load", () => {
        const m = night!; setNight(m);
        try { m.setProjection({ type: "mercator" }); } catch { /* flat */ }
        addRecord(m, areasGeo(fromCentres(cells)), 0.5, "eco");
        underlay(m, NIGHT, "eco-glow").then(() => { edgeGlow(m); frame(performance.now()); });
        frame(performance.now());
      });
      frame(performance.now());
    };
    let started = false;
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on && !started) { started = true; start(); }
      if (on && !raf) raf = requestAnimationFrame(frame);
    }, { rootMargin: "300px 0px" });
    io.observe(w);
    const off = listen(() => { if (on && !raf) raf = requestAnimationFrame(frame); });
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); off(); folk?.remove(); night?.remove(); };
  }, [cells, focus, p, listen, still]);

  const jump = (i: number) => {
    const sec = wrap.current?.closest("section"); if (!sec) return;
    const top = sec.getBoundingClientRect().top + window.scrollY, span2 = sec.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span2 * ((i + 0.5) / WAYS.length), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const s = still ? -1 : step;
  const at = (i: number) => (still ? " is-on" : s === i ? " is-on" : s > i ? " is-past" : "");

  return (
    <div className={`eco${flat ? " is-flat" : ""}`} ref={wrap}>
      <div className="eco-maps" aria-hidden>
        <div ref={folkEl} className="eco-folk" />
        <div ref={nightEl} className="eco-night" />
        <span className="eco-cap is-folk">{place}, drawn by hand from the street map</span>
        <span className="eco-cap is-night">The same streets, on the record</span>
      </div>

      <div className="eco-copy">
        <h2>One ecosystem. <em>Four ways in.</em></h2>
        <ol className="eco-ways">
          {WAYS.map((x, i) => (
            <li key={x.k} className={at(i)}>
              <button type="button" onClick={() => jump(i)} aria-current={s === i ? "step" : undefined}><i aria-hidden>{String(i + 1).padStart(2, "0")}</i><b>{x.who}</b></button>
              <div className="eco-say"><div><p>{x.say}</p><Link href={x.href}>{x.cta} <ArrowUpRight size={14} aria-hidden /></Link></div></div>
            </li>
          ))}
        </ol>
        <Link href="/product" className="eco-prod">See the product <ArrowUpRight size={14} aria-hidden /></Link>
      </div>

      <div className="eco-screens">
        <article className={`eco-scr is-res${at(0)}`} aria-label="Reporting an animal, as a resident sees it">
          <header><b>Report an animal</b><small>Community</small></header>
          <ol className="eco-form">
            <li><Camera size={16} aria-hidden /><span><b>Photo</b><small>1 added · blurred if it may show an injury</small></span><Check size={15} aria-hidden /></li>
            <li><MapPin size={16} aria-hidden /><span><b>Where</b><small>{place} · placed to about 0.7 km²</small></span><Check size={15} aria-hidden /></li>
            <li><i aria-hidden /><span><b>What you saw</b><small>Injured · bleeding back leg</small></span><Check size={15} aria-hidden /></li>
          </ol>
          <p className="eco-receipt"><b>Received</b><span>Not yet accepted by an organisation. You will see when it is.</span></p>
        </article>

        <article className={`eco-scr is-ngo${at(1)}`} aria-label="The NGO workspace, live">
          <header><b>Today&rsquo;s work</b><small>NGO workspace · live record</small></header>
          <ol className="eco-q">{queue.slice(0, 5).map((q, i) => <li key={i} className={q.critical ? "is-crit" : ""}><b>{q.condition}</b><span>{q.locality}</span><em>{q.days === 0 ? "today" : `${q.days}d`}</em></li>)}</ol>
          <p className="eco-note">Real open requests on the public record. No organisation is named.</p>
        </article>

        <article className={`eco-scr is-city${at(2)}`} aria-label="The city brief, live">
          <header><b>{brief?.city ?? "City"} brief</b><small>Municipal view · live record</small></header>
          {brief && (
            <dl className="eco-figs">
              <div><dt>Animals on the record</dt><dd>{f(brief.animals)}</dd></div>
              <div><dt>Mapped areas</dt><dd>{f(brief.cells)}</dd></div>
              <div><dt>Recorded sterilised</dt><dd>{f(brief.sterilised)}</dd></div>
              <div><dt>Not recorded</dt><dd>{f(brief.ster_unknown)}</dd></div>
            </dl>
          )}
          <ol className="eco-bars">{locs.slice(0, 4).map((l) => <li key={l.name}><span>{l.name}</span><b>{f(l.open)}</b><i style={{ width: `${(l.open / Math.max(1, locs[0]?.open ?? 1)) * 100}%` }} /></li>)}</ol>
          <p className="eco-note">Open requests by locality. Unknown sterilisation is never counted as no.</p>
        </article>

        <article className={`eco-scr is-fund${at(3)}`} aria-label="An evidence report, from the public record">
          <header><b>Evidence of work</b><small>Report · {brief?.city ?? "city"} · public record</small></header>
          {brief && (
            <dl className="eco-figs">
              <div><dt>Requests for help</dt><dd>{f(brief.cases)}</dd></div>
              <div><dt>Animals on the record</dt><dd>{f(brief.animals)}</dd></div>
            </dl>
          )}
          <ul className="eco-checks">
            <li><Check size={14} aria-hidden />Every figure names its source</li>
            <li><Check size={14} aria-hidden />Imported history labelled apart from live work</li>
            <li><Check size={14} aria-hidden />Exports for partners, as PDF</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
