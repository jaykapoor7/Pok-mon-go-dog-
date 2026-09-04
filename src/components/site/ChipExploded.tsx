"use client";

import { useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════════════
   Exploded view of an ISO 11784/11785 passive RFID transponder.

   Real construction: bioglass capsule → anti-migration cap → copper
   antenna coil wound on ferrite rod → IC die holding the 15-digit code.

   CSS 3D transforms only — no WebGL needed for five planes on a Z axis.
   ════════════════════════════════════════════════════════════════════ */

type Layer = {
  id: string;
  name: string;
  detail: string;
  x: number;
  out: number;
  z: number;
};

const LAYERS: Layer[] = [
  {
    id: "glass",
    name: "Bioglass capsule",
    detail:
      "Soda-lime bioglass, roughly 12mm × 2mm. Inert, so the body does not reject it.",
    x: 0,
    out: -190,
    z: 0,
  },
  {
    id: "cap",
    name: "Anti-migration cap",
    detail:
      "Polymer sheath over one end. Tissue bonds to it, so the transponder stays where it was placed.",
    x: -104,
    out: -95,
    z: 30,
  },
  {
    id: "coil",
    name: "Antenna coil",
    detail:
      "Copper winding around a ferrite rod. The scanner's field induces current here — no battery, nothing to replace.",
    x: -14,
    out: 40,
    z: 30,
  },
  {
    id: "die",
    name: "Microchip die",
    detail:
      "Holds one 15-digit code and nothing else. No location, no history, no memory of having been read.",
    x: 86,
    out: 150,
    z: 30,
  },
];

export function ChipExploded() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* Open once on arrival. After it opens, fire the scanner beam. */
  useEffect(() => {
    if (reduced) {
      setProgress(1);
      setScanned(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setProgress(1);
          // Scanner beam fires after the explode animation settles (~1.1s)
          setTimeout(() => setScanned(true), 1400);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const isOpen = progress === 1;

  return (
    <div className="chip-wrap" ref={ref}>
      <div className="chip-stage" aria-hidden="true">
        {/* Scanner beam — sweeps once, then stays as a ghost */}
        {isOpen && (
          <div className={`chip-beam ${scanned ? "done" : "scanning"}`} />
        )}

        <div
          className={`chip-scene${isOpen ? " open" : ""}`}
          style={{
            transform: `rotateX(${14 - progress * 6}deg) rotateY(${-26 + progress * 10}deg)`,
          }}
        >
          {LAYERS.map((l, i) => {
            const x = l.x + (l.out - l.x) * progress;
            const z = l.z * progress;
            const isOn = active === l.id;
            return (
              <div
                key={l.id}
                className={`chip-layer chip-${l.id}${isOn ? " on" : ""}${scanned && l.id === "die" ? " pulse" : ""}`}
                style={{
                  transform: `translate3d(${x}px, 0, ${z}px)`,
                  opacity:
                    l.id === "glass"
                      ? 1 - progress * 0.28
                      : 0.45 + progress * 0.55,
                  transitionDelay: `${i * 50}ms`,
                }}
              >
                <span className="chip-layer-art" />
              </div>
            );
          })}
        </div>

        <div className="chip-readout" style={{ opacity: progress }}>
          <span className="sp-mono">What the die holds</span>
          <b className={scanned ? "lit" : ""}>985 112004567890</b>
          <small>
            3-digit country / manufacturer prefix, then 12 digits unique to the
            animal. Assigned once, never reissued.
          </small>
        </div>
      </div>

      {/* Callouts — hovering one highlights the corresponding layer. */}
      <ol className="chip-calls" style={{ opacity: Math.max(0.15, progress) }}>
        {LAYERS.map((l, i) => (
          <li
            key={l.id}
            className={active === l.id ? "on" : ""}
            onMouseEnter={() => setActive(l.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(l.id)}
            onBlur={() => setActive(null)}
            tabIndex={0}
          >
            <span className="chip-call-n">{String(i + 1).padStart(2, "0")}</span>
            <span className="chip-call-arrow" aria-hidden="true" />
            <div>
              <b>{l.name}</b>
              <p>{l.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
