"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HOLD_MS } from "./tokens";

/** Hold to remove, for small things a person made themselves and can lose without harm (a task they added, their own
    message). Pressing fills the button; letting go early cancels and the fill runs back. The keyboard gets the same
    safety without holding: Enter or Space once arms it ("Press again to delete"), a second press within three seconds
    removes. Anything consequential (cases, records with history) keeps the Confirm dialog instead.
    The fill is the progress of the hold itself, so it is shown under reduced motion too. */
export function HoldButton({ onHold, label, armed: armedText = "Press again to delete", hint = "Hold to delete, or press Enter twice", className, children, ms = HOLD_MS, disabled, role }: {
  onHold: () => void; label: string; armed?: string; hint?: string; className?: string; children: ReactNode; ms?: number; disabled?: boolean; role?: string;
}) {
  const fill = useRef<HTMLSpanElement>(null);
  const raf = useRef(0), start = useRef(0), armTimer = useRef(0);
  const [holding, setHolding] = useState(false);
  const [armed, setArmed] = useState(false);
  const [say, setSay] = useState("");
  const [nudge, setNudge] = useState(false);
  const nudgeTimer = useRef(0);
  const hid = useId();
  const paint = (p: number) => { if (fill.current) fill.current.style.transform = `scaleX(${p})`; };
  const stop = useCallback((done: boolean) => {
    cancelAnimationFrame(raf.current); setHolding(false);
    if (!done && fill.current) { fill.current.style.transition = "transform .2s cubic-bezier(.23,1,.32,1)"; paint(0); }
  }, []);
  /* A tap that lets go early says what the button wants, beside it, for a moment. */
  const release = () => {
    if (!holding) return;
    stop(false); setNudge(true); window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => setNudge(false), 1400);
  };
  useEffect(() => () => { cancelAnimationFrame(raf.current); window.clearTimeout(armTimer.current); window.clearTimeout(nudgeTimer.current); }, []);
  const begin = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    if (fill.current) fill.current.style.transition = "none";
    start.current = performance.now(); setHolding(true); setNudge(false);
    const tick = (t: number) => {
      const p = Math.min(1, (t - start.current) / ms); paint(p);
      if (p >= 1) { stop(true); setSay("Deleted"); onHold(); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault(); if (e.repeat || disabled) return;
    window.clearTimeout(armTimer.current);
    if (armed) { setArmed(false); setSay("Deleted"); paint(1); onHold(); return; }
    setArmed(true); setSay(armedText); paint(0.5);
    armTimer.current = window.setTimeout(() => { setArmed(false); setSay(""); paint(0); }, 3000);
  };
  return (
    <>
      <button type="button" role={role} className={`mo-hold ${className ?? ""}`} data-holding={holding || undefined} data-armed={armed || undefined} data-nudge={nudge ? hint.split(",")[0] : undefined} disabled={disabled}
        aria-label={armed ? `${armedText}: ${label}` : label} aria-describedby={hid}
        onPointerDown={begin} onPointerUp={release} onPointerCancel={() => stop(false)}
        onKeyDown={key} onBlur={() => { if (armed) { setArmed(false); paint(0); } }} onContextMenu={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
        <span ref={fill} className="mo-hold-f" aria-hidden />
        <span className="mo-hold-c">{children}</span>
      </button>
      <span id={hid} className="mo-sr">{hint}</span>
      <span className="mo-sr" role="status">{say}</span>
    </>
  );
}
