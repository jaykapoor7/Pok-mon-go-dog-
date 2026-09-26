"use client";

/* ════════════════════════════════════════════════════════════════════
   Photographed onto the record: a night tour of the city's photographed
   animals.

   Each photograph a resident took sits on the hero's night streets as a
   small portrait, at the centre of the animal's cell (the finest place the
   public record gives, never an address). While the section is on screen
   the camera glides from one animal to the next and the large print beside
   the map shows who it is, where, and its StrayPaw ID; the strip beneath
   jumps to any of them. Under reduced motion the camera does not glide: it
   moves only when a portrait is chosen. It does not exist below four
   photographs placed on the map.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { ArrowUpRight } from "lucide-react";
import { NIGHT, groundStyle, underlay } from "@/components/map/basemap";
import { sized } from "@/lib/photo/src";
import { cleanPlace, placeLine } from "@/lib/utils";

export type PhotoRow = { id: string; name: string | null; straypaw_id: string | null; cover_photo: string; zone: string | null; city: string | null; last_seen: string | null; pt?: [number, number] | null };

const label = (r: PhotoRow) => (r.name && r.name.trim()) || `A dog near ${cleanPlace(r.zone) || r.city || "the reported spot"}`;
const HOLD_MS = 4600;

export function PhotoRegister({ rows, total }: { rows: PhotoRow[]; total: number }) {
  const placed = useMemo(() => rows.filter((r) => r.pt).slice(0, 16), [rows]);
  const [at, setAt] = useState(0);
  const [live, setLive] = useState(false);
  const [calm, setCalm] = useState(false);
  const held = useRef(0); // when someone chose a portrait, the tour waits
  const wrap = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markers = useRef<Marker[]>([]);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const node = wrap.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.35 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /* The map, once: every portrait as a marker on the night streets. */
  useEffect(() => {
    if (placed.length < 4) return;
    let map: MLMap | null = null, dead = false;
    import("maplibre-gl").then((ml) => {
      if (dead || !mapEl.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: mapEl.current, style: groundStyle(NIGHT), center: placed[0].pt!, zoom: 14.6, interactive: false, fadeDuration: 0,
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap" },
      });
      mapRef.current = map;
      map.on("load", () => {
        const m = map!;
        m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        underlay(m, NIGHT).catch(() => {});
        markers.current = placed.map((r, i) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "ld-tour-pin";
          el.setAttribute("aria-label", `${label(r)}, on the map`);
          const img = document.createElement("img");
          img.src = sized(r.cover_photo, 96); img.alt = ""; img.loading = "lazy";
          el.appendChild(img);
          el.addEventListener("click", () => { held.current = Date.now(); setAt(i); });
          return new ml.Marker({ element: el, anchor: "center" }).setLngLat(r.pt!).addTo(m);
        });
        markers.current[0]?.getElement().classList.add("is-on");
      });
    });
    return () => { dead = true; markers.current.forEach((mk) => mk.remove()); markers.current = []; map?.remove(); mapRef.current = null; };
  }, [placed]);

  /* The camera follows the chosen animal: a glide, or a cut under reduced motion. */
  useEffect(() => {
    const m = mapRef.current, r = placed[at];
    markers.current.forEach((mk, i) => mk.getElement().classList.toggle("is-on", i === at));
    if (!m || !r?.pt) return;
    const wide = (mapEl.current?.clientWidth ?? 0) > 760;
    const padding = wide ? { top: 40, bottom: 40, left: Math.min(460, (mapEl.current?.clientWidth ?? 0) * 0.38), right: 40 } : { top: 20, bottom: 20, left: 20, right: 20 };
    if (calm) m.jumpTo({ center: r.pt, zoom: 15, padding });
    else m.flyTo({ center: r.pt, zoom: 15, padding, speed: 0.7, curve: 1.3, essential: false });
  }, [at, placed, calm]);

  /* The tour: one animal every few seconds while on screen. */
  useEffect(() => {
    if (calm || !live || placed.length < 2) return;
    const id = window.setInterval(() => {
      if (Date.now() - held.current < 12_000) return;
      setAt((i) => (i + 1) % placed.length);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [calm, live, placed.length]);

  if (placed.length < 4) return null;
  const r = placed[at];
  const pick = (i: number) => { held.current = Date.now(); setAt(i); };

  return (
    <div className="ld-tour" ref={wrap}>
      <div className="ld-tour-head">
        <h2 className="ld-tour-title">Photographed <em>onto the record.</em></h2>
        <p className="sys-mono">{total.toLocaleString("en-IN")} animals with a photograph · each where it was recorded</p>
      </div>
      <div className="ld-tour-stage">
        <div ref={mapEl} className="ld-tour-map" role="img" aria-label="Photographed animals on the city's night streets, each at its cell" />
        <figure className="ld-tour-print" aria-live="polite">
          <Link href={`/dog/${r.id}`} className="ld-tour-photo" key={r.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sized(r.cover_photo, 640)} alt={`${label(r)}, photographed on the street`} />
          </Link>
          <figcaption>
            <b>{label(r)}</b>
            {(r.zone || r.city) && <span>{placeLine(r.zone, r.city)}</span>}
            <span className="ld-tour-id sys-mono">{r.straypaw_id ?? "ID pending"}</span>
            <Link href={`/dog/${r.id}`} className="ld-tour-go">Open the record <ArrowUpRight size={14} /></Link>
          </figcaption>
        </figure>
      </div>
      <ol className="ld-tour-strip" aria-label="Photographed animals">
        {placed.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => pick(i)} aria-pressed={i === at} aria-label={label(p)} className={i === at ? "is-on" : ""}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sized(p.cover_photo, 128)} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
