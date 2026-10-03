"use client";

/* ════════════════════════════════════════════════════════════════════
   Choose one value from a long list by typing. A locality, a city, a
   zone: there are too many to scroll through in a native select, so the
   field searches as you type, closest match first, and holds the chosen
   value with a one-tap clear. Opening it empty shows the first few so a
   short list can still be browsed. Arrow keys move, Enter chooses,
   Escape closes.
   ════════════════════════════════════════════════════════════════════ */

import { useId, useMemo, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import "./place-search.css";

export type SearchOption = { value: string; label?: string; hint?: string };

const SHOW = 8;

export function SearchSelect({ options, value, onChange, placeholder = "Search…", label, allLabel = "Any", icon = "search", className = "" }: {
  options: (string | SearchOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Read by screen readers and shown as the field's caption when set. */
  label: string;
  /** What an empty value means, e.g. "All localities". */
  allLabel?: string;
  icon?: "search" | "place";
  className?: string;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opts = useMemo(() => options.map((o) => (typeof o === "string" ? { value: o } : o)), [options]);
  const chosen = opts.find((o) => o.value === value);

  const { hits, more } = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return { hits: opts.slice(0, SHOW), more: Math.max(0, opts.length - SHOW) };
    const starts: SearchOption[] = [], has: SearchOption[] = [];
    for (const o of opts) {
      const n = (o.label ?? o.value).toLowerCase(), h = (o.hint ?? "").toLowerCase();
      if (n.startsWith(t) || n.split(/[\s,(/-]+/).some((w) => w.startsWith(t))) starts.push(o);
      else if (n.includes(t) || h.includes(t)) has.push(o);
    }
    const all = [...starts, ...has];
    return { hits: all.slice(0, SHOW), more: Math.max(0, all.length - SHOW) };
  }, [q, opts]);

  const pick = (o: SearchOption) => { onChange(o.value); setQ(""); setOpen(false); input.current?.blur(); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setAt((i) => Math.min(hits.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && open && hits[at]) { e.preventDefault(); pick(hits[at]); }
    else if (e.key === "Escape") { setOpen(false); }
  };
  const Icon = icon === "place" ? MapPin : Search;

  return (
    <div className={`ps ss ${className}`}>
      <label className={`ps-field ${value ? "is-set" : ""}`}>
        <Icon size={16} aria-hidden />
        <span className="sys-sr">{label}</span>
        <input
          ref={input}
          type="search"
          value={open ? q : chosen ? (chosen.label ?? chosen.value) : q}
          placeholder={value ? undefined : placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && hits[at] ? `${id}-${at}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setAt(0); }}
          onFocus={() => { setQ(""); setOpen(true); setAt(0); }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={key}
        />
        {value && !open && (
          <button type="button" className="ss-clear" aria-label={`Clear ${label.toLowerCase()}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onChange("")}>
            <X size={14} aria-hidden />
          </button>
        )}
      </label>
      {open && (
        <ul className="ps-list" id={`${id}-list`} role="listbox" aria-label={label}>
          {value && !q && (
            <li role="option" aria-selected={false} className="ss-all" onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); input.current?.blur(); }}>
              <X size={14} aria-hidden /><span><b>{allLabel}</b></span>
            </li>
          )}
          {hits.length ? hits.map((o, i) => (
            <li key={o.value} id={`${id}-${i}`} role="option" aria-selected={o.value === value}
              className={`${i === at ? "is-on" : ""} ${o.value === value ? "is-chosen" : ""}`} onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setAt(i)}>
              <Icon size={14} aria-hidden />
              <span><b>{o.label ?? o.value}</b>{o.hint ? <small>{o.hint}</small> : null}</span>
            </li>
          )) : <li className="ps-none" role="presentation">Nothing by that name.</li>}
          {more > 0 && <li className="ps-more" role="presentation">{more} more; type to narrow it.</li>}
        </ul>
      )}
    </div>
  );
}
