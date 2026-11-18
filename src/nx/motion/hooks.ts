"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion, type Transition } from "framer-motion";
import { DUR, EASE, HOLD_RESULT_MS, SPRING, type SpringName } from "./tokens";

/** True when the person asked their system for less motion. Components then show the end state at once. */
export function useCalm(): boolean {
  return useReducedMotion() ?? false;
}

/** A shared spring, or no travel at all under reduced motion. */
export function useSpring(name: SpringName): Transition {
  const calm = useCalm();
  return calm ? { duration: 0 } : SPRING[name];
}

/** A short tween for colour and label changes; instant under reduced motion. */
export function useFade(d: keyof typeof DUR = "state"): Transition {
  const calm = useCalm();
  return calm ? { duration: 0 } : { duration: DUR[d], ease: EASE };
}

export type ResultState = "idle" | "busy" | "done";

/** The life of one action on a button: idle, busy while it runs, done for a moment once it has really succeeded.
    `run` returns what the action returned; a thrown error or `false` goes straight back to idle (the caller says why). */
export function useResult(holdMs = HOLD_RESULT_MS) {
  const [state, setState] = useState<ResultState>("idle");
  const timer = useRef<number | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (timer.current) window.clearTimeout(timer.current); }; }, []);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (timer.current) window.clearTimeout(timer.current);
    setState("busy");
    try {
      const r = await fn();
      if (!alive.current) return r;
      if (r === false) { setState("idle"); return r; }
      setState("done");
      timer.current = window.setTimeout(() => { if (alive.current) setState("idle"); }, holdMs);
      return r;
    } catch (e) { if (alive.current) setState("idle"); throw e; }
  }, [holdMs]);
  const reset = useCallback(() => { if (timer.current) window.clearTimeout(timer.current); setState("idle"); }, []);
  return { state, run, reset };
}

/** Wait, in an async flow, long enough for a result to be seen before the screen moves on. Instant under reduced motion
    would hide the confirmation entirely, so it still waits, just shorter. */
export const settle = (calm: boolean, ms = 650) => new Promise<void>((r) => window.setTimeout(r, calm ? 350 : ms));
