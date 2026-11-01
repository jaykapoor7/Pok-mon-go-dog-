"use client";

/* Kaju living in a page: placed at a fixed, pre-chosen anchor (never on top
   of controls), playing a sequence once he scrolls into view and pausing
   when he leaves it. Ambient off or reduced motion: the final pose, still. */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Kaju } from "./Kaju";
import { useKajuAmbient } from "./ambient";
import { useKajuSequence, useReducedMotion } from "./controller";
import { SEQUENCES, type KajuState, type Step } from "./poses";

type Props = {
  sequence?: keyof typeof SEQUENCES | Step[];
  state?: KajuState;
  size?: number;
  flip?: boolean;
  label?: string;
  loop?: boolean;
  /** Trot in from the left edge of the anchor when first seen. */
  enter?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function KajuPresence({ sequence, state, size = 140, flip, label, loop = false, enter = false, className = "", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ambient] = useKajuAmbient();
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { setVisible(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { threshold: 0.35 });
    io.observe(el); return () => io.disconnect();
  }, []);
  const steps: Step[] | undefined = typeof sequence === "string" ? SEQUENCES[sequence] : sequence;
  const still = !ambient || reduced;
  const seqState = useKajuSequence(steps, { loop, run: seen && visible && !still });
  const shown: KajuState = state ?? (steps ? (still ? steps[steps.length - 1].state : seen ? seqState : steps[0].state) : "sitting");
  const entering = enter && seen && !still;
  return (
    <div ref={ref} className={`kaju-presence${entering ? " is-entering" : ""}${enter && !seen && !still ? " is-waiting" : ""} ${className}`} style={style}>
      <Kaju state={shown} size={size} flip={flip} label={label} still={still || !visible} />
    </div>
  );
}

/** An empty state with Kaju resting beside it. */
export function KajuEmptyState({ title, children, action, state = "lying" }: { title: string; children?: ReactNode; action?: ReactNode; state?: KajuState }) {
  return (
    <div className="kaju-empty">
      <KajuPresence state={state} size={132} />
      <div><p className="kaju-empty-h">{title}</p>{children && <div className="kaju-empty-b">{children}</div>}{action && <div className="kaju-empty-a">{action}</div>}</div>
    </div>
  );
}

/** A finding from Kaju: a card he peeks over. Only for real findings. */
export function KajuInsight({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="kaju-insight" role="note" aria-label={`Kaju: ${title}`}>
      <span className="kaju-insight-peek" aria-hidden><Kaju state="peeking" size={84} /></span>
      <p className="kaju-insight-k">Kaju</p>
      <p className="kaju-insight-h">{title}</p>
      {children && <div className="kaju-insight-b">{children}</div>}
      {action && <div className="kaju-insight-a">{action}</div>}
    </div>
  );
}

/** Settings switch: keep Kaju still everywhere on this device. */
export function KajuAmbientToggle() {
  const [on, set] = useKajuAmbient();
  return (
    <label className="kaju-toggle">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span>Let Kaju move around</span>
      <small>Off keeps him still. Your device&rsquo;s reduced-motion setting always keeps him still.</small>
    </label>
  );
}

/** Kaju chilling in a quiet corner: small, idle, never over content.
    Place it inside a positioned parent, in space reserved for him. */
export function KajuCorner({ sequence = "idle", size = 72, flip, className = "", label }: { sequence?: keyof typeof SEQUENCES; size?: number; flip?: boolean; className?: string; label?: string }) {
  return <KajuPresence sequence={sequence} size={size} flip={flip} loop className={`kaju-corner ${className}`} label={label} />;
}
