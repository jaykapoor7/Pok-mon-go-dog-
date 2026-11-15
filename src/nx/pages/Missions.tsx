"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check as Tick, Clock3, Hand, Loader2, RotateCcw, Sparkles, UserRound, X } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { Confirm, Empty, Failed, Skeleton, dayTime, errText, useAct } from "../kit";
import { MISSIONS, MISSIONS_DONE } from "../fixtures";
import { useLive } from "../live";
import { cancelMission, decideStep, retryMission, runMine, useMissionEvents, useMissionList, type MissionRow, type StepRow } from "../kaju/data";
import { missionState } from "./Kaju";

/* Missions as runs: each step with what it is doing now, how many tries it took, when it tries again, and why it waits.
   The trace below is every event in plain words. Approving, editing, rejecting, retrying and cancelling call the
   database's own functions, which only the person who started the mission can use. */

type ViewId = "missions" | "approvals" | "history";
const TITLE: Record<ViewId, [string, string]> = {
  missions: ["Missions", "Work Kaju is doing for you, step by step. It runs as you and keeps going when this page is closed."],
  approvals: ["Approvals", "Steps waiting for you: changes to several records, messages outside StrayPaw, and decisions only a person can make."],
  history: ["History", "Finished and cancelled missions, with every step and decision kept."],
};
const inView = (v: ViewId, m: MissionRow) => v === "approvals" ? m.state === "waiting_person" || m.state === "blocked" : v === "history" ? m.state === "completed" || m.state === "cancelled" : !["completed", "cancelled"].includes(m.state);

function StepIcon({ s }: { s: StepRow }) {
  const calm = useReducedMotion();
  if (s.state === "done") return <motion.span className="nx-rs is-done" initial={calm ? false : { scale: .6 }} animate={{ scale: 1 }}><Tick size={11} strokeWidth={3} /></motion.span>;
  if (s.state === "running") return <span className="nx-rs is-run"><Loader2 size={12} className="nx-spin" /></span>;
  if (s.state === "retrying") return <span className="nx-rs is-retry"><Clock3 size={12} /></span>;
  if (s.state === "waiting_approval") return <span className="nx-rs is-wait"><Hand size={12} /></span>;
  if (s.state === "waiting_person") return <span className="nx-rs is-wait"><UserRound size={12} /></span>;
  if (s.state === "failed") return <span className="nx-rs is-bad"><AlertTriangle size={12} /></span>;
  return <span className={`nx-rs ${s.state === "cancelled" || s.state === "skipped" ? "is-off" : ""}`} />;
}
const STEP_WORD: Record<string, string> = { todo: "Not started", running: "Running", done: "Done", waiting_approval: "Waiting for your approval", waiting_person: "A person does this", retrying: "Will try again", failed: "Failed", skipped: "Skipped", cancelled: "Cancelled" };
const LEVEL: Record<number, string> = { 0: "reads", 1: "drafts", 2: "runs on its own", 3: "asks first", 4: "person only", 9: "switched off" };
function inWords(ms: number) { const m = Math.round(ms / 6e4); return m <= 0 ? "in under a minute" : m === 1 ? "in 1 minute" : `in ${m} minutes`; }
function resultLine(s: StepRow) {
  const r = s.result ?? {};
  if (typeof r.found === "number") return `Found ${r.found}${typeof r.already_open === "number" && r.already_open ? `; ${r.already_open} already had an open follow-up` : ""}`;
  if (typeof r.created === "number") return `Created ${r.created}${typeof r.considered === "number" && r.considered !== r.created ? ` of ${r.considered}` : ""}${r.deduplicated ? " (already done, not repeated)" : ""}`;
  if (r.message_id) return "Posted";
  if (typeof r.notified === "number") return `Notified ${r.notified}`;
  if (r.outbox_id) return "Queued. Sent only through a connected account";
  if (r.task_id) return "Task created";
  return null;
}

/** Editable fields of a step waiting for approval: only the words a person would change, never its tool. */
const EDITABLE: Record<string, string[]> = { post_message: ["body"], send_external: ["to", "subject", "body"], create_task: ["title", "note", "due_on"], create_followup_tasks: ["team"], notify_members: ["title", "body"] };

function Run({ m, onChange }: { m: MissionRow; onChange: () => void }) {
  const steps = useMemo(() => [...m.nx_mission_steps].sort((a, b) => a.position - b.position), [m]);
  const events = useMissionEvents(m.id, m.updated_at);
  const { busy, run } = useAct();
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const [reject, setReject] = useState<StepRow | null>(null);
  const [note, setNote] = useState("");
  const [cancel, setCancel] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(t); }, []);
  const [w, tone] = missionState(m.state);
  const waiting = steps.find((s) => s.state === "waiting_approval" || s.state === "waiting_person");
  const failed = steps.find((s) => s.state === "failed");
  const done = steps.filter((s) => s.state === "done").length;
  const decide = (s: StepRow, d: "approve" | "done", input?: Record<string, unknown> | null) =>
    run(`d${s.id}`, async () => decideStep(s.id, d, input ?? null, d === "done" ? note || null : null), { ok: d === "done" ? "Marked done. The mission continues." : "Approved. Kaju is carrying on." }).then(() => { setEdit(null); setNote(""); onChange(); });

  return (
    <article className="nx-run" aria-label={m.title}>
      <div className="nx-run-h">
        <div><h2>{m.title}</h2><p className="nx-t3">Started {dayTime(m.created_at)} · {done} of {steps.length} steps done{m.deadline ? ` · due ${dayTime(m.deadline)}` : ""}</p></div>
        <Chip tone={tone}>{w}</Chip>
      </div>
      <div className="nx-run-bar" aria-hidden><motion.span initial={false} animate={{ width: `${(done / Math.max(1, steps.length)) * 100}%` }} transition={{ duration: .3 }} /></div>
      <ol className="nx-run-steps">
        {steps.map((s) => {
          const r = resultLine(s);
          return (
            <li key={s.id} className={`is-${s.state}`}>
              <StepIcon s={s} />
              <div className="nx-run-s">
                <div className="nx-run-sh"><b>{s.label}</b><small>{STEP_WORD[s.state] ?? s.state}{s.level !== null && s.level !== undefined ? ` · ${LEVEL[s.level] ?? ""}` : ""}{s.attempts > 1 ? ` · try ${s.attempts} of ${s.max_attempts}` : ""}</small></div>
                {r ? <p className="nx-run-r">{r}</p> : null}
                {s.state === "retrying" && s.next_attempt_at ? <p className="nx-run-r is-warn">Last try failed: {s.error}. Trying again {inWords(Date.parse(s.next_attempt_at) - now)}.</p> : null}
                {s.state === "failed" ? <p className="nx-run-r is-bad">Stopped after {s.attempts} tries: {s.error}. Nothing after this step ran.</p> : null}
                {s.state === "waiting_approval" ? <div className="nx-run-ask">
                  <p><b>Why approval?</b> {s.why ?? "This step changes several records or reaches outside StrayPaw."}</p>
                  {EDITABLE[s.tool ?? ""] && edit ? <div className="nx-fields">{EDITABLE[s.tool ?? ""].map((f) => <label key={f} className={`nx-field ${f === "body" || f === "note" ? "is-wide" : ""}`}><span>{f === "body" ? "Words" : f === "due_on" ? "Due" : f.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}</span>{f === "body" || f === "note" ? <textarea value={edit[f] ?? ""} onChange={(e) => setEdit({ ...edit, [f]: e.target.value })} /> : <input type={f === "due_on" ? "date" : "text"} value={edit[f] ?? ""} onChange={(e) => setEdit({ ...edit, [f]: e.target.value })} />}</label>)}</div> : null}
                  <div className="nx-run-act">
                    <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void decide(s, "approve", edit ? { ...s.input, ...Object.fromEntries(Object.entries(edit).filter(([, v]) => v !== "")) } : null)}>{busy === `d${s.id}` ? <Loader2 size={12} className="nx-spin" /> : null}{edit ? "Approve with changes" : "Approve"}</button>
                    {EDITABLE[s.tool ?? ""] && !edit ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setEdit(Object.fromEntries(EDITABLE[s.tool ?? ""].map((f) => [f, String(s.input?.[f] ?? "")])))}>Edit first</button> : null}
                    <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setReject(s)}>Reject</button>
                  </div>
                </div> : null}
                {s.state === "waiting_person" ? <div className="nx-run-ask">
                  <p><b>A person does this.</b> {s.why ?? "Kaju never makes this decision."} Do it where it belongs, then mark it done here.</p>
                  <label className="nx-field"><span>What was done (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Decided and signed by the reviewer" /></label>
                  <div className="nx-run-act"><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void decide(s, "done")}>I did it</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setReject(s)}>Stop the mission</button></div>
                </div> : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="nx-run-f">
        {failed ? <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void run("retry", () => retryMission(m.id), { ok: "Trying the failed step again. Anything it already did is not repeated." }).then(onChange)}><RotateCcw size={12} />Retry the failed step</button> : null}
        {!["completed", "cancelled"].includes(m.state) ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setCancel(true)}><X size={12} />Cancel mission</button> : null}
        {waiting ? null : m.state === "completed" ? <span className="nx-t3">Every step is done.</span> : null}
      </div>
      <details className="nx-trace" open={m.state === "blocked"}>
        <summary>Trace{events ? ` · ${events.length} events` : ""}</summary>
        {events === null ? <Skeleton rows={3} /> : <ol>{events.map((e) => <li key={e.id} className={`k-${e.kind}`}><time>{new Date(e.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}</time><span>{e.message}</span></li>)}</ol>}
      </details>
      {reject ? <Confirm title="Reject this step?" confirm="Reject and stop" danger busy={!!busy} onClose={() => setReject(null)} onConfirm={() => void run("rej", () => decideStep(reject.id, "reject", null, note || null), { ok: "Rejected. Nothing after it ran." }).then(() => { setReject(null); onChange(); })}>
        <p>“{reject.label}” will not run, and the steps after it stop. What already happened stays as it is.</p>
        <label className="nx-field"><span>Reason (kept in the trace)</span><input value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></label>
      </Confirm> : null}
      {cancel ? <Confirm title="Cancel this mission?" confirm="Cancel mission" danger busy={!!busy} onClose={() => setCancel(false)} onConfirm={() => void run("can", () => cancelMission(m.id), { ok: "Cancelled. Queued messages to outside people were cancelled too." }).then(() => { setCancel(false); onChange(); })}>
        <p>Steps not yet done stop now, including any message queued for someone outside StrayPaw. Work already done stays.</p>
      </Confirm> : null}
    </article>
  );
}

function LiveMissions({ view }: { view: ViewId }) {
  const live = useLive();
  const router = useRouter();
  const sp = useSearchParams();
  const list = useMissionList(live.org?.org_id ?? null);
  const shown = (list.rows ?? []).filter((m) => inView(view, m));
  const sel = sp.get("m");
  const open = (list.rows ?? []).find((m) => m.id === sel) ?? shown[0] ?? null;
  useEffect(() => { void runMine().then(() => list.reload()); /* run anything due while the person is here */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [t, sub] = TITLE[view];
  return (
    <Shell ws="kaju" crumb={["Kaju", t]}>
      <div className="nx-page nx-runs-page" style={{ maxWidth: "none" }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{live.org?.name}</p><h1 className="nx-h1">{t}</h1><p className="nx-sub">{sub}</p></div><Link href="/next/kaju" className="nx-btn is-quiet"><Sparkles size={13} />New mission</Link></div>
        {list.error ? <Failed error={errText(list.error)} retry={list.reload} /> : list.rows === null ? <Skeleton /> : !shown.length && !open ? <Empty title={view === "approvals" ? "Nothing is waiting for you" : view === "history" ? "No finished missions yet" : "No missions running"} hint={view === "missions" ? "Hand Kaju an outcome from the Kaju page or the panel (⌘J)." : undefined} action={view !== "missions" ? <Link className="nx-btn is-quiet" href="/next/kaju/missions">All missions</Link> : <Link className="nx-btn" href="/next/kaju">Ask Kaju</Link>} /> : (
          <div className="nx-runs">
            <ul className="nx-runs-l" aria-label={t}>
              {shown.map((m) => { const [w, tone] = missionState(m.state); const steps = m.nx_mission_steps; const d = steps.filter((s) => s.state === "done").length; return (
                <li key={m.id}><button type="button" className={open?.id === m.id ? "is-on" : ""} onClick={() => router.replace(`?m=${m.id}`, { scroll: false })}><b>{m.title}</b><small><Chip tone={tone}>{w}</Chip> {d}/{steps.length} · {dayTime(m.updated_at)}</small></button></li>); })}
            </ul>
            <AnimatePresence mode="wait">{open ? <motion.div key={open.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .12 }}><Run m={open} onChange={list.reload} /></motion.div> : null}</AnimatePresence>
          </div>
        )}
      </div>
    </Shell>
  );
}

function SampleMissions({ view }: { view: ViewId }) {
  const [t, sub] = TITLE[view];
  const rows = view === "history" ? MISSIONS_DONE : MISSIONS.filter((m) => view !== "approvals" || m.act);
  return (
    <Shell ws="kaju" crumb={["Kaju", t]}>
      <div className="nx-page">
        <div className="nx-head"><div><p className="nx-eyebrow">Sample missions<Sample /></p><h1 className="nx-h1">{t}</h1><p className="nx-sub">{sub}</p></div><Link href="/try" className="nx-btn" title="Opens the live demo, where this works">Try a live mission</Link></div>
        <div className="nx-runs-l is-flat">{rows.map((m) => <article key={m.id} className="nx-run"><div className="nx-run-h"><div><h2>{m.title}</h2><p className="nx-t3">{m.meta}</p></div><Chip tone={m.tone}>{m.state}</Chip></div>
          <ol className="nx-run-steps">{m.steps.map((s, i) => <li key={i} className={`is-${s.state === "done" ? "done" : s.state === "wait" ? "waiting_approval" : s.state === "run" ? "running" : "todo"}`}><span className={`nx-rs ${s.state === "done" ? "is-done" : s.state === "wait" ? "is-wait" : ""}`}>{s.state === "done" ? <Tick size={11} strokeWidth={3} /> : s.state === "wait" ? <Hand size={12} /> : null}</span><div className="nx-run-s"><b>{s.text}</b></div></li>)}</ol></article>)}</div>
      </div>
    </Shell>
  );
}

export function Missions({ view }: { view: ViewId }) {
  const live = useLive();
  if (!live.ready) return <Shell ws="kaju" crumb={["Kaju", TITLE[view][0]]}><div className="nx-page"><Skeleton /></div></Shell>;
  if (!live.org) return <SampleMissions view={view} />;
  return <Suspense fallback={<Shell ws="kaju" crumb={["Kaju", TITLE[view][0]]}><div className="nx-page"><Skeleton /></div></Shell>}><LiveMissions view={view} /></Suspense>;
}

