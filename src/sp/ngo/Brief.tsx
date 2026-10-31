"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Home: the daily brief.

   The first screen a coordinator sees, written like a colleague's note:
   a greeting, one sentence on what changed since yesterday, what came in
   while they were out, and what needs a person today, then a prompt for
   StrayPaw AI. Every figure and row is read under the member's own
   session from the same helpers the work queue uses; nothing here is
   invented, and empty sections say so plainly.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUp, CalendarClock, CircleAlert, ClipboardList, History, Inbox, Sparkles, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrg } from "@/lib/actions";
import { dueFollowups, isHistoricalCase, isStale, openCases, opsCounts, recentChanges, type Change, type DueFollowup, type OpenCase, type OpsCounts } from "@/lib/ops";
import { DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import type { NGO } from "@/lib/types";
import { useAi } from "@/sp3/ai/AiPanel";
import { useMembership } from "../shell/Shell";
import { Work } from "./Work";
import "./brief.css";

const H = 3_600_000, DAY = 24 * H;
const ago = (iso: string | null) => {
  if (!iso) return "";
  const m = Math.max(0, Date.now() - Date.parse(iso));
  return m < H ? `${Math.max(1, Math.round(m / 60000))} min ago` : m < DAY ? `${Math.round(m / H)} h ago` : `${Math.round(m / DAY)} d ago`;
};
const critical = (c: OpenCase) => DEFAULT_TRIAGE[(c.condition_class ?? "Not recorded") as Condition] === "Critical";
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const label = (c: { title?: string | null; animal_name?: string | null; case_code?: string | null }) => c.title || c.animal_name || c.case_code || "Untitled case";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Data = { open: OpenCase[]; due: DueFollowup[]; counts: OpsCounts | null; closed: Change[]; org: NGO | null };

export function Brief() {
  const { user, ready } = useAuth();
  const mem = useMembership();
  const member = !!user && mem.member;
  const [d, setD] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const ai = useAi();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!member) return;
    let live = true;
    /* Each part loads on its own, so one slow or failing read leaves the
       rest of the brief standing. Only when the open cases themselves
       cannot be read does the page say the brief failed. */
    Promise.allSettled([openCases(), dueFollowups(), opsCounts(), recentChanges(8), getMyOrg()])
      .then(([open, due, counts, closed, org]) => {
        if (!live) return;
        if (open.status === "rejected") { setFailed(true); return; }
        const ok = <T,>(r: PromiseSettledResult<T>, fb: T) => (r.status === "fulfilled" ? r.value : fb);
        setD({ open: open.value, due: ok(due, []), counts: ok(counts, null), closed: ok(closed, []), org: ok(org, null) });
      });
    return () => { live = false; };
  }, [member]);

  /* Signed out or not yet a member: the same door the work queue shows. */
  if (!ready || !user || (mem.ready && !mem.member)) return <Work />;

  const first = (user.name ?? "").trim().split(/\s+/)[0] || "there";
  const since = Date.now() - DAY;
  const fresh = d ? d.open.filter((c) => Date.parse(c.last_activity_at ?? c.occurred_at ?? "") > since && !isHistoricalCase(c)) : [];
  const closedNew = d ? d.closed.filter((c) => Date.parse(c.last_activity_at ?? "") > since) : [];
  const overdue = d ? d.due.filter((f) => f.due_at && Date.parse(f.due_at) < Date.now() && Date.now() - Date.parse(f.due_at) < 90 * DAY) : [];
  const crit = d ? d.open.filter((c) => critical(c) && !isHistoricalCase(c) && !c.assignee_name) : [];
  const stale = d ? d.open.filter((c) => !isHistoricalCase(c) && isStale(c)).length : 0;
  const history = d?.counts?.historicalReview ?? 0;
  /* Prefer the server's counts; when they cannot be read, count what loaded. */
  const nOverdue = d?.counts?.overdueScheduled ?? overdue.length;
  const nWeek = d?.counts?.dueWeekScheduled ?? (d ? d.due.filter((f) => f.due_at && Date.parse(f.due_at) >= Date.now()).length : 0);
  const nLive = d?.counts?.liveWork ?? (d ? d.open.filter((c) => !isHistoricalCase(c)).length - stale : 0);

  const out = d ? [
    ...fresh.slice(0, 4).map((c) => ({ key: c.id, href: `/ngo/cases/${c.id}`, tone: critical(c) ? "flame" : "blue", icon: <Inbox size={11} />, title: label(c), meta: [c.zone || c.city, c.assignee_name ? `with ${c.assignee_name}` : "not yet assigned", ago(c.last_activity_at ?? c.occurred_at)].filter(Boolean).join(" · "), tag: critical(c) ? "Critical" : "Updated" })),
    ...closedNew.slice(0, 3).map((c) => ({ key: c.id, href: `/ngo/cases/${c.id}`, tone: "green", icon: <ClipboardList size={11} />, title: c.title || c.animal_name || "Case", meta: [c.zone, c.closure_reason || "closed", ago(c.last_activity_at)].filter(Boolean).join(" · "), tag: "Closed" })),
  ] : [];
  const todo = d ? [
    ...crit.slice(0, 2).map((c) => ({ key: `c${c.id}`, href: `/ngo/cases/${c.id}`, tone: "flame", icon: <CircleAlert size={11} />, title: <><b>{label(c)}</b> is critical and nobody holds it</>, meta: [c.zone || c.city, ago(c.occurred_at)].filter(Boolean).join(" · ") })),
    ...overdue.slice(0, 3).map((f) => ({ key: `f${f.id}`, href: f.case_id ? `/ngo/cases/${f.case_id}` : "/ngo/work?focus=followup", tone: "amber", icon: <CalendarClock size={11} />, title: <>Follow-up for <b>{f.case_title || f.animal_name || "a case"}</b> was due {ago(f.due_at)}</>, meta: f.kind || "Follow-up" })),
    ...(stale ? [{ key: "stale", href: "/ngo/work?cohort=decide", tone: "violet", icon: <TriangleAlert size={11} />, title: <><b>{plural(stale, "case")}</b> {stale === 1 ? "is" : "are"} waiting on a decision</>, meta: "Open more than 90 days, nothing recorded for 30" }] : []),
    ...(history ? [{ key: "hist", href: "/ngo/review", tone: "slate", icon: <History size={11} />, title: <><b>{plural(history, "imported status", "imported statuses")}</b> {history === 1 ? "has" : "have"} never been confirmed</>, meta: "From registers you imported; not today's work" }] : []),
  ] : [];

  const ask = (e: FormEvent) => { e.preventDefault(); const t = q.trim(); if (!t) return; ai.setOpen(true); ai.ask(t); setQ(""); };

  return (
    <div className="br">
      <div className="br-in">
        <p className="br-org">{d?.org?.name ?? "Your organisation"}</p>
        <h1 className="br-hello">{greeting()}, {first}.<span>Here is your daily brief.</span></h1>
        {failed ? <p className="br-since">The brief could not load just now. Your records are safe; try again in a moment, or open the <Link href="/ngo/work">work queue</Link>.</p>
          : !d ? <div className="br-skel" aria-hidden><i /><i /><i /></div>
          : <p className="br-since">Since yesterday: <b>{plural(fresh.length, "case")}</b> came in or moved and <b>{closedNew.length}</b> closed. <b>{plural(nOverdue, "follow-up")}</b> {nOverdue === 1 ? "is" : "are"} overdue and <b>{nWeek}</b> more {nWeek === 1 ? "is" : "are"} due this week. You have <b>{plural(nLive, "live case")}</b> in the queue.</p>}

        {d && (
          <>
            <section aria-labelledby="br-out">
              <h2 id="br-out" className="br-h">While you were out</h2>
              {out.length ? <ul className="br-list">{out.map((r) => (
                <li key={r.key}><Link href={r.href}><span className={`br-sq t-${r.tone}`}>{r.icon}</span><span className="br-t"><b>{r.title}</b><small>{r.meta}</small></span><em className={`br-tag t-${r.tone}`}>{r.tag}</em></Link></li>
              ))}</ul> : <p className="br-empty">Nothing new in the last day.</p>}
            </section>
            <section aria-labelledby="br-todo">
              <h2 id="br-todo" className="br-h">What needs to be done</h2>
              {todo.length ? <ul className="br-list">{todo.map((r) => (
                <li key={r.key}><Link href={r.href}><span className={`br-sq t-${r.tone}`}>{r.icon}</span><span className="br-t"><span className="br-tt">{r.title}</span><small>{r.meta}</small></span><ArrowRight size={14} aria-hidden className="br-go" /></Link></li>
              ))}</ul> : <p className="br-empty">Nothing is overdue or unassigned. The <Link href="/ngo/work">work queue</Link> has the rest.</p>}
            </section>
          </>
        )}

        <form className="br-ask" onSubmit={ask}>
          <Sparkles size={15} aria-hidden />
          <label htmlFor="br-q" className="br-sr">Ask StrayPaw AI</label>
          <input id="br-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask StrayPaw AI about your programme…" autoComplete="off" />
          <button type="submit" aria-label="Ask" disabled={!q.trim()}><ArrowUp size={14} /></button>
        </form>
        <div className="br-chips">{["Which records are missing evidence?", "Summarise today's work", "Find possible duplicate animals"].map((s) => (
          <button key={s} type="button" onClick={() => { ai.setOpen(true); ai.ask(s); }}>{s}</button>
        ))}</div>
        <p className="br-foot"><Link href="/ngo/work">Open the work queue <ArrowRight size={13} aria-hidden /></Link></p>
      </div>
    </div>
  );
}
