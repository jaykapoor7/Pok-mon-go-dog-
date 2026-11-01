"use client";

/* ════════════════════════════════════════════════════════════════════
   Kaju, StrayPaw's AI agent, in the app: one conversation, three sizes.
   The puppy is Kaju's mascot; his pose follows what the agent is really
   doing (useKajuMood): greeting on open, thinking while /api/ai works,
   pleased after an answer, concerned on an error, settling when closed.
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
import { Paperclip, Plug } from "lucide-react";
import { ArrowRight, ArrowUp, Check, CheckCircle2, ClipboardList, ExternalLink, Info, Loader2, Maximize2, PawPrint, RotateCcw, Sparkles, TriangleAlert, X, Layers, MapPin, FileText } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { executeProposal, type Saved } from "./execute";
import type { AiReply, Citation, Proposal } from "./types";
import { Kaju } from "@/kaju/Kaju";
import { MAX_UPLOAD_BYTES, UPLOAD_LIMIT_MESSAGE } from "@/lib/files/limits";
import { useKajuAmbient } from "@/kaju/ambient";
import { useReducedMotion } from "@/kaju/controller";
import type { KajuState } from "@/kaju/poses";
import { isRecordingDemo } from "@/lib/recording-demo";
import { demoExecute, demoKajuReply } from "@/lib/demo/kaju-demo";
import { DemoFileViewer } from "@/sp/demo/FileViewer";
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

/** Kaju's pose, from the agent's real state. Never from a pretend result. */
export function useKajuMood(): KajuState {
  const ai = useAi();
  const [state, setState] = useState<KajuState>("lying");
  const last = ai.msgs[ai.msgs.length - 1];
  const lastKey = last ? `${last.id}:${last.error ? "e" : "a"}` : "";
  const prevOpen = useRef(ai.open);
  useEffect(() => {
    let t: number | undefined;
    if (ai.busy) setState("thinking");
    else if (!ai.open && prevOpen.current) { setState("goodbye"); t = window.setTimeout(() => setState("lying"), 1100); }
    else if (!ai.open) setState("lying");
    else if (last?.role === "assistant" && last.error) setState("concerned");
    else if (last?.role === "assistant" && last.reply) {
      const found = (last.reply.citations?.length ?? 0) > 0 || (last.reply.proposals?.length ?? 0) > 0;
      const incomplete = last.reply.tools.some((tool) => !tool.ok) || last.reply.notice?.includes("incomplete");
      setState(incomplete ? "concerned" : found ? "success" : "explaining");
      t = window.setTimeout(() => setState("listening"), 1600);
    } else if (ai.open && !prevOpen.current) { setState("greeting"); t = window.setTimeout(() => setState("listening"), 1500); }
    else setState("listening");
    prevOpen.current = ai.open;
    return () => window.clearTimeout(t);
  }, [ai.busy, ai.open, lastKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

/** The mascot, for any place that shows Kaju's state. */
export function KajuMark({ size = 40, state }: { size?: number; state?: KajuState }) {
  const mood = useKajuMood();
  const [ambient] = useKajuAmbient();
  const reduced = useReducedMotion();
  return <Kaju state={state ?? mood} size={size} still={!ambient || reduced} />;
}

export function AiProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const identity = user?.id ?? "guest";
  return <ScopedAiProvider key={identity} storageKey={`${KEY}.${identity}`}>{children}</ScopedAiProvider>;
}

/** Account changes discard in-flight work and never inherit another account's transcript. */
function ScopedAiProvider({ children, storageKey }: { children: ReactNode; storageKey: string }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<boolean | null>(null);
  const msgsRef = useRef<Msg[]>([]);
  const active = useRef(true);
  const request = useRef<AbortController | null>(null);
  msgsRef.current = msgs;

  useEffect(() => {
    active.current = true;
    try { sessionStorage.removeItem(KEY); const s = sessionStorage.getItem(storageKey); if (s) setMsgs(JSON.parse(s)); if (sessionStorage.getItem("sp3.ai.open") === "1") setOpen(true); } catch { /* storage blocked */ }
    if (isRecordingDemo) setModel(true); else fetch("/api/ai").then((r) => r.json()).then((j) => { if (active.current) setModel(!!j.model); }).catch(() => { if (active.current) setModel(null); });
    return () => { active.current = false; request.current?.abort(); };
  }, [storageKey]);
  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(msgs.slice(-30))); } catch { /* fine */ } }, [msgs, storageKey]);
  useEffect(() => { try { sessionStorage.setItem("sp3.ai.open", open ? "1" : "0"); } catch { /* fine */ } }, [open]);

  const ask = useCallback(async (q: string) => {
    const text = q.trim();
    if (!text) return;
    if (path !== "/assistant") setOpen(true);
    const user: Msg = { id: uid(), role: "user", text };
    const history = [...msgsRef.current, user];
    setMsgs(history);
    setBusy(true);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (isRecordingDemo) {
      const { reply, ms } = demoKajuReply(text, path);
      await new Promise((r) => setTimeout(r, ms));
      if (!active.current || controller.signal.aborted) return;
      setMsgs((m) => [...m, { id: uid(), role: "assistant", text: reply.text, reply }]);
      setBusy(false);
      return;
    }
    try {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      if (!active.current || controller.signal.aborted) return;
      const ws = path.startsWith("/ngo") ? "ngo" : path.startsWith("/city") ? "municipality" : path.startsWith("/learn") ? "education" : "community";
      const res = await fetch("/api/ai", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: history.slice(-12).map((m) => ({ role: m.role, text: m.reply?.text ?? m.text })), context: { path, workspace: ws } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!active.current || controller.signal.aborted) return;
      if (!res.ok) setMsgs((m) => [...m, { id: uid(), role: "assistant", text: "", error: data.error ?? "Kaju could not answer. Nothing was changed." }]);
      else {
        const reply = data as AiReply;
        setModel(reply.engine === "model");
        setMsgs((m) => [...m, { id: uid(), role: "assistant", text: reply.text, reply }]);
        if (reply.tools.some(tool => tool.name === "operations_insights" && tool.ok)) window.dispatchEvent(new Event("kaju-check-completed"));
      }
    } catch {
      if (!active.current || controller.signal.aborted) return;
      setMsgs((m) => [...m, { id: uid(), role: "assistant", text: "", error: "Could not reach StrayPaw. Check your connection; nothing was changed." }]);
    } finally { if (active.current && !controller.signal.aborted) setBusy(false); }
  }, [path]);

  const value = useMemo<Ctx>(() => ({ open, setOpen, toggle: () => setOpen((v) => !v), ask, msgs, busy, reset: () => setMsgs([]), model }), [open, ask, msgs, busy, model]);
  return <AiCtx.Provider value={value}>{children}{isRecordingDemo && <DemoFileViewer />}</AiCtx.Provider>;
}

const connectionsHref = (path: string) => (path.startsWith("/city") ? "/city/connections" : "/ngo/settings/connections");

/* ── suggestions, by where the person is ─────────────────────────── */
function suggestions(path: string): string[] {
  if (path.startsWith("/ngo/animals")) return ["Find possible duplicate animals", "Which animals have no photo?", "Search the register for Brownie"];
  if (path.startsWith("/ngo/programmes")) return ["Summarise our programmes", "Which records are missing evidence?", "Show published ABC programmes"];
  if (path.startsWith("/ngo/inbox") || path.startsWith("/ngo/field")) return ["Summarise today's work", "Released after ABC near the temple, Saibaba Colony, Coimbatore. Female, ear notched. Photo attached.", "What follow-ups are overdue?"];
  if (path.startsWith("/ngo")) return ["Run operational checks", "Summarise today's work", "Which records are missing evidence?", "Find possible duplicate animals", "Open the import screen"];
  if (path.startsWith("/city")) return ["Show published sterilisation programmes", "What programmes are in Coimbatore?", "Open the city report"];
  if (path.startsWith("/learn")) return ["Open the academy", "What programmes are published?"];
  return ["What programmes are published?", "Search for animals in Coimbatore", "How do I report an animal?"];
}

/* ── the docked panel ─────────────────────────────────────────────── */
export function AiPanel() {
  const ai = useAi();
  const here = usePathname() ?? "";
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ai.open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current?.contains(document.activeElement)) ai.setOpen(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [ai]);
  if (!ai.open) return null;
  return (
    <aside ref={ref} className="ai3-panel" aria-label="Kaju">
      <header className="ai3-head">
        <span className="kaju-head-mark"><KajuMark size={46} /></span><b>Kaju</b><span className="ai3-head-sub">StrayPaw&rsquo;s AI agent</span>
        <span className="ai3-head-act">
          <button type="button" className="ai3-icon" onClick={ai.reset} aria-label="New conversation" title="New conversation"><RotateCcw size={15} /></button>
          <Link className="ai3-icon" href={connectionsHref(here)} aria-label="Manage connections" title="Manage connections"><Plug size={15} /></Link>
          <Link className="ai3-icon" href="/assistant" aria-label="Open full screen" title="Open full screen"><Maximize2 size={15} /></Link>
          <button type="button" className="ai3-icon" onClick={() => ai.setOpen(false)} aria-label="Close Kaju"><X size={16} /></button>
        </span>
      </header>
      <Thread />
    </aside>
  );
}

/* ── full screen (/assistant) ─────────────────────────────────────── */
export function AiWorkspace() {
  const ai = useAi();
  const here = usePathname() ?? "";
  return (
    <div className="ai3-full">
      <div className="ai3-full-in">
        <header className="ai3-full-head">
          <div className="ai3-full-id"><span className="ai3-full-kaju"><KajuMark size={120} /></span><div><span className="s3-eyebrow">Kaju · StrayPaw&rsquo;s AI agent</span><h1>Ask Kaju.</h1><p>Questions, searches, summaries and prepared changes, over the records your account can read. Every change waits for your confirmation.</p></div></div>
          <span className="ai3-full-acts"><Link className="s3-btn is-line is-sm" href={connectionsHref(here)}><Plug size={14} />Manage connections</Link>{ai.msgs.length > 0 && <button type="button" className="s3-btn is-line is-sm" onClick={ai.reset}><RotateCcw size={14} />New conversation</button>}</span>
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
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const send = () => {
    if ((!q.trim() && !file) || ai.busy) return;
    ai.ask(file ? `${q.trim() || `Summarise ${file.name}.`}\n\n${file.text}` : q);
    setQ(""); setFile(null);
  };
  const attach = async (f: File | undefined) => {
    setFileErr(null);
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) { setFileErr(UPLOAD_LIMIT_MESSAGE); return; }
    if (isRecordingDemo) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const n = Math.max(0, (XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as unknown[]).length - 1);
      setFile({ name: f.name, text: `[${f.name} · ${n} rows]` });
      return;
    }
    try {
      const t = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      const fd = new FormData(); fd.append("file", f);
      const r = await fetch("/api/files/read", { method: "POST", body: fd, headers: t ? { Authorization: `Bearer ${t}` } : {} });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not read that file");
      setFile({ name: j.name, text: j.text });
    } catch (e) { setFileErr((e as Error).message); }
  };
  const sugg = suggestions(path);

  return (
    <div className={`ai3-thread${full ? " is-full" : ""}`}>
      <div className="ai3-scroll" aria-live="polite">
        {ai.msgs.length === 0 && (
          <div className="ai3-empty">
            {!full && <div className="ai3-empty-kaju"><KajuMark size={150} /></div>}
            <p className="ai3-empty-h">{user ? `How can I help, ${user.name.split(" ").find((w) => !w.endsWith(".")) ?? user.name}?` : "Ask about public programmes and animals."}</p>
            <p className="ai3-empty-s">{user ? "I read with your own access, cite the records I use, and prepare changes for you to confirm." : "Sign in to ask about your organisation's records. Public questions work without an account."}</p>
            <div className="ai3-sugg">{sugg.map((s) => <button key={s} type="button" onClick={() => ai.ask(s)}><Sparkles size={13} aria-hidden />{s.length > 70 ? `${s.slice(0, 68)}…` : s}</button>)}</div>
          </div>
        )}
        {ai.msgs.map((m) => m.role === "user"
          ? <div key={m.id} className="ai3-q">{m.text}</div>
          : <Answer key={m.id} m={m} />)}
        {ai.busy && <div className="ai3-thinking" role="status"><span className="ai3-thinking-kaju" aria-hidden><KajuMark size={44} state="thinking" /></span><Loader2 size={14} className="animate-spin" />Kaju is reading the record</div>}
        <div ref={end} />
      </div>
      <div className="ai3-compose">
        <textarea ref={input} value={q} onChange={(e) => setQ(e.target.value)} rows={full ? 3 : 2} placeholder="Ask Kaju, search, or paste a field update…" aria-label="Message Kaju"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        {user && <label className="ai3-attach" title="Attach a PDF, Word, Excel, CSV or PowerPoint file"><Paperclip size={15} aria-hidden /><span className="sr-only">Attach a file</span><input type="file" accept=".pdf,.docx,.xlsx,.xls,.csv,.pptx" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ""; }} /></label>}
        <button type="button" className="ai3-send" onClick={send} disabled={(!q.trim() && !file) || ai.busy} aria-label="Send"><ArrowUp size={16} /></button>
        {(file || fileErr) && <p className={`ai3-file${fileErr ? " is-err" : ""}`}>{fileErr ?? <>Attached: <b>{file!.name}</b> <button type="button" onClick={() => setFile(null)}>Remove</button></>}</p>}
        <p className="ai3-foot">{ai.model === false ? "Using record tools. Ask about cases, evidence or reports." : "Answers cite records. Changes need your confirmation."}</p>
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
  const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const rows: [string, string][] = p.kind === "open_case"
    ? [["Action", "Open a case"], ["Title", p.title], ["City", p.city], ["Place", p.zone ?? "Not given"], ["Category", p.category], ["Severity", p.severity], ["Notes", p.description.slice(0, 220) + (p.description.length > 220 ? "…" : "")]]
    : p.kind === "add_note" ? [["Action", "Add a note"], ["Case", p.caseLabel], ["Note", p.note]]
      : p.kind === "schedule_followup" ? [["Action", "Schedule a follow-up"], ["Case", p.caseLabel], ["Due", new Date(p.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })], ["Note", p.note || "—"]]
        : p.kind === "record_care" ? [["Action", "Record a care event"], ["Animal", p.dogLabel], ["Kind", p.careKind], ["Date", p.date ?? "Not given"], ["Notes", p.notes || "—"]]
          : p.kind === "email" ? [["Action", p.send ? `Send from ${p.providerName}` : `Save a draft in ${p.providerName}`], ["To", p.to.join(", ")], ...(p.cc.length ? [["Cc", p.cc.join(", ")] as [string, string]] : []), ["Subject", p.subject], ["Message", p.body.slice(0, 400) + (p.body.length > 400 ? "…" : "")]]
            : p.kind === "calendar_event" ? [["Action", `Add to ${p.providerName} calendar`], ["Event", p.title], ["Starts", when(p.start)], ["Ends", when(p.end)], ["Guests", p.attendees.join(", ") || "None"], ["Place", p.location ?? "Not given"]]
              : p.kind === "chat_post" ? [["Action", `Post to Slack`], ["Channel", `#${p.channelName}`], ["Message", p.text.slice(0, 400) + (p.text.length > 400 ? "…" : "")]]
                : p.kind === "sms" ? [["Action", "Send an SMS"], ["To", p.to.join(", ")], ["Template values", p.values.join(" · ") || "None"], ["For", p.note || "—"]]
              : [["Action", p.saveTo ? `Download and save to ${p.saveToName}` : "Download"], ["Report", p.title], ["Format", p.format.toUpperCase()]];
  const outside = p.kind === "email" || p.kind === "calendar_event" || p.kind === "chat_post" || p.kind === "sms" || (p.kind === "report_file" && !!p.saveTo);
  async function confirm() {
    if (!user) return;
    setState("busy");
    const r = isRecordingDemo ? await demoExecute(p) : await executeProposal(p, { id: user.id, name: user.name });
    setSaved(r); setState("idle");
  }
  if (state === "cancel") return <p className="ai3-notice"><X size={12} aria-hidden />Cancelled. Nothing was saved.</p>;
  return (
    <div className={`ai3-prop${saved?.ok ? " is-done" : ""}`} role="group" aria-label="Prepared change">
      <p className="ai3-prop-h">{saved?.ok ? <><CheckCircle2 size={14} />{p.kind === "email" || p.kind === "calendar_event" || p.kind === "report_file" || p.kind === "chat_post" || p.kind === "sms" ? saved.what : "Saved to the record"}</> : <><Sparkles size={13} />{outside ? "Prepared, not sent" : "Prepared, not saved"}</>}</p>
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {saved && !saved.ok && <p className="s3-err" role="alert">{saved.error}</p>}
      {saved?.ok ? (
        <div className="ai3-prop-act">{saved.href && <Link className="s3-btn is-sm is-line" href={saved.href}>Open the record<ExternalLink size={13} /></Link>}<span className="s3-small">{p.kind === "email" || p.kind === "calendar_event" || p.kind === "report_file" || p.kind === "chat_post" || p.kind === "sms" ? "Done and logged." : "It appears in the normal screens with a note that the AI agent prepared it and you confirmed it."}</span></div>
      ) : (
        <div className="ai3-prop-act">
          <button type="button" className="s3-btn is-sm is-primary" onClick={confirm} disabled={state === "busy" || !user}>{state === "busy" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{p.kind === "email" && p.send ? "Confirm and send" : p.kind === "chat_post" ? "Confirm and post" : p.kind === "sms" ? "Confirm and send SMS" : p.kind === "report_file" ? "Confirm and download" : p.kind === "calendar_event" ? "Confirm and add" : "Confirm and save"}</button>
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
