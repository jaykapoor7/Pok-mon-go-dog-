"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check as Tick, Lock } from "lucide-react";
import { ListPage, type Col, type View } from "../ListPage";
import { Shell } from "../Shell";
import { Chip } from "../ui";
import { MISSIONS, MISSIONS_DONE, type Step, type Tone } from "../fixtures";
import { approveMission, cancelMission, useLive, useMissions, type MissionRow } from "../live";

/* Kaju's missions, approvals and history: three views of the same stored missions, each with its steps in plain
   language. Approving or cancelling here calls the same database functions as the Kaju page; a mission that
   is already done stays done if approved twice, and only the person who started it can approve it. */

type Row = { id: string; title: string; ask: string; state: string; tone: Tone; bucket: "waiting" | "running" | "done"; mine: boolean; started: string; at: number; steps: Step[]; preview: string[]; outcome: string | null };
const STATE: Record<string, [string, Tone, Row["bucket"]]> = { waiting_person: ["Waiting for approval", "warn", "waiting"], running: ["Running", "accent", "running"], completed: ["Completed", "ok", "done"], cancelled: ["Cancelled", "plain", "done"], failed: ["Failed", "bad", "done"], blocked: ["Blocked", "bad", "running"] };
const STEP: Record<string, Step["state"]> = { done: "done", running: "run", waiting_approval: "wait", todo: "todo", skipped: "todo", failed: "todo" };
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function shape(m: MissionRow, me: string | null): Row {
  const [label, tone, bucket] = STATE[m.state] ?? [m.state, "plain" as Tone, "running" as const];
  const steps = [...(m.nx_mission_steps ?? [])].sort((a, b) => a.position - b.position);
  const drafted = steps.find((s) => s.position === 2)?.result?.tasks ?? [];
  const r = m.request ?? {};
  const ask = [r.place ? `in ${r.place}` : null, r.when && r.when !== "any" ? `due ${r.when}` : null, r.team ? `for ${r.team}` : null, r.channel ? `tell #${r.channel}` : null].filter(Boolean).join(" · ");
  const last = steps.find((s) => s.position === 3);
  return {
    id: m.id, title: m.title, ask: ask || "All open cases", state: label, tone, bucket, mine: !!me && m.owner_id === me, started: when(m.created_at), at: Date.parse(m.created_at),
    steps: steps.map((s) => ({ text: s.label, state: STEP[s.state] ?? "todo" })),
    preview: drafted.map((t) => `${t.title}${t.due ? ` · due ${new Date(t.due).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`),
    outcome: m.state === "completed" && last?.result ? `${last.result.created ?? 0} ${last.result.created === 1 ? "task" : "tasks"} created${last.result.posted ? ", channel told" : ""}${last.approved_at ? ` · approved ${when(last.approved_at)}` : ""}` : m.state === "cancelled" ? "Cancelled; nothing was created." : null,
  };
}
const sampleRows = (): Row[] => [...MISSIONS, ...MISSIONS_DONE].map((m, i) => ({ id: m.id, title: m.title, ask: m.meta, state: m.state === "Waiting for your approval" ? "Waiting for approval" : m.state, tone: m.tone, bucket: /waiting/i.test(m.state) ? "waiting" : /running/i.test(m.state) ? "running" : "done", mine: true, started: m.meta, at: -i, steps: m.steps, preview: m.preview ?? [], outcome: m.state === "Completed" ? "4 tasks created, channel told" : m.state === "Cancelled" ? "Cancelled; nothing was created." : null }));

const cols: Col<Row>[] = [
  { label: "Mission", width: "minmax(0, 1.6fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.title}</b><small>{r.ask}<span className="nx-only-s"> · {r.state}</span></small></span></span> },
  { label: "State", width: "170px", hideOnPhone: true, render: (r) => <Chip tone={r.tone}>{r.state}</Chip> },
  { label: "Steps", width: "90px", hideOnPhone: true, render: (r) => <span className="num nx-t2">{r.steps.filter((s) => s.state === "done").length} of {r.steps.length}</span> },
  { label: "Started", width: "150px", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.started}</span> },
];

export type MissionsView = "missions" | "approvals" | "history";
const TITLE: Record<MissionsView, string> = { missions: "Missions", approvals: "Approvals", history: "History" };

export function Missions({ view }: { view: MissionsView }) {
  const live = useLive();
  const ngo = live.orgFor("ngo");
  const missions = useMissions(live.org ? ngo?.org_id ?? null : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const rows = useMemo(() => (missions.rows ?? []).map((m) => shape(m, live.userId)), [missions.rows, live.userId]);
  const title = TITLE[view];
  if (!live.ready) return <Shell ws="kaju" crumb={["Kaju", title]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const sample = !live.org;
  if (!sample && !ngo) return <Shell ws="kaju" crumb={["Kaju", title]}><div className="nx-page"><h1 className="nx-h1">{title}</h1><p className="nx-sub">Kaju&apos;s missions work on an NGO&apos;s cases for now. Your account is not part of an NGO, so there are none here.</p></div></Shell>;
  const data = sample ? sampleRows() : rows;
  const all: Record<string, View<Row>> = {
    waiting: { id: "waiting", label: "Waiting for you", test: (r) => r.bucket === "waiting" && r.mine },
    active: { id: "active", label: "In progress", test: (r) => r.bucket !== "done" },
    done: { id: "done", label: "Finished", test: (r) => r.bucket === "done" },
    every: { id: "every", label: "All", test: () => true },
  };
  const order = view === "approvals" ? ["waiting", "active", "every"] : view === "history" ? ["done", "every"] : ["active", "waiting", "done", "every"];
  const waiting = data.filter((r) => r.bucket === "waiting" && r.mine).length;
  const act = async (r: Row, kind: "approve" | "cancel") => {
    if (sample) { setMsg("Sample data: sign in to approve or cancel a real mission."); return; }
    setBusy(r.id); setMsg(null);
    const { error } = kind === "approve" ? await approveMission(r.id) : await cancelMission(r.id);
    setBusy(null); missions.reload();
    setMsg(error ? error.message : kind === "approve" ? "Approved. The tasks were created." : "Cancelled. Nothing was created.");
  };
  return (
    <ListPage ws="kaju" crumb={["Kaju", title]} title={title} sample={sample} eyebrow={sample ? "Kind Hour" : ngo!.name}
      sub={sample || missions.rows ? <><b className="num">{waiting}</b> {waiting === 1 ? "mission waits" : "missions wait"} for your approval. Kaju stops before it creates, sends or changes anything, and every step is kept here.</> : "Reading missions…"}
      action={<Link href="/next/kaju" className="nx-btn">Ask Kaju</Link>}
      views={order.map((k) => all[k])} columns={cols} rows={data} rowKey={(r) => r.id} rowLabel={(r) => r.title} search={(r) => `${r.title} ${r.ask}`} sort={(a, b) => b.at - a.at}
      preview={(r) => ({ title: r.title, sub: <><Chip tone={r.tone}>{r.state}</Chip> <span className="nx-t3">{r.started}</span></>, body: <>
        <dl className="nx-props"><div><dt>Asked for</dt><dd>{r.ask}</dd></div>{r.outcome ? <div><dt>Outcome</dt><dd>{r.outcome}</dd></div> : null}{!r.mine ? <div><dt>Started by</dt><dd>A colleague</dd></div> : null}</dl>
        <h3 className="nx-h3" style={{ marginTop: 18 }}>Steps</h3>
        <ol className="nx-steps">{r.steps.map((s, i) => <li key={i} className={`s-${s.state}`}><span className="nx-st">{s.state === "done" ? <Tick size={10} strokeWidth={3} /> : null}</span><span>{s.text}</span></li>)}</ol>
        {r.bucket === "waiting" && r.mine ? <div className="nx-rec-acts" style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="nx-btn" disabled={busy === r.id} onClick={() => act(r, "approve")}>{busy === r.id ? "Working…" : `Approve: create ${r.preview.length} ${r.preview.length === 1 ? "task" : "tasks"}`}</button><button type="button" className="nx-btn is-quiet" disabled={busy === r.id} onClick={() => act(r, "cancel")}>Cancel</button></div> : null}
        {r.bucket === "waiting" && r.preview.length ? <><h3 className="nx-h3" style={{ marginTop: 18 }}>Drafted, not created yet</h3><ul className="nx-svc">{r.preview.slice(0, 6).map((t) => <li key={t}><span>{t}</span></li>)}</ul>{r.preview.length > 6 ? <details className="nx-preview"><summary>{r.preview.length - 6} more</summary><ul className="nx-svc">{r.preview.slice(6).map((t) => <li key={t}><span>{t}</span></li>)}</ul></details> : null}</> : null}
        {r.bucket === "waiting" && !r.mine ? <p className="nx-foot">Only the person who started a mission can approve it.</p> : null}
        {msg ? <p className="nx-foot" role="status">{msg}</p> : null}
        <p className="nx-note" style={{ marginTop: 14 }}><Lock size={13} /><span>Kaju reads only the organisation&apos;s own cases and channels. It never reads health records and never approves its own work.</span></p></> })}
      loading={!sample && missions.rows === null} note={missions.error} empty={{ none: view === "history" ? "Nothing finished yet" : "No missions yet", hint: "Ask Kaju to prepare follow-ups, and the run appears here." }} />
  );
}
