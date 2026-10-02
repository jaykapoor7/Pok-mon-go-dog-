"use client";

/* ════════════════════════════════════════════════════════════════════
   A place, living, behind whatever stands in front of it.

   Fetches a city's ground once (shared across every plate and hero that
   asks for the same city), runs the replay only while it is on screen,
   and holds still with the record drawn in full under reduced motion.
   Used behind the app's page plates and the public pages' heroes.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { LiveGround, type GroundData } from "./LiveGround";

const grounds = new Map<string, Promise<GroundData | null>>();
export function loadGround(city: string | null | undefined): Promise<GroundData | null> {
  const key = city?.trim() || "";
  if (!grounds.has(key)) {
    grounds.set(key, fetch(`/api/ground${key ? `?city=${encodeURIComponent(key)}` : ""}`)
      .then((r) => (r.ok ? (r.json() as Promise<GroundData>) : null))
      .catch(() => { grounds.delete(key); return null; }));
  }
  return grounds.get(key)!;
}

export function PlaceGround({ city, caption, className = "", replayMs = 60_000, enabled = true }: {
  /** The busiest mapped city when not given. */
  city?: string | null;
  /** Before the running month; `null` hides the caption. Defaults to "<city> · on the record". */
  caption?: string | null | ((city: string) => string);
  className?: string;
  replayMs?: number;
  enabled?: boolean;
}) {
  const [ground, setGround] = useState<GroundData | null>(null);
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    if (!enabled) { setGround(null); return; }
    let live = true;
    loadGround(city).then((g) => { if (live) setGround(g); });
    return () => { live = false; };
  }, [city, enabled]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(m.matches);
    sync(); m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [el]);

  const label = !ground ? null
    : caption === null ? null
    : typeof caption === "function" ? caption(ground.city)
    : caption ?? `${ground.city} · on the record`;

  return (
    <div ref={setEl} className={`place-ground ${className}`} aria-hidden>
      {ground && <LiveGround data={ground} running={seen} calm={calm} replayMs={replayMs} caption={label} />}
    </div>
  );
}
