"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Condition } from "@/lib/register/taxonomy";

export type DemoView = "queue" | "case" | "history" | "area";
type Demo = {
  sent: boolean; condition: Condition; observation: string; accepted: boolean; assigned: boolean;
};
export const EXAMPLE_OBSERVATION = "A dog is limping near the bus stand. Can someone review this?";
const initial: Demo = { sent: false, condition: "Minor injury", observation: EXAMPLE_OBSERVATION, accepted: false, assigned: false };
type Context = { demo: Demo; change: (patch: Partial<Demo>) => void; reset: () => void };
const DemoContext = createContext<Context | null>(null);

/** Intentionally memory-only. No API, persistence, auth, messages or production IDs. */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState<Demo>(initial);
  return <DemoContext.Provider value={{ demo, change: patch => setDemo(current => ({ ...current, ...patch })), reset: () => setDemo(initial) }}>{children}</DemoContext.Provider>;
}
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("The example workflow needs DemoProvider");
  return value;
}
