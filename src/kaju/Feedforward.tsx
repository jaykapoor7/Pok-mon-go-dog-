"use client";

/* The composer's feedforward layer: a line that says what Kaju understands, dotted underlines under the phrases that
   are decisions, and a popover of choices for each. It sits over a plain textarea (the person's text is never taken
   out of a real input), mirrors its type exactly, and opens a phrase when it is clicked or when the caret is in it
   and Alt+Down is pressed. Interpretation is local and debounced. */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { choose, interpret, type Slot } from "./feedforward";
import "./feedforward.css";

let cityList: Promise<string[]> | null = null;
const cities = () => (cityList ??= fetch("/api/livingmap?kind=cities").then((r) => (r.ok ? r.json() : { cities: [] })).then((j) => ((j.cities ?? []) as { city: string }[]).map((x) => x.city)).catch(() => { cityList = null; return []; }));

export function Feedforward({ text, onText, input }: { text: string; onText: (t: string) => void; input: RefObject<HTMLTextAreaElement | null> }) {
  const [read, setRead] = useState(text);
  const [places, setPlaces] = useState<string[]>([]);
  const mirror = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<{ slot: Slot; x: number; y: number } | null>(null);
  useEffect(() => { void cities().then(setPlaces); }, []);
  /* Read on a pause in typing, never on every keystroke. */
  useEffect(() => { const t = window.setTimeout(() => setRead(text), 220); return () => window.clearTimeout(t); }, [text]);
  const r = useMemo(() => interpret(read, places), [read, places]);
  const live = useMemo(() => (read === text ? r.slots : []), [read, text, r]);

  /* The mirror takes the textarea's own type and box, so an underline sits exactly under its word. */
  useLayoutEffect(() => {
    const el = input.current, m = mirror.current; if (!el || !m) return;
    const cs = getComputedStyle(el);
    for (const p of ["font", "letterSpacing", "lineHeight", "padding", "borderWidth", "boxSizing", "whiteSpace", "wordBreak", "overflowWrap", "textAlign"] as const) m.style[p] = cs[p];
    m.style.width = `${el.offsetWidth}px`; m.style.height = `${el.offsetHeight}px`;
    m.style.left = `${el.offsetLeft}px`; m.style.top = `${el.offsetTop}px`;
    const sync = () => { m.scrollTop = el.scrollTop; };
    el.addEventListener("scroll", sync); sync();
    return () => el.removeEventListener("scroll", sync);
  });

  const openSlot = (s: Slot) => {
    const span = mirror.current?.querySelector<HTMLElement>(`[data-slot="${s.id}"]`); if (!span) return;
    const b = span.getBoundingClientRect();
    setOpen({ slot: s, x: b.left, y: b.bottom + 6 });
  };
  /* A click that lands inside an understood phrase opens its choices; so does Alt+Down with the caret in one. */
  useEffect(() => {
    const el = input.current; if (!el) return;
    const at = () => live.find((s) => el.selectionStart === el.selectionEnd && el.selectionStart > s.start && el.selectionStart < s.end);
    const click = () => { const s = at(); if (s) openSlot(s); };
    const key = (e: KeyboardEvent) => { if (e.altKey && e.key === "ArrowDown") { const s = at(); if (s) { e.preventDefault(); openSlot(s); } } };
    el.addEventListener("click", click); el.addEventListener("keydown", key);
    return () => { el.removeEventListener("click", click); el.removeEventListener("keydown", key); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, input]);

  const pick = (s: Slot, v: string) => { onText(choose(text, s, v)); setRead(choose(text, s, v)); setOpen(null); window.setTimeout(() => input.current?.focus(), 0); };
  const parts: React.ReactNode[] = []; let i = 0;
  for (const s of live) { parts.push(text.slice(i, s.start)); parts.push(<span key={s.id} data-slot={s.id} className="ff-mark">{text.slice(s.start, s.end)}</span>); i = s.end; }
  parts.push(text.slice(i));
  const lineSlot = r.line?.slot ? live.find((s) => s.id === r.line!.slot) : undefined;

  return (
    <>
      {r.line && read === text && text.trim() ? (
        <p className="ff-line" aria-live="polite">
          {r.line.before}
          {lineSlot ? <button type="button" className="ff-key" onClick={() => openSlot(lineSlot)}>{r.line.key}</button> : <span>{r.line.key}</span>}
          {r.line.after}
        </p>
      ) : null}
      <div ref={mirror} className="ff-mirror" aria-hidden>{parts}{"​"}</div>
      {open ? <Choices at={open} current={open.slot.text} onPick={(v) => pick(open.slot, v)} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function Choices({ at, current, onPick, onClose }: { at: { slot: Slot; x: number; y: number }; current: string; onPick: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [other, setOther] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => { const el = ref.current; if (!el) return; setPos({ left: Math.max(8, Math.min(at.x, window.innerWidth - el.offsetWidth - 8)), top: at.y + el.offsetHeight + 8 > window.innerHeight ? Math.max(8, at.y - el.offsetHeight - 36) : at.y }); }, [at]);
  useEffect(() => {
    const el = ref.current;
    requestAnimationFrame(() => el?.querySelector<HTMLElement>('[aria-checked="true"], [role="menuitemradio"]')?.focus());
    const out = (e: PointerEvent) => { if (!el?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const rows = [...(el?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])]; const n = rows.indexOf(document.activeElement as HTMLElement);
      if (document.activeElement?.tagName === "INPUT" && e.key === "ArrowDown") return;
      e.preventDefault(); rows[(n + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length]?.focus();
    };
    document.addEventListener("pointerdown", out, true); document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", out, true); document.removeEventListener("keydown", key, true); };
  }, [onClose]);
  return createPortal(
    <div ref={ref} className="ff-pop" role="menu" aria-label={at.slot.ask} style={{ left: pos?.left ?? at.x, top: pos?.top ?? at.y, visibility: pos ? "visible" : "hidden" }}>
      <p className="ff-ask">{at.slot.ask}</p>
      {at.slot.choices.map((o) => { const on = o.value.toLowerCase() === current.toLowerCase(); return (
        <button key={o.value} type="button" role="menuitemradio" aria-checked={on} onClick={() => onPick(o.value)}><span>{o.label}</span>{on ? <Check size={14} aria-hidden /> : null}</button>); })}
      <form onSubmit={(e) => { e.preventDefault(); if (other.trim()) onPick(other.trim()); }}><input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Something else…" aria-label="Something else" /></form>
    </div>, document.body);
}
