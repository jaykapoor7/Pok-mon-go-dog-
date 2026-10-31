"use client";

/* ════════════════════════════════════════════════════════════════════
   StrayPaw AI in the app: one conversation, three sizes.
     · the launcher (sidebar button, top bar, ⌘J, phone tab)
     · the right-side panel, docked beside any page
     · the full-screen workspace at /assistant
   Answers come from /api/ai, which reads with the person's own session.
   Proposed changes are shown as cards and saved only on Confirm, through
   the same actions as the manual screens (./execute).
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUp, Check, CheckCircle2, ClipboardList, ExternalLink, Info, Loader2, Maximize2, PawPrint, RotateCcw, Sparkles, TriangleAlert, X, Layers, MapPin, FileText } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { executeProposal, type Saved } from "./execute";
import type { AiReply, Citation, Proposal } from "./types";
import "./ai.css";

type Msg = { id: string; role: "user" | "assistant"; text: string; reply?: AiReply; error?: string };
type Ctx = { open: boolean; toggle: () => void; setOpen: (v: boolean) => void; ask: (q: string) => void; msgs: Msg[]; busy: boolean; reset: () => void; model: boolean | null };
const AiCtx = createContext<Ctx | null>(null);
const KEY = "sp3.ai.thread";
const uid = () => Math.random().toString(36).slice(2, 10);

export function useAi(): Ctx {
  const c = useContext(AiCtx);
  return c ?? { open: false, toggle: () => {}, setOpen: () => {}, ask: () => {}, msgs: [], busy: false, reset: () => {}, model: null };
}

export function AiProvider({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<boolean | null>(null);
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = msgs;

  useEffect(() => {
    try { const s = sessionStorage.getItem(KEY); if (s) setMsgs(JSON.parse(s)); if (sessionStorage.getItem("sp3.ai.open") === "1") setOpen(true); } catch { /* storage blocked */ }
    fetch("/api/ai").then((r) => r.json()).then((j) => setModel(!!j.model)).catch(() => setModel(null));
  }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch { /* fine */ } }, [msgs]);
  useEffect(() => { try { sessionStorage.setItem("sp3.ai.open", open ? "1" : "0"); } catch { /* fine */ } }, [open]);

  const ask = useCallback(async (q: string) => {
    const text = q.trim();
    if (!text) return;
    if (path !== "/assistant") setOpen(true);
    const user: Msg = { id: uid(), role: "user", text };
    const history = [...msgsRef.current, user];
    setMsgs(history);
    setBusy(true);
    try {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      const ws = path.startsWith("/ngo") ? "ngo" : path.startsWith("/city") ? "municipality" : path.startsWith("/learn") ? "education" : "community";
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: history.slice(-12).map((m) => ({ role: m.role, text: m.reply?.text ?? m.text })), context: { path, workspace: ws } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsgs((m) => [...m, { id: uid(), role: "assistant", text: "", error: data.error ?? "StrayPaw AI could not answer. Nothing was changed." }]);
      else setMsgs((m) => [...m, { id: uid(), role: "assistant", text: (data as AiReply).text, reply: data as AiReply }]);
    } catch {
      setMsgs((m) => [...m, { id: uid(), role: "assistant", text: "", error: "Could not reach StrayPaw. Check your connection; nothing was changed." }]);
    } finally { setBusy(false); }
  }, [path]);

  const value = useMemo<Ctx>(() => ({ open, setOpen, toggle: () => setOpen((v) => !v), ask, msgs, busy, reset: () => setMsgs([]), model }), [open, ask, msgs, busy, model]);
  return <AiCtx.Provider value={value}>{children}</AiCtx.Provider>;
}

/* ── suggestions, by where the person is ─────────────────────────── */
function suggestions(path: string): string[] {
  if (path.startsWith("/ngo/animals")) return ["Find possible duplicate animals", "Which animals have no photo?", "Search the register for Brownie"];
  if (path.startsWith("/ngo/programmes")) return ["Summarise our programmes", "Which records are missing evidence?", "Show published ABC programmes"];
  if (path.startsWith("/ngo/inbox") || path.startsWith("/ngo/field")) return ["Summarise today's work", "Released after ABC near the temple, Saibaba Colony, Coimbatore. Female, ear notched. Photo attached.", "What follow-ups are overdue?"];
  if (path.startsWith("/ngo")) return ["Summarise today's work", "Which records are missing evidence?", "Find possible duplicate animals", "Open the import screen"];
  if (path.startsWith("/city")) return ["Show published sterilisation programmes", "What programmes are in Coimbatore?", "Open the city report"];
  if (path.startsWith("/learn")) return ["Open the academy", "What programmes are published?"];
  return ["What programmes are published?", "Search for animals in Coimbatore", "How do I report an animal?"];
}

/* ── the docked panel ─────────────────────────────────────────────── */
export function AiPanel() {
  const ai = useAi();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ai.open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current?.contains(document.activeElement)) ai.setOpen(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [ai]);
  if (!ai.open) return null;
  return (
    <aside ref={ref} className="ai3-panel" aria-label="StrayPaw AI">
      <header className="ai3-head">
        <span className="s3-ai-mark"><Sparkles size={12} /></span><b>StrayPaw AI</b>
        <span className="ai3-head-act">
          <button type="button" className="ai3-icon" onClick={ai.reset} aria-label="New conversation" title="New conversation"><RotateCcw size={15} /></button>
          <Link className="ai3-icon" href="/assistant" aria-label="Open full screen" title="Open full screen"><Maximize2 size={15} /></Link>
          <button type="button" className="ai3-icon" onClick={() => ai.setOpen(false)} aria-label="Close StrayPaw AI"><X size={16} /></button>
        </span>
      </header>
      <Thread />
    </aside>
  );
}

/* ── full screen (/assistant) ─────────────────────────────────────── */
export function AiWorkspace() {
  const ai = useAi();
  return (
    <div className="ai3-full">
      <div className="ai3-full-in">
        <header className="ai3-full-head">
          <div><span className="s3-eyebrow"><Sparkles size={14} /> StrayPaw AI</span><h1>Ask the record.</h1><p>Questions, searches, summaries and prepared changes, over the records your account can read. Every change waits for your confirmation.</p></div>
          {ai.msgs.length > 0 && <button type="button" className="s3-btn is-line is-sm" onClick={ai.reset}><RotateCcw size={14} />New conversation</button>}
        </header>
        <Thread full />
      </div>
    </div>
  );
}

function Thread({ full = false }: { full?: boolean }) {
  const ai = useAi();
  const path = usePathname() ?? "/";
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [ai.msgs.length, ai.busy]);
  useEffect(() => { input.current?.focus(); }, []);
  const send = () => { if (!q.trim() || ai.busy) return; ai.ask(q); setQ(""); };
  const sugg = suggestions(path);

  return (
    <div className={`ai3-thread${full ? " is-full" : ""}`}>
      <div className="ai3-scroll" aria-live="polite">
        {ai.msgs.length === 0 && (
          <div className="ai3-empty">
            <p className="ai3-empty-h">{user ? `How can I help, ${user.name.split(" ")[0]}?` : "Ask about public programmes and animals."}</p>
            <p className="ai3-empty-s">{user ? "I read with your own access, cite the records I use, and prepare changes for you to confirm." : "Sign in to ask about your organisation's records. Public questions work without an account."}</p>
            <div className="ai3-sugg">{sugg.map((s) => <button key={s} type="button" onClick={() => ai.ask(s)}><Sparkles size={13} aria-hidden />{s.length > 70 ? `${s.slice(0, 68)}…` : s}</button>)}</div>
          </div>
        )}
        {ai.msgs.map((m) => m.role === "user"
          ? <div key={m.id} className="ai3-q">{m.text}</div>
          : <Answer key={m.id} m={m} />)}
        {ai.busy && <div className="ai3-thinking"><Loader2 size={14} className="animate-spin" />Reading the record</div>}
        <div ref={end} />
      </div>
      <div className="ai3-compose">
        <textarea ref={input} value={q} onChange={(e) => setQ(e.target.value)} rows={full ? 3 : 2} placeholder="Ask, search, or paste a field update…" aria-label="Message StrayPaw AI"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="button" className="ai3-send" onClick={send} disabled={!q.trim() || ai.busy} aria-label="Send"><ArrowUp size={16} /></button>
        <p className="ai3-foot">{ai.model === false ? "Record tools only: no language model is configured on this deployment." : "Answers cite records. Changes need your confirmation."}</p>
      </div>
    </div>
  );
}

function Answer({ m }: { m: Msg }) {
  const router = useRouter();
  if (m.error) return <div className="ai3-a is-error"><TriangleAlert size={15} aria-hidden /><span>{m.error}</span></div>;
  const r = m.reply!;
  return (
    <div className="ai3-a">
      {r.tools.length > 0 && <ul className="ai3-tools">{r.tools.map((t, i) => <li key={i} className={t.ok ? "" : "is-off"}>{t.ok ? <CheckCircle2 size={12} /> : <Info size={12} />}<code>{t.name}</code><span>{t.summary}</span></li>)}</ul>}
      <div className="ai3-text"><Rich text={r.text} /></div>
      {r.citations.length > 0 && <Sources items={r.citations} />}
      {r.proposals.map((p) => <ProposalCard key={p.id} p={p} />)}
      {r.navigate && <button type="button" className="s3-btn is-sm is-line ai3-go" onClick={() => router.push(r.navigate!.href)}>Open {r.navigate.label}<ArrowRight size={14} /></button>}
      {r.notice && <p className="ai3-notice"><Info size={12} aria-hidden />{r.notice}</p>}
    </div>
  );
}

const KIND_ICON = { animal: PawPrint, case: ClipboardList, programme: Layers, place: MapPin, page: FileText };
function Sources({ items }: { items: Citation[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 6);
  return (
    <div className="ai3-src">
      <span>Sources</span>
      <div>{shown.map((c) => { const I = KIND_ICON[c.kind]; return <Link key={c.id} href={c.href} className="ai3-cite"><I size={11} aria-hidden />{c.label}</Link>; })}
        {items.length > 6 && !all && <button type="button" className="ai3-cite is-more" onClick={() => setAll(true)}>+{items.length - 6} more</button>}</div>
    </div>
  );
}

function ProposalCard({ p }: { p: Proposal }) {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "cancel">("idle");
  const [saved, setSaved] = useState<Saved | null>(null);
  const rows: [string, string][] = p.kind === "open_case"
    ? [["Action", "Open a case"], ["Title", p.title], ["City", p.city], ["Place", p.zone ?? "Not given"], ["Category", p.category], ["Severity", p.severity], ["Notes", p.description.slice(0, 220) + (p.description.length > 220 ? "…" : "")]]
    : p.kind === "add_note" ? [["Action", "Add a note"], ["Case", p.caseLabel], ["Note", p.note]]
      : p.kind === "schedule_followup" ? [["Action", "Schedule a follow-up"], ["Case", p.caseLabel], ["Due", new Date(p.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })], ["Note", p.note || "—"]]
        : [["Action", "Record a care event"], ["Animal", p.dogLabel], ["Kind", p.careKind], ["Date", p.date ?? "Not given"], ["Notes", p.notes || "—"]];
  async function confirm() {
    if (!user) return;
    setState("busy");
    const r = await executeProposal(p, { id: user.id, name: user.name });
    setSaved(r); setState("idle");
  }
  if (state === "cancel") return <p className="ai3-notice"><X size={12} aria-hidden />Cancelled. Nothing was saved.</p>;
  return (
    <div className={`ai3-prop${saved?.ok ? " is-done" : ""}`} role="group" aria-label="Prepared change">
      <p className="ai3-prop-h">{saved?.ok ? <><CheckCircle2 size={14} />Saved to the record</> : <><Sparkles size={13} />Prepared, not saved</>}</p>
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {saved && !saved.ok && <p className="s3-err" role="alert">{saved.error}</p>}
      {saved?.ok ? (
        <div className="ai3-prop-act">{saved.href && <Link className="s3-btn is-sm is-line" href={saved.href}>Open the record<ExternalLink size={13} /></Link>}<span className="s3-small">It appears in the normal screens with a note that it was prepared with StrayPaw AI.</span></div>
      ) : (
        <div className="ai3-prop-act">
          <button type="button" className="s3-btn is-sm is-primary" onClick={confirm} disabled={state === "busy" || !user}>{state === "busy" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Confirm and save</button>
          <button type="button" className="s3-btn is-sm is-ghost" onClick={() => setState("cancel")} disabled={state === "busy"}>Cancel</button>
          {!user && <span className="s3-small">Sign in to save.</span>}
        </div>
      )}
    </div>
  );
}

/** Minimal, safe rendering: **bold**, bullet lines and paragraphs. No HTML. */
function Rich({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <span key={i}>{part}</span>);
  return <>{blocks.map((b, i) => {
    const lines = b.split("\n");
    if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-•*]\s+/, ""))}</li>)}</ul>;
    return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l)}</span>)}</p>;
  })}</>;
}
