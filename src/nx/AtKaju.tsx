"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Check as Tick, Loader2, X } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import type { Proposal } from "@/sp3/ai/types";
import { appHref, useKaju, type Turn } from "./kaju/state";
import { useLive } from "./live";
import "./css/atkaju.css";

/* @Kaju on every home: one line near the top where a person adds a task, records something or asks a question, in
   their own words. It is the same conversation as the Kaju page and the compact panel (kaju/state.tsx), so "Open in
   Kaju" carries on where the home left off. Nothing is sent until the person presses Enter or Ask; a chip only fills
   the box. Nothing is saved until they press Confirm on what Kaju prepared, and Confirm runs the same audited action
   the record screens use (/api/ai/act, through kajuConfirm). */

export type KajuChip = { label: string; fill?: string };
const task = (example?: string): KajuChip => (example ? { label: `Add a task: ${example}` } : { label: "Add a task: …", fill: "Add a task: " });

/** Example phrasing for each kind of home. A chip ending in "…" fills the start of the sentence for the person to finish. */
export const KAJU_CHIPS = {
  ngo: [task("call the vet tomorrow"), { label: "What's overdue?" }, { label: "Record a brown female limping near Ward 12" }],
  office: [{ label: "Packages waiting for review" }, { label: "Which operator has waited longest?" }, task()],
  programme: [{ label: "Areas below the target" }, { label: "Urgent alerts this week" }, task()],
  clinic: [{ label: "PEP doses due today" }, { label: "Who missed a dose?" }, { label: "Register a bite: …", fill: "Register a bite: " }, task()],
  lab: [{ label: "Samples waiting longest" }, { label: "Results released this week" }, task()],
  vet: [{ label: "Procedures waiting for my sign-off" }, { label: "Appointments today" }, task()],
  research: [{ label: "Exposures by area, last 12 weeks" }, task()],
} satisfies Record<string, KajuChip[]>;
export type KajuRole = keyof typeof KAJU_CHIPS;

/** Put words in the @Kaju box on this page (not sent), for example from a row in "Needs attention". */
export const prefillKaju = (text: string) => window.dispatchEvent(new CustomEvent("nx:atkaju", { detail: { text } }));
/** Told when something Kaju prepared was saved from the home, so the page can read its lists again. */
export const KAJU_SAVED = "nx:atkaju-saved";

/* What Kaju prepared, read loosely: kinds added on the server later (add_task, a bite registration) still show. */
type Prep = { id: string; kind: string; why?: string } & Record<string, unknown>;
const OUTSIDE = new Set(["email", "calendar_event", "chat_post", "sms", "report_file"]);
const WORD: Record<string, string> = { open_case: "Open a case", add_note: "Add a note", schedule_followup: "Schedule a follow-up", record_care: "Record care", add_task: "Add a task" };
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (iso: string | null) => { if (!iso) return null; const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); };
function prepLine(p: Prep): string {
  const bits = (xs: (string | null)[]) => xs.filter(Boolean).join(" · ");
  switch (p.kind) {
    case "add_task": return bits([str(p.title), str(p.dueOn) ? `due ${day(str(p.dueOn))}` : null, str(p.assigneeName), str(p.caseLabel)]);
    case "open_case": return bits([str(p.title), [str(p.category), str(p.severity)].filter(Boolean).join(", ") || null, str(p.zone)]);
    case "add_note": return bits([str(p.caseLabel), str(p.note)]);
    case "schedule_followup": return bits([str(p.caseLabel), str(p.dueAt) ? `on ${day(str(p.dueAt))}` : null, str(p.note)]);
    case "record_care": return bits([str(p.dogLabel), str(p.careKind), str(p.date)]);
    default: return bits([str(p.title), str(p.summary), str(p.label), str(p.note)]) || "Open it in Kaju to see the details.";
  }
}
const kindWord = (k: string) => WORD[k] ?? k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** **bold** in Kaju's answers, as bold; everything else as plain text. */
function Rich({ text }: { text: string }) {
  return <>{text.split("\n").filter((l) => l.trim()).map((l, i) => <p key={i}>{l.split(/(\*\*[^*]+\*\*)/g).map((s, j) => (s.startsWith("**") && s.endsWith("**") ? <b key={j}>{s.slice(2, -2)}</b> : s))}</p>)}</>;
}

type Saved = { ok: true; what: string; href: string | null } | { ok: false; error: string };

function PrepCard({ p, signedIn, saved, onSave, onDismiss }: { p: Prep; signedIn: boolean; saved?: Saved; onSave: () => Promise<void>; onDismiss: () => void }) {
  const [busy, setBusy] = useState(false);
  const outside = OUTSIDE.has(p.kind);
  return (
    <li className="ak-prep">
      <div className="ak-prep-h"><b>{kindWord(p.kind)}</b><span>{saved?.ok ? "Saved" : "Prepared, not saved"}</span></div>
      <p className="ak-prep-l">{prepLine(p)}</p>
      {str(p.why) ? <p className="ak-prep-w">{str(p.why)}</p> : null}
      <div className="ak-prep-f">
        {saved?.ok ? <span className="ak-ok" role="status"><Tick size={14} strokeWidth={3} aria-hidden />{saved.what}{saved.href ? <> · <Link href={saved.href}>Open</Link></> : null}</span>
          : outside ? <Link className="ak-btn is-quiet" href="/kaju">Review in Kaju<ArrowRight size={14} aria-hidden /></Link>
          : !signedIn ? <Link className="ak-btn is-quiet" href="/sign-in?next=/home">Sign in to confirm</Link>
          : <><button type="button" className="ak-btn" disabled={busy} onClick={async () => { setBusy(true); await onSave(); setBusy(false); }}>{busy ? <Loader2 size={14} className="nx-spin" aria-hidden /> : null}Confirm</button>
            <button type="button" className="ak-btn is-quiet" disabled={busy} onClick={onDismiss}>Dismiss</button></>}
      </div>
      {saved && !saved.ok ? <p className="ak-err" role="alert">{saved.error}</p> : null}
    </li>
  );
}

function Reply({ t, signedIn, onClose }: { t: Turn; signedIn: boolean; onClose: () => void }) {
  const k = useKaju();
  const [saved, setSaved] = useState<Record<string, Saved>>({});
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [said, setSaid] = useState("");
  if (t.pending) return <p className="ak-wait" role="status"><Loader2 size={14} className="nx-spin" aria-hidden />{t.progress?.length ? t.progress[t.progress.length - 1] : "Reading what you can see…"}<button type="button" className="ak-link" onClick={k.stop}>Stop waiting</button></p>;
  if (t.error) return <div className="ak-fail" role="alert"><p>{t.error}</p>{t.kind === "expired" ? <Link className="ak-btn is-quiet" href={`/sign-in?next=${encodeURIComponent(k.page.path || "/home")}`}>Sign in</Link> : <button type="button" className="ak-btn is-quiet" onClick={() => k.retry(t.id)}>Try again</button>}</div>;
  const r = t.reply; if (!r) return null;
  const preps = ((r.proposals ?? []) as unknown as Prep[]).filter((p) => !gone.has(p.id));
  const cites = r.citations ?? [];
  const long = r.text.length > 480;
  const save = async (p: Prep) => {
    /* The record actions' module loads only when a person confirms something. */
    const { kajuConfirm } = await import("./data/ngo");
    const res = await kajuConfirm(p as unknown as Proposal);
    const s: Saved = res.data ? { ok: true, what: res.data.what, href: res.data.href ? appHref(res.data.href) : null } : { ok: false, error: res.error ?? "Not saved." };
    setSaved((m) => ({ ...m, [p.id]: s }));
    if (s.ok) window.dispatchEvent(new CustomEvent(KAJU_SAVED, { detail: { kind: p.kind } }));
  };
  return (
    <div className="ak-ans">
      <div className="ak-text"><Rich text={long ? `${r.text.slice(0, 460).replace(/\s+\S*$/, "")}…` : r.text} /></div>
      {cites.length ? <div className="ak-cites" aria-label="Records Kaju read">{cites.slice(0, 4).map((c) => <Link key={c.id + c.href} href={appHref(c.href)} className="ak-cite"><ArrowUpRight size={12} aria-hidden />{c.label}</Link>)}{cites.length > 4 ? <Link href="/kaju" className="ak-cite is-more">{cites.length - 4} more in Kaju</Link> : null}</div> : null}
      {preps.length ? <ul className="ak-preps" aria-label="What Kaju prepared">{preps.map((p) => <PrepCard key={p.id} p={p} signedIn={signedIn} saved={saved[p.id]} onSave={() => save(p)} onDismiss={() => { setGone((g) => new Set(g).add(p.id)); setSaid(`Dismissed: ${kindWord(p.kind)}. Nothing was saved.`); }} />)}</ul> : null}
      {r.navigate ? <p><Link className="ak-btn is-quiet" href={appHref(r.navigate.href)}>{r.navigate.label}<ArrowUpRight size={14} aria-hidden /></Link></p> : null}
      {long || r.blocks?.length ? <p className="ak-more">{r.blocks?.length ? "Kaju also drew figures for this answer." : "The answer continues."} <Link href="/kaju" className="ak-link">Read it in Kaju</Link></p> : null}
      <p className="ak-said" role="status">{said}</p>
      <div className="ak-foot"><span>{r.engine === "model" ? "Answered with a model, from records you can see" : "Answered by fixed rules, from records you can see"}</span><button type="button" className="ak-link" onClick={onClose}>Close</button></div>
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
  useEffect(() => {
    const on = (e: Event) => { const t = (e as CustomEvent<{ text?: string }>).detail?.text; if (typeof t !== "string") return; setText(t); requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(t.length, t.length); }); };
    window.addEventListener("nx:atkaju", on); return () => window.removeEventListener("nx:atkaju", on);
  }, []);
  /* The exchange this box started: its question and Kaju's turn straight after it (a retry moves both to the end). */
  let at = -1;
  if (asked) for (let i = k.turns.length - 1; i >= Math.max(0, asked.from - 2); i--) { const t = k.turns[i]; if (t.role === "user" && t.text === asked.text) { at = i; break; } }
  const turn = at >= 0 ? k.turns[at + 1] : undefined;
  /* On a phone the line stays at the top while the answer arrives where the box sits; bring the answer into view. */
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
  const fill = (c: KajuChip) => { const t = c.fill ?? c.label; setText(t); requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(t.length, t.length); }); };
  const chips = KAJU_CHIPS[role];
  const hint = `${id}-hint`;
  return (
    <section className={`ak ${turn ? "has-reply" : ""}`} aria-label="@Kaju">
      <form className="ak-bar" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="ak-field">
          <span className="ak-at" aria-hidden><KajuFace size={20} /><b>@Kaju</b></span>
          <input ref={input} className="ak-in" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} enterKeyHint="send" autoComplete="off"
            placeholder={narrow ? "Add a task, record, or ask" : "Add a task, record something, or ask"} aria-label="@Kaju: add a task, record something, or ask" aria-describedby={hint}
            onKeyDown={(e) => { if (e.key === "Escape") { if (text) { e.stopPropagation(); setText(""); } else if (asked) { e.stopPropagation(); setAsked(null); } } }} disabled={k.expired} />
        </div>
        <button type="submit" className="ak-go" disabled={!text.trim() || k.busy || k.expired}>{k.busy && turn?.pending ? <Loader2 size={16} className="nx-spin" aria-hidden /> : null}Ask</button>
      </form>
      <div className="ak-under">
        <div className="ak-chips" role="group" aria-label="Examples">{chips.map((c) => <button key={c.label} type="button" className="ak-chip" onClick={() => fill(c)}>{c.label}</button>)}</div>
        <Link href={text.trim() ? `/kaju?q=${encodeURIComponent(text.trim())}` : "/kaju"} className="ak-open">Open in Kaju<ArrowRight size={14} aria-hidden /></Link>
      </div>
      <p className="ak-note" id={hint}>{k.expired ? <>Your session has ended. <Link href="/sign-in?next=/home">Sign in again</Link> to use Kaju.</> : <>{note ? <>{note} </> : null}Nothing is sent until you press Ask, and nothing is saved until you confirm.</>}</p>
      <div className="ak-out" ref={out} aria-live="polite">
        {turn ? <div className="ak-reply"><span className="ak-q"><b>You asked</b> {asked?.text}<button type="button" className="ak-x" aria-label="Close Kaju's answer" onClick={() => setAsked(null)}><X size={14} aria-hidden /></button></span><Reply key={turn.id} t={turn} signedIn={live.signedIn} onClose={() => setAsked(null)} /></div> : null}
      </div>
    </section>
  );
}
