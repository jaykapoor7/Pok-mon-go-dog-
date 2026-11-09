"use client";

/* The record line. One thin thread runs down the homepage and names the
   chapter you are in, the way one record runs through a programme. On a
   wide screen it is a rail at the left edge with a node per chapter; on
   every screen a 2px bar at the top fills as you read. One scroll listener,
   one frame at most; under reduced motion the rail still shows where you
   are but nothing eases. */

import { useEffect, useState } from "react";

const CHAPTERS: [string, string][] = [
  ["hero-title", "One record"],
  ["problem", "The problem"],
  ["workflow", "Five steps"],
  ["package", "Both sides"],
  ["security", "Proof"],
  ["kaju", "Kaju"],
  ["pilot", "Pilot"],
];

export function Spine() {
  const [on, setOn] = useState(0);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const els = CHAPTERS.map(([id]) => { const e = document.getElementById(id); return e?.closest("section") ?? e; });
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
      setP(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      let i = 0;
      els.forEach((e, k) => { if (e && e.getBoundingClientRect().top < vh * 0.45) i = k; });
      setOn(i);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);
  const go = (id: string) => {
    const e = document.getElementById(id); const s = e?.closest("section") ?? e; if (!s) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 72, behavior: smooth ? "smooth" : "auto" });
  };
  return (
    <>
      <div className="s8-bar" aria-hidden><i style={{ transform: `scaleX(${p})` }} /></div>
      <nav className={`s8-spine${on > 0 ? " is-in" : ""}`} aria-label="On this page">
        <span className="s8-spine-fill" aria-hidden style={{ transform: `scaleY(${on / (CHAPTERS.length - 1)})` }} />
        <ol>{CHAPTERS.map(([id, label], i) => (
          <li key={id} className={i === on ? "is-on" : i < on ? "is-done" : undefined}>
            <button type="button" onClick={() => go(id)} aria-current={i === on ? "step" : undefined}><i aria-hidden /><span>{label}</span></button>
          </li>
        ))}</ol>
      </nav>
    </>
  );
}
