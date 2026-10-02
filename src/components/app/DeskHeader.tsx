"use client";

/* ════════════════════════════════════════════════════════════════════
   The plate every in-app page opens on.

   A night band carried over from the Field Workspace on the landing: the
   page's place standing behind it as a living honeycomb (the city's real
   record replayed, the same LiveGround as the landing), and in front the
   page's name, one line on what it is for, its live figures and its one
   or two actions. The figures are the page's own numbers, passed in; a
   figure still loading reads as a dash, never as a zero.

   The ground is fetched once per city and shared across pages; it moves
   only while the plate is on screen, and under reduced motion it holds
   still with the record drawn in full.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { LiveGround, type GroundData } from "@/components/system/LiveGround";

export type DeskFigure = { label: string; value: number | string | null | undefined; tone?: "attention" | "quiet"; href?: string };

const grounds = new Map<string, Promise<GroundData | null>>();
function loadGround(city: string | null | undefined): Promise<GroundData | null> {
  const key = city?.trim() || "";
  if (!grounds.has(key)) {
    grounds.set(key, fetch(`/api/ground${key ? `?city=${encodeURIComponent(key)}` : ""}`)
      .then((r) => (r.ok ? (r.json() as Promise<GroundData>) : null))
      .catch(() => { grounds.delete(key); return null; }));
  }
  return grounds.get(key)!;
}

const fmt = (v: DeskFigure["value"]) => (v === null || v === undefined || v === "" ? "—" : typeof v === "number" ? v.toLocaleString("en-IN") : v);

export function DeskHeader({ kicker, title, lede, figures, actions, city, children }: {
  kicker?: string;
  title: ReactNode;
  lede?: ReactNode;
  figures?: DeskFigure[];
  actions?: ReactNode;
  /** The place behind the plate; the busiest city when not given. */
  city?: string | null;
  /** Anything that belongs in the plate beneath the figures (a place picker, a tab row). */
  children?: ReactNode;
}) {
  const [ground, setGround] = useState<GroundData | null>(null);
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    let live = true;
    loadGround(city).then((g) => { if (live) setGround(g); });
    return () => { live = false; };
  }, [city]);

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

  return (
    <header ref={setEl} className="dh">
      {ground && <LiveGround data={ground} running={seen} calm={calm} replayMs={60_000} caption={`${ground.city} · on the record`} className="dh-ground" />}
      <div className="dh-in">
        <div className="dh-copy">
          {kicker && <p className="dh-kicker sys-mono">{kicker}</p>}
          <h1 className="dh-title">{title}</h1>
          {lede && <p className="dh-lede">{lede}</p>}
        </div>
        {actions && <div className="dh-actions">{actions}</div>}
        {figures && figures.length > 0 && (
          <dl className="dh-figs">
            {figures.map((f) => (
              <div key={f.label} className={f.tone ? `is-${f.tone}` : undefined}>
                <dt>{f.label}</dt>
                <dd>{f.href ? <Link href={f.href}>{fmt(f.value)}<ArrowUpRight size={14} aria-hidden /></Link> : fmt(f.value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {children && <div className="dh-extra">{children}</div>}
      </div>
    </header>
  );
}
