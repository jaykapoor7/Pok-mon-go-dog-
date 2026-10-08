"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, CornerDownLeft, Search, X } from "lucide-react";
import { search, searchAreas, KIND_LABEL, type SearchHit } from "@/lib/search";
import type { NavItem } from "./spaces";

/* ════════════════════════════════════════════════════════════════════
   Find anything: an animal by StrayPaw ID or source ID, a place, an
   organisation, or a part of the product.

   It replaces the search field that used to sit in the bar at all times.
   Opened, it is the whole of your attention; closed, it costs nothing.
   Before you type it offers where you can go and the one thing you came
   to do, so it doubles as a keyboard-first way around the product.
   ════════════════════════════════════════════════════════════════════ */

type Jump = { label: string; detail: string; href: string };

export function CommandPalette({ open, onClose, jumps }: { open: boolean; onClose: () => void; jumps: (NavItem & { detail?: string })[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState(0);
  const seq = useRef(0);
  /* The live city registers, so every city on the record is findable by
     name — the static place list alone does not know them. */
  const [registers, setRegisters] = useState<{ city: string; state: string | null; animals: number }[]>([]);
  useEffect(() => {
    if (!open || registers.length) return;
    fetch("/api/spatial?kind=cities&v=4").then((r) => (r.ok ? r.json() : { cities: [] })).then((j) => setRegisters(j.cities ?? [])).catch(() => {});
  }, [open, registers.length]);
  const cityHits = (v: string): SearchHit[] => {
    const t = v.trim().toLowerCase();
    if (t.length < 2) return [];
    return registers.filter((c) => c.city.toLowerCase().includes(t)).slice(0, 4)
      .map((c) => ({ kind: "place" as const, label: c.city, detail: `${c.state ? `${c.state} · ` : ""}${c.animals.toLocaleString("en-IN")} recorded profiles · open in the Atlas`, href: `/map?city=${encodeURIComponent(c.city)}` }));
  };

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      requestAnimationFrame(() => input.current?.focus());
    } else if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => { if (!open) { setQuery(""); setHits([]); setCursor(0); } }, [open]);

  const empty: Jump[] = jumps.map((j) => ({ label: j.label, detail: j.detail ?? "", href: j.href }));
  /* City registers are merged at render, so they appear even when the city
     list arrives after the first keystroke. */
  const reg = cityHits(query);
  const merged = [...reg, ...hits.filter((h) => !reg.some((r) => r.label.toLowerCase() === h.label.toLowerCase()))].slice(0, 10);
  const rows: (SearchHit | (Jump & { kind: "jump" }))[] = query.trim().length < 2 ? empty.map((j) => ({ ...j, kind: "jump" as const })) : merged;

  function change(v: string) {
    setQuery(v);
    setCursor(0);
    setHits(search(v, 8));
    const n = ++seq.current;
    if (v.trim().length < 2) { setBusy(false); return; }
    setBusy(true);
    searchAreas(v, 5)
      .then((areas) => {
        if (n !== seq.current) return;
        setHits((prev) => {
          const keep = prev.filter((h) => h.kind !== "ward" && h.kind !== "animal");
          return [...areas.filter((a) => a.kind === "animal"), ...keep.filter((h) => h.kind === "place" || h.kind === "state"), ...areas.filter((a) => a.kind !== "animal"), ...keep.filter((h) => h.kind !== "place" && h.kind !== "state")].slice(0, 10);
        });
      })
      .catch(() => {})
      .finally(() => { if (n === seq.current) setBusy(false); });
  }

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function key(e: KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(rows.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (e.key === "Enter" && rows[cursor]) { e.preventDefault(); go(rows[cursor].href); }
  }

  const label = (r: (typeof rows)[number]) => r.kind === "jump" ? "Go to" : KIND_LABEL[r.kind];

  return (
    <dialog ref={dialog} className="sx-cmd" aria-label="Search StrayPaw" onClose={onClose} onClick={(e) => { if (e.target === dialog.current) onClose(); }}>
      <div className="sx-cmd-panel">
        <div className="sx-cmd-field">
          <Search size={18} aria-hidden />
          <input
            ref={input} value={query} onChange={(e) => change(e.target.value)} onKeyDown={key}
            placeholder="Animal ID, place, organisation…" aria-label="Search animals, places and organisations"
            role="combobox" aria-expanded={rows.length > 0} aria-controls="sx-cmd-list" aria-activedescendant={rows[cursor] ? `sx-cmd-${cursor}` : undefined}
            autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="go"
          />
          <button type="button" className="sx-cmd-close" onClick={onClose} aria-label="Close search"><X size={18} /></button>
        </div>
        <p className="sx-cmd-scope" aria-live="polite">
          {query.trim().length < 2 ? "Jump to" : busy ? "Searching records and places…" : rows.length ? `${rows.length} match${rows.length === 1 ? "" : "es"}` : "Nothing matches. Try a StrayPaw ID such as SP-D-…, a locality or a city."}
        </p>
        <ul id="sx-cmd-list" role="listbox" className="sx-cmd-list">
          {rows.map((r, i) => (
            <li key={`${r.kind}-${r.href}-${r.label}`} id={`sx-cmd-${i}`} role="option" aria-selected={i === cursor}>
              <button type="button" onMouseEnter={() => setCursor(i)} onClick={() => go(r.href)}>
                <span className="sx-cmd-kind">{label(r)}</span>
                <span className="sx-cmd-text"><b>{r.label}</b>{r.detail && <small>{r.detail}</small>}</span>
                {i === cursor ? <CornerDownLeft size={15} aria-hidden /> : <ArrowRight size={15} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
        <p className="sx-cmd-foot"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>↵</kbd> open <kbd>esc</kbd> close</p>
      </div>
    </dialog>
  );
}
