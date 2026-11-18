"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, CalendarClock, Hand, Loader2, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import { TOOLS, preview, validatePlan, type PlanStep, type ToolName } from "@/lib/kaju/registry";
import { ADDABLE, DECIDER, FIELDS, cleanInput, effect } from "@/lib/kaju/capabilities";
import { KIND_WORD, type RecordLink } from "@/lib/kaju/records";
import { DutyChip } from "./bits";
import { StepFields } from "./StepFields";
import type { Vocab } from "./intent";
import type { Planned } from "./state";

/* A plan, before anything starts. Every step says who is responsible (Kaju, you, or the person with the authority),
   what it will change, and what it builds on. The person can rename it, change a step's words, remove or add steps and
   say when it should be finished; Start sends exactly what is shown, and the server checks it again. */

const EASE = [0.2, 0.7, 0.2, 1] as const;
/** The checker's reason, in the words a person would use. */
const plain = (e: string) => e
  .replace(/Too small: expected string to have >=\d+ characters?/i, "some words are still empty")
  .replace(/Too small: expected array to have >=\d+ items?/i, "choose at least one person")
  .replace(/Invalid input: expected \w+, received undefined/i, "a detail is still empty")
  .replace(/Invalid (input|string)[^.]*/i, "a detail is not in the right form");
const autoLabel = (tool: ToolName, input: Record<string, unknown>, fallback: string) => {
  const s = (k: string) => (typeof input[k] === "string" ? (input[k] as string).trim() : "");
  if (tool === "create_task") return s("title") ? `Create the task “${s("title").slice(0, 60)}”` : fallback;
  if (tool === "post_message") return s("channel") ? `Tell #${s("channel")}` : fallback;
  if (tool === "notify_members") { const n = Array.isArray(input.user_ids) ? input.user_ids.length : 0; return n ? `Notify ${n} ${n === 1 ? "person" : "people"}` : fallback; }
  if (tool === "send_external") return s("to") ? `Email ${s("to")}` : fallback;
  return fallback;
};

export function PlanCard({ planned, onStart, onDiscard, busy, vocab, compact }: { planned: Planned; onStart: (p: Planned) => void; onDiscard: () => void; busy?: boolean; vocab: Vocab; compact?: boolean }) {
  const calm = useReducedMotion();
  const [title, setTitle] = useState(planned.plan.title);
  const [steps, setSteps] = useState<(PlanStep & { key: string; auto?: boolean })[]>(() => planned.plan.steps.map((s, i) => ({ ...s, key: `s${i}` })));
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deadline, setDeadline] = useState(planned.deadline ?? "");
  /* The record the mission is about, if it came from one. The person can drop the link; it is only a label. */
  const [record, setRecord] = useState<RecordLink | null>(planned.record ?? null);
  const seq = useRef(planned.plan.steps.length);
  const card = useRef<HTMLElement>(null);
  useEffect(() => { card.current?.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" }); }, [calm]);

  const names = useMemo(() => { const m = new Map(vocab.people.map((p) => [p.id, p.name])); return (id: string) => m.get(id) ?? null; }, [vocab.people]);
  const plan = useMemo(() => ({ title: title.trim(), steps: steps.map(({ label, tool, input }) => ({ label, tool, input: cleanInput(input) })) }), [title, steps]);
  const view = useMemo(() => preview(plan, planned.levels), [plan, planned.levels]);
  const check = useMemo(() => validatePlan(plan), [plan]);
  const off = view.some((s) => s.level >= 9);
  const counts = { kaju: view.filter((s) => s.level < 3).length, you: view.filter((s) => s.level === 3).length, people: view.filter((s) => s.level === 4).length };
  const usedBy = (i: number) => steps.findIndex((s, j) => j > i && s.tool === "create_followup_tasks" && Number(s.input.from_step) === i + 1);

  const remove = (i: number) => {
    setSteps((cur) => cur.filter((_, j) => j !== i).map((s) => s.tool === "create_followup_tasks" && Number(s.input.from_step) > i + 1 ? { ...s, input: { ...s.input, from_step: Number(s.input.from_step) - 1 } } : s));
    setEditing(null);
  };
  const add = (tool: ToolName, input: Record<string, unknown>) => {
    const key = `s${seq.current++}`;
    const label = TOOLS[tool].label;
    setSteps((cur) => [...cur, { key, tool, input: { ...input }, label, auto: !DECIDER[tool] }]);
    setAdding(false);
    if (FIELDS[tool]?.length) setEditing(key);
  };
  const change = (key: string, input: Record<string, unknown>) => setSteps((cur) => cur.map((s) => (s.key === key ? { ...s, input, label: s.auto ? autoLabel(s.tool, input, TOOLS[s.tool].label) : s.label } : s)));
  const start = () => { if (!check.ok || off || busy) return; onStart({ ...planned, plan: check.plan, steps: preview(check.plan, planned.levels), deadline: deadline || null, record }); };

  const tomorrow = new Date(Date.now() + 5.5 * 36e5 + 864e5).toISOString().slice(0, 10);
  return (
    <motion.section ref={card} className={`kj-plan ${compact ? "is-compact" : ""}`} aria-label="Plan to review" initial={calm ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .24, ease: EASE }}>
      <header className="kj-plan-h">
        <p className="kj-eyebrow"><span className="kj-tag">Plan</span>Not started · {planned.planner === "model" ? "planned with a model" : "planned by fixed rules"}</p>
        <input className="kj-plan-title" value={title} maxLength={240} onChange={(e) => setTitle(e.target.value)} aria-label="Mission title" />
        {planned.text && planned.text.trim() !== title.trim() && !planned.record ? <p className="kj-plan-ask">You asked: “{planned.text}”</p> : null}
        {record ? <p className="kj-plan-about"><span>About</span><span className="kr-chip is-static"><span className="kr-chip-k">{KIND_WORD[record.kind]}</span><span className="kr-chip-l">{record.label}</span></span><button type="button" className="kj-ib" aria-label={`Do not link this mission to ${record.label}`} title="Do not link it to this record" onClick={() => setRecord(null)}><X size={14} /></button></p>
          : planned.record ? <p className="kj-plan-about"><span>Not linked to a record.</span><button type="button" className="kj-link" onClick={() => setRecord(planned.record ?? null)}>Link to {planned.record.label}</button></p> : null}
        <div className="kj-who" aria-label="Who does what">
          <span className="d-kaju"><span className="kj-duty-k" aria-hidden>K</span><b>{counts.kaju}</b> {counts.kaju === 1 ? "step" : "steps"} Kaju runs</span>
          <span className={counts.you ? "d-you" : "is-none"}><Hand size={12} /><b>{counts.you}</b> {counts.you === 1 ? "approval" : "approvals"} by you</span>
          <span className={counts.people ? "d-person" : "is-none"}><UserRound size={12} /><b>{counts.people}</b> {counts.people === 1 ? "decision" : "decisions"} by a person</span>
        </div>
      </header>

      <ol className="kj-plan-steps">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => {
            const v = view[i]; const dep = s.tool === "create_followup_tasks" ? Number(s.input.from_step) || 1 : null; const blocker = usedBy(i);
            const open = editing === s.key;
            return (
              <motion.li key={s.key} layout={calm ? false : "position"} className={`kj-pstep ${v.level >= 9 ? "is-off" : v.level === 4 ? "is-person" : v.level === 3 ? "is-you" : ""}`}
                initial={calm ? { opacity: 0 } : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { duration: .22, ease: EASE, delay: calm ? 0 : Math.min(i, 8) * .045 } }} exit={{ opacity: 0, transition: { duration: .16 } }}>
                <span className="kj-pstep-n" aria-hidden>{i + 1}</span>
                <div className="kj-pstep-b">
                  <div className="kj-pstep-t"><b>{s.label}</b><DutyChip tool={s.tool} level={v.level} compact={compact} /></div>
                  <p className="kj-pstep-e">{effect(s.tool, cleanInput(s.input), names)}</p>
                  {dep ? <p className="kj-dep"><ArrowDownRight size={12} />Uses the list from step {dep}</p> : null}
                  {v.level >= 9 ? <p className="kj-warn-l">Your organisation has switched this tool off, so the mission cannot start with it. Remove the step or ask a lead.</p> : null}
                  <AnimatePresence initial={false}>{open ? (
                    <motion.div className="kj-pstep-edit" initial={calm ? { opacity: 0 } : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={calm ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={{ duration: .22, ease: EASE }}>
                      <StepFields tool={s.tool} value={s.input} vocab={vocab} idBase={`kp-${s.key}`} onChange={(input) => change(s.key, input)} />
                      <button type="button" className="kj-btn is-quiet is-sm" onClick={() => setEditing(null)}>Done</button>
                    </motion.div>) : null}</AnimatePresence>
                </div>
                <div className="kj-pstep-a">
                  {FIELDS[s.tool]?.length ? <button type="button" className="kj-ib" aria-label={`Change step ${i + 1}`} aria-expanded={open} onClick={() => setEditing(open ? null : s.key)}><Pencil size={14} /></button> : null}
                  <button type="button" className="kj-ib" aria-label={`Remove step ${i + 1}`} disabled={steps.length < 2 || blocker >= 0} title={blocker >= 0 ? `Step ${blocker + 1} uses this step's list` : steps.length < 2 ? "A mission needs at least one step" : undefined} onClick={() => remove(i)}><Trash2 size={14} /></button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      <div className="kj-plan-add">
        {adding ? (
          <div className="kj-addmenu" role="group" aria-label="Add a step">
            {ADDABLE.map((a) => <button key={a.tool} type="button" onClick={() => add(a.tool, a.input)}>{a.name}<small>{DECIDER[a.tool] ? "A person decides" : TOOLS[a.tool].level >= 3 ? "Asks you first" : "Runs on its own"}</small></button>)}
            <button type="button" className="kj-ib" aria-label="Close" onClick={() => setAdding(false)}><X size={14} /></button>
          </div>
        ) : steps.length < 20 ? <button type="button" className="kj-link" onClick={() => setAdding(true)}><Plus size={14} />Add a step</button> : null}
      </div>

      <footer className="kj-plan-f">
        <label className="kj-when"><CalendarClock size={14} /><span>Finish by</span><input type="date" min={tomorrow} value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label="Finish by (optional)" /></label>
        <p className="kj-plan-note">{off ? "A step uses a tool your organisation has switched off." : counts.you + counts.people ? `It stops ${counts.you + counts.people === 1 ? "once" : counts.you + counts.people === 2 ? "twice" : `${counts.you + counts.people} times`} for a person. ` : ""}Runs as you, with your permissions, and keeps going if you close this page.{deadline ? " You are told if it is not finished by then." : ""}</p>
        {!check.ok ? <p className="kj-err" role="alert">{plain(check.error)}</p> : null}
        <div className="kj-plan-go">
          <button type="button" className="kj-btn" disabled={busy || off || !check.ok} onClick={start}>{busy ? <Loader2 size={14} className="nx-spin" /> : null}Start mission</button>
          <button type="button" className="kj-btn is-quiet" onClick={onDiscard}>Discard</button>
        </div>
      </footer>
    </motion.section>
  );
}
