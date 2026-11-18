"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { Sheet } from "./Phone";
import "./css/list-phone.css";

/* The phone half of every list (docs/rebuild/MOBILE.md, "Lists" and "Views and filters"). A desktop never renders any
   of it: the buttons are hidden by list-phone.css above 640px, and the sheets open only from them or when usePhone()
   says the screen is a phone. ListPage, RecordList and the NGO setup tables share these parts. */

const PHONE = "(max-width: 640px)";

/** True on a phone-sized screen. False on the server and in the first paint, so hydration never differs. */
export function usePhone() {
  const [on, setOn] = useState(false);
  useEffect(() => { const m = window.matchMedia(PHONE); const f = () => setOn(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return on;
}

/** Search on a phone: a button beside the views; it opens a full-width field under them (open while there is text). */
export function PhoneSearchButton({ open, active, onOpen, label }: { open: boolean; active: boolean; onOpen: () => void; label: string }) {
  return <button type="button" className={`lp-ib lp-ph ${open || active ? "is-on" : ""}`} aria-label={label} aria-expanded={open} onClick={onOpen}><Search size={20} aria-hidden /></button>;
}
export function PhoneSearchField({ value, onChange, onClose, placeholder, label }: { value: string; onChange: (v: string) => void; onClose: () => void; placeholder?: string; label: string }) {
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { box.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="lp-search lp-ph" role="search">
      <Search size={18} aria-hidden />
      <input ref={box} type="search" inputMode="search" enterKeyHint="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "Search"} aria-label={label} autoComplete="off"
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { onChange(""); onClose(); } }} />
      <button type="button" className="lp-ib" aria-label={value ? "Clear the search" : "Close the search"} onClick={() => { onChange(""); onClose(); }}><X size={18} aria-hidden /></button>
    </div>
  );
}

/** Filters, selects, downloads and other secondary tools behind one button on a phone. */
export function PhoneTools({ children, label = "Filter", active = 0 }: { children: ReactNode; label?: string; active?: number }) {
  const [open, setOpen] = useState(false);
  /* One wrapper, so the list's bar can hide its desktop tools on a phone without hiding this sheet. */
  return <span className="lp-tools-w lp-ph">
    <button type="button" className={`lp-tools lp-ph ${active ? "is-on" : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><SlidersHorizontal size={18} aria-hidden /><span>{label}</span>{active ? <i className="lp-dot">{active}</i> : null}</button>
    <Sheet open={open} onClose={() => setOpen(false)} label={label}>
      <div className="lp-sheet-tools">{children}</div>
      <div className="lp-sheet-foot"><button type="button" className="nx-btn lp-wide" onClick={() => setOpen(false)}>Done</button></div>
    </Sheet>
  </span>;
}

/** A row's preview on a phone: a sheet that rises over the list, the record's own page one full-width tap away. */
export function PhonePeek({ label, sub, body, href, hrefLabel, onClose, after }: { label: string; sub?: ReactNode; body: ReactNode; href?: string; hrefLabel?: string; onClose: () => void; after?: ReactNode }) {
  return (
    <Sheet open onClose={onClose} label={label}>
      <div className="lp-peek">
        {sub ? <p className="lp-peek-sub">{sub}</p> : null}
        {body}
        {after}
      </div>
      {href ? <div className="lp-sheet-foot"><Link href={href} className="nx-btn lp-wide">{hrefLabel ?? "Open the full record"}<ArrowRight size={16} aria-hidden /></Link></div> : null}
    </Sheet>
  );
}

/** A plain-text name for a sheet's heading, from a preview title that may be markup. */
export const textOf = (node: ReactNode, fallback: string) => (typeof node === "string" ? node : fallback);
