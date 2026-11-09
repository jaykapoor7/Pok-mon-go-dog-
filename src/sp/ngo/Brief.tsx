"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Home: the daily brief.

   The first screen a coordinator sees, written like a colleague's note:
   a greeting, one sentence on what changed since yesterday, what came in
   while they were out, and what needs a person today, then a prompt for
   Kaju. Every figure and row is read under the member's own
   session from the same helpers the work queue uses; nothing here is
   invented, and empty sections say so plainly.
   ════════════════════════════════════════════════════════════════════ */

import { shortCode } from "@/lib/caseCode";
import Link from "next/link";
import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ArrowUp, Check, CalendarClock, CircleAlert, ClipboardList, History, Inbox, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { dueFollowups, isHistoricalCase, isStale, openCases, opsCounts, recentChanges, type Change, type DueFollowup, type OpenCase, type OpsCounts } from "@/lib/ops";
import { DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import { useAi } from "@/sp3/ai/AiPanel";
import { stageOf, verificationQueue, type QueueRow } from "@/lib/abc";
import { useMembership } from "../shell/Shell";
import { Work } from "./Work";
import { KajuActivity } from "./KajuActivity";
import { KajuPrepared } from "./KajuPrepared";
import { Journey } from "./Journey";
import "../abc/abc.css";
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
/** A person as people read them: never a raw email address. */
const person = (n?: string | null) => (n ?? "").includes("@") ? (n as string).split("@")[0].replace(/[._-]+/g, " ") : n ?? "";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Data = { open: OpenCase[]; due: DueFollowup[]; counts: OpsCounts | null; closed: Change[]; abc: QueueRow[]; unavailable:string[] };

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
    Promise.allSettled([openCases(), dueFollowups(), opsCounts(), recentChanges(8), verificationQueue(100)])
      .then(([open, due, counts, closed, abc]) => {
        if (!live) return;
        if (open.status === "rejected") { setFailed(true); return; }
        const ok = <T,>(r: PromiseSettledResult<T>, fb: T) => (r.status === "fulfilled" ? r.value : fb);
        setD({ open: open.value, due: ok(due, []), counts: ok(counts, null), closed: ok(closed, []), abc: ok(abc, [] as QueueRow[]), unavailable:([ ["follow-ups",due], ["counts",counts], ["recent changes",closed], ["ABC authorisations",abc] ] as const).filter(([,r])=>r.status==='rejected').map(([name])=>name) });
      });
    return () => { live = false; };
  }, [member]);

  /* Signed out or not yet a member: the same door the work queue shows. */
  if (!ready || !user || (mem.ready && !mem.member)) return <Work />;

  /* First name, skipping a title ("Dr Meena" → "Meena"). */
  const first = (user.name ?? "").trim().split(/\s+/).find((w) => !/^(dr|mr|mrs|ms|prof)\.?$/i.test(w)) || "there";
  const role = mem.role;
  const isVet = role === "veterinarian";
  const reviews = role === "admin" || role === "coordinator";
  const since = Date.now() - DAY;
  const fresh = d ? d.open.filter((c) => Date.parse(c.last_activity_at ?? c.occurred_at ?? "") > since && !isHistoricalCase(c)) : [];
  const closedNew = d ? d.closed.filter((c) => Date.parse(c.last_activity_at ?? "") > since) : [];
  const overdue = d ? d.due.filter((f) => f.source === "scheduled" && f.due_at && Date.parse(f.due_at) < Date.now() && Date.now() - Date.parse(f.due_at) < 90 * DAY) : [];
  const crit = d ? d.open.filter((c) => critical(c) && !isHistoricalCase(c) && !c.assignee_name) : [];
  const stale = d ? d.open.filter((c) => !isHistoricalCase(c) && isStale(c)).length : 0;
  const history = d?.counts?.historicalReview ?? 0;
  /* Prefer the server's counts; when they cannot be read, count what loaded. */
  const nOverdue = d?.counts?.overdueScheduled ?? overdue.length;
  const nWeek = d?.counts?.dueWeekScheduled ?? (d ? d.due.filter((f) => f.source === "scheduled" && f.due_at && Date.parse(f.due_at) >= Date.now()).length : 0);
  const nLive = d?.counts?.liveWork ?? (d ? d.open.filter((c) => !isHistoricalCase(c)).length - stale : 0);

  type Row = { key: string; href: string; tone: string; icon: ReactNode; title: ReactNode; meta: string; tag?: string };
  const outAll: Row[] = d ? [
    ...fresh.slice(0, 3).map((c) => ({ key: c.id, href: `/ngo/cases/${c.id}`, tone: critical(c) ? "flame" : "blue", icon: <Inbox size={10} strokeWidth={2.4} />, title: label(c), meta: [c.zone || c.city, c.assignee_name ? `with ${person(c.assignee_name)}` : "not yet assigned", ago(c.last_activity_at ?? c.occurred_at)].filter(Boolean).join(" · "), tag: critical(c) ? "Critical" : undefined })),
    ...closedNew.slice(0, 2).map((c) => ({ key: c.id, href: `/ngo/cases/${c.id}`, tone: "green", icon: <ClipboardList size={10} strokeWidth={2.4} />, title: c.title || c.animal_name || "Case", meta: [c.zone, c.closure_reason || "closed", ago(c.last_activity_at)].filter(Boolean).join(" · "), tag: "Closed" })),
  ] : [];
  const out = outAll.slice(0, isVet ? 2 : 4);
  /* Each role's own next steps first: a vet's procedures to authorise, a
     coordinator's records to review (when verification is switched on). */
  const abcTodo: Row[] = d ? (isVet
    ? d.abc.filter((r) => stageOf(r) === "vet").slice(0, 3).map((r) => ({ key: `v${r.case_id}`, href: `/ngo/verification/${r.case_id}`, tone: "violet", icon: <ShieldCheck size={10} strokeWidth={2.4} />, title: <><b>{r.title || shortCode(r.case_code)}</b> needs your authorisation</>, meta: r.city ?? "ABC procedure" }))
    : reviews ? d.abc.filter((r) => stageOf(r) === "review").slice(0, 2).map((r) => ({ key: `r${r.case_id}`, href: `/ngo/verification/${r.case_id}`, tone: "violet", icon: <ShieldCheck size={10} strokeWidth={2.4} />, title: <><b>{r.title || shortCode(r.case_code)}</b> is ready for your review</>, meta: `Authorised by ${r.vet_name ?? "a veterinarian"}` }))
    : []) : [];
  const todo: Row[] = isVet ? abcTodo : d ? [
    ...abcTodo,
    ...crit.slice(0, 2).map((c) => ({ key: `c${c.id}`, href: `/ngo/cases/${c.id}`, tone: "flame", icon: <CircleAlert size={10} strokeWidth={2.4} />, title: <><b>{label(c)}</b> is critical and unassigned</>, meta: [c.zone || c.city, ago(c.occurred_at)].filter(Boolean).join(" · ") })),
    ...overdue.slice(0, 2).map((f) => ({ key: `f${f.id}`, href: f.case_id ? `/ngo/cases/${f.case_id}` : "/ngo/work?focus=followup", tone: "amber", icon: <CalendarClock size={10} strokeWidth={2.4} />, title: <>Follow-up for <b>{f.case_title || f.animal_name || "a case"}</b> was due {ago(f.due_at)}</>, meta: f.kind || "Follow-up" })),
    ...(stale && reviews ? [{ key: "stale", href: "/ngo/work?cohort=decide", tone: "violet", icon: <TriangleAlert size={10} strokeWidth={2.4} />, title: <><b>{plural(stale, "case")}</b> {stale === 1 ? "is" : "are"} waiting on a decision</>, meta: "Open more than 90 days, nothing recorded for 30" }] : []),
    ...(reviews ? [{ key: "pkg", href: "/ngo/packages", tone: "green", icon: <ClipboardList size={10} strokeWidth={2.4} />, title: <><b>{new Date().toLocaleDateString("en-GB", { month: "long" })}&apos;s report package</b> for the reviewing office</>, meta: "Report packages · Kaju prepares, you submit" }] : []),
    ...(history && reviews ? [{ key: "hist", href: "/ngo/review", tone: "slate", icon: <History size={10} strokeWidth={2.4} />, title: <><b>{plural(history, "imported record", "imported records")}</b> not yet confirmed</>, meta: "From registers you imported; not today's work" }] : []),
  ] : [];

  const send = (t: string) => { ai.setOpen(true); ai.ask(t); };
  const ask = (e: FormEvent) => { e.preventDefault(); const t = q.trim(); if (!t) return; send(t); setQ(""); };
  const rows = (list: Row[], go: boolean) => (
    <ul className="br-list">{list.map((r) => (
      <li key={r.key}><Link href={r.href}>
        <span className={`br-sq t-${r.tone}`} aria-hidden>{r.icon}</span>
        <span className="br-t"><span>{typeof r.title === "string" ? <b>{r.title}</b> : r.title}</span><small>{r.meta}</small></span>
        {r.tag ? <em className={`br-tag t-${r.tone}`}>{r.tag}</em> : <span />}
        {go && <ArrowRight size={14} aria-hidden className="br-go" />}
      </Link></li>
    ))}</ul>
  );

  return (
    <div className={`br${role ? ` is-${role}` : ""}`}>
      <div className="br-in">
        <h1 className="br-hello">{greeting()}, {first}.</h1>
        {failed ? <p className="br-since">The brief could not load just now. Your records are safe; try again in a moment, or open the <Link href="/ngo/work">work queue</Link>.</p>
          : !d ? <div className="br-skel" aria-hidden><i /><i /><i /></div>
          : <p className="br-since">{(() => {
              const v = (k: string, x: number) => d.unavailable.includes(k) ? null : x;
              const parts: ReactNode[] = [];
              const add = (n: number | null, one: string, many: string) => { if (n !== null) parts.push(<b>{n} {n === 1 ? one : many}</b>); };
              add(fresh.length, "record was new or updated", "records were new or updated");
              add(v("recent changes", closedNew.length), "case closed", "cases closed");
              add(v("follow-ups", nOverdue), "follow-up is overdue", "follow-ups are overdue");
              add(v("counts", nLive), "case is live in the queue", "cases are live in the queue");
              return <>Since yesterday: {parts.map((p, i) => <Fragment key={i}>{i > 0 && (i === parts.length - 1 ? ", and " : ", ")}{p}</Fragment>)}.</>;
            })()}</p>}

        {mem.org && <Journey key={`journey:${mem.org.id}`} orgId={mem.org.id} role={role} />}
        {d && <>
          {d.unavailable.length>0&&<p role="status" className="br-warn">Some sections could not be read: {d.unavailable.join(", ")}. Open the relevant queue to retry.</p>}
          <div className="br-grid">
            <section aria-labelledby="br-todo" className="br-card">
              <header className="br-card-h"><h2 id="br-todo">Needs you</h2><Link href="/ngo/work">Work queue <ArrowRight size={13} aria-hidden /></Link></header>
              {todo.length ? rows(todo.slice(0, 5), true) : <p className="br-clear"><Check size={16} aria-hidden /> {d.unavailable.length>0?"Some priorities could not be read. Check the work queue.":isVet ? "Nothing is waiting for your sign-off." : "You're all caught up."}</p>}
              {out.length > 0 && <><h3 className="br-sub">Recent activity</h3>{rows(out.slice(0, 3), false)}</>}
            </section>
            <section aria-labelledby="br-kaju" className="br-card br-kx">
              <header className="br-card-h"><h2 id="br-kaju"><Sparkles size={14} aria-hidden /> From Kaju</h2></header>
              {!isVet && <KajuPrepared key={`prepared:${mem.org?.id ?? "org"}`} actor={{ id: user.id, name: user.name ?? "Team member" }} />}
              {mem.org && <KajuActivity key={`activity:${mem.org.id}`} orgId={mem.org.id} />}
            </section>
          </div>
          <form className="br-ask" onSubmit={ask}>
            <Sparkles size={15} aria-hidden />
            <label htmlFor="br-q" className="br-sr">Ask Kaju</label>
            <input id="br-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask Kaju anything about your programme…" autoComplete="off" />
            <button type="submit" aria-label="Ask Kaju" disabled={!q.trim()}><ArrowUp size={14} /></button>
          </form>
          <div className="br-chips">{(todo.length ? ["What should I do first today, and why?"] : []).concat(out.length > 1 ? ["Summarise what changed since yesterday."] : [], reviews ? ["Which records block this month's report package?"] : isVet ? ["What can only the veterinarian authorise?"] : ["Help me prepare a field update."]).slice(0, 3).map((t) => <button key={t} type="button" onClick={() => send(t)}><Sparkles size={12} aria-hidden />{t}</button>)}</div>
        </>}
      </div>

    </div>
  );
}
