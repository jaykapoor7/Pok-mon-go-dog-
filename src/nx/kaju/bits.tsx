"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check as Tick, Clock3, Hand, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { DECIDER, duty, type Duty } from "@/lib/kaju/capabilities";
import type { StepRow } from "./data";

/* Small pieces every Kaju surface shares, so a state reads the same on the home, in the panel and in Kaju's card. */

export type Tone = "ok" | "warn" | "bad" | "accent" | "plain";
const MISSION_WORD: Record<string, [string, Tone]> = {
  draft: ["Draft", "plain"], ready: ["Starting", "accent"], running: ["Working", "accent"], retrying: ["Trying again", "warn"],
  waiting_person: ["Waiting for you", "warn"], waiting_partner: ["Waiting for a partner", "warn"], blocked: ["Blocked", "bad"],
  completed: ["Completed", "ok"], cancelled: ["Cancelled", "plain"],
};
export const missionWord = (s: string): [string, Tone] => MISSION_WORD[s] ?? [s, "plain"];

const STEP_WORD: Record<string, string> = { todo: "Up next", running: "Working", done: "Done", waiting_approval: "Waiting for your approval", waiting_person: "Waiting for a person", retrying: "Will try again", failed: "Blocked", skipped: "Skipped", cancelled: "Cancelled" };
export const stepWord = (s: StepRow) => (s.state === "waiting_person" && DECIDER[s.tool as keyof typeof DECIDER] ? `Waiting for ${DECIDER[s.tool as keyof typeof DECIDER]!.toLowerCase()}` : STEP_WORD[s.state] ?? s.state);
export const stepTone = (state: string): Tone => (state === "done" ? "ok" : state === "running" ? "accent" : state === "waiting_approval" || state === "waiting_person" || state === "retrying" ? "warn" : state === "failed" ? "bad" : "plain");

/** The live state of Kaju's work as a dot: it breathes while Kaju works, and holds still under reduced motion. */
export function StateDot({ state }: { state: string }) {
  const [, tone] = missionWord(state);
  return <span className={`kj-dot t-${tone} ${state === "running" || state === "ready" ? "is-live" : ""}`} aria-hidden />;
}

/** The glyph at the head of a step: what it is doing now. A finished step's tick arrives with a short spring. */
export function StepGlyph({ state, n }: { state: string; n?: number }) {
  const calm = useReducedMotion();
  if (state === "done") return <motion.span className="kj-glyph is-done" initial={calm ? false : { scale: .5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 520, damping: 30 }}><Tick size={12} strokeWidth={3} /></motion.span>;
  if (state === "running") return <span className="kj-glyph is-run"><Loader2 size={13} className="nx-spin" /></span>;
  if (state === "retrying") return <span className="kj-glyph is-wait"><Clock3 size={12} /></span>;
  if (state === "waiting_approval") return <span className="kj-glyph is-wait"><Hand size={12} /></span>;
  if (state === "waiting_person") return <span className="kj-glyph is-wait"><UserRound size={12} /></span>;
  if (state === "failed") return <span className="kj-glyph is-bad"><AlertTriangle size={12} /></span>;
  return <span className={`kj-glyph ${state === "skipped" || state === "cancelled" ? "is-off" : ""}`}>{n ?? ""}</span>;
}

/** One segment per step, coloured by its state, so progress is visible without reading. */
export function Progress({ steps, label }: { steps: { state: string }[]; label?: string }) {
  const done = steps.filter((s) => s.state === "done").length;
  return (
    <div className="kj-prog" role="img" aria-label={label ?? `${done} of ${steps.length} steps done`}>
      {steps.map((s, i) => <span key={i} className={`kj-seg s-${s.state}`} />)}
    </div>
  );
}

const DUTY_ICON: Record<Duty, React.ReactNode> = { kaju: null, you: <Hand size={12} />, person: <UserRound size={12} />, off: <ShieldCheck size={12} /> };
/** Who is responsible for a step: Kaju, you (an approval), or a named person who decides. */
export function DutyChip({ tool, level, compact }: { tool: string; level: number; compact?: boolean }) {
  const d = duty(tool, level);
  return <span className={`kj-duty d-${d.tone}`} title={d.how}>{d.tone === "kaju" ? <span className="kj-duty-k" aria-hidden>K</span> : DUTY_ICON[d.tone]}<b>{d.who}</b>{compact ? null : <span>{d.how}</span>}</span>;
}

export const clock = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");
export const when = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  const same = d.toDateString() === now.toDateString();
  return same ? clock(iso) : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};
export const ago = (iso: string | null | undefined) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
