"use client";

/* ════════════════════════════════════════════════════════════════════
   The next step on a case (decisions 008B, 008C, 008F, 025, 033).

   Exactly the steps the record allows, in the order a team takes them:
   claim an unowned report for the organisation, take or assign it, start,
   record the outcome (evidence by context), or close with a reason. A
   case open for months with nothing recorded asks the review question.
   An imported status asks a person to confirm it. Closing shows every
   follow-up that stays due; closing never cancels them.

   Every step goes through an existing server-authorised RPC and shows
   pending, then the database's receipt (time, what changed) or the
   reason it was refused. Nothing is optimistic.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { uploadPhoto } from "@/lib/actions";
import type { CaseFile } from "@/lib/case-file";
import { REVIEW_REASONS, type ReviewReason } from "@/lib/review";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import type { CaseResolution } from "@/lib/types";
import { addNote, assignTo, backToAssigned, decideCase, resolveCase, scheduleFollowup, setFollowup, startWork, takeCase, type Receipt } from "../data/work";
import {useMembership} from "../shell/Shell";
import { Ack, day } from "../ui";
import { DeleteRecord } from "../ui/DeleteRecord";
import { notify } from "../ui/Notice";
import { Btn, Tag } from "@/ws/kit";
import "./cases.k.css";

const DAY = 86_400_000;
type Mode = null | "outcome" | "close" | "note" | "followup";

export function NextStep({ file, cohort, onChanged }: { file: CaseFile; cohort: "live" | "decide" | "history"; onChanged: () => Promise<void> }) {
  const { user } = useAuth();
  const membership=useMembership();
  const { c, reg, followups } = file;
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  useEffect(() => { getMyOrgMembers().then(setMembers).catch(() => setMembers([])); }, []);
  useEffect(() => { setMode(null); setReceipt(null); }, [c.id]);
  if (!user) return null;
  const actor = { id: user.id, name: user.name };

  const open = reg.status_class ? reg.status_class === "open" || reg.status_class === "in_progress" : c.status !== "resolved" && c.status !== "closed";
  const mine = c.assignee_id === actor.id;
  const pool = !c.ngo_id;
  const now = Date.now();
  const age = Math.floor((now - Date.parse(reg.occurred_at)) / DAY);
  const quiet = Math.floor((now - Date.parse(c.last_activity_at || reg.occurred_at)) / DAY);
  const stale = open && age > 90 && quiet > 30;
  const imported = reg.provenance === "imported_historical_record" && !reg.status_reviewed_at;
  const reasonless = !open && (reg.status_class === "no_action" || reg.status_class === "not_attended") && (!reg.closure_reason || reg.closure_reason === "unspecified");
  const dueAfter = followups.filter((f) => f.status === "upcoming");

  /* undo: the reverse step, offered only where the database allows it (giving
     the case back to whoever held it; moving "in progress" back to "assigned"). */
  const go = async (key: string, fn: () => Promise<Receipt>, undo?: { text: string; fn: () => Promise<Receipt> }) => {
    setBusy(key); setReceipt(null);
    let r: Receipt;
    try { r = await fn(); } catch { r = { ok: false, error: "The connection dropped." } as Receipt; }
    setReceipt(r); setBusy(null);
    if (r.ok) {
      notify({ tone: "ok", text: undo ? undo.text : "Saved to the case.", action: undo ? { label: "Undo", run: async () => {
        let u: Receipt;
        try { u = await undo.fn(); } catch { u = { ok: false, error: "The connection dropped." } as Receipt; }
        if (u.ok) { notify({ tone: "ok", text: "Undone." }); await onChanged(); }
        else notify({ tone: "error", text: `Not undone. ${("error" in u && u.error) || "Try again."}` });
      } } : undefined });
      setMode(null); await onChanged();
    }
    else notify({ tone: "error", text: `Not saved. ${("error" in r && r.error) || "Try again."}`, action: { label: "Try again", run: () => go(key, fn) } });
  };
  const self = members.find((m) => m.user_id === actor.id);

  const lead = membership.role === "admin" || membership.role === "coordinator";
  return (
    <section className="ns kc-scope" aria-label="Next step">
      {(imported || cohort === "history") && open && (
        <div className="ns-block">
          <p className="kc-p">This status was copied from a historical register and has <b>never been confirmed</b>. It is not today&rsquo;s work until a person says so.</p>
          <div className="kc-acts">
            <Btn disabled={!!busy} onClick={() => go("still", () => decideCase(c.id, "still_active", actor.name, null, "Confirmed still active during historical review"))}>It is still active</Btn>
            <Btn disabled={!!busy} onClick={() => setMode("close")}>It has ended…</Btn>
          </div>
        </div>
      )}

      {!imported && stale && (
        <div className="ns-block">
          <p className="kc-p"><b>Open for {age} days, nothing recorded for {quiet}.</b> Is anyone still working it?</p>
          <div className="kc-acts">
            <Btn disabled={!!busy} onClick={() => go("still", () => decideCase(c.id, "still_active", actor.name))}>Still active</Btn>
            <Btn disabled={!!busy} onClick={() => setMode("close")}>It has ended…</Btn>
          </div>
        </div>
      )}

      {open && !imported && (
        <div className="ns-block">
          {pool ? (
            <>
              <p className="kc-p">No organisation holds this report yet.</p>
              <div className="kc-acts"><Btn variant="primary" disabled={!!busy} onClick={() => go("claim", () => takeCase(c.id, actor))}>Claim for your organisation</Btn></div>
            </>
          ) : (
            <>
              <p className="kc-p">{mine ? <>This case is <b>with you</b>{c.status === "in_progress" ? ", in progress" : ""}.</> : c.assignee_name ? <>Held by <b>{c.assignee_name}</b>.</> : <><b>Nobody holds this case.</b> Take it, or give it to a named person.</>}</p>
              <div className="kc-acts">
                {!c.assignee_id && self && <Btn variant="primary" disabled={!!busy} onClick={() => go("take", () => takeCase(c.id, actor))}>Take it</Btn>}
                {mine && c.status === "assigned" && <Btn disabled={!!busy} onClick={() => go("start", () => startWork(c.id, actor), { text: "Marked in progress.", fn: () => backToAssigned(c.id, actor) })}>Start work</Btn>}
                {mine && <Btn variant="primary" disabled={!!busy} aria-expanded={mode === "outcome"} onClick={() => setMode(mode === "outcome" ? null : "outcome")}>Record the outcome…</Btn>}
                {lead && members.length > 0 && (
                  <select className="kc-in ns-select" value="" disabled={!!busy} aria-label={c.assignee_id ? "Reassign to" : "Assign to"} onChange={(e) => { const m = members.find((x) => x.user_id === e.target.value); if (m) { const prev = c.assignee_id && c.assignee_name ? { id: c.assignee_id, name: c.assignee_name } : null; void go("assign", () => assignTo(c.id, { id: m.user_id, name: m.name }, actor), prev ? { text: `Given to ${m.name}.`, fn: () => assignTo(c.id, prev, actor) } : undefined); } }}>
                    <option value="">{c.assignee_id ? "Reassign to…" : "Assign to…"}</option>
                    {members.filter((m) => m.user_id !== c.assignee_id).map((m) => <option key={m.user_id} value={m.user_id}>{m.name}{m.user_id === actor.id ? " (you)" : ""} · {m.role}</option>)}
                  </select>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {mode === "outcome" && <Outcome busy={!!busy} dueAfter={dueAfter.length} onCancel={() => setMode(null)} onSubmit={(v) => go("resolve", async () => {
        let afterUrl: string | null = null;
        if (v.photo) { try { afterUrl = await uploadPhoto(v.photo); } catch { return { ok: false, error: "The photo did not upload. Nothing was saved; try again or record without a photo." }; } }
        return resolveCase(c.id, actor, { resolution: v.resolution, note: v.note, afterUrl });
      })} />}
      {mode === "close" && <Close busy={!!busy} dueAfter={dueAfter.length} onCancel={() => setMode(null)} onClose={(kind, reason, note) => go("close", () => decideCase(c.id, kind, actor.name, reason, note))} />}

      {!open && (
        <div className="ns-block">
          <p className="kc-p">{reg.status_class === "no_action" ? (reasonless ? "Closed without field action. The reason was never recorded." : `Closed without field action: ${(reg.closure_reason ?? "").replace(/_/g, " ")}.`) : reg.status_class === "other_ngo" ? "Closed: another organisation took the case." : "Closed after field work."}</p>
          {reasonless && <Reason busy={!!busy} onSave={(reason, note) => go("reason", () => decideCase(c.id, "set_reason", actor.name, reason, note))} />}
          {dueAfter.length > 0 && <p className="kc-hint">{dueAfter.length} follow-up{dueAfter.length === 1 ? " stays" : "s stay"} due after closing. Closing never cancels care still owed.</p>}
        </div>
      )}

      <div className="kc-acts">
        <Btn small variant="quiet" aria-pressed={mode === "note"} onClick={() => setMode(mode === "note" ? null : "note")}>Add a note</Btn>
        <Btn small variant="quiet" aria-pressed={mode === "followup"} onClick={() => setMode(mode === "followup" ? null : "followup")}>Schedule a follow-up</Btn>
        {open && !imported && !pool && mode !== "close" && <Btn small variant="quiet" onClick={() => setMode("close")}>Close without field action…</Btn>}
      </div>
      {mode === "note" && <NoteForm busy={!!busy} onCancel={() => setMode(null)} onSave={(t) => go("note", () => addNote(c.id, actor, t))} />}
      {mode === "followup" && <FollowupForm busy={!!busy} onCancel={() => setMode(null)} onSave={(due, note) => go("fu", () => scheduleFollowup(c.id, c.dog_id ?? null, due, note))} />}

      <div className="ns-ack" aria-live="polite">
        {busy && <Ack state="pending">Sending to the record…</Ack>}
        {!busy && receipt?.ok && <Ack state="saved">{receipt.what} · {new Date(receipt.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · by you</Ack>}
        {!busy && receipt && !receipt.ok && <Ack state="failed">Not saved: {receipt.error}</Ack>}
      </div>
    </section>
  );
}

function Outcome({ busy, dueAfter, onCancel, onSubmit }: { busy: boolean; dueAfter: number; onCancel: () => void; onSubmit: (v: { resolution: CaseResolution; note: string; photo: File | null }) => void }) {
  const [resolution, setResolution] = useState<CaseResolution>("treated");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  return (
    <form className="kc-sheet" onSubmit={(e) => { e.preventDefault(); if (note.trim().length >= 8) onSubmit({ resolution, note: note.trim(), photo }); }}>
      <fieldset className="kc-choice is-row"><legend>What was done</legend>
        {(["treated", "sterilized", "rescued"] as CaseResolution[]).map((r) => <label key={r}><input type="radio" name="res" checked={resolution === r} onChange={() => setResolution(r)} /><span><b>{r === "treated" ? "Treated" : r === "sterilized" ? "Sterilised" : "Rescued"}</b></span></label>)}
      </fieldset>
      <div className="kc-f"><label htmlFor="out-note">Outcome, in your words</label><textarea id="out-note" className="kc-in" required minLength={8} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened, where the animal is now, anything the next person needs to know" /><small>Recorded with your name and today&rsquo;s date. A typed note is a report, not a clinician&rsquo;s sign-off.</small></div>
      <div className="kc-f"><label htmlFor="out-photo">Photo after care (optional)</label><input id="out-photo" className="kc-in" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /><small>Stays private to your organisation and starts blurred anywhere it may show an injury.</small></div>
      {dueAfter > 0 && <p className="kc-hint">{dueAfter} follow-up{dueAfter === 1 ? " stays" : "s stay"} due after this case closes.</p>}
      <div className="kc-acts"><Btn type="submit" variant="primary" disabled={busy || note.trim().length < 8}>Record outcome and close</Btn><Btn variant="quiet" onClick={onCancel}>Cancel</Btn></div>
    </form>
  );
}

function Close({ busy, dueAfter, onCancel, onClose }: { busy: boolean; dueAfter: number; onCancel: () => void; onClose: (k: "closed_done" | "closed_no_action" | "other_ngo", reason: ReviewReason | null, note: string) => void }) {
  const [kind, setKind] = useState<"closed_done" | "closed_no_action" | "other_ngo">("closed_no_action");
  const [reason, setReason] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  const needsReason = kind === "closed_no_action";
  const ready = !needsReason || (reason && (reason !== "other" || note.trim().length > 3));
  return (
    <form className="kc-sheet" onSubmit={(e) => { e.preventDefault(); if (ready) onClose(kind, needsReason ? (reason as ReviewReason) : null, note); }}>
      <fieldset className="kc-choice"><legend>How did it end?</legend>
        <label><input type="radio" name="k" checked={kind === "closed_done"} onChange={() => setKind("closed_done")} /><span><b>The work was done</b><small>Field work happened; the history holds it</small></span></label>
        <label><input type="radio" name="k" checked={kind === "closed_no_action"} onChange={() => setKind("closed_no_action")} /><span><b>No field action</b><small>Say why: it changes what to fix</small></span></label>
        <label><input type="radio" name="k" checked={kind === "other_ngo"} onChange={() => setKind("other_ngo")} /><span><b>Another organisation took it</b><small>Never claims your team treated it</small></span></label>
      </fieldset>
      {needsReason && <div className="kc-f"><label htmlFor="cl-r">Reason</label><select id="cl-r" className="kc-in" value={reason} onChange={(e) => setReason(e.target.value as ReviewReason)} required><option value="">Choose a reason…</option>{REVIEW_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>}
      <div className="kc-f"><label htmlFor="cl-n">Note{reason === "other" ? "" : " (optional)"}</label><textarea id="cl-n" className="kc-in" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      {dueAfter > 0 && <p className="kc-hint">{dueAfter} follow-up{dueAfter === 1 ? " stays" : "s stay"} due after closing.</p>}
      <div className="kc-acts"><Btn type="submit" variant="primary" disabled={busy || !ready}>Close with this reason</Btn><Btn variant="quiet" onClick={onCancel}>Cancel</Btn></div>
    </form>
  );
}

function Reason({ busy, onSave }: { busy: boolean; onSave: (r: ReviewReason, note: string) => void }) {
  const [r, setR] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  return (
    <form className="kc-sheet" onSubmit={(e) => { e.preventDefault(); if (r) onSave(r, note); }}>
      <div className="kc-f"><label htmlFor="rs">Record why (keeps its original close date)</label><select id="rs" className="kc-in" value={r} onChange={(e) => setR(e.target.value as ReviewReason)}><option value="">Choose a reason…</option>{REVIEW_REASONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
      <input className="kc-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
      <div className="kc-acts"><Btn type="submit" disabled={busy || !r}>Record the reason</Btn></div>
    </form>
  );
}

function NoteForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (t: string) => void }) {
  const [t, setT] = useState("");
  return (
    <form className="kc-sheet" onSubmit={(e) => { e.preventDefault(); if (t.trim()) onSave(t.trim()); }}>
      <div className="kc-f"><label htmlFor="nt">Note on the case history</label><textarea id="nt" className="kc-in" value={t} onChange={(e) => setT(e.target.value)} placeholder="A visit, a call, what you saw" /></div>
      <div className="kc-acts"><Btn type="submit" variant="primary" disabled={busy || !t.trim()}>Add to history</Btn><Btn variant="quiet" onClick={onCancel}>Cancel</Btn></div>
    </form>
  );
}

function FollowupForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (due: string, note: string) => void }) {
  const [d, setD] = useState(() => new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form className="kc-sheet" onSubmit={(e) => { e.preventDefault();
      const due = new Date(`${d}T10:00:00+05:30`);
      if (!Number.isFinite(due.getTime())) { setError("Choose a valid due date."); return; }
      setError(null); onSave(due.toISOString(), note); }}>
      <div className="kc-two">
        <div className="kc-f"><label htmlFor="fd">Due</label><input id="fd" type="date" required aria-invalid={!!error} aria-describedby={error ? "fd-error" : undefined} className="kc-in" value={d} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setD(e.target.value)} /></div>
        <div className="kc-f"><label htmlFor="fn">What to check</label><input id="fn" className="kc-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Wound recheck, second dose…" /></div>
      </div>
      {error && <p id="fd-error" className="kc-err" role="alert">{error}</p>}
      <p className="kc-hint">A follow-up is its own task with its own date. It survives the case closing.</p>
      <div className="kc-acts"><Btn type="submit" variant="primary" disabled={busy}>Schedule</Btn><Btn variant="quiet" onClick={onCancel}>Cancel</Btn></div>
    </form>
  );
}

export function FollowupList({ file, onChanged }: { file: CaseFile; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const fus = [...file.followups].sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
  if (!fus.length) return <p className="kc-quiet is-pad">No follow-up scheduled on this case.</p>;
  const act = async (id: string, s: "done" | "missed" | "postponed", dueAt?: string) => {
    setBusy(id); setReceipt(null);
    let r: Receipt;
    try { r = await setFollowup(id, s, undefined, dueAt); } catch { r = { ok: false, error: "The connection dropped." } as Receipt; }
    setReceipt(r); setBusy(null);
    if (r.ok) { notify({ tone: "ok", text: s === "done" ? "Follow-up marked done." : s === "missed" ? "Follow-up marked missed." : "Follow-up moved by 7 days." }); await onChanged(); }
    else notify({ tone: "error", text: `Not saved. ${("error" in r && r.error) || "Try again."}`, action: { label: "Try again", run: () => act(id, s, dueAt) } });
  };
  return (
    <>
      <ul className="kc-items kc-scope" aria-label="Follow-ups">
        {fus.map((f) => {
          const late = f.status === "upcoming" && Date.parse(f.due_at) < Date.now();
          return (
            <li key={f.id} className="kc-item">
              <span className="kc-item-t"><b>{(f.kind ?? "Recheck").replace(/_/g, " ")}</b>{f.note ? <small>{f.note}</small> : null}</span>
              <span className="kc-item-e">
                <Tag tone={f.status === "done" ? "green" : f.status === "missed" ? "amber" : late ? "flame" : "blue"}>{f.status === "upcoming" ? (late ? `Late · due ${day(f.due_at)}` : `Due ${day(f.due_at)}`) : `${f.status} ${f.completed_at ? day(f.completed_at) : ""}`}</Tag>
                {f.status === "upcoming" && <>
                  <Btn small disabled={busy === f.id} onClick={() => act(f.id, "done")}>Done</Btn>
                  <Btn small disabled={busy === f.id} onClick={() => act(f.id, "missed")}>Missed</Btn>
                  <Btn small variant="quiet" disabled={busy === f.id} onClick={() => act(f.id, "postponed", new Date(Date.now() + 7 * DAY).toISOString())}>+7 days</Btn>
                </>}
                <DeleteRecord kind="followup" id={f.id} what="this follow-up" onDone={() => void onChanged()} />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="ns-ack kc-scope" aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : receipt?.ok ? <Ack state="saved">{receipt.what}</Ack> : receipt ? <Ack state="failed">Not saved: {receipt.error}</Ack> : null}</div>
    </>
  );
}
