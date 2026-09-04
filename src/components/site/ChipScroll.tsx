"use client";

import { useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════════════
   ChipScroll — scroll-controlled 4-stage section.

   The section is tall (300vh). The inner view is sticky at 100svh.
   Scroll progress within the section drives 4 stages:

   0 – 0.2  INTACT   chip closed, floating — "ONE SMALL CHIP."
   0.2–0.5  OPEN     layers separate in depth — construction revealed
   0.5–0.75 RECORD   animal profile emerges from chip center
   0.75–1.0 NETWORK  profile connects to sighting nodes

   CSS 3D transform-style: preserve-3d. No WebGL.
   ════════════════════════════════════════════════════════════════════ */

type Stage = 0 | 1 | 2 | 3;

export function ChipScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) { setProgress(0.55); return; } // skip to record stage

    const section = sectionRef.current;
    if (!section) return;

    let raf = 0;
    function update() {
      const rect = section!.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) { setProgress(0); return; }
      const scrolled = Math.max(0, -rect.top);
      setProgress(Math.min(1, scrolled / total));
    }

    update();
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const stage: Stage =
    progress < 0.2 ? 0
    : progress < 0.5 ? 1
    : progress < 0.75 ? 2
    : 3;

  // How far through the current stage are we (0–1)
  const stageP = (lo: number, hi: number) =>
    Math.max(0, Math.min(1, (progress - lo) / (hi - lo)));

  const openP = stageP(0.2, 0.5);   // chip opening
  const recordP = stageP(0.5, 0.75); // record appearing
  const networkP = stageP(0.75, 1.0); // network appearing

  // Layer transforms — separation is primarily in Z (depth) and slightly Y
  const layers = [
    {
      id: "glass",
      label: null,
      // Capsule moves back as it opens (reveals interior)
      z: openP * -80,
      y: openP * -6,
      opacity: 1 - openP * 0.55,
    },
    {
      id: "cap",
      label: "ANTI-MIGRATION CAP",
      z: openP * 30,
      y: openP * -20,
      opacity: 0.55 + openP * 0.45,
    },
    {
      id: "coil",
      label: "ANTENNA COIL",
      z: openP * 70,
      y: 0,
      opacity: 0.55 + openP * 0.45,
    },
    {
      id: "die",
      label: "MICROCHIP DIE",
      z: openP * 110,
      y: openP * 16,
      opacity: 0.55 + openP * 0.45,
    },
  ];

  function ease(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  const recordOpacity = ease(recordP);
  const networkOpacity = ease(networkP);

  return (
    <section
      ref={sectionRef}
      className="chs"
      style={{ minHeight: reduced ? "auto" : "300vh" }}
    >
      <div className="chs-sticky">
        {/* Stage progress dots */}
        <div className="chs-dots" aria-hidden="true">
          {([0, 1, 2, 3] as Stage[]).map((s) => (
            <span key={s} className={stage >= s ? "on" : ""} />
          ))}
        </div>

        {/* ── Headline copy — morphs per stage ── */}
        <div className="chs-copy">
          <div
            className="chs-copy-stage"
            style={{ opacity: stage <= 1 ? 1 : 0, pointerEvents: stage <= 1 ? "auto" : "none" }}
          >
            <div className="sp-kicker light">ONE ANIMAL. <span>ONE IDENTITY.</span></div>
            <h2 className="sp-display chs-heading">
              {stage === 0 ? (
                <>One small chip.</>
              ) : (
                <>Inside<br /><span>the capsule.</span></>
              )}
            </h2>
            <p className="chs-sub">
              {stage === 0
                ? "A street dog's entire history hangs off a passive transponder roughly the size of a grain of rice. Scroll to see what's inside."
                : "Four real components. One permanent code."}
            </p>
          </div>

          <div
            className="chs-copy-stage"
            style={{ opacity: stage === 2 ? 1 : 0, pointerEvents: stage === 2 ? "auto" : "none" }}
          >
            <div className="sp-kicker light">PERSISTENT IDENTITY</div>
            <h2 className="sp-display chs-heading">
              One code.<br /><span>Every record.</span>
            </h2>
            <p className="chs-sub">
              Scan the chip anywhere — any ISO-compatible reader, including ones
              clinics already own. The code returns the animal&rsquo;s full profile:
              sterilisation, vaccination, treatments, caregivers, sightings.
            </p>
          </div>

          <div
            className="chs-copy-stage"
            style={{ opacity: stage === 3 ? 1 : 0, pointerEvents: stage === 3 ? "auto" : "none" }}
          >
            <div className="sp-kicker light">CONNECTED INTELLIGENCE</div>
            <h2 className="sp-display chs-heading">
              One identity.<br /><span>Everything connected.</span>
            </h2>
            <p className="chs-sub">
              The chip is not a record — it is a key. Every sighting, every
              intervention, every caregiver, every location: connected to one
              persistent animal identity across time and across organisations.
            </p>
          </div>
        </div>

        {/* ── Chip visualization ── */}
        <div className="chs-viz" aria-hidden="true">
          <div className="chs-scene-wrap">
            <div className="chs-scene" style={{ perspective: "1200px" }}>
              <div
                className="chs-layers"
                style={{
                  transform: `rotateX(${8 - openP * 4}deg) rotateY(${-20 + openP * 8}deg)`,
                  transformStyle: "preserve-3d",
                  transition: "transform 0.3s ease",
                }}
              >
                {layers.map((l) => (
                  <div
                    key={l.id}
                    className={`chs-layer chs-${l.id}`}
                    style={{
                      transform: `translate3d(0, ${l.y}px, ${l.z}px)`,
                      transition: reduced
                        ? "none"
                        : "transform 0.9s cubic-bezier(0.16,1,0.3,1)",
                    }}
                  >
                    {/* Opacity rides on the artwork, not the layer: a faded
                        layer must not drag its label down with it. */}
                    <span
                      className="chs-layer-art"
                      style={{
                        opacity: l.opacity,
                        transition: reduced ? "none" : "opacity 0.6s ease",
                      }}
                    />
                    {l.label && stage >= 1 && (
                      <span
                        className="chs-layer-label"
                        style={{
                          /* Reaches full strength early in the open, so the
                             names are readable for most of the stage. */
                          opacity: Math.min(1, openP * 2.5),
                          transition: "opacity 0.4s ease",
                        }}
                      >
                        {l.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Code readout — visible once chip is open */}
              {openP > 0.3 && (
                <div
                  className="chs-code"
                  style={{ opacity: Math.min(1, ((openP - 0.3) / 0.7) * 2) }}
                >
                  <span className="chs-code-label">15-digit unique identifier</span>
                  <b>985 112004567890</b>
                </div>
              )}
            </div>
          </div>

          {/* ── Dog record — stage 2 ── */}
          <div
            className="chs-record"
            style={{
              opacity: recordOpacity,
              transform: `translateY(${(1 - recordOpacity) * 24}px)`,
              transition: "none",
            }}
          >
            <div className="chs-record-id">
              <span className="chs-record-tag">SP-004821</span>
              <span className="chs-record-status">
                <i className="chs-dot green" />
                Active record
              </span>
            </div>
            <div className="chs-record-fields">
              <div className="chs-field">
                <span>Appearance</span>
                <b>Brown / tan · Female · ~3 years</b>
              </div>
              <div className="chs-field">
                <span>Medical</span>
                <b>Vaccinated · Sterilised · Rabies (2024)</b>
              </div>
              <div className="chs-field">
                <span>Last seen</span>
                <b>Ward 12 feeding point — 4 days ago</b>
              </div>
              <div className="chs-field">
                <span>Community</span>
                <b>14 sightings · 3 reports · 2 caregivers</b>
              </div>
            </div>
            {/* No animal is enrolled yet, so this is the record *format*, not a
                record. Said plainly rather than left to look like live data. */}
            <p className="chs-record-note">
              Illustration of the record format — no animal is enrolled yet.
            </p>
            <div className="chs-record-line" aria-hidden="true" />
          </div>

          {/* ── Network — stage 3 ── */}
          <div
            className="chs-network"
            style={{ opacity: networkOpacity, transition: "none" }}
          >
            <svg
              className="chs-net-svg"
              viewBox="0 0 320 140"
              fill="none"
              aria-hidden="true"
            >
              {/* Connection lines from chip to sighting nodes */}
              <line x1="160" y1="20" x2="60" y2="110" stroke="rgba(143,183,255,0.35)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="160" y1="20" x2="160" y2="120" stroke="rgba(143,183,255,0.35)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="160" y1="20" x2="260" y2="105" stroke="rgba(143,183,255,0.35)" strokeWidth="1" strokeDasharray="4 4" />
              {/* Sighting nodes */}
              <circle cx="60" cy="110" r="5" fill="rgba(143,183,255,0.2)" stroke="#8fb7ff" strokeWidth="1" />
              <circle cx="160" cy="120" r="5" fill="rgba(102,197,213,0.2)" stroke="#66c5d5" strokeWidth="1" />
              <circle cx="260" cy="105" r="5" fill="rgba(143,183,255,0.2)" stroke="#8fb7ff" strokeWidth="1" />
              {/* Node labels */}
              <text x="60" y="132" fill="#8fb7ff" fontSize="8" fontFamily="monospace" textAnchor="middle">SIGHTING 01</text>
              <text x="160" y="136" fill="#66c5d5" fontSize="8" fontFamily="monospace" textAnchor="middle">SIGHTING 02</text>
              <text x="260" y="127" fill="#8fb7ff" fontSize="8" fontFamily="monospace" textAnchor="middle">SIGHTING 03</text>
              {/* Central chip node */}
              <circle cx="160" cy="20" r="8" fill="rgba(143,183,255,0.15)" stroke="#8fb7ff" strokeWidth="1.5" />
              <circle cx="160" cy="20" r="3" fill="#8fb7ff" />
            </svg>
            <p className="chs-net-label">
              Every sighting, every location — linked to one persistent identity.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
