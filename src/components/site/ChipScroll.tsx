"use client";

import { useEffect, useRef, useState } from "react";
import {
  GlassCapsule,
  AntiMigrationCap,
  AntennaCoil,
  SiliconDie,
} from "./ChipParts";

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
    let last = -1;
    function update() {
      const rect = section!.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) {
        if (last !== 0) { last = 0; setProgress(0); }
        return;
      }
      const scrolled = Math.max(0, -rect.top);
      const next = Math.min(1, scrolled / total);
      /* Quantise before setting state. Scrolling fires a frame at a time and
         a raw value re-rendered the whole section on every one; at 1/400 the
         motion is still continuous to the eye but the render count drops by
         an order of magnitude. */
      const q = Math.round(next * 400) / 400;
      if (q !== last) {
        last = q;
        setProgress(q);
      }
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

  /* Closed, the four parts sit exactly on top of one another and read as a
     single capsule. Opening fans them apart vertically — a product teardown,
     not an explosion — so each part is separately visible and nameable. */
  const SPREAD = 82;
  const layers = [
    {
      id: "glass",
      label: "BIO-GLASS CAPSULE",
      Art: GlassCapsule,
      y: openP * -SPREAD * 1.5,
      z: openP * 30,
      // The shell goes translucent so the internals below can be read.
      opacity: 1 - openP * 0.45,
    },
    {
      id: "cap",
      label: "ANTI-MIGRATION CAP",
      Art: AntiMigrationCap,
      y: openP * -SPREAD * 0.5,
      z: openP * 55,
      opacity: 0.5 + openP * 0.5,
    },
    {
      id: "coil",
      label: "ANTENNA COIL",
      Art: AntennaCoil,
      y: openP * SPREAD * 0.5,
      z: openP * 80,
      opacity: 0.5 + openP * 0.5,
    },
    {
      id: "die",
      label: "SILICON DIE",
      Art: SiliconDie,
      y: openP * SPREAD * 1.5,
      z: openP * 105,
      opacity: 0.5 + openP * 0.5,
    },
  ];

  function ease(t: number) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /* Record and network share one cell, and they are different shapes — a tall
     bordered card against a wide sparse graph. Blended simultaneously the graph
     drew straight across the card, so the handoff is sequential: the record is
     gone before the network starts. */
  const handoff = Math.min(1, networkP / 0.35);
  const networkOpacity = ease(Math.max(0, (networkP - 0.4) / 0.6));
  const recordOpacity = ease(recordP) * (1 - handoff);

  /* Phone width has room for one panel at a time, so the assembly clears out
     before the record arrives instead of dissolving through it. Desktop shows
     both and ignores these. */
  const assemblyOpacity = 1 - Math.min(1, recordP / 0.4);
  const recordOpacityCompact =
    ease(Math.max(0, (recordP - 0.4) / 0.6)) * (1 - handoff);

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
                ? "A whole history hangs off a passive transponder the size of a grain of rice."
                : "Four components. One permanent code."}
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
              Any ISO reader returns the animal&rsquo;s full profile —
              sterilisation, vaccination, treatments, caregivers.
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
              One identity that holds across time and across organisations, so
              every later sighting attaches to the same animal.
            </p>
          </div>
        </div>

        {/* ── Chip visualization ── */}
        <div
          className="chs-viz"
          aria-hidden="true"
          style={
            /* Phone width cross-fades the assembly out as the record resolves;
               there is not room for both. Desktop ignores it and shows both. */
            {
              "--chs-asm-op": assemblyOpacity,
              "--chs-rec-op": recordOpacityCompact,
            } as React.CSSProperties
          }
        >
          <div className="chs-assembly">
          <div
            className="chs-scene-wrap"
            style={
              /* The assembly steps back as the record resolves out of it —
                 read as one motion rather than two competing panels. */
              { "--chs-scale": 1 - recordP * 0.2 } as React.CSSProperties
            }
          >
            <div className="chs-scene" style={{ perspective: "1200px" }}>
              <div
                className="chs-layers"
                style={{
                  transform: `rotateX(${8 - openP * 4}deg) rotateY(${-20 + openP * 8}deg)`,
                  transformStyle: "preserve-3d",
                  transition: "transform 0.3s ease",
                }}
              >
                {layers.map(({ id, label, Art, y, z, opacity }) => (
                  <div
                    key={id}
                    className={`chs-layer chs-${id}`}
                    style={{
                      transform: `translate3d(0, ${y}px, ${z}px)`,
                      transition: reduced
                        ? "none"
                        : "transform 1s cubic-bezier(0.16,1,0.3,1)",
                    }}
                  >
                    {/* Opacity rides on the artwork, not the layer: a faded
                        part must not drag its label down with it. */}
                    <span
                      className="chs-layer-art"
                      style={{
                        opacity,
                        transition: reduced ? "none" : "opacity 0.6s ease",
                      }}
                    >
                      <Art />
                    </span>
                    {stage >= 1 && (
                      <span
                        className="chs-layer-label"
                        style={{
                          /* Reaches full strength early in the open, so the
                             names are readable for most of the stage. */
                          opacity: Math.min(1, openP * 2.5),
                          transition: "opacity 0.4s ease",
                        }}
                      >
                        {label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Always rendered so its row is reserved and the assembly does not
              jump when it appears. */}
          <div
            className="chs-code"
            style={{ opacity: Math.min(1, Math.max(0, (openP - 0.3) / 0.35)) }}
          >
            <span className="chs-code-label">ISO 11784 identifier structure</span>
            <b>NNN&nbsp;NNNNNNNNNNNN</b>
          </div>

          {/* Part names for phone width, where the leader-line labels beside
              the assembly would be too small to read. */}
          <ul className="chs-legend" aria-hidden="true">
            {layers.map(({ id, label }, i) => (
              <li
                key={id}
                style={{ opacity: stage >= 1 ? Math.min(1, openP * 2.5) : 0.3 }}
              >
                <span className="chs-legend-n">{`0${i + 1}`}</span>
                {label}
              </li>
            ))}
          </ul>
          </div>

          <div className="chs-stack">
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
              <span className="chs-record-tag">ISO 11784 / 11785</span>
              <span className="chs-record-status">
                <i className="chs-dot green" />
                Record format
              </span>
            </div>
            <div className="chs-record-fields">
              {/* What a resolved record carries. Field names and standards
                  only — inventing an animal's values would put fabricated
                  data on the page. */}
              <div className="chs-field">
                <span>Identity</span>
                <b>15-digit code · 3-digit country or manufacturer prefix</b>
              </div>
              <div className="chs-field">
                <span>Appearance</span>
                <b>Sex · approximate age · coat and markings</b>
              </div>
              <div className="chs-field">
                <span>Medical</span>
                <b>Sterilisation · rabies vaccination · treatments</b>
              </div>
              <div className="chs-field">
                <span>Location</span>
                <b>Scan point · date · recording organisation</b>
              </div>
              <div className="chs-field">
                <span>Community</span>
                <b>Sightings · reports · named caregivers</b>
              </div>
            </div>
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
      </div>
    </section>
  );
}
