"use client";

/*
 * The landing's one deliberately cinematic transition. It is intentionally
 * made from the product's own vocabulary (ledger rows, care marks, map cells
 * and record IDs) rather than a decorative particle layer. Scroll only moves
 * a small, fixed set of DOM nodes; no canvas/WebGL scene or live map is
 * created here.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, MapPin } from "lucide-react";

type Report = {
  condition: string;
  locality: string;
  straypawId: string;
} | null;

type Fragment = {
  kind: "tag" | "row" | "note" | "status";
  text: string;
  detail?: string;
  x: number;
  y: number;
  r: number;
  left: string;
  top: string;
  key?: boolean;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => 1 - Math.pow(1 - value, 3);

export function SharedSystem({
  city,
  animals,
  cases,
  cities,
  report,
}: {
  city: string;
  animals: number;
  cases: number;
  cities: number;
  report: Report;
}) {
  const section = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const fragments = useRef<(HTMLDivElement | null)[]>([]);
  const [calm, setCalm] = useState(false);

  const caseLabel = report?.condition ?? "Care request";
  const place = report?.locality ?? city;
  const record = report?.straypawId ?? "SP-D-ONFILE";

  const items = useMemo<Fragment[]>(() => [
    { kind: "tag", text: city, detail: "city coverage", x: -0.38, y: -0.24, r: -7, left: "21%", top: "31%", key: true },
    { kind: "row", text: record, detail: caseLabel, x: 0.33, y: -0.31, r: 5, left: "52%", top: "28%", key: true },
    { kind: "status", text: "Vaccination", detail: "recorded", x: -0.46, y: 0.08, r: 4, left: "23%", top: "51%" },
    { kind: "status", text: "Sterilisation", detail: "field update", x: 0.42, y: 0.02, r: -5, left: "55%", top: "52%", key: true },
    { kind: "row", text: "NGO work queue", detail: `${cases.toLocaleString("en-IN")} cases`, x: -0.28, y: 0.31, r: -4, left: "33%", top: "67%" },
    { kind: "note", text: place, detail: "reported location", x: 0.39, y: 0.28, r: 6, left: "53%", top: "70%", key: true },
    { kind: "tag", text: "Map cell", detail: "coverage", x: -0.12, y: -0.4, r: 8, left: "39%", top: "39%" },
    { kind: "row", text: "Resident sighting", detail: "photo + place", x: 0.48, y: -0.13, r: -8, left: "55%", top: "40%" },
    { kind: "status", text: "Case closed", detail: "outcome logged", x: -0.5, y: -0.18, r: -5, left: "29%", top: "63%" },
  ], [caseLabel, cases, city, place, record]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = section.current;
    const stage = scene.current;
    if (!root || !stage) return;

    let frame = 0;
    let top = 0;
    let range = 1;

    const measure = () => {
      top = root.offsetTop;
      range = Math.max(1, root.offsetHeight - window.innerHeight);
    };

    const paint = (raw: number) => {
      const progress = calm ? 1 : clamp(raw);
      const appeared = ease(clamp(progress / 0.26));
      const resolved = ease(clamp((progress - 0.42) / 0.5));
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      root.style.setProperty("--ds-appear", String(appeared));
      root.style.setProperty("--ds-resolve", String(resolved));
      root.style.setProperty("--ds-map-scale", String(0.9 + resolved * 0.1));
      root.style.setProperty("--ds-problem", String(clamp((0.68 - progress) / 0.2)));
      root.style.setProperty("--ds-answer", String(clamp((progress - 0.69) / 0.16)));
      fragments.current.forEach((node, index) => {
        const item = items[index];
        if (!node || !item) return;
        const scatter = 1 - resolved;
        node.style.transform = `translate3d(${item.x * width * scatter}px, ${item.y * height * scatter}px, 0) rotate(${item.r * scatter}deg)`;
        /* At rest, only the four useful annotations remain. The others are
           evidence of the disconnected state, not permanent UI chrome. */
        node.style.opacity = String(appeared * (item.key ? 1 - resolved * 0.22 : 1 - resolved));
      });
      root.classList.add("is-ready");
    };

    const update = () => {
      frame = 0;
      paint((window.scrollY - top) / range);
    };
    const request = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    measure();
    paint((window.scrollY - top) / range);
    if (!calm) {
      window.addEventListener("scroll", request, { passive: true });
      window.addEventListener("resize", measure);
    }
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", measure);
    };
  }, [calm, items]);

  return (
    <section ref={section} className="ds" data-calm={calm || undefined} aria-labelledby="ds-title">
      <div ref={scene} className="ds-sticky">
        <div className="ds-rail" aria-hidden="true">
          <span>Field notes</span><i /><span>Shared record</span>
        </div>
        <div className="ds-copy">
          <p className="sys-mono">The record, before it connects</p>
          <h2 id="ds-title">
            <span style={{ opacity: "var(--ds-problem)" }}>The problem isn’t missing data. <em>It’s disconnected data.</em></span>
            <span className="ds-answer" style={{ opacity: "var(--ds-answer)" }}>StrayPaw turns it into <em>one shared system.</em></span>
          </h2>
        </div>

        <div className="ds-network" aria-hidden="true">
          <div className="ds-city-label"><MapPin size={12} /><span>{city}</span></div>
          <div className="ds-map">
            <svg viewBox="0 0 360 254" focusable="false">
              <path className="ds-route" d="M44 164 C102 122 114 180 173 139 S246 116 314 69" />
              <path className="ds-route is-faint" d="M62 73 C118 99 142 65 194 94 S265 169 323 151" />
              {[
                "41,80 65,66 89,80 89,108 65,122 41,108",
                "91,80 115,66 139,80 139,108 115,122 91,108",
                "141,80 165,66 189,80 189,108 165,122 141,108",
                "191,80 215,66 239,80 239,108 215,122 191,108",
                "241,80 265,66 289,80 289,108 265,122 241,108",
                "66,123 90,109 114,123 114,151 90,165 66,151",
                "116,123 140,109 164,123 164,151 140,165 116,151",
                "166,123 190,109 214,123 214,151 190,165 166,151",
                "216,123 240,109 264,123 264,151 240,165 216,151",
                "91,166 115,152 139,166 139,194 115,208 91,194",
                "141,166 165,152 189,166 189,194 165,208 141,194",
                "191,166 215,152 239,166 239,194 215,208 191,194",
              ].map((points, index) => <polygon key={points} className={`ds-cell c${index % 5}`} points={points} />)}
              <circle className="ds-core" cx="165" cy="137" r="4" />
              <circle className="ds-ring" cx="165" cy="137" r="12" />
            </svg>
            <span className="ds-map-note"><b>One shared record</b><small>{cities.toLocaleString("en-IN")} cities · live coverage</small></span>
          </div>

          <svg className="ds-links" viewBox="0 0 1000 600" preserveAspectRatio="none">
            <path d="M208 184 C300 214 336 246 460 286" />
            <path d="M690 166 C642 214 630 254 542 286" />
            <path d="M230 402 C320 378 370 354 462 318" />
            <path d="M705 414 C642 380 612 352 546 318" />
          </svg>

          {items.map((item, index) => (
            <div
              key={`${item.kind}-${item.text}`}
              ref={(node) => { fragments.current[index] = node; }}
              className={`ds-fragment is-${item.kind}${item.key ? " is-key" : ""}${index > 4 ? " is-extra" : ""}`}
              style={{ left: item.left, top: item.top }}
            >
              {item.kind === "status" && <i><Check size={11} /></i>}
              <span>{item.text}</span>
              {item.detail && <small>{item.detail}</small>}
            </div>
          ))}
        </div>

        <p className="ds-caption"><b>{animals.toLocaleString("en-IN")} animals</b><span>One record can travel from a sighting to care, coverage and outcome.</span></p>
      </div>
    </section>
  );
}
