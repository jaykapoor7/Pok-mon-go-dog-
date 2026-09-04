"use client";

import { useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════════════
   Exploded view of an ISO 11784/11785 transponder.

   The layers below are the real construction of a passive RFID animal
   transponder, not a stylisation: a bioglass capsule containing a ferrite
   rod, a copper antenna coil wound around it, and the IC that holds the
   code. The anti-migration cap is the parylene/polypropylene sheath that
   stops the capsule travelling under the skin.

   Built with CSS 3D transforms rather than WebGL — the scene is five
   planes on a Z axis, which is exactly what transform-style: preserve-3d
   is for, and it costs nothing to load.
   ════════════════════════════════════════════════════════════════════ */

type Layer = {
  id: string;
  name: string;
  detail: string;
  /** Where the part sits inside the assembled capsule, along its long axis. */
  x: number;
  /** Where it travels to when the view opens. A capsule is a cylinder, so an
      exploded view of it separates along that axis, not toward the viewer. */
  out: number;
  /** A little Z separation so the parts do not sit in one flat plane. */
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
      "Copper winding around a ferrite rod. The scanner's field induces current here — there is no battery, and nothing to replace.",
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
  const [active, setActive] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* Opens once, on arrival, rather than tracking scroll continuously.
     Scrubbing it meant the assembly had already scrolled past the top of the
     viewport by the time the callouts beside it were readable — the whole
     point is to see the parts and their labels together. */
  useEffect(() => {
    if (reduced) {
      setProgress(1); // already open, no animation
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setProgress(1);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div className="chip-wrap" ref={ref}>
      <div className="chip-stage" aria-hidden="true">
        <div
          className="chip-scene"
          style={{ transform: `rotateX(${14 - progress * 6}deg) rotateY(${-26 + progress * 10}deg)` }}
        >
          {LAYERS.map((l, i) => {
            const x = l.x + (l.out - l.x) * progress;
            const z = l.z * progress;
            const isOn = active === l.id;
            return (
              <div
                key={l.id}
                className={`chip-layer chip-${l.id} ${isOn ? "on" : ""}`}
                style={{
                  transform: `translate3d(${x}px, 0, ${z}px)`,
                  // The capsule fades as it opens so the parts inside read.
                  opacity: l.id === "glass" ? 1 - progress * 0.3 : 0.45 + progress * 0.55,
                  transitionDelay: `${i * 40}ms`,
                }}
              >
                <span className="chip-layer-art" />
              </div>
            );
          })}
        </div>
        <div className="chip-readout" style={{ opacity: progress }}>
          <span className="sp-mono">What the die holds</span>
          <b>985 112004567890</b>
          <small>
            3-digit country or manufacturer prefix, then 12 digits unique to the
            animal. Assigned once, never reissued.
          </small>
        </div>
      </div>

      {/* Callouts. Hovering one lifts its layer in the stack. */}
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
