"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2, X } from "lucide-react";
import type { Intent } from "@/lib/kaju/registry";
import { JOBS, intentWords, type JobId } from "@/lib/kaju/capabilities";
import type { Vocab } from "./intent";

/* Kaju's ready-made jobs: the plans it can make by fixed rules, with or without a model. Each opens as one sentence
   with blanks to fill from names the person can already see, and becomes a plan to review. Nothing starts here. */

const EASE = [0.2, 0.7, 0.2, 1] as const;
const WHEN: [string, string][] = [["any", "any date"], ["today", "today"], ["tomorrow", "tomorrow"], ["this week", "this week"], ["next week", "next week"]];

export function Jobs({ vocab, onPlan, canPlan, busy, compact, intro }: { vocab: Vocab; onPlan: (text: string, intent: Intent) => void; canPlan: boolean; busy?: boolean; compact?: boolean; intro?: string }) {
  const [open, setOpen] = useState<JobId | null>(null);
  const calm = useReducedMotion();
  return (
    <div className={`kj-jobs ${compact ? "is-compact" : ""}`}>
      {intro ? <p className="kj-jobs-h">{intro}</p> : null}
      <div className="kj-jobs-row" role="group" aria-label="Kaju's jobs">
        {JOBS.map((j) => <button key={j.id} type="button" className={`kj-job ${open === j.id ? "is-on" : ""}`} aria-expanded={open === j.id} title={j.line} onClick={() => setOpen(open === j.id ? null : j.id)}>{j.name}</button>)}
      </div>
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div key={open} className="kj-jobform" initial={calm ? { opacity: 0 } : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2, ease: EASE }}>
            <JobForm id={open} vocab={vocab} canPlan={canPlan} busy={busy} onClose={() => setOpen(null)} onPlan={(i) => { onPlan(intentWords(i), i); setOpen(null); }} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function JobForm({ id, vocab, canPlan, busy, onPlan, onClose }: { id: JobId; vocab: Vocab; canPlan: boolean; busy?: boolean; onPlan: (i: Intent) => void; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>({ when: "this week" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const job = JOBS.find((j) => j.id === id)!;
  const sel = (k: string, label: string, opts: [string, string][], none?: string) => (
    <select className="kj-blank" aria-label={label} value={v[k] ?? ""} onChange={set(k)}>{none !== undefined ? <option value="">{none}</option> : null}{opts.map(([val, l]) => <option key={val} value={val}>{l}</option>)}</select>
  );
  const channels = vocab.channels.map((c) => [c, `#${c}`] as [string, string]);
  const person = vocab.people.find((p) => p.id === v.person);
  let sentence: React.ReactNode, intent: Intent | null = null;
  switch (id) {
    case "prepare_followups":
      sentence = <>Prepare follow-ups for open cases in {sel("place", "Place", vocab.places.map((p) => [p, p]), "every place")} due {sel("when", "Due", WHEN)}{vocab.teams.length ? <>, for {sel("team", "For", vocab.teams.map((t) => [t, t]), "no one in particular")}</> : null}, and tell {sel("channel", "Channel", channels, "no channel")}</>;
      intent = { action: "prepare_followups", place: v.place || null, when: (v.when as Intent["when"]) || null, team: v.team || null, channel: v.channel || null };
      break;
    case "find_overdue":
      sentence = <>List open cases past their due date, and tell {sel("channel", "Channel", channels, "no channel")}</>;
      intent = { action: "find_overdue", channel: v.channel || null };
      break;
    case "create_task":
      sentence = <>Create the task <input className="kj-blank is-text" aria-label="Task" placeholder="what needs doing" value={v.title ?? ""} maxLength={240} onChange={set("title")} /> for {sel("person", "For", vocab.people.map((p) => [p.id, p.name]), "no one yet")}, due <input className="kj-blank" type="date" aria-label="Due" value={v.due ?? ""} onChange={set("due")} /></>;
      intent = v.title?.trim() ? { action: "create_task", title: v.title.trim(), assignee_id: person?.id ?? null, assignee_name: person?.name ?? null, due_on: v.due || null } : null;
      break;
    case "message_channel":
      sentence = <>Post in {sel("channel", "Channel", channels, "choose a channel")}: <textarea className="kj-blank is-long" aria-label="Words" placeholder="the words to post" rows={2} value={v.body ?? ""} maxLength={4000} onChange={set("body")} /></>;
      intent = v.channel && v.body?.trim() ? { action: "message_channel", channel: v.channel, body: v.body.trim() } : null;
      break;
    case "email":
      sentence = <>Email <input className="kj-blank is-text" type="email" aria-label="To" placeholder="name@example.org" value={v.to ?? ""} maxLength={200} onChange={set("to")} /> about <input className="kj-blank is-text" aria-label="Subject" placeholder="the subject" value={v.subject ?? ""} maxLength={200} onChange={set("subject")} />: <textarea className="kj-blank is-long" aria-label="Words" placeholder="what the email should say" rows={2} value={v.body ?? ""} maxLength={4000} onChange={set("body")} /></>;
      intent = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.to ?? "") && v.body?.trim() ? { action: "email", to: v.to!.trim(), title: v.subject?.trim() || null, body: v.body.trim() } : null;
      break;
  }
  return (
    <form className="kj-jobform-in" onSubmit={(e) => { e.preventDefault(); if (intent && canPlan && !busy) onPlan(intent); }}>
      <div className="kj-jobform-h"><div><b>{job.name}</b><span>{job.line}</span></div><button type="button" className="kj-ib" aria-label="Close" onClick={onClose}><X size={14} /></button></div>
      <p className="kj-sentence">{sentence}</p>
      <div className="kj-jobform-f">
        {canPlan ? <button type="submit" className="kj-btn" disabled={!intent || busy}>{busy ? <Loader2 size={14} className="nx-spin" /> : null}Make the plan<ArrowRight size={14} /></button>
          : <Link className="kj-btn" href="/try" title="Opens the live demo, where Kaju can plan and run this">Try it in the live demo<ArrowRight size={14} /></Link>}
        <span className="kj-quiet">{canPlan ? "You see every step before anything starts." : "Sign in to an organisation to hand Kaju work."}</span>
      </div>
    </form>
  );
}
