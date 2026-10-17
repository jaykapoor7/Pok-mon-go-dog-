"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Review (decisions 008B–008G, 033).

   The records that need a person's decision rather than field work,
   kept apart so they never inflate today's queue:
     · open 90+ days with nothing recorded for 30: still active, or close
       with what happened;
     · imported as open and never confirmed in StrayPaw;
     · closed without field action, reason never recorded.
   Each decision goes through the review RPC and is written to the case's
   history with the person's name. Nothing closes on a timer.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { historicalReviewCases, reasonlessCases, staleCases, REVIEW_REASONS, type ReviewCase, type ReviewDecision, type ReviewReason } from "@/lib/review";
import { useMembership } from "../shell/Shell";
import { Ack, State, day, n } from "../ui";
import { decideCase, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./ngo.css";

type Cohort = "decide" | "history" | "reason";
const COHORTS: { id: Cohort; label: string; lede: string }[] = [
  { id: "decide", label: "Waiting on a decision", lede: "Open more than 90 days with nothing recorded for 30. Is anyone still working on it?" },
  { id: "history", label: "Imported, never confirmed", lede: "Open in a register you imported. The status is the workbook's, not something StrayPaw has seen." },
  { id: "reason", label: "Closed without a reason", lede: "Closed without field action and nobody said why. A reason turns a gap into evidence." },
];
const read = (k: Cohort) => (k === "decide" ? staleCases() : k === "history" ? historicalReviewCases() : reasonlessCases());

export function Review({ initial }: { initial: Cohort }) {
  const { user } = useAuth();
  const mem = useMembership();
  const [cohort, setCohort] = useState<Cohort>(initial);
  const [rows, setRows] = useState<ReviewCase[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [counts, setCounts] = useState<Partial<Record<Cohort, number>>>({});
  const [done, setDone] = useState<Record<string, Receipt>>({});
  const [limit, setLimit] = useState(60);

  const load = useCallback(async (k: Cohort) => {
    setRows(null); setFailed(false); setLimit(60);
    try { const r = await read(k); setRows(r); setCounts((c) => ({ ...c, [k]: r.length })); } catch { setRows([]); setFailed(true); }
  }, []);
  useEffect(() => { if (mem.member) void load(cohort); }, [mem.member, cohort, load]);
  useEffect(() => { if (!mem.member) return; for (const k of ["decide", "history", "reason"] as Cohort[]) if (k !== initial) read(k).then((r) => setCounts((c) => ({ ...c, [k]: r.length }))).catch(() => {}); }, [mem.member, initial]);
  useEffect(() => { const u = new URL(window.location.href); u.searchParams.set("cohort", cohort); window.history.replaceState(null, "", u); }, [cohort]);

  const decided = useMemo(() => Object.values(done).filter((r) => r.ok).length, [done]);
  const act = async (id: string, d: ReviewDecision, reason?: ReviewReason | null, note?: string | null) => {
    const r = await decideCase(id, d, user?.name ?? "Member", reason ?? null, note ?? null);
    setDone((x) => ({ ...x, [id]: r }));
  };
  const meta = COHORTS.find((c) => c.id === cohort)!;

  return (
    <NgoGate title="Review" lede="Records that need a person's decision, kept apart from today's work.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · review</p><h1 className="serif">Review</h1></div>
          <p className="ngo-sum">Decisions about the record itself. Each is written to the case&rsquo;s history with your name; none of them closes anything on a timer.{decided ? <> <b>{decided}</b> decided this session.</> : null}</p>
          <div className="row"><Link className="btn is-s" href="/ngo">Back to Work</Link></div>
        </header>
        <div className="tabs rv-tabs" role="tablist" aria-label="Cohort">
          {COHORTS.map((c) => <button key={c.id} type="button" role="tab" aria-selected={cohort === c.id} onClick={() => setCohort(c.id)}>{c.label}<span className="n">{counts[c.id] === undefined ? "…" : n(counts[c.id]!)}</span></button>)}
        </div>
        <p className="rv-lede body">{meta.lede}</p>
        {rows === null && <div className="stack" style={{ padding: "0 28px" }}>{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 110 }} />)}</div>}
        {rows !== null && !rows.length && <State art="ngo-empty" title={failed ? "Not read" : "Nothing waiting here"}>{failed ? "This cohort could not be read. A failed read is never shown as an empty cohort." : "When a record needs a decision of this kind, it waits here for a person."}</State>}
        <ol className="rv-list">
          {rows?.slice(0, limit).map((c) => <Item key={c.id} c={c} cohort={cohort} receipt={done[c.id]} onAct={act} />)}
        </ol>
        {rows && rows.length > limit && <div className="row ngo-pager"><button type="button" className="btn is-s" onClick={() => setLimit((l) => l + 60)}>Show {Math.min(60, rows.length - limit)} more of {n(rows.length - limit)}</button></div>}
      </div>
    </NgoGate>
  );
}

function Item({ c, cohort, receipt, onAct }: { c: ReviewCase; cohort: Cohort; receipt?: Receipt; onAct: (id: string, d: ReviewDecision, r?: ReviewReason | null, note?: string | null) => Promise<void> }) {
  const [mode, setMode] = useState<null | "close" | "reason">(cohort === "reason" ? "reason" : null);
  const [kind, setKind] = useState<"closed_done" | "closed_no_action" | "other_ngo">("closed_no_action");
  const [reason, setReason] = useState<ReviewReason | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (d: ReviewDecision, r?: ReviewReason | null) => { setBusy(true); await onAct(c.id, d, r, note.trim() || null); setBusy(false); };
  const settled = receipt?.ok;
  const needsReason = kind === "closed_no_action" || cohort === "reason";
  return (
    <li className={`rv-item${settled ? " is-done" : ""}`}>
      <div className="rv-id">
        <Link className="mono small" href={`/ngo/cases/${c.id}`}>{c.case_code ?? "Case"}</Link>
        <b>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title ?? "Request"}</b>
        <small>{[c.animal_name, c.zone].filter(Boolean).join(" · ") || "Animal and place not recorded"}</small>
      </div>
      <dl className="rv-facts">
        <div><dt>Recorded</dt><dd>{day(c.occurred_at)}</dd></div>
        <div><dt>Last activity</dt><dd>{c.last_activity_at ? day(c.last_activity_at) : "none recorded"}</dd></div>
        <div><dt>Held by</dt><dd>{c.assignee_name ?? "nobody"}</dd></div>
        {cohort === "history" && c.source_status && <div><dt>Workbook said</dt><dd>{c.source_status}</dd></div>}
      </dl>
      <div className="rv-do">
        {settled ? <Ack state="saved">{receipt!.ok ? receipt!.what : ""}</Ack> : mode === null ? (
          <div className="row" style={{ ["--g" as string]: "6px" }}>
            <button type="button" className="btn is-s" disabled={busy} onClick={() => void go("still_active")}>Still active</button>
            <button type="button" className="btn is-ink is-s" onClick={() => setMode("close")}>Close it…</button>
          </div>
        ) : (
          <form className="rv-form" onSubmit={(e) => { e.preventDefault(); if (mode === "reason" || cohort === "reason") { if (reason) void go("set_reason", reason); } else void go(kind, needsReason ? (reason || null) : null); }}>
            {mode === "close" && (
              <div className="seg" role="group" aria-label="What happened">
                {([["closed_done", "Help was given"], ["closed_no_action", "No field action"], ["other_ngo", "Another organisation took it"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}
              </div>
            )}
            {needsReason && <select className="select" value={reason} onChange={(e) => setReason(e.target.value as ReviewReason)} aria-label="Why" required={cohort === "reason"}><option value="">Why? {cohort === "reason" ? "" : "(optional)"}</option>{REVIEW_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>}
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="A note for the history (optional)" aria-label="Note" />
            <div className="row" style={{ ["--g" as string]: "6px" }}>
              <button type="submit" className="btn is-ink is-s" disabled={busy || (cohort === "reason" && !reason) || (reason === "other" && !note.trim())}>{busy ? "Sending…" : cohort === "reason" ? "Record the reason" : "Close with this"}</button>
              {cohort !== "reason" && <button type="button" className="btn is-ghost is-s" onClick={() => setMode(null)}>Cancel</button>}
            </div>
          </form>
        )}
        {receipt && !receipt.ok && <Ack state="failed">Not saved: {receipt.error}</Ack>}
      </div>
    </li>
  );
}
