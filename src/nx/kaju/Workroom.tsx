"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Bell, CalendarClock, Hand, Hash, ListChecks, Loader2, Mail, Plus, RotateCcw, Search, UserRound, X } from "lucide-react";
import { shortCode } from "@/lib/caseCode";
import { Kaju as Puppy } from "@/kaju/Kaju";
import type { KajuState } from "@/kaju/poses";
import { TOOLS, type ToolName } from "@/lib/kaju/registry";
import { DECIDER, FIELDS, cleanInput, effect, shortDate } from "@/lib/kaju/capabilities";
import { Confirm, Skeleton, toast, useAct } from "../kit";
import { setTaskDone, useLive } from "../live";
import { cancelMission, decideStep, retryMission, useKajuVocab, type EventRow, type MissionRow, type StepRow } from "./data";
import { casesOf, plannedFrom, useArtifacts, useCapabilities, useMission, type Artifacts } from "./work";
import { DutyChip, Progress, StateDot, StepGlyph, clock, missionWord, stepTone, stepWord, when } from "./bits";
import { EmailDraft, StepArtifacts, type OnTask } from "./Artifacts";
import { StepFields } from "./StepFields";
import { PlanCard } from "./Plan";
import { useKaju, type Planned } from "./state";
import type { Vocab } from "./intent";
import "./workspace.css";

/* A mission's workroom: the plan as it runs, and the real things each step made, as they are made. Kaju's steps show
   whether they are working, waiting, blocked or done; a step that needs a person says exactly what will change and
   waits; every event is kept below. Only the person who started a mission sees it and decides its steps. */

const EASE = [0.2, 0.7, 0.2, 1] as const;
const inMinutes = (ms: number) => { const m = Math.round(ms / 6e4); return m <= 0 ? "in under a minute" : m === 1 ? "in 1 minute" : `in ${m} minutes`; };
const puppy = (state: string): KajuState => (state === "running" || state === "ready" ? "thinking" : state === "completed" ? "success" : state === "blocked" ? "concerned" : state === "waiting_person" ? "listening" : "sitting");

export function Workroom({ id, embedded, onChanged }: { id: string; embedded?: boolean; onChanged?: () => void }) {
  const { row, events, error, reload } = useMission(id);
  if (error) return <div className="kj-room-empty" role="alert"><p>This mission could not be read just now.</p><button type="button" className="kj-btn is-quiet is-sm" onClick={reload}>Try again</button></div>;
  if (row === undefined) return <div className="kj-room"><Skeleton rows={6} label="Opening the mission" /></div>;
  if (row === null) return <div className="kj-room-empty"><p><b>This mission is not here.</b> Missions are seen only by the person who started them, and this one is not yours or no longer exists.</p><Link className="kj-btn is-quiet is-sm" href="/kaju/missions">Your missions</Link></div>;
  return <Room m={row} events={events} embedded={embedded} reload={() => { reload(); onChanged?.(); }} />;
}

function Room({ m, events, embedded, reload }: { m: MissionRow; events: EventRow[] | null; embedded?: boolean; reload: () => void }) {
  const live = useLive();
  const k = useKaju();
  const router = useRouter();
  const calm = useReducedMotion();
  const { art, reload: reloadArt } = useArtifacts(m);
  const onTask = async (t: { id: string }, done: boolean) => { const r = await setTaskDone(t.id, done, live.userId); if (r.error) { toast({ text: `Not saved: ${r.error.message}`, tone: "bad" }); return false; } reloadArt(); return true; };
  const { caps } = useCapabilities(true);
  const emailLive = caps ? caps.items.find((c) => c.id === "mission_email")?.state === "live" : null;
  const vocab = useKajuVocab(m.org_id, live.org?.org_id === m.org_id ? live.org.workspace : null);
  const steps = useMemo(() => [...m.nx_mission_steps].sort((a, b) => a.position - b.position), [m]);
  const { busy, run } = useAct();
  const [cancel, setCancel] = useState(false);
  const [again, setAgain] = useState<Planned | null>(null);
  const [starting, setStarting] = useState(false);
  const [word] = missionWord(m.state);
  const done = steps.filter((s) => s.state === "done").length;
  const failed = steps.find((s) => s.state === "failed");
  const closed = ["completed", "cancelled"].includes(m.state);
  const request = typeof m.request?.text === "string" ? m.request.text : null;
  const planner = m.request?.planner === "model" ? "Planned with a model" : m.source === "channel" ? "Started from a channel" : "Planned by fixed rules";
  const repeatable = closed && steps.every((s) => s.tool && s.tool in TOOLS);
  const Title = embedded ? "h2" : "h1";
  const lastAt = (s: StepRow) => [...(events ?? [])].reverse().find((e) => e.step_id === s.id)?.at ?? s.finished_at ?? s.started_at;

  const runAgain = async () => {
    const plan = { title: m.title, steps: steps.map((s) => ({ label: s.label, tool: s.tool as ToolName, input: s.input ?? {} })) };
    setAgain(await plannedFrom(m.org_id, plan, request ?? m.title));
  };
  const startAgain = async (p: Planned) => {
    setStarting(true); const r = await k.start(m.org_id, p); setStarting(false);
    if (r.id) { setAgain(null); router.push(`/kaju/missions/${r.id}`); } else toast({ text: r.error ?? "Not started.", tone: "bad" });
  };

  return (
    <article className={`kj-room ${embedded ? "is-embedded" : ""}`} aria-label={m.title}>
      <header className="kj-room-h">
        <div className="kj-room-hl">
          {!embedded ? <Link href="/kaju/missions" className="kj-back"><ArrowLeft size={14} />Missions</Link> : null}
          <p className="kj-eyebrow kj-live" aria-live="polite"><StateDot state={m.state} /><b>{word}</b><span>· {planner} · started {when(m.created_at)}</span></p>
          <Title className="kj-room-title">{m.title}</Title>
          {request && request.trim() !== m.title.trim() ? <p className="kj-plan-ask">You asked: “{request}”</p> : null}
          <div className="kj-room-meta">
            <Progress steps={steps} />
            <span>{done} of {steps.length} {steps.length === 1 ? "step" : "steps"} done</span>
            {m.deadline ? <span className={Date.parse(m.deadline) < Date.now() && !closed ? "is-late" : ""}><CalendarClock size={13} />Finish by {shortDate(m.deadline)}</span> : null}
          </div>
          <div className="kj-room-act">
            {failed ? <button type="button" className="kj-btn is-sm" disabled={!!busy} onClick={() => void run("retry", () => retryMission(m.id), { ok: "Trying the stopped step again. Steps already done are kept and not repeated." }).then(reload)}>{busy === "retry" ? <Loader2 size={13} className="nx-spin" /> : <RotateCcw size={13} />}Retry the stopped step</button> : null}
            {!closed ? <button type="button" className="kj-btn is-quiet is-sm" onClick={() => setCancel(true)}><X size={13} />Cancel mission</button> : null}
            {repeatable && !again ? <button type="button" className="kj-btn is-quiet is-sm" onClick={() => void runAgain()}><RotateCcw size={13} />Run it again</button> : null}
          </div>
        </div>
        {!embedded ? <div className="kj-room-pup" aria-hidden><Puppy state={puppy(m.state)} size={88} /></div> : null}
      </header>

      <AnimatePresence>{again ? <motion.div key="again" initial={calm ? { opacity: 0 } : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .22, ease: EASE }} className="kj-again">
        <p className="kj-quiet">A new mission from the same steps. Cases that already have an open follow-up are skipped, so only new ones get tasks.</p>
        <PlanCard planned={again} vocab={vocab} busy={starting} onStart={(p) => void startAgain(p)} onDiscard={() => setAgain(null)} />
      </motion.div> : null}</AnimatePresence>

      <div className="kj-room-cols">
        <ol className="kj-steps" aria-label="Steps">
          {steps.map((s, i) => <StepBlock key={s.id} s={s} i={i} steps={steps} art={art} vocab={vocab} emailLive={emailLive} at={lastAt(s)} reload={reload} onTask={onTask} />)}
        </ol>
        <aside className="kj-room-side">
          <Produced steps={steps} art={art} closed={closed} />
          <Activity events={events} />
        </aside>
      </div>
      {cancel ? <Confirm title="Cancel this mission?" confirm="Cancel mission" danger busy={!!busy} onClose={() => setCancel(false)} onConfirm={() => void run("can", () => cancelMission(m.id), { ok: "Cancelled. Anything queued for someone outside StrayPaw was cancelled too." }).then(() => { setCancel(false); reload(); })}>
        <p>Steps not yet done stop now, including any message queued for someone outside StrayPaw. What is already done stays: {done ? `${done} ${done === 1 ? "step" : "steps"} and what they made` : "nothing has been made yet"}.</p>
      </Confirm> : null}
    </article>
  );
}

function StepBlock({ s, i, steps, art, vocab, emailLive, at, reload, onTask }: { s: StepRow; i: number; steps: StepRow[]; art: Artifacts; vocab: Vocab; emailLive: boolean | null; at: string | null; reload: () => void; onTask: OnTask }) {
  const calm = useReducedMotion();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (s.state !== "retrying") return; const t = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(t); }, [s.state]);
  const tone = stepTone(s.state);
  const level = s.level ?? (s.tool && s.tool in TOOLS ? TOOLS[s.tool as ToolName].level : 2);
  const names = (id: string) => art.people.get(id) ?? null;
  const pending = s.state === "todo";
  return (
    <motion.li id={`kj-step-${s.id}`} className={`kj-step s-${s.state}`} initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .24, ease: EASE, delay: calm ? 0 : Math.min(i, 8) * .05 }}>
      <div className="kj-step-rail"><StepGlyph state={s.state} n={i + 1} /></div>
      <div className="kj-step-b">
        <div className="kj-step-t">
          <b>{s.label}</b>
          {s.tool ? <DutyChip tool={s.tool} level={level} compact /> : null}
          <span className={`kj-step-w t-${tone}`}>{stepWord(s)}{s.state === "done" && at ? ` · ${clock(at)}` : (s.state === "waiting_approval" || s.state === "waiting_person") && at ? ` since ${when(at)}` : ""}{s.attempts > 1 && s.state !== "done" ? ` · try ${s.attempts} of ${s.max_attempts}` : ""}</span>
        </div>
        {pending && s.tool ? <p className="kj-step-e">{effect(s.tool, s.input ?? {}, names)}</p> : null}
        {s.state === "running" ? <p className="kj-step-e is-live">Working on it now.</p> : null}
        {s.state === "retrying" ? <p className="kj-step-e is-warn">Last try did not work: {s.error}. Trying again {s.next_attempt_at ? inMinutes(Date.parse(s.next_attempt_at) - now) : "soon"}. Nothing it already did is repeated.</p> : null}
        {s.state === "failed" ? <p className="kj-step-e is-bad">Stopped after {s.attempts} {s.attempts === 1 ? "try" : "tries"}: {s.error}. Nothing after this step ran.</p> : null}
        {(s.state === "skipped" || s.state === "cancelled") && s.note ? <p className="kj-step-e">Rejected: {s.note}</p> : null}
        {s.state === "waiting_approval" ? <Approval s={s} steps={steps} vocab={vocab} names={names} emailLive={emailLive} reload={reload} /> : null}
        {s.state === "waiting_person" ? <PersonStep s={s} reload={reload} /> : null}
        <StepArtifacts s={s} steps={steps} art={art} emailLive={emailLive} onTask={onTask} />
      </div>
    </motion.li>
  );
}

/** What approving changes, shown as the records it will make, not as a description of them. */
function Change({ s, steps, input, names, emailLive }: { s: StepRow; steps: StepRow[]; input: Record<string, unknown>; names: (id: string) => string | null; emailLive: boolean | null }) {
  if (s.tool === "create_followup_tasks") {
    const from = steps.find((x) => x.position === (Number(input.from_step) || 1));
    const cases = from ? casesOf(from) : [];
    const team = typeof input.team === "string" && input.team.trim() ? input.team.trim() : null;
    if (!cases.length) return <p className="kj-change-l">No case needs a task, so approving creates nothing.</p>;
    return (
      <div>
        <p className="kj-change-l">Adds {cases.length === 1 ? "1 follow-up task" : `${cases.length} follow-up tasks`}{team ? `, for ${team}` : ", not assigned"}:</p>
        <ul className="kj-will">{cases.slice(0, 6).map((c) => <li key={c.id}><span className="kj-will-i" aria-hidden><Plus size={11} strokeWidth={2.5} /></span><span>Follow up: {c.title}</span><small>{[shortCode(c.code, "Case"), c.due ? `due ${shortDate(c.due)}` : null].filter(Boolean).join(" · ")}</small></li>)}</ul>
        {cases.length > 6 ? <p className="kj-quiet">And {cases.length - 6} more.</p> : null}
      </div>
    );
  }
  if (s.tool === "send_external") return <EmailDraft to={String(input.to ?? "")} subject={input.subject as string | undefined} body={String(input.body ?? "")} channel={String(input.channel ?? "email")} waiting emailLive={emailLive} />;
  return <p className="kj-change-l">{effect(s.tool ?? "", input, names)}</p>;
}

function Approval({ s, steps, vocab, names, emailLive, reload }: { s: StepRow; steps: StepRow[]; vocab: Vocab; names: (id: string) => string | null; emailLive: boolean | null; reload: () => void }) {
  const { busy, run } = useAct();
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [reject, setReject] = useState(false);
  const [note, setNote] = useState("");
  const editable = !!FIELDS[s.tool as ToolName]?.length;
  const input = edit ?? s.input ?? {};
  const approve = () => run(`a${s.id}`, () => decideStep(s.id, "approve", edit ? cleanInput(edit) : null), { ok: edit ? "Approved with your changes. Kaju is carrying on." : "Approved. Kaju is carrying on." }).then((r) => { if (r.ok) { setEdit(null); reload(); } });
  return (
    <div className="kj-ask is-you" role="group" aria-label={`Approval: ${s.label}`}>
      <p className="kj-ask-h"><Hand size={14} />Waiting for your approval</p>
      <p className="kj-ask-why">{s.why ?? "It changes several records or reaches outside StrayPaw."}</p>
      <div className="kj-change"><p className="kj-change-h">What will change</p><Change s={s} steps={steps} input={input} names={names} emailLive={emailLive} /></div>
      {edit ? <StepFields tool={s.tool ?? ""} value={edit} vocab={vocab} idBase={`ke-${s.id}`} onChange={setEdit} /> : null}
      <div className="kj-ask-a">
        <button type="button" className="kj-btn" disabled={!!busy} onClick={() => void approve()}>{busy === `a${s.id}` ? <Loader2 size={14} className="nx-spin" /> : null}{edit ? "Approve with changes" : "Approve"}</button>
        {editable && !edit ? <button type="button" className="kj-btn is-quiet" onClick={() => setEdit({ ...(s.input ?? {}) })}>Edit first</button> : null}
        {edit ? <button type="button" className="kj-btn is-quiet" onClick={() => setEdit(null)}>Undo changes</button> : null}
        <button type="button" className="kj-btn is-quiet" onClick={() => setReject(true)}>Reject</button>
      </div>
      {reject ? <Confirm title="Reject this step?" confirm="Reject and stop" danger busy={!!busy} onClose={() => setReject(false)} onConfirm={() => void run("rej", () => decideStep(s.id, "reject", null, note || null), { ok: "Rejected. Nothing after it ran." }).then(() => { setReject(false); reload(); })}>
        <p>“{s.label}” will not run, and the steps after it stop. What already happened stays as it is.</p>
        <label className="kj-field"><span>Reason (kept in the activity)</span><input value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></label>
      </Confirm> : null}
    </div>
  );
}

function PersonStep({ s, reload }: { s: StepRow; reload: () => void }) {
  const { busy, run } = useAct();
  const [note, setNote] = useState("");
  const [stop, setStop] = useState(false);
  const who = DECIDER[s.tool as keyof typeof DECIDER] ?? "A person";
  const ask = typeof s.input?.note === "string" ? s.input.note : null;
  const href = typeof s.input?.href === "string" ? s.input.href : null;
  return (
    <div className="kj-ask is-person" role="group" aria-label={`${who}: ${s.label}`}>
      <p className="kj-ask-h"><UserRound size={14} />{who} decides</p>
      <p className="kj-ask-why">{s.why ?? "Kaju never makes this decision."} When it has been decided where it belongs, mark it done here and Kaju carries on with the next step.</p>
      {ask ? <div className="kj-change"><p className="kj-change-h">What to decide</p><p className="kj-change-l">{ask}</p></div> : null}
      {href ? <div className="kj-ask-link"><Link className="kj-chiplink" href={href}>Open where it is decided<ArrowUpRight size={12} /></Link></div> : null}
      <label className="kj-field"><span>What was decided (optional, kept in the activity)</span><input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Decided and signed by the reviewer" /></label>
      <div className="kj-ask-a">
        <button type="button" className="kj-btn" disabled={!!busy} onClick={() => void run(`d${s.id}`, () => decideStep(s.id, "done", null, note || null), { ok: "Marked done. The mission continues." }).then((r) => { if (r.ok) { setNote(""); reload(); } })}>{busy === `d${s.id}` ? <Loader2 size={14} className="nx-spin" /> : null}I did it</button>
        <button type="button" className="kj-btn is-quiet" onClick={() => setStop(true)}>Stop the mission</button>
      </div>
      {stop ? <Confirm title="Stop this mission?" confirm="Stop the mission" danger busy={!!busy} onClose={() => setStop(false)} onConfirm={() => void run("stop", () => decideStep(s.id, "reject", null, note || null), { ok: "Stopped. Nothing after it ran." }).then(() => { setStop(false); reload(); })}>
        <p>“{s.label}” is left undecided and the steps after it stop. What already happened stays.</p>
      </Confirm> : null}
    </div>
  );
}

/** Everything the mission has made so far, as a list that jumps to each one. */
function Produced({ steps, art, closed }: { steps: StepRow[]; art: Artifacts; closed: boolean }) {
  const found = steps.filter((s) => ["find_due_followups", "find_overdue_cases", "read_cases"].includes(s.tool ?? "") && s.state === "done").reduce((a, s) => a + (typeof s.result?.found === "number" ? (s.result.found as number) : casesOf(s).length), 0);
  const notified = steps.filter((s) => s.tool === "notify_members" && s.state === "done").reduce((a, s) => a + (typeof s.result?.notified === "number" ? (s.result.notified as number) : 0), 0);
  const drafts = steps.filter((s) => s.tool === "send_external" && (s.state === "waiting_approval" || s.state === "done")).length;
  const step = (tools: string[]) => steps.find((s) => tools.includes(s.tool ?? "") && (s.state === "done" || s.state === "waiting_approval"));
  const go = (s?: StepRow) => (s ? `#kj-step-${s.id}` : undefined);
  const doneTasks = art.tasks.filter((t) => t.state === "done").length;
  const items: [React.ReactNode, string, string, string | undefined][] = [];
  if (found) items.push([<Search key="f" size={13} />, "Cases found", String(found), go(step(["find_due_followups", "find_overdue_cases", "read_cases"]))]);
  if (art.tasks.length) items.push([<ListChecks key="t" size={13} />, "Tasks created", doneTasks ? `${art.tasks.length} · ${doneTasks} done` : String(art.tasks.length), go(step(["create_task", "create_followup_tasks", "create_tasks"]))]);
  if (art.messages.length) items.push([<Hash key="m" size={13} />, "Messages posted", String(art.messages.length), go(step(["post_message"]))]);
  if (notified) items.push([<Bell key="n" size={13} />, "People notified", String(notified), go(step(["notify_members"]))]);
  if (drafts) items.push([<Mail key="e" size={13} />, "Emails prepared", String(drafts), go(step(["send_external"]))]);
  return (
    <section className="kj-side-sec" aria-labelledby="kj-prod">
      <h2 id="kj-prod">Produced</h2>
      {items.length ? <ul className="kj-prod">{items.map(([icon, label, n, href]) => <li key={label}>{href ? <a href={href}>{icon}<span>{label}</span><b>{n}</b></a> : <span className="kj-prod-x">{icon}<span>{label}</span><b>{n}</b></span>}</li>)}</ul>
        : <p className="kj-quiet">{closed ? "This mission made no records, messages or drafts." : "Nothing yet. Each record, message and draft appears here, and under its step, as it is made."}</p>}
    </section>
  );
}

const KIND_TONE: Record<string, string> = { succeeded: "ok", completed: "ok", approved: "ok", person_done: "ok", failed: "bad", blocked: "bad", deadline: "bad", retry_scheduled: "warn", waiting_approval: "warn", waiting_person: "warn", rejected: "bad", cancelled: "plain", edited: "accent", recovered: "accent", deduplicated: "plain", created: "accent", started: "accent", policy: "plain" };
function Activity({ events }: { events: EventRow[] | null }) {
  const calm = useReducedMotion();
  return (
    <section className="kj-side-sec" aria-labelledby="kj-act">
      <h2 id="kj-act">Activity{events ? <span className="kj-count">{events.length}</span> : null}</h2>
      {events === null ? <Skeleton rows={3} /> : !events.length ? <p className="kj-quiet">Nothing recorded yet.</p> : (
        <ol className="kj-evs" tabIndex={0} aria-label="Everything that happened, oldest first">{events.map((e, i) => (
          <motion.li key={e.id} className={`t-${KIND_TONE[e.kind] ?? "plain"}`} initial={calm || i < events.length - 3 ? false : { opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .2, ease: EASE }}>
            <span className="kj-ev-d" aria-hidden /><p>{e.message}</p><time dateTime={e.at}>{when(e.at)}</time>
          </motion.li>))}</ol>)}
    </section>
  );
}
