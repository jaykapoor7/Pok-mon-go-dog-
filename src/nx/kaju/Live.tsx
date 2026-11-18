"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Hand, UserRound } from "lucide-react";
import { TOOLS, type ToolName } from "@/lib/kaju/registry";
import { DECIDER, duty } from "@/lib/kaju/capabilities";
import { makes } from "@/lib/kaju/records";
import type { StepRow } from "./data";
import type { Artifacts } from "./work";
import { StepGlyph, clock, stepTone, stepWord } from "./bits";
import { StepArtifacts, type OnTask } from "./Artifacts";

/* Two views of a workroom beside its step list.

   The new room: when a mission has just been created, its steps arrive one by one as the room's members, each with who
   does it and what it will make, then the room opens. It is quick (about a second and a half for three steps), can be
   skipped with a press or Escape, and never plays under reduced motion. It shows the plan that was started, nothing more.

   Live: one tile per step, laid out as a grid, each filling in with the step's real output (the cases found, the task,
   the message, the prepared email) when that step finishes. Waiting, working and done come from the step's own state in
   the database; nothing is animated to look busy. */

const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: .8 } as const;
const EASE = [0.2, 0.7, 0.2, 1] as const;
const levelOf = (s: StepRow) => s.level ?? (s.tool && s.tool in TOOLS ? TOOLS[s.tool as ToolName].level : 2);

function Member({ s }: { s: StepRow }) {
  const d = duty(s.tool ?? "", levelOf(s));
  return <span className={`kl-who d-${d.tone}`} aria-hidden>{d.tone === "you" ? <Hand size={14} /> : d.tone === "person" ? <UserRound size={14} /> : "K"}</span>;
}

export function NewRoom({ title, steps, onDone }: { title: string; steps: StepRow[]; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  const skip = useRef<HTMLButtonElement>(null);
  useEffect(() => { skip.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const t = window.setTimeout(() => (shown < steps.length ? setShown(shown + 1) : done.current()), shown === 0 ? 220 : shown < steps.length ? 260 : 900);
    return () => window.clearTimeout(t);
  }, [shown, steps.length]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") done.current(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  return (
    <motion.section className="kl-new" aria-label="New room" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: .16 } }} transition={{ duration: .22, ease: EASE }}>
      <div className="kl-new-h">
        <p className="kj-eyebrow"><span className="kj-tag">New room</span>{steps.length} {steps.length === 1 ? "step" : "steps"}</p>
        <button ref={skip} type="button" className="kj-link" onClick={() => done.current()}>Skip</button>
      </div>
      <p className="kl-new-t">{title}</p>
      <ol className="kl-roster" aria-live="polite">
        {steps.slice(0, shown).map((s) => {
          const d = duty(s.tool ?? "", levelOf(s));
          return (
            <motion.li key={s.id} layout initial={{ opacity: 0, y: 10, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING}>
              <Member s={s} />
              <span className="kl-roster-b"><b>{d.who}</b><span>{s.label}</span></span>
              <span className="kl-makes">{makes(s.tool ?? "", s.input ?? {})}</span>
            </motion.li>
          );
        })}
      </ol>
    </motion.section>
  );
}

const WAIT_WORD = (s: StepRow, steps: StepRow[]) => {
  const before = steps.find((x) => x.position < s.position && !["done", "skipped", "cancelled"].includes(x.state));
  return before ? `Starts after step ${steps.indexOf(before) + 1}` : "Up next";
};

/** One tile per step, filling in with the step's real output when it finishes. */
export function LiveTiles({ steps, art, emailLive, onTask, onReview }: { steps: StepRow[]; art: Artifacts; emailLive: boolean | null; onTask: OnTask; onReview: (s: StepRow) => void }) {
  const calm = useReducedMotion();
  return (
    <ol className="kl-tiles" aria-label="What each step is making">
      {steps.map((s, i) => {
        const d = duty(s.tool ?? "", levelOf(s));
        const tone = stepTone(s.state);
        const asks = s.state === "waiting_approval" || s.state === "waiting_person";
        const out = s.state === "done" ? <StepArtifacts s={s} steps={steps} art={art} emailLive={emailLive} onTask={onTask} /> : null;
        return (
          <li key={s.id} className={`kl-tile s-${s.state}`} aria-label={`Step ${i + 1}: ${s.label}. ${stepWord(s)}`}>
            <div className="kl-tile-h">
              <StepGlyph state={s.state} n={i + 1} />
              <span className={`kl-tile-who d-${d.tone}`}>{d.who}</span>
              <span className={`kj-step-w t-${tone}`}>{s.state === "todo" ? WAIT_WORD(s, steps) : stepWord(s)}{s.state === "done" && s.finished_at ? ` · ${clock(s.finished_at)}` : ""}</span>
            </div>
            <p className="kl-tile-t">{s.label}</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={s.state} className="kl-tile-b" initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={calm ? undefined : { opacity: 0, transition: { duration: .12 } }} transition={{ duration: .24, ease: EASE }}>
                {s.state === "done" ? (out ?? <p className="kl-made">{DECIDER[s.tool as keyof typeof DECIDER] ? `Marked done${s.note ? `: ${s.note}` : "."}` : "Done. Nothing to show for this step."}</p>)
                  : s.state === "running" ? <p className="kl-wait is-live">Working on it now. {makes(s.tool ?? "", s.input ?? {})} appears here when it is done.</p>
                  : s.state === "retrying" ? <p className="kl-wait is-warn">Last try did not work: {s.error}. Kaju tries again on its own.</p>
                  : s.state === "failed" ? <p className="kl-wait is-bad">Stopped: {s.error}. Nothing after it ran.</p>
                  : s.state === "skipped" || s.state === "cancelled" ? <p className="kl-wait">Did not run{s.note ? `: ${s.note}` : "."}</p>
                  : asks ? <div className="kl-ask"><p className="kl-wait is-warn">{s.state === "waiting_approval" ? "Waiting for your approval before it makes anything." : `Waiting for ${(DECIDER[s.tool as keyof typeof DECIDER] ?? "a person").toLowerCase()}. Kaju never makes this decision.`}</p>
                      <button type="button" className="kj-btn is-sm" onClick={() => onReview(s)}>{s.state === "waiting_approval" ? "Review and approve" : "Open the step"}</button></div>
                  : <p className="kl-wait"><span className="kl-will">Will make</span> {makes(s.tool ?? "", s.input ?? {})}</p>}
              </motion.div>
            </AnimatePresence>
          </li>
        );
      })}
    </ol>
  );
}
