"use client";

/* ════════════════════════════════════════════════════════════════════
   Find a place by typing its name. Hundreds of localities are too many to
   scroll through, so the list only opens on what has been typed, closest
   match first: names that start with it, then names that contain it.
   Arrow keys move, Enter chooses, Escape closes.
   ════════════════════════════════════════════════════════════════════ */

import { useId, useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import "./place-search.css";

export type PlaceOption = { key: string; name: string; city: string };

const SHOW = 8;

export function PlaceSearch({ options, onPick, label = "Find a place" }: { options: PlaceOption[]; onPick: (o: PlaceOption) => void; label?: string }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const { hits, more } = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return { hits: [] as PlaceOption[], more: 0 };
    const starts: PlaceOption[] = [], has: PlaceOption[] = [];
    for (const o of options) {
      const n = o.name.toLowerCase(), c = o.city.toLowerCase();
      if (n.startsWith(t) || n.split(/[\s(]+/).some((w) => w.startsWith(t))) starts.push(o);
      else if (n.includes(t) || c.startsWith(t)) has.push(o);
    }
    const all = [...starts, ...has];
    return { hits: all.slice(0, SHOW), more: Math.max(0, all.length - SHOW) };
  }, [q, options]);

  const pick = (o: PlaceOption) => { onPick(o); setQ(""); setOpen(false); input.current?.blur(); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setAt((i) => Math.min(hits.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && open && hits[at]) { e.preventDefault(); pick(hits[at]); }
    else if (e.key === "Escape") { setOpen(false); }
  };
  const showList = open && q.trim().length > 0;

  return (
    <div className="ps">
      <label className="ps-field">
        <Search size={16} aria-hidden />
        <span className="sys-sr">{label}</span>
        <input
          ref={input}
          type="search"
          value={q}
          placeholder="Find a locality or city…"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-activedescendant={showList && hits[at] ? `${id}-${at}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setAt(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={key}
        />
      </label>
      {showList && (
        <ul className="ps-list" id={`${id}-list`} role="listbox" aria-label="Places">
          {hits.length ? hits.map((o, i) => (
            <li key={o.key} id={`${id}-${i}`} role="option" aria-selected={i === at}
              className={i === at ? "is-on" : ""} onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setAt(i)}>
              <MapPin size={14} aria-hidden />
              <span><b>{o.name}</b>{o.city && o.city !== o.name ? <small>{o.city}</small> : null}</span>
            </li>
          )) : <li className="ps-none" role="presentation">No place on the record by that name yet.</li>}
          {more > 0 && <li className="ps-more" role="presentation">{more} more; keep typing to narrow it.</li>}
        </ul>
      )}
    </div>
  );
}
