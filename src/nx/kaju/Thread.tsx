"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check as Tick, Loader2 } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import type { Proposal } from "@/sp3/ai/types";
import { appHref, useKaju, type Turn } from "./state";

/* Kaju's answers as objects, not walls of text: the answer first, the records it read as links, and anything it prepared
   as a card with Confirm. Plans are reviewed in the plan card (Plan.tsx). */

const PROPOSAL_WORD: Record<Proposal["kind"], string> = { open_case: "Open a case", add_note: "Add a note", schedule_followup: "Schedule a follow-up", record_care: "Record care", add_task: "Add a task", register_exposure: "Record a bite", email: "Email", calendar_event: "Calendar event", chat_post: "Post in a connected chat", sms: "Text message", report_file: "Report file" };
const day = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const EXPOSURE: Record<string, string> = { bite: "Bite", scratch: "Scratch", lick_broken_skin: "Lick on broken skin", other: "Other contact" };
const WASHED: Record<string, string> = { before_arrival: "washed before arrival", at_facility: "washed here", not_washed: "not washed" };
const AGE: Record<string, string> = { "0-4": "under 5", "5-14": "5 to 14", "15-29": "15 to 29", "30-49": "30 to 49", "50+": "50 and over" };
/** What a task or a bite record will hold, one fact per line, so the person checks each before confirming. Empty facts are said, not hidden. */
function proposalFacts(p: Proposal): string[] {
  if (p.kind === "add_task") return [`Due: ${p.dueOn ? day(p.dueOn) : "no date"}`, `For: ${p.assigneeName ?? "nobody yet"}`, `About: ${p.caseLabel ?? p.dogLabel ?? "no record"}`];
  if (p.kind === "register_exposure") return [
    `${p.facilityName} · ${EXPOSURE[p.exposureKind] ?? p.exposureKind} on ${day(p.exposureOn)}${p.exposureTime ? `, ${p.exposureTime}` : ""}${p.site ? ` · ${p.site}` : ""}`,
    `Patient: ${p.patientRef ?? "no register number"} · ${p.ageText ? `${p.ageText}${p.ageBand ? ` (${AGE[p.ageBand]})` : ""}` : "age not given"} · ${p.sex ?? "sex not given"}`,
    `Category: ${p.category ?? "not recorded; the clinician records it"} · Wound: ${p.woundWashed ? WASHED[p.woundWashed] : "washing not recorded"}`,
    `Animal: ${p.species === "unknown" ? "not stated" : p.species}${p.ownership !== "unknown" ? `, ${p.ownership === "community" ? "street or community" : "someone's pet"}` : ""}${p.animalPlace ? ` · ${p.animalPlace}` : ""}${p.areaName ? ` · area ${p.areaName}` : ""}`,
    `Reminder calls: ${p.reminderConsent ? "agreed, phone saved" : "not agreed"}`,
  ];
  return [];
}
function proposalLine(p: Proposal) {
  switch (p.kind) {
    case "add_task": return p.title;
    case "register_exposure": return "A bite presentation for your register, from your note. Prescribing stays with the clinician.";
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
      <p>{p.kind === "add_task" ? <b>{proposalLine(p)}</b> : proposalLine(p)}</p>
      {proposalFacts(p).map((f) => <p key={f} className="nx-t3">{f}</p>)}
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
  const { turns, ask, stop, retry, page } = useKaju();
  const calm = useReducedMotion();
  const shown = compact ? turns.slice(-4) : turns;
  if (!turns.length) return null;
  return (
    <ol className={`nx-kthread ${compact ? "is-compact" : ""}`} aria-label="Conversation with Kaju">
      {shown.map((t) => (
        <motion.li key={t.id} className={`nx-kturn is-${t.role}`} initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .16 }}>
          {t.role === "user" ? <p className="nx-kq">{t.text}</p> : (
            <div className="nx-ka">
              <span className="nx-ka-i is-face"><KajuFace size={22} /></span>
              <div>
                {t.pending ? <p className="nx-t3" role="status"><Loader2 size={12} className="nx-spin" /> {t.progress?.length ? t.progress[t.progress.length - 1] : "Reading what you can see…"} <button type="button" className="nx-link" onClick={stop}>Stop waiting</button></p> : null}
                {t.error ? <div className="nx-kerr" role="alert"><p>{t.error}</p>{t.kind === "expired" ? <Link className="nx-btn is-sm" href={`/sign-in?next=${encodeURIComponent(page.path || "/kaju")}`}>Sign in</Link> : <button type="button" className="nx-btn is-quiet is-sm" onClick={() => retry(t.id)}>Try again</button>}</div> : null}
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
