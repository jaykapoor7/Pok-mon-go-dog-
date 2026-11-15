"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check as Tick, Clock3, Hand, Loader2, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import type { Proposal } from "@/sp3/ai/types";
import { appHref, useKaju, type Planned, type Turn } from "./state";

/* Kaju's answers as objects, not walls of text: the answer first, the records it read as links, anything it prepared as
   a card with Confirm, and a plan as steps that say how each one runs. */

const PROPOSAL_WORD: Record<Proposal["kind"], string> = { open_case: "Open a case", add_note: "Add a note", schedule_followup: "Schedule a follow-up", record_care: "Record care", email: "Email", calendar_event: "Calendar event", chat_post: "Post in a connected chat", sms: "Text message", report_file: "Report file" };
function proposalLine(p: Proposal) {
  switch (p.kind) {
    case "open_case": return `${p.title} · ${p.category}, ${p.severity}${p.zone ? ` · ${p.zone}` : ""}`;
    case "add_note": return `${p.caseLabel}: ${p.note}`;
    case "schedule_followup": return `${p.caseLabel} on ${new Date(p.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}${p.note ? `: ${p.note}` : ""}`;
    case "record_care": return `${p.dogLabel}: ${p.careKind}${p.date ? ` on ${p.date}` : ""}`;
    case "email": return `To ${p.to.join(", ")} · ${p.subject}`;
    case "calendar_event": return `${p.title} · ${new Date(p.start).toLocaleString("en-IN")}`;
    case "chat_post": return `#${p.channelName}: ${p.text}`;
    case "sms": return `To ${p.to.length} ${p.to.length === 1 ? "person" : "people"}`;
    case "report_file": return `${p.title} (${p.format.toUpperCase()})`;
  }
}

function ProposalCard({ turn, p }: { turn: Turn; p: Proposal }) {
  const { confirm } = useKaju();
  const [busy, setBusy] = useState(false);
  const saved = turn.saved?.[p.id];
  return (
    <div className="nx-kprop">
      <div className="nx-kprop-h"><b>{PROPOSAL_WORD[p.kind]}</b><span className="nx-t3">Prepared, not saved</span></div>
      <p>{proposalLine(p)}</p>
      {p.why ? <p className="nx-t3">{p.why}</p> : null}
      <div className="nx-kprop-f">
        {saved?.ok ? <span className="nx-kok"><Tick size={12} strokeWidth={3} />{saved.what ?? "Saved"}{saved.href ? <> · <Link href={appHref(saved.href)}>Open</Link></> : null}</span>
          : <><button type="button" className="nx-btn is-sm" disabled={busy} onClick={async () => { setBusy(true); await confirm(turn.id, p); setBusy(false); }}>{busy ? <Loader2 size={12} className="nx-spin" /> : null}Confirm</button><span className="nx-t3">Saved under your name, with Kaju&apos;s help noted.</span></>}
        {saved && !saved.ok ? <span role="alert" className="nx-kerr">{saved.error}</span> : null}
      </div>
    </div>
  );
}

export function Thread({ compact }: { compact?: boolean }) {
  const { turns, ask } = useKaju();
  const calm = useReducedMotion();
  const shown = compact ? turns.slice(-4) : turns;
  if (!turns.length) return null;
  return (
    <ol className={`nx-kthread ${compact ? "is-compact" : ""}`} aria-label="Conversation with Kaju">
      {shown.map((t) => (
        <motion.li key={t.id} className={`nx-kturn is-${t.role}`} initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .16 }}>
          {t.role === "user" ? <p className="nx-kq">{t.text}</p> : (
            <div className="nx-ka">
              <span className="nx-ka-i"><Sparkles size={13} /></span>
              <div>
                {t.pending ? <p className="nx-t3" role="status"><Loader2 size={12} className="nx-spin" /> {t.progress?.length ? t.progress[t.progress.length - 1] : "Reading what you can see…"}</p> : null}
                {t.error ? <p className="nx-kerr" role="alert">{t.error}</p> : null}
                {t.reply ? <>
                  <p className="nx-ka-t">{t.reply.text}</p>
                  {t.reply.citations?.length ? <div className="nx-kcite" aria-label="Records Kaju read">{t.reply.citations.slice(0, compact ? 4 : 12).map((c) => <Link key={c.id + c.href} href={appHref(c.href)} className="nx-reclink"><ArrowUpRight size={12} />{c.label}</Link>)}</div> : null}
                  {t.reply.proposals?.map((p) => <ProposalCard key={p.id} turn={t} p={p} />)}
                  {t.reply.navigate ? <p><Link className="nx-btn is-quiet is-sm" href={appHref(t.reply.navigate.href)}>{t.reply.navigate.label}<ArrowUpRight size={12} /></Link></p> : null}
                  {!compact && t.reply.tools?.length ? <details className="nx-ktools"><summary>What Kaju checked ({t.reply.tools.length})</summary><ul>{t.reply.tools.map((x, i) => <li key={i} className={x.ok ? "" : "is-bad"}>{x.summary}</li>)}</ul></details> : null}
                  {t.reply.suggestions?.length ? <div className="nx-ksugg">{t.reply.suggestions.slice(0, 3).map((s) => <button key={s} type="button" onClick={() => void ask(s)}>{s}</button>)}</div> : null}
                  <p className="nx-kmeta">{t.reply.engine === "model" ? "Answered with a model, from records you can see" : "Answered by fixed rules from records you can see. Free-form answers need a connected model."}{t.reply.notice ? ` · ${t.reply.notice}` : ""}</p>
                </> : null}
              </div>
            </div>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

const ICON = (level: number) => (level >= 9 ? <ShieldCheck size={13} /> : level === 4 ? <UserRound size={13} /> : level === 3 ? <Hand size={13} /> : <Clock3 size={13} />);
/** A plan to review before it starts: every step, how it runs here, and why some wait. */
export function PlanCard({ planned, onStart, onDiscard, busy }: { planned: Planned; onStart: () => void; onDiscard: () => void; busy?: boolean }) {
  const blocked = planned.steps.some((s) => s.level >= 9);
  const waits = planned.steps.filter((s) => s.waits && s.level < 9).length;
  return (
    <section className="nx-kplan" aria-label="Plan to review">
      <div className="nx-kplan-h"><b>{planned.plan.title}</b><span className="nx-t3">{planned.planner === "model" ? "Planned with a model" : "Planned by fixed rules"} · not started</span></div>
      <ol>{planned.steps.map((s) => <li key={s.n} className={s.level >= 9 ? "is-off" : s.waits ? "is-wait" : ""}><span className="nx-kplan-n">{s.n}</span><div><b>{s.label}</b><small>{ICON(s.level)}{s.how}{s.external ? " · outside StrayPaw" : ""}</small>{s.why ? <p>{s.why}</p> : null}</div></li>)}</ol>
      <div className="nx-kplan-f">
        <button type="button" className="nx-btn" disabled={busy || blocked} onClick={onStart}>{busy ? <Loader2 size={13} className="nx-spin" /> : null}Start mission</button>
        <button type="button" className="nx-btn is-quiet" onClick={onDiscard}>Discard</button>
        <span className="nx-t3">{blocked ? "A step uses a tool your organisation has switched off." : waits ? `It will stop ${waits === 1 ? "once" : `${waits} times`} for you. Runs as you, with your permissions; it keeps going if you close this page.` : "Runs as you, with your permissions; it keeps going if you close this page."}</span>
      </div>
    </section>
  );
}
