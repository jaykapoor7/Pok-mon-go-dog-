"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { canonicalHref } from "@/lib/routes/canonical";
import { getSupabase } from "@/lib/supabase";
import type { AiReply, Proposal } from "@/sp3/ai/types";
import type { Intent, Plan } from "@/lib/kaju/registry";
import { confirmVerified, type Saved } from "@/sp3/ai/execute";
import { isAiReply } from "@/sp3/ai/validation";

/* One Kaju for the whole frame. The compact panel and the full page read and write the same conversation, so moving
   between them keeps what was asked, answered and proposed. The conversation lives for this browser tab only. */

/* What went wrong with a turn decides what the person can do next: try again, or sign in again. */
export type TurnError = "incomplete" | "timeout" | "stopped" | "expired" | "failed";
export type Turn = { id: string; role: "user" | "kaju"; text: string; reply?: AiReply; pending?: boolean; progress?: string[]; error?: string; kind?: TurnError; saved?: Record<string, Saved>;
  /** The person's rating of this answer (pilot feedback). */ rated?: 1 | -1; restored?: boolean };
/** A saved conversation, newest first. */
export type ThreadSummary = { id: string; title: string; updated_at: string };
/** Whether this conversation is kept: "on" saved to the person's history; "health" and "guest" stay in this tab only. */
export type Keeping = "on" | "health" | "guest" | "unknown";
export type Feedback = { rating: 1 | -1; reason?: string; comment?: string; minutesSaved?: number };
export type PlanStepView = { n: number; label: string; tool: string; level: number; how: string; waits: boolean; why: string | null; external: boolean };
/** A plan for review. `levels` holds every tool's level in this organisation, so steps the person adds or edits say
    truthfully how they will run; `deadline` (YYYY-MM-DD) is when the person wants it finished, if they said. */
/** The record open on the page. Ids are hints only: the server reads the record again with the person's own access. */
export type KajuSubject = { caseId?: string | null; dogId?: string | null; label?: string | null; kind?: "case" | "animal" | "package" | "programme" | "mission" | "exposure" | "sample" };
export type KajuPage = { path: string; title?: string } & KajuSubject;
export type Planned = { plan: Plan; steps: PlanStepView[]; planner: string; key: string; text: string; levels: Record<string, number>; deadline?: string | null };
type Ctx = {
  turns: Turn[]; busy: boolean; open: boolean; setOpen: (o: boolean) => void; page: KajuPage;
  setPage: (p: { path: string; title?: string }) => void;
  /** A record page says which record is open, so "this case" means it. Cleared when the page changes. */
  setSubject: (s: KajuSubject | null) => void;
  ask: (text: string, opts?: { retry?: boolean }) => Promise<void>; clear: () => void; stop: () => void; retry: (turnId: string) => void; expired: boolean;
  /** Saved conversations: the current one's id, whether it is kept, the list, and moving between them. */
  threadId: string | null; keeping: Keeping; history: ThreadSummary[] | null; loadHistory: () => Promise<void>; resume: (id: string) => Promise<boolean>; forget: (id: string) => Promise<boolean>;
  rate: (turnId: string, f: Feedback) => Promise<boolean>;
  plan: (orgId: string, text: string, intent: Intent | null) => Promise<{ ok: true; planned: Planned } | { ok: false; error: string; noModel?: boolean }>;
  start: (orgId: string, p: Planned) => Promise<{ id?: string; error?: string }>;
  confirm: (turnId: string, p: Proposal) => Promise<Saved>;
};
const KajuCtx = createContext<Ctx | null>(null);
const KEY = "nx.kaju.turns.v2";
/* What a saved answer keeps: what it showed (words, sources, figures), never prepared changes, which are confirmable only
   in the conversation that prepared them. Large figures are dropped rather than the conversation failing to save. */
function keepable(reply: AiReply): AiReply {
  const n = reply.proposals?.length ?? 0;
  const kept: AiReply = { ...reply, proposals: [], scope: undefined, notice: [reply.notice, n ? `${n} prepared item${n === 1 ? " was" : "s were"} not kept with the saved conversation; ask again to prepare ${n === 1 ? "it" : "them"}.` : ""].filter(Boolean).join(" ") || undefined };
  return JSON.stringify(kept).length > 100_000 ? { ...kept, blocks: [] } : kept;
}
/** The server's scope string is [userId, orgId, actorRole, offices]: which workspace a conversation may be saved under. */
function keepingFor(scope: string | null, path: string): { keeping: Keeping; orgId: string | null; workspace: string } {
  let parsed: unknown = null; try { parsed = scope ? JSON.parse(scope) : null; } catch { parsed = null; }
  if (scope === "signed-out" || !Array.isArray(parsed)) return { keeping: scope === "signed-out" || scope === "guest" ? "guest" : "unknown", orgId: null, workspace: "none" };
  const [, orgId, role] = parsed as [string, string | null, string | null];
  /* Patient and clinic conversations are never saved: a health page, or an account outside any NGO or reviewing office. */
  if (path.startsWith("/health") || (!orgId && role !== "municipal_reviewer")) return { keeping: "health", orgId: null, workspace: "none" };
  const workspace = path.startsWith("/gov") || role === "municipal_reviewer" && !orgId ? "government" : path.startsWith("/research") ? "research" : orgId ? "ngo" : "none";
  return { keeping: "on", orgId: orgId ?? null, workspace };
}
/* A reply that has not arrived after this long is given up; anything that arrives later is dropped. */
export const TIMEOUT_MS = 55_000;
export const MSG: Record<TurnError, string> = {
  incomplete: "Kaju returned an incomplete response. No action was confirmed. Try again.",
  timeout: "Kaju timed out before answering. Nothing was changed. Try again.",
  stopped: "Stopped waiting. No prepared action was confirmed.",
  expired: "Your session has expired. Sign in again to continue; this conversation was hidden.",
  failed: "Could not reach Kaju. Nothing was changed. Try again.",
};

export async function token() { return (await getSupabase()?.auth.getSession())?.data.session?.access_token ?? null; }
/** Kaju's answers still carry the earlier app's addresses; send them to the same records in this app. */
export const appHref = (h: string) => canonicalHref(h);

export function KajuProvider({ children }: { children: ReactNode }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [page, setPageState] = useState<KajuPage>({ path: "/" });
  /* A new address drops the record the last page named; the same address keeps it while its title fills in. */
  const setPage = useCallback((p: { path: string; title?: string }) => setPageState((prev) => (prev.path === p.path ? { ...prev, ...p } : p)), []);
  const setSubject = useCallback((s: KajuSubject | null) => setPageState((prev) => ({ path: prev.path, title: prev.title, ...(s ?? {}) })), []);
  const ctrl = useRef<{ ac: AbortController; why: TurnError | null; seq: number } | null>(null);
  const seq = useRef(0);
  const [expired, setExpired] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const thread = useRef<string | null>(null);
  const [history, setHistory] = useState<ThreadSummary[] | null>(null);
  const [scopeKey, setScopeKey] = useState<string | null>(null);
  /* The conversation belongs to one person in one workspace. The server names that scope; when it changes (another
     account, another organisation, a membership removed) the earlier conversation is hidden, never shown to the next. */
  const scope = useRef<string | null>(null);
  useEffect(() => { try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { scope?: string; turns?: Turn[]; thread?: string | null } | null; if (s && Array.isArray(s.turns)) { scope.current = s.scope ?? null; setScopeKey(scope.current); setTurns(s.turns.filter((x) => !x.pending).slice(-30)); thread.current = s.thread ?? null; setThreadId(thread.current); } } catch {} }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify({ scope: scope.current, turns: turns.filter((t) => !t.pending).slice(-30), thread: thread.current })); } catch {} }, [turns, threadId]);
  const patch = (id: string, f: (t: Turn) => Turn) => setTurns((ts) => ts.map((t) => (t.id === id ? f(t) : t)));
  const adopt = useCallback((s: string | null | undefined) => {
    if (!s) return;
    if (scope.current && scope.current !== s) { ctrl.current?.ac.abort(); ctrl.current = null; setTurns([]); setBusy(false); thread.current = null; setThreadId(null); setHistory(null); }
    scope.current = s; setScopeKey(s);
  }, []);
  const keep = useMemo(() => keepingFor(scopeKey, page.path), [scopeKey, page.path]);

  /* Save one question and its answer to the person's own history (kaju_threads, row-level security: theirs only, and only
     while they belong to the organisation). Best effort: a failed save never touches the conversation on screen. */
  const persist = useCallback(async (q: string, reply: AiReply) => {
    const k = keepingFor(scope.current, page.path);
    if (k.keeping !== "on") return;
    const db = getSupabase(); if (!db) return;
    try {
      let id = thread.current;
      if (!id) {
        const title = q.replace(/\s+/g, " ").trim().slice(0, 80) || "Conversation";
        const { data, error } = await db.from("kaju_threads").insert({ org_id: k.orgId, workspace: k.workspace, title }).select("id").single();
        if (error || !data) return;
        id = (data as { id: string }).id; thread.current = id; setThreadId(id);
      }
      await db.from("kaju_thread_turns").insert([{ thread_id: id, role: "user", text: q.slice(0, 12000) }, { thread_id: id, role: "kaju", text: reply.text.slice(0, 12000), reply: keepable(reply) }]);
      setHistory((h) => h ? [{ id: id!, title: h.find((x) => x.id === id)?.title ?? q.slice(0, 80), updated_at: new Date().toISOString() }, ...h.filter((x) => x.id !== id)] : h);
    } catch { /* the conversation stays on screen; it is just not saved */ }
  }, [page.path]);
  useEffect(() => {
    let live = true;
    const check = async () => {
      if (document.visibilityState === "hidden") return;
      const t = await token();
      const r = await fetch("/api/ai", { headers: t ? { Authorization: `Bearer ${t}` } : {} }).catch(() => null);
      if (!live || !r) return;
      if (r.status === 401) { setExpired(true); adopt("signed-out"); return; }
      const j = await r.json().catch(() => null) as { scope?: string } | null;
      setExpired(false); adopt(j?.scope);
    };
    void check();
    window.addEventListener("focus", check);
    return () => { live = false; window.removeEventListener("focus", check); };
  }, [adopt]);

  const ask = useCallback(async (text: string, opts?: { retry?: boolean }) => {
    const q = text.trim(); if (!q || busy || expired) return;
    const uid = `u${Date.now()}`, kid = `k${Date.now()}`;
    const history = [...turns, { id: uid, role: "user" as const, text: q }].filter((t) => !t.error).slice(-12).map((t) => ({ role: t.role === "user" ? "user" : "assistant", text: t.role === "user" ? t.text : t.reply?.text ?? t.text }));
    setTurns((ts) => [...ts, { id: uid, role: "user", text: q }, { id: kid, role: "kaju", text: "", pending: true, progress: [] }]);
    setBusy(true);
    ctrl.current?.ac.abort();
    const mine = { ac: new AbortController(), why: null as TurnError | null, seq: ++seq.current };
    ctrl.current = mine;
    const current = () => ctrl.current === mine && seq.current === mine.seq;
    const fail = (kind: TurnError, error?: string) => { if (current() || kind === "stopped") patch(kid, (x) => ({ ...x, pending: false, kind, error: error ?? MSG[kind] })); };
    const settle = (reply: unknown) => {
      if (!current()) return;
      if (!isAiReply(reply)) { fail("incomplete"); return; }
      const s = (reply as AiReply & { scope?: string }).scope;
      if (s && scope.current && s !== scope.current) { adopt(s); return; }
      patch(kid, (x) => ({ ...x, pending: false, text: reply.text, reply }));
      void persist(q, reply);
    };
    const timer = setTimeout(() => { mine.why = "timeout"; mine.ac.abort(); }, TIMEOUT_MS);
    try {
      const t = await token();
      const res = await fetch("/api/ai", { method: "POST", signal: mine.ac.signal, headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ messages: history, retry: opts?.retry === true, context: { path: page.path, title: page.title, scope: scope.current ?? undefined, surface: open ? "dock" : "page", ...(page.caseId ? { caseId: page.caseId } : {}), ...(page.dogId ? { dogId: page.dogId } : {}) } }) });
      if (res.status === 401) { setExpired(true); fail("expired"); setTurns((ts) => ts.filter((x) => x.id === kid)); return; }
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); fail("failed", (j as { error?: string }).error ?? undefined); return; }
      /* A plain JSON answer, or a stream of progress lines ending in the reply. */
      if (!/ndjson/.test(res.headers.get("content-type") ?? "")) { settle(await res.json().catch(() => null)); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let replied = false;
      const line = (l: string) => {
        if (!l.trim()) return;
        let ev: { type: string; summary?: string; reply?: AiReply; error?: string };
        try { ev = JSON.parse(l); } catch { fail("incomplete"); replied = true; return; }
        if (ev.type === "progress" && ev.summary) { if (current()) patch(kid, (x) => ({ ...x, progress: [...(x.progress ?? []), ev.summary!] })); }
        else if (ev.type === "reply") { replied = true; settle(ev.reply); }
        else if (ev.type === "error") { replied = true; fail("failed", ev.error); }
      };
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) { line(buf.slice(0, nl)); buf = buf.slice(nl + 1); }
      }
      line(buf);
      if (!replied) fail("incomplete");
    } catch (e) {
      if ((e as Error).name === "AbortError") { if (mine.why) fail(mine.why); }
      else fail("failed");
    } finally {
      clearTimeout(timer);
      if (ctrl.current === mine) { ctrl.current = null; setBusy(false); }
      patch(kid, (x) => (x.pending ? { ...x, pending: false, kind: "incomplete", error: x.error ?? MSG.incomplete } : x));
    }
  }, [busy, expired, turns, page, adopt, open, persist]);

  /* Stop waiting: the request is abandoned and a late answer is dropped. Nothing Kaju prepared is confirmed. */
  const stop = useCallback(() => { const c = ctrl.current; if (!c) return; c.why = "stopped"; c.ac.abort(); ctrl.current = null; setBusy(false); }, []);
  /* Try again: the failed answer and its question are replaced by a fresh ask of the same question. */
  const retry = useCallback((turnId: string) => {
    const i = turns.findIndex((t) => t.id === turnId); const q = i > 0 ? turns[i - 1] : null;
    if (!q || q.role !== "user") return;
    setTurns((ts) => ts.filter((t) => t.id !== turnId && t.id !== q.id));
    setTimeout(() => void ask(q.text, { retry: true }), 0);
  }, [turns, ask]);

  const plan = useCallback(async (orgId: string, text: string, intent: Intent | null) => {
    const t = await token(); if (!t) return { ok: false as const, error: "Sign in to plan missions." };
    const res = await fetch("/api/kaju/plan", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ orgId, text, intent, page }) });
    const j = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; plan?: Plan; steps?: PlanStepView[]; planner?: string; levels?: Record<string, number>; model?: boolean };
    if (!res.ok || !j.ok || !j.plan || !j.steps) return { ok: false as const, error: j.error ?? "Kaju could not plan this. Nothing was started.", noModel: j.model === false };
    return { ok: true as const, planned: { plan: j.plan, steps: j.steps, planner: j.planner ?? "rules", key: `m${Date.now()}${Math.random().toString(36).slice(2, 8)}`, text, levels: j.levels ?? {} } };
  }, [page]);

  const start = useCallback(async (orgId: string, p: Planned) => {
    const t = await token(); if (!t) return { error: "Sign in again." };
    const res = await fetch("/api/kaju/missions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ orgId, plan: p.plan, key: p.key, request: { text: p.text.slice(0, 2000), planner: p.planner }, ...(p.deadline ? { deadline: `${p.deadline}T23:59:00+05:30` } : {}) }) });
    const j = await res.json().catch(() => ({})) as { id?: string; error?: string };
    return res.ok && j.id ? { id: j.id } : { error: j.error ?? "The mission could not be started." };
  }, []);

  const confirm = useCallback(async (turnId: string, p: Proposal) => {
    const who = (await getSupabase()?.auth.getUser())?.data.user;
    const r = await confirmVerified(p, { id: who?.id ?? "", name: (who?.user_metadata?.display_name as string | undefined) ?? who?.email ?? "member" });
    patch(turnId, (x) => ({ ...x, saved: { ...(x.saved ?? {}), [p.id]: r } }));
    return r;
  }, []);

  const loadHistory = useCallback(async () => {
    const db = getSupabase(); if (!db || keepingFor(scope.current, page.path).keeping !== "on") { setHistory([]); return; }
    const { data, error } = await db.from("kaju_threads").select("id,title,updated_at").is("archived_at", null).order("updated_at", { ascending: false }).limit(20);
    setHistory(error ? [] : ((data ?? []) as ThreadSummary[]));
  }, [page.path]);
  const resume = useCallback(async (id: string) => {
    const db = getSupabase(); if (!db || busy) return false;
    const { data, error } = await db.from("kaju_thread_turns").select("id,role,text,reply").eq("thread_id", id).order("id", { ascending: true }).limit(60);
    if (error || !data) return false;
    const rows = data as { id: number; role: "user" | "kaju"; text: string; reply: AiReply | null }[];
    setTurns(rows.map((r) => ({ id: `h${r.id}`, role: r.role, text: r.text, restored: true, ...(r.role === "kaju" && r.reply && isAiReply(r.reply) ? { reply: r.reply } : {}) })).slice(-30));
    thread.current = id; setThreadId(id);
    return true;
  }, [busy]);
  const forget = useCallback(async (id: string) => {
    const db = getSupabase(); if (!db) return false;
    const { error } = await db.from("kaju_threads").delete().eq("id", id);
    if (error) return false;
    setHistory((h) => h?.filter((x) => x.id !== id) ?? h);
    if (thread.current === id) { thread.current = null; setThreadId(null); setTurns([]); }
    return true;
  }, []);
  const rate = useCallback(async (turnId: string, f: Feedback) => {
    const t = turns.find((x) => x.id === turnId); const ref = t?.reply?.turnId; const tok = await token();
    if (!ref || !tok) return false;
    patch(turnId, (x) => ({ ...x, rated: f.rating }));
    const res = await fetch("/api/kaju/feedback", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify({ turnId: ref, ...f }) }).catch(() => null);
    return !!res?.ok;
  }, [turns]);

  const value = useMemo<Ctx>(() => ({ turns, busy, open, setOpen, page, setPage, setSubject, ask,
    /* A new conversation: the screen is cleared and the next question starts a new saved conversation. */
    clear: () => { const c = ctrl.current; if (c) { c.why = null; c.ac.abort(); ctrl.current = null; } setBusy(false); setTurns([]); thread.current = null; setThreadId(null); },
    stop, retry, expired, plan, start, confirm, threadId, keeping: keep.keeping, history, loadHistory, resume, forget, rate }),
  [turns, busy, open, page, setPage, setSubject, ask, stop, retry, expired, plan, start, confirm, threadId, keep.keeping, history, loadHistory, resume, forget, rate]);
  return <KajuCtx.Provider value={value}>{children}</KajuCtx.Provider>;
}

export function useKaju() {
  const c = useContext(KajuCtx);
  if (!c) throw new Error("useKaju outside KajuProvider");
  return c;
}
