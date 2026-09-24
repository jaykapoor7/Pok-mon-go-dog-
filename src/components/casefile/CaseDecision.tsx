"use client";

/* ════════════════════════════════════════════════════════════════════
   What happens next. The case file's one panel of actions.

   Where the case really is comes from the register's status_class, not
   the workflow enum (an imported case can read "resolved" in the enum
   while its register says it is still being worked). From there:

   · an open case is claimed, taken or assigned, started, resolved with
     proof, or closed — and a close always says how it ended. Closing
     without field action asks why, because "could not find the animal"
     and "could not reach the caller" need different fixes;
   · an open case nobody has touched for a month and that is older than
     three months asks the review question directly;
   · a case that closed without action and never said why asks for the
     reason (recording it does not reopen or re-date the case).

   Every close takes a second tap. Nothing here runs on a timer.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { Camera, Check, CheckCircle2, Hand, Loader2, Play, RotateCcw, UserPlus, Wallet } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { uploadPhoto } from "@/lib/actions";
import { assignCase, claimCase, parseINRAmount, setCaseCost, updateCaseStatus } from "@/lib/case-actions";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import { REVIEW_REASONS, reviewCase, type ReviewDecision, type ReviewReason } from "@/lib/review";
import { CLOSURE_META, type ClosureReason } from "@/lib/register/taxonomy";
import { formatINR } from "@/lib/fundraisers";
import type { CaseFile } from "@/lib/case-file";
import type { CaseResolution } from "@/lib/types";
import { span } from "./CaseClock";

const DAY = 86_400_000;
const RESOLUTIONS: { key: CaseResolution; label: string }[] = [
  { key: "treated", label: "Treated" },
  { key: "sterilized", label: "Sterilised" },
  { key: "rescued", label: "Rescued" },
];
type CloseKind = "closed_done" | "closed_no_action" | "other_ngo";

export function isOpenClass(cls: string | null, status: string) {
  if (cls) return cls === "open" || cls === "in_progress";
  return status !== "resolved" && status !== "closed";
}

export function CaseDecision({ file, member, onChanged }: { file: CaseFile; member: boolean; onChanged: () => Promise<void> }) {
  const { user } = useAuth();
  const { c, reg } = file;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [mode, setMode] = useState<null | "resolve" | "close">(null);

  useEffect(() => { if (member) getMyOrgMembers().then(setMembers).catch(() => {}); }, [member]);

  const actor = user ? { id: user.id, name: user.name } : null;
  const open = isOpenClass(reg.status_class, c.status);
  const mine = !!actor && c.assignee_id === actor.id;
  const pool = !c.ngo_id;
  const now = Date.now();
  const age = Math.floor((now - Date.parse(reg.occurred_at)) / DAY);
  const quiet = Math.floor((now - Date.parse(c.last_activity_at || reg.occurred_at)) / DAY);
  const stale = open && age > 90 && quiet > 30;
  const reasonless = !open && (reg.status_class === "no_action" || reg.status_class === "not_attended") && (!reg.closure_reason || reg.closure_reason === "unspecified");

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string } | boolean | void>, success: string) => {
    setBusy(key); setError(null); setDone(null);
    try {
      const r = await fn();
      const ok = r === undefined || r === true || (typeof r === "object" && r.ok);
      if (!ok) { setError(typeof r === "object" && r?.error ? r.error : "That was not saved. Please try again."); return false; }
      setDone(success); setMode(null);
      await onChanged();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That was not saved. Please try again.");
      return false;
    } finally { setBusy(null); }
  };
  const review = (decision: ReviewDecision, reason?: ReviewReason | null, note?: string, success = "Recorded.") =>
    run(decision, () => reviewCase({ caseId: c.id, decision, actorName: actor?.name ?? "A member", reason, note }), success);

  if (!member || !actor) return null;

  return (
    <section className="cf-panel" aria-labelledby="cf-next">
      <h2 id="cf-next" className="cf-panel-h">What happens next</h2>

      {open && stale && (
        <div className="cf-stale">
          <p><b>Open for {span(age)}, and nothing recorded for {span(quiet)}.</b> Is anyone still working it?</p>
          <div className="cf-row">
            <button type="button" className="cf-btn" disabled={!!busy} onClick={() => review("still_active", null, undefined, "Marked still active. The quiet clock starts again today.")}>
              {busy === "still_active" ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Still active
            </button>
            <button type="button" className="cf-btn is-ink" disabled={!!busy} onClick={() => setMode("close")}>It has ended…</button>
          </div>
        </div>
      )}

      {open && (
        <>
          <Ownership file={file} members={members} mine={mine} pool={pool} busy={busy}
            onClaim={() => run("claim", () => claimCase(c.id, actor), "The case is yours.")}
            onAssign={(m) => run("assign", () => assignCase(c.id, { id: m.user_id, name: m.name }, actor), m.user_id === actor.id ? "The case is yours." : `Assigned to ${m.name}.`)}
            me={actor.id} />

          {mine && mode !== "resolve" && (
            <div className="cf-row">
              {c.status === "assigned" && (
                <button type="button" className="cf-btn" disabled={!!busy} onClick={() => run("start", () => updateCaseStatus(c.id, "in_progress", actor), "Marked in progress.")}>
                  {busy === "start" ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Start working
                </button>
              )}
              <button type="button" className="cf-btn is-ink" disabled={!!busy} onClick={() => setMode("resolve")}><CheckCircle2 size={15} /> Resolve with proof</button>
            </div>
          )}
          {mine && mode === "resolve" && <Resolve busy={busy} onCancel={() => setMode(null)} onSubmit={async (v) => {
            await run("resolve", async () => {
              const afterUrl = await uploadPhoto(v.after);
              const beforeUrl = v.before ? await uploadPhoto(v.before) : null;
              return updateCaseStatus(c.id, "resolved", actor, { resolution: v.resolution, afterUrl, beforeUrl, outcomeNote: v.note + (v.returned ? "\n✓ Returned to the exact catch location." : "") });
            }, "Resolved. The outcome is on the record.");
          }} />}

          {mode !== "resolve" && (mode === "close"
            ? <Close busy={busy} onCancel={() => setMode(null)} onClose={(kind, reason, note) => review(kind, reason, note,
                kind === "closed_done" ? "Closed: the work was done." : kind === "other_ngo" ? "Closed: another organisation took it." : "Closed without field action. The reason is on the record.")} />
            : !stale && <button type="button" className="cf-link" onClick={() => setMode("close")}>Close this case without the proof flow…</button>)}
        </>
      )}

      {!open && (
        <div className="cf-closed">
          <p>
            <b>{closedSentence(file)}</b>
            {reg.closure_reason && reg.closure_reason !== "unspecified" && CLOSURE_META[reg.closure_reason as ClosureReason]?.lesson ? <> {CLOSURE_META[reg.closure_reason as ClosureReason].lesson}</> : null}
          </p>
          {reasonless && <Reason busy={busy} onSave={(reason, note) => review("set_reason", reason, note, "Reason recorded. The case keeps its original close.")} />}
          {mine && (
            <div className="cf-row">
              {c.status === "resolved" && reg.status_class === "closed" && (
                <button type="button" className="cf-btn" disabled={!!busy} onClick={() => run("close", () => updateCaseStatus(c.id, "closed", actor), "Case closed.")}>Close the case</button>
              )}
              <button type="button" className="cf-btn" disabled={!!busy} onClick={() => run("reopen", () => updateCaseStatus(c.id, "in_progress", actor), "Reopened.")}>
                {busy === "reopen" ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Reopen
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="cf-msg is-err" role="alert">{error}</p>}
      {done && <p className="cf-msg" role="status"><Check size={15} /> {done}</p>}

      <Cost file={file} busy={busy} onSave={(estimate, spent) => run("cost", () => setCaseCost(c.id, { estimate, spent }), "Costs saved.")} />
    </section>
  );
}

function closedSentence({ c, reg }: CaseFile) {
  const cls = reg.status_class;
  if (cls === "no_action") return reg.closure_reason && reg.closure_reason !== "unspecified" ? `Closed without field action: ${CLOSURE_META[reg.closure_reason as ClosureReason]?.label.toLowerCase() ?? reg.closure_reason}.` : "Closed without field action, and the reason was never recorded.";
  if (cls === "not_attended") return "Closed: nobody could attend.";
  if (cls === "other_ngo") return "Closed: another organisation took the case.";
  if (c.status === "resolved" && c.proof_verified) return "Resolved with proof, and the proof has been checked.";
  if (c.status === "resolved" && c.after_url) return "Resolved with proof.";
  return "Closed after field work.";
}

function Ownership({ file, members, mine, pool, busy, onClaim, onAssign, me }: {
  file: CaseFile; members: OrgMember[]; mine: boolean; pool: boolean; busy: string | null; me: string;
  onClaim: () => void; onAssign: (m: OrgMember) => void;
}) {
  const { c } = file;
  if (pool) return (
    <div className="cf-own">
      <p>No organisation holds this report yet.</p>
      <button type="button" className="cf-btn is-flame" disabled={!!busy} onClick={onClaim}>{busy === "claim" ? <Loader2 size={15} className="animate-spin" /> : <Hand size={15} />} Claim it for your organisation</button>
    </div>
  );
  const self = members.find((m) => m.user_id === me);
  return (
    <div className="cf-own">
      <p>{mine ? <>This case is <b>with you</b>.</> : c.assignee_name ? <>With <b>{c.assignee_name}</b>.</> : <><b>Nobody has this case.</b> Take it, or give it to someone.</>}</p>
      <div className="cf-row">
        {!c.assignee_id && self && (
          <button type="button" className="cf-btn is-flame" disabled={!!busy} onClick={() => onAssign(self)}>{busy === "assign" ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Take it</button>
        )}
        {members.length > 0 && (
          <label className="cf-select">
            <span className="sys-sr">Assign to</span>
            <select value="" disabled={!!busy} onChange={(e) => { const m = members.find((x) => x.user_id === e.target.value); if (m) onAssign(m); }}>
              <option value="">{c.assignee_id ? "Reassign to…" : "Assign to…"}</option>
              {members.filter((m) => m.user_id !== c.assignee_id).map((m) => <option key={m.user_id} value={m.user_id}>{m.name}{m.user_id === me ? " (you)" : ""}</option>)}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

function Close({ busy, onCancel, onClose }: { busy: string | null; onCancel: () => void; onClose: (k: CloseKind, r?: ReviewReason | null, note?: string) => void }) {
  const [kind, setKind] = useState<CloseKind | null>(null);
  const [reason, setReason] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  const [sure, setSure] = useState(false);
  const ready = kind && (kind !== "closed_no_action" || (reason && (reason !== "other" || note.trim())));
  const choices: { k: CloseKind; label: string; hint: string }[] = [
    { k: "closed_done", label: "The work was done", hint: "Treated, rescued or otherwise finished in the field." },
    { k: "closed_no_action", label: "It ended without field action", hint: "Say why — this is what the reasons chart is made of." },
    { k: "other_ngo", label: "Another organisation took it", hint: "Handed on; their outcome is theirs to record." },
  ];
  return (
    <fieldset className="cf-close">
      <legend>How did it end?</legend>
      {choices.map((ch) => (
        <label key={ch.k} className={`cf-choice ${kind === ch.k ? "is-on" : ""}`}>
          <input type="radio" name="cf-close" checked={kind === ch.k} onChange={() => { setKind(ch.k); setSure(false); }} />
          <span><b>{ch.label}</b><small>{ch.hint}</small></span>
        </label>
      ))}
      {kind === "closed_no_action" && (
        <div className="cf-reason">
          <select value={reason} onChange={(e) => { setReason(e.target.value as ReviewReason); setSure(false); }} aria-label="Why it closed without field action">
            <option value="">Why?</option>
            {REVIEW_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
      )}
      {kind && <input className="cf-note-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder={reason === "other" ? "Say what happened (needed)" : "A line for the history (optional)"} />}
      <div className="cf-row">
        <button type="button" className="cf-btn is-quiet" onClick={onCancel}>Cancel</button>
        {!sure
          ? <button type="button" className="cf-btn is-ink" disabled={!ready || !!busy} onClick={() => setSure(true)}>Close the case</button>
          : <button type="button" className="cf-btn is-flame" disabled={!!busy} onClick={() => kind && onClose(kind, kind === "closed_no_action" ? (reason || null) as ReviewReason | null : null, note)}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Yes, close it
            </button>}
      </div>
      {sure && <p className="cf-fine">It is written into the case&rsquo;s history under your name. A closed case can be reopened by whoever holds it.</p>}
    </fieldset>
  );
}

function Reason({ busy, onSave }: { busy: string | null; onSave: (r: ReviewReason, note?: string) => void }) {
  const [reason, setReason] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  return (
    <div className="cf-reason-set">
      <p className="cf-q">Why did it close without field action?</p>
      <div className="cf-row">
        <select value={reason} onChange={(e) => setReason(e.target.value as ReviewReason)} aria-label="Reason">
          <option value="">Choose a reason</option>
          {REVIEW_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        {reason === "other" && <input className="cf-note-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Say what happened" />}
        <button type="button" className="cf-btn is-ink" disabled={!reason || (reason === "other" && !note.trim()) || !!busy} onClick={() => reason && onSave(reason, note)}>
          {busy === "set_reason" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Record it
        </button>
      </div>
    </div>
  );
}

function Resolve({ busy, onCancel, onSubmit }: {
  busy: string | null; onCancel: () => void;
  onSubmit: (v: { resolution: CaseResolution; after: File; before: File | null; note: string; returned: boolean }) => void;
}) {
  const [resolution, setResolution] = useState<CaseResolution | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [before, setBefore] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [returned, setReturned] = useState(false);
  const ready = resolution && after && note.trim();
  return (
    <div className="cf-resolve">
      <p className="cf-q">What was done?</p>
      <div className="cf-seg" role="radiogroup" aria-label="Resolution">
        {RESOLUTIONS.map((r) => <button key={r.key} type="button" role="radio" aria-checked={resolution === r.key} className={resolution === r.key ? "is-on" : ""} onClick={() => setResolution(r.key)}>{r.label}</button>)}
      </div>
      <PhotoPick label="After photo" need file={after} onPick={setAfter} />
      <PhotoPick label="Before photo (optional)" file={before} onPick={setBefore} />
      <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done, and how the animal is now" />
      <label className="cf-check">
        <input type="checkbox" checked={returned} onChange={(e) => setReturned(e.target.checked)} />
        <span><b>Returned to the exact place it was caught.</b> Street dogs hold territory; released elsewhere, a dog loses its food, its shelter and its group.</span>
      </label>
      <div className="cf-row">
        <button type="button" className="cf-btn is-quiet" onClick={onCancel}>Cancel</button>
        <button type="button" className="cf-btn is-ink" disabled={!ready || !!busy} onClick={() => ready && onSubmit({ resolution: resolution!, after: after!, before, note: note.trim(), returned })}>
          {busy === "resolve" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Resolve the case
        </button>
      </div>
      <p className="cf-fine">The after photo is what makes a resolution count as evidence. It is checked before it appears in impact figures.</p>
    </div>
  );
}

function PhotoPick({ label, need, file, onPick }: { label: string; need?: boolean; file: File | null; onPick: (f: File | null) => void }) {
  return (
    <label className={`cf-photo ${file ? "is-set" : ""}`}>
      <Camera size={15} /> <span>{file ? file.name : label}</span>{need && !file && <em>needed</em>}
      <input type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}

function Cost({ file, busy, onSave }: { file: CaseFile; busy: string | null; onSave: (e: number | null, s: number | null) => void }) {
  const { c } = file;
  const [openCost, setOpenCost] = useState(false);
  const [estimate, setEstimate] = useState(c.cost_estimate?.toString() ?? "");
  const [spent, setSpent] = useState(c.cost_spent?.toString() ?? "");
  const [err, setErr] = useState<string | null>(null);
  const has = c.cost_estimate != null || c.cost_spent != null;
  return (
    <div className="cf-cost">
      <button type="button" className="cf-cost-h" aria-expanded={openCost} onClick={() => setOpenCost((v) => !v)}>
        <Wallet size={15} /> <span>Costs</span>
        <small>{has ? `${c.cost_spent != null ? formatINR(c.cost_spent) : "₹—"} spent of ${c.cost_estimate != null ? formatINR(c.cost_estimate) : "no estimate"}` : "Not recorded"}</small>
      </button>
      {openCost && (
        <div className="cf-cost-b">
          <label>Estimate (₹)<input inputMode="decimal" value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="0" /></label>
          <label>Spent so far (₹)<input inputMode="decimal" value={spent} onChange={(e) => setSpent(e.target.value)} placeholder="0" /></label>
          <button type="button" className="cf-btn" disabled={!!busy} onClick={() => {
            const e = estimate === "" ? null : parseINRAmount(estimate), s = spent === "" ? null : parseINRAmount(spent);
            if ((estimate !== "" && e === null) || (spent !== "" && s === null)) { setErr("Enter an amount in rupees, like 2500 or 2500.50."); return; }
            setErr(null); onSave(e, s);
          }}>Save costs</button>
          {err && <p className="cf-msg is-err">{err}</p>}
        </div>
      )}
    </div>
  );
}
