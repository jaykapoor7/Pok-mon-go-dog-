"use client";

/* ════════════════════════════════════════════════════════════════════
   One search field, typed results (decisions 018, 037).

   Places (cities and localities on the public record), animals by
   StrayPaw ID or given name, an NGO member's own cases by code, and the
   workspace's own destinations. Public results come from the bounded
   public projection; cases are read with the member's own session and
   never appear for anyone else. Every result says what kind it is and,
   for places, at what precision the record holds it.
   ════════════════════════════════════════════════════════════════════ */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ClipboardList, MapPin, PawPrint, Search, X } from "lucide-react";
import { searchRegister, type RegisterRow } from "@/lib/case-register";
import type { FoundAnimal, FoundPlace } from "@/lib/livingmap/server";
import { WORKSPACES, type WorkspaceId } from "./workspaces";

type Hit = { key: string; kind: "Place" | "City" | "Animal" | "Case" | "Go to"; title: string; detail: string; href: string };

let cityList: Promise<string[]> | null = null;
const cities = () => (cityList ??= fetch("/api/livingmap?kind=cities").then((r) => (r.ok ? r.json() : { cities: [] })).then((j) => ((j.cities ?? []) as { city: string }[]).map((c) => c.city)).catch(() => { cityList = null; return []; }));

export function Finder({ open, onClose, ws, member }: { open: boolean; onClose: () => void; ws: WorkspaceId; member: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [places, setPlaces] = useState<FoundPlace[]>([]);
  const [animals, setAnimals] = useState<FoundAnimal[]>([]);
  const [cases, setCases] = useState<RegisterRow[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [at, setAt] = useState(0);

  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) { d.showModal(); setQ(""); setAt(0); window.setTimeout(() => input.current?.focus(), 10); void cities().then(setAllCities); }
    else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 3) { setPlaces([]); setAnimals([]); setCases([]); setState("idle"); return; }
    let live = true;
    setState("loading");
    const id = window.setTimeout(() => {
      Promise.all([
        fetch(`/api/livingmap?kind=find&q=${encodeURIComponent(t)}`).then((r) => { if (!r.ok) throw new Error("find"); return r.json(); }),
        member ? searchRegister(t).catch(() => []) : Promise.resolve([]),
      ]).then(([j, c]) => { if (!live) return; setPlaces(j.places ?? []); setAnimals(j.animals ?? []); setCases((c as RegisterRow[]).slice(0, 6)); setState("idle"); })
        .catch(() => { if (live) setState("error"); });
    }, 220);
    return () => { live = false; window.clearTimeout(id); };
  }, [q, member]);

  const hits: Hit[] = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out: Hit[] = [];
    const def = WORKSPACES[ws];
    for (const d of def.dests) if (!t || d.label.toLowerCase().includes(t)) out.push({ key: `go:${d.href}`, kind: "Go to", title: d.label, detail: def.label, href: d.href });
    if (t) {
      for (const c of allCities.filter((c) => c.toLowerCase().includes(t)).slice(0, 4)) out.push({ key: `c:${c}`, kind: "City", title: c, detail: "City register on the map", href: `/community?city=${encodeURIComponent(c)}` });
      for (const p of places) out.push({ key: `p:${p.city}:${p.name}`, kind: "Place", title: p.name, detail: `${p.city} · ${p.animals.toLocaleString("en-IN")} animal record${p.animals === 1 ? "" : "s"} placed in this locality`, href: `/community?city=${encodeURIComponent(p.city)}&place=${encodeURIComponent(p.name)}` });
      for (const a of animals) out.push({ key: `a:${a.id}`, kind: "Animal", title: a.title, detail: [a.zone, a.city].filter(Boolean).join(", ") || "Place not recorded", href: `/animal/${a.id}` });
      for (const c of cases) out.push({ key: `k:${c.id}`, kind: "Case", title: `${c.case_code ?? "Case"} · ${c.condition_class ?? c.title ?? "Open case"}`, detail: [c.animal_name && !/·/.test(c.animal_name) ? c.animal_name : c.straypaw_id, c.zone, c.status_class?.replace(/_/g, " ")].filter(Boolean).join(" · "), href: `/ngo/cases/${c.id}` });
    }
    return out;
  }, [q, ws, allCities, places, animals, cases]);

  useEffect(() => { setAt(0); }, [hits.length]);
  const go = (h: Hit | undefined) => { if (!h) return; onClose(); router.push(h.href); };

  return (
    <dialog ref={ref} className="sp-finder" aria-label="Search" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sp-finder-in">
        <label className="sp-finder-field">
          <Search size={18} aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Animal ID or name, a city or locality, a case code"
            role="combobox" aria-expanded={hits.length > 0} aria-controls="sp-finder-list" aria-activedescendant={hits[at] ? `sp-hit-${at}` : undefined}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => Math.min(hits.length - 1, i + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(0, i - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); go(hits[at]); }
            }} />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close search"><X size={16} /></button>
        </label>
        <ul id="sp-finder-list" role="listbox" aria-label="Results" className="sp-finder-list">
          {hits.map((h, i) => {
            const Icon = h.kind === "Animal" ? PawPrint : h.kind === "Case" ? ClipboardList : h.kind === "Go to" ? ArrowRight : MapPin;
            return (
              <li key={h.key} id={`sp-hit-${i}`} role="option" aria-selected={i === at} onMouseEnter={() => setAt(i)} onClick={() => go(h)}>
                <Icon size={17} aria-hidden /><span><b>{h.title}</b><small>{h.detail}</small></span><em className="k">{h.kind}</em>
              </li>
            );
          })}
        </ul>
        <p className="sp-finder-foot k" role="status">
          {state === "loading" ? "Searching the public record…" : state === "error" ? "Search is unavailable right now. That is not the same as no results; try again." : q.trim().length > 0 && q.trim().length < 3 ? "Type three letters or more." : q.trim() && hits.length <= WORKSPACES[ws].dests.length ? "Nothing on the public record matches. A place may be on the record under another spelling." : member ? "Your organisation's cases are searched with your access, never shown to anyone else." : "Searches the public record only. Exact locations and private notes are never searchable."}
        </p>
      </div>
    </dialog>
  );
}
