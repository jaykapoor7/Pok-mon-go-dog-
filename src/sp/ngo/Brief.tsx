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
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ArrowRightLeft, CalendarClock, CircleAlert, ClipboardList, FileSpreadsheet, History, PawPrint, ShieldCheck, TriangleAlert, UserPlus } from "lucide-react";
import { Btn, Head, Note, Page, Panel, Row, Rows, Section, Tag } from "@/ws/kit";
import { AskKaju } from "../ui/Daily";
import { placeHome, usePlaces } from "@/oh/places";
import { useAuth } from "@/components/auth/AuthProvider";
import { dueFollowups, isHistoricalCase, isStale, openCases, opsCounts, recentChanges, type Change, type DueFollowup, type OpenCase, type OpsCounts } from "@/lib/ops";
import { DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import { stageOf, verificationQueue, type QueueRow } from "@/lib/abc";
import { useMembership } from "../shell/Shell";
import { Work } from "./Work";
import { KajuActivity } from "./KajuActivity";
import { KajuPrepared } from "./KajuPrepared";
import { Journey } from "./Journey";
import "./cases.k.css";
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
  const { places } = usePlaces();
  const ngoPlace = mem.org ? places.find((x) => x.kind === "ngo" && x.ngo_id === mem.org!.id) ?? null : null;
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
    ? d.abc.filter((r) => stageOf(r) === "vet").slice(0, 3).map((r) => ({ key: `v${r.case_id}`, href: `/ngo/verification/${r.case_id}`, tone: "violet", icon: <ShieldCheck size={12} />, title: <><b>{r.title || shortCode(r.case_code)}</b> needs your authorisation</>, meta: r.city ?? "ABC procedure", verb: "Sign off" }))
    : reviews ? d.abc.filter((r) => stageOf(r) === "review").slice(0, 2).map((r) => ({ key: `r${r.case_id}`, href: `/ngo/verification/${r.case_id}`, tone: "violet", icon: <ShieldCheck size={12} />, title: <><b>{r.title || shortCode(r.case_code)}</b> is ready for your review</>, verb: "Review it", meta: `Authorised by ${r.vet_name ?? "a veterinarian"}` }))
    : []) : [];
  const todo: Row[] = isVet ? abcTodo : d ? [
    ...abcTodo,
    ...crit.slice(0, 2).map((c) => ({ key: `c${c.id}`, href: `/ngo/cases/${c.id}`, tone: "flame", icon: <CircleAlert size={12} />, verb: "Assign it", title: <><b>{label(c)}</b> is critical and unassigned</>, meta: [c.zone || c.city, ago(c.occurred_at)].filter(Boolean).join(" · ") })),
    ...overdue.slice(0, 2).map((f) => ({ key: `f${f.id}`, href: f.case_id ? `/ngo/cases/${f.case_id}` : "/ngo/work?focus=followup", tone: "amber", verb: "Open the case", icon: <CalendarClock size={12} />, title: <>Follow-up for <b>{f.case_title || f.animal_name || "a case"}</b> was due {ago(f.due_at)}</>, meta: f.kind || "Follow-up" })),
    ...(stale && reviews ? [{ key: "stale", href: "/ngo/work?cohort=decide", tone: "violet", verb: "Decide", icon: <TriangleAlert size={12} />, title: <><b>{plural(stale, "case")}</b> {stale === 1 ? "is" : "are"} waiting on a decision</>, meta: "Open more than 90 days, nothing recorded for 30" }] : []),
    ...(reviews ? [{ key: "pkg", href: "/ngo/packages", tone: "green", verb: "Prepare it", icon: <ClipboardList size={12} />, title: <><b>{new Date().toLocaleDateString("en-GB", { month: "long" })}&apos;s report package</b> for the reviewing office</>, meta: "Report packages · Kaju prepares, you submit" }] : []),
    ...(history && reviews ? [{ key: "hist", href: "/ngo/review", tone: "slate", verb: "Review imports", icon: <History size={12} />, title: <><b>{plural(history, "imported record", "imported records")}</b> not yet confirmed</>, meta: "From registers you imported; not today's work" }] : []),
  ] : [];

  /* With nothing waiting, a field worker's next step is still their main job: registering an animal. */
  const fieldStart: Row | null = d && role === "member" ? { key: "field", href: "/ngo/field", tone: "blue", icon: null, title: <><b>Register an animal</b> in field mode</>, meta: "Works on your phone, with or without signal", verb: "Start" } : null;
  const next = todo[0] ?? fieldStart, rest = todo.slice(1);
  /* A workspace with nothing on it yet (a newly registered organisation) is shown how to begin. */
  const setup = !!d && reviews && !setupHidden && d.open.length === 0 && d.abc.length === 0 && d.closed.length === 0;
  const hideSetup = () => { setSetupHidden(true); try { localStorage.setItem("sp.setup.hidden", "1"); } catch { /* fine */ } };
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

  /* Home, as the product demo shows it: the greeting and one sentence on
     what changed; what needs a person today, each row with its colour and
     tag; a line to ask Kaju; the line of work as it stands; Kaju's prepared
     work folded away. */
  const partner = ngoPlace ? { key: "partners", href: placeHome(ngoPlace), tone: ngoPlace.handoffs_overdue ? "flame" : "blue", icon: <ArrowRightLeft size={12} />, title: <><b>{ngoPlace.handoffs_open ? plural(ngoPlace.handoffs_open, "request") : "No requests"}</b> from programme partners</>, meta: ngoPlace.programmes.map((x) => x.name).join(", "), tag: ngoPlace.handoffs_overdue ? `${ngoPlace.handoffs_overdue} overdue` : ngoPlace.handoffs_open ? "Waiting" : "Clear", verb: "Answer" } as Row : null;
  const list: Row[] = [...(next ? [next] : []), ...(partner && ngoPlace?.handoffs_open ? [partner] : []), ...rest].slice(0, 6);
  const more = Math.max(0, todo.length + (partner && ngoPlace?.handoffs_open ? 1 : 0) - list.length);

  const TONES: Record<string, "flame" | "amber" | "green" | "blue" | "violet" | "plain"> = { flame: "flame", amber: "amber", green: "green", blue: "blue", violet: "violet", slate: "plain" };
  const v = (k: string, x: number) => (d && d.unavailable.includes(k) ? null : x);
  const parts: ReactNode[] = [];
  const add = (n: number | null, one: string, many: string) => { if (n) parts.push(<b>{n} {n === 1 ? one : many}</b>); };
  if (d) { add(fresh.length, "record was new or updated", "records were new or updated"); add(v("recent changes", closedNew.length), "case was closed", "cases were closed"); add(v("follow-ups", nOverdue), "follow-up is overdue", "follow-ups are overdue"); }
  const live = d ? v("counts", nLive) : null;
  const liveLine = live !== null ? <> <b>{live} {live === 1 ? "case is" : "cases are"} live.</b></> : null;

  /* One screen: the greeting and what changed, what needs a person, a line for Kaju, the five stages, Kaju's work folded. */
  return (
    <Page className={`hm2${role ? ` is-${role}` : ""}`}>
      <Head title={`${greeting()}, ${first}.`}
        sum={failed ? <>Home could not load just now. Your records are safe; try again in a moment, or open the <Link className="kc-link" href="/ngo/pipeline">pipeline</Link>.</>
          : !d ? `${today}. Reading your day…`
          : <>{today}. {parts.length ? <>Since yesterday: {parts.map((p, i) => <Fragment key={i}>{i > 0 && (i === parts.length - 1 ? " and " : ", ")}{p}</Fragment>)}.{liveLine}</> : <>Nothing changed since yesterday.{liveLine}</>}</>} />

      {d && d.unavailable.length > 0 && <Note tone="amber">Some parts could not be read: {d.unavailable.join(", ")}. Open the pipeline to retry.</Note>}

      {d ? <Section title={list.length ? "Needs you today" : "Today"} action={more > 0 ? <Btn small variant="quiet" href="/ngo/pipeline">{more} more on the board</Btn> : undefined}>
        <Panel>
          {list.length ? <Rows label="Needs you today">{list.map((r) => (
            <Row key={r.key} href={r.href} tone={TONES[r.tone] ?? "plain"} icon={r.icon ?? <ArrowRight size={12} />} title={r.title} meta={r.meta} end={<Tag tone={TONES[r.tone] ?? "plain"}>{r.tag ?? TAG[r.tone] ?? "Open"}</Tag>} />
          ))}</Rows> : <p className="kc-quiet is-pad" role="status">{isVet ? "Nothing is waiting for your sign-off." : "You are all caught up. Nothing needs you today."}</p>}
        </Panel>
      </Section> : <div aria-hidden><i className="kc-skel" /><i className="kc-skel" /><i className="kc-skel" /></div>}

      <div className="hm2-ask"><AskKaju /></div>

      {setup && <Section title={`Set up ${mem.org?.name ?? "your workspace"}`} note="Three steps and your records start here. Kaju can help with each one." action={<Btn small variant="quiet" aria-label="Hide setup" onClick={hideSetup}>Hide</Btn>}>
        <Panel><Rows>
          <Row href="/ngo/import" tone="green" icon={<FileSpreadsheet size={12} />} title="Bring your register" meta="Excel or CSV, as it is. Imported rows stay labelled." />
          <Row href="/ngo/team" icon={<UserPlus size={12} />} title="Add your team" meta="Field staff, vets and coordinators each get their own code." />
          <Row href="/ngo/field" tone="amber" icon={<PawPrint size={12} />} title="Register your first animal" meta="Field mode works on a phone, with or without signal." />
        </Rows></Panel>
      </Section>}

      {mem.org && <Section title="The line today" action={<Btn small variant="quiet" href="/ngo/pipeline">Open the board</Btn>}>
        <Journey key={`journey:${mem.org.id}`} orgId={mem.org.id} role={role} />
      </Section>}

      {d && !isVet && <Section title="From Kaju" fold="kaju" open={false} note="Work prepared for you to confirm, and what Kaju checked">
        <KajuPrepared key={`prepared:${mem.org?.id ?? "org"}`} actor={{ id: user.id, name: user.name ?? "Team member" }} />
        {mem.org && <KajuActivity key={`activity:${mem.org.id}`} orgId={mem.org.id} />}
      </Section>}
    </Page>
  );
}

const TAG: Record<string, string> = { violet: "Review", flame: "Urgent", amber: "Overdue", green: "Draft", slate: "Check", blue: "Start" };

