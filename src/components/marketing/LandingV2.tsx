/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Shield, Users, Check, ChevronDown } from "lucide-react";

// Palette (StrayPaw v2 tokens — premium light: white + soft azure).
export const C = {
  paper: "#fbfdff",
  cream: "#eaf1fb",
  ink: "#0f1626",
  inkSurface: "#1b2436",
  ink950: "#0a0f1a",
  paw100: "#dbe9ff",
  paw200: "#bdd7ff",
  paw400: "#5f9af5",
  paw500: "#3b7de6",
  paw600: "#2f63c2",
  paw700: "#274f9c",
  bark50: "#f6f8fb",
  bark100: "#eef1f6",
  bark200: "#e1e6ef",
  bark400: "#97a0b2",
  bark500: "#6b7484",
  bark600: "#4d5564",
  bark700: "#39404e",
  display: "var(--font-display), ui-sans-serif, system-ui, sans-serif",
  mono: 'ui-monospace, "JetBrains Mono", monospace',
};

export type LandingStats = { dogsSpotted: number; dogsFed: number; dogsSterilised: number };

// ── Animated count-up stat ──────────────────────────────────────────────────
export function AnimatedStat({ target, label, suffix = "" }: { target: number; label: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1600;
    const step = 16;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <div>
      <div style={{ fontFamily: C.display, fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-0.02em" }}>
        {count.toLocaleString("en-IN")}{suffix}
      </div>
      <div style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.45)", marginTop: "0.25rem" }}>{label}</div>
    </div>
  );
}

// ── Phone mockup ─────────────────────────────────────────────────────────────
export function PhoneMockup() {
  return (
    <div style={{ width: 280, flexShrink: 0 }}>
      <div style={{ background: "#0f1626", borderRadius: 40, padding: "10px", boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1)" }}>
        <div style={{ background: C.paper, borderRadius: 32, overflow: "hidden", height: 520, position: "relative" }}>
          <div style={{ background: C.ink, height: 44, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 20px 8px", color: "rgba(255,255,255,0.8)", fontSize: "0.6875rem", fontWeight: 600 }}>
            <span>9:41</span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div style={{ width: 14, height: 8, border: "1.5px solid rgba(255,255,255,0.6)", borderRadius: 2, padding: "1px", display: "flex", alignItems: "center" }}>
                <div style={{ width: "70%", height: "100%", background: "rgba(255,255,255,0.7)", borderRadius: 1 }} />
              </div>
            </div>
          </div>
          <div style={{ background: C.ink, padding: "8px 20px 16px", color: "#fff" }}>
            <div style={{ fontSize: "0.625rem", fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Good morning</div>
            <div style={{ fontFamily: C.display, fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em" }}>Priya&apos;s community</div>
          </div>
          <div style={{ padding: "0 16px", flex: 1, background: C.paper, paddingTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[{ val: "186", label: "Tracked" }, { val: "3", label: "Need help" }, { val: "71%", label: "Sterilised" }].map(({ val, label }) => (
                <div key={label} style={{ background: "#fff", border: `1px solid ${C.bark100}`, borderRadius: 10, padding: "8px", textAlign: "center" }}>
                  <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: "1rem", color: C.ink }}>{val}</div>
                  <div style={{ fontSize: "0.5625rem", color: C.bark500, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "0.625rem", fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase", color: C.bark400, marginBottom: 8 }}>Near you · Need help</div>
            <div style={{ display: "flex", gap: 10, overflowX: "hidden" }}>
              {[{ name: "Kali", zone: "Lajpat Nagar", photo: "/seed-dogs/dog1.jpg" }, { name: "Raju", zone: "GK-II", photo: "/seed-dogs/dog2.jpg" }].map(({ name, zone, photo }) => (
                <div key={name} style={{ minWidth: 140, background: "#fff", border: `1px solid ${C.bark100}`, borderRadius: 12, overflow: "hidden" }}>
                  <img src={photo} alt={name} style={{ width: "100%", height: 90, objectFit: "cover" }} />
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: C.ink }}>{name}</div>
                    <div style={{ fontSize: "0.625rem", color: C.bark500, marginBottom: 4 }}>{zone}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(192,73,46,0.1)", color: "#c0492e", borderRadius: 4, padding: "2px 6px", fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Injured</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: "0.625rem", fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase", color: C.bark400, marginBottom: 8 }}>Live activity</div>
              {[{ user: "Rohit K.", action: "fed Pari · HKV", time: "3" }, { user: "Priya S.", action: "spotted Bhura · HKV", time: "18" }].map(({ user, action, time }) => (
                <div key={user} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.bark50}` }}>
                  <div style={{ width: 24, height: 24, borderRadius: 9999, background: C.paw200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5625rem", fontWeight: 700, color: C.paw700, flexShrink: 0 }}>{user[0]}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.6875rem", color: C.ink }}>{user}</span>
                    <span style={{ fontSize: "0.6875rem", color: C.bark500 }}> {action}</span>
                  </div>
                  <div style={{ fontSize: "0.5625rem", color: C.bark400, flexShrink: 0 }}>{time}m</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(251,253,255,0.95)", borderTop: `1px solid ${C.bark100}`, height: 56, display: "flex", alignItems: "center", justifyContent: "space-around", paddingBottom: 4 }}>
            {["Today", "Map", "·", "Feed", "NGOs"].map((l, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, opacity: i === 0 ? 1 : 0.4 }}>
                {l === "·" ? (
                  <div style={{ width: 36, height: 36, borderRadius: 9999, background: C.paw500, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
                    <span style={{ color: "#fff", fontSize: 18, lineHeight: 1 }}>+</span>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 18, height: 18, borderRadius: 3, background: i === 0 ? C.paw100 : C.bark100 }} />
                    <div style={{ fontSize: "0.5rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: i === 0 ? C.paw500 : C.bark400 }}>{l}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Map preview ──────────────────────────────────────────────────────────────
export function MapPreview() {
  const markers = [
    { x: "22%", y: "38%", type: "needs_help", label: "Kali" },
    { x: "55%", y: "28%", type: "sterilised", label: "Bhura" },
    { x: "70%", y: "55%", type: "adoptable", label: "Moti" },
    { x: "35%", y: "62%", type: "seen", label: "Tiger" },
    { x: "80%", y: "30%", type: "needs_help", label: "Raju" },
    { x: "48%", y: "70%", type: "fed", label: "Sonu" },
    { x: "15%", y: "58%", type: "feeding-zone", label: "" },
  ];
  const colors: Record<string, string> = { needs_help: "#c0492e", sterilised: "#3e8473", adoptable: "#8b5ea8", seen: "#9a9c88", fed: "#d9a441", "feeding-zone": "#cb7a56" };
  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#d4cfc4", height: 360 }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice">
        <rect width="600" height="360" fill="#e8e3d8" />
        <rect x="0" y="120" width="600" height="18" fill="#f5f2ea" />
        <rect x="0" y="220" width="600" height="14" fill="#f5f2ea" />
        <rect x="150" y="0" width="16" height="360" fill="#f5f2ea" />
        <rect x="340" y="0" width="12" height="360" fill="#f5f2ea" />
        <rect x="480" y="0" width="20" height="360" fill="#f5f2ea" />
        <rect x="20" y="30" width="110" height="75" rx="4" fill="#ddd8cc" />
        <rect x="180" y="30" width="140" height="70" rx="4" fill="#ddd8cc" />
        <rect x="360" y="30" width="100" height="70" rx="4" fill="#ddd8cc" />
        <rect x="20" y="155" width="110" height="50" rx="4" fill="#ddd8cc" />
        <rect x="180" y="155" width="140" height="50" rx="4" fill="#ddd8cc" />
        <rect x="360" y="155" width="100" height="50" rx="4" fill="#ddd8cc" />
        <rect x="20" y="250" width="110" height="90" rx="4" fill="#ddd8cc" />
        <rect x="180" y="250" width="140" height="90" rx="4" fill="#ddd8cc" />
        <rect x="360" y="250" width="100" height="90" rx="4" fill="#ddd8cc" />
        <rect x="510" y="30" width="80" height="160" rx="4" fill="#ddd8cc" />
        <rect x="510" y="250" width="80" height="90" rx="4" fill="#ddd8cc" />
        <rect x="23" y="33" width="104" height="69" rx="2" fill="#c8d4b8" opacity="0.6" />
      </svg>
      {markers.map(({ x, y, type, label }) => (
        <div key={label || type + x} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ width: type === "feeding-zone" ? 28 : 32, height: type === "feeding-zone" ? 28 : 32, borderRadius: type === "feeding-zone" ? 8 : 9999, background: colors[type], border: "2.5px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", animation: type === "needs_help" ? "sp-pulse-ring 2s ease-in-out infinite" : undefined }}>
            {type === "needs_help" ? "🩹" : type === "sterilised" ? "✂" : type === "adoptable" ? "🏠" : type === "fed" ? "🍖" : type === "feeding-zone" ? "🥣" : "👁"}
          </div>
          {label && <div style={{ background: "rgba(23,21,15,0.8)", color: "#fff", fontSize: "0.5625rem", fontWeight: 600, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>{label}</div>}
        </div>
      ))}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", gap: 6 }}>
        {["All", "Needs Help", "Sterilised", "Adoptable"].map((f, i) => (
          <div key={f} style={{ background: i === 0 ? C.ink : "rgba(251,253,255,0.9)", border: "1.5px solid " + (i === 0 ? C.ink : "rgba(225,230,239,0.7)"), borderRadius: 9999, padding: "4px 10px", fontSize: "0.6875rem", fontWeight: 500, color: i === 0 ? "#fff" : C.bark600, backdropFilter: "blur(8px)", whiteSpace: "nowrap" }}>{f}</div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, background: "rgba(251,253,255,0.95)", backdropFilter: "blur(16px)", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/seed-dogs/dog1.jpg" alt="Kali" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: C.ink }}>Kali</div>
          <div style={{ fontSize: "0.6875rem", color: C.bark500 }}>Lajpat Nagar · limping</div>
        </div>
        <div style={{ background: "rgba(192,73,46,0.1)", color: "#a83620", borderRadius: 4, padding: "3px 8px", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Injured</div>
      </div>
    </div>
  );
}

// ── Dashboard preview ────────────────────────────────────────────────────────
export function DashboardPreview() {
  return (
    <div style={{ background: C.inkSurface, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ background: C.ink950, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 6 }}>{["#ff5f57", "#febc2e", "#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: 9999, background: c }} />)}</div>
        <div style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.3)", fontFamily: C.mono }}>Paws Delhi — Partner OS</div>
        <div />
      </div>
      <div style={{ display: "flex", height: 380 }}>
        <div style={{ width: 140, background: "#0f1626", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "12px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {[{ label: "Overview", active: true }, { label: "Cases", badge: "7" }, { label: "Animals" }, { label: "Field Ops" }, { label: "Team" }].map(({ label, active, badge }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderRadius: 6, margin: "0 6px", background: active ? "rgba(59,125,230,0.20)" : "transparent", color: active ? C.paw400 : "rgba(255,255,255,0.4)", fontSize: "0.6875rem", fontWeight: 500 }}>
              <span>{label}</span>
              {badge && <span style={{ background: C.paw600, color: "#fff", fontSize: "0.5rem", borderRadius: 9999, padding: "1px 5px", fontWeight: 700 }}>{badge}</span>}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[{ val: "12", label: "Active cases", accent: false }, { val: "3", label: "Urgent", accent: true }, { val: "5", label: "Follow-ups", accent: false }, { val: "74%", label: "Resolution", accent: false }].map(({ val, label, accent }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 10px" }}>
                <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: "1.25rem", color: accent ? C.paw400 : "#fff", letterSpacing: "-0.01em" }}>{val}</div>
                <div style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Active cases</span>
              <span style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)", fontFamily: C.mono }}>3 CRITICAL</span>
            </div>
            {[{ title: "Kali — hind leg injury", zone: "Lajpat Nagar", severity: "Critical" }, { title: "Raju — neck wound", zone: "GK-II", severity: "Critical" }, { title: "Puppy — possible parvo", zone: "Saket", severity: "High" }, { title: "Tiger — sterilisation", zone: "Malviya Nagar", severity: "Normal" }].map(({ title, zone, severity }) => (
              <div key={title} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.6875rem" }}>
                <div style={{ flex: 1, color: "rgba(255,255,255,0.8)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{zone}</div>
                <div style={{ flexShrink: 0, padding: "2px 6px", borderRadius: 4, fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: severity === "Critical" ? "rgba(192,73,46,0.2)" : severity === "High" ? "rgba(217,164,65,0.15)" : "rgba(62,132,115,0.15)", color: severity === "Critical" ? "#d46b5a" : severity === "High" ? "#c59030" : "#5aab97" }}>{severity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const HOW_STEPS = [
  { n: "01", title: "Community spots an animal", body: "Anyone can open StrayPaw and report a sighting in under a minute — photo, location, and a note about the animal's condition." },
  { n: "02", title: "Animal gets a living profile", body: "Each animal builds a profile with sighting history, health status, feeding log, and community notes. The map updates in real time." },
  { n: "03", title: "NGO partners take action", body: "Welfare organizations see cases in their dashboard — sorted by severity and location. They assign vets, schedule visits, and update status." },
  { n: "04", title: "Community tracks the outcome", body: "Reporters can follow cases and receive updates when an animal is treated, sterilised, or adopted. Every action is logged." },
];

export const SURFACE_CARDS = [
  { icon: Users, eyebrow: "Community", title: "Every person is a welfare advocate", body: "Community members report sightings, log feeding, flag injuries, and follow the animals they care about. No account required for basic reporting.", color: C.paw500 },
  { icon: MapPin, eyebrow: "Map", title: "A live view of every street animal", body: "The community map shows every tracked animal with status, feeding history, and case alerts — updated by sightings in real time.", color: "#3e8473" },
  { icon: Shield, eyebrow: "Partner OS", title: "Operations software for NGOs", body: "Welfare organizations manage incoming reports, open cases, coordinate vets, run sterilisation drives, and track outcomes — all from one dashboard.", color: "#4e8a5f" },
];

export default function LandingV2({ stats }: { stats: LandingStats }) {
  return (
    <div style={{ background: C.paper, overflowX: "hidden" }}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-ground" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "8rem 1.5rem 5rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 70% 50%, rgba(59,125,230,0.16) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: "1fr auto", gap: "4rem", alignItems: "center", position: "relative" }}>
          <div>
            <div className="eyebrow" style={{ color: C.paw400, marginBottom: "1.5rem" }}>Street animal welfare · Delhi NCR</div>
            <h1 className="display-xl" style={{ color: "#fff", maxWidth: 620, marginBottom: "1.5rem" }}>
              Every stray <em style={{ color: C.paw400, fontStyle: "italic" }}>has a name,</em> a story, and people who care.
            </h1>
            <p style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.55)", maxWidth: 480, lineHeight: 1.65, marginBottom: "2.5rem" }}>
              StrayPaw connects community members, street animals, and welfare organizations on a shared platform — tracking every sighting, feeding, and care event in real time.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/app" className="btn btn-primary btn-primary-lg">Open the app <ArrowRight size={16} /></Link>
              <Link href="/partner" className="btn btn-secondary-dark btn-primary-lg">For NGOs &amp; partners</Link>
            </div>
            <div style={{ marginTop: "3rem", display: "flex", gap: "3rem", flexWrap: "wrap" }}>
              <AnimatedStat target={stats.dogsSpotted} label="Animals tracked" />
              <AnimatedStat target={stats.dogsFed} label="Care actions logged" />
              <AnimatedStat target={stats.dogsSterilised} label="Sterilisations" />
            </div>
          </div>
          <div className="hero-phone" style={{ display: "flex", justifyContent: "flex-end" }}>
            <PhoneMockup />
          </div>
        </div>
        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.3)", animation: "sp-float 2s ease-in-out infinite" }}>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ── Three surfaces ───────────────────────────────────────────────── */}
      <section className="section" style={{ background: C.paper }}>
        <div className="container-page">
          <div style={{ maxWidth: 560, marginBottom: "4rem" }}>
            <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>What StrayPaw does</div>
            <h2 className="display-md" style={{ marginBottom: "1rem", color: C.ink }}>Three surfaces. One connected welfare system.</h2>
            <p style={{ color: C.bark500, lineHeight: 1.7, fontSize: "1rem" }}>Community reporting, a live map, and NGO operations — built together so data flows between them automatically.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5px", background: C.bark100, borderRadius: 16, overflow: "hidden" }}>
            {SURFACE_CARDS.map(({ icon: Icon, eyebrow, title, body, color }) => (
              <div key={eyebrow} style={{ background: C.paper, padding: "2.5rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                  <Icon size={18} color={color} />
                </div>
                <div className="eyebrow" style={{ color, marginBottom: "0.5rem" }}>{eyebrow}</div>
                <h3 style={{ fontFamily: C.display, fontSize: "1.1875rem", fontWeight: 700, letterSpacing: "-0.01em", color: C.ink, marginBottom: "0.75rem", lineHeight: 1.2 }}>{title}</h3>
                <p style={{ fontSize: "0.875rem", color: C.bark500, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="section" style={{ background: C.cream }}>
        <div className="container-page">
          <div style={{ maxWidth: 560, marginBottom: "4rem" }}>
            <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>How it works</div>
            <h2 className="display-md" style={{ color: C.ink }}>From street sighting to resolved case</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "2.5rem" }}>
            {HOW_STEPS.map(({ n, title, body }) => (
              <div key={n}>
                <div style={{ fontFamily: C.mono, fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.1em", color: C.paw500, marginBottom: "1rem" }}>{n}</div>
                <div style={{ width: "100%", height: 1, background: C.bark200, marginBottom: "1.25rem" }} />
                <h3 style={{ fontFamily: C.display, fontSize: "1.0625rem", fontWeight: 700, letterSpacing: "-0.01em", color: C.ink, marginBottom: "0.625rem", lineHeight: 1.25 }}>{title}</h3>
                <p style={{ fontSize: "0.875rem", color: C.bark500, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community + mobile ───────────────────────────────────────────── */}
      <section className="section" style={{ background: C.paper }}>
        <div className="container-page">
          <div className="split-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6rem", alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}><PhoneMockup /></div>
            <div>
              <div className="eyebrow" style={{ marginBottom: "1rem" }}>Community experience</div>
              <h2 className="display-md" style={{ marginBottom: "1.25rem", color: C.ink }}>Designed for people walking past, every day</h2>
              <p style={{ color: C.bark500, lineHeight: 1.7, marginBottom: "2rem", fontSize: "0.9375rem" }}>The community app is mobile-first and fast. Report a sighting in under 60 seconds — photo, location, condition. No signup required.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {["Spot and report street animals", "Log feeding — contribute to the care record", "Flag injuries and open urgent cases", "Follow animals and track case outcomes", "Discover nearby feeding zones"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 9999, background: C.paw100, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <Check size={11} color={C.paw600} strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: "0.9375rem", color: C.bark700 }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "2.5rem" }}>
                <Link href="/app" className="btn btn-primary">Try the community app <ArrowRight size={14} /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Map section ──────────────────────────────────────────────────── */}
      <section style={{ background: C.ink, padding: "5rem 0" }}>
        <div className="container-page">
          <div style={{ marginBottom: "3rem" }}>
            <div className="eyebrow" style={{ color: C.paw400, marginBottom: "0.75rem" }}>Community map</div>
            <h2 className="display-md" style={{ color: "#fff", maxWidth: 540 }}>A live map of every tracked animal in the city</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", marginTop: "1rem", maxWidth: 480, lineHeight: 1.65, fontSize: "0.9375rem" }}>Animal markers update with every sighting. Filter by status — needs help, sterilised, adoptable. Tap any marker to see the full profile and case history.</p>
          </div>
          <MapPreview />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem", marginTop: "3rem" }}>
            {[{ color: "#c0492e", label: "Needs help", desc: "Injured or sick — flagged for NGO action" }, { color: "#3e8473", label: "Sterilised", desc: "Part of the ABC programme" }, { color: "#8b5ea8", label: "Adoptable", desc: "Friendly, vaccinated, looking for a home" }, { color: "#d9a441", label: "Recently fed", desc: "Fed within the last 10 hours" }].map(({ color, label, desc }) => (
              <div key={label} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <div style={{ width: 12, height: 12, borderRadius: 9999, background: color, flexShrink: 0, marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#fff", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partner dashboard ────────────────────────────────────────────── */}
      <section className="section" style={{ background: C.paper }}>
        <div className="container-page">
          <div className="split-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6rem", alignItems: "center" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: "1rem" }}>NGO / Partner OS</div>
              <h2 className="display-md" style={{ marginBottom: "1.25rem", color: C.ink }}>Operations software built for animal welfare organizations</h2>
              <p style={{ color: C.bark500, lineHeight: 1.7, marginBottom: "2rem", fontSize: "0.9375rem" }}>The partner dashboard is purpose-built for NGOs managing large caseloads — not a generic admin panel, but a real operations tool.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {["Incoming community reports, sorted by severity", "Case assignment and status tracking", "Animal registry with full health records", "Field operations and vet camp management", "Team coordination and task management", "Fundraising and campaign management", "Analytics and case resolution metrics"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 9999, background: C.bark100, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <Check size={11} color={C.bark600} strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: "0.9375rem", color: C.bark700 }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "2.5rem", display: "flex", gap: "0.75rem" }}>
                <Link href="/partner" className="btn btn-primary">Open partner dashboard <ArrowRight size={14} /></Link>
              </div>
            </div>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Impact ───────────────────────────────────────────────────────── */}
      <section style={{ background: C.cream, padding: "5rem 0" }}>
        <div className="container-page">
          <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>Impact</div>
          <h2 className="display-md" style={{ marginBottom: "3rem", maxWidth: 460, color: C.ink }}>Real outcomes for real animals</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0px", background: C.bark200, borderRadius: 16, overflow: "hidden" }}>
            {[{ val: stats.dogsSpotted.toLocaleString("en-IN"), label: "Animals tracked", desc: "Unique profiles across Delhi NCR" }, { val: stats.dogsFed.toLocaleString("en-IN"), label: "Care actions", desc: "Sightings, feedings, and treatments logged" }, { val: stats.dogsSterilised.toLocaleString("en-IN"), label: "Sterilisations", desc: "Part of the ABC programme" }, { val: "340+", label: "Adoptions", desc: "Facilitated through the platform" }].map(({ val, label, desc }) => (
              <div key={label} style={{ background: C.cream, padding: "2.5rem 2rem", borderRight: `1px solid ${C.bark200}` }}>
                <div style={{ fontFamily: C.display, fontSize: "clamp(1.75rem,3vw,2.5rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1 }}>{val}</div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: C.ink, marginTop: "0.5rem" }}>{label}</div>
                <div style={{ fontSize: "0.8125rem", color: C.bark500, marginTop: "0.25rem" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ background: C.paw500, padding: "6rem 1.5rem" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: C.mono, fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "1rem" }}>Join the community</div>
          <h2 className="display-md" style={{ color: "#fff", marginBottom: "1.25rem" }}>Every sighting matters. Start here.</h2>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.65, marginBottom: "2.5rem" }}>You don&apos;t need to be a welfare expert. Reporting what you see — a dog limping, a puppy alone — creates the data that helps NGOs act.</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/app" className="btn btn-primary-dark btn-primary-lg">Report a sighting</Link>
            <Link href="/map" className="btn btn-secondary-dark btn-primary-lg">Open the map</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ background: C.ink, color: "rgba(255,255,255,0.4)", padding: "3rem 1.5rem" }}>
        <div className="footer-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "start" }}>
          <div>
            <div style={{ marginBottom: "0.75rem" }}>
              <span style={{ fontFamily: C.display, fontWeight: 400, fontSize: "1.0625rem", color: "#fff" }}><span style={{ fontWeight: 300 }}>Stray</span><span style={{ fontWeight: 800 }}>Paw</span></span>
            </div>
            <p style={{ fontSize: "0.8125rem", lineHeight: 1.6, maxWidth: 300 }}>Community-powered street animal welfare for Delhi NCR. Built with the community, for the community.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem 3rem" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Product</div>
              {[{ l: "Community app", h: "/app" }, { l: "Map", h: "/map" }, { l: "Partner OS", h: "/partner" }, { l: "Fundraisers", h: "/fundraisers" }].map(({ l, h }) => (
                <div key={l} style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}><Link href={h} style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{l}</Link></div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Company</div>
              {[{ l: "What we do", h: "/what-we-do" }, { l: "Our journey", h: "/journey" }, { l: "Contact", h: "/contact" }, { l: "Organizations", h: "/orgs" }].map(({ l, h }) => (
                <div key={l} style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}><Link href={h} style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>{l}</Link></div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "2rem auto 0", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
          <span>© 2026 StrayPaw. For the people, by the people.</span>
          <span>Delhi NCR · India</span>
        </div>
      </footer>

      <style>{`
        @keyframes sp-float { 0%,100%{ transform: translateX(-50%) translateY(0);} 50%{ transform: translateX(-50%) translateY(6px);} }
        @keyframes sp-pulse-ring { 0%,100%{ box-shadow: 0 2px 6px rgba(0,0,0,0.28), 0 0 0 0 rgba(192,73,46,0.5);} 50%{ box-shadow: 0 2px 6px rgba(0,0,0,0.28), 0 0 0 10px rgba(192,73,46,0);} }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-phone { display: none !important; }
          .split-2 { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) { [style*="sp-float"], [style*="sp-pulse-ring"] { animation: none !important; } }
      `}</style>
    </div>
  );
}
