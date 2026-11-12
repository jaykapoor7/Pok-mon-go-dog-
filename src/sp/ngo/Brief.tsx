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

import { ProgrammeStrip } from "@/oh/ProgrammeStrip";
import { shortCode } from "@/lib/caseCode";
import Link from "next/link";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, CalendarClock, CircleAlert, ClipboardList, FileSpreadsheet, History, PawPrint, ShieldCheck, TriangleAlert, UserPlus, X } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import { useAuth } from "@/components/auth/AuthProvider";
import { dueFollowups, isHistoricalCase, isStale, openCases, opsCounts, recentChanges, type Change, type DueFollowup, type OpenCase, type OpsCounts } from "@/lib/ops";
import { DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
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
  const [setupHidden, setSetupHidden] = useState(false);
  useEffect(() => { try { setSetupHidden(localStorage.getItem("sp.setup.hidden") === "1"); } catch { /* fine */ } }, []);

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

  type Row = { key: string; href: string; tone: string; icon: ReactNode; title: ReactNode; meta: string; tag?: string; verb?: string };
  /* Each role's own next steps first: a vet's procedures to authorise, a
     coordinator's records to review (when verification is switched on). */
  const abcTodo: Row[] = d ? (isVet
    ? d.abc.filter((r) => stageOf(r) === "vet").slice(0, 3).map((r) => ({ key: `v${r.case_id}`, href: `/ngo/verification/${r.case_id}`, tone: "violet", icon: <ShieldCheck size={10} strokeWidth={2.4} />, title: <><b>{r.title || shortCode(r.case_code)}</b> needs your authorisation</>, meta: r.city ?? "ABC procedure", verb: "Sign off" }))
    : reviews ? d.abc.filter((r) => stageOf(r) === "review").slice(0, 2).map((r) => ({ key: `r${r.case_id}`, href: `/ngo/verification/${r.case_id}`, tone: "violet", icon: <ShieldCheck size={10} strokeWidth={2.4} />, title: <><b>{r.title || shortCode(r.case_code)}</b> is ready for your review</>, verb: "Review it", meta: `Authorised by ${r.vet_name ?? "a veterinarian"}` }))
    : []) : [];
  const todo: Row[] = isVet ? abcTodo : d ? [
    ...abcTodo,
    ...crit.slice(0, 2).map((c) => ({ key: `c${c.id}`, href: `/ngo/cases/${c.id}`, tone: "flame", icon: <CircleAlert size={10} strokeWidth={2.4} />, verb: "Assign it", title: <><b>{label(c)}</b> is critical and unassigned</>, meta: [c.zone || c.city, ago(c.occurred_at)].filter(Boolean).join(" · ") })),
    ...overdue.slice(0, 2).map((f) => ({ key: `f${f.id}`, href: f.case_id ? `/ngo/cases/${f.case_id}` : "/ngo/work?focus=followup", tone: "amber", verb: "Open the case", icon: <CalendarClock size={10} strokeWidth={2.4} />, title: <>Follow-up for <b>{f.case_title || f.animal_name || "a case"}</b> was due {ago(f.due_at)}</>, meta: f.kind || "Follow-up" })),
    ...(stale && reviews ? [{ key: "stale", href: "/ngo/work?cohort=decide", tone: "violet", verb: "Decide", icon: <TriangleAlert size={10} strokeWidth={2.4} />, title: <><b>{plural(stale, "case")}</b> {stale === 1 ? "is" : "are"} waiting on a decision</>, meta: "Open more than 90 days, nothing recorded for 30" }] : []),
    ...(reviews ? [{ key: "pkg", href: "/ngo/packages", tone: "green", verb: "Prepare it", icon: <ClipboardList size={10} strokeWidth={2.4} />, title: <><b>{new Date().toLocaleDateString("en-GB", { month: "long" })}&apos;s report package</b> for the reviewing office</>, meta: "Report packages · Kaju prepares, you submit" }] : []),
    ...(history && reviews ? [{ key: "hist", href: "/ngo/review", tone: "slate", verb: "Review imports", icon: <History size={10} strokeWidth={2.4} />, title: <><b>{plural(history, "imported record", "imported records")}</b> not yet confirmed</>, meta: "From registers you imported; not today's work" }] : []),
  ] : [];

  /* With nothing waiting, a field worker's next step is still their main job: registering an animal. */
  const fieldStart: Row | null = d && role === "member" ? { key: "field", href: "/ngo/field", tone: "blue", icon: null, title: <><b>Register an animal</b> in field mode</>, meta: "Works on your phone, with or without signal", verb: "Start" } : null;
  const next = todo[0] ?? fieldStart, rest = todo.slice(1);
  /* A workspace with nothing on it yet (a newly registered organisation) is shown how to begin. */
  const setup = !!d && reviews && !setupHidden && d.open.length === 0 && d.abc.length === 0 && d.closed.length === 0;
  const hideSetup = () => { setSetupHidden(true); try { localStorage.setItem("sp.setup.hidden", "1"); } catch { /* fine */ } };
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

  /* Home is three things, in this order, and nothing else above the fold:
       1. the one thing to do first, with its one action;
       2. the line of work, as it stands (each stage opens the board there);
       3. at most three other things that are waiting.
     What changed since yesterday is one sentence; Kaju's prepared work is one fold. */
  return (
    <div className={`hm${role ? ` is-${role}` : ""}`}>
      <header className="hm-head">
        <p className="hm-date">{today}</p>
        <h1 className="br-hello hm-hello">{greeting()}, {first}.</h1>
        {failed ? <p className="hm-since">Home could not load just now. Your records are safe; try again in a moment, or open the <Link href="/ngo/pipeline">pipeline</Link>.</p>
          : !d ? <div className="br-skel" aria-hidden><i /><i /></div>
          : <p className="hm-since">{(() => {
              const v = (k: string, x: number) => d.unavailable.includes(k) ? null : x;
              const parts: ReactNode[] = [];
              const add = (n: number | null, one: string, many: string) => { if (n) parts.push(<b>{n} {n === 1 ? one : many}</b>); };
              add(fresh.length, "record new or updated", "records new or updated");
              add(v("recent changes", closedNew.length), "case closed", "cases closed");
              add(v("follow-ups", nOverdue), "follow-up overdue", "follow-ups overdue");
              const live = v("counts", nLive);
              return parts.length ? <>Since yesterday: {parts.map((p, i) => <Fragment key={i}>{i > 0 && (i === parts.length - 1 ? " and " : ", ")}{p}</Fragment>)}.{live !== null ? <> {live} {live === 1 ? "case is" : "cases are"} live.</> : null}</>
                : <>Nothing changed since yesterday.{live !== null ? <> {live} {live === 1 ? "case is" : "cases are"} live.</> : null}</>;
            })()}</p>}
      </header>

      {d && <>
        {d.unavailable.length > 0 && <p role="status" className="br-warn">Some parts could not be read: {d.unavailable.join(", ")}. Open the pipeline to retry.</p>}

        <section className="hm-first" aria-labelledby="hm-first-k">
          <p id="hm-first-k" className="hm-k">{todo.length ? "First" : next ? "Ready when you are" : "Nothing is waiting"}</p>
          {next ? (
            <Link href={next.href} className={`hm-card t-${next.tone}`}>
              <span className="hm-card-t">{typeof next.title === "string" ? <b>{next.title}</b> : next.title}</span>
              <small>{next.meta}</small>
              <span className="hm-card-go">{next.verb ?? "Open"} <ArrowRight size={15} aria-hidden /></span>
            </Link>
          ) : <p className="hm-clear"><Check size={16} aria-hidden /> {isVet ? "Nothing is waiting for your sign-off." : "You are all caught up."}</p>}
        </section>

        {setup && <section className="br-setup hm-setup" aria-labelledby="br-setup-h">
          <header><h2 id="br-setup-h">Set up {mem.org?.name ?? "your workspace"}</h2><button type="button" aria-label="Hide setup" onClick={hideSetup}><X size={15} aria-hidden /></button></header>
          <p>Three steps and your records start here. Kaju can help with each one.</p>
          <ol>
            <li><Link href="/ngo/import"><span className="br-setup-i"><FileSpreadsheet size={17} aria-hidden /></span><span><b>Bring your register</b><small>Excel or CSV, as it is. Imported rows stay labelled.</small></span><ArrowRight size={15} aria-hidden /></Link></li>
            <li><Link href="/ngo/team"><span className="br-setup-i"><UserPlus size={17} aria-hidden /></span><span><b>Add your team</b><small>Field staff, vets and coordinators each get their own code.</small></span><ArrowRight size={15} aria-hidden /></Link></li>
            <li><Link href="/ngo/field"><span className="br-setup-i"><PawPrint size={17} aria-hidden /></span><span><b>Register your first animal</b><small>Field mode works on a phone, with or without signal.</small></span><ArrowRight size={15} aria-hidden /></Link></li>
          </ol>
        </section>}
      </>}

      {mem.org && <section className="hm-line" aria-labelledby="hm-line-h">
        <header className="hm-sec"><h2 id="hm-line-h">The line today</h2><Link href="/ngo/pipeline">Open the board <ArrowRight size={13} aria-hidden /></Link></header>
        <Journey key={`journey:${mem.org.id}`} orgId={mem.org.id} role={role} />
      </section>}

      {d && <section className="hm-also" aria-labelledby="hm-also-h">
        <header className="hm-sec"><h2 id="hm-also-h">Also waiting</h2></header>
        <ProgrammeStrip />
        {rest.length ? rows(rest.slice(0, 3), true) : null}
        {rest.length > 3 ? <p className="hm-more"><Link href="/ngo/pipeline">{rest.length - 3} more in the pipeline <ArrowRight size={13} aria-hidden /></Link></p> : null}
        <p className="hm-none"><Check size={14} aria-hidden /> Nothing else needs you today.</p>
      </section>}

      {d && !isVet && <details className="hm-kaju">
        <summary><KajuFace size={20} /> <span>From Kaju</span><small>Work prepared for you to confirm, and what Kaju checked</small><ArrowRight size={14} aria-hidden className="hm-kaju-go" /></summary>
        <div className="hm-kaju-in">
          <KajuPrepared key={`prepared:${mem.org?.id ?? "org"}`} actor={{ id: user.id, name: user.name ?? "Team member" }} />
          {mem.org && <KajuActivity key={`activity:${mem.org.id}`} orgId={mem.org.id} />}
        </div>
      </details>}
    </div>
  );

  function rows(list: Row[], go: boolean) {
    return (
      <ul className="br-list hm-list">{list.map((r) => (
        <li key={r.key}><Link href={r.href}>
          <span className={`br-sq t-${r.tone}`} aria-hidden>{r.icon}</span>
          <span className="br-t"><span>{typeof r.title === "string" ? <b>{r.title}</b> : r.title}</span><small>{r.meta}</small></span>
          {r.tag ? <em className={`br-tag t-${r.tag ? r.tone : ""}`}>{r.tag}</em> : <span className="hm-verb">{r.verb ?? "Open"}</span>}
          {go && <ArrowRight size={14} aria-hidden className="br-go" />}
        </Link></li>
      ))}</ul>
    );
  }
}
