"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, CornerDownLeft, Loader2, Mic, Sparkles, X } from "lucide-react";
import type { Intent } from "@/lib/kaju/registry";
import { readSentence, toIntent, type Kind, type Span, type Vocab } from "./intent";

/* The composer understands the sentence while it is typed, shows what it understood with a quiet underline, lets the
   person correct any part, and sends one structured request only when they press Run. Nothing is sent or read while
   typing. With understanding turned off it is a plain box. */

const KIND_WORD: Record<Kind, string> = { Place: "Place", Person: "Person", Team: "Team", Channel: "Channel", When: "When", Date: "Date", Email: "Email" };

/* A request for work in the person's own words (not a question, and not one of the jobs Kaju reads by fixed rules).
   With a model connected it goes to the planner; without one, Kaju says so plainly and points to its jobs. */
const QUESTION = /\?\s*$|^\s*(what|which|who|whom|whose|when|where|why|how|is|are|was|were|can|could|do|does|did|should|will|would|show|list|tell me|explain)\b/i;
const WORK = /^\s*(please\s+)?(prepare|plan|create|make|send|post|notify|remind|assign|schedule|draft|set up|organi[sz]e|arrange|follow up|coordinate|get|book|ask|email|write to|tell)\b/i;
export const looksLikeWork = (t: string) => WORK.test(t) && !QUESTION.test(t);
const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function Composer({ vocab, busy, onAsk, onPlan, compact, autoFocus, placeholder, predictive = true, initial = "", canPlan = true, disabled = false, modelPlanning = false, onVoice }: {
  vocab: Vocab; busy?: boolean; onAsk: (text: string) => void; onPlan: (text: string, intent: Intent | null) => void; compact?: boolean; disabled?: boolean; autoFocus?: boolean; placeholder?: string; predictive?: boolean; initial?: string; canPlan?: boolean;
  /** Free-form planning is live on this deployment (a model is connected). */
  modelPlanning?: boolean;
  /** Talk instead of typing. On a phone the microphone sits next to Send; wide screens keep it where it was. */
  onVoice?: () => void;
}) {
  const [text, setText] = useState(initial);
  const [choices, setChoices] = useState<Partial<Record<Kind, string>>>({});
  const [ignored, setIgnored] = useState<Set<Kind>>(new Set());
  const [menu, setMenu] = useState<Kind | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const calm = useReducedMotion();
  useEffect(() => { if (initial) setText(initial); }, [initial]);
  /* Words typed before the page finished loading (a slow phone) are already in the box: keep them, so Enter sends what
     the person sees rather than nothing. */
  const early = useRef(false);
  const sent = useRef(false);
  /* From here on the composer's own keys are live; the page stops holding Enter. */
  useIsoLayout(() => { (window as { __kjLive?: boolean }).__kjLive = true; }, []);
  useEffect(() => {
    /* Enter pressed before then was held by the page (EARLY_ENTER, app/(work)/kaju/page.tsx): send it now, once. */
    const w = window as { __kjEnter?: boolean };
    const pressed = !!w.__kjEnter; w.__kjEnter = false;
    const v = box.current?.value ?? ""; if (!v.trim() || sent.current) return;
    setText((cur) => cur || v.slice(0, 2000));
    if (pressed) early.current = true;
  }, []);
  useEffect(() => { const on = (e: Event) => { const q = (e as CustomEvent<{ q?: string }>).detail?.q; if (q) { setText(q.slice(0, 2000)); box.current?.focus(); } }; window.addEventListener("sp:kaju-ask", on); return () => window.removeEventListener("sp:kaju-ask", on); }, []);
  const reading = useMemo(() => {
    if (!predictive) return { spans: [] as Span[], action: text.trim() ? "ask" as const : null, preview: "", missing: [] as string[] };
    const r = readSentence(text, vocab, choices);
    const spans = r.spans.filter((s) => !ignored.has(s.kind));
    return { ...r, spans, missing: spans.some((s) => s.ambiguous) ? r.missing : r.missing.filter((m) => !/^Which /.test(m)) };
  }, [text, vocab, choices, ignored, predictive]);
  const intent = useMemo(() => (canPlan ? toIntent(text, reading) : null), [text, reading, canPlan]);
  const work = canPlan && reading.action === "ask" && looksLikeWork(text);
  const free = work && modelPlanning;
  /* One task ("add a task…", "remind Ravi to…") is prepared as a card to confirm, the same as @Kaju on the home screens,
     not planned as a mission. Several steps, follow-ups for a ward, posts and emails are still planned. */
  const single = reading.action === "create_task";
  const isTask = (!!reading.action && reading.action !== "ask" && !single && canPlan) || free;
  const submit = () => {
    const t = text.trim(); if (!t || busy) return;
    if (single) onAsk(t);
    else if (free) onPlan(t, null);
    else if (isTask) { if (!intent) { box.current?.focus(); return; } onPlan(t, intent); }
    else onAsk(t);
    sent.current = true; early.current = false; (window as { __kjEnter?: boolean }).__kjEnter = false;
    setText(""); setChoices({}); setIgnored(new Set()); setMenu(null);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (early.current && text.trim()) { early.current = false; submit(); } });
  /* Send what the box shows. If the box holds words the composer has not read yet (typed while the page was loading),
     read them first and send on the next render, so they are understood like any other words. */
  const go = (seen: string | undefined) => { const dom = seen ?? text; if (dom.trim() && dom !== text) { setText(dom.slice(0, 2000)); early.current = true; } else submit(); };
  /* Caret inside an understood word opens its menu, so a tap on the underline corrects it. */
  const caret = () => { const at = box.current?.selectionStart ?? -1; const s = reading.spans.find((x) => at >= x.start && at <= x.end); setMenu(s ? s.kind : null); };
  const marked = useMemo(() => { const parts: React.ReactNode[] = []; let at = 0; reading.spans.forEach((s, i) => { if (s.start < at) return; parts.push(text.slice(at, s.start), <u key={i} className={s.ambiguous ? "is-amb" : undefined}>{text.slice(s.start, s.end)}</u>); at = s.end; }); parts.push(text.slice(at)); return parts; }, [text, reading.spans]);
  const open = menu ? reading.spans.find((s) => s.kind === menu) ?? null : null;
  const status = !text.trim() ? (predictive ? "Kaju underlines what it recognises as you type. Nothing is sent until you press the button." : "Type a question or a request.")
    : free ? "Kaju will plan this with a model. You see every step, and who does it, before anything starts."
    : work ? "On this deployment Kaju plans from its fixed jobs: pick one below, or press Ask for an answer from your records."
    : reading.missing.length ? reading.missing[0] : reading.preview;

  return (
    <form className={`nx-ask nx-composer ${compact ? "is-compact" : ""}`} onSubmit={(e) => { e.preventDefault(); go(box.current?.value); }}>
      <div className="nx-ask-in">
        <div aria-hidden>{marked}{"\n"}</div>
        <textarea ref={box} rows={compact ? 1 : 2} value={text} autoFocus={autoFocus} maxLength={2000} disabled={disabled}
          onChange={(e) => setText(e.target.value)} onClick={caret} onKeyUp={(e) => { if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") caret(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); go(e.currentTarget.value); }
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
        <span id="kj-status" className={!text.trim() ? "is-idle" : reading.missing.length && !work ? "is-missing" : work && !free ? "is-note" : undefined} aria-live="polite">{status}</span>
        {reading.spans.length && !compact ? <span className="nx-kread" aria-label="What Kaju understood">
          {reading.spans.map((s) => <button key={s.kind} type="button" className={`nx-span ${s.ambiguous ? "is-amb" : ""}`} onClick={() => setMenu(menu === s.kind ? null : s.kind)} aria-expanded={menu === s.kind} aria-label={`${KIND_WORD[s.kind]}: ${s.options[0]?.label ?? s.text}. Change`}><small>{KIND_WORD[s.kind]}</small>{s.ambiguous ? `${s.text}?` : s.options[0]?.label ?? s.text}<ChevronDown size={11} /></button>)}
        </span> : null}
        {onVoice ? <button type="button" className="nx-ib kj-mic" aria-label="Talk to Kaju" onClick={onVoice}><Mic size={20} aria-hidden /></button> : null}
        <button type="submit" className="nx-btn is-sm kj-send" disabled={!text.trim() || !!busy || (isTask && !free && !intent)}>{busy ? <Loader2 size={12} className="nx-spin" /> : null}{isTask ? "Plan" : "Ask"}<CornerDownLeft size={12} /></button>
      </div>
    </form>
  );
}
