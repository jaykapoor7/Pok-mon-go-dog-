"use client";

/* ════════════════════════════════════════════════════════════════════
   Act II · the stitch. Over the message-to-record story (CareFlow), one
   running stitch is sewn from the newest WhatsApp bubble to the field of
   the record it just filled. It is measured on screen, so it follows the
   layout at any width, and re-sewn at every step.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { useSceneStep } from "@/components/home/Scene";

/* Where each step's thread lands in the workspace. */
const TARGET = [".cf-ticket .cf-t", ".cf-ticket .cf-badge", ".cf-facts div:nth-child(3)", ".cf-facts div:nth-child(4)", ".is-animal .cf-life .is-now", ".is-city .cf-c.is-hot"];

export function Stitch() {
  const step = useSceneStep();
  const svg = useRef<SVGSVGElement>(null);
  const [d, setD] = useState<string | null>(null);
  useEffect(() => {
    const s = svg.current, stage = s?.parentElement; if (!s || !stage) return;
    const measure = () => {
      const box = stage.getBoundingClientRect();
      const from = stage.querySelector(".cf-phone li:last-child") ?? stage.querySelector(".cf-phone");
      const to = stage.querySelector(TARGET[step]);
      if (!from || !to) { setD(null); return; }
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const side = b.left > a.right - 20;
      const x1 = (side ? a.right : a.left + a.width / 2) - box.left, y1 = (side ? a.top + a.height / 2 : a.bottom) - box.top;
      const x2 = (side ? b.left - 6 : b.left + 24) - box.left, y2 = (side ? b.top + b.height / 2 : b.top - 6) - box.top;
      const mx = (x1 + x2) / 2;
      setD(side ? `M${x1},${y1} C${mx},${y1 - 60} ${mx},${y2 + 60} ${x2},${y2}` : `M${x1},${y1} C${x1 + 60},${(y1 + y2) / 2} ${x2 - 60},${(y1 + y2) / 2} ${x2},${y2}`);
    };
    /* The panes turn for 0.7s: measure again once they settle, and whenever the page moves. */
    let raf = 0;
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
    const t = window.setTimeout(measure, 760);
    measure();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener("resize", on); window.removeEventListener("scroll", on); };
  }, [step]);
  return (
    <svg ref={svg} className="kt-sew" aria-hidden>
      {d && (() => {
        const [x, y] = d.split(" ").pop()!.split(",");
        return (
          <g key={step}>
            {/* A solid twin, drawn on, reveals the stitches so they never slide. */}
            <mask id="kt-sew-m" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><path d={d} pathLength={1} className="kt-sew-mask" /></mask>
            <path d={d} className="kt-sew-shadow" mask="url(#kt-sew-m)" />
            <path d={d} className="kt-sew-stitch" mask="url(#kt-sew-m)" />
            <circle r="4.5" cx={x} cy={y} className="kt-sew-knot" />
          </g>
        );
      })()}
    </svg>
  );
}
