"use client";

/* The working parts the NGO record pages share: the next step on a case, its follow-ups, delete with a reason and
   Undo, recording care, and the care and movement events with their review. Each action is the server function the
   classic screens call, with the same arguments; the database decides who may do what, and its refusal is shown. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, MapPin, Trash2 } from "lucide-react";
import { Confirm, Empty, Field, FilePick, Modal, day, dayTime, toast, useAct, words, errText } from "../../kit";
import { Chip } from "../../ui";
import type { CaseFile, CaseFollowupRow } from "@/lib/case-file";
import { REVIEW_REASONS, type ReviewReason } from "@/lib/review";
import type { CaseResolution } from "@/lib/types";
import { MEDICAL_KINDS } from "@/lib/types";
import { OPERATION_LABELS, operationRpc, readOperations, verifyOperationReceipt, type LifecycleData, type OperationEvent, type OperationKind, type OperationReceipt, type OperationReview, type WorkflowPolicy } from "@/lib/operations";
import {
  addFollowup, addNote, assignCase, backToAssigned, inDays, isOpenClass, readMembers, recordCare, recordOutcome, removeRecord, restoreRecord,
  reviewCase, setFollowup, startWork, takeCase, type Actor, type Member, type RemovableKind, type Res,
} from "../../data/ngo";
import "../../css/ngo-records.css";

const DAY = 86_400_000;
export const TRY = { href: "/try", title: "Opens the live demo, where this works" } as const;
/** In sample mode an action is a link to the live demo, never a button that does nothing. */
export function TryLink({ children, quiet, sm }: { children: ReactNode; quiet?: boolean; sm?: boolean }) {
  return <Link href={TRY.href} title={TRY.title} className={`nx-btn ${quiet ? "is-quiet" : ""} ${sm ? "is-sm" : ""}`}>{children}</Link>;
}
export const isLead = (role: string | null | undefined) => role === "admin" || role === "coordinator";
export const since = (iso: string | null | undefined) => { if (!iso) return "—"; const d = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY)); return d < 1 ? "Today" : d === 1 ? "Yesterday" : d < 31 ? `${d} days` : d < 365 ? `${Math.round(d / 30)} mo` : `${(d / 365).toFixed(1)} y`; };

/** An Undo that says what happened and re-reads the record either way. */
export function undoWith(fn: () => Promise<Res>, after: () => unknown, done = "Undone.") {
  return async () => { const r = await fn(); if (r.error) toast({ text: `Not undone. ${errText(r.error)}`, tone: "bad" }); else toast({ text: done, tone: "ok" }); await after(); };
}

export function useMembers(on: boolean) {
  const [m, setM] = useState<Member[] | null>(null);
  useEffect(() => { if (!on) return; let live = true; void readMembers().then((r) => { if (live) setM(r.data ?? []); }); return () => { live = false; }; }, [on]);
  return m;
}

/* ── Delete with a reason, and Undo ──────────────────────────────── */

export function DeleteRecord({ kind, id, what, onDone, onRestored, label }: { kind: RemovableKind; id: string; what: string; onDone?: () => unknown; onRestored?: () => unknown; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { busy, run } = useAct();
  const go = async () => {
    const r = await run("del", () => removeRecord(kind, id, reason), { ok: `Deleted ${what}.`, undo: (x) => undoWith(() => restoreRecord(String(x.data)), () => (onRestored ?? onDone)?.(), "Restored.")() });
    if (r.ok) { setOpen(false); setReason(""); await onDone?.(); }
  };
  return <>
    <button type="button" className={label ? "nx-btn is-quiet is-sm" : "nx-ib nr-del"} aria-label={`Delete ${what}`} title={`Delete ${what}`} onClick={() => setOpen(true)}><Trash2 size={label ? 13 : 14} />{label ?? null}</button>
    {open ? <Modal title={`Delete ${what}?`} onClose={() => setOpen(false)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setOpen(false)}>Cancel</button><button type="button" className="nx-btn is-danger" disabled={!!busy} onClick={() => void go()}>{busy ? <Loader2 size={13} className="nx-spin" /> : null}Delete</button></>}>
      <p className="nx-sub" style={{ marginTop: 0 }}>It moves to removed records. A coordinator can restore it for 30 days, and Undo brings it back now.</p>
      <Field label="Reason (optional)"><textarea maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: entered twice" /></Field>
    </Modal> : null}
  </>;
}

/* ── The next step on a case ─────────────────────────────────────── */

export type Cohort = "live" | "decide" | "history";
export function cohortOf(file: CaseFile, now = Date.now()): Cohort {
  const { c, reg } = file;
  if (reg.provenance === "imported_historical_record" && !reg.status_reviewed_at) return "history";
  const open = reg.status_class ? isOpenClass(reg.status_class) : c.status !== "resolved" && c.status !== "closed";
  const age = now - Date.parse(reg.occurred_at), quiet = now - Date.parse(c.last_activity_at || reg.occurred_at);
  return open && age > 90 * DAY && quiet > 30 * DAY ? "decide" : "live";
}
type Mode = null | "outcome" | "close" | "note" | "followup";
type Ask = { title: string; body: ReactNode; confirm: string; danger?: boolean; go: () => Promise<unknown> } | null;

/** Exactly the steps the record allows, in the order a team takes them (classic NextStep). */
export function CaseNext({ file, role, actor, members, onChanged }: { file: CaseFile; role: string | null; actor: Actor; members: Member[] | null; onChanged: () => Promise<unknown> | unknown }) {
  const { c, reg, followups } = file;
  const [mode, setMode] = useState<Mode>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const { busy, run } = useAct();
  useEffect(() => { setMode(null); setAsk(null); }, [c.id]);
  const open = reg.status_class ? isOpenClass(reg.status_class) : c.status !== "resolved" && c.status !== "closed";
  const mine = c.assignee_id === actor.id, pool = !c.ngo_id, lead = isLead(role);
  const now = Date.now(), age = Math.floor((now - Date.parse(reg.occurred_at)) / DAY), quiet = Math.floor((now - Date.parse(c.last_activity_at || reg.occurred_at)) / DAY);
  const stale = open && age > 90 && quiet > 30;
  const imported = reg.provenance === "imported_historical_record" && !reg.status_reviewed_at;
  const reasonless = !open && (reg.status_class === "no_action" || reg.status_class === "not_attended") && (!reg.closure_reason || reg.closure_reason === "unspecified");
  const dueAfter = followups.filter((f) => f.status === "upcoming" || f.status === "postponed").length;
  const self = members?.find((m) => m.user_id === actor.id);
  const after = async () => { setMode(null); setAsk(null); await onChanged(); };
  const still = (note?: string) => setAsk({ title: "Confirm it is still active?", confirm: "It is still active", body: <p>The case stays open and returns to today&apos;s work, with your name on the decision. Nothing closes.</p>, go: () => run("still", () => reviewCase(c.id, "still_active", actor.name, null, note ?? null), { ok: "Confirmed still active." }).then((r) => { if (r.ok) void after(); }) });
  const stays = dueAfter ? <p className="nr-hint">{dueAfter} follow-up{dueAfter === 1 ? " stays" : "s stay"} due after closing. Closing never cancels care still owed.</p> : null;

  return (
    <div className="nr-next" aria-label="Next step">
      {imported && open ? <div className="nr-block">
        <p>This status was copied from a historical register and has <b>never been confirmed</b>. It is not today&apos;s work until a person says so.</p>
        <div className="nr-acts"><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => still("Confirmed still active during historical review")}>It is still active</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setMode("close")}>It has ended…</button></div>
      </div> : null}
      {!imported && stale ? <div className="nr-block">
        <p><b>Open for {age} days, nothing recorded for {quiet}.</b> Is anyone still working it?</p>
        <div className="nr-acts"><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => still()}>Still active</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setMode("close")}>It has ended…</button></div>
      </div> : null}

      {open && !imported ? <div className="nr-block">
        {pool ? <>
          <p>No organisation holds this report yet.</p>
          <div className="nr-acts"><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void run("claim", () => takeCase(c.id, actor), { ok: "Claimed for your organisation. You hold it." }).then((r) => { if (r.ok) void after(); })}>Claim for your organisation</button></div>
        </> : <>
          <p>{mine ? <>This case is <b>with you</b>{c.status === "in_progress" ? ", in progress" : ""}.</> : c.assignee_name ? <>Held by <b>{c.assignee_name}</b>{c.status === "in_progress" ? ", in progress" : ""}.</> : <><b>Nobody holds this case.</b> Take it, or give it to a named person.</>}</p>
          <div className="nr-acts">
            {!c.assignee_id && self ? <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void run("take", () => takeCase(c.id, actor), { ok: "You hold this case." }).then((r) => { if (r.ok) void after(); })}>Take it</button> : null}
            {mine && c.status === "assigned" ? <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void run("start", () => startWork(c.id, actor), { ok: "Marked in progress.", undo: () => undoWith(() => backToAssigned(c.id, actor), onChanged, "Back to assigned.")() }).then((r) => { if (r.ok) void after(); })}>Start work</button> : null}
            {mine ? <button type="button" className="nx-btn is-sm" aria-expanded={mode === "outcome"} onClick={() => setMode(mode === "outcome" ? null : "outcome")}>Record the outcome…</button> : null}
            {lead && members && members.length ? <label className="nr-assign"><span className="nx-hide-s">{c.assignee_id ? "Reassign" : "Assign"}</span>
              <select value="" disabled={!!busy} aria-label={c.assignee_id ? "Reassign to" : "Assign to"} onChange={(e) => {
                const m = members.find((x) => x.user_id === e.target.value); if (!m) return;
                const prev = c.assignee_id && c.assignee_name ? { id: c.assignee_id, name: c.assignee_name } : null;
                void run("assign", () => assignCase(c.id, { id: m.user_id, name: m.name }, actor), { ok: `Given to ${m.name}.`, undo: prev ? () => undoWith(() => assignCase(c.id, prev, actor), onChanged, `Back with ${prev.name}.`)() : undefined }).then((r) => { if (r.ok) void after(); });
              }}>
                <option value="">{c.assignee_id ? "Reassign to…" : "Assign to…"}</option>
                {members.filter((m) => m.user_id !== c.assignee_id).map((m) => <option key={m.user_id} value={m.user_id}>{m.name}{m.user_id === actor.id ? " (you)" : ""} · {words(m.role)}</option>)}
              </select></label> : null}
          </div>
          {lead && c.assignee_id === null ? <p className="nr-hint">Undo is offered when a case goes back to the person who held it. A case nobody held cannot be made unheld again.</p> : null}
        </>}
      </div> : null}

      {mode === "outcome" ? <OutcomeForm dueAfter={stays} busy={!!busy} onCancel={() => setMode(null)} onSubmit={(v) => setAsk({ title: "Record the outcome and close?", confirm: "Record and close", body: <><p>The case closes as <b>{v.resolution === "sterilized" ? "sterilised" : v.resolution}</b>, with your note{v.photo ? " and the photo" : ""}, under your name and today&apos;s date.</p>{stays}</>, go: () => run("resolve", () => recordOutcome(c.id, actor, v), { ok: "Outcome recorded. The case is closed." }).then((r) => { if (r.ok) void after(); }) })} /> : null}
      {mode === "close" ? <CloseForm dueAfter={stays} busy={!!busy} onCancel={() => setMode(null)} onClose={(kind, reason, note) => setAsk({ title: "Close this case?", confirm: "Close with this reason", danger: false, body: <><p>{kind === "closed_done" ? "Closed after field work." : kind === "other_ngo" ? "Closed: another organisation took it. It never says your team treated it." : <>Closed without field action: <b>{REVIEW_REASONS.find((x) => x.id === reason)?.label.toLowerCase()}</b>.</>}</p>{stays}</>, go: () => run("close", () => reviewCase(c.id, kind, actor.name, reason, note), { ok: "Closed with a reason." }).then((r) => { if (r.ok) void after(); }) })} /> : null}

      {!open ? <div className="nr-block">
        <p>{reg.status_class === "no_action" ? (reasonless ? "Closed without field action. The reason was never recorded." : `Closed without field action: ${(reg.closure_reason ?? "").replace(/_/g, " ")}.`) : reg.status_class === "other_ngo" ? "Closed: another organisation took the case." : reg.status_class === "not_attended" ? (reasonless ? "Not attended. The reason was never recorded." : "Not attended.") : "Closed after field work."}</p>
        {reasonless ? <ReasonForm busy={!!busy} onSave={(r, note) => void run("reason", () => reviewCase(c.id, "set_reason", actor.name, r, note), { ok: "Reason recorded. The case keeps its original close date." }).then((x) => { if (x.ok) void after(); })} /> : null}
        {stays}
      </div> : null}

      <div className="nr-acts nr-more">
        <button type="button" className="nx-btn is-quiet is-sm" aria-expanded={mode === "note"} onClick={() => setMode(mode === "note" ? null : "note")}>Add a note</button>
        <button type="button" className="nx-btn is-quiet is-sm" aria-expanded={mode === "followup"} onClick={() => setMode(mode === "followup" ? null : "followup")}>Schedule a follow-up</button>
        {open && !imported && !pool && mode !== "close" ? <button type="button" className="nx-btn is-quiet is-sm" onClick={() => setMode("close")}>Close without field action…</button> : null}
      </div>
      {mode === "note" ? <NoteForm busy={!!busy} onCancel={() => setMode(null)} onSave={(t) => run("note", () => addNote(c.id, actor, t), { ok: "Note added to the history." }).then((r) => { if (r.ok) void after(); return r.ok; })} /> : null}
      {mode === "followup" ? <FollowupForm busy={!!busy} onCancel={() => setMode(null)} onSave={(due, note) => run("fu", () => addFollowup(c.id, c.dog_id ?? null, due, note), { ok: `Follow-up scheduled for ${day(due)}.`, undo: (x) => undoWith(() => removeRecord("followup", String(x.data), "Undo: scheduled by mistake"), onChanged, "Follow-up removed.")() }).then((r) => { if (r.ok) void after(); return r.ok; })} /> : null}
      {ask ? <Confirm title={ask.title} confirm={ask.confirm} danger={ask.danger} busy={!!busy} onClose={() => setAsk(null)} onConfirm={() => void ask.go()}>{ask.body}</Confirm> : null}
    </div>
  );
}

/** The same steps, in sample mode: each opens the live demo. */
export function SampleNext({ held }: { held: string }) {
  return <div className="nr-next">
    <div className="nr-block"><p>{held === "Unassigned" ? <><b>Nobody holds this case.</b> Take it, or give it to a named person.</> : <>Held by <b>{held}</b>.</>}</p>
      <div className="nr-acts"><TryLink sm>Take it</TryLink><TryLink sm quiet>Start work</TryLink><TryLink sm quiet>Record the outcome…</TryLink><TryLink sm quiet>Assign to…</TryLink></div></div>
    <div className="nr-acts nr-more"><TryLink sm quiet>Add a note</TryLink><TryLink sm quiet>Schedule a follow-up</TryLink><TryLink sm quiet>Close without field action…</TryLink></div>
  </div>;
}

function OutcomeForm({ busy, dueAfter, onCancel, onSubmit }: { busy: boolean; dueAfter: ReactNode; onCancel: () => void; onSubmit: (v: { resolution: CaseResolution; note: string; photo: File | null }) => void }) {
  const [resolution, setResolution] = useState<CaseResolution>("treated");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const ok = note.trim().length >= 8;
  return (
    <form className="nr-sheet" onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit({ resolution, note: note.trim(), photo }); }}>
      <fieldset className="nr-radios"><legend>What was done</legend>
        {(["treated", "sterilized", "rescued"] as CaseResolution[]).map((r) => <label key={r}><input type="radio" name="res" checked={resolution === r} onChange={() => setResolution(r)} /><span>{r === "treated" ? "Treated" : r === "sterilized" ? "Sterilised" : "Rescued"}</span></label>)}
      </fieldset>
      <Field label="Outcome, in your words" hint="Recorded with your name and today's date. A typed note is a report, not a clinician's sign-off."><textarea required minLength={8} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened, where the animal is now, anything the next person needs to know" /></Field>
      <div className="nr-file"><FilePick label={photo ? "Change the photo" : "Photo after care (optional)"} accept="image/*" onFiles={(f) => setPhoto(f[0] ?? null)} />{photo ? <span className="nx-t3">{photo.name} <button type="button" className="nr-link" onClick={() => setPhoto(null)}>Remove</button></span> : <span className="nx-t3">Stays private to your organisation.</span>}</div>
      {dueAfter}
      <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={busy || !ok}>Record outcome and close…</button><button type="button" className="nx-btn is-quiet is-sm" onClick={onCancel}>Cancel</button>{!ok && note ? <span className="nx-t3">A few more words, please.</span> : null}</div>
    </form>
  );
}

function CloseForm({ busy, dueAfter, onCancel, onClose }: { busy: boolean; dueAfter: ReactNode; onCancel: () => void; onClose: (k: "closed_done" | "closed_no_action" | "other_ngo", reason: ReviewReason | null, note: string) => void }) {
  const [kind, setKind] = useState<"closed_done" | "closed_no_action" | "other_ngo">("closed_no_action");
  const [reason, setReason] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  const needs = kind === "closed_no_action";
  const ready = !needs || (!!reason && (reason !== "other" || note.trim().length > 3));
  return (
    <form className="nr-sheet" onSubmit={(e) => { e.preventDefault(); if (ready) onClose(kind, needs ? (reason as ReviewReason) : null, note); }}>
      <fieldset className="nr-radios is-col"><legend>How did it end?</legend>
        <label><input type="radio" name="k" checked={kind === "closed_done"} onChange={() => setKind("closed_done")} /><span><b>The work was done</b><small>Field work happened; the history holds it</small></span></label>
        <label><input type="radio" name="k" checked={kind === "closed_no_action"} onChange={() => setKind("closed_no_action")} /><span><b>No field action</b><small>Say why: it changes what to fix</small></span></label>
        <label><input type="radio" name="k" checked={kind === "other_ngo"} onChange={() => setKind("other_ngo")} /><span><b>Another organisation took it</b><small>Never claims your team treated it</small></span></label>
      </fieldset>
      {needs ? <Field label="Reason"><select value={reason} onChange={(e) => setReason(e.target.value as ReviewReason)} required><option value="">Choose a reason…</option>{REVIEW_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></Field> : null}
      <Field label={reason === "other" ? "Note (say what happened)" : "Note (optional)"}><textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {dueAfter}
      <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={busy || !ready}>Close with this reason…</button><button type="button" className="nx-btn is-quiet is-sm" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function ReasonForm({ busy, onSave }: { busy: boolean; onSave: (r: ReviewReason, note: string) => void }) {
  const [r, setR] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  return (
    <form className="nr-sheet" onSubmit={(e) => { e.preventDefault(); if (r) onSave(r, note); }}>
      <Field label="Record why (the case keeps its original close date)"><select value={r} onChange={(e) => setR(e.target.value as ReviewReason)}><option value="">Choose a reason…</option>{REVIEW_REASONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={busy || !r || (r === "other" && note.trim().length < 4)}>Record the reason</button></div>
    </form>
  );
}

function NoteForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (t: string) => Promise<boolean> }) {
  const [t, setT] = useState("");
  return (
    <form className="nr-sheet" onSubmit={async (e) => { e.preventDefault(); if (t.trim() && await onSave(t.trim())) setT(""); }}>
      <Field label="Note on the case history"><textarea autoFocus value={t} maxLength={4000} onChange={(e) => setT(e.target.value)} placeholder="A visit, a call, what you saw" /></Field>
      <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={busy || !t.trim()}>Add to the history</button><button type="button" className="nx-btn is-quiet is-sm" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function FollowupForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (due: string, note: string) => Promise<boolean> }) {
  const [d, setD] = useState(() => inDays(7));
  const [note, setNote] = useState("");
  return (
    <form className="nr-sheet" onSubmit={async (e) => { e.preventDefault(); if (/^\d{4}-\d{2}-\d{2}$/.test(d) && await onSave(d, note)) setNote(""); }}>
      <div className="nx-fields">
        <Field label="Due"><input type="date" required value={d} min={inDays(0)} onChange={(e) => setD(e.target.value)} /></Field>
        <Field label="What to check"><input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Wound recheck, second dose…" /></Field>
      </div>
      <p className="nr-hint">A follow-up is its own task with its own date. It survives the case closing.</p>
      <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={busy || !d}>Schedule</button><button type="button" className="nx-btn is-quiet is-sm" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

/* ── Follow-ups ──────────────────────────────────────────────────── */

export function FollowupList({ items, onChanged, sample, markable }: { items: CaseFollowupRow[]; onChanged: () => Promise<unknown> | unknown; sample?: boolean; /** Follow-ups not on a case can only be deleted: the status function works through the case. */ markable?: (f: CaseFollowupRow) => boolean }) {
  const { busy, run } = useAct();
  const fus = [...items].sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
  if (!fus.length) return <p className="nr-quiet">No follow-up scheduled on this case.</p>;
  const act = (f: CaseFollowupRow, s: "done" | "missed" | "postponed") => {
    const was = f.status === "postponed" ? "postponed" : "upcoming", wasDue = f.due_at.slice(0, 10);
    return run(f.id, () => setFollowup(f.id, s, s === "postponed" ? inDays(7) : undefined), {
      ok: s === "done" ? "Follow-up marked done." : s === "missed" ? "Follow-up marked missed." : `Follow-up moved to ${day(inDays(7))}.`,
      undo: () => undoWith(() => setFollowup(f.id, was, s === "postponed" ? wasDue : undefined), onChanged, "Follow-up reopened as it was.")(),
    }).then((r) => { if (r.ok) void onChanged(); });
  };
  return (
    <ul className="nr-items" aria-label="Follow-ups">
      {fus.map((f) => {
        const due = f.status === "upcoming" || f.status === "postponed", late = due && Date.parse(f.due_at) < Date.now();
        return (
          <li key={f.id} className="nr-item">
            <span className="nr-item-t"><b>{words(f.kind, "Recheck")}</b><small>{f.note ?? (due ? `Due ${day(f.due_at)}` : "")}</small></span>
            <span className="nr-item-e">
              <Chip tone={f.status === "done" ? "ok" : f.status === "missed" ? "warn" : late ? "bad" : "accent"}>{due ? (late ? `Late · ${day(f.due_at)}` : `Due ${day(f.due_at)}`) : `${words(f.status)}${f.completed_at ? ` ${day(f.completed_at)}` : ""}`}</Chip>
              {due && (!markable || markable(f)) ? (sample ? <><TryLink sm>Done</TryLink><TryLink sm quiet>Missed</TryLink></> : <>
                <button type="button" className="nx-btn is-sm" disabled={busy === f.id} onClick={() => void act(f, "done")}>Done</button>
                <button type="button" className="nx-btn is-quiet is-sm" disabled={busy === f.id} onClick={() => void act(f, "missed")}>Missed</button>
                <button type="button" className="nx-btn is-quiet is-sm" disabled={busy === f.id} title="Due again seven days from today" onClick={() => void act(f, "postponed")}>+7 days</button>
              </>) : null}
              {sample ? null : <DeleteRecord kind="followup" id={f.id} what="this follow-up" onDone={onChanged} />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Record care on an animal ────────────────────────────────────── */

export function CareForm({ dogId, caseId, onSaved, onCancel }: { dogId: string; caseId?: string | null; onSaved: () => unknown; onCancel?: () => void }) {
  const [kind, setKind] = useState("vaccination");
  const [date, setDate] = useState(() => inDays(0));
  const [notes, setNotes] = useState("");
  const [by, setBy] = useState("");
  const { busy, run } = useAct();
  return (
    <form className="nr-sheet" onSubmit={async (e) => {
      e.preventDefault();
      const r = await run("care", () => recordCare(dogId, { kind, date, notes, by, caseId }), { ok: `${MEDICAL_KINDS.find((k) => k.id === kind)?.label ?? "Care"} recorded.`, undo: (x) => undoWith(() => removeRecord("care", String(x.data), "Undo: recorded by mistake"), onSaved, "Care record removed.")() });
      if (r.ok) { setNotes(""); setBy(""); await onSaved(); }
    }}>
      <div className="nx-fields">
        <Field label="What"><select value={kind} onChange={(e) => setKind(e.target.value)}>{MEDICAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></Field>
        <Field label="When"><input type="date" required value={date} max={inDays(0)} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Done by (optional)" wide><input value={by} maxLength={200} onChange={(e) => setBy(e.target.value)} placeholder="Clinic or person" /></Field>
        <Field label="Notes (optional)" wide><textarea value={notes} maxLength={3000} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
      <p className="nr-hint">Recorded by your organisation. It is not a clinician&apos;s sign-off.</p>
      <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={!!busy}>{busy ? <Loader2 size={13} className="nx-spin" /> : null}Add to the history</button>{onCancel ? <button type="button" className="nx-btn is-quiet is-sm" onClick={onCancel}>Cancel</button> : null}</div>
    </form>
  );
}

/* ── Care and movement events (structured operations) ───────────── */

const DETAIL: [keyof LifecycleData | "location" | "destination", string][] = [["location", "Place"], ["destination", "Taken to"], ["facility", "Facility"], ["procedure", "Procedure"], ["performedBy", "Done by"], ["vaccine", "Vaccine"], ["batch", "Batch"], ["dose", "Dose"], ["route", "Route"], ["reason", "Reason"], ["dueDate", "Due"], ["identityDecision", "Identity decision"]];
const opLabel = (k: OperationEvent["kind"]) => (k === "intake" ? "Intake" : OPERATION_LABELS[k] ?? words(k));

/** Reported care and movements on a case (or, read only, on an animal). A coordinator can confirm or return each one;
    every save is checked against the saved row and the independent audit before it is called saved. */
export function OpsEvents({ caseId, dogId, readOnly, role, userId, title = "Care and movements" }: { caseId?: string; dogId?: string; readOnly?: boolean; role: string | null; userId: string | null; title?: string }) {
  const [data, setData] = useState<{ events: OperationEvent[]; reviews: OperationReview[]; policies: WorkflowPolicy[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(0);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState<{ e: OperationEvent; d: "confirmed" | "returned" } | null>(null);
  const requests = useRef(new Map<string, string>());
  const { busy, run } = useAct();
  const coord = isLead(role);
  const load = useCallback(async () => { try { setData(await readOperations(caseId, page * 40, dogId)); setError(null); } catch (x) { setError(errText(x)); } }, [caseId, dogId, page]);
  useEffect(() => { void load(); }, [load]);
  const review = async (e: OperationEvent, decision: "confirmed" | "returned") => {
    const reason = reasons[e.id]?.trim(); if (!reason || !userId) return;
    const intent = JSON.stringify([e.id, decision, reason]);
    let request = requests.current.get(intent); if (!request) { request = crypto.randomUUID(); requests.current.set(intent, request); }
    const req = request;
    const r = await run("rev", async () => { try { const x = await operationRpc<OperationReceipt>("operations_review_event", { p_request: req, p_event: e.id, p_decision: decision, p_reason: reason }); await verifyOperationReceipt(x, "animal_operation_reviews", userId, { event_id: e.id, decision }, req); return {}; } catch (x) { return { error: errText(x) }; } }, { ok: decision === "confirmed" ? "Field record confirmed; the source and audit were checked." : "Field record returned; the source and audit were checked." });
    if (r.ok) { setAsk(null); await load(); }
  };
  return (
    <section className="nx-sec" aria-label={title}>
      <div className="nx-sec-h"><h2>{title}</h2>{data ? <span className="nx-count">{data.events.length}{data.events.length >= 40 ? "+" : ""}</span> : null}
        {!readOnly && caseId ? <span style={{ marginLeft: "auto" }}><button type="button" className="nx-btn is-quiet is-sm" aria-expanded={adding} onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "Record care or movement"}</button></span> : null}</div>
      {adding && caseId && userId ? <LifecycleForm events={data?.events} policies={data?.policies} coordinator={coord} onCancel={() => setAdding(false)} onSave={async (kind, payload, policyId, requestId) => {
        const r = await operationRpc<OperationReceipt>("operations_record_event", { p_request: requestId, p_case: caseId, p_kind: kind, p_payload: payload, p_policy: policyId });
        await verifyOperationReceipt(r, "animal_operation_events", userId, { case_id: caseId, kind }, requestId);
        toast({ text: `${OPERATION_LABELS[kind]} saved; the source and audit were checked.`, tone: "ok" });
        await load();
      }} /> : null}
      {error ? <p className="nr-err" role="alert">{error} <button type="button" className="nr-link" onClick={() => void load()}>Read again</button></p> : null}
      {!data && !error ? <p className="nr-quiet" role="status">Reading…</p> : null}
      {data && !data.events.length ? <p className="nr-quiet">{readOnly ? "Nothing reported on this animal's cases yet." : "Nothing recorded yet. Capture, release, transfer, vaccination and other steps appear here, with who reported them."}</p> : null}
      {data && data.events.length ? <ul className="nr-items">{data.events.map((e) => {
        const last = data.reviews.find((r) => r.event_id === e.id);
        const d = e.payload as unknown as Record<string, unknown>;
        const note = d.notes ?? d.description;
        return (
          <li key={e.id} className="nr-item is-col">
            <div className="nr-item-row"><span className="nr-item-t"><b>{opLabel(e.kind)}</b><small>{dayTime(e.occurred_at)} · {e.actor_name}{note ? ` · ${String(note)}` : ""}</small></span>
              <span className="nr-item-e"><Chip tone={last ? (last.decision === "confirmed" ? "ok" : "warn") : "plain"}>{last ? `${words(last.decision)} by ${last.actor_name}` : "Reported, not reviewed"}</Chip>{dogId ? <Link className="nr-link" href={`/next/ngo/cases/${e.case_id}`}>Source case</Link> : null}</span></div>
            {DETAIL.some(([k]) => d[k]) || last || (!readOnly && coord && !last) ? <details className="nr-more-d"><summary>{!readOnly && coord && !last ? "Details and review" : "Details"}</summary>
              <dl className="nr-dl">{DETAIL.map(([k, label]) => (d[k] ? <div key={k}><dt>{label}</dt><dd>{String(d[k])}</dd></div> : null))}{e.policy_id ? <div><dt>Policy</dt><dd>Recorded under your organisation&apos;s workflow policy</dd></div> : null}{last ? <div><dt>Review</dt><dd>{last.reason} · {dayTime(last.created_at)}</dd></div> : null}</dl>
              {!readOnly && coord && !last ? <div className="nr-sheet"><Field label="Review reason"><textarea required maxLength={2000} value={reasons[e.id] ?? ""} onChange={(v) => setReasons((r) => ({ ...r, [e.id]: v.target.value }))} /></Field>
                <div className="nr-acts"><button type="button" className="nx-btn is-sm" disabled={!!busy || !reasons[e.id]?.trim()} onClick={() => setAsk({ e, d: "confirmed" })}>Confirm field record…</button><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy || !reasons[e.id]?.trim()} onClick={() => setAsk({ e, d: "returned" })}>Return field record…</button></div></div> : null}
            </details> : null}
          </li>
        );
      })}</ul> : null}
      {page > 0 || (data?.events.length ?? 0) >= 40 ? <div className="nr-acts"><button type="button" className="nx-btn is-quiet is-sm" disabled={page === 0} onClick={() => setPage((v) => v - 1)}>Newer</button><button type="button" className="nx-btn is-quiet is-sm" disabled={!data || data.events.length < 40} onClick={() => setPage((v) => v + 1)}>Older</button></div> : null}
      {ask ? <Confirm title={ask.d === "confirmed" ? "Confirm this field record?" : "Return this field record?"} confirm={ask.d === "confirmed" ? "Confirm" : "Return"} busy={!!busy} onClose={() => setAsk(null)} onConfirm={() => void review(ask.e, ask.d)}><p>Your review is saved with your name and reason. Veterinary and municipal decisions remain separate.</p></Confirm> : null}
    </section>
  );
}

/** A versioned record of one care or movement step. Required fields follow the step and any organisation policy. */
export function LifecycleForm({ onSave, onCancel, events = [], policies = [], coordinator = false, submitLabel = "Save operation record" }: { onSave: (kind: OperationKind, data: LifecycleData, policyId: string | null, requestId: string) => Promise<void>; onCancel: () => void; events?: OperationEvent[]; policies?: WorkflowPolicy[]; coordinator?: boolean; submitLabel?: string }) {
  const request = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())), saving = useRef(false);
  const fresh = (): LifecycleData => ({ template: "lifecycle-v1", occurredAt: new Date().toISOString(), notes: "" });
  const [kind, setKind] = useState<OperationKind>("capture");
  const [d, setD] = useState<LifecycleData>(fresh);
  const [policy, setPolicy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = policies.find((p) => p.id === policy);
  const required = selected?.rules.requiredFields?.[kind] ?? [];
  type Key = Exclude<keyof LifecycleData, "template" | "occurredAt" | "notes">;
  const input = (key: Key, label: string, need = false, max = 300) => <Field key={key} label={label}><input required={need || required.includes(key)} maxLength={max} value={d[key] ?? ""} onChange={(e) => setD((x) => ({ ...x, [key]: e.target.value }))} /></Field>;
  const gps = (key: "location") => <button type="button" className="nx-btn is-quiet is-sm" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setD((x) => ({ ...x, [key]: `Observed GPS ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}` })), () => setError("Location unavailable. Record the observed place in words."))}><MapPin size={13} />Use current location</button>;
  const rendered: Partial<Record<OperationKind, string[]>> = { sterilisation: ["procedure", "performedBy", "facility"], vaccination: ["vaccine", "batch", "performedBy", "facility", "dose", "route", "location"], capture: ["location"], release: ["location"], transfer: ["destination"], followup: ["dueDate"], exception: ["reason"], correction: ["correctsId", "reason"], identification: ["identityDecision", "candidateId"] };
  const extra = required.filter((k) => k !== "notes" && !(rendered[kind] ?? []).includes(k));
  const local = new Date(Date.parse(d.occurredAt) - new Date(d.occurredAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return (
    <form className="nr-sheet" onSubmit={async (e) => {
      e.preventDefault(); if (saving.current) return; saving.current = true; setBusy(true); setError(null);
      try { await onSave(kind, d, policy || null, request.current); onCancel(); } catch (x) { setError(`${errText(x)} The form stays open; saving again uses the same request, so it is never saved twice.`); } finally { saving.current = false; setBusy(false); }
    }}>
      <div className="nx-fields">
        <Field label="Record type"><select value={kind} onChange={(e) => { setKind(e.target.value as OperationKind); setD(fresh()); }}>{Object.entries(OPERATION_LABELS).filter(([k]) => coordinator || k !== "identification").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Occurred at"><input type="datetime-local" required value={local} onChange={(e) => { if (e.target.value) setD((x) => ({ ...x, occurredAt: new Date(e.target.value).toISOString() })); }} /></Field>
        {policies.length ? <Field label="Workflow policy" wide hint={selected ? `Source: ${selected.source_reference}. Workflow configuration is not legal or clinical guidance.` : undefined}><select value={policy} onChange={(e) => setPolicy(e.target.value)}><option value="">No organisation policy</option>{policies.map((p) => <option key={p.id} value={p.id}>{p.name} · version {p.version}</option>)}</select></Field> : null}
        {kind === "sterilisation" ? <>{input("procedure", "Procedure recorded", true)}{input("performedBy", "Reported clinician", true)}{input("facility", "Clinical facility", true)}</>
          : kind === "vaccination" ? <>{input("vaccine", "Vaccine product", true, 200)}{input("batch", "Batch or lot", true, 100)}{input("performedBy", "Reported vaccinator", true, 100)}{input("facility", "Facility or team", true)}{input("dose", "Dose recorded", false, 50)}{input("route", "Route recorded", false, 50)}{input("location", "Vaccination location", true)}<div className="is-wide">{gps("location")}</div></>
          : kind === "capture" || kind === "release" ? <>{input("location", kind === "capture" ? "Capture location" : "Release location", true)}<div className="nr-end">{gps("location")}</div></>
          : kind === "transfer" ? input("destination", "Receiving organisation or facility", true)
          : kind === "followup" ? <Field label="Follow-up due"><input type="date" required value={d.dueDate ?? ""} onChange={(e) => setD((x) => ({ ...x, dueDate: e.target.value }))} /></Field>
          : kind === "exception" ? input("reason", "Exception reason", true)
          : kind === "correction" ? <><Field label="Original record"><select required value={d.correctsId ?? ""} onChange={(e) => setD((x) => ({ ...x, correctsId: e.target.value }))}><option value="">Choose the record it corrects</option>{events.map((x) => <option key={x.id} value={x.id}>{opLabel(x.kind)} · {dayTime(x.occurred_at)}</option>)}</select></Field>{input("reason", "Correction reason", true)}</>
          : kind === "identification" ? <><Field label="Identity decision"><select required value={d.identityDecision ?? ""} onChange={(e) => setD((x) => ({ ...x, identityDecision: e.target.value }))}><option value="">Choose a decision</option><option value="confirmed_distinct">Confirmed as a distinct animal</option><option value="possible_duplicate">Possible duplicate, needs review</option><option value="linked_existing">References an existing animal; both histories kept</option></select></Field>{d.identityDecision !== "confirmed_distinct" ? input("candidateId", "Related animal record ID", true) : null}</>
          : null}
        {extra.map((k) => input(k as Key, `Policy field: ${k}`, true))}
        <Field label="Observations and record note" wide><textarea required maxLength={3000} value={d.notes} onChange={(e) => setD((x) => ({ ...x, notes: e.target.value }))} /></Field>
      </div>
      <p className="nr-hint">A reported record. It does not certify a procedure; veterinary sign-off and municipal review are separate.</p>
      {error ? <p className="nr-err" role="alert">{error}</p> : null}
      <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={busy}>{busy ? <Loader2 size={13} className="nx-spin" /> : null}{submitLabel}</button><button type="button" className="nx-btn is-quiet is-sm" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

export function Partial({ parts }: { parts: string[] }) {
  if (!parts.length) return null;
  return <p className="nr-err" role="alert">Part of this record could not be read: {parts.join(", ")}. Nothing there is shown as empty; read the page again.</p>;
}
export { Empty };
