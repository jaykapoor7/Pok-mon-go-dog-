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
import { addNote, assignTo, decideCase, resolveCase, scheduleFollowup, setFollowup, startWork, takeCase, type Receipt } from "../data/work";
import { Ack, day } from "../ui";

const DAY = 86_400_000;
type Mode = null | "outcome" | "close" | "note" | "followup";

export function NextStep({ file, cohort, onChanged }: { file: CaseFile; cohort: "live" | "decide" | "history"; onChanged: () => Promise<void> }) {
  const { user } = useAuth();
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

  const go = async (key: string, fn: () => Promise<Receipt>) => {
    setBusy(key); setReceipt(null);
    const r = await fn();
    setReceipt(r); setBusy(null);
    if (r.ok) { setMode(null); await onChanged(); }
  };
  const self = members.find((m) => m.user_id === actor.id);

  return (
    <section className="next" aria-labelledby="next-h">
      <h3 id="next-h">Next step</h3>

      {(imported || cohort === "history") && open && (
        <div className="next-block">
          <p>This status was copied from a historical register and has <b>never been confirmed</b>. It is not today&rsquo;s work until a person says so.</p>
          <div className="row">
            <button type="button" className="btn is-s" disabled={!!busy} onClick={() => go("still", () => decideCase(c.id, "still_active", actor.name, null, "Confirmed still active during historical review"))}>It is still active</button>
            <button type="button" className="btn is-s is-ink" disabled={!!busy} onClick={() => setMode("close")}>It has ended…</button>
          </div>
        </div>
      )}

      {!imported && stale && (
        <div className="next-block">
          <p><b>Open for {age} days, nothing recorded for {quiet}.</b> Is anyone still working it?</p>
          <div className="row">
            <button type="button" className="btn is-s" disabled={!!busy} onClick={() => go("still", () => decideCase(c.id, "still_active", actor.name))}>Still active</button>
            <button type="button" className="btn is-s is-ink" disabled={!!busy} onClick={() => setMode("close")}>It has ended…</button>
          </div>
        </div>
      )}

      {open && !imported && (
        <div className="next-block">
          {pool ? (
            <>
              <p>No organisation holds this report yet. Claiming it makes your organisation accountable; it is not a promise of a rescue time.</p>
              <button type="button" className="btn is-flame" disabled={!!busy} onClick={() => go("claim", () => takeCase(c.id, actor))}>Claim for your organisation</button>
            </>
          ) : (
            <>
              <p>{mine ? <>This case is <b>with you</b>{c.status === "in_progress" ? ", in progress" : ""}.</> : c.assignee_name ? <>Held by <b>{c.assignee_name}</b>.</> : <><b>Nobody holds this case.</b> Take it, or give it to a named person.</>}</p>
              <div className="row">
                {!c.assignee_id && self && <button type="button" className="btn is-flame is-s" disabled={!!busy} onClick={() => go("take", () => assignTo(c.id, { id: self.user_id, name: self.name }, actor))}>Take it</button>}
                {members.length > 0 && (
                  <select className="select next-select" value="" disabled={!!busy} aria-label={c.assignee_id ? "Reassign to" : "Assign to"} onChange={(e) => { const m = members.find((x) => x.user_id === e.target.value); if (m) void go("assign", () => assignTo(c.id, { id: m.user_id, name: m.name }, actor)); }}>
                    <option value="">{c.assignee_id ? "Reassign to…" : "Assign to…"}</option>
                    {members.filter((m) => m.user_id !== c.assignee_id).map((m) => <option key={m.user_id} value={m.user_id}>{m.name}{m.user_id === actor.id ? " (you)" : ""} · {m.role}</option>)}
                  </select>
                )}
                {mine && c.status === "assigned" && <button type="button" className="btn is-s" disabled={!!busy} onClick={() => go("start", () => startWork(c.id, actor))}>Start work</button>}
                {mine && <button type="button" className="btn is-ink is-s" disabled={!!busy} onClick={() => setMode(mode === "outcome" ? null : "outcome")}>Record the outcome…</button>}
              </div>
            </>
          )}
          {!pool && mode !== "close" && <button type="button" className="btn is-ghost is-s next-link" onClick={() => setMode("close")}>Close without field action, or because another organisation took it…</button>}
        </div>
      )}

      {mode === "outcome" && <Outcome busy={!!busy} dueAfter={dueAfter.length} onCancel={() => setMode(null)} onSubmit={(v) => go("resolve", async () => {
        let afterUrl: string | null = null;
        if (v.photo) { try { afterUrl = await uploadPhoto(v.photo); } catch { return { ok: false, error: "The photo did not upload. Nothing was saved; try again or record without a photo." }; } }
        return resolveCase(c.id, actor, { resolution: v.resolution, note: v.note, afterUrl });
      })} />}
      {mode === "close" && <Close busy={!!busy} dueAfter={dueAfter.length} onCancel={() => setMode(null)} onClose={(kind, reason, note) => go("close", () => decideCase(c.id, kind, actor.name, reason, note))} />}

      {!open && (
        <div className="next-block">
          <p>{reg.status_class === "no_action" ? (reasonless ? "Closed without field action. The reason was never recorded." : `Closed without field action: ${(reg.closure_reason ?? "").replace(/_/g, " ")}.`) : reg.status_class === "other_ngo" ? "Closed: another organisation took the case." : "Closed after field work."}</p>
          {reasonless && <Reason busy={!!busy} onSave={(reason, note) => go("reason", () => decideCase(c.id, "set_reason", actor.name, reason, note))} />}
          {dueAfter.length > 0 && <p className="small">{dueAfter.length} follow-up{dueAfter.length === 1 ? " stays" : "s stay"} due after closing. Closing never cancels care still owed.</p>}
        </div>
      )}

      <div className="row next-more">
        <button type="button" className="btn is-s" aria-pressed={mode === "note"} onClick={() => setMode(mode === "note" ? null : "note")}>Add a note</button>
        <button type="button" className="btn is-s" aria-pressed={mode === "followup"} onClick={() => setMode(mode === "followup" ? null : "followup")}>Schedule a follow-up</button>
      </div>
      {mode === "note" && <NoteForm busy={!!busy} onCancel={() => setMode(null)} onSave={(t) => go("note", () => addNote(c.id, actor, t))} />}
      {mode === "followup" && <FollowupForm busy={!!busy} onCancel={() => setMode(null)} onSave={(due, note) => go("fu", () => scheduleFollowup(c.id, c.dog_id ?? null, due, note))} />}

      <div className="next-ack" aria-live="polite">
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
    <form className="next-form" onSubmit={(e) => { e.preventDefault(); if (note.trim().length >= 8) onSubmit({ resolution, note: note.trim(), photo }); }}>
      <fieldset className="choice next-choice"><legend className="label">What was done</legend>
        {(["treated", "sterilized", "rescued"] as CaseResolution[]).map((r) => <label key={r}><input type="radio" name="res" checked={resolution === r} onChange={() => setResolution(r)} /><span><b>{r === "treated" ? "Treated" : r === "sterilized" ? "Sterilised" : "Rescued"}</b></span></label>)}
      </fieldset>
      <div className="field"><label htmlFor="out-note">Outcome, in your words</label><textarea id="out-note" className="textarea" required minLength={8} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened, where the animal is now, anything the next person needs to know" /><span className="hint">Recorded with your name and today&rsquo;s date. A typed note is a report, not a clinician&rsquo;s sign-off.</span></div>
      <div className="field"><label htmlFor="out-photo">Photo after care (optional)</label><input id="out-photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /><span className="hint">Stays private to your organisation and starts blurred anywhere it may show an injury.</span></div>
      {dueAfter > 0 && <p className="small">{dueAfter} follow-up{dueAfter === 1 ? " stays" : "s stay"} due after this case closes.</p>}
      <div className="row"><button type="submit" className="btn is-ink is-s" disabled={busy || note.trim().length < 8}>Record outcome and close</button><button type="button" className="btn is-ghost is-s" onClick={onCancel}>Cancel</button></div>
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
    <form className="next-form" onSubmit={(e) => { e.preventDefault(); if (ready) onClose(kind, needsReason ? (reason as ReviewReason) : null, note); }}>
      <fieldset className="choice next-choice"><legend className="label">How did it end?</legend>
        <label><input type="radio" name="k" checked={kind === "closed_done"} onChange={() => setKind("closed_done")} /><span><b>The work was done</b><small>Field work happened; the history holds it</small></span></label>
        <label><input type="radio" name="k" checked={kind === "closed_no_action"} onChange={() => setKind("closed_no_action")} /><span><b>No field action</b><small>Say why: it changes what to fix</small></span></label>
        <label><input type="radio" name="k" checked={kind === "other_ngo"} onChange={() => setKind("other_ngo")} /><span><b>Another organisation took it</b><small>Never claims your team treated it</small></span></label>
      </fieldset>
      {needsReason && <div className="field"><label htmlFor="cl-r">Reason</label><select id="cl-r" className="select" value={reason} onChange={(e) => setReason(e.target.value as ReviewReason)} required><option value="">Choose a reason…</option>{REVIEW_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>}
      <div className="field"><label htmlFor="cl-n">Note{reason === "other" ? "" : " (optional)"}</label><textarea id="cl-n" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      {dueAfter > 0 && <p className="small">{dueAfter} follow-up{dueAfter === 1 ? " stays" : "s stay"} due after closing.</p>}
      <div className="row"><button type="submit" className="btn is-ink is-s" disabled={busy || !ready}>Close with this reason</button><button type="button" className="btn is-ghost is-s" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function Reason({ busy, onSave }: { busy: boolean; onSave: (r: ReviewReason, note: string) => void }) {
  const [r, setR] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  return (
    <form className="next-form" onSubmit={(e) => { e.preventDefault(); if (r) onSave(r, note); }}>
      <div className="field"><label htmlFor="rs">Record why (keeps its original close date)</label><select id="rs" className="select" value={r} onChange={(e) => setR(e.target.value as ReviewReason)}><option value="">Choose a reason…</option>{REVIEW_REASONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
      <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
      <button type="submit" className="btn is-s" disabled={busy || !r}>Record the reason</button>
    </form>
  );
}

function NoteForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (t: string) => void }) {
  const [t, setT] = useState("");
  return (
    <form className="next-form" onSubmit={(e) => { e.preventDefault(); if (t.trim()) onSave(t.trim()); }}>
      <div className="field"><label htmlFor="nt">Note on the case history</label><textarea id="nt" className="textarea" value={t} onChange={(e) => setT(e.target.value)} placeholder="A visit, a call, what you saw" /></div>
      <div className="row"><button type="submit" className="btn is-ink is-s" disabled={busy || !t.trim()}>Add to history</button><button type="button" className="btn is-ghost is-s" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function FollowupForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (due: string, note: string) => void }) {
  const [d, setD] = useState(() => new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  return (
    <form className="next-form" onSubmit={(e) => { e.preventDefault(); onSave(new Date(`${d}T10:00:00+05:30`).toISOString(), note); }}>
      <div className="row" style={{ alignItems: "end" }}>
        <div className="field"><label htmlFor="fd">Due</label><input id="fd" type="date" className="input" value={d} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setD(e.target.value)} /></div>
        <div className="field" style={{ flex: 1 }}><label htmlFor="fn">What to check</label><input id="fn" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Wound recheck, second dose…" /></div>
      </div>
      <p className="small">A follow-up is its own task with its own date. It survives the case closing.</p>
      <div className="row"><button type="submit" className="btn is-ink is-s" disabled={busy}>Schedule</button><button type="button" className="btn is-ghost is-s" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

export function FollowupList({ file, onChanged }: { file: CaseFile; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const fus = [...file.followups].sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
  if (!fus.length) return <p className="small">No follow-up scheduled on this case.</p>;
  const act = async (id: string, s: "done" | "missed" | "postponed", dueAt?: string) => {
    setBusy(id); setReceipt(null);
    const r = await setFollowup(id, s, undefined, dueAt);
    setReceipt(r); setBusy(null);
    if (r.ok) await onChanged();
  };
  return (
    <>
      <ul className="fus">
        {fus.map((f) => {
          const late = f.status === "upcoming" && Date.parse(f.due_at) < Date.now();
          return (
            <li key={f.id}>
              <span><b>{(f.kind ?? "Recheck").replace(/_/g, " ")}</b><small>{f.note ?? ""}</small></span>
              <span className={`pill ${f.status === "done" ? "is-care" : f.status === "missed" ? "is-caution" : late ? "is-urgent" : "is-info"}`}>{f.status === "upcoming" ? (late ? `Late · due ${day(f.due_at)}` : `Due ${day(f.due_at)}`) : `${f.status} ${f.completed_at ? day(f.completed_at) : ""}`}</span>
              {f.status === "upcoming" && (
                <span className="row fus-act">
                  <button type="button" className="btn is-xs" disabled={busy === f.id} onClick={() => act(f.id, "done")}>Done</button>
                  <button type="button" className="btn is-xs" disabled={busy === f.id} onClick={() => act(f.id, "missed")}>Missed</button>
                  <button type="button" className="btn is-xs is-ghost" disabled={busy === f.id} onClick={() => act(f.id, "postponed", new Date(Date.now() + 7 * DAY).toISOString())}>+7 days</button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : receipt?.ok ? <Ack state="saved">{receipt.what}</Ack> : receipt ? <Ack state="failed">Not saved: {receipt.error}</Ack> : null}</div>
    </>
  );
}
