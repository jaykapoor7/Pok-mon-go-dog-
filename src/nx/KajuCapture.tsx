"use client";

/* Tell Kaju what happened: the one way to record across the NGO and healthcare workspaces. One box takes the words
   (typed, pasted, or dictated with the phone keyboard's microphone); nothing leaves the page until Send. Kaju reads them
   with the person's own access and the page's context, and answers with prepared records, each a short preview with
   three verbs: Confirm saves it through the same audited server functions as the manual screens, Change opens the
   manual fields filled with what Kaju understood, Dismiss sets it aside. When Kaju prepares nothing, the box says so
   plainly and offers the manual form with the person's words carried over (sorted into its fields by the page).

   SayIt is the same idea for field mode, offline: a line read on the phone that fills the form's choices. */

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, ClipboardPaste, Loader2, Send, X } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import type { AiReply, Proposal } from "@/sp3/ai/types";
import { Chip } from "./ui";
import { errText, toast, words } from "./kit";
import { kajuConfirm, kajuRead, nextHref, shortCode } from "./data/ngo";
import { CARE_WORD, CONFIRMABLE, dayWords, exposureOf, kajuCapture, readAsRecord, type CaptureContext } from "./data/capture";
import "./css/capture.css";

export type ByHand = { label: string; go: () => void };
type Item = { p: Proposal; state: "open" | "saving" | "saved" | "set-aside" | "changed"; saved?: { what: string; href: string | null }; error?: string; errorHref?: string | null };

export function KajuCapture({
  context, via = "say", label = "Tell Kaju what happened", hint, placeholder, sendLabel = "Send", compact, sample, paste,
  byHand, reading, onChange, changes, onSaved, idBase, initial, kinds,
}: {
  context: CaptureContext;
  /** "whatsapp": a pasted message, read the way the inbox always has (kajuRead). */
  via?: "say" | "whatsapp";
  label?: string;
  hint?: ReactNode;
  placeholder?: string;
  sendLabel?: string;
  /** One line that grows as it is used: for the top of a record. */
  compact?: boolean;
  /** Sample data: Send opens the live demo instead. */
  sample?: boolean;
  /** A Paste button for a message copied from another app. */
  paste?: boolean;
  /** The manual form this text should open when Kaju prepares nothing (the page sorts the words into its fields). */
  byHand: (text: string) => ByHand[];
  /** What the words themselves say, read on this page, shown when Kaju prepared nothing. */
  reading?: (text: string) => string[];
  /** Change: the page opens its manual fields filled with what Kaju understood (and the words that were sent). */
  onChange?: (p: Proposal, said: string) => void;
  /** The prepared kinds Change can open here. */
  changes?: string[];
  onSaved?: (p: Proposal) => void;
  idBase?: string;
  /** Words handed over from another page, waiting in the box. They are not sent until the person presses Send. */
  initial?: string;
  /** The prepared kinds this page keeps (a bite register keeps bite entries, never cases). Others are not offered. */
  kinds?: string[];
}) {
  const auto = useId();
  const id = idBase ?? `kc${auto.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [text, setText] = useState(initial ?? "");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<AiReply | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const asking = useRef(0);

  /* Words handed over after the page opened wait in the box too, still unsent. */
  useEffect(() => { if (initial) setText(initial); }, [initial]);
  /* The box grows with what is written, up to about ten lines, then scrolls. */
  useEffect(() => { const el = box.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight + 2, 264)}px`; }, [text]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy || sample) return;
    const n = ++asking.current;
    setBusy(true); setFailed(null); setReply(null); setItems([]); setNote(null); setSent(t);
    const r = via === "whatsapp" ? await kajuRead(t.slice(0, 4000)) : await kajuCapture(t, context);
    if (n !== asking.current) return;
    setBusy(false);
    if (r.error || !r.data) { setFailed(errText(r.error ?? "Kaju could not read it. Nothing was saved.")); return; }
    const kept = kinds ? r.data.proposals.filter((p) => kinds.includes(p.kind)) : r.data.proposals;
    setReply({ ...r.data, proposals: kept });
    setItems(kept.map((p) => ({ p, state: "open" as const })));
  };
  const clear = () => { asking.current++; setText(""); setSent(null); setReply(null); setFailed(null); setItems([]); setNote(null); setBusy(false); box.current?.focus(); };
  const fromClipboard = async () => { try { const t = await navigator.clipboard.readText(); if (t.trim()) { setText(t.slice(0, 4000)); setNote(null); } else setNote("Nothing is copied yet. Copy the message first."); } catch { setNote("Press and hold in the box and choose Paste."); } };
  const patch = (i: number, x: Partial<Item>) => setItems((all) => all.map((it, k) => (k === i ? { ...it, ...x } : it)));

  const confirm = async (i: number) => {
    const it = items[i]; if (!it || it.state === "saving") return;
    patch(i, { state: "saving", error: undefined });
    const r = await kajuConfirm(it.p);
    if (r.error || !r.data) {
      /* A kind the server does not save yet (a bite record before the register accepts Kaju's entries) is refused
         before anything is written: say so in plain words and point to the form. */
      const notYet = /supported proposal|organisation workspace is required/i.test(r.error ?? "");
      const canChange = !!onChange && (changes ?? []).includes(it.p.kind);
      const e = notYet ? `Kaju cannot save ${(it.p.kind as string) === "register_exposure" ? "bite records" : "this kind of record"} here yet. Nothing was saved.${canChange ? " Press Change to save it from the form." : ""}` : errText(r.error ?? "The save could not be verified yet.");
      /* A refusal can point at the record that already holds this (a bite recorded earlier today): link to it. */
      patch(i, { state: "open", error: e, errorHref: r.href ?? null }); toast({ text: e, tone: "bad", href: r.href ?? undefined, hrefLabel: r.href ? "Open it" : undefined }); return;
    }
    const saved = { what: r.data.what, href: nextHref(r.data.href) };
    patch(i, { state: "saved", saved });
    toast({ text: "Saved. The audit record was checked.", tone: "ok", href: saved.href ?? undefined, hrefLabel: "Open it" });
    onSaved?.(it.p);
  };

  const open = items.filter((x) => x.state === "open" || x.state === "saving").length;
  const settled = !!reply && items.length > 0 && open === 0;
  const anySaved = items.some((x) => x.state === "saved");
  const anyToConfirm = items.some((x) => (x.state === "open" || x.state === "saving") && CONFIRMABLE.has(x.p.kind));
  const allAside = settled && items.every((x) => x.state === "set-aside");
  const said = sent ?? text.trim();
  const hand = said ? byHand(said) : [];
  const read = said && reading ? reading(said) : [];
  const hintId = `${id}-hint`;

  return (
    <section className={`kc ${compact ? "is-compact" : ""}`}>
      <label className="kc-label" htmlFor={`${id}-in`}><KajuFace size={24} className="kc-face" /><span>{label}</span></label>
      <div className="kc-row">
        <textarea id={`${id}-in`} ref={box} className="kc-in" value={text} rows={compact ? 1 : 3} maxLength={via === "whatsapp" ? 4000 : 6000} placeholder={placeholder} enterKeyHint="send" aria-describedby={hintId}
          onChange={(e) => { setText(e.target.value); setNote(null); }}
          onKeyDown={(e) => {
            /* One line (compact): Enter sends, Shift and Enter starts a new line. A message box: Enter is a new line, and
               Ctrl or Command with Enter sends, so a pasted or dictated message is never sent half-written. */
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            if (compact ? !e.shiftKey : e.ctrlKey || e.metaKey) { e.preventDefault(); void send(); }
          }} />
        <div className="kc-send">
          {paste ? <button type="button" className="nx-btn is-quiet" onClick={() => void fromClipboard()}><ClipboardPaste size={14} aria-hidden />Paste</button> : null}
          {sample ? <Link href="/try" title="Opens the live demo, where this works" className="nx-btn">{via === "whatsapp" ? null : <Send size={14} aria-hidden />}{sendLabel}</Link>
            : <button type="button" className="nx-btn" disabled={!text.trim() || busy} onClick={() => void send()}>{busy ? <Loader2 size={14} className="nx-spin" aria-hidden /> : <Send size={14} aria-hidden />}{busy ? "Reading…" : sendLabel}</button>}
        </div>
      </div>
      <p id={hintId} className="kc-hint">{hint ?? "Type, paste, or use your keyboard's microphone. Nothing is saved until you confirm."}</p>
      {note ? <p className="kc-hint" role="status">{note}</p> : null}

      <div className="kc-out" aria-live="polite">
        {busy ? <p className="kc-status" role="status"><Loader2 size={14} className="nx-spin" aria-hidden />Kaju is reading what you wrote…</p> : null}
        {failed ? <div className="kc-none" role="alert"><p><b>Kaju could not read it.</b> {failed}</p><Hand items={hand} /></div> : null}
        {reply && !items.length ? (
          <div className="kc-none">
            <p><b>Kaju has not prepared a record from this.</b>{readAsRecord(reply, context.workspace) ? <> {plain(reply.text)}</> : " It may need more detail, or it may be a kind of record Kaju cannot prepare yet."}</p>
            {read.length ? <p className="kc-read"><span>From what you wrote</span>{read.map((f) => <Chip key={f}>{f}</Chip>)}</p> : null}
            <Hand items={hand} />
          </div>
        ) : null}
        {items.length ? <>
          {reply?.text && readAsRecord(reply, context.workspace) ? <p className="kc-said">{plain(reply.text)}</p> : null}
          <ul className="kc-props" aria-label="What Kaju prepared">
            {items.map((it, i) => <Preview key={it.p.id} it={it} i={i} change={onChange && (changes ?? []).includes(it.p.kind) ? () => { patch(i, { state: "changed" }); onChange(it.p, sent ?? text.trim()); } : undefined}
              confirm={() => void confirm(i)} dismiss={() => patch(i, { state: "set-aside" })} />)}
          </ul>
          {anyToConfirm ? <p className="kc-hint">Confirm saves it under your name, marked as prepared with Kaju. Confirming twice never saves it twice.</p> : null}
          {allAside ? <Hand items={hand} /> : null}
        </> : null}
        {reply || failed ? <p className="kc-again">{settled && anySaved ? <span>Done here. </span> : null}<button type="button" className="kc-link" onClick={clear}>{settled ? "Tell Kaju something else" : "Clear and start again"}</button></p> : null}
      </div>
    </section>
  );
}

function Hand({ items }: { items: ByHand[] }) {
  if (!items.length) return null;
  return <div className="kc-acts">{items.map((h) => <button key={h.label} type="button" className="nx-btn is-quiet" onClick={h.go}>{h.label}<ArrowRight size={14} aria-hidden /></button>)}</div>;
}

/* Kaju's words as plain text: no markdown marks, and a full case code shortened the way the app shows it everywhere. */
const plain = (s: string) => s.replace(/\*\*/g, "").replace(/\b[A-Z]{2,5}(?:-[A-Z]{2,5})?-[0-9A-F]{12,}\b/gi, (c) => shortCode(c)).replace(/\s+/g, " ").trim();
const day = (iso: string | null | undefined) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? dayWords(iso.slice(0, 10)) : null);
const URGENCY: Record<string, string> = { critical: "Critical", high: "High", normal: "Normal", low: "Low" };
const WASH: Record<string, string> = { before_arrival: "Washed before arrival", at_facility: "Washed here", not_washed: "Not washed" };
const KIND_WORD: Record<string, string> = { bite: "Bite", scratch: "Scratch", lick_broken_skin: "Lick on broken skin", other: "Other contact" };

/** A prepared record in a few words: what it is, its title, and the facts that matter (urgency, place, animal, date). */
function shape(p: Proposal): { kind: string; title: string; facts: [string, ReactNode][]; body?: string } {
  switch (p.kind) {
    case "open_case": return { kind: "New case", title: p.title, body: p.description,
      facts: [["Urgency", <Chip key="u" tone={p.severity === "critical" ? "bad" : p.severity === "high" ? "warn" : "plain"}>{URGENCY[p.severity] ?? words(p.severity)}</Chip>], ["Kind", words(p.category)], ["Place", [p.zone, p.city].filter(Boolean).join(", ") || "Not given"], ["Animal", p.dogId ? "Linked to this animal" : "Not linked"]] };
    case "add_note": return { kind: "Note", title: `Note on ${shortCode(p.caseLabel)}`, body: p.note, facts: [] };
    case "schedule_followup": return { kind: "Follow-up", title: `Follow-up on ${shortCode(p.caseLabel)}`, body: p.note || undefined, facts: [["Due", day(p.dueAt) ?? "Not given"]] };
    case "record_care": return { kind: "Care", title: `${CARE_WORD[p.careKind] ?? words(p.careKind)} for ${p.dogLabel}`, body: p.notes, facts: [["Animal", p.dogLabel], ["Date", day(p.date) ?? "Not given"]] };
    case "add_task": return { kind: "Task", title: p.title, facts: ([["Due", day(p.dueOn) ?? "No date"], ["For", p.assigneeName ?? "Nobody named"], p.caseLabel ? ["Case", shortCode(p.caseLabel)] : null] as ([string, ReactNode] | null)[]).filter(Boolean) as [string, ReactNode][] };
    default: {
      if ((p as { kind: string }).kind === "register_exposure") {
        const x = exposureOf(p);
        return { kind: "Bite register", title: `${x.kind ? KIND_WORD[x.kind] : "Exposure"}${x.site ? ` on the ${x.site}` : ""}`, body: "why" in p && p.why ? p.why : undefined,
          facts: ([["Date", x.exposure_on ? `${day(x.exposure_on)}${x.time ? `, ${x.time}` : ""}` : "Not given"], ["Category", x.category ? `Category ${x.category}, as stated` : "Not stated"], x.ref ? ["Register", x.ref] : null, x.age || x.sex ? ["Patient", [x.age ? `age ${x.age.replace("-", " to ").replace("+", " and over")}` : null, x.sex].filter(Boolean).join(", ")] : null, x.washed ? ["Washing", WASH[x.washed]] : null, x.consent ? ["Calls", "Agreed to reminder calls"] : null] as ([string, ReactNode] | null)[]).filter(Boolean) as [string, ReactNode][] };
      }
      return { kind: words((p as { kind: string }).kind), title: "why" in p && p.why ? p.why : "Prepared by Kaju", facts: [] };
    }
  }
}

function Preview({ it, i, confirm, change, dismiss }: { it: Item; i: number; confirm: () => void; change?: () => void; dismiss: () => void }) {
  const s = shape(it.p);
  const record = CONFIRMABLE.has(it.p.kind);
  if (it.state === "set-aside") return <li className="kc-prop is-quiet" style={{ animationDelay: `${i * 48}ms` }}><p>{s.kind} set aside. Nothing was saved.</p></li>;
  if (it.state === "changed") return <li className="kc-prop is-quiet" style={{ animationDelay: `${i * 48}ms` }}><p>{s.kind}: the form below is filled with what Kaju understood. Nothing is saved until you save it there.</p></li>;
  const tid = `kc-t-${i}-${it.p.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)}`;
  return (
    <li className={`kc-prop ${it.state === "saved" ? "is-saved" : ""}`} style={{ animationDelay: `${i * 48}ms` }}>
      <div className="kc-prop-h" id={tid}><span className="kc-kind">{it.state === "saved" ? <><CheckCircle2 size={14} aria-hidden />Saved</> : s.kind}</span><b>{s.title}</b></div>
      {s.facts.length ? <dl className="kc-facts">{s.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl> : null}
      {s.body && s.body !== s.title ? <p className="kc-body">{s.body}</p> : null}
      {it.state === "saved" ? <p className="kc-done">{it.saved?.what ?? "Saved to the record"}.{it.saved?.href ? <> <Link className="kc-link" href={it.saved.href}>Open it</Link></> : null}</p>
        : record ? <div className="kc-acts">
          <button type="button" className="nx-btn" aria-describedby={tid} disabled={it.state === "saving"} onClick={confirm}>{it.state === "saving" ? <Loader2 size={14} className="nx-spin" aria-hidden /> : <CheckCircle2 size={14} aria-hidden />}{it.state === "saving" ? "Saving…" : "Confirm"}</button>
          {change ? <button type="button" className="nx-btn is-quiet" aria-describedby={tid} disabled={it.state === "saving"} onClick={change}>Change</button> : null}
          <button type="button" className="nx-btn is-quiet" aria-describedby={tid} disabled={it.state === "saving"} onClick={dismiss}><X size={14} aria-hidden />Dismiss</button>
        </div>
        : <p className="kc-hint">This acts outside StrayPaw. Open it in <Link className="kc-link" href="/kaju">Kaju</Link> to check and send it.</p>}
      {it.error ? <p className="kc-err" role="alert">{it.error}{it.errorHref ? <> <Link href={it.errorHref}>Open the existing record</Link></> : null}</p> : null}
    </li>
  );
}

/* ── Say it (field mode): read on the phone, nothing sent ─────────── */

export function SayIt({ onRead, placeholder }: { onRead: (text: string) => string[]; placeholder?: string }) {
  const id = useId();
  const [text, setText] = useState("");
  const [done, setDone] = useState<string[] | null>(null);
  const go = () => { const t = text.trim(); if (!t) return; setDone(onRead(t)); };
  return (
    <div className="kc-say">
      <div className="kc-say-l"><KajuFace size={24} className="kc-face" /><span><label htmlFor={`${id}-in`}><b>Say it</b></label><small id={`${id}-d`}>Optional. One line fills the choices below. It stays on this phone.</small></span></div>
      <div className="kc-say-r">
        <input id={`${id}-in`} aria-describedby={`${id}-d`} value={text} maxLength={500} placeholder={placeholder} autoComplete="off" enterKeyHint="done" onChange={(e) => { setText(e.target.value); setDone(null); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(); } }} />
        <button type="button" className="fm-btn" disabled={!text.trim()} onClick={go}>Fill in</button>
      </div>
      {done ? <p className="kc-say-o" role="status">{done.length ? <>Filled in: {done.join(" · ")}. Check each one.</> : "Nothing to fill in from that. Choose below."}</p> : null}
    </div>
  );
}
