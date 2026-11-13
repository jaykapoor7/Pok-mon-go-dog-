"use client";

/* ════════════════════════════════════════════════════════════════════
   Peek: a record opened over the page you are working on.

   Side peek keeps the list beside it, so the next row is one click or
   one arrow key away. Centre peek puts the record in front for a moment.
   "Open as page" gives it a tab of its own. All three show the same
   record component; nothing is summarised.

   The peek lives in the address (?peek=…), so the browser's Back closes
   it, a reload keeps it and a copied link opens it.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, ChevronsRight, Maximize2, PanelRight, Square } from "lucide-react";
import { recordAt } from "./records";
import { useKeys } from "./ui";
import type { PeekMode } from "./store";

/** Record links on the page behind, in the order they appear, for stepping through a list. */
function siblings(): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  document.querySelectorAll<HTMLAnchorElement>("#sp-main a[href]").forEach((a) => {
    const p = a.getAttribute("href")?.split(/[?#]/)[0] ?? "";
    if (!seen.has(p) && recordAt(p)) { seen.add(p); out.push(p); }
  });
  return out;
}

export function Peek({ path, mode, onClose, onMode, onPage, onGo }: { path: string; mode: Exclude<PeekMode, "page">; onClose: () => void; onMode: (m: PeekMode) => void; onPage: () => void; onGo: (path: string) => void }) {
  const hit = recordAt(path);
  const k = useKeys();
  const ref = useRef<HTMLElement>(null);
  const step = (d: 1 | -1) => { const all = siblings(); const i = all.indexOf(path); const next = all[i + d]; if (i >= 0 && next) onGo(next); };
  const stepRef = useRef(step); stepRef.current = step;
  useEffect(() => {
    const el = ref.current;
    const back = document.activeElement as HTMLElement | null;
    el?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector(".ws-menu, dialog[open]")) { e.preventDefault(); onClose(); }
      else if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp") && !typing) { e.preventDefault(); stepRef.current(e.key === "ArrowDown" ? 1 : -1); }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); if (back?.isConnected) back.focus({ preventScroll: true }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!hit) return null;
  const { rec, m } = hit; const View = rec.View;
  return (
    <>
      {mode === "center" ? <div className="ws-peek-scrim" onClick={onClose} aria-hidden /> : null}
      <aside ref={ref} className={`ws-peek is-${mode}`} role="dialog" aria-modal={mode === "center" ? true : undefined} aria-label={`${rec.label}, opened over the page`} tabIndex={-1}>
        <header className="ws-peek-bar">
          <button type="button" className="ws-ib" onClick={onClose} aria-label="Close the peek" data-tip="Close" data-kbd="Esc"><ChevronsRight size={16} aria-hidden /></button>
          <button type="button" className="ws-ib" onClick={onPage} aria-label="Open as a full page" data-tip="Open as a page"><Maximize2 size={14} aria-hidden /></button>
          <span className="ws-peek-kind">{rec.label}</span>
          <span className="ws-fill" />
          <button type="button" className="ws-ib" onClick={() => step(-1)} aria-label="Previous record in the list" data-tip="Previous" data-kbd={`${k.alt} ↑`}><ChevronUp size={16} aria-hidden /></button>
          <button type="button" className="ws-ib" onClick={() => step(1)} aria-label="Next record in the list" data-tip="Next" data-kbd={`${k.alt} ↓`}><ChevronDown size={16} aria-hidden /></button>
          <span className="ws-peek-modes" role="group" aria-label="How records open">
            <button type="button" className="ws-ib" aria-pressed={mode === "side"} onClick={() => onMode("side")} aria-label="Side peek" data-tip="Side peek"><PanelRight size={15} aria-hidden /></button>
            <button type="button" className="ws-ib" aria-pressed={mode === "center"} onClick={() => onMode("center")} aria-label="Centre peek" data-tip="Centre peek"><Square size={14} aria-hidden /></button>
          </span>
        </header>
        <div className="ws-peek-body sp-main" key={path}><View m={m} /></div>
      </aside>
    </>
  );
}
