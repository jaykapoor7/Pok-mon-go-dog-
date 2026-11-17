"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, OctagonX } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Chip } from "../ui";
import { token } from "./state";
import "./kaju.css";

/* The pilot, measured. For an organisation's admins and leads: what people ask Kaju to do, whether it finished, where
   they retried or corrected it, what they said, time saved and model cost per finished task (kaju_pilot_metrics, counts
   only, no person named). For the owner: the paid-model switch, which settings are present (never their values), this
   month's spend, the grants, and a stop button. Nothing here calls a model. */

type Metrics = {
  days: number; turns: number; people: number; organisations: number;
  by_outcome: Record<string, number>; by_engine: Record<string, number>; by_surface: Record<string, number>; by_lang: Record<string, number>;
  top_intents: { intent: string; turns: number; completed: number }[]; top_tools: { tool: string; runs: number }[];
  tool_failure_turns: number; retries: number; corrections: number; median_latency_ms: number | null; p90_latency_ms: number | null;
  model_cost_inr: number; model_tokens: { input: number; output: number }; cost_per_completed_inr: number | null;
  feedback: { up: number; down: number; minutes_saved: number; reasons: Record<string, number> };
  comments: { rating: number; reason: string | null; comment: string; at: string }[];
};
const INTENT: Record<string, string> = {
  conversation: "Conversation, no record read", query_cases: "Questions about cases", case_summary: "One case summarised", work_summary: "What needs doing",
  search_records: "Finding an animal or case", org_procedures: "Our procedures", search_knowledge: "Academy lessons", register_stats: "Register figures",
  weekly_digest: "Weekly digest", overdue_followups: "Overdue follow-ups", find_missing_evidence: "Missing evidence", check_package: "Package checks",
  current_record: "The record on the page", prepare_intake: "Field messages to records", operations_insights: "Operational checks",
};
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const secs = (ms: number | null) => (ms == null ? "—" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
const inr = (v: number | null) => (v == null ? "—" : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);

export function PilotMetrics({ orgId, title = "How Kaju is helping" }: { orgId: string | null; title?: string }) {
  const [m, setM] = useState<Metrics | null | undefined>(undefined);
  const [days, setDays] = useState(30);
  useEffect(() => {
    const db = getSupabase(); if (!db) { setM(null); return; }
    let live = true;
    void db.rpc("kaju_pilot_metrics", { p_org: orgId, p_days: days }).then(({ data, error }) => { if (live) setM(error ? null : (data as Metrics | null)); });
    return () => { live = false; };
  }, [orgId, days]);
  if (m === undefined) return <div className="kj-skel is-tall" aria-label="Reading how Kaju is used" />;
  if (!m) return null; // not an admin or lead here: nothing to show, and nothing said
  const done = (m.by_outcome.answered ?? 0) + (m.by_outcome.prepared ?? 0);
  return (
    <section className="nx-sec" aria-labelledby="kp-h" style={{ marginTop: 26 }}>
      <div className="nx-sec-h"><h2 id="kp-h">{title}</h2>
        <span style={{ marginLeft: "auto" }} />
        <label className="nx-t3" style={{ fontSize: 12 }}>Last <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period">{[7, 30, 90].map((d) => <option key={d} value={d}>{d} days</option>)}</select></label>
      </div>
      {!m.turns ? <p className="nx-sub">Nobody has asked Kaju anything here in the last {m.days} days.</p> : <>
        <div className="nx-checks">
          <article className="nx-chk"><div className="nx-chk-h"><b className="num">{m.turns}</b><span>questions and requests, from {m.people} {m.people === 1 ? "person" : "people"}{m.organisations > 1 ? ` in ${m.organisations} organisations` : ""}</span></div>
            <p className="nx-chk-m"><Info size={12} />{pct(done, m.turns)} finished with an answer or a prepared record; {m.by_outcome.no_match ?? 0} not understood; {m.by_outcome.clarify ?? 0} needed a choice; {m.by_outcome.error ?? 0} failed.</p></article>
          <article className="nx-chk"><div className="nx-chk-h"><b className="num">{m.feedback.up}</b><span>found it useful · {m.feedback.down} did not</span></div>
            <p className="nx-chk-m"><Info size={12} />{m.feedback.minutes_saved ? `About ${Math.round(m.feedback.minutes_saved / 6) / 10} hours saved, as people reported it.` : "Nobody has said how much time it saved yet."} {m.corrections} corrected an answer; {m.retries} pressed Try again.</p></article>
          <article className="nx-chk"><div className="nx-chk-h"><b className="num">{secs(m.median_latency_ms)}</b><span>typical wait · slowest tenth {secs(m.p90_latency_ms)}</span></div>
            <p className="nx-chk-m"><Info size={12} />{m.by_engine.model ?? 0} answered with the model, {m.by_engine.tools ?? 0} by fixed rules. Model cost {inr(m.model_cost_inr)}{m.cost_per_completed_inr != null ? `, ${inr(m.cost_per_completed_inr)} per finished task` : ""}.</p></article>
        </div>
        <div className="kp-two">
          <div><h3 className="kp-h3">What people ask for</h3>
            <ul className="nx-bars" style={{ padding: 0 }}>{m.top_intents.slice(0, 8).map((i) => <li key={i.intent} className="nx-barrow" style={{ gridTemplateColumns: "minmax(0, 1fr) 90px 56px", listStyle: "none" }}><span className="nx-t2">{INTENT[i.intent] ?? i.intent.replace(/_/g, " ")}</span><span className="nx-bar-t"><span style={{ width: `${(i.turns / Math.max(1, m.top_intents[0].turns)) * 100}%` }} /></span><em>{i.turns}{i.turns ? <small className="nx-t3"> · {pct(i.completed, i.turns)}</small> : null}</em></li>)}</ul>
            <p className="nx-foot">Second figure: how many finished. Kinds of request, never their words.</p></div>
          <div><h3 className="kp-h3">What people said</h3>
            {m.comments.length ? <ul className="kp-quotes">{m.comments.slice(0, 6).map((c, i) => <li key={i}><Chip tone={c.rating > 0 ? "ok" : "warn"}>{c.rating > 0 ? "Useful" : c.reason?.replace(/_/g, " ") ?? "Not useful"}</Chip><q>{c.comment}</q></li>)}</ul> : <p className="nx-sub">No written comments yet.</p>}
            {Object.keys(m.feedback.reasons).length ? <p className="nx-foot">Reasons given: {Object.entries(m.feedback.reasons).map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`).join(" · ")}</p> : null}
          </div>
        </div>
      </>}
      <p className="nx-foot">Counts only. Questions and answers are not stored for this view, and nobody is named. People can rate any answer in one tap.</p>
    </section>
  );
}

type Control = { owner: boolean; verified?: boolean; database?: { live: boolean; note: string | null; updated_by: string | null; updated_at: string; month_inr: number; month_runs: number; grants: { kind: string; monthly_budget_inr: number; daily_requests: number; expires_at: string | null; note: string | null }[] };
  settings?: Record<string, boolean>; gate?: { open: boolean; reason?: string; maxOutputTokens?: number; runCapInr?: number; monthlyCeilingInr?: number; maxSteps?: number }; rollout?: string; approvedRoute?: boolean };

/** The owner's panel. Everyone else gets nothing, not even an empty box. */
export function ModelControl() {
  const [c, setC] = useState<Control | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const read = useCallback(async () => {
    const t = await token(); if (!t) return;
    const r = await fetch("/api/kaju/control", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => null) as Control | null : null;
    setC(j?.owner ? j : null);
  }, []);
  useEffect(() => { void read(); }, [read]);
  if (!c?.owner || !c.database || !c.settings) return null;
  const d = c.database, ready = c.gate?.open && d.live && c.approvedRoute && c.settings.ANTHROPIC_API_KEY;
  const stop = async () => {
    if (!window.confirm("Stop every paid model call now? Kaju keeps answering by its fixed rules. Turning it back on needs a database change.")) return;
    setBusy(true); const t = await token();
    const r = await fetch("/api/kaju/control", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ action: "stop" }) }).catch(() => null);
    setBusy(false); setMsg(r?.ok ? "Stopped. No paid model call will be made until the switch is turned on again." : "Could not stop it here. Set STRAYPAW_AI_MODE to tools_only in Vercel.");
    void read();
  };
  return (
    <section className="nx-sec kp-owner" aria-labelledby="kp-o" style={{ marginTop: 22 }}>
      <div className="nx-sec-h"><h2 id="kp-o">Kaju&apos;s model (owner only)</h2>{ready ? <Chip tone="warn">On: paid calls possible</Chip> : <Chip tone="ok">Off: no paid calls</Chip>}</div>
      <dl className="kp-dl">
        <div><dt>Database switch</dt><dd>{d.live ? "On" : "Off"}{d.note ? ` · ${d.note}` : ""}</dd></div>
        <div><dt>Settings gate</dt><dd>{c.gate?.open ? `Open · up to ${c.gate.maxOutputTokens} output tokens, ${c.gate.maxSteps} steps and ₹${c.gate.runCapInr} per answer; ₹${c.gate.monthlyCeilingInr} a month` : c.gate?.reason ?? "Closed"}</dd></div>
        <div><dt>Who can use it</dt><dd>{c.rollout === "grants" ? "Granted people and organisations" : "Only your verified account"}{c.verified ? "" : " · your account is not verified yet"}</dd></div>
        <div><dt>Data route approved</dt><dd>{c.approvedRoute ? "Yes" : "No"}</dd></div>
        <div><dt>This month</dt><dd>{inr(d.month_inr)} over {d.month_runs} model runs (the app&apos;s own estimate from token counts; the provider&apos;s bill is the authority)</dd></div>
        <div><dt>Grants</dt><dd>{d.grants.length ? d.grants.map((g, i) => <span key={i} className="kp-grant">{g.kind}: ₹{g.monthly_budget_inr}/month, {g.daily_requests}/day{g.expires_at ? `, until ${g.expires_at.slice(0, 10)}` : ""}{g.note ? ` (${g.note})` : ""}</span>) : "None"}</dd></div>
      </dl>
      <details className="kp-set"><summary>Settings present ({Object.values(c.settings).filter(Boolean).length} of {Object.keys(c.settings).length})</summary>
        <ul>{Object.entries(c.settings).map(([k, v]) => <li key={k}><code>{k}</code> {v ? "set" : <b>missing</b>}</li>)}</ul>
        <p className="nx-foot">Whether each is set, never its value.</p></details>
      {d.live ? <button type="button" className="nx-btn is-bad" onClick={() => void stop()} disabled={busy}><OctagonX size={14} />{busy ? "Stopping…" : "Stop all model use now"}</button> : null}
      {msg ? <p className="nx-foot" role="status">{msg}</p> : null}
      <PilotMetrics orgId={null} title="Across the pilot" />
    </section>
  );
}
