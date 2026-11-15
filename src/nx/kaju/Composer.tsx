"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, CornerDownLeft, Loader2, Sparkles, X } from "lucide-react";
import type { Intent } from "@/lib/kaju/registry";
import { readSentence, toIntent, type Kind, type Span, type Vocab } from "./intent";

/* The composer understands the sentence while it is typed, shows what it understood with a quiet underline, lets the
   person correct any part, and sends one structured request only when they press Run. Nothing is sent or read while
   typing. With understanding turned off it is a plain box. */

const KIND_WORD: Record<Kind, string> = { Place: "Place", Person: "Person", Team: "Team", Channel: "Channel", When: "When", Date: "Date", Email: "Email" };

export function Composer({ vocab, busy, onAsk, onPlan, compact, autoFocus, placeholder, predictive = true, initial = "", canPlan = true }: {
  vocab: Vocab; busy?: boolean; onAsk: (text: string) => void; onPlan: (text: string, intent: Intent) => void; compact?: boolean; autoFocus?: boolean; placeholder?: string; predictive?: boolean; initial?: string; canPlan?: boolean;
}) {
  const [text, setText] = useState(initial);
  const [choices, setChoices] = useState<Partial<Record<Kind, string>>>({});
  const [ignored, setIgnored] = useState<Set<Kind>>(new Set());
  const [menu, setMenu] = useState<Kind | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const calm = useReducedMotion();
  useEffect(() => { if (initial) setText(initial); }, [initial]);
  useEffect(() => { const on = (e: Event) => { const q = (e as CustomEvent<{ q?: string }>).detail?.q; if (q) { setText(q.slice(0, 2000)); box.current?.focus(); } }; window.addEventListener("sp:kaju-ask", on); return () => window.removeEventListener("sp:kaju-ask", on); }, []);
  const reading = useMemo(() => {
    if (!predictive) return { spans: [] as Span[], action: text.trim() ? "ask" as const : null, preview: "", missing: [] as string[] };
    const r = readSentence(text, vocab, choices);
    const spans = r.spans.filter((s) => !ignored.has(s.kind));
    return { ...r, spans, missing: spans.some((s) => s.ambiguous) ? r.missing : r.missing.filter((m) => !/^Which /.test(m)) };
  }, [text, vocab, choices, ignored, predictive]);
  const intent = useMemo(() => (canPlan ? toIntent(text, reading) : null), [text, reading, canPlan]);
  const isTask = !!reading.action && reading.action !== "ask" && canPlan;
  const submit = () => {
    const t = text.trim(); if (!t || busy) return;
    if (isTask) { if (!intent) { box.current?.focus(); return; } onPlan(t, intent); }
    else onAsk(t);
    setText(""); setChoices({}); setIgnored(new Set()); setMenu(null);
  };
  /* Caret inside an understood word opens its menu, so a tap on the underline corrects it. */
  const caret = () => { const at = box.current?.selectionStart ?? -1; const s = reading.spans.find((x) => at >= x.start && at <= x.end); setMenu(s ? s.kind : null); };
  const marked = useMemo(() => { const parts: React.ReactNode[] = []; let at = 0; reading.spans.forEach((s, i) => { if (s.start < at) return; parts.push(text.slice(at, s.start), <u key={i} className={s.ambiguous ? "is-amb" : undefined}>{text.slice(s.start, s.end)}</u>); at = s.end; }); parts.push(text.slice(at)); return parts; }, [text, reading.spans]);
  const open = menu ? reading.spans.find((s) => s.kind === menu) ?? null : null;
  const status = !text.trim() ? (predictive ? "Kaju reads as you type. Nothing is sent until you press Run." : "Type a question or a request.")
    : reading.missing.length ? reading.missing[0] : reading.preview;

  return (
    <form className={`nx-ask nx-composer ${compact ? "is-compact" : ""}`} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="nx-ask-in">
        <div aria-hidden>{marked}{"\n"}</div>
        <textarea ref={box} rows={compact ? 1 : 2} value={text} autoFocus={autoFocus} maxLength={2000}
          onChange={(e) => setText(e.target.value)} onClick={caret} onKeyUp={(e) => { if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") caret(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
            else if (e.key === "Escape" && menu) { e.stopPropagation(); setMenu(null); }
            else if (e.key === "ArrowDown" && e.altKey) { e.preventDefault(); caret(); }
          }}
          placeholder={placeholder ?? "Ask, or hand over work: “Prepare next week's follow-ups for Ward 12 and tell #field-ops”"} aria-label="Ask Kaju" aria-describedby="kj-status" />
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div className="nx-kmenu" role="listbox" aria-label={`${KIND_WORD[open.kind]}: choose`} initial={calm ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .12 }}>
            <small>{KIND_WORD[open.kind]}{open.ambiguous ? " · more than one match, choose one" : ""}</small>
            {open.options.slice(0, 8).map((o, i) => <button key={o.value} type="button" role="option" aria-selected={i === 0 && !open.ambiguous} className={i === 0 && !open.ambiguous ? "is-on" : ""} onClick={() => { setChoices((c) => ({ ...c, [open.kind]: o.value })); setMenu(null); box.current?.focus(); }}>{o.label}</button>)}
            <button type="button" className="is-quiet" onClick={() => { setIgnored((s) => new Set(s).add(open.kind)); setMenu(null); box.current?.focus(); }}><X size={12} />Leave “{open.text}” as words</button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="nx-ask-f">
        <Sparkles size={13} />
        <span id="kj-status" className={reading.missing.length ? "is-missing" : undefined} aria-live="polite">{status}</span>
        {reading.spans.length && !compact ? <span className="nx-kread" aria-label="What Kaju understood">
          {reading.spans.map((s) => <button key={s.kind} type="button" className={`nx-span ${s.ambiguous ? "is-amb" : ""}`} onClick={() => setMenu(menu === s.kind ? null : s.kind)} aria-expanded={menu === s.kind} aria-label={`${KIND_WORD[s.kind]}: ${s.options[0]?.label ?? s.text}. Change`}><small>{KIND_WORD[s.kind]}</small>{s.ambiguous ? `${s.text}?` : s.options[0]?.label ?? s.text}<ChevronDown size={11} /></button>)}
        </span> : null}
        <button type="submit" className="nx-btn is-sm" disabled={!text.trim() || !!busy || (isTask && !intent)}>{busy ? <Loader2 size={12} className="nx-spin" /> : null}{isTask ? "Plan" : "Ask"}<CornerDownLeft size={12} /></button>
      </div>
    </form>
  );
}
