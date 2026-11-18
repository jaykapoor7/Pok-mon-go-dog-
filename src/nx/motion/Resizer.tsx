"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useCalm } from "./hooks";
import { SPRING } from "./tokens";

/** A panel's width, remembered per list on this device (never sent anywhere). */
export function usePanelWidth(key: string, def = 520, min = 360) {
  const store = `nx.panel:${key}`;
  const [w, setW] = useState(def);
  useEffect(() => {
    try { const v = Number(localStorage.getItem(store)); if (Number.isFinite(v) && v >= min) setW(v); } catch { /* the default stands */ }
  }, [store, min]);
  const commit = useCallback((v: number) => { setW(v); try { localStorage.setItem(store, String(Math.round(v))); } catch { /* not remembered */ } }, [store]);
  return { width: w, setWidth: setW, commit, def, min };
}

const room = () => (typeof window === "undefined" ? 960 : Math.max(420, Math.min(1040, window.innerWidth - 240)));

/** The divider on a panel's inner edge. Drag it, or focus it and use the arrow keys (Shift for bigger steps, Home and
    End for the limits, Enter for the usual width). Pulled past a limit it gives a little and springs back; it snaps to
    the usual width when it passes close by. The line bows with the drag's speed, then settles. */
export function Resizer({ panel, label = "Resize the preview" }: { panel: ReturnType<typeof usePanelWidth>; label?: string }) {
  const { width, setWidth, commit, def, min } = panel;
  const calm = useCalm();
  const bend = useMotionValue(0);
  const d = useTransform(bend, (b) => `M8 0 Q ${8 + b} 50 8 100`);
  const drag = useRef<{ x: number; w: number; lx: number; id: number } | null>(null);
  const [active, setActive] = useState(false);
  const [snap, setSnap] = useState(false);
  const live = useRef(width); live.current = width;
  useEffect(() => { const on = () => { if (live.current > room()) setWidth(room()); }; window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, [setWidth]);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: live.current, lx: e.clientX, id: e.pointerId }; setActive(true);
    document.documentElement.classList.add("mo-resizing");
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = drag.current; if (!g) return;
    const raw = g.w + (g.x - e.clientX), max = room();
    let next = Math.min(max, Math.max(min, raw));
    const over = raw > max ? raw - max : raw < min ? raw - min : 0;
    const near = Math.abs(raw - def) < 12 && !over;
    if (near) next = def;
    setSnap(near);
    setWidth(next);
    if (!calm) bend.set(Math.max(-14, Math.min(14, (e.clientX - g.lx) * 0.9 - over * 0.12)));
    g.lx = e.clientX;
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null; setActive(false); setSnap(false);
    document.documentElement.classList.remove("mo-resizing");
    commit(live.current);
    if (calm) bend.set(0); else animate(bend, 0, SPRING.release);
  };
  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 64 : 16, max = room();
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = live.current + step;
    else if (e.key === "ArrowRight") next = live.current - step;
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    else if (e.key === "Enter") next = def;
    if (next === null) return;
    e.preventDefault(); e.stopPropagation();
    commit(Math.min(max, Math.max(min, next)));
  };
  return (
    <div role="separator" aria-orientation="vertical" aria-label={label} aria-valuenow={Math.round(width)} aria-valuemin={min} aria-valuemax={Math.round(room())} tabIndex={0}
      className="mo-split" data-active={active || undefined} data-snap={snap || undefined}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} onDoubleClick={() => commit(def)}>
      <svg viewBox="0 0 16 100" preserveAspectRatio="none" aria-hidden><motion.path d={d} vectorEffect="non-scaling-stroke" /></svg>
      <i aria-hidden />
    </div>
  );
}
