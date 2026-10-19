"use client";

/* ════════════════════════════════════════════════════════════════════
   One ecosystem, four ways in.

   One street of the sample city, drawn by hand from the real street
   map: roads engraved in turmeric and vermilion, buildings in terracotta,
   water rippled. As the page moves through the four people StrayPaw
   serves, the drawing takes on the record (each area washed marigold to
   saffron by the animals it holds, edged in a running stitch) and the
   camera rises from one street to the whole country, where every area is
   a vermilion mark. Beside it, the real software each of them uses comes
   in from its own direction.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { ArrowUpRight, Camera, Check, MapPin } from "lucide-react";
import { supportsWebGL2, GLYPHS } from "@/components/map/basemap";
import { groundStyle as folkStyle, drawGround, collapseAttribution } from "@/sp/map/ground";
import { useStage, span, ease } from "@/components/bindu/stage";
import { areasGeo, camBetween, fromCentres, type Cam, type Cell } from "@/components/bindu/mapkit";
import { addFolkRecord, folkVis, dotsAt, areasAt, washAt } from "./folk";

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
  const folkEl = useRef<HTMLDivElement>(null), wrap = useRef<HTMLDivElement>(null);
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    const a = folkEl.current, w = wrap.current; if (!a || !w) return;
    if (!supportsWebGL2()) { setFlat(true); return; }
    let folk: MLMap | null = null, raf = 0, alive = true, on = false, lastView = "", lastEdge = "";
    const memo: Record<string, string> = {};
    const K: [number, Cam][] = [
      [0, { c: focus, z: 15.4, pitch: 0, bearing: 0 }],
      [0.3, { c: focus, z: 13.6, pitch: 0, bearing: 0 }],
      [0.58, { c: focus, z: 12, pitch: 0, bearing: 0 }],
      [0.86, { c: [80.2, 21.5], z: 4.3, pitch: 0, bearing: 0 }],
      [1, { c: [80.2, 21.5], z: 4.2, pitch: 0, bearing: 0 }],
    ];
    const frame = () => {
      raf = 0; if (!alive || !folk) return;
      const P = still ? 0.62 : p.current;
      let i = 0; while (i < K.length - 2 && P > K[i + 1][0]) i++;
      const cam = camBetween(K[i][1], K[i + 1][1], ease.inOut(span(P, K[i][0], K[i + 1][0])));
      const phone = w.clientWidth < 900, W = w.clientWidth, H = w.clientHeight;
      /* the place sits between the words (left) and the software (right); on a phone, above the sheet */
      const padding = phone ? { top: H * 0.16, bottom: H * 0.46, left: 0, right: 0 } : { left: W * 0.3, right: W * 0.37, top: 0, bottom: 0 };
      const key = `${cam.c[0].toFixed(5)},${cam.c[1].toFixed(5)},${cam.z.toFixed(3)},${W},${H}`;
      if (key !== lastView) { lastView = key; folk.jumpTo({ center: cam.c, zoom: cam.z, pitch: 0, bearing: 0, padding }); }
      /* the drawing takes on the record: the streets first, then the areas washed in, then the country's marks */
      const r = ease.inOut(span(P, 0.14, 0.56));
      folkVis(folk, "eco", r * areasAt(cam.z), Math.max(r, span(P, 0.7, 0.86)) * dotsAt(cam.z), 1, memo, washAt(cam.z));
      const e = r.toFixed(2); if (e !== lastEdge) { lastEdge = e; w.style.setProperty("--edge", e); }
    };
    const start = async () => {
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      if (!alive) return;
      const pr = Math.min(w.clientWidth < 900 ? 1.25 : 1.75, window.devicePixelRatio || 1);
      const m = new ml.Map({ container: a, style: { ...folkStyle(), glyphs: GLYPHS }, interactive: false, attributionControl: { compact: true }, fadeDuration: 0, pixelRatio: pr, center: focus, zoom: 15.4 });
      folk = m;
      m.on("load", () => {
        addFolkRecord(m, areasGeo(fromCentres(cells)), "eco");
        drawGround(m, "eco-area").catch(() => false).then(() => { collapseAttribution(m); lastView = ""; frame(); });
        frame();
      });
      frame();
    };
    let started = false;
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on && !started) { started = true; start(); }
      if (on && !raf) raf = requestAnimationFrame(frame);
    }, { rootMargin: "150% 0px" });
    io.observe(w);
    const off = listen(() => { if (on && !raf) raf = requestAnimationFrame(frame); });
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); off(); folk?.remove(); };
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
