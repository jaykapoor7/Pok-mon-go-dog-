"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUp, ArrowUpRight, Check as Tick, Info, Loader2, X } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import type { Proposal } from "@/sp3/ai/types";
import { appHref, useKaju, type Turn } from "./kaju/state";
import { useLive } from "./live";
import "./css/atkaju.css";

/* @Kaju on every home: one line near the top where a person adds a task, records something or asks a question, in
   their own words. It is the same conversation as the Kaju page and the compact panel (kaju/state.tsx), so "Open in
   Kaju" carries on where the home left off; the page's address goes with each question as its context. Nothing is sent
   until the person presses Enter or Ask; an example or a suggestion only fills the box. Nothing is saved until they
   press Confirm on what Kaju prepared, and Confirm runs the same audited action the record screens use (/api/ai/act,
   through kajuConfirm). Kaju reads only what the signed-in person can open. */

export type KajuChip = { label: string; fill?: string };
const task = (example?: string): KajuChip => (example ? { label: `Add a task: ${example}` } : { label: "Add a task: …", fill: "Add a task: " });

/** Example phrasing for each kind of home, only what Kaju answers there today (checked on staging, 17 Nov 2026); the
    figures and panels below already open the lists. A chip ending in "…" fills the start of a sentence to finish. */
const remind: KajuChip = { label: "Remind me to …", fill: "Remind me to " };
const what: KajuChip = { label: "What can I do with you?" };
export const KAJU_CHIPS = {
  ngo: [task("call the vet tomorrow"), { label: "What's overdue?" }, { label: "Record a brown female limping near Ward 12" }],
  office: [{ label: "Packages waiting for review" }, task(), what],
  programme: [task(), remind, what],
  clinic: [{ label: "PEP doses due today" }, { label: "Who missed a dose?" }, { label: "Register a bite: …", fill: "Register a bite: " }, task()],
  lab: [task(), remind, what],
  vet: [task(), remind, what],
  research: [task(), remind, what],
} satisfies Record<string, KajuChip[]>;
export type KajuRole = keyof typeof KAJU_CHIPS;

/** Put words in the @Kaju box on this page (not sent), for example from a row in "Needs attention". */
export const prefillKaju = (text: string) => window.dispatchEvent(new CustomEvent("nx:atkaju", { detail: { text } }));
/** Told when something Kaju prepared was saved from the home, so the page can read its lists again. */
export const KAJU_SAVED = "nx:atkaju-saved";

/* What Kaju prepared, read loosely: a kind added on the server later still shows, but only the kinds below can be
   confirmed here, because only for them can this card say exactly what will be saved. Anything else is reviewed in Kaju. */
type Prep = { id: string; kind: string; why?: string } & Record<string, unknown>;
const HERE = new Set(["open_case", "add_note", "schedule_followup", "record_care", "add_task", "register_exposure"]);
const WORD: Record<string, string> = { open_case: "Open a case", add_note: "Add a note", schedule_followup: "Schedule a follow-up", record_care: "Record care", add_task: "Add a task", register_exposure: "Record a bite", email: "Email", calendar_event: "Calendar event", chat_post: "Post in a connected chat", sms: "Text message", report_file: "Report file" };
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (iso: string | null) => { if (!iso) return null; const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); };
const bits = (xs: (string | null)[]) => xs.filter(Boolean).join(" · ");
const EXPOSURE: Record<string, string> = { bite: "Bite", scratch: "Scratch", lick_broken_skin: "Lick on broken skin", other: "Other contact" };
const WASHED: Record<string, string> = { before_arrival: "washed before arrival", at_facility: "washed here", not_washed: "not washed" };
/** SPC-F5367A809C1C… reads as SPC-F5367A, as on the record pages; the full code stays on the record and in the title. */
const shortRef = (label: string) => label.replace(/\b([A-Z]{2,5}(?:-[A-Z]{2,5})?)-([0-9A-F]{6})[0-9A-F]{6,}\b/gi, (_m, a: string, b: string) => `${a}-${b.toUpperCase()}`);
const kindWord = (k: string) => WORD[k] ?? k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const words = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

/** The main line of a prepared action and one fact per line under it, so the person checks each before confirming. */
function describe(p: Prep): { line: string; facts: string[] } {
  switch (p.kind) {
    case "add_task": return { line: str(p.title) ?? "A task", facts: [`Due: ${day(str(p.dueOn)) ?? "no date"}`, `For: ${str(p.assigneeName) ?? "nobody yet"}`, `About: ${str(p.caseLabel) ?? str(p.dogLabel) ?? "no record"}`] };
    case "open_case": return { line: str(p.title) ?? "A case", facts: [bits([[str(p.category), str(p.severity)].filter(Boolean).join(", ") || null, str(p.zone), str(p.city)]), str(p.description) ?? ""].filter(Boolean) };
    case "add_note": return { line: str(p.note) ?? "A note", facts: [`On: ${str(p.caseLabel) ?? "the case"}`] };
    case "schedule_followup": return { line: str(p.note) ?? "A follow-up", facts: [`On: ${day(str(p.dueAt)) ?? "no date"}`, `Case: ${str(p.caseLabel) ?? "not named"}`] };
    case "record_care": return { line: bits([str(p.dogLabel), str(p.careKind)]) || "Care", facts: [`Date: ${day(str(p.date)) ?? "not given"}`, str(p.notes) ?? ""].filter(Boolean) };
    case "register_exposure": return {
      line: "A bite presentation for your register, from your note. Prescribing stays with the clinician.",
      facts: [
        bits([str(p.facilityName), `${EXPOSURE[str(p.exposureKind) ?? ""] ?? "Exposure"} on ${day(str(p.exposureOn)) ?? "a date not given"}`, str(p.site)]),
        `Patient: ${bits([str(p.patientRef) ?? "no register number", str(p.ageText) ?? "age not given", str(p.sex) ?? "sex not given"])}`,
        `Category: ${str(p.category) ?? "not recorded; the clinician records it"} · Wound: ${WASHED[str(p.woundWashed) ?? ""] ?? "washing not recorded"}`,
        `Animal: ${bits([str(p.species) && p.species !== "unknown" ? str(p.species) : "not stated", str(p.animalPlace), str(p.areaName) ? `area ${str(p.areaName)}` : null])}`,
        `Reminder calls: ${p.reminderConsent === true ? "agreed, phone saved" : "not agreed"}`,
      ],
    };
    default: {
      /* A kind this page does not know: its plain fields, so nothing is hidden, and no Confirm here. */
      const facts = Object.entries(p).filter(([k, v]) => !["id", "kind", "why"].includes(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean") && String(v).trim()).slice(0, 6).map(([k, v]) => `${words(k)}: ${String(v).slice(0, 120)}`);
      return { line: "Open it in Kaju to review every detail before anything is saved.", facts };
    }
  }
}

/** **bold** in Kaju's answers, as bold; everything else as plain text. */
function Rich({ text }: { text: string }) {
  return <>{text.split("\n").filter((l) => l.trim()).map((l, i) => <p key={i}>{l.split(/(\*\*[^*]+\*\*)/g).map((s, j) => (s.startsWith("**") && s.endsWith("**") ? <b key={j}>{s.slice(2, -2)}</b> : s))}</p>)}</>;
}

type Saved = { ok: true; what: string; href: string | null } | { ok: false; error: string };

function PrepCard({ p, signedIn, path, saved, onSave, onDismiss }: { p: Prep; signedIn: boolean; path: string; saved?: Saved; onSave: () => Promise<void>; onDismiss: () => void }) {
  const [busy, setBusy] = useState(false);
  const here = HERE.has(p.kind);
  const { line, facts } = describe(p);
  return (
    <li className="ak-prep">
      <div className="ak-prep-h"><b>{kindWord(p.kind)}</b><span>{saved?.ok ? "Saved" : "Prepared, not saved"}</span></div>
      <p className={`ak-prep-l ${p.kind === "add_task" ? "is-title" : ""}`}>{line}</p>
      {facts.length ? <ul className="ak-facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul> : null}
      {str(p.why) ? <p className="ak-prep-w">{str(p.why)}</p> : null}
      <div className="ak-prep-f">
        {saved?.ok ? <span className="ak-ok" role="status"><Tick size={14} strokeWidth={3} aria-hidden />{saved.what}{saved.href ? <> · <Link href={saved.href}>Open</Link></> : null}</span>
          : !here ? <><Link className="ak-btn is-quiet" href="/kaju">Review in Kaju<ArrowRight size={14} aria-hidden /></Link><button type="button" className="ak-btn is-quiet" onClick={onDismiss}>Dismiss</button></>
          : !signedIn ? <Link className="ak-btn is-quiet" href={`/sign-in?next=${encodeURIComponent(path)}`}>Sign in to confirm</Link>
          : <><button type="button" className="ak-btn is-go" disabled={busy} onClick={async () => { setBusy(true); await onSave(); setBusy(false); }}>{busy ? <Loader2 size={14} className="nx-spin" aria-hidden /> : null}Confirm</button>
            <button type="button" className="ak-btn is-quiet" disabled={busy} onClick={onDismiss}>Dismiss</button>
            <span className="ak-prep-n">Saved under your name, with Kaju&apos;s help noted.</span></>}
      </div>
      {saved && !saved.ok ? <p className="ak-err" role="alert">{saved.error}</p> : null}
    </li>
  );
}

/** Kaju's answer to one turn: its words, sources, prepared changes with Confirm, and suggestions. Also used by the field home. */
export function Reply({ t, signedIn, onClose, onFill }: { t: Turn; signedIn: boolean; onClose: () => void; onFill: (text: string) => void }) {
  const k = useKaju();
  const [saved, setSaved] = useState<Record<string, Saved>>({});
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [said, setSaid] = useState("");
  const path = k.page.path || "/home";
  if (t.pending) return <p className="ak-wait" role="status"><Loader2 size={14} className="nx-spin" aria-hidden />{t.progress?.length ? t.progress[t.progress.length - 1] : "Reading what you can see…"}<button type="button" className="ak-link" onClick={k.stop}>Stop waiting</button></p>;
  if (t.error) return <div className="ak-fail" role="alert"><p>{t.error}</p>{t.kind === "expired" ? <Link className="ak-btn is-quiet" href={`/sign-in?next=${encodeURIComponent(path)}`}>Sign in</Link> : <button type="button" className="ak-btn is-quiet" onClick={() => k.retry(t.id)}>Try again</button>}</div>;
  const r = t.reply; if (!r) return null;
  const preps = ((r.proposals ?? []) as unknown as Prep[]).filter((p) => p && typeof p.id === "string" && typeof p.kind === "string" && !gone.has(p.id));
  const cites = r.citations ?? [];
  const long = r.text.length > 480;
  const save = async (p: Prep) => {
    /* The record actions' module loads only when a person confirms something. */
    const { kajuConfirm } = await import("./data/ngo");
    const res = await kajuConfirm(p as unknown as Proposal);
    /* A task lands in this home's own task list, whatever place the person works in; "Open" goes there. */
    const here = p.kind === "add_task" && document.getElementById("t-tasks") ? "#t-tasks" : null;
    const s: Saved = res.data ? { ok: true, what: res.data.what, href: here ?? (res.data.href ? appHref(res.data.href) : null) } : { ok: false, error: res.error ?? "Not saved." };
    setSaved((m) => ({ ...m, [p.id]: s }));
    if (s.ok) window.dispatchEvent(new CustomEvent(KAJU_SAVED, { detail: { kind: p.kind } }));
  };
  return (
    <div className="ak-ans">
      <div className="ak-text"><Rich text={long ? `${r.text.slice(0, 460).replace(/\s+\S*$/, "")}…` : r.text} /></div>
      {cites.length ? <div className="ak-cites" aria-label="Records Kaju read">{cites.slice(0, 4).map((c) => <Link key={c.id + c.href} href={appHref(c.href)} className="ak-cite" title={c.label}><ArrowUpRight size={14} aria-hidden />{shortRef(c.label)}</Link>)}{cites.length > 4 ? <Link href="/kaju" className="ak-cite is-more">{cites.length - 4} more in Kaju</Link> : null}</div> : null}
      {preps.length ? <ul className="ak-preps" aria-label="What Kaju prepared">{preps.map((p) => <PrepCard key={p.id} p={p} signedIn={signedIn} path={path} saved={saved[p.id]} onSave={() => save(p)} onDismiss={() => { setGone((g) => new Set(g).add(p.id)); setSaid(`Dismissed: ${kindWord(p.kind)}. Nothing was saved.`); }} />)}</ul> : null}
      {r.navigate ? <p><Link className="ak-btn is-quiet" href={appHref(r.navigate.href)}>{r.navigate.label}<ArrowUpRight size={14} aria-hidden /></Link></p> : null}
      {r.suggestions?.length ? <div className="ak-sugg" role="group" aria-label="Ask next (fills the box)">{r.suggestions.slice(0, 3).map((s) => <button key={s} type="button" className="ak-chip" onClick={() => onFill(s)}>{s}</button>)}</div> : null}
      {long || r.blocks?.length ? <p className="ak-more">{r.blocks?.length ? "Kaju also drew figures for this answer." : "The answer continues."} <Link href="/kaju" className="ak-link">Read it in Kaju</Link></p> : null}
      <p className="ak-said" role="status">{said}</p>
      <div className="ak-foot"><span>{r.engine === "model" ? "Answered with a model, from records you can see" : "Answered by fixed rules, from records you can see"}{r.notice ? ` · ${r.notice}` : ""}</span><button type="button" className="ak-link" onClick={onClose}>Close</button></div>
    </div>
  );
}

/** The @Kaju box. `role` picks the example phrasing; `note` is a line for the place (for example, healthcare's). */
export function AtKaju({ role, note }: { role: KajuRole; note?: ReactNode }) {
  const k = useKaju();
  const live = useLive();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [asked, setAsked] = useState<{ text: string; from: number } | null>(null);
  const out = useRef<HTMLDivElement>(null);
  /* On a phone the box is narrower, so its hint is shorter. */
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { const m = window.matchMedia("(max-width: 640px)"); const on = () => setNarrow(m.matches); on(); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);
  const put = (t: string) => { setText(t); requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(t.length, t.length); }); };
  useEffect(() => {
    const on = (e: Event) => { const t = (e as CustomEvent<{ text?: string }>).detail?.text; if (typeof t !== "string") return; setText(t); requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(t.length, t.length); input.current?.scrollIntoView({ block: "nearest" }); }); };
    window.addEventListener("nx:atkaju", on); return () => window.removeEventListener("nx:atkaju", on);
  }, []);
  /* The exchange this box started: its question and Kaju's turn straight after it (a retry moves both to the end). */
  let at = -1;
  if (asked) for (let i = k.turns.length - 1; i >= Math.max(0, asked.from - 2); i--) { const t = k.turns[i]; if (t.role === "user" && t.text === asked.text) { at = i; break; } }
  const turn = at >= 0 ? k.turns[at + 1] : undefined;
  /* The answer arrives under the box; when that is off screen (a phone, a long page), bring it into view. */
  const turnId = turn?.id;
  useEffect(() => {
    if (!turnId || !out.current) return;
    const r = out.current.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight - 96) out.current.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [turnId]);
  const send = () => {
    const q = text.trim(); if (!q || k.busy || k.expired) return;
    setAsked({ text: q, from: k.turns.length }); setText("");
    void k.ask(q);
  };
  const chips = KAJU_CHIPS[role];
  const hint = `${id}-hint`;
  const path = k.page.path || "/home";
  return (
    <section className={`ak ${turn ? "has-reply" : ""}`} aria-label="@Kaju">
      <form className="ak-bar" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="ak-field">
          <span className="ak-at" aria-hidden><KajuFace size={20} /><b>@Kaju</b></span>
          <input ref={input} className="ak-in" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} enterKeyHint="send" autoComplete="off"
            placeholder={narrow ? "Add a task, record, or ask" : "Add a task, record something, or ask"} aria-label="@Kaju: add a task, record something, or ask" aria-describedby={hint}
            onKeyDown={(e) => { if (e.key === "Escape") { if (text) { e.stopPropagation(); setText(""); } else if (asked) { e.stopPropagation(); setAsked(null); } } }} disabled={k.expired} />
        </div>
        <button type="submit" className="ak-go" aria-label="Ask" disabled={!text.trim() || k.busy || k.expired}>{k.busy && turn?.pending ? <Loader2 size={16} className="nx-spin" aria-hidden /> : <ArrowUp size={20} strokeWidth={2.4} className="ak-go-i" aria-hidden />}<span className="ak-go-t">Ask</span></button>
      </form>
      <div className="ak-under">
        <div className="ak-chips" role="group" aria-label="Examples (fill the box)">{chips.map((c) => <button key={c.label} type="button" className="ak-chip" onClick={() => put(c.fill ?? c.label)}>{c.label}</button>)}
          {/* On a phone the way to the full Kaju page ends the strip, so it takes no line of its own. */}
          <Link href={text.trim() ? `/kaju?q=${encodeURIComponent(text.trim())}` : "/kaju"} className="ak-chip is-open">Open in Kaju<ArrowRight size={14} aria-hidden /></Link></div>
        <Link href={text.trim() ? `/kaju?q=${encodeURIComponent(text.trim())}` : "/kaju"} className="ak-open">Open in Kaju<ArrowRight size={14} aria-hidden /></Link>
      </div>
      <p className={`ak-note ${k.expired ? "is-expired" : ""}`} id={hint}>{k.expired ? <>Your session has ended. <Link href={`/sign-in?next=${encodeURIComponent(path)}`}>Sign in again</Link> to use Kaju.</> : <>{note ? <>{note} </> : null}Nothing is sent until you press Ask, and nothing is saved until you confirm.</>}</p>
      {/* On a phone the same promise is one quiet line that opens to the whole note. */}
      {k.expired ? null : <details className="ak-why"><summary><Info size={14} aria-hidden />Nothing is sent or saved until you say so</summary><p>{note ? <>{note} </> : null}Nothing is sent until you press Ask, and nothing is saved until you confirm.</p></details>}
      <div className="ak-out" ref={out} aria-live="polite">
        {turn ? <div className="ak-reply"><span className="ak-q"><b>You asked</b> {asked?.text}<button type="button" className="ak-x" aria-label="Close Kaju's answer" onClick={() => setAsked(null)}><X size={16} aria-hidden /></button></span><Reply key={turn.id} t={turn} signedIn={live.signedIn} onClose={() => setAsked(null)} onFill={put} /></div> : null}
      </div>
    </section>
  );
}
