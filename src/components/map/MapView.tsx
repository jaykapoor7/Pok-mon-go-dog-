"use client";

import { useEffect, useMemo, useState, useRef, type CSSProperties } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { MapAnimalDetails } from "./MapAnimalDetails";
import { MapCanvas } from "@/components/map/MapCanvas";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { orgAnimals } from "@/lib/programme";
import { dogLabel, timeAgo, distanceMeters } from "@/lib/utils";
import { formatPlace } from "@/lib/delhi";
import { STATUS_META } from "@/lib/platform/coverage";
import type { Dog, FeedingZone } from "@/lib/types";
import type { MapApi } from "@/components/map/MapLibreMap";
import "./map.css";

// ── design tokens ──────────────────────────────────────────────────────────
const INK = "#0b1020";
const NIGHT = "#10182b";
const SAFFRON = "#8fb7ff"; // primary signal accent
const MINT = "#66c5d5"; // field / in-progress
const DANGER = "#ff6a4f"; // gap / urgency
const VIOLET = "#a68cff"; // study / research
const BORDER = "rgba(255,255,255,0.07)";
const BORDER_MED = "rgba(255,255,255,0.12)";

// ── icons ───────────────────────────────────────────────────────────────────
function ChevronRight({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l4 4-4 4"/></svg>
}

// ── main component ───────────────────────────────────────────────────────────
export function MapView({
  dogs: allDogs,
  feedingZones = [],
}: {
  dogs: Dog[];
  feedingZones?: FeedingZone[];
}) {
  const [selected, setSelected] = useState<Dog | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const lastTrigger = useRef<HTMLElement | null>(null);
  /* Published by the map once it loads; until then the controls are disabled
     rather than present-but-inert. */
  const [mapApi, setMapApi] = useState<MapApi | null>(null);
  const [tilted, setTilted] = useState(false);
  /* The legend has always listed a coverage-gap layer; now it renders one. */
  const [showGaps, setShowGaps] = useState(false);
  /* The four figures under the map were a read-out. They are the obvious
     filters, and people kept clicking them, so they are now the control:
     tap one and the map shows only those animals. Null is everything. */
  const [only, setOnly] = useState<"needs" | "sterilised" | "vaccinated" | null>(null);
  const params = useSearchParams();
  const router = useRouter();

  const sLat = parseFloat(params.get("lat") ?? "");
  const sLng = parseFloat(params.get("lng") ?? "");
  const urlCentre =
    Number.isFinite(sLat) && Number.isFinite(sLng) ? { lat: sLat, lng: sLng } : null;

  /* A searched ward or district carries its extent, not just its middle.
     Framing the whole area is the difference between "here is Thanjavur
     district" and "here is a point somewhere in Thanjavur district" — a
     fixed zoom cannot serve both a 4 km² ward and a 3,400 km² district. */
  const bboxParam = params.get("bbox");
  const urlBounds = (() => {
    if (!bboxParam) return null;
    const n = bboxParam.split(",").map(Number);
    if (n.length !== 4 || n.some((v) => !Number.isFinite(v))) return null;
    return [
      [n[0], n[1]],
      [n[2], n[3]],
    ] as [[number, number], [number, number]];
  })();

  /* Where an organisation actually works.

     Opening on a map of all India is useless to a team in Chennai: they
     have to pan and zoom before they can do anything. The centre of the
     animals they have on the register is the best available answer to
     "where is your work", and it needs no extra data and no geocoding.

     Order of preference: an explicit lat/lng in the URL, then the
     organisation's own records, then the browser's location, then whatever
     the map defaults to. */
  const [orgCentre, setOrgCentre] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let live = true;
    orgAnimals({ limit: 300 })
      .then((rows) => {
        if (!live) return;
        const pts = rows.filter(
          (r) => typeof r.lat === "number" && typeof r.lng === "number" && r.lat !== 0 && r.lng !== 0
        );
        if (pts.length === 0) return;
        setOrgCentre({
          lat: pts.reduce((n, r) => n + (r.lat as number), 0) / pts.length,
          lng: pts.reduce((n, r) => n + (r.lng as number), 0) / pts.length,
        });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const center = urlCentre ?? orgCentre ?? coords;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 6000 }
    );
  }, []);

  function handleSelect(dog: Dog | null) {
    lastTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(dog);
    setDrawerOpen(!!dog);
    if (dog) mapApi?.focusAnimal(dog);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelected(null);
    lastTrigger.current?.focus();
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setDrawerOpen(false); setSelected(null); lastTrigger.current?.focus(); } };
    addEventListener("keydown", escape);
    return () => removeEventListener("keydown", escape);
  }, [drawerOpen]);

  /* Everything in the bottom strip is counted from the records actually
     loaded. Pre-launch these are genuinely zero, and the strip says so
     rather than showing invented activity. */
  const dogs = useMemo(() => {
    if (only === "needs") return allDogs.filter((d) => d.needs_help);
    if (only === "sterilised") return allDogs.filter((d) => d.sterilised);
    if (only === "vaccinated") return allDogs.filter((d) => d.vaccinated);
    return allDogs;
  }, [allDogs, only]);

  const recent = useMemo(() => [...dogs].sort((a, b) => +new Date(b.last_seen) - +new Date(a.last_seen)).slice(0, 20), [dogs]);

  const counts = useMemo(() => {
    const needsHelp = allDogs.filter((d) => d.needs_help).length;
    const sterilised = allDogs.filter((d) => d.sterilised).length;
    const vaccinated = allDogs.filter((d) => d.vaccinated).length;
    return [
      { key: null,          value: String(allDogs.length), label: "ALL ANIMALS", sub: "ON THE MAP",  color: SAFFRON },
      { key: "needs",       value: String(needsHelp),      label: "NEED HELP",   sub: "UNRESOLVED",  color: DANGER },
      { key: "sterilised",  value: String(sterilised),     label: "STERILISED",  sub: "ON RECORD",   color: MINT },
      { key: "vaccinated",  value: String(vaccinated),     label: "VACCINATED",  sub: "ON RECORD",   color: VIOLET },
    ] as const;
  }, [allDogs]);

  const dist = selected && coords ? distanceMeters(coords, selected) : null;
  const fmtDist = (d: number) => d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;

  return (
    <div className={`sp-map ${drawerOpen ? "has-selection" : ""}`} style={{ fontFamily: "var(--font-sans, DM Sans, ui-sans-serif, system-ui, sans-serif)" }}>

      {/* The console is a canvas UI with no visible headline, but the document
          still needs one for assistive tech and search. */}
      <h1
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          margin: -1,
          padding: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Street animals, studies and outcomes across India
      </h1>

      {/* MAP + OVERLAYS */}
        <div className="sp-map-canvas">
          <MapCanvas
            dogs={dogs}
            onSelect={handleSelect}
            selectedId={selected?.id ?? null}
            center={center}
            bounds={urlBounds}
            feedingZones={feedingZones}
            onReady={setMapApi}
            showGaps={showGaps}
          />

          {/* One compact control surface, rather than a dashboard laid over a
              map. Filters are direct views of the loaded record, not saved
              searches or another layer of navigation. */}
          <section className="sp-map-toolbar" aria-label="Map controls">
            <div className="sp-map-title"><span className="spa-mono">Neighbourhood map</span><h2>Find a familiar face.</h2></div>
            <div className="sp-map-filters" role="group" aria-label="Filter animals">
              {counts.map((k) => (
                <button
                  key={k.label}
                  type="button"
                  onClick={() => { setOnly(k.key); setDrawerOpen(false); setSelected(null); }}
                  aria-pressed={only === k.key}
                  className={only === k.key ? "is-active" : ""}
                  style={{ "--sp-filter": k.color } as CSSProperties}
                >
                  <b>{k.value}</b><span>{k.key === null ? "All" : k.label.toLowerCase()}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Map legend (bottom-left of map) */}
          <div className="sp-map-legend">
            <button
              type="button"
              onClick={() => setShowGaps((v) => !v)}
              aria-pressed={showGaps}
              className={showGaps ? "sp-map-gap-toggle is-active" : "sp-map-gap-toggle"}
            >
              <span style={{
                width: 10, height: 10, borderRadius: "50%",
                border: `2px solid ${showGaps ? "#8fb7ff" : "rgba(255,255,255,0.4)"}`,
                background: showGaps ? "rgba(143,183,255,0.35)" : "transparent",
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 10.5, letterSpacing: "0.1em",
              }}>
                DATA GAPS BY STATE
              </span>
            </button>

            {showGaps && (
              <div style={{ display: "grid", gap: 5, marginTop: 2 }}>
                {Object.entries(STATUS_META).map(([k, m]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{
                      width: 9, height: 9, borderRadius: "50%",
                      border: `2px solid ${m.colour}`, background: `${m.colour}2e`, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 10, letterSpacing: "0.06em", color: "rgba(255,255,255,0.66)" }}>
                      {m.label.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Map controls */}
          <div className="sp-map-controls">
            {([
              { key: "fit", glyph: <Maximize2 size={19}/>, title: "Fit all of India", run: () => mapApi?.fitIndia() },
              { key: "3d", glyph: "3D", title: "Toggle 3D tilt", run: () => setTilted(Boolean(mapApi?.toggle3D())) },
              { key: "in", glyph: <Plus size={20}/>, title: "Zoom in", run: () => mapApi?.zoomIn() },
              { key: "out", glyph: <Minus size={20}/>, title: "Zoom out", run: () => mapApi?.zoomOut() },
            ] as const).map((b) => {
              const on = b.key === "3d" && tilted;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={b.run}
                  title={b.title}
                  aria-label={b.title}
                  aria-pressed={b.key === "3d" ? tilted : undefined}
                  disabled={!mapApi}
                  data-control={b.key}
                  className={on ? "is-active" : ""}
                >
                  {b.glyph}
                </button>
              );
            })}
          </div>

          <button className="sp-map-report" onClick={() => {
            const point = mapApi?.getCenter();
            router.push(point ? `/report?lat=${point.lat}&lng=${point.lng}` : "/report");
          }}><Plus size={18}/> Report here</button>

          <section className={`sp-map-results ${listOpen ? "" : "is-collapsed"}`} aria-label="Animal records">
            <button className="sp-map-results-heading" onClick={() => setListOpen(v => !v)} aria-expanded={listOpen} aria-controls="map-animal-list">
              <span>{dogs.length} animal{dogs.length === 1 ? "" : "s"} loaded</span><span>{listOpen ? "Hide list" : "Show list"}</span>
            </button>
            {listOpen && <div id="map-animal-list" className="sp-map-result-list">
              {recent.length ? recent.map(d => <button key={d.id} className={`sp-map-result ${selected?.id === d.id ? "is-selected" : ""}`} aria-label={`View ${dogLabel(d)}`} aria-pressed={selected?.id === d.id} onClick={() => handleSelect(d)}>
                <DogPhoto src={d.cover_photo} alt="" seed={d.id} className="sp-map-result-photo"/>
                <span className="sp-map-result-copy"><b>{dogLabel(d)}</b><span>{formatPlace(d.zone, d.city) || "Location on map"}</span><small className={d.needs_help ? "needs-help" : ""}>{d.needs_help ? "Needs help" : `Seen ${timeAgo(d.last_seen)}`}</small></span>
                <ChevronRight/>
              </button>) : <div className="sp-map-empty"><b>{only ? "No matching records." : "A street waiting to be known."}</b><p>{only ? "Try another filter to see more animals." : "No animal records are available here yet. A sighting is a place to start."}</p>{only ? <button onClick={() => setOnly(null)}>Show all animals</button> : <Link href="/report">Report a sighting →</Link>}</div>}
              {dogs.length > 20 && <p className="sp-map-list-note">The 20 most recently seen. Explore the map for more.</p>}
            </div>}
          </section>
          {drawerOpen && selected && <aside className="sp-map-detail" aria-label="Animal details">
            <MapAnimalDetails key={selected.id} dog={selected} distance={dist === null ? null : fmtDist(dist)} onClose={closeDrawer}/>
          </aside>}

        </div>
    </div>
  );
}
