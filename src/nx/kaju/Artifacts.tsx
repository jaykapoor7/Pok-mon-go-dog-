"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Bell, Check as Tick, Hash, Mail, UserRound } from "lucide-react";
import { shortCode } from "@/lib/caseCode";
import { DECIDER, shortDate } from "@/lib/kaju/capabilities";
import type { StepRow } from "./data";
import { casesOf, type Artifacts, type FoundCase, type OutboxArt, type TaskArt } from "./work";
import { when } from "./bits";

/* The things a mission made, shown as what they are: the cases it found as rows that open the record, the tasks it
   created with their live state, the message it posted as it reads in the channel, and a prepared email with its true
   delivery state. Nothing here is a summary Kaju wrote about itself; every line is read from the record. */

const EASE = [0.2, 0.7, 0.2, 1] as const;
const today = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
function Rise({ i, children, className }: { i: number; children: React.ReactNode; className?: string }) {
  const calm = useReducedMotion();
  return <motion.li className={className} initial={calm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22, ease: EASE, delay: calm ? 0 : Math.min(i, 10) * .045 }}>{children}</motion.li>;
}

export function CaseRows({ cases, label, more = 5 }: { cases: FoundCase[]; label: string; more?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? cases : cases.slice(0, more);
  if (!cases.length) return null;
  return (
    <div className="kj-art">
      <div className="kj-art-h"><span className="kj-art-i"><ArrowUpRight size={12} /></span>{label}</div>
      <ul className="kj-rows">{shown.map((c, i) => (
        <Rise key={c.id} i={i}><Link href={`/ngo/cases/${c.id}`} className="kj-row"><span className="kj-code">{shortCode(c.code, c.id.slice(0, 8).toUpperCase())}</span><span className="kj-row-t">{c.title}</span><span className="kj-row-m">{[c.place, c.due ? `due ${shortDate(c.due)}` : null].filter(Boolean).join(" · ")}</span><ArrowUpRight size={13} className="kj-row-go" /></Link></Rise>
      ))}</ul>
      {cases.length > more ? <button type="button" className="kj-link" onClick={() => setAll((a) => !a)}>{all ? "Show fewer" : `Show all ${cases.length}`}</button> : null}
    </div>
  );
}

export type OnTask = (t: TaskArt, done: boolean) => Promise<boolean>;
export function TaskCards({ tasks: raw, onToggle }: { tasks: TaskArt[]; onToggle?: OnTask }) {
  /* Marking a task done here is the same change as ticking it in Today; it shows at once and is undone if refused. */
  const [over, setOver] = useState<Record<string, string>>({});
  const tasks = raw.map((t) => (over[t.id] ? { ...t, state: over[t.id] } : t));
  if (!tasks.length) return null;
  const toggle = async (t: TaskArt) => { if (!onToggle || t.state === "cancelled") return; const done = t.state !== "done"; setOver((o) => ({ ...o, [t.id]: done ? "done" : "open" })); const ok = await onToggle(t, done); if (!ok) setOver((o) => { const n = { ...o }; delete n[t.id]; return n; }); };
  const done = tasks.filter((t) => t.state === "done").length;
  const t0 = today();
  return (
    <div className="kj-art">
      <div className="kj-art-h"><span className="kj-art-i is-ok"><Tick size={12} strokeWidth={3} /></span>{tasks.length === 1 ? "1 task created" : `${tasks.length} tasks created`}{done ? ` · ${done} done` : ""}<Link href="/ngo/today" className="kj-art-a">Open in Today<ArrowUpRight size={12} /></Link></div>
      <ul className="kj-tasks">{tasks.slice(0, 8).map((t, i) => {
        const late = t.state === "open" && !!t.due_on && t.due_on < t0;
        return (
          <Rise key={t.id} i={i} className={`kj-task ${t.state === "done" ? "is-done" : ""}`}>
            {onToggle && t.state !== "cancelled" ? <button type="button" className="kj-task-hit" role="checkbox" aria-checked={t.state === "done"} aria-label={t.state === "done" ? `Reopen: ${t.title}` : `Mark done: ${t.title}`} onClick={() => void toggle(t)}><span className="kj-task-c">{t.state === "done" ? <Tick size={11} strokeWidth={3} /> : null}</span></button>
              : <span className="kj-task-c" role="img" aria-label={t.state === "done" ? "Done" : t.state === "cancelled" ? "Cancelled" : "Open"}>{t.state === "done" ? <Tick size={11} strokeWidth={3} /> : null}</span>}
            <div><b>{t.title}</b><small>{[t.assignee_name ?? "Not assigned", t.due_on ? `due ${shortDate(t.due_on)}` : null].filter(Boolean).join(" · ")}{late ? <em className="kj-late"> · past due</em> : null}{t.state === "cancelled" ? " · cancelled" : ""}</small></div>
            {t.record_kind === "case" && t.record_id ? <Link className="kj-chiplink" href={`/ngo/cases/${t.record_id}`}>{shortCode(t.record_label, "Case")}<ArrowUpRight size={12} /></Link> : null}
          </Rise>
        );
      })}</ul>
      {tasks.length > 8 ? <p className="kj-quiet">And {tasks.length - 8} more in Today.</p> : null}
    </div>
  );
}

export function MessagePreview({ m }: { m: Artifacts["messages"][number] }) {
  return (
    <div className="kj-art">
      <div className="kj-art-h"><span className="kj-art-i"><Hash size={12} /></span>Posted in #{m.channel ?? "a channel"}{m.channel ? <Link href={`/channels/${m.channel}?m=${m.id}`} className="kj-art-a">Open in the channel<ArrowUpRight size={12} /></Link> : null}</div>
      <div className="kj-msg">
        <span className="kj-msg-av" aria-hidden>K</span>
        <div><p className="kj-msg-h"><b>{m.author_name ?? "Kaju"}</b><time>{when(m.created_at)}</time></p><p className="kj-msg-b">{m.deleted_at ? <i>This message was deleted.</i> : m.body}</p></div>
      </div>
    </div>
  );
}

const DELIVERY: Record<string, [string, "ok" | "warn" | "bad" | "plain"]> = {
  queued: ["Approved. Waiting for the next delivery run", "warn"], not_connected: ["Not sent: no connected account can send it", "bad"],
  sent: ["Sent", "ok"], failed: ["Not sent", "bad"], cancelled: ["Cancelled. It was not sent", "plain"],
};
/** A prepared message to someone outside StrayPaw, with where it really is: waiting for approval, queued, sent or not. */
export function EmailDraft({ to, subject, body, channel, out, waiting, emailLive }: { to: string; subject?: string | null; body: string; channel: string; out?: OutboxArt | null; waiting?: boolean; emailLive?: boolean | null }) {
  const [word, tone] = out ? DELIVERY[out.status] ?? [out.status, "plain"] : waiting ? ["Waiting for your approval. Not queued yet", "warn"] : ["Not queued", "plain"];
  return (
    <div className="kj-art">
      <div className="kj-art-h"><span className="kj-art-i"><Mail size={12} /></span>{channel === "email" ? "Email prepared" : channel === "sms" ? "Text message prepared" : "WhatsApp message prepared"}</div>
      <div className="kj-mail">
        <dl><dt>To</dt><dd>{to}</dd>{subject ? <><dt>Subject</dt><dd>{subject}</dd></> : null}</dl>
        <p className="kj-mail-b">{body}</p>
        <p className={`kj-deliv t-${tone}`}><span className="kj-dot-s" aria-hidden />{word}{out?.last_error && out.status !== "sent" ? `: ${out.last_error}` : ""}</p>
        {channel !== "email" ? <p className="kj-quiet">Missions do not send {channel === "sms" ? "text messages" : "WhatsApp messages"} yet, so this stays here.</p>
          : emailLive === false && out?.status !== "sent" ? <p className="kj-quiet">Email from missions needs the owner&apos;s setup on this deployment. Until then an approved email waits and is marked not connected.</p> : null}
      </div>
    </div>
  );
}

export function Notified({ ids, title, people }: { ids: string[]; title: string; people: Map<string, string> }) {
  if (!ids.length) return null;
  return (
    <div className="kj-art">
      <div className="kj-art-h"><span className="kj-art-i"><Bell size={12} /></span>In-app notification to {ids.length === 1 ? "1 person" : `${ids.length} people`}</div>
      <div className="kj-note"><b>{title}</b><div className="kj-people">{ids.slice(0, 8).map((id) => <span key={id}>{people.get(id) ?? "A member"}</span>)}{ids.length > 8 ? <span>+{ids.length - 8}</span> : null}</div></div>
    </div>
  );
}

/** What one step produced, read from the records, for the step's place in the workroom. */
export function StepArtifacts({ s, steps, art, emailLive, onTask }: { s: StepRow; steps: StepRow[]; art: Artifacts; emailLive?: boolean | null; onTask?: OnTask }) {
  const r = s.result ?? {};
  const tool = s.tool ?? "";
  if (tool === "find_due_followups" || tool === "find_overdue_cases" || tool === "read_cases") {
    if (s.state !== "done") return null;
    const cases = casesOf(s);
    const found = typeof r.found === "number" ? r.found : cases.length;
    const already = typeof r.already_open === "number" ? r.already_open : 0;
    if (!found) return <p className="kj-result">Found no {tool === "find_overdue_cases" ? "overdue cases" : "cases needing a follow-up"}{already ? `; ${already} already ${already === 1 ? "has" : "have"} an open follow-up` : ""}.</p>;
    return <CaseRows cases={cases} label={`Found ${found} ${found === 1 ? "case" : "cases"}${already ? ` · ${already} already had an open follow-up, left alone` : ""}`} />;
  }
  if (tool === "draft_tasks") return s.state === "done" ? <CaseRows cases={casesOf(s)} label="Drafted a follow-up task for each" /> : null;
  if (tool === "create_task") {
    const t = art.tasks.filter((x) => x.id === r.task_id);
    return t.length ? <TaskCards tasks={t} onToggle={onTask} /> : null;
  }
  if (tool === "create_followup_tasks" || tool === "create_tasks") {
    const own = new Set(steps.filter((x) => x.tool === "create_task").map((x) => x.result?.task_id));
    const t = art.tasks.filter((x) => !own.has(x.id) && x.record_kind === "case");
    if (s.state === "done" && !t.length && art.ready) return <p className="kj-result">{typeof r.created === "number" && r.created === 0 ? "Created no tasks: every case already had an open follow-up." : "Created the tasks."}</p>;
    return <TaskCards tasks={t} onToggle={onTask} />;
  }
  if (tool === "post_message") {
    const m = art.messages.find((x) => x.id === r.message_id);
    return m ? <MessagePreview m={m} /> : null;
  }
  if (tool === "notify_members") {
    if (s.state !== "done") return null;
    const ids = Array.isArray(s.input.user_ids) ? s.input.user_ids.map(String) : [];
    return <Notified ids={ids} title={String(s.input.title ?? "")} people={art.people} />;
  }
  if (tool === "send_external") {
    if (s.state === "waiting_approval") return null; // shown in the approval itself
    const out = art.outbox.find((o) => o.step_id === s.id || o.id === r.outbox_id) ?? null;
    if (!out && s.state !== "done") return null;
    return <EmailDraft to={out?.recipient ?? String(s.input.to ?? "")} subject={out?.subject ?? (s.input.subject as string | undefined)} body={out?.body ?? String(s.input.body ?? "")} channel={out?.channel ?? String(s.input.channel ?? "email")} out={out} emailLive={emailLive} />;
  }
  if (DECIDER[tool as keyof typeof DECIDER] && s.state === "done") return <p className="kj-result"><UserRound size={13} />Marked done{s.approved_at ? ` ${when(s.approved_at)}` : ""}{s.note ? `: ${s.note}` : "."}</p>;
  return null;
}
