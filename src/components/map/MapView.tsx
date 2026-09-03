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
import type { Dog, FeedingZone } from "@/lib/types";

// ── design tokens ──────────────────────────────────────────────────────────
const INK = "#0b1020";
const NIGHT = "#10182b";
const SAFFRON = "#8fb7ff"; // primary signal accent
const MINT = "#66c5d5"; // field / in-progress
const DANGER = "#ff6a4f"; // gap / urgency
const VIOLET = "#a68cff"; // study / research
const BORDER = "rgba(255,255,255,0.07)";
const BORDER_MED = "rgba(255,255,255,0.12)";

// ── static demo data ────────────────────────────────────────────────────────
const LIVE_REPORTS = [
  { id: "SP-1050", icon: "🐾", text: "Dog sighted near Moolchand", time: "19:45", color: MINT },
  { id: "SP-1049", icon: "⚠", text: "Injured dog near Masjid Moth", time: "19:43", color: DANGER },
  { id: "SP-1048", icon: "🐾", text: "Pack of 4 near Sarai Kale Khan", time: "19:41", color: MINT },
  { id: "SP-1047", icon: "🍲", text: "Food request near CR Park", time: "19:39", color: SAFFRON },
  { id: "SP-1046", icon: "💉", text: "Rabies vaccination drive today", time: "19:37", color: VIOLET },
];

const KPI = [
  { value: "65", label: "SIGHTINGS", sub: "+12 TODAY", color: SAFFRON },
  { value: "38", label: "RESOURCES", sub: "ACTIVE", color: MINT },
  { value: "12", label: "ACTIVE CASES", sub: "+2 TODAY", color: VIOLET },
  { value: "7", label: "GAPS", sub: "MONITORING", color: DANGER },
];

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
        Living map — street-animal signals, studies and outcomes across Delhi NCR
      </h1>

      {/* MAP + OVERLAYS */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <MapCanvas
            dogs={allDogs}
            onSelect={handleSelect}
            center={center}
            feedingZones={feedingZones}
          />

          {/* Map legend (bottom-left of map) */}
          <div style={{
            position: "absolute",
            left: 12,
            bottom: 148,
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
              { color: DANGER, label: "COVERAGE GAP", dot: false, warn: true },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {item.dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />}
                {item.line && <span style={{ width: 14, height: 1.5, background: item.color, flexShrink: 0 }} />}
                {item.warn && <span style={{ fontSize: 11, color: item.color, lineHeight: 1 }}>⊘</span>}
                <span style={{ fontSize: 8, letterSpacing: "0.16em", color: "rgba(255,255,255,0.55)" }}>{item.label}</span>
              </div>
            ))}
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
            {["⊞", "3D", "+", "−"].map((btn) => (
              <button key={btn} style={{
                width: 28, height: 28, background: "rgba(7,11,17,0.78)", border: `1px solid ${BORDER}`,
                borderRadius: 3, color: "rgba(255,255,255,0.55)", fontSize: btn === "3D" ? 8 : 14,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                letterSpacing: btn === "3D" ? "0.08em" : 0, backdropFilter: "blur(8px)"
              }}>
                {btn}
              </button>
            ))}
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
            height: 140,
            background: "rgba(7,11,17,0.88)",
            backdropFilter: "blur(12px)",
            borderTop: `1px solid ${BORDER}`,
            transition: "right 0.28s cubic-bezier(0.22,1,0.36,1)",
            zIndex: 20,
            display: "flex",
            gap: 0,
          }}>
            {/* Live reports */}
            <div style={{ flex: "0 0 340px", borderRight: `1px solid ${BORDER}`, padding: "10px 14px", overflow: "hidden" }}>
              <div style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(255,255,255,0.38)", marginBottom: 8 }}>LIVE COMMUNITY REPORTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {LIVE_REPORTS.slice(0, 5).map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9, letterSpacing: "0.08em" }}>
                    <span style={{ fontSize: 10, color: r.color, width: 12, textAlign: "center", flexShrink: 0 }}>{r.icon}</span>
                    <span style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0, fontWeight: 600 }}>{r.id}</span>
                    <span style={{ color: "rgba(255,255,255,0.7)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</span>
                    <span style={{ color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>{r.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sightings sparkline */}
            <div style={{ flex: "0 0 200px", borderRight: `1px solid ${BORDER}`, padding: "10px 14px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 8, letterSpacing: "0.14em", color: "rgba(255,255,255,0.38)" }}>SIGHTINGS (24H)</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: MINT }}>65</span>
              </div>
              <div style={{ flex: 1, position: "relative" }}>
                <Sparkline />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em" }}>19:00</span>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em" }}>NOW</span>
              </div>
            </div>

            {/* KPI chips */}
            <div style={{ flex: 1, padding: "10px 14px", display: "flex", alignItems: "center", gap: 0 }}>
              {KPI.map((k, i) => (
                <div key={k.label} style={{
                  flex: 1,
                  textAlign: "center",
                  borderRight: i < KPI.length - 1 ? `1px solid ${BORDER}` : "none",
                  padding: "0 8px",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{k.value}</div>
                  <div style={{ fontSize: 8, letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)", marginTop: 3 }}>{k.label}</div>
                  <div style={{ fontSize: 8, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{k.sub}</div>
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
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#fff" }}>CASE {caseId}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", padding: 4 }}>
          <XIcon size={14} />
        </button>
      </div>

      {/* dog photo */}
      <div style={{ position: "relative", height: 140, flexShrink: 0, overflow: "hidden" }}>
        <DogPhoto src={dog.cover_photo} alt={dogLabel(dog)} seed={dog.id} className="w-full h-full object-cover" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(9,12,20,0.8) 0%, transparent 50%)" }} />
        <div style={{ position: "absolute", bottom: 10, left: 14 }}>
          <span style={{
            display: "inline-block",
            padding: "4px 8px",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.18em",
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
          <div style={{ fontSize: 11, color: "#fff", letterSpacing: "0.08em" }}>
            {new Date(dog.last_seen).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {timeAgo(dog.last_seen)}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", marginTop: 2, letterSpacing: "0.08em" }}>📍 {dog.zone}, New Delhi</div>
          {dist != null && <div style={{ fontSize: 9, color: MINT, marginTop: 2 }}>{fmtDist(dist)} from you</div>}
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
            <p style={{ fontSize: 10, lineHeight: 1.6, color: "rgba(255,255,255,0.65)", letterSpacing: "0.04em" }}>
              {dog.community_notes[0]}
            </p>
          </DrawerSection>
        )}

        {/* ── PHASE 2: Cost & donation section ── */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
          <div style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
            CARE COST  ·  ILLUSTRATIVE
          </div>

          {/* monthly cost */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}>Monthly care cost</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: SAFFRON, letterSpacing: "0.04em" }}>₹2,400</span>
          </div>

          {/* neighbourhood need */}
          <div style={{
            padding: "10px 12px",
            background: "rgba(233,172,66,0.06)",
            border: `1px solid rgba(233,172,66,0.14)`,
            borderRadius: 4,
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 8, letterSpacing: "0.14em", color: SAFFRON, opacity: 0.7, marginBottom: 4 }}>NEIGHBOURHOOD NEED</div>
            <div style={{ fontSize: 10, color: "#fff", letterSpacing: "0.06em", lineHeight: 1.5 }}>
              {dog.zone || "This area"} needs{" "}
              <span style={{ color: SAFFRON, fontWeight: 700 }}>₹28,800</span>{" "}
              for next 12 months
            </div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginTop: 4, letterSpacing: "0.1em" }}>
              12 animals · vet + food + sterilisation
            </div>
          </div>

          {/* donate button */}
          <button
            onClick={() => {}}
            style={{
              width: "100%",
              padding: "10px 0",
              background: "rgba(168,221,208,0.1)",
              border: `1px solid rgba(168,221,208,0.25)`,
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: MINT,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            DONATE TO THIS CASE
          </button>
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
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.18em",
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
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 8, letterSpacing: "0.14em", color: "rgba(255,255,255,0.28)" }}>
          (·) ALERT VOLUNTEERS & NGOS
        </div>
      </div>
    </div>
  );
}

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 8, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ResourceRow({ name, detail, color }: { name: string; detail: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 10, color: "#fff", letterSpacing: "0.06em" }}>{name}</div>
        <div style={{ fontSize: 9, color: color, marginTop: 2, letterSpacing: "0.08em", opacity: 0.8 }}>{detail}</div>
      </div>
      <ChevronRight size={12} />
    </div>
  );
}

function Sparkline() {
  const pts = [8, 12, 6, 18, 24, 14, 30, 22, 38, 28, 45, 35, 52, 42, 58, 48, 65];
  const max = Math.max(...pts);
  const w = 172, h = 60;
  const d = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <path d={d} fill="none" stroke={MINT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`${MINT}18`} />
    </svg>
  );
}
