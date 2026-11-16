"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { TOOL_NAMES, preview, type Intent, type Plan } from "@/lib/kaju/registry";
import { DECIDER } from "@/lib/kaju/capabilities";
import type { Workspace } from "../live";
import { MISSION, type EventRow, type MissionRow, type StepRow } from "./data";
import { token, type Planned } from "./state";

/* What a mission's workroom and Kaju's home read: one mission as it changes, the real things it produced (tasks,
   messages, prepared emails, cases found), what Kaju noticed in the organisation's own records, and what Kaju can use
   here. Every read goes through the person's own session, so row-level security decides what is shown. */

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

/** One mission, kept current: every 4 seconds while Kaju is working, every 20 while it waits, and at once on a change
    when the mission tables are published for live updates (supabase/migrations/20261118090000). */
export function useMission(id: string | null) {
  const [row, setRow] = useState<MissionRow | null | undefined>(undefined);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    const db = getSupabase(); if (!db || !id) return;
    let alive = true;
    void Promise.all([
      db.from("nx_missions").select(MISSION).eq("id", id).maybeSingle(),
      db.from("nx_mission_events").select("id,step_id,at,kind,message,data").eq("mission_id", id).order("id").limit(300),
    ]).then(([m, e]) => {
      if (!alive) return;
      if (m.error) { setError(m.error.message); return; }
      setError(null);
      setRow((m.data ?? null) as unknown as MissionRow | null);
      if (!e.error) setEvents((e.data ?? []) as EventRow[]);
    });
    return () => { alive = false; };
  }, [id, tick]);
  const active = !!row && ["ready", "running", "retrying"].includes(row.state);
  const open = !!row && !["completed", "cancelled"].includes(row.state);
  useEffect(() => {
    if (!row) return;
    const t = window.setInterval(() => { if (visible()) reload(); }, active ? 4000 : open ? 20000 : 60000);
    return () => window.clearInterval(t);
  }, [row, active, open, reload]);
  /* Live updates, where the database publishes these tables. Without that, nothing arrives and the polling above carries on. */
  const bump = useRef<number | null>(null);
  useEffect(() => {
    const db = getSupabase(); if (!db || !id) return;
    const soon = () => { if (bump.current) window.clearTimeout(bump.current); bump.current = window.setTimeout(reload, 250); };
    const ch = db.channel(`kaju:mission:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "nx_missions", filter: `id=eq.${id}` }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "nx_mission_steps", filter: `mission_id=eq.${id}` }, soon)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nx_mission_events", filter: `mission_id=eq.${id}` }, soon)
      .subscribe();
    return () => { if (bump.current) window.clearTimeout(bump.current); void db.removeChannel(ch); };
  }, [id, reload]);
  return { row, events, error, reload };
}

/* ── What a mission produced ─────────────────────────────────────────────────────────────────────────────────── */
export type FoundCase = { id: string; code: string; title: string; place: string | null; due: string | null };
export type TaskArt = { id: string; title: string; state: string; due_on: string | null; assignee_name: string | null; record_kind: string | null; record_id: string | null; record_label: string | null; created_at: string; done_at: string | null };
export type MessageArt = { id: string; channel_id: string; channel: string | null; body: string; author_name: string | null; created_at: string; deleted_at: string | null };
export type OutboxArt = { id: string; step_id: string | null; channel: string; recipient: string; subject: string | null; body: string; status: string; last_error: string | null; updated_at: string; approved_at: string | null };
export type Artifacts = { tasks: TaskArt[]; messages: MessageArt[]; outbox: OutboxArt[]; people: Map<string, string>; ready: boolean };

export const casesOf = (s: StepRow): FoundCase[] => {
  const raw = (s.result?.cases ?? (s.tool === "draft_tasks" ? (s.result?.tasks as unknown[] | undefined)?.map((t) => { const x = t as Record<string, unknown>; return { id: x.case_id, code: x.label, title: String(x.title ?? "").replace(/^Follow up: /, ""), due: x.due }; }) : null)) as unknown;
  return Array.isArray(raw) ? raw.filter((c): c is Record<string, unknown> => !!c && typeof c === "object").map((c) => ({ id: String(c.id ?? ""), code: String(c.code ?? ""), title: String(c.title ?? "Case"), place: typeof c.place === "string" ? c.place : null, due: typeof c.due === "string" ? c.due : null })).filter((c) => c.id) : [];
};

/** The records, messages and drafts a mission made, read fresh whenever the mission changes, and every 20 seconds while
    it is open, so a task someone finishes elsewhere shows as done here too. */
export function useArtifacts(m: MissionRow | null | undefined) {
  const [a, setA] = useState<Artifacts>({ tasks: [], messages: [], outbox: [], people: new Map(), ready: false });
  const [tick, setTick] = useState(0);
  const msgIds = useMemo(() => (m?.nx_mission_steps ?? []).map((s) => s.result?.message_id).filter((x): x is string => typeof x === "string").sort().join(","), [m]);
  const key = m ? `${m.id}:${m.updated_at}:${msgIds}` : "";
  useEffect(() => { if (!m || ["completed", "cancelled"].includes(m.state)) return; const t = window.setInterval(() => { if (visible()) setTick((n) => n + 1); }, 20000); return () => window.clearInterval(t); }, [m]);
  useEffect(() => {
    const db = getSupabase(); if (!db || !m) return;
    let alive = true;
    const ids = msgIds ? msgIds.split(",") : [];
    void (async () => {
      const [t, o, msg, pp] = await Promise.all([
        db.from("nx_tasks").select("id,title,state,due_on,assignee_name,record_kind,record_id,record_label,created_at,done_at").eq("mission_id", m.id).order("created_at").limit(100),
        db.from("nx_outbox").select("id,step_id,channel,recipient,subject,body,status,last_error,updated_at,approved_at").eq("mission_id", m.id).order("created_at").limit(20),
        ids.length ? db.from("nx_messages").select("id,channel_id,body,author_name,created_at,deleted_at").in("id", ids) : Promise.resolve({ data: [], error: null }),
        db.rpc("nx_org_people", { p_org: m.org_id }),
      ]);
      const msgs = (msg.data ?? []) as Omit<MessageArt, "channel">[];
      const chIds = [...new Set(msgs.map((x) => x.channel_id))];
      const ch = chIds.length ? await db.from("nx_channels").select("id,name").in("id", chIds) : { data: [] as { id: string; name: string }[] };
      const names = new Map(((ch.data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
      if (!alive) return;
      setA({
        tasks: (t.data ?? []) as TaskArt[],
        outbox: (o.data ?? []) as OutboxArt[],
        messages: msgs.map((x) => ({ ...x, channel: names.get(x.channel_id) ?? null })),
        people: new Map(((pp.data ?? []) as { user_id: string; name: string }[]).map((p) => [p.user_id, p.name])),
        ready: true,
      });
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { art: a, reload };
}

/* ── Tool levels and plans made in the app ──────────────────────────────────────────────────────────────────── */
/** Every tool's level for this person in this organisation, as the database will decide it when each step runs. */
export async function toolLevels(orgId: string): Promise<Record<string, number>> {
  const db = getSupabase(); if (!db) return {};
  const out: Record<string, number> = {};
  await Promise.all(TOOL_NAMES.map(async (t) => { const r = await db.rpc("nx_tool_level", { p_org: orgId, p_tool: t }); if (typeof r.data === "number") out[t] = r.data; }));
  return out;
}
/** A plan Kaju prepared from what it noticed (not from words), ready for the same review as any other. */
export async function plannedFrom(orgId: string, plan: Plan, text: string): Promise<Planned> {
  const levels = await toolLevels(orgId);
  return { plan, steps: preview(plan, levels), planner: "rules", key: `n${Date.now()}${Math.random().toString(36).slice(2, 8)}`, text, levels };
}

/* ── What Kaju can use here ─────────────────────────────────────────────────────────────────────────────────── */
export type CapItem = { id: string; name: string; state: "live" | "setup" | "you" | "none" | "unknown"; label: string; detail: string };
export function useCapabilities(signedIn: boolean) {
  const [v, setV] = useState<{ items: CapItem[]; planning: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!signedIn) { setV(null); return; }
    let alive = true;
    void (async () => {
      const t = await token(); if (!t) return;
      const r = await fetch("/api/kaju/capabilities", { headers: { Authorization: `Bearer ${t}` } }).catch(() => null);
      const j = r?.ok ? await r.json().catch(() => null) as { items?: CapItem[]; planning?: boolean } | null : null;
      if (!alive) return;
      if (j?.items) setV({ items: j.items, planning: !!j.planning }); else setFailed(true);
    })();
    return () => { alive = false; };
  }, [signedIn]);
  return { caps: v, failed };
}

/* ── What Kaju noticed ──────────────────────────────────────────────────────────────────────────────────────── */
export type NoticeAction = { kind: "link"; label: string; href: string } | { kind: "intent"; label: string; intent: Intent; text: string } | { kind: "plan"; label: string; plan: Plan; text: string };
export type Notice = { id: string; tone: "warn" | "bad" | "accent"; icon: "approval" | "person" | "blocked" | "deadline" | "tasks" | "automation" | "due" | "check"; title: string; detail: string; source: string; action: NoticeAction };

const istToday = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isoDow = (iso: string) => { const d = new Date(`${iso}T00:00:00Z`).getUTCDay(); return d === 0 ? 7 : d; };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4)); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const since = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

const CHECK: Record<string, [string, string]> = {
  overdue_followup: ["follow-up is past its date", "follow-ups are past their date"],
  missing_evidence: ["ABC record is missing evidence", "ABC records are missing evidence"],
  awaiting_vet: ["procedure is waiting for a vet's sign-off", "procedures are waiting for a vet's sign-off"],
  open_clarification: ["question from the reviewing office is unanswered", "questions from the reviewing office are unanswered"],
  programme_activity: ["programme has no recent records", "programmes have no recent records"],
};

type CheckFinding = { rule: string; count: number | null; explanation?: string; records?: { href?: string }[] };
type Raw = {
  overdue: { id: string; title: string; due_on: string; assignee_id: string | null; assignee_name: string | null }[];
  check: { at: string; findings: CheckFinding[] } | null;
  autos: { id: string; automation_id: string; summary: string; open_since: string | null; acknowledged_at: string | null; escalated_at: string | null; outcome: string | null }[];
  autoNames: Map<string, string>;
  due: { week: "this week" | "next week"; n: number }[];
};

/** Read the sources Kaju watches, then turn each real finding into one line with the next step it can prepare. */
export function useNoticed(org: Workspace | null, missions: MissionRow[] | null, appHref: (h: string) => string) {
  const [raw, setRaw] = useState<Raw | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => { if (visible()) setTick((n) => n + 1); }, 60000); return () => window.clearInterval(t); }, []);
  const orgId = org?.org_id ?? null, ngo = org?.workspace === "ngo";
  useEffect(() => {
    const db = getSupabase(); if (!db || !orgId) { setRaw(null); return; }
    let alive = true;
    const today = istToday();
    void (async () => {
      const [t, c, a, an, cs, open] = await Promise.all([
        db.from("nx_tasks").select("id,title,due_on,assignee_id,assignee_name").eq("org_id", orgId).eq("state", "open").not("due_on", "is", null).lt("due_on", today).order("due_on").limit(100),
        ngo ? db.from("kaju_check_runs").select("checked_at,findings").eq("ngo_id", orgId).order("checked_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
        db.from("nx_automation_runs").select("id,automation_id,summary,open_since,acknowledged_at,escalated_at,outcome").eq("org_id", orgId).eq("status", "succeeded").gt("found", 0).is("resolved_at", null).order("open_since", { ascending: true }).limit(20),
        db.from("nx_automations").select("id,name").eq("org_id", orgId),
        ngo ? db.from("cases").select("id,due_at,follow_up_at").eq("ngo_id", orgId).is("resolved_at", null).limit(500) : Promise.resolve({ data: [], error: null }),
        ngo ? db.from("nx_tasks").select("record_id").eq("org_id", orgId).eq("state", "open").eq("record_kind", "case").limit(1000) : Promise.resolve({ data: [], error: null }),
      ]);
      /* The same windows the follow-up job reads: this week runs to Sunday; next week is Monday to Sunday. */
      const withTask = new Set(((open.data ?? []) as { record_id: string | null }[]).map((x) => x.record_id));
      const dueOf = (r: { due_at: string | null; follow_up_at: string | null }) => (r.due_at ?? r.follow_up_at ?? "").slice(0, 10);
      const rows = ((cs.data ?? []) as { id: string; due_at: string | null; follow_up_at: string | null }[]).filter((r) => dueOf(r) && !withTask.has(r.id));
      const w1: [string, string] = [today, addDays(today, 7 - isoDow(today))], w2: [string, string] = [addDays(today, 8 - isoDow(today)), addDays(today, 14 - isoDow(today))];
      const count = ([a1, b1]: [string, string]) => rows.filter((r) => dueOf(r) >= a1 && dueOf(r) <= b1).length;
      const cd = c.data as { checked_at: string; findings: CheckFinding[] | null } | null;
      if (!alive) return;
      setRaw({
        overdue: (t.error ? [] : t.data ?? []) as Raw["overdue"],
        check: cd ? { at: cd.checked_at, findings: Array.isArray(cd.findings) ? cd.findings : [] } : null,
        autos: (a.error ? [] : a.data ?? []) as Raw["autos"],
        autoNames: new Map(((an.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name])),
        due: cs.error || open.error ? [] : [{ week: "this week" as const, n: count(w1) }, { week: "next week" as const, n: count(w2) }].filter((x) => x.n > 0),
      });
    })();
    return () => { alive = false; };
  }, [orgId, ngo, tick]);

  return useMemo<Notice[] | null>(() => {
    if (!org || !raw || !missions) return null;
    const out: Notice[] = [];
    for (const m of missions) {
      const steps = [...m.nx_mission_steps].sort((x, y) => x.position - y.position);
      const wait = steps.find((s) => s.state === "waiting_approval" || s.state === "waiting_person");
      const failed = steps.find((s) => s.state === "failed");
      const href = `/kaju/missions/${m.id}`;
      if (m.state === "waiting_person" && wait?.state === "waiting_approval") out.push({ id: `a${m.id}`, tone: "warn", icon: "approval", title: `Waiting for your approval: ${wait.label}`, detail: `${m.title}${wait.why ? `. ${wait.why}` : ""}`, source: `Your missions · since ${since(wait.started_at ?? m.updated_at)}`, action: { kind: "link", label: "Review", href } });
      else if (m.state === "waiting_person" && wait?.state === "waiting_person") out.push({ id: `p${m.id}`, tone: "warn", icon: "person", title: `Waiting for ${(DECIDER[wait.tool as keyof typeof DECIDER] ?? "A person").toLowerCase()}: ${wait.label}`, detail: `${m.title}. Kaju waits until it is marked done.`, source: `Your missions · since ${since(m.updated_at)}`, action: { kind: "link", label: "Open", href } });
      else if (m.state === "blocked") out.push({ id: `b${m.id}`, tone: "bad", icon: "blocked", title: `Stopped: ${failed?.label ?? m.title}`, detail: `${m.title}. ${failed?.error ?? m.error ?? "A step failed"}. Nothing after it ran.`, source: "Your missions", action: { kind: "link", label: "Open to retry", href } });
      if (m.deadline && Date.parse(m.deadline) < Date.now() && !["completed", "cancelled"].includes(m.state)) out.push({ id: `d${m.id}`, tone: "bad", icon: "deadline", title: `Past its finish-by date: ${m.title}`, detail: `It was to finish by ${since(m.deadline)}.`, source: "Your missions", action: { kind: "link", label: "Open", href } });
    }
    if (raw.overdue.length) {
      const ids = [...new Set(raw.overdue.map((t) => t.assignee_id).filter((x): x is string => !!x))].slice(0, 50);
      const first = raw.overdue.slice(0, 2).map((t) => `${t.title}${t.assignee_name ? ` (${t.assignee_name})` : ""}`).join("; ");
      out.push({ id: "tasks", tone: "bad", icon: "tasks", title: `${plural(raw.overdue.length, "task is", "tasks are")} past ${raw.overdue.length === 1 ? "its" : "their"} due date`, detail: `${first}${raw.overdue.length > 2 ? ` and ${raw.overdue.length - 2} more` : ""}.`, source: "Your organisation's tasks",
        action: ids.length ? { kind: "plan", label: `Remind ${ids.length === 1 ? "the person" : `${ids.length} people`}`, text: "Remind people about their overdue tasks", plan: { title: "Remind people about overdue tasks", steps: [{ label: `Notify ${plural(ids.length, "person", "people")} with overdue tasks`, tool: "notify_members", input: { user_ids: ids, title: "Some of your tasks are past their due date", body: "Open Today to see them and mark what is done.", href: "/ngo/today" } }] } }
          : { kind: "link", label: "Open Today", href: "/ngo/today" } });
    }
    for (const r of raw.autos) {
      const name = raw.autoNames.get(r.automation_id) ?? "An automation";
      const escalated = !!r.escalated_at && !r.acknowledged_at;
      out.push({ id: `r${r.id}`, tone: escalated ? "bad" : r.acknowledged_at ? "accent" : "warn", icon: "automation", title: `${name}: ${escalated ? "raised with the leads" : r.acknowledged_at ? "being handled" : "not picked up yet"}`, detail: `${r.summary}${r.outcome ? `. ${r.outcome}` : ""}`, source: `Automations${r.open_since ? ` · open since ${since(r.open_since)}` : ""}`, action: { kind: "link", label: r.acknowledged_at ? "Update" : "Acknowledge", href: "/kaju/automations" } });
    }
    for (const d of raw.due) out.push({ id: `due-${d.week}`, tone: "accent", icon: "due", title: `${plural(d.n, "open case is", "open cases are")} due a follow-up ${d.week} with no task yet`, detail: "Kaju can find them, create a follow-up task for each once you approve, and skip any that already have one.", source: "Your cases",
      action: { kind: "intent", label: "Prepare these follow-ups", text: `Prepare follow-ups due ${d.week}`, intent: { action: "prepare_followups", when: d.week } } });
    if (raw.check) for (const f of raw.check.findings) {
      const words = CHECK[f.rule]; if (!words || !f.count) continue;
      const one = f.count === 1 && f.records?.[0]?.href;
      out.push({ id: `c${f.rule}`, tone: f.rule === "overdue_followup" ? "bad" : "warn", icon: "check", title: plural(f.count, words[0], words[1]), detail: f.explanation ?? "", source: `Kaju's daily checks · ${ago(raw.check.at)}`, action: one ? { kind: "link", label: "Open the record", href: appHref(f.records![0].href!) } : { kind: "link", label: "See the checks", href: "/kaju/insights" } });
    }
    return out;
  }, [org, raw, missions, appHref]);
}
