"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { DEMO_MODE, DEMO_PREF_KEY } from "@/lib/config";

interface DemoCtx {
  demoOn: boolean;
  toggle: () => void;
}

const Ctx = createContext<DemoCtx>({ demoOn: DEMO_MODE, toggle: () => {} });

/**
 * Single source of truth for Demo Mode across the whole app (map, feed, the
 * top-bar count). Defaults to the NEXT_PUBLIC_DEMO_MODE flag, then honours the
 * user's saved on/off choice. Reactive — toggling updates every consumer.
 */
export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demoOn, setDemoOn] = useState(DEMO_MODE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEMO_PREF_KEY);
      if (saved !== null) setDemoOn(saved === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setDemoOn((on) => {
      const next = !on;
      try {
        localStorage.setItem(DEMO_PREF_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ demoOn, toggle }}>{children}</Ctx.Provider>;
}

export const useDemoMode = () => useContext(Ctx);
