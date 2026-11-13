"use client";

/* The frame's small parts: menus, tooltips and loading shapes. One of
   each, used everywhere, so a menu opens, moves and closes the same way
   whether it came from a tab, a sidebar row or a page's "more" button. */

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* ── menu ─────────────────────────────────────────────────────────── */
export type MenuItem = { label: string; icon?: ReactNode; kbd?: string; onSelect: () => void; danger?: boolean; on?: boolean; note?: string } | "divider" | { heading: string };
export type MenuAt = { x: number; y: number; align?: "left" | "right" };

export function Menu({ at, items, onClose, label, width = 240 }: { at: MenuAt; items: MenuItem[]; onClose: () => void; label: string; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const back = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(8, Math.min(at.align === "right" ? at.x - w : at.x, window.innerWidth - w - 8));
    const top = at.y + h + 8 > window.innerHeight ? Math.max(8, at.y - h) : at.y;
    setPos({ left, top });
  }, [at]);
  useEffect(() => {
    back.current = document.activeElement as HTMLElement | null;
    const el = ref.current;
    requestAnimationFrame(() => el?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus());
    const out = (e: PointerEvent) => { if (!el?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); back.current?.focus(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      const rows = [...(el?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
      const i = rows.indexOf(document.activeElement as HTMLElement);
      const n = e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
      rows[n]?.focus();
    };
    document.addEventListener("pointerdown", out, true); document.addEventListener("keydown", key, true);
    const away = () => onClose();
    window.addEventListener("resize", away); window.addEventListener("blur", away);
    return () => { document.removeEventListener("pointerdown", out, true); document.removeEventListener("keydown", key, true); window.removeEventListener("resize", away); window.removeEventListener("blur", away); };
  }, [onClose]);
  return createPortal(
    <div ref={ref} className="ws-menu" role="menu" aria-label={label} style={{ width, left: pos?.left ?? at.x, top: pos?.top ?? at.y, visibility: pos ? "visible" : "hidden" }}>
      {items.map((it, i) => it === "divider" ? <hr key={i} /> : "heading" in it ? <p key={i} className="ws-menu-h">{it.heading}</p> : (
        <button key={i} type="button" role={it.on === undefined ? "menuitem" : "menuitemradio"} aria-checked={it.on} className={it.danger ? "is-danger" : undefined} onClick={() => { onClose(); it.onSelect(); }}>
          {it.icon ? <span className="ws-menu-i" aria-hidden>{it.icon}</span> : null}
          <span className="ws-menu-t">{it.label}{it.note ? <small>{it.note}</small> : null}</span>
          {it.on ? <span className="ws-menu-on" aria-hidden>✓</span> : it.kbd ? <kbd aria-hidden>{it.kbd}</kbd> : null}
        </button>
      ))}
    </div>, document.body);
}

/* ── tooltips ─────────────────────────────────────────────────────── */
/** One tooltip for the whole frame. Any element with data-tip gets it, with its keys from data-kbd.
    It is a hint for people who can see it; the control keeps its own accessible name. */
export function Tips() {
  const [tip, setTip] = useState<{ text: string; kbd?: string; x: number; y: number; below: boolean } | null>(null);
  useEffect(() => {
    let t = 0; let cur: Element | null = null;
    const hide = () => { window.clearTimeout(t); cur = null; setTip(null); };
    const show = (el: Element, wait: number) => {
      window.clearTimeout(t); cur = el;
      t = window.setTimeout(() => {
        if (cur !== el || !el.isConnected) return;
        const r = el.getBoundingClientRect(); const below = r.top < 64 || el.getAttribute("data-tip-at") === "below";
        setTip({ text: el.getAttribute("data-tip") ?? "", kbd: el.getAttribute("data-kbd") ?? undefined, x: Math.max(12, Math.min(r.left + r.width / 2, window.innerWidth - 12)), y: below ? r.bottom + 8 : r.top - 8, below });
      }, wait);
    };
    const over = (e: Event) => { const el = (e.target as Element | null)?.closest?.("[data-tip]"); if (!el) { if (cur) hide(); return; } if (el !== cur) show(el, e.type === "focusin" ? 150 : 450); };
    const touch = window.matchMedia("(hover: none)").matches;
    if (!touch) document.addEventListener("pointerover", over);
    document.addEventListener("focusin", over); document.addEventListener("focusout", hide);
    document.addEventListener("pointerdown", hide, true); document.addEventListener("keydown", hide, true); window.addEventListener("scroll", hide, true);
    return () => { window.clearTimeout(t); document.removeEventListener("pointerover", over); document.removeEventListener("focusin", over); document.removeEventListener("focusout", hide); document.removeEventListener("pointerdown", hide, true); document.removeEventListener("keydown", hide, true); window.removeEventListener("scroll", hide, true); };
  }, []);
  if (!tip || !tip.text) return null;
  return createPortal(<div className={`ws-tip${tip.below ? " is-below" : ""}`} role="presentation" style={{ left: tip.x, top: tip.y }}>{tip.text}{tip.kbd ? <kbd>{tip.kbd}</kbd> : null}</div>, document.body);
}

/* ── loading shapes ───────────────────────────────────────────────── */
/** A page's shape while it loads: the head, then rows or a record's two columns. Quiet, never a spinner on a blank page. */
export function Skeleton({ kind = "list", rows = 6 }: { kind?: "list" | "record" | "page"; rows?: number }) {
  return (
    <div className={`ws-skel is-${kind}`} role="status" aria-label="Loading">
      <i className="ws-skel-t" /><i className="ws-skel-s" />
      {kind === "record" ? <div className="ws-skel-cols"><div>{Array.from({ length: 4 }, (_, i) => <i key={i} className="ws-skel-b" style={{ ["--w" as string]: `${88 - i * 12}%` }} />)}</div><div><i className="ws-skel-b" /><i className="ws-skel-b" style={{ ["--w" as string]: "70%" }} /></div></div>
        : <div className="ws-skel-rows">{Array.from({ length: rows }, (_, i) => <i key={i} className="ws-skel-r" style={{ ["--i" as string]: i }} />)}</div>}
    </div>
  );
}

const MAC = { mod: "⌘", alt: "⌥" }, PC = { mod: "Ctrl", alt: "Alt" };
const noSub = () => () => {};
/** The names of this device's modifier keys. The server and the first paint say "Ctrl"; a Mac corrects itself after. */
export function useKeys() { return useSyncExternalStore(noSub, () => (/Mac|iPhone|iPad/.test(navigator.platform) ? MAC : PC), () => PC); }
export function Kbd({ children }: { children: ReactNode }) { return <kbd className="ws-kbd">{children}</kbd>; }
