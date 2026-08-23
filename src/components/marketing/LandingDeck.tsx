/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight, HeartHandshake, Rss, Utensils } from "lucide-react";
import {
  C, LandingStats, PhoneMockup, MapPreview, DashboardPreview,
} from "@/components/marketing/LandingV2";

// ── Count-up stat (dark text, for the light deck) ────────────────────────────
function HeroStat({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const inc = target / 100;
    const timer = setInterval(() => {
      start += inc;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <div>
      <div style={{ fontFamily: C.display, fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 700, color: C.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {count.toLocaleString("en-IN")}
      </div>
      <div style={{ fontSize: "0.8125rem", color: C.bark500, marginTop: "0.35rem" }}>{label}</div>
    </div>
  );
}

// ── Animated cool aurora background (premium, light) ─────────────────────────
function Aurora({ index }: { index: number }) {
  return (
    <div className="sp-aurora" aria-hidden>
      <motion.div
        className="sp-aurora-inner"
        animate={{ x: index * -26, y: index * 12, rotate: index * 3 }}
        transition={{ type: "spring", stiffness: 26, damping: 18 }}
      >
        <span className="sp-blob b1" />
        <span className="sp-blob b2" />
        <span className="sp-blob b3" />
        <span className="sp-blob b4" />
        <span className="sp-blob b5" />
      </motion.div>
      <div className="sp-aurora-grain" />
    </div>
  );
}

const swipe = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 110 : -110, scale: 0.94, filter: "blur(8px)" }),
  center: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -110 : 110, scale: 0.94, filter: "blur(8px)" }),
};

// Reusable bits -------------------------------------------------------------
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow" style={{ marginBottom: "0.9rem" }}>{children}</div>;
}
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem" }}>
      <span style={{ width: 20, height: 20, borderRadius: 9999, background: C.paw100, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <Check size={11} color={C.paw600} strokeWidth={2.6} />
      </span>
      <span style={{ fontSize: "0.9375rem", color: C.bark700 }}>{children}</span>
    </div>
  );
}

export default function LandingDeck({ stats }: { stats: LandingStats }) {
  const [[i, dir], setState] = useState<[number, number]>([0, 0]);

  const slides: React.ReactNode[] = [
    // 1 — Hero ------------------------------------------------------------
    <div key="hero" className="deck-hero" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "3.5rem", alignItems: "center", maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      <div>
        <h1 className="display-xl" style={{ color: C.ink, maxWidth: 640, marginBottom: "1rem" }}>
          The shared platform for <em style={{ color: C.paw500, fontStyle: "normal" }}>India&apos;s street animals.</em>
        </h1>
        <p style={{ fontSize: "1.0625rem", color: C.bark600, maxWidth: 500, lineHeight: 1.6, marginBottom: "2rem" }}>
          Report a street animal in under a minute. Verified NGOs pick it up, treat it, and log every step — so care is finally counted, coordinated, and funded, out in the open.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/app" className="btn btn-primary btn-primary-lg">Open the app <ArrowRight size={16} /></Link>
          <Link href="/partner" className="btn btn-secondary btn-primary-lg">For NGOs &amp; partners</Link>
        </div>
        <div style={{ marginTop: "2.5rem", display: "flex", gap: "2.5rem", flexWrap: "wrap" }}>
          <HeroStat target={stats.dogsSpotted} label="Animals tracked" />
          {stats.dogsFed > 0 && <HeroStat target={stats.dogsFed} label="Care actions logged" />}
          {stats.dogsSterilised > 0 && <HeroStat target={stats.dogsSterilised} label="Sterilisations" />}
        </div>
      </div>
      <div className="deck-hero-phone"><PhoneMockup /></div>
    </div>,

    // 2 — The problem -----------------------------------------------------
    <div key="problem" style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
      <Eyebrow>The problem</Eyebrow>
      <h2 className="display-md" style={{ color: C.ink, marginBottom: "1rem", maxWidth: 720 }}>
        The work of caring for street animals is invisible — and uncounted.
      </h2>
      <p style={{ fontSize: "1.0625rem", color: C.bark600, lineHeight: 1.65, maxWidth: 620, marginBottom: "2rem" }}>
        The people who feed, rescue, and treat India&apos;s street animals do extraordinary work — but it lives in WhatsApp groups and paper notebooks. It&apos;s siloed, hard to fund, and impossible to coordinate at scale.
      </p>
      <div className="deck-cards" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {[
          "No shared record of who was treated, vaccinated, or sterilised",
          "NGOs buried in reports, with no way to triage the urgent ones",
          "Donors can't see where help is needed — or what their money did",
        ].map((t) => (
          <div key={t} style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: `1px solid ${C.bark200}`, borderRadius: 16, padding: "1.4rem" }}>
            <p style={{ fontSize: "0.9375rem", color: C.bark700, lineHeight: 1.55, margin: 0 }}>{t}</p>
          </div>
        ))}
      </div>
    </div>,

    // 3 — How it works ----------------------------------------------------
    <div key="how" style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      <div style={{ maxWidth: 560, marginBottom: "2.25rem" }}>
        <Eyebrow>How it works</Eyebrow>
        <h2 className="display-md" style={{ color: C.ink }}>From a street sighting to a resolved case.</h2>
      </div>
      <div className="deck-cards" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {[
          { n: "01", t: "Spot & report", b: "Anyone adds a street animal with a photo and a location in under a minute — no account needed." },
          { n: "02", t: "NGOs take action", b: "Verified organizations triage cases by severity, assign vets, and update status on their dashboard." },
          { n: "03", t: "Track & back the work", b: "Follow every outcome, and fund the rescues that need it — transparently, on one open platform." },
        ].map(({ n, t, b }) => (
          <div key={n} style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: `1px solid ${C.bark200}`, borderRadius: 18, padding: "1.75rem" }}>
            <div style={{ fontFamily: C.mono, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.12em", color: C.paw500, marginBottom: "0.9rem" }}>{n}</div>
            <div style={{ height: 1, background: C.bark200, marginBottom: "1.1rem" }} />
            <h3 style={{ fontFamily: C.display, fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.01em", color: C.ink, marginBottom: "0.5rem", lineHeight: 1.2 }}>{t}</h3>
            <p style={{ fontSize: "0.875rem", color: C.bark600, lineHeight: 1.6 }}>{b}</p>
          </div>
        ))}
      </div>
    </div>,

    // 3 — Community map ---------------------------------------------------
    <div key="map" style={{ maxWidth: 1040, margin: "0 auto", width: "100%" }}>
      <div style={{ maxWidth: 560, marginBottom: "1.75rem" }}>
        <Eyebrow>Community map</Eyebrow>
        <h2 className="display-md" style={{ color: C.ink }}>A live map of every tracked animal, across India</h2>
      </div>
      <div className="deck-map" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "2rem", alignItems: "center" }}>
        <MapPreview />
        <div style={{ display: "grid", gap: "1.1rem" }}>
          {[{ color: "#c0492e", label: "Needs help", desc: "Injured or sick — flagged for NGO action" }, { color: "#3e8473", label: "Sterilised", desc: "Part of the ABC programme" }, { color: "#8b5ea8", label: "Adoptable", desc: "Friendly, vaccinated, looking for a home" }, { color: "#d9a441", label: "Recently fed", desc: "Fed within the last 10 hours" }].map(({ color, label, desc }) => (
            <div key={label} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ width: 12, height: 12, borderRadius: 9999, background: color, flexShrink: 0, marginTop: 4 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: C.ink }}>{label}</div>
                <div style={{ fontSize: "0.8125rem", color: C.bark600, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
          <Link href="/map" className="btn btn-primary" style={{ marginTop: "0.4rem", width: "fit-content" }}>Open the map <ArrowRight size={14} /></Link>
        </div>
      </div>
    </div>,

    // 4 — Partner OS ------------------------------------------------------
    <div key="partner" style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>
      <div className="deck-map" style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: "2.5rem", alignItems: "center" }}>
        <div>
          <Eyebrow>NGO / Partner OS</Eyebrow>
          <h2 className="display-md" style={{ color: C.ink, marginBottom: "1rem" }}>Operations software for animal-welfare organizations</h2>
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {["Incoming reports, sorted by severity", "Case assignment & status tracking", "Animal registry with health records", "Field ops & vet-camp management", "Fundraising & campaign management", "Analytics & resolution metrics"].map(t => <Bullet key={t}>{t}</Bullet>)}
          </div>
          <Link href="/partner" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>Open partner dashboard <ArrowRight size={14} /></Link>
        </div>
        <div className="deck-dash"><DashboardPreview /></div>
      </div>
    </div>,

    // 5 — Impact ----------------------------------------------------------
    <div key="impact" style={{ maxWidth: 1040, margin: "0 auto", width: "100%" }}>
      <Eyebrow>Impact</Eyebrow>
      <h2 className="display-md" style={{ color: C.ink, marginBottom: "1.75rem", maxWidth: 460 }}>Real outcomes for real animals</h2>
      <div className="deck-impact" style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {[
          { n: stats.dogsSpotted, val: stats.dogsSpotted.toLocaleString("en-IN"), label: "Animals tracked", desc: "Unique profiles across India" },
          { n: stats.dogsFed, val: stats.dogsFed.toLocaleString("en-IN"), label: "Care actions", desc: "Sightings, feedings & treatments" },
          { n: stats.dogsSterilised, val: stats.dogsSterilised.toLocaleString("en-IN"), label: "Sterilisations", desc: "Part of the ABC programme" },
        ].filter((s) => s.n > 0).map(({ val, label, desc }) => (
          <div key={label} style={{ flex: "1 1 220px", maxWidth: 300, background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: `1px solid ${C.bark200}`, borderRadius: 18, padding: "1.6rem 1.4rem" }}>
            <div style={{ fontFamily: C.display, fontSize: "clamp(1.6rem,3vw,2.25rem)", fontWeight: 700, color: C.paw600, letterSpacing: "-0.02em", lineHeight: 1 }}>{val}</div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: C.ink, marginTop: "0.6rem" }}>{label}</div>
            <div style={{ fontSize: "0.8125rem", color: C.bark600, marginTop: "0.25rem", lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>,

    // 6 — Join / explore --------------------------------------------------
    <div key="join" style={{ maxWidth: 780, margin: "0 auto", width: "100%", textAlign: "center" }}>
      <div style={{ background: "linear-gradient(135deg, #3b7de6 0%, #2f63c2 60%, #274f9c 100%)", borderRadius: 28, padding: "3.25rem 2rem", boxShadow: "0 30px 70px -30px rgba(59,125,230,0.6)" }}>
        <div style={{ fontFamily: C.mono, fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: "1rem" }}>Join the community</div>
        <h2 className="display-md" style={{ color: "#fff", marginBottom: "1rem" }}>Every sighting matters. Start here.</h2>
        <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: "1.75rem", maxWidth: 460, marginInline: "auto" }}>
          Report what you see — an injured animal, a puppy alone — and create the data that helps NGOs act.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/app" className="btn btn-primary-dark btn-primary-lg">Report a sighting</Link>
          <Link href="/map" className="btn btn-secondary-dark btn-primary-lg">Open the map</Link>
        </div>
        <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.75rem" }}>
          {[{ icon: Rss, l: "Sightings feed", h: "/feed" }, { icon: HeartHandshake, l: "Fundraisers", h: "/fundraisers" }, { icon: Utensils, l: "Feeding zones", h: "/map?layer=feeding" }].map(({ icon: Icon, l, h }) => (
            <Link key={l} href={h} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.9)", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}>
              <Icon size={15} /> {l}
            </Link>
          ))}
        </div>
      </div>
    </div>,
  ];

  const n = slides.length;
  const go = useCallback((next: number) => setState(([cur]) => {
    const c = Math.max(0, Math.min(n - 1, next));
    return [c, c > cur ? 1 : -1];
  }), [n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  return (
    <div className="deck-root">
      <Aurora index={i} />

      {/* slide number */}
      <div className="deck-count">
        {String(i + 1).padStart(2, "0")} <span style={{ opacity: 0.4 }}>/ {String(n).padStart(2, "0")}</span>
      </div>

      <div className="deck-stage">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.section
            key={i}
            custom={dir}
            variants={swipe}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(i + 1);
              else if (info.offset.x > 80) go(i - 1);
            }}
            className="deck-slide"
          >
            {slides[i]}
          </motion.section>
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="deck-controls">
        <button onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous" className="deck-arrow"><ChevronLeft size={20} /></button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {slides.map((_, k) => (
            <button key={k} onClick={() => go(k)} aria-label={`Slide ${k + 1}`} className={`deck-dot${k === i ? " on" : ""}`} />
          ))}
        </div>
        <button onClick={() => go(i + 1)} disabled={i === n - 1} aria-label="Next" className="deck-arrow"><ChevronRight size={20} /></button>
      </div>

      <style>{`
        .deck-root{position:relative;height:100dvh;overflow:hidden;background:${C.paper};color:${C.ink};display:flex;flex-direction:column}
        .deck-stage{position:relative;flex:1;min-height:0}
        .deck-slide{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:6.5rem 1.5rem 1.5rem;overflow-y:auto}
        .deck-count{position:absolute;left:1.25rem;top:5rem;z-index:5;font-size:12px;font-weight:600;letter-spacing:0.2em;font-variant-numeric:tabular-nums;color:${C.bark400}}
        .deck-controls{position:relative;z-index:5;display:flex;align-items:center;justify-content:center;gap:1.25rem;padding-bottom:1.5rem}
        .deck-arrow{display:grid;place-items:center;width:42px;height:42px;border-radius:9999px;border:1px solid ${C.bark200};background:rgba(255,255,255,0.7);backdrop-filter:blur(8px);color:${C.bark600};transition:all .15s}
        .deck-arrow:hover{background:#fff;color:${C.ink}}
        .deck-arrow:disabled{opacity:.3;pointer-events:none}
        .deck-dot{height:8px;width:8px;border-radius:9999px;background:#c6cddb;transition:all .25s}
        .deck-dot.on{width:26px;background:${C.paw500}}

        /* aurora */
        .sp-aurora{position:absolute;inset:0;overflow:hidden;z-index:0;background:
          radial-gradient(120% 90% at 50% -10%, #f4f8ff 0%, ${C.paper} 55%)}
        .sp-aurora-inner{position:absolute;inset:-10%}
        .sp-blob{position:absolute;border-radius:9999px;filter:blur(72px);opacity:.55;will-change:transform}
        .sp-blob.b1{width:46vw;height:46vw;left:-6vw;top:-8vw;background:#bdd7ff;animation:sp-f1 22s ease-in-out infinite}
        .sp-blob.b2{width:40vw;height:40vw;right:-8vw;top:-4vw;background:#cfe6ff;animation:sp-f2 26s ease-in-out infinite}
        .sp-blob.b3{width:52vw;height:52vw;left:22vw;top:28vh;background:#dbe4ff;animation:sp-f3 30s ease-in-out infinite}
        .sp-blob.b4{width:38vw;height:38vw;left:-4vw;bottom:-12vw;background:#d3ecff;animation:sp-f1 28s ease-in-out infinite reverse}
        .sp-blob.b5{width:34vw;height:34vw;right:-6vw;bottom:-10vw;background:#d9d8ff;animation:sp-f2 24s ease-in-out infinite}
        .sp-aurora-grain{position:absolute;inset:0;opacity:.04;mix-blend-mode:multiply;background-image:radial-gradient(#334 0.5px, transparent 0.5px);background-size:3px 3px}
        @keyframes sp-f1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(6%,4%) scale(1.12)}}
        @keyframes sp-f2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-5%,6%) scale(1.15)}}
        @keyframes sp-f3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-4%,-5%) scale(0.9)}}
        .sp-ping{animation:sp-ping 1.8s cubic-bezier(0,0,.2,1) infinite}
        @keyframes sp-ping{75%,100%{transform:scale(2.2);opacity:0}}

        .deck-hero-phone{display:flex;justify-content:flex-end}
        .deck-dash{width:100%}
        /* Scale the tall device mockups down on shorter viewports so a slide
           never clips or needs to scroll. */
        @media (max-height:860px){
          .deck-hero-phone{transform:scale(.86);transform-origin:center right}
          .deck-dash{transform:scale(.9);transform-origin:top center}
        }
        @media (max-height:740px){
          .deck-hero-phone{transform:scale(.72)}
          .deck-dash{transform:scale(.8)}
          .deck-slide{padding-top:5.5rem}
        }
        @media (max-width:960px){
          .deck-hero{grid-template-columns:1fr !important}
          .deck-hero-phone{display:none !important}
          .deck-map{grid-template-columns:1fr !important;gap:1.5rem !important}
          .deck-cards{grid-template-columns:1fr 1fr !important}
          .deck-dash{transform:none;max-width:520px;margin:0 auto}
        }
        @media (max-width:600px){
          .deck-cards{grid-template-columns:1fr !important}
          .deck-slide{padding:5.5rem 1.1rem 1rem}
        }
        @media (prefers-reduced-motion: reduce){ .sp-blob{animation:none} }
      `}</style>
    </div>
  );
}
