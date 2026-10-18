"use client";

/* ════════════════════════════════════════════════════════════════════
   Act V · the atlas, pulled back. The camera starts on one locality of
   the sample city and pulls back to the city, then to India: the Map's
   own outline, every recorded area as a point of light, real animals
   strung to their cities. The origin of the pull is measured from the
   city's real position, so it lands true at any screen size.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { INDIA_VIEW, indiaXY } from "@/sp/atlas/india-path";
import { IndiaStrings, type HomeCity, type HomeFace } from "@/components/home/IndiaStrings";

export function AtlasPull({ cities, faces, sky, focus }: { cities: HomeCity[]; faces: HomeFace[]; sky: [number, number, number][]; focus: { lng: number; lat: number } | null }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current; if (!el || !focus) return;
    /* The same fit IndiaStrings uses: the map is 92% of the box's height, centred. */
    const place = () => {
      const w = el.clientWidth, h = el.clientHeight, mh = h * 0.92, mw = mh * (INDIA_VIEW.w / INDIA_VIEW.h);
      const [x, y] = indiaXY(focus.lng, focus.lat);
      el.style.setProperty("--ox", `${(((w - mw) / 2 + (x / INDIA_VIEW.w) * mw) / w) * 100}%`);
      el.style.setProperty("--oy", `${(((h - mh) / 2 + (y / INDIA_VIEW.h) * mh) / h) * 100}%`);
    };
    place();
    const ro = new ResizeObserver(place); ro.observe(el);
    return () => ro.disconnect();
  }, [focus]);
  return (
    <div className="ka-world" ref={box}>
      <IndiaStrings cities={cities} faces={faces} tone="night" max={6} className="ka-map" sky={sky} />
    </div>
  );
}
