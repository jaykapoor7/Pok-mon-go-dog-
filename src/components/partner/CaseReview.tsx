"use client";

/* ════════════════════════════════════════════════════════════════════
   Case review: old work, decided by a person.

   A case open for months is usually finished work nobody closed, and it
   makes every open-work figure wrong. This screen puts those cases in
   front of someone who knows, oldest first, and asks one question of
   each: what happened? The answers — still active, done, closed without
   action and why, handed on — are written into each case's history under
   the reviewer's name. Nothing is closed by a timer, and every close asks
   for a second tap.

   The second tab does the same for requests that closed without field
   action but never said why: "could not find the animal" and "could not
   reach the caller" need different fixes, and the register cannot tell
   them apart until someone says.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import { REVIEW_REASONS, reasonlessCases, reviewCase, staleCases, type ReviewCase, type ReviewDecision, type ReviewReason } from "@/lib/review";
import "./review.css";

type Tab = "stale" | "reasons";
type Done = { label: string; ok: boolean };

const DAY = 86_400_000;
const ageOf = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY)) : 0);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const ageLabel = (d: number) => (d >= 365 ? `${(d / 365).toFixed(1)} years` : d >= 60 ? `${Math.round(d / 30)} months` : `${d} days`);
const who = (c: ReviewCase) => {
  const name = (c.animal_name ?? "").trim(), place = (c.zone ?? "").trim();
  return [c.case_code, name, place && !name.toLowerCase().includes(place.toLowerCase()) ? place : ""].filter(Boolean).join(" · ");
};
const crit = (c: ReviewCase) => DEFAULT_TRIAGE[(c.condition_class ?? "Not recorded") as Condition] === "Critical";
const BANDS = [
  { id: "y", label: "Open for more than a year", min: 365 },
  { id: "h", label: "Six months to a year", min: 180 },
  { id: "q", label: "Three to six months", min: 90 },
  { id: "r", label: "Under three months", min: 0 },
];
const DECISION_LABEL: Record<ReviewDecision, string> = {
  still_active: "Marked still active",
  closed_done: "Closed — the work was done",
  closed_no_action: "Closed without field action",
  other_ngo: "Closed — another organisation took it",
  set_reason: "Reason recorded",
};

export function CaseReview({ initialTab = "stale" }: { initialTab?: Tab }) {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [minAge, setMinAge] = useState(90);
  const [stale, setStale] = useState<ReviewCase[] | null>(null);
  const [reasonless, setReasonless] = useState<ReviewCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cond, setCond] = useState("");
  const [q, setQ] = useState("");
  const [done, setDone] = useState<Record<string, Done>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!ready || !accessReady) return;
    if (!user || !member) { setStale([]); setReasonless([]); return; }
    let live = true;
    Promise.all([staleCases(90), reasonlessCases()])
      .then(([a, b]) => { if (live) { setStale(a); setReasonless(b); } })
      .catch((e: Error) => { if (live) { setError(e.message); setStale([]); setReasonless([]); } });
    return () => { live = false; };
  }, [ready, accessReady, user, member]);

  const rows = tab === "stale" ? stale : reasonless;
  const shown = useMemo(() => (rows ?? []).filter((c) => {
    if (tab === "stale" && ageOf(c.occurred_at) < minAge) return false;
    if (cond && c.condition_class !== cond) return false;
    if (q) {
      const hay = `${c.case_code ?? ""} ${c.title ?? ""} ${c.animal_name ?? ""} ${c.zone ?? ""} ${c.straypaw_id ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [rows, tab, minAge, cond, q]);
  const conditions = useMemo(() => [...new Set((rows ?? []).map((c) => c.condition_class).filter(Boolean) as string[])].sort(), [rows]);
  const pending = shown.filter((c) => !done[c.id]);
  const decided = Object.values(done).filter((d) => d.ok).length;

  const decide = async (c: ReviewCase, decision: ReviewDecision, reason?: ReviewReason | null, note?: string) => {
    const r = await reviewCase({ caseId: c.id, decision, actorName: user?.name ?? "A member", reason, note });
    setDone((d) => ({ ...d, [c.id]: { ok: r.ok, label: r.ok ? DECISION_LABEL[decision] + (reason ? ` · ${REVIEW_REASONS.find((x) => x.id === reason)?.label.toLowerCase()}` : "") : r.error ?? "Could not save." } }));
    setSelected((s) => { const n = new Set(s); n.delete(c.id); return n; });
    return r.ok;
  };

  if (!ready || !accessReady || rows === null) return <main className="rv"><p className="rv-state"><Loader2 size={16} className="animate-spin" /> Reading your organisation&rsquo;s cases…</p></main>;
  if (!user || !member) return (
    <main className="rv">
      <Header count={0} />
      <p className="rv-state">Reviewing cases needs a member of the organisation that holds them. Sign in with your organisation to see its cases here.</p>
    </main>
  );

  return (
    <main className="rv">
      <Header count={stale?.length ?? 0} />

      {tab === "stale" && (stale?.length ?? 0) > 0 && <AgeStrip cases={stale!} done={done} />}

      <div className="rv-tabs" role="tablist" aria-label="What to review">
        <button role="tab" aria-selected={tab === "stale"} className={tab === "stale" ? "is-on" : ""} onClick={() => { setTab("stale"); setSelected(new Set()); }}>
          Open too long <b className="sys-mono">{(stale ?? []).filter((c) => !done[c.id]).length}</b>
        </button>
        <button role="tab" aria-selected={tab === "reasons"} className={tab === "reasons" ? "is-on" : ""} onClick={() => { setTab("reasons"); setSelected(new Set()); }}>
          Closed without a reason <b className="sys-mono">{(reasonless ?? []).filter((c) => !done[c.id]).length}</b>
        </button>
      </div>

      <div className="rv-filters">
        {tab === "stale" && (
          <div className="rv-seg" role="group" aria-label="Open for at least">
            {[90, 180, 365].map((d) => <button key={d} type="button" aria-pressed={minAge === d} className={minAge === d ? "is-on" : ""} onClick={() => setMinAge(d)}>{d === 365 ? "A year+" : `${d / 30} months+`}</button>)}
          </div>
        )}
        <label><span className="sys-sr">Condition</span>
          <select value={cond} onChange={(e) => setCond(e.target.value)}>
            <option value="">Every condition</option>
            {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="rv-search"><span className="sys-sr">Find</span>
          <input type="search" placeholder="Case, animal or place" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {decided > 0 && <p className="rv-tally"><Check size={14} /> {decided} decided this session</p>}
      </div>

      {error && <p className="rv-state">{error}</p>}
      {shown.length === 0 && !error && (
        <p className="rv-state">{tab === "stale" ? "Nothing has been open this long without activity. This is the state you want." : "Every request that closed without field action says why."}</p>
      )}

      {tab === "stale" ? BANDS.map((b, bi) => {
        const inBand = shown.filter((c) => { const a = ageOf(c.occurred_at); return a >= b.min && (bi === 0 || a < BANDS[bi - 1].min); });
        if (!inBand.length) return null;
        return (
          <section key={b.id} className="rv-band" aria-label={b.label}>
            <h2><span>{b.label}</span><b className="sys-mono">{inBand.filter((c) => !done[c.id]).length}</b></h2>
            <ol className="rv-list">
              {inBand.map((c) => <StaleRow key={c.id} c={c} done={done[c.id]} checked={selected.has(c.id)} onCheck={(v) => setSelected((s) => { const n = new Set(s); if (v) n.add(c.id); else n.delete(c.id); return n; })} onDecide={decide} />)}
            </ol>
          </section>
        );
      }) : (
        <ol className="rv-list">
          {shown.map((c) => <ReasonRow key={c.id} c={c} done={done[c.id]} onDecide={decide} />)}
        </ol>
      )}

      {tab === "stale" && selected.size > 0 && (
        <BulkBar n={selected.size} onApply={async (decision, reason, note) => {
          const list = pending.filter((c) => selected.has(c.id));
          for (const c of list) await decide(c, decision, reason, note);
        }} onClear={() => setSelected(new Set())} />
      )}
    </main>
  );
}

function Header({ count }: { count: number }) {
  return (
    <header className="rv-head">
      <p className="sys-eyebrow is-flame">Case review</p>
      <h1>Decide what happened to old&nbsp;cases.</h1>
      <p>
        {count ? <><b>{count.toLocaleString("en-IN")}</b> cases have been open for more than ninety days with nothing recorded in the last thirty. </> : null}
        Most are finished work nobody closed; some are real and still going. Nothing here closes by itself — each decision is yours, and it is written into the case&rsquo;s history under your name.
      </p>
      <p className="rv-links"><Link href="/partner">Back to the dashboard</Link><Link href="/partner/reports#response">How this affects the figures <ArrowUpRight size={13} /></Link></p>
    </header>
  );
}

/* The backlog's shape: every stale case as a tick on one line of age. */
function AgeStrip({ cases, done }: { cases: ReviewCase[]; done: Record<string, Done> }) {
  const ages = cases.map((c) => ageOf(c.occurred_at));
  const max = Math.max(365, ...ages);
  const W = 1000, H = 54;
  const x = (a: number) => 8 + ((a - 90) / Math.max(1, max - 90)) * (W - 16);
  return (
    <figure className="rv-strip">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${cases.length} cases, open from ninety days to ${ageLabel(max)}`}>
        {[90, 180, 365, 730].filter((a) => a <= max).map((a) => (
          <g key={a}><line x1={x(a)} x2={x(a)} y1={4} y2={H - 16} className="rv-strip-grid" /><text x={x(a) + 4} y={H - 3} className="rv-strip-lab">{a === 90 ? "90 days" : a === 180 ? "6 months" : a === 365 ? "1 year" : "2 years"}</text></g>
        ))}
        {cases.map((c, i) => {
          const d = done[c.id]?.ok;
          return <line key={c.id} x1={x(ages[i])} x2={x(ages[i])} y1={crit(c) ? 6 : 16} y2={H - 18} className={`rv-tick ${crit(c) ? "is-crit" : ""} ${d ? "is-done" : ""}`} />;
        })}
      </svg>
      <figcaption>Each line is a case, placed by how long it has been open. Tall flame lines are critical conditions. Decided cases fade.</figcaption>
    </figure>
  );
}

function StaleRow({ c, done, checked, onCheck, onDecide }: {
  c: ReviewCase; done?: Done; checked: boolean; onCheck: (v: boolean) => void;
  onDecide: (c: ReviewCase, d: ReviewDecision, r?: ReviewReason | null, note?: string) => Promise<boolean>;
}) {
  const [step, setStep] = useState<null | "done" | "noaction" | "other_ngo">(null);
  const [reason, setReason] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const age = ageOf(c.occurred_at);
  const go = async (d: ReviewDecision, r?: ReviewReason | null) => { setBusy(true); await onDecide(c, d, r, note); setBusy(false); setStep(null); };
  return (
    <li className={`rv-row ${done?.ok ? "is-done" : ""}`}>
      <label className="rv-check"><span className="sys-sr">Select</span><input type="checkbox" checked={checked} disabled={!!done?.ok} onChange={(e) => onCheck(e.target.checked)} /></label>
      <i className={`rv-mark ${crit(c) ? "is-crit" : ""}`} aria-label={crit(c) ? "Critical condition" : undefined} />
      <div className="rv-what">
        <Link href={`/partner/cases/${c.id}`} className="rv-name">{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Case"}</Link>
        <small>{who(c)}</small>
      </div>
      <div className="rv-when">
        <b className="sys-mono">{ageLabel(age)}</b>
        <small>opened {fmtDate(c.occurred_at)}{c.followups_missed ? ` · ${c.followups_missed} follow-up${c.followups_missed === 1 ? "" : "s"} missed` : ""}</small>
      </div>
      <div className="rv-acts">
        {done ? <p className={`rv-result ${done.ok ? "" : "is-err"}`}>{done.ok ? <Check size={14} /> : null}{done.label}</p>
          : step === null ? (
            <>
              <button type="button" onClick={() => go("still_active")} disabled={busy}>Still active</button>
              <button type="button" onClick={() => setStep("done")} disabled={busy}>Work done</button>
              <button type="button" onClick={() => setStep("noaction")} disabled={busy}>No action…</button>
              <button type="button" onClick={() => setStep("other_ngo")} disabled={busy}>Another NGO</button>
            </>
          ) : (
            <div className="rv-confirm">
              {step === "noaction" && (
                <select value={reason} onChange={(e) => setReason(e.target.value as ReviewReason)} aria-label="Why it closed without field action">
                  <option value="">Why?</option>
                  {REVIEW_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              )}
              <input type="text" placeholder={step === "noaction" && reason === "other" ? "What happened (required)" : "Note (optional)"} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
              <button type="button" className="is-go" disabled={busy || (step === "noaction" && (!reason || (reason === "other" && !note.trim())))}
                onClick={() => go(step === "done" ? "closed_done" : step === "other_ngo" ? "other_ngo" : "closed_no_action", step === "noaction" ? (reason as ReviewReason) : null)}>
                {busy ? "Saving…" : step === "done" ? "Close as done" : step === "other_ngo" ? "Close as handed on" : "Close without action"}
              </button>
              <button type="button" onClick={() => setStep(null)} disabled={busy}>Cancel</button>
            </div>
          )}
      </div>
    </li>
  );
}

function ReasonRow({ c, done, onDecide }: { c: ReviewCase; done?: Done; onDecide: (c: ReviewCase, d: ReviewDecision, r?: ReviewReason | null, note?: string) => Promise<boolean> }) {
  const [reason, setReason] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <li className={`rv-row is-reason ${done?.ok ? "is-done" : ""}`}>
      <i className="rv-mark is-grey" aria-hidden />
      <div className="rv-what">
        <Link href={`/partner/cases/${c.id}`} className="rv-name">{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Case"}</Link>
        <small>{who(c)}</small>
      </div>
      <div className="rv-when"><b className="sys-mono">{fmtDate(c.occurred_at)}</b><small>closed without field action</small></div>
      <div className="rv-acts">
        {done ? <p className={`rv-result ${done.ok ? "" : "is-err"}`}>{done.ok ? <Check size={14} /> : null}{done.label}</p> : (
          <div className="rv-confirm">
            <select value={reason} onChange={(e) => setReason(e.target.value as ReviewReason)} aria-label="Why it closed without field action">
              <option value="">Why did it close?</option>
              {REVIEW_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            {reason === "other" && <input type="text" placeholder="What happened (required)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="What happened" />}
            <button type="button" className="is-go" disabled={busy || !reason || (reason === "other" && !note.trim())}
              onClick={async () => { setBusy(true); await onDecide(c, "set_reason", reason as ReviewReason, note); setBusy(false); }}>
              {busy ? "Saving…" : "Record reason"}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function BulkBar({ n, onApply, onClear }: { n: number; onApply: (d: ReviewDecision, r?: ReviewReason | null, note?: string) => Promise<void>; onClear: () => void }) {
  const [step, setStep] = useState<null | ReviewDecision>(null);
  const [reason, setReason] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const verb: Record<string, string> = { still_active: "Mark still active", closed_done: "Close as done", closed_no_action: "Close without action", other_ngo: "Close as handed on" };
  return (
    <div className="rv-bulk" role="region" aria-label="Decide the selected cases">
      <p><b className="sys-mono">{n}</b> selected</p>
      {step === null ? (
        <div className="rv-bulk-acts">
          <button type="button" onClick={() => setStep("still_active")}>Still active</button>
          <button type="button" onClick={() => setStep("closed_done")}>Work done</button>
          <button type="button" onClick={() => setStep("closed_no_action")}>No action…</button>
          <button type="button" onClick={() => setStep("other_ngo")}>Another NGO</button>
          <button type="button" className="is-quiet" onClick={onClear}>Clear</button>
        </div>
      ) : (
        <div className="rv-bulk-acts">
          {step === "closed_no_action" && (
            <select value={reason} onChange={(e) => setReason(e.target.value as ReviewReason)} aria-label="Why they closed without field action">
              <option value="">Why?</option>
              {REVIEW_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          )}
          <input type="text" placeholder={reason === "other" ? "What happened (required)" : "Note for every case (optional)"} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
          <button type="button" className="is-go" disabled={busy || (step === "closed_no_action" && (!reason || (reason === "other" && !note.trim())))}
            onClick={async () => { setBusy(true); await onApply(step, step === "closed_no_action" ? (reason as ReviewReason) : null, note); setBusy(false); setStep(null); }}>
            {busy ? "Saving…" : `${verb[step]}: ${n} case${n === 1 ? "" : "s"}`}
          </button>
          <button type="button" className="is-quiet" onClick={() => setStep(null)} disabled={busy}>Cancel</button>
        </div>
      )}
    </div>
  );
}
