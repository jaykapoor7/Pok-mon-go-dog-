"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AiReply, Proposal } from "@/sp3/ai/types";
import { isAiReply } from "@/sp3/ai/validation";
import { KajuCtx, MSG, type KajuContext, type Turn, type TurnError } from "@/nx/kaju/state";

/* Kaju's conversation on the homepage. It gives the product's own conversation components (Thread, Composer, Blocks)
   the context they read in the app, with one difference: questions go to the public sample endpoint (/api/kaju/demo),
   which answers from an isolated sample programme and holds no session. Nothing is saved anywhere but this browser tab,
   so a visitor who scrolls on and comes back finds the conversation as they left it. Confirm marks a prepared card as
   confirmed and stores nothing, and says so. */

const KEY = "sp.home.kaju.v1";
const TIMEOUT_MS = 40_000;
const off = async () => false;

export function DemoKajuProvider({ children, onActivity }: { children: ReactNode; /** A reply arrived (true) or a question was sent (false). */ onActivity?: (answered: boolean) => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<{ ac: AbortController; why: TurnError | null } | null>(null);
  const loaded = useRef(false);
  useEffect(() => { try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { turns?: Turn[] } | null; if (s && Array.isArray(s.turns)) setTurns(s.turns.filter((t) => !t.pending).slice(-40)); } catch { /* storage blocked */ } loaded.current = true; }, []);
  useEffect(() => { if (!loaded.current) return; try { sessionStorage.setItem(KEY, JSON.stringify({ turns: turns.filter((t) => !t.pending).slice(-40) })); } catch { /* fine */ } }, [turns]);
  const patch = (id: string, f: (t: Turn) => Turn) => setTurns((ts) => ts.map((t) => (t.id === id ? f(t) : t)));

  const ask = useCallback(async (text: string) => {
    const q = text.trim().slice(0, 600); if (!q || busy) return;
    const uid = `u${Date.now()}`, kid = `k${Date.now()}`;
    const history = [...turns, { id: uid, role: "user" as const, text: q }].filter((t) => !t.error).slice(-12).map((t) => ({ role: t.role === "user" ? "user" : "assistant", text: (t.role === "user" ? t.text : t.reply?.text ?? t.text).slice(0, 1500) }));
    setTurns((ts) => [...ts, { id: uid, role: "user", text: q }, { id: kid, role: "kaju", text: "", pending: true, progress: [] }]);
    setBusy(true); onActivity?.(false);
    ctrl.current?.ac.abort();
    const mine = { ac: new AbortController(), why: null as TurnError | null };
    ctrl.current = mine;
    const current = () => ctrl.current === mine;
    const fail = (kind: TurnError, error?: string) => { if (current() || kind === "stopped") patch(kid, (x) => ({ ...x, pending: false, kind, error: error ?? MSG[kind] })); };
    const settle = (reply: unknown) => { if (!current()) return; if (!isAiReply(reply)) { fail("incomplete"); return; } patch(kid, (x) => ({ ...x, pending: false, text: reply.text, reply })); onActivity?.(true); };
    const timer = setTimeout(() => { mine.why = "timeout"; mine.ac.abort(); }, TIMEOUT_MS);
    try {
      const res = await fetch("/api/kaju/demo", { method: "POST", signal: mine.ac.signal, headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify({ messages: history }) });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); fail("failed", (j as { error?: string }).error ?? undefined); return; }
      if (!/ndjson/.test(res.headers.get("content-type") ?? "")) { settle(await res.json().catch(() => null)); return; }
      /* The product's transport: progress lines as each tool finishes, then the reply. */
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
  }, [busy, turns, onActivity]);

  const stop = useCallback(() => { const c = ctrl.current; if (!c) return; c.why = "stopped"; c.ac.abort(); ctrl.current = null; setBusy(false); }, []);
  const retry = useCallback((turnId: string) => {
    const i = turns.findIndex((t) => t.id === turnId); const q = i > 0 ? turns[i - 1] : null;
    if (!q || q.role !== "user") return;
    setTurns((ts) => ts.filter((t) => t.id !== turnId && t.id !== q.id));
    setTimeout(() => void ask(q.text), 0);
  }, [turns, ask]);
  const confirm = useCallback(async (turnId: string, p: Proposal) => {
    const r = { ok: true as const, at: new Date().toISOString(), what: "Confirmed in the sample. Nothing was stored" };
    patch(turnId, (x) => ({ ...x, saved: { ...(x.saved ?? {}), [p.id]: r } }));
    return r;
  }, []);

  const value = useMemo<KajuContext>(() => ({
    turns, busy, open: false, setOpen: () => {}, page: { path: "/", title: "Kaju on a sample programme" }, setPage: () => {}, setSubject: () => {},
    ask, stop, retry, confirm, expired: false,
    clear: () => { const c = ctrl.current; if (c) { c.why = null; c.ac.abort(); ctrl.current = null; } setBusy(false); setTurns([]); },
    /* A visitor has no saved history, missions or ratings: those belong to a signed-in workspace. */
    threadId: null, keeping: "guest", history: [], loadHistory: async () => {}, resume: off, forget: off, rate: off,
    plan: async () => ({ ok: false as const, error: "Plans and missions run in your own workspace. Book a demo to try them on your records." }),
    start: async () => ({ error: "Missions run in your own workspace." }),
  }), [turns, busy, ask, stop, retry, confirm]);
  return <KajuCtx.Provider value={value}>{children}</KajuCtx.Provider>;
}
