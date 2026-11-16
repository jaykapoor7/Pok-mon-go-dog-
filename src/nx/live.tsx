"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";

/* The line between sample screens and a person's real workspace. Signed out, or signed in without an organisation,
   the screens show sample data and say so. Signed in with one, they read and write that organisation's records. */

export type Workspace = { org_id: string; name: string; short_name: string | null; source: string; kind: string; workspace: "ngo" | "government" | "healthcare" | "research"; role: string; sample: boolean };
export type Channel = { id: string; name: string; topic: string | null; kind: string };
export type Message = { id: string; channel_id: string; parent_id: string | null; author_id: string | null; author_kind: "person" | "kaju"; author_name: string | null; body: string; record_label: string | null; proposal: { tasks: string[] } | null; created_at: string };
export type Task = { id: string; org_id: string; title: string; note: string | null; state: "open" | "done" | "cancelled"; due_on: string | null; assignee_name: string | null; source_kind: string; source_message_id: string | null; channel_id: string | null; record_label: string | null; created_at: string };

type Live = { ready: boolean; signedIn: boolean; userId: string | null; userName: string | null; orgs: Workspace[]; org: Workspace | null; pick: (id: string) => void; missing: boolean;
  /** The signed-in person's workspaces could not be read (after retrying). Pages must not fall back to sample data then. */
  failed: boolean; retry: () => void;
  /** The organisation a workspace's pages act for: the one picked if it belongs to that workspace, otherwise the first that does. */
  orgFor: (w: Workspace["workspace"]) => Workspace | null };
const Ctx = createContext<Live>({ ready: false, signedIn: false, userId: null, userName: null, orgs: [], org: null, pick: () => {}, missing: false, failed: false, retry: () => {}, orgFor: () => null });
export const useLive = () => useContext(Ctx);
const KEY = "nx.org";

export function LiveProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [orgs, setOrgs] = useState<Workspace[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => { try { setPicked(localStorage.getItem(KEY)); } catch {} }, []);
  /* Before the first paint of an app page reached by navigating inside the site (after signing in, say), mark a browser
     that holds a session, as the layout's inline script does on a full page load, so a member never sees the sample. */
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.removeAttribute("data-ready");
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^sb-.+-auth-token$/.test(k)) { html.setAttribute("data-member", ""); break; } } } catch {}
  }, []);
  useEffect(() => {
    if (!authReady) return;
    const db = getSupabase();
    if (!user || !db) { setOrgs([]); return; }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = (n: number) => db.rpc("nx_my_workspaces").then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        /* A database that does not have the rebuild's tables yet is not an error for the person: the screens stay on sample data. */
        if (/does not exist|schema cache|PGRST202|Could not find the function/i.test(error.message)) { setMissing(true); setOrgs([]); return; }
        /* Anything else (no signal, a timeout, a server error) is tried twice more; then the frame says it could not be read,
           rather than showing a member the sample workspace as if it were theirs. */
        if (n < 2) { timer = setTimeout(() => void read(n + 1), 1500 * (n + 1)); return; }
        setFailed(true); setOrgs([]); return;
      }
      setFailed(false); setOrgs((data ?? []) as Workspace[]);
    }, () => { if (alive) { if (n < 2) timer = setTimeout(() => void read(n + 1), 1500 * (n + 1)); else { setFailed(true); setOrgs([]); } } });
    void read(0);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [authReady, user, attempt]);
  /* Reading again hides the page as on first load (nx.css), so the sample never shows while the read is under way. */
  const retry = useCallback(() => { document.documentElement.removeAttribute("data-ready"); setFailed(false); setOrgs(null); setAttempt((a) => a + 1); }, []);
  const pick = useCallback((id: string) => { setPicked(id); try { localStorage.setItem(KEY, id); } catch {} }, []);
  const value = useMemo<Live>(() => {
    const list = orgs ?? [];
    const org = list.find((o) => o.org_id === picked) ?? list[0] ?? null;
    const orgFor = (w: Workspace["workspace"]) => (org?.workspace === w ? org : list.find((o) => o.workspace === w) ?? null);
    return { ready: authReady && orgs !== null, signedIn: !!user, userId: user?.id ?? null, userName: user?.name ?? null, orgs: list, org, pick, missing, failed, retry, orgFor };
  }, [authReady, orgs, user, picked, pick, missing, failed, retry]);
  // Once known, the page may show what it has (nx.css keeps a member's sample page hidden until then).
  useEffect(() => { if (value.ready) document.documentElement.setAttribute("data-ready", ""); }, [value.ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** A list read from the database that can be re-read. `null` while loading. */
function useRows<T>(key: string | null, read: () => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fn = useRef(read); fn.current = read;
  const reload = useCallback(() => { if (!key) return; fn.current().then(({ data, error: e }) => { if (e) setError(e.message); else { setError(null); setRows((data ?? []) as T[]); } }); }, [key]);
  useEffect(() => { setRows(null); reload(); }, [reload]);
  return { rows, error, reload, setRows };
}

export function useChannels(orgId: string | null) {
  return useRows<Channel>(orgId, () => getSupabase()!.from("nx_channels").select("id,name,topic,kind").eq("org_id", orgId!).order("name"));
}
/* ── Direct messages and unread ─────────────────────────────────── */
export type Person = { user_id: string; name: string; role: string };
export type Dm = { channel_id: string; other_id: string; other_name: string; last_at: string | null };
/** People in an organisation, by display name only, for starting a direct message. */
export function useOrgPeople(orgId: string | null) {
  return useRows<Person>(orgId, () => getSupabase()!.rpc("nx_org_people", { p_org: orgId! }));
}
export function useDms(orgId: string | null) {
  return useRows<Dm>(orgId, () => getSupabase()!.rpc("nx_my_dms", { p_org: orgId! }));
}
/** Opens (or finds) the direct message with one person and returns its channel name for the address bar. */
export async function openDm(orgId: string, userId: string): Promise<{ name: string | null; error: string | null }> {
  const db = getSupabase()!;
  const { data, error } = await db.rpc("nx_open_dm", { p_org: orgId, p_user: userId });
  if (error) return { name: null, error: error.message };
  const ch = await db.from("nx_channels").select("name").eq("id", data as string).single();
  return { name: (ch.data?.name as string | undefined) ?? null, error: ch.error?.message ?? null };
}
/** New messages by others since the person last opened each channel. Re-read when `tick` changes. */
export function useUnread(orgId: string | null, tick: unknown) {
  const [map, setMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const db = getSupabase(); if (!db || !orgId) { setMap({}); return; }
    let alive = true;
    db.rpc("nx_unread", { p_org: orgId }).then(({ data, error }) => { if (!alive || error) return; const m: Record<string, number> = {}; for (const r of (data ?? []) as { channel_id: string; unread: number }[]) if (r.unread) m[r.channel_id] = r.unread; setMap(m); });
    return () => { alive = false; };
  }, [orgId, tick]);
  return map;
}
export const markRead = (channelId: string) => getSupabase()!.rpc("nx_mark_read", { p_channel: channelId });

export async function createChannel(orgId: string, name: string, topic: string) {
  return getSupabase()!.from("nx_channels").insert({ org_id: orgId, name, topic }).select("id,name,topic,kind").single();
}

/** Messages in a channel, oldest first, with new ones arriving as they are posted. */
export function useMessages(channelId: string | null) {
  const r = useRows<Message>(channelId, () => getSupabase()!.from("nx_messages").select("id,channel_id,parent_id,author_id,author_kind,author_name,body,record_label,proposal,created_at").eq("channel_id", channelId!).is("deleted_at", null).order("created_at").limit(200));
  const { setRows } = r;
  useEffect(() => {
    const db = getSupabase(); if (!db || !channelId) return;
    const sub = db.channel(`nx:${channelId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "nx_messages", filter: `channel_id=eq.${channelId}` }, (p) => {
      const m = p.new as Message; setRows((rows) => (rows && !rows.some((x) => x.id === m.id) ? [...rows, m] : rows));
    }).subscribe();
    return () => { void db.removeChannel(sub); };
  }, [channelId, setRows]);
  return r;
}
export async function postMessage(channelId: string, body: string, authorName: string | null, parentId?: string) {
  return getSupabase()!.from("nx_messages").insert({ channel_id: channelId, body, author_name: authorName, parent_id: parentId ?? null }).select("id,channel_id,parent_id,author_id,author_kind,author_name,body,record_label,proposal,created_at").single();
}
/** Ask Kaju about a channel. The database builds the reply from messages the person can already read, by fixed rules, and posts it. */
export async function askKaju(channelId: string, ask: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await getSupabase()!.rpc("nx_kaju_reply", { p_channel: channelId, p_want: /\b(task|to-?do|action)s?\b/i.test(ask) ? "tasks" : "recap" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export function useTasks(orgId: string | null, channelId?: string | null) {
  return useRows<Task>(orgId ? `${orgId}:${channelId ?? ""}` : null, () => {
    let q = getSupabase()!.from("nx_tasks").select("id,org_id,title,note,state,due_on,assignee_name,source_kind,source_message_id,channel_id,record_label,created_at").eq("org_id", orgId!).neq("state", "cancelled");
    if (channelId) q = q.eq("channel_id", channelId);
    return q.order("state", { ascending: false }).order("due_on", { nullsFirst: false }).order("created_at", { ascending: false }).limit(200);
  });
}
export async function addTasks(orgId: string, titles: string[], from?: { messageId: string; channelId: string }) {
  /* The same proposal accepted twice creates nothing the second time: (source message, title) is unique. */
  return getSupabase()!.from("nx_tasks").upsert(titles.map((title) => ({ org_id: orgId, title, source_kind: from ? "kaju" : "manual", source_message_id: from?.messageId ?? null, channel_id: from?.channelId ?? null })), { onConflict: "source_message_id,title", ignoreDuplicates: true }).select("id");
}
export async function setTaskDone(id: string, done: boolean, userId: string | null) {
  return getSupabase()!.from("nx_tasks").update({ state: done ? "done" : "open", done_at: done ? new Date().toISOString() : null, done_by: done ? userId : null }).eq("id", id);
}

/* ── NGO register, read from the tables the current app already writes ── */
export type Dog = { id: string; name: string | null; code: string | null; straypaw_id: string | null; species: string | null; sex: string | null; zone: string | null; city: string | null; sterilisation_status: string | null; vaccination_status: string | null; identity_state: string | null; provenance: string | null; last_seen: string | null; identifiers: string | null; color: string | null };
export function useDogs(ngoId: string | null) {
  return useRows<Dog>(ngoId, () => getSupabase()!.from("dogs").select("id,name,code,straypaw_id,species,sex,zone,city,sterilisation_status,vaccination_status,identity_state,provenance,last_seen,identifiers,color").eq("ngo_id", ngoId!).order("last_seen", { ascending: false, nullsFirst: false }).limit(300));
}
/** Counts for the strip on Today. Each is a count the database returns, never an estimate. */
export function useNgoCounts(ngoId: string | null) {
  const [c, setC] = useState<{ animals: number | null; openCases: number | null }>({ animals: null, openCases: null });
  useEffect(() => {
    const db = getSupabase(); if (!db || !ngoId) return;
    let alive = true;
    Promise.all([
      db.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId),
      db.from("cases").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId).is("resolved_at", null),
    ]).then(([a, b]) => { if (alive) setC({ animals: a.error ? null : a.count ?? 0, openCases: b.error ? null : b.count ?? 0 }); });
    return () => { alive = false; };
  }, [ngoId]);
  return c;
}

export type Case = { id: string; case_code: string | null; title: string | null; zone: string | null; city: string | null; severity: string | null; category: string | null; status: string | null; stage: string | null; assignee_name: string | null; next_action: string | null; due_at: string | null; follow_up_at: string | null; last_activity_at: string | null; created_at: string; resolved_at: string | null; dog_id: string | null; provenance: string | null; description: string | null };
export function useCases(ngoId: string | null) {
  return useRows<Case>(ngoId, () => getSupabase()!.from("cases").select("id,case_code,title,zone,city,severity,category,status,stage,assignee_name,next_action,due_at,follow_up_at,last_activity_at,created_at,resolved_at,dog_id,provenance,description").eq("ngo_id", ngoId!).order("resolved_at", { ascending: true, nullsFirst: true }).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(300));
}

export type TimelineEvent = { id: string; event_type: string | null; title: string | null; details: string | null; occurred_at: string; actor_name: string | null; provenance: string | null };
/** One animal with what happened to it and the cases it is part of. Reads only rows the person's organisation holds. */
export function useAnimal(ngoId: string | null, id: string | null) {
  const [state, setState] = useState<{ dog: Dog | null; events: TimelineEvent[]; cases: Case[]; loading: boolean; error: string | null }>({ dog: null, events: [], cases: [], loading: true, error: null });
  useEffect(() => {
    const db = getSupabase(); if (!db || !ngoId || !id) return;
    let alive = true;
    Promise.all([
      db.from("dogs").select("id,name,code,straypaw_id,species,sex,zone,city,sterilisation_status,vaccination_status,identity_state,provenance,last_seen,identifiers,color").eq("ngo_id", ngoId).eq("id", id).maybeSingle(),
      db.from("animal_timeline_events").select("id,event_type,title,details,occurred_at,actor_name,provenance").eq("ngo_id", ngoId).eq("dog_id", id).order("occurred_at", { ascending: false }).limit(100),
      db.from("cases").select("id,case_code,title,zone,city,severity,category,status,stage,assignee_name,next_action,due_at,follow_up_at,last_activity_at,created_at,resolved_at,dog_id,provenance,description").eq("ngo_id", ngoId).eq("dog_id", id).order("created_at", { ascending: false }).limit(50),
    ]).then(([d, e, c]) => { if (alive) setState({ dog: (d.data as Dog | null) ?? null, events: (e.data ?? []) as TimelineEvent[], cases: (c.data ?? []) as Case[], loading: false, error: d.error?.message ?? e.error?.message ?? c.error?.message ?? null }); });
    return () => { alive = false; };
  }, [ngoId, id]);
  return state;
}

/* ── Veterinary appointments ────────────────────────────────────── */
export type Appointment = { id: string; org_id: string; dog_id: string | null; case_id: string | null; title: string; kind: string; starts_at: string; duration_min: number; status: "booked" | "done" | "missed" | "cancelled"; note: string | null; vet_name: string | null; created_at: string };
export function useAppointments(orgId: string | null) {
  return useRows<Appointment>(orgId, () => getSupabase()!.from("nx_appointments").select("id,org_id,dog_id,case_id,title,kind,starts_at,duration_min,status,note,vet_name,created_at").eq("org_id", orgId!).order("starts_at", { ascending: true }).limit(300));
}
export const bookAppointment = (a: { org_id: string; dog_id: string | null; title: string; kind: string; starts_at: string; duration_min: number; vet_name: string | null; note: string | null }) =>
  getSupabase()!.from("nx_appointments").insert(a).select("id").single();
export const setAppointmentStatus = (id: string, status: Appointment["status"]) =>
  getSupabase()!.from("nx_appointments").update({ status, updated_at: new Date().toISOString() }).eq("id", id);

/* ── Kaju missions ───────────────────────────────────────────────── */
export type MissionRow = { id: string; org_id: string; owner_id?: string | null; title: string; state: string; created_at: string; updated_at?: string | null; request: Record<string, string | null>; nx_mission_steps: { position: number; label: string; state: string; tool?: string | null; approved_at?: string | null; result: { tasks?: { title: string; label: string; due: string | null }[]; created?: number; posted?: boolean } | null }[] };
export function useMissions(orgId: string | null) {
  return useRows<MissionRow>(orgId, () => getSupabase()!.from("nx_missions").select("id,org_id,owner_id,title,state,created_at,updated_at,request,nx_mission_steps(position,label,state,tool,approved_at,result)").eq("org_id", orgId!).order("created_at", { ascending: false }).limit(100));
}
export async function startFollowups(orgId: string, req: { place?: string; when?: string; team?: string; channel?: string }) {
  return getSupabase()!.rpc("nx_mission_followups", { p_org: orgId, p_request: req });
}
export const approveMission = (id: string) => getSupabase()!.rpc("nx_mission_approve", { p_mission: id });
export const cancelMission = (id: string) => getSupabase()!.rpc("nx_mission_cancel", { p_mission: id });
/** Words Kaju can recognise for this organisation: its own places, people on its cases, and its channels. */
export function useVocab(orgId: string | null) {
  const [v, setV] = useState<{ kind: string; words: string[] }[] | null>(null);
  useEffect(() => {
    const db = getSupabase(); if (!db || !orgId) return;
    let alive = true;
    Promise.all([
      db.from("cases").select("zone,assignee_name").eq("ngo_id", orgId).is("resolved_at", null).limit(500),
      db.from("nx_channels").select("name").eq("org_id", orgId).neq("kind", "dm").limit(100),
    ]).then(([c, ch]) => {
      if (!alive) return;
      const rows = (c.data ?? []) as { zone: string | null; assignee_name: string | null }[];
      const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x && x.trim().length > 1).map((x) => x.trim()))].sort();
      setV([
        { kind: "Place", words: uniq(rows.map((r) => r.zone)) },
        { kind: "Team", words: uniq(rows.map((r) => r.assignee_name)) },
        { kind: "Channel", words: ((ch.data ?? []) as { name: string }[]).map((x) => `#${x.name}`) },
        { kind: "When", words: ["next week", "tomorrow", "today", "this week"] },
      ]);
    });
    return () => { alive = false; };
  }, [orgId]);
  return v;
}
