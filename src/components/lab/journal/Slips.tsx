"use client";

/* Three report slips, one animal. The slips arrive fanned out, as three
   residents filed them, and are clipped together as they come into view:
   the moment three reports became one record. */

import { useEffect, useRef, useState } from "react";

export function Slips({ slips }: { slips: { title: string; status: string; at: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => setOn(true), 500); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const fan = [[0, 0, -8], [40, 60, 7], [8, 150, -4]];
  const stack = [[2, 6, -2], [6, 82, 1.5], [10, 158, -1]];
  return (
    <div ref={ref} className="fj-slips">
      {slips.map((s, i) => {
        const [x, y, r] = (on ? stack : fan)[i] ?? [0, 0, 0];
        return (
          <div key={i} className="fj-slip" style={{ left: `${x}%`, top: 0, transform: `translateY(${y}px) rotate(${r}deg)`, zIndex: i + 1 }}>
            <b>Report {i + 1} of {slips.length} · {s.at}</b>
            {s.title}<br /><span>case {s.status === "in_progress" ? "in progress" : "unverified"}</span>
          </div>
        );
      })}
      <svg className="fj-clip" viewBox="0 0 28 78" aria-hidden style={{ opacity: on ? 1 : 0, transition: "opacity .3s .6s", left: "12%" }}>
        <path d="M8 60 V12 a6 6 0 0 1 12 0 V66 a9 9 0 0 1 -18 0 V20" fill="none" stroke="#7d8594" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <p className="hand" style={{ position: "absolute", right: 0, bottom: 0, fontSize: 24, transform: "rotate(-4deg)", opacity: on ? 1 : 0, transition: "opacity .4s .9s" }}>three reports — one dog</p>
    </div>
  );
}
