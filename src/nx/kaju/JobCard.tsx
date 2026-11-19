"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Hand, Loader2, Maximize2, Plus, RotateCcw, UserRound } from "lucide-react";
import { shortCode } from "@/lib/caseCode";
import { TOOLS, type ToolName } from "@/lib/kaju/registry";
import { DECIDER, FIELDS, cleanInput, effect, shortDate } from "@/lib/kaju/capabilities";
import { KIND_WORD, recordHref, recordLinkOf, type RecordLink } from "@/lib/kaju/records";
import { isJobId, isOpen, jobLine, jobWord, plainWords, withJob } from "@/lib/kaju/jobs";
import { Confirm, Modal, Skeleton, toast, useAct } from "../kit";
import { Sheet } from "../Phone";
import { usePhone } from "../PhoneList";
import { setTaskDone, useLive } from "../live";
import { cancelMission, decideStep, retryMission, useKajuVocab, type EventRow, type MissionRow, type StepRow } from "./data";
import { casesOf, plannedFrom, useArtifacts, useCapabilities, useMission } from "./work";
import { StateDot, StepGlyph, ago, when } from "./bits";
import { EmailDraft, StepArtifacts } from "./Artifacts";
import { StepFields } from "./StepFields";
import { PlanCard } from "./Plan";
import { useKaju, type Planned } from "./state";
import "./workspace.css";
import "./rooms.css";
import "./jobs.css";

/* Kaju's work as one calm card, shown where it was asked (the conversation on Kaju's page and in the panel), on the
   record it is about, and over any page when the person opens it from Needs you, Today or History. The same card
   everywhere: what Kaju is doing in one line, the steps as a quiet checklist with their real state, what each step
   really made (cases found, tasks, the message, a prepared email) as small rows, and, when it waits for the person,
   exactly what approving changes with one Approve and a Reject. Every state is read from the database (nx_missions and
   its steps), kept current by realtime and polling; nothing is animated to look busy. Only the person who asked sees it
   and decides its steps (row-level security and the database's own functions). */

const EASE = [0.2, 0.7, 0.2, 1] as const;
const sorted = (m: MissionRow) => [...m.nx_mission_steps].sort((a, b) => a.position - b.position);

/** Open a piece of work over the page the person is on (the address carries ?job=<id>, so Back closes it). */
export function useOpenJob() {
  const router = useRouter();
  const path = usePathname();
  return useCallback((id: string) => {
    const search = typeof window === "undefined" ? "" : window.location.search;
    router.push(`${path}${withJob(search, id)}`, { scroll: false });
    window.dispatchEvent(new Event("sp:job")); // JobWatch reads the address again
  }, [router, path]);
}

/** The card, read and kept current by id. */
export function JobCard({ id, full, onOpen }: { id: string; full?: boolean; onOpen?: () => void }) {
  const { row, events, error, reload } = useMission(id);
  if (error) return <div className="kjb is-note" role="alert"><p>Kaju&apos;s work could not be read just now.</p><button type="button" className="kj-btn is-quiet is-sm" onClick={reload}>Try again</button></div>;
  if (row === undefined) return <div className="kjb is-note"><Skeleton rows={3} label="Reading Kaju's work" /></div>;
  if (row === null) return <div className="kjb is-note"><p><b>This is not here.</b> Kaju&apos;s work is seen only by the person who asked for it, and this is not yours or no longer exists.</p></div>;
  return <Job m={row} events={events} full={full} onOpen={onOpen} reload={reload} />;
}

function Job({ m, events, full, onOpen, reload }: { m: MissionRow; events: EventRow[] | null; full?: boolean; onOpen?: () => void; reload: () => void }) {
  const live = useLive();
  const k = useKaju();
  const calm = useReducedMotion();
  const steps = useMemo(() => sorted(m), [m]);
  const { art, reload: reloadArt } = useArtifacts(m);
  const { caps } = useCapabilities(true);
  const emailLive = caps ? caps.items.find((c) => c.id === "mission_email")?.state === "live" : null;
  const vocab = useKajuVocab(m.org_id, live.org?.org_id === m.org_id ? live.org.workspace : null);
  const { busy, run } = useAct();
  const [stop, setStop] = useState(false);
  const [again, setAgain] = useState<Planned | null>(null);
  const [starting, setStarting] = useState(false);
  const [word, tone] = jobWord(m.state, steps);
  const record = recordLinkOf(m.request?.record);
  const request = typeof m.request?.text === "string" ? m.request.text : null;
  const failed = steps.find((s) => s.state === "failed");
  const wait = steps.find((s) => s.state === "waiting_approval" || s.state === "waiting_person") ?? null;
  const open = isOpen(m.state);
  const repeatable = !open && steps.every((s) => s.tool && s.tool in TOOLS);
  const names = (pid: string) => art.people.get(pid) ?? null;
  const onTask = async (t: { id: string }, done: boolean) => { const r = await setTaskDone(t.id, done, live.userId); if (r.error) { toast({ text: `Not saved: ${r.error.message}`, tone: "bad" }); return false; } reloadArt(); return true; };
  /* The list an approval is about is shown once, in what approving changes, not again as the step's output. */
  const shownInChange = wait?.tool === "create_followup_tasks" ? Number(wait.input?.from_step) || 1 : null;
  const outputs = steps.filter((s) => s.position !== shownInChange || wait?.state !== "waiting_approval");
  const runAgain = async () => {
    const plan = { title: m.title, steps: steps.map((s) => ({ label: s.label, tool: s.tool as ToolName, input: s.input ?? {} })) };
    setAgain({ ...(await plannedFrom(m.org_id, plan, request ?? m.title)), record });
  };
  const startAgain = async (p: Planned) => {
    setStarting(true); const r = await k.start(m.org_id, p); setStarting(false);
    if (r.id) { setAgain(null); k.addJob(r.id, p.text); toast({ text: "Started again. Cases that already have an open follow-up are skipped.", tone: "ok" }); }
    else toast({ text: r.error ?? "Not started.", tone: "bad" });
  };

  return (
    <article className={`kjb t-${tone} ${full ? "is-full" : ""}`} aria-label={m.title}>
      <header className="kjb-h">
        <p className="kjb-state"><StateDot state={m.state} /><b aria-live="polite">{word}</b><span>{ago(m.updated_at)}</span></p>
        {onOpen ? <button type="button" className="kj-ib kjb-open" aria-label={`Open “${m.title}”`} title="Open" onClick={onOpen}><Maximize2 size={14} /></button> : null}
        <h3 className="kjb-t">{m.title}</h3>
        <p className="kjb-now">{jobLine(m.state, steps)}{m.deadline && open ? <span className={Date.parse(m.deadline) < Date.now() ? "is-late" : ""}> · finish by {shortDate(m.deadline)}</span> : null}</p>
        {record ? <div className="kjb-about"><RecordChip link={record} /></div> : null}
      </header>

      <ol className="kjb-steps" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s.id} className={`s-${s.state}`}>
            <StepGlyph state={s.state} n={i + 1} />
            <span className="kjb-step-t">{s.label}</span>
            <small className="kjb-step-w">{stepNote(s)}</small>
          </li>
        ))}
      </ol>

      <div className="kjb-out">
        {outputs.map((s) => <StepArtifacts key={s.id} s={s} steps={steps} art={art} emailLive={emailLive} onTask={onTask} more={full ? 5 : 3} />)}
      </div>

      <AnimatePresence initial={false}>
        {wait ? (
          <motion.div key={wait.id} initial={calm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2, ease: EASE }}>
            {wait.state === "waiting_approval" ? <Approval s={wait} steps={steps} vocab={vocab} names={names} emailLive={emailLive} reload={reload} /> : <PersonStep s={wait} reload={reload} />}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {failed ? <p className="kjb-bad" role="status">{failed.label} stopped after {failed.attempts} {failed.attempts === 1 ? "try" : "tries"}: {plainWords(failed.error)}. Nothing after it ran.</p> : null}

      {failed || (open && !wait) || (repeatable && full && !again) ? (
        <div className="kjb-f">
          {failed ? <button type="button" className="kj-btn is-sm" disabled={!!busy} onClick={() => void run("retry", () => retryMission(m.id), { ok: "Trying the stopped step again. Steps already done are not repeated." }).then(reload)}>{busy === "retry" ? <Loader2 size={13} className="nx-spin" /> : <RotateCcw size={13} />}Try again</button> : null}
          {open && !wait ? <button type="button" className="kj-link kjb-stop" onClick={() => setStop(true)}>Stop this</button> : null}
          {repeatable && full && !again ? <button type="button" className="kj-btn is-quiet is-sm" onClick={() => void runAgain()}><RotateCcw size={13} />Do it again</button> : null}
        </div>
      ) : null}

      <AnimatePresence>{again ? <motion.div key="again" className="kjb-again" initial={calm ? { opacity: 0 } : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2, ease: EASE }}>
        <PlanCard planned={again} vocab={vocab} busy={starting} compact onStart={(p) => void startAgain(p)} onDiscard={() => setAgain(null)} />
      </motion.div> : null}</AnimatePresence>

      {full ? <details className="kjb-log">
        <summary>Everything that happened{events ? <span className="kj-count"> {events.length}</span> : null}</summary>
        {events === null ? <Skeleton rows={2} /> : !events.length ? <p className="kj-quiet">Nothing recorded yet.</p> : (
          <ol aria-label="Everything that happened, oldest first">{events.map((e) => <li key={e.id}><p>{plainWords(e.message)}</p><time dateTime={e.at}>{when(e.at)}</time></li>)}</ol>
        )}
        <p className="kj-quiet">{request && request.trim() !== m.title.trim() ? <>You asked: “{request}”. </> : null}{m.request?.planner === "model" ? "Planned with a model." : m.source === "channel" ? "Asked for in a channel." : "Planned by fixed rules."} Started {when(m.created_at)}. Runs as you, with your permissions.</p>
      </details> : null}

      {stop ? <Confirm title="Stop this?" confirm="Stop it" danger busy={!!busy} onClose={() => setStop(false)} onConfirm={() => void run("can", () => cancelMission(m.id), { ok: "Stopped. Anything queued for someone outside StrayPaw was cancelled too." }).then(() => { setStop(false); reload(); })}>
        <p>Steps not yet done stop now, including any message queued for someone outside StrayPaw. What is already done stays.</p>
      </Confirm> : null}
    </article>
  );
}

/** The record the work is about, as a chip back to it. */
export function RecordChip({ link }: { link: RecordLink }) {
  return <Link className="kr-chip" href={recordHref(link)}><span className="kr-chip-k">{KIND_WORD[link.kind]}</span><span className="kr-chip-l">{link.label}</span><ArrowUpRight size={12} aria-hidden /></Link>;
}

/** A step's state in a few words, beside it in the checklist. */
function stepNote(s: StepRow) {
  switch (s.state) {
    case "done": return s.finished_at ? `Done ${when(s.finished_at)}` : "Done";
    case "running": return "Working";
    case "waiting_approval": return "Waits for you";
    case "waiting_person": return `Waits for ${(DECIDER[s.tool as keyof typeof DECIDER] ?? "a person").toLowerCase()}`;
    case "retrying": return "Will try again";
    case "failed": return "Stopped";
    case "skipped": case "cancelled": return s.note ? "Rejected" : "Did not run";
    default: return "";
  }
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

function Approval({ s, steps, vocab, names, emailLive, reload }: { s: StepRow; steps: StepRow[]; vocab: ReturnType<typeof useKajuVocab>; names: (id: string) => string | null; emailLive: boolean | null; reload: () => void }) {
  const { busy, run } = useAct();
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [reject, setReject] = useState(false);
  const [note, setNote] = useState("");
  const editable = !!FIELDS[s.tool as ToolName]?.length;
  const input = edit ?? s.input ?? {};
  const approve = () => run(`a${s.id}`, () => decideStep(s.id, "approve", edit ? cleanInput(edit) : null), { ok: edit ? "Approved with your changes. Kaju is carrying on." : "Approved. Kaju is carrying on." }).then((r) => { if (r.ok) { setEdit(null); reload(); } });
  return (
    <section className="kjb-ask" aria-label={`Waiting for your approval: ${s.label}`}>
      <p className="kjb-ask-h"><Hand size={14} aria-hidden />{s.why ?? "This step changes several records or reaches outside StrayPaw, so it waits for you."}</p>
      <div className="kj-change"><p className="kj-change-h">What approving changes</p><Change s={s} steps={steps} input={input} names={names} emailLive={emailLive} /></div>
      {edit ? <StepFields tool={s.tool ?? ""} value={edit} vocab={vocab} idBase={`ke-${s.id}`} onChange={setEdit} /> : null}
      <div className="kjb-ask-a">
        <button type="button" className="kj-btn" disabled={!!busy} onClick={() => void approve()}>{busy === `a${s.id}` ? <Loader2 size={14} className="nx-spin" /> : null}{edit ? "Approve with changes" : "Approve"}</button>
        <button type="button" className="kj-btn is-quiet" onClick={() => setReject(true)}>Reject</button>
        {editable && !edit ? <button type="button" className="kj-link" onClick={() => setEdit({ ...(s.input ?? {}) })}>Change first</button> : null}
        {edit ? <button type="button" className="kj-link" onClick={() => setEdit(null)}>Undo changes</button> : null}
      </div>
      {reject ? <Confirm title="Reject this step?" confirm="Reject" danger busy={!!busy} onClose={() => setReject(false)} onConfirm={() => void run("rej", () => decideStep(s.id, "reject", null, note || null), { ok: "Rejected. Nothing after it ran." }).then(() => { setReject(false); reload(); })}>
        <p>“{s.label}” will not run, and the steps after it stop. What already happened stays as it is.</p>
        <label className="kj-field"><span>Reason (optional, kept with this work)</span><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} autoFocus /></label>
      </Confirm> : null}
    </section>
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
    <section className="kjb-ask is-person" aria-label={`${who} decides: ${s.label}`}>
      <p className="kjb-ask-h"><UserRound size={14} aria-hidden />{who} decides: {s.label}</p>
      <p className="kjb-ask-why">{s.why ?? "Kaju never makes this decision."} Once it is decided where it belongs, mark it done here and Kaju carries on.</p>
      {ask ? <div className="kj-change"><p className="kj-change-h">What to decide</p><p className="kj-change-l">{ask}</p></div> : null}
      <label className="kj-field"><span>What was decided (optional)</span><input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Decided and signed by the reviewer" /></label>
      <div className="kjb-ask-a">
        <button type="button" className="kj-btn" disabled={!!busy} onClick={() => void run(`d${s.id}`, () => decideStep(s.id, "done", null, note || null), { ok: "Marked done. Kaju is carrying on." }).then((r) => { if (r.ok) { setNote(""); reload(); } })}>{busy === `d${s.id}` ? <Loader2 size={14} className="nx-spin" /> : null}It is done</button>
        {href ? <Link className="kj-btn is-quiet" href={href}>Open where it is decided<ArrowUpRight size={14} /></Link> : null}
        <button type="button" className="kj-link" onClick={() => setStop(true)}>Stop this</button>
      </div>
      {stop ? <Confirm title="Stop this?" confirm="Stop it" danger busy={!!busy} onClose={() => setStop(false)} onConfirm={() => void run("stop", () => decideStep(s.id, "reject", null, note || null), { ok: "Stopped. Nothing after it ran." }).then(() => { setStop(false); reload(); })}>
        <p>“{s.label}” is left undecided and the steps after it stop. What already happened stays.</p>
      </Confirm> : null}
    </section>
  );
}

/* ── Short lists: "Waiting for you" and "Kaju is working on" ─────────────────────────────────────────────────── */
/** A row for one piece of work: its state, what it is, what it is doing now. Opens the card over the page. */
export function JobRow({ m, onOpen }: { m: MissionRow; onOpen: (id: string) => void }) {
  const steps = sorted(m);
  const [word, tone] = jobWord(m.state, steps);
  return (
    <button type="button" className={`kjb-row t-${tone}`} onClick={() => onOpen(m.id)}>
      <StateDot state={m.state} />
      <span className="kjb-row-b"><b>{m.title}</b><small>{jobLine(m.state, steps) || word}</small></span>
      <time dateTime={m.updated_at}>{ago(m.updated_at)}</time>
    </button>
  );
}

/** Open work grouped by who it waits on: the person first, then what Kaju is doing. */
export function JobGroups({ rows, onOpen, idBase }: { rows: MissionRow[]; onOpen: (id: string) => void; idBase: string }) {
  const calm = useReducedMotion();
  const waits = rows.filter((m) => m.state === "waiting_person" || m.state === "blocked");
  const doing = rows.filter((m) => isOpen(m.state) && !waits.includes(m));
  const group = (id: string, title: string, list: MissionRow[]) => list.length ? (
    <div className="kjb-group" role="group" aria-labelledby={id}>
      <p className="kjb-group-h" id={id}>{title}<span className="kj-count">{list.length}</span></p>
      <ul>{list.map((m, i) => <motion.li key={m.id} initial={calm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2, ease: EASE, delay: calm ? 0 : Math.min(i, 5) * .04 }}><JobRow m={m} onOpen={onOpen} /></motion.li>)}</ul>
    </div>
  ) : null;
  return <>{group(`${idBase}-w`, "Waiting for you", waits)}{group(`${idBase}-k`, "Kaju is working on", doing)}</>;
}

/* ── Over any page ──────────────────────────────────────────────────────────────────────────────────────────── */
/** Opens the card for ?job=<id> (read by JobWatch) over whatever page the person is on: a dialog on wide screens, a sheet on a phone.
    Closing takes ?job off the address, so Back and old links behave. */
export function JobHost({ id: raw }: { id: string }) {
  const id = isJobId(raw) ? raw.toLowerCase() : null;
  const router = useRouter();
  const path = usePathname();
  const phone = usePhone();
  const live = useLive();
  const close = useCallback(() => {
    const q = new URLSearchParams(window.location.search); q.delete("job");
    const rest = q.toString();
    router.replace(`${path}${rest ? `?${rest}` : ""}`, { scroll: false });
    window.dispatchEvent(new Event("sp:job"));
  }, [router, path]);
  /* Escape on a phone sheet is handled by the sheet itself; the dialog handles its own. */
  useEffect(() => { if (raw && !id) close(); }, [raw, id, close]);
  if (!id) return null;
  const body = !live.ready ? <Skeleton rows={3} /> : !live.signedIn ? (
    <div className="kjb is-note"><p><b>Kaju&apos;s work is private to the person who asked for it.</b> Sign in to see yours.</p><Link className="kj-btn is-sm" href={`/sign-in?next=${encodeURIComponent(`${path}?job=${id}`)}`}>Sign in</Link></div>
  ) : <JobCard id={id} full />;
  return phone ? <Sheet open onClose={close} label="Kaju's work" full><div className="kjb-sheet">{body}</div></Sheet>
    : <Modal title="Kaju's work" onClose={close} wide><div className="kjb-sheet">{body}</div></Modal>;
}
