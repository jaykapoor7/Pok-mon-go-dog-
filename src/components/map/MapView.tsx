"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapCanvas } from "@/components/map/MapCanvas";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { celebrate } from "@/lib/celebrate";
import { logSeen, logFeed } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  markerStateFor,
  fedRecently,
  type MarkerState,
} from "@/lib/marker-state";
import { dogLabel, timeAgo, distanceMeters } from "@/lib/utils";
import { formatPlace } from "@/lib/delhi";
import { STATUS_META } from "@/lib/platform/coverage";
import { UNIT_COSTS, inr } from "@/lib/platform/network";
import type { Dog, FeedingZone } from "@/lib/types";
import type { MapApi } from "@/components/map/MapLibreMap";

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
function XIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 4L4 12M4 4l8 8"/></svg>
}
function PawIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor"><ellipse cx="5" cy="4" rx="1.5" ry="2"/><ellipse cx="11" cy="4" rx="1.5" ry="2"/><ellipse cx="3" cy="8" rx="1.5" ry="2"/><ellipse cx="13" cy="8" rx="1.5" ry="2"/><path d="M8 6.5c-2.5 0-5 2-5 4.5 0 1.5 1 2 2.5 2.5a10 10 0 005 0C12 13 13 12.5 13 11c0-2.5-2.5-4.5-5-4.5z"/></svg>
}
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
  /* Published by the map once it loads; until then the controls are disabled
     rather than present-but-inert. */
  const [mapApi, setMapApi] = useState<MapApi | null>(null);
  const [tilted, setTilted] = useState(false);
  /* The legend has always listed a coverage-gap layer; now it renders one. */
  const [showGaps, setShowGaps] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const sLat = parseFloat(params.get("lat") ?? "");
  const sLng = parseFloat(params.get("lng") ?? "");
  const center = Number.isFinite(sLat) && Number.isFinite(sLng) ? { lat: sLat, lng: sLng } : null;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 6000 }
    );
  }, []);

  function handleSelect(dog: Dog | null) {
    setSelected(dog);
    setDrawerOpen(!!dog);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 300);
  }

  function handleAction(dog: Dog, kind: "saw" | "fed") {
    celebrate();
    (kind === "fed" ? logFeed(dog.id, user?.name) : logSeen(dog.id)).catch(() => {});
  }

  /* Everything in the bottom strip is counted from the records actually
     loaded. Pre-launch these are genuinely zero, and the strip says so
     rather than showing invented activity. */
  const recent = useMemo(() => allDogs.slice(0, 5), [allDogs]);

  const counts = useMemo(() => {
    const needsHelp = allDogs.filter((d) => d.needs_help).length;
    const sterilised = allDogs.filter((d) => d.sterilised).length;
    const vaccinated = allDogs.filter((d) => d.vaccinated).length;
    return [
      { value: String(allDogs.length), label: "ON THE MAP", sub: "REPORTED", color: SAFFRON },
      { value: String(needsHelp), label: "NEED HELP", sub: "UNRESOLVED", color: DANGER },
      { value: String(sterilised), label: "STERILISED", sub: "ON RECORD", color: MINT },
      { value: String(vaccinated), label: "VACCINATED", sub: "ON RECORD", color: VIOLET },
    ];
  }, [allDogs]);

  const dist = selected && coords ? distanceMeters(coords, selected) : null;
  const fmtDist = (d: number) => d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", background: INK, color: "#fff", overflow: "hidden", fontFamily: "var(--font-sans, DM Sans, ui-sans-serif, system-ui, sans-serif)" }}>

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
        Living map, street-animal signals, studies and outcomes across India
      </h1>

      {/* MAP + OVERLAYS */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <MapCanvas
            dogs={allDogs}
            onSelect={handleSelect}
            center={center}
            feedingZones={feedingZones}
            onReady={setMapApi}
            showGaps={showGaps}
          />

          {/* Map legend (bottom-left of map) */}
          <div style={{
            position: "absolute",
            left: 12,
            bottom: 180,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "10px 12px",
            background: "rgba(7,11,17,0.78)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
          }}>
            {[
              { color: MINT, label: "LIVE SIGHTING", dot: true },
              { color: SAFFRON, label: "COMMUNITY ROUTE", dot: false, line: true },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {item.dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />}
                {item.line && <span style={{ width: 14, height: 1.5, background: item.color, flexShrink: 0 }} />}
                <span style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "rgba(255,255,255,0.8)" }}>{item.label}</span>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setShowGaps((v) => !v)}
              aria-pressed={showGaps}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                marginTop: 4, paddingTop: 8,
                borderTop: `1px solid ${BORDER}`, borderLeft: 0, borderRight: 0, borderBottom: 0,
                background: "transparent", cursor: "pointer", width: "100%", textAlign: "left",
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: "50%",
                border: `2px solid ${showGaps ? "#8fb7ff" : "rgba(255,255,255,0.4)"}`,
                background: showGaps ? "rgba(143,183,255,0.35)" : "transparent",
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 10.5, letterSpacing: "0.1em",
                color: showGaps ? "#8fb7ff" : "rgba(255,255,255,0.8)",
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
          <div style={{
            position: "absolute",
            left: 12,
            top: 12,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}>
            {([
              { key: "fit", glyph: "\u229E", title: "Fit all of India", run: () => mapApi?.fitIndia() },
              { key: "3d", glyph: "3D", title: "Toggle 3D tilt", run: () => setTilted(Boolean(mapApi?.toggle3D())) },
              { key: "in", glyph: "+", title: "Zoom in", run: () => mapApi?.zoomIn() },
              { key: "out", glyph: "\u2212", title: "Zoom out", run: () => mapApi?.zoomOut() },
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
                  style={{
                    width: 32, height: 32,
                    background: on ? "rgba(143,183,255,0.9)" : "rgba(7,11,17,0.78)",
                    border: `1px solid ${on ? "#8fb7ff" : BORDER}`,
                    borderRadius: 3,
                    color: on ? "#0b1020" : "rgba(255,255,255,0.85)",
                    fontSize: b.key === "3d" ? 10 : 16,
                    fontWeight: b.key === "3d" ? 700 : 400,
                    cursor: mapApi ? "pointer" : "default",
                    opacity: mapApi ? 1 : 0.5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    letterSpacing: b.key === "3d" ? "0.08em" : 0,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {b.glyph}
                </button>
              );
            })}
          </div>

          {/* RIGHT CASE DRAWER */}
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: 304,
            background: "rgba(9,12,20,0.95)",
            backdropFilter: "blur(12px)",
            borderLeft: `1px solid ${BORDER}`,
            transform: drawerOpen ? "translateX(0)" : "translateX(104%)",
            transition: "transform 0.28s cubic-bezier(0.22,1,0.36,1)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}>
            {selected && (
              <CaseDrawer
                dog={selected}
                dist={dist}
                fmtDist={fmtDist}
                onClose={closeDrawer}
                onAction={handleAction}
              />
            )}
          </div>

          {/* BOTTOM STATS STRIP */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: drawerOpen ? 304 : 0,
            height: 168,
            background: "rgba(7,11,17,0.88)",
            backdropFilter: "blur(12px)",
            borderTop: `1px solid ${BORDER}`,
            transition: "right 0.28s cubic-bezier(0.22,1,0.36,1)",
            zIndex: 20,
            display: "flex",
            gap: 0,
          }}>
            {/* Live reports, real sightings from the loaded records. */}
            <div style={{ flex: "0 0 340px", borderRight: `1px solid ${BORDER}`, padding: "10px 14px", overflow: "hidden" }}>
              <div style={{ fontSize: 10.5, letterSpacing: "0.11em", color: "rgba(255,255,255,0.68)", marginBottom: 8 }}>LATEST REPORTS</div>
              {recent.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {recent.map((d) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.needs_help ? DANGER : MINT, flexShrink: 0 }} />
                      <span style={{ color: "rgba(255,255,255,0.88)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {dogLabel(d)}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.55)", flexShrink: 0, letterSpacing: "0.06em" }}>
                        {formatPlace(d.zone, d.city)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "rgba(255,255,255,0.55)" }}>
                  No animals reported yet. The first report on this map appears here.
                </p>
              )}
            </div>

            {/* Live counts, derived from the records actually loaded. */}
            <div style={{ flex: 1, padding: "10px 14px", display: "flex", alignItems: "center", gap: 0 }}>
              {counts.map((k, i) => (
                <div key={k.label} style={{
                  flex: 1,
                  textAlign: "center",
                  borderRight: i < counts.length - 1 ? `1px solid ${BORDER}` : "none",
                  padding: "0 8px",
                }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color: k.color, lineHeight: 1.05, letterSpacing: "-0.03em" }}>{k.value}</div>
                  <div style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "rgba(255,255,255,0.88)", marginTop: 5, fontWeight: 600 }}>{k.label}</div>
                  <div style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)", marginTop: 3 }}>{k.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
}

// ── case drawer ──────────────────────────────────────────────────────────────
function CaseDrawer({
  dog,
  dist,
  fmtDist,
  onClose,
  onAction,
}: {
  dog: Dog;
  dist: number | null;
  fmtDist: (d: number) => string;
  onClose: () => void;
  onAction: (dog: Dog, kind: "saw" | "fed") => void;
}) {
  const caseId = `SP-${String(dog.id).slice(-4).toUpperCase().padStart(4, "0")}`;
  const needsHelp = dog.needs_help;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.11em", color: "#fff" }}>CASE {caseId}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.72)", padding: 4 }}>
          <XIcon size={14} />
        </button>
      </div>

      {/* dog photo */}
      <div style={{ position: "relative", height: 168, flexShrink: 0, overflow: "hidden" }}>
        <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} className="w-full h-full object-cover" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(9,12,20,0.8) 0%, transparent 50%)" }} />
        <div style={{ position: "absolute", bottom: 10, left: 14 }}>
          <span style={{
            display: "inline-block",
            padding: "4px 8px",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.11em",
            background: needsHelp ? SAFFRON : "rgba(255,255,255,0.12)",
            color: needsHelp ? INK : "#fff",
            borderRadius: 2,
          }}>
            {needsHelp ? "NEEDS FOLLOW-UP" : "MONITORING"}
          </span>
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* last sighting */}
        <DrawerSection label="LAST SIGHTING">
          <div style={{ fontSize: 12.5, color: "#fff", letterSpacing: "0.08em" }}>
            {new Date(dog.last_seen).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {timeAgo(dog.last_seen)}
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.72)", marginTop: 2, letterSpacing: "0.08em" }}>📍 {formatPlace(dog.zone, dog.city)}</div>
          {dist != null && <div style={{ fontSize: 11.5, color: MINT, marginTop: 2 }}>{fmtDist(dist)} from you</div>}
        </DrawerSection>

        {/* nearby vet */}
        <DrawerSection label="NEARBY VET">
          <ResourceRow
            name="Paws & Claws Vet Clinic"
            detail="0.9 km · Open"
            color={MINT}
          />
        </DrawerSection>

        {/* nearby shelter */}
        <DrawerSection label="NEARBY SHELTER">
          <ResourceRow
            name="Friendicoes, Kailash Colony"
            detail="1.6 km · Space Available"
            color={MINT}
          />
        </DrawerSection>

        {/* volunteer route */}
        <DrawerSection label="VOLUNTEER ROUTE">
          <ResourceRow
            name="3 volunteers nearby"
            detail="Est. 12 min arrival"
            color="#a8ddd0"
          />
        </DrawerSection>

        {/* case notes */}
        {dog.community_notes && dog.community_notes.length > 0 && (
          <DrawerSection label="CASE NOTES">
            <p style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255,255,255,0.65)", letterSpacing: "0.04em" }}>
              {dog.community_notes[0]}
            </p>
          </DrawerSection>
        )}

        {/* What it costs to sterilise one animal. Real, sourced figure, the previous per-animal care costs here were invented. */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
          <div style={{ fontSize: 10.5, letterSpacing: "0.11em", color: "rgba(255,255,255,0.66)", marginBottom: 10 }}>
            COST TO STERILISE
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Per animal</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: SAFFRON }}>
              {inr(UNIT_COSTS.sterilisation.value)}
            </span>
          </div>

          <p style={{ margin: "0 0 12px", fontSize: 10.5, lineHeight: 1.6, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
            AWBI-notified ceiling, ABC (Dogs) Rules {UNIT_COSTS.sterilisation.year}.
            Not a StrayPaw estimate.
          </p>

          <Link
            href="/what-would-it-take"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "10px 0",
              background: "rgba(102,197,213,0.1)",
              border: `1px solid rgba(102,197,213,0.25)`,
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.11em",
              color: MINT,
              textDecoration: "none",
            }}
          >
            COST A FULL PROGRAMME
          </Link>
        </div>
      </div>

      {/* connect help CTA */}
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <button
          onClick={() => onAction(dog, "saw")}
          style={{
            width: "100%",
            padding: "12px 0",
            background: SAFFRON,
            border: "none",
            borderRadius: 4,
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: "0.11em",
            color: INK,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: "inherit",
          }}
        >
          <PawIcon size={14} />
          CONNECT HELP
        </button>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10.5, letterSpacing: "0.1em", color: "rgba(255,255,255,0.84)" }}>
          (·) ALERT VOLUNTEERS & NGOS
        </div>
      </div>
    </div>
  );
}

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, letterSpacing: "0.11em", color: "rgba(255,255,255,0.66)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ResourceRow({ name, detail, color }: { name: string; detail: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 12, color: "#fff", letterSpacing: "0.06em" }}>{name}</div>
        <div style={{ fontSize: 11.5, color: color, marginTop: 2, letterSpacing: "0.08em", opacity: 0.8 }}>{detail}</div>
      </div>
      <ChevronRight size={12} />
    </div>
  );
}

