"use client";

/* Kaju's state machine. A sequence is a list of states with hold times;
   the controller steps through it (looping or holding the last state).
   Every step change is a pose change, so the rig transitions between them.
   Reduced motion: jump straight to the final state and hold it. */

import { useEffect, useRef, useState } from "react";
import type { KajuState, Step } from "./poses";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    on(); m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function useKajuSequence(steps: Step[] | undefined, { loop = false, run = true }: { loop?: boolean; run?: boolean } = {}): KajuState {
  const reduced = useReducedMotion();
  const list = steps?.length ? steps : [{ state: "sitting" as KajuState, ms: 0 }];
  const [i, setI] = useState(0);
  const key = list.map((s) => `${s.state}:${s.ms}`).join("|");
  const keyRef = useRef(key);
  if (keyRef.current !== key) { keyRef.current = key; }
  useEffect(() => { setI(reduced ? list.length - 1 : 0); }, [key, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!run || reduced) return;
    const step = list[i];
    if (!step || (step.ms === 0 && !loop) || (i === list.length - 1 && !loop)) return;
    const t = window.setTimeout(() => setI((n) => (n + 1 >= list.length ? (loop ? 0 : n) : n + 1)), step.ms || 2400);
    return () => window.clearTimeout(t);
  }, [i, run, reduced, loop, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return list[Math.min(i, list.length - 1)].state;
}
