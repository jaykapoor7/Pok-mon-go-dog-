"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import type { AiReply, Proposal } from "@/sp3/ai/types";
import type { Intent, Plan } from "@/lib/kaju/registry";
import { confirmVerified, type Saved } from "@/sp3/ai/execute";

/* One Kaju for the whole frame. The compact panel and the full page read and write the same conversation, so moving
   between them keeps what was asked, answered and proposed. The conversation lives for this browser tab only. */

export type Turn = { id: string; role: "user" | "kaju"; text: string; reply?: AiReply; pending?: boolean; progress?: string[]; error?: string; saved?: Record<string, Saved> };
export type PlanStepView = { n: number; label: string; tool: string; level: number; how: string; waits: boolean; why: string | null; external: boolean };
export type Planned = { plan: Plan; steps: PlanStepView[]; planner: string; key: string; text: string };
type Ctx = {
  turns: Turn[]; busy: boolean; open: boolean; setOpen: (o: boolean) => void; page: { path: string; title?: string };
  setPage: (p: { path: string; title?: string }) => void;
  ask: (text: string) => Promise<void>; clear: () => void;
  plan: (orgId: string, text: string, intent: Intent | null) => Promise<{ ok: true; planned: Planned } | { ok: false; error: string }>;
  start: (orgId: string, p: Planned) => Promise<{ id?: string; error?: string }>;
  confirm: (turnId: string, p: Proposal) => Promise<Saved>;
};
const KajuCtx = createContext<Ctx | null>(null);
const KEY = "nx.kaju.turns.v1";

export async function token() { return (await getSupabase()?.auth.getSession())?.data.session?.access_token ?? null; }
/** Kaju's answers still carry the earlier app's addresses; send them to the same records in this app. */
export function appHref(h: string) {
  return h.replace(/^\/ngo\/(cases|animals)\/([^/?#]+)/, "/next/ngo/$1/$2").replace(/^\/ngo\/verification\/([^/?#]+)/, "/next/ngo/cases/$1")
    .replace(/^\/ngo\/packages\/([^/?#]+)/, "/next/ngo/submissions/$1").replace(/^\/ngo\/programmes\/([^/?#]+)/, "/next/ngo/programmes/$1")
    .replace(/^\/city\/review\/([^/?#]+)/, "/next/gov/verification/$1").replace(/^\/ngo\/automations.*/, "/next/kaju/automations")
    .replace(/^\/ngo\/work.*/, "/next/ngo/cases").replace(/^\/ngo\/inbox.*/, "/next/ngo/inbox").replace(/^\/ngo\/packages.*/, "/next/ngo/submissions").replace(/^\/ngo\/verification.*/, "/next/ngo/submissions")
    .replace(/^\/ngo\/settings.*/, "/next/ngo/settings").replace(/^\/ngo(\/.*)?$/, "/next/ngo/today").replace(/^\/assistant.*/, "/next/kaju").replace(/^\/workspace\/.*/, "/next/health/today");
}

export function KajuProvider({ children }: { children: ReactNode }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<{ path: string; title?: string }>({ path: "/" });
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => { try { const t = JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); if (Array.isArray(t)) setTurns(t.filter((x) => !x.pending).slice(-30)); } catch {} }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(turns.filter((t) => !t.pending).slice(-30))); } catch {} }, [turns]);
  const patch = (id: string, f: (t: Turn) => Turn) => setTurns((ts) => ts.map((t) => (t.id === id ? f(t) : t)));

  const ask = useCallback(async (text: string) => {
    const q = text.trim(); if (!q || busy) return;
    const uid = `u${Date.now()}`, kid = `k${Date.now()}`;
    const history = [...turns, { id: uid, role: "user" as const, text: q }].filter((t) => !t.error).slice(-12).map((t) => ({ role: t.role === "user" ? "user" : "assistant", text: t.role === "user" ? t.text : t.reply?.text ?? t.text }));
    setTurns((ts) => [...ts, { id: uid, role: "user", text: q }, { id: kid, role: "kaju", text: "", pending: true, progress: [] }]);
    setBusy(true); ctrl.current?.abort(); const ac = new AbortController(); ctrl.current = ac;
    try {
      const t = await token();
      const res = await fetch("/api/ai", { method: "POST", signal: ac.signal, headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ messages: history, context: { path: page.path, title: page.title } }) });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); patch(kid, (x) => ({ ...x, pending: false, error: (j as { error?: string }).error ?? "Kaju could not answer. Nothing was changed." })); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue;
          const ev = JSON.parse(line) as { type: string; summary?: string; reply?: AiReply; error?: string };
          if (ev.type === "progress" && ev.summary) patch(kid, (x) => ({ ...x, progress: [...(x.progress ?? []), ev.summary!] }));
          else if (ev.type === "reply" && ev.reply) patch(kid, (x) => ({ ...x, pending: false, text: ev.reply!.text, reply: ev.reply }));
          else if (ev.type === "error") patch(kid, (x) => ({ ...x, pending: false, error: ev.error ?? "Kaju could not answer. Nothing was changed." }));
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") patch(kid, (x) => ({ ...x, pending: false, error: "Could not reach Kaju. Nothing was changed." }));
    } finally { setBusy(false); patch(kid, (x) => (x.pending ? { ...x, pending: false, error: x.error ?? "Kaju stopped before answering." } : x)); }
  }, [busy, turns, page]);

  const plan = useCallback(async (orgId: string, text: string, intent: Intent | null) => {
    const t = await token(); if (!t) return { ok: false as const, error: "Sign in to plan missions." };
    const res = await fetch("/api/kaju/plan", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ orgId, text, intent, page }) });
    const j = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; plan?: Plan; steps?: PlanStepView[]; planner?: string };
    if (!res.ok || !j.ok || !j.plan || !j.steps) return { ok: false as const, error: j.error ?? "Kaju could not plan this. Nothing was started." };
    return { ok: true as const, planned: { plan: j.plan, steps: j.steps, planner: j.planner ?? "rules", key: `m${Date.now()}${Math.random().toString(36).slice(2, 8)}`, text } };
  }, [page]);

  const start = useCallback(async (orgId: string, p: Planned) => {
    const t = await token(); if (!t) return { error: "Sign in again." };
    const res = await fetch("/api/kaju/missions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ orgId, plan: p.plan, key: p.key, request: { text: p.text.slice(0, 2000), planner: p.planner } }) });
    const j = await res.json().catch(() => ({})) as { id?: string; error?: string };
    return res.ok && j.id ? { id: j.id } : { error: j.error ?? "The mission could not be started." };
  }, []);

  const confirm = useCallback(async (turnId: string, p: Proposal) => {
    const who = (await getSupabase()?.auth.getUser())?.data.user;
    const r = await confirmVerified(p, { id: who?.id ?? "", name: (who?.user_metadata?.display_name as string | undefined) ?? who?.email ?? "member" });
    patch(turnId, (x) => ({ ...x, saved: { ...(x.saved ?? {}), [p.id]: r } }));
    return r;
  }, []);

  const value = useMemo<Ctx>(() => ({ turns, busy, open, setOpen, page, setPage, ask, clear: () => { ctrl.current?.abort(); setTurns([]); }, plan, start, confirm }), [turns, busy, open, page, ask, plan, start, confirm]);
  return <KajuCtx.Provider value={value}>{children}</KajuCtx.Provider>;
}

export function useKaju() {
  const c = useContext(KajuCtx);
  if (!c) throw new Error("useKaju outside KajuProvider");
  return c;
}
