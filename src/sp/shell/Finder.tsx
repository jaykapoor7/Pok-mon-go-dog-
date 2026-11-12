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

import { shortCode } from "@/lib/caseCode";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ClipboardList, MapPin, PawPrint, Plus, Search, Sparkles, X } from "lucide-react";
import { useAi } from "@/sp3/ai/AiPanel";
import { searchRegister, type RegisterRow } from "@/lib/case-register";
import type { FoundAnimal, FoundPlace } from "@/lib/livingmap/server";
import { WORKSPACES, workspaceView, type Role, type WorkspaceId } from "./workspaces";

type Hit = { key: string; kind: "Place" | "City" | "Animal" | "Case" | "Go to" | "Ask Kaju" | "Do"; title: string; detail: string; href: string; group?: string };
/* Plain names for the areas of a workspace, as the index shows them. */
const AREA: Record<string, string> = { Programmes: "Drives and projects", Clinical: "Treatment and release", Organisation: "Your organisation", Work: "Daily work", Overview: "Governance and reports", Verification: "Review" };

let cityList: Promise<string[]> | null = null;
const cities = () => (cityList ??= fetch("/api/livingmap?kind=cities").then((r) => (r.ok ? r.json() : { cities: [] })).then((j) => ((j.cities ?? []) as { city: string }[]).map((c) => c.city)).catch(() => { cityList = null; return []; }));

export function Finder({ open, onClose, ws, member, role, reviewer, onAsk, pages = [], browse = false, actions = [], menu = [] }: { /** Verbs for this person, first when nothing is typed (Quick actions). */ actions?: { href: string; label: string; note?: string }[]; /** The sidebar's own destinations, as the person sees them. */ menu?: { href: string; label: string }[]; open: boolean; onClose: () => void; /** Opened from "All sections": show the whole workspace, grouped, before anything is typed. */ browse?: boolean; ws: WorkspaceId; member: boolean; role:Role|null; reviewer:boolean; onAsk?: (q: string) => void; pages?: { href: string; label: string; detail: string }[] }) {
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
  /* The pages open earlier, read when the dialog opens (never during the first render, which the server also draws). */
  const [recent, setRecent] = useState<{ href: string; label: string }[]>([]);
  useEffect(() => { if (!open) return; try { const v = JSON.parse(sessionStorage.getItem("sp.tabs.v1") ?? "[]"); setRecent(Array.isArray(v) ? v : []); } catch { setRecent([]); } }, [open]);

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
    const def = workspaceView(ws,role,reviewer);
    /* "All sections": the whole workspace as one organised index, each area named, each page with what it is for. */
    if (browse && !t) {
      const seen = new Set<string>();
      for (const g of def.index) for (const l of g.links) { const href = l.query ? `${l.href}?${l.query}` : l.href; if (seen.has(href) || l.href === "/assistant") continue; seen.add(href); out.push({ key: `all:${href}`, kind: "Go to", title: l.label, detail: l.note ?? "", href, group: AREA[g.label] ?? g.label }); /* shown under its group heading, so no "In <group>" line */ }
      for (const pg of pages) if (!seen.has(pg.href)) { seen.add(pg.href); out.push({ key: `all:${pg.href}`, kind: "Go to", title: pg.label, detail: pg.detail, href: pg.href, group: "Your programme places" }); }
      return out;
    }
    if (t && onAsk) out.push({ key: "ask", kind: "Ask Kaju", title: `Ask Kaju: “${q.trim()}”`, detail: "Searches your authorised records and answers with citations", href: "#ask" });
    /* Quick actions with nothing typed: the person's verbs first, then where they can go, then what they had open. */
    if (!t) {
      for (const a of actions) out.push({ key: `do:${a.href}`, kind: "Do", title: a.label, detail: a.note ?? "", href: a.href, group: "Actions" });
      if (onAsk) out.push({ key: "kaju", kind: "Do", title: "Ask Kaju", detail: "Finds, checks and prepares, with your access", href: "#kaju", group: "Actions" });
    }
    const dests = menu.length ? menu : def.nav.map((d) => ({ href: d.query ? `${d.href}?${d.query}` : d.href, label: d.label }));
    for (const d of dests) if ((!t || d.label.toLowerCase().includes(t)) && !out.some((h) => h.href === d.href)) out.push({ key: `go:${d.href}`, kind: "Go to", title: d.label, detail: def.label, href: d.href, group: t ? undefined : "Go to" });
    if (!t) { try { for (const r of recent.slice().reverse().slice(0, 4)) if (r.label && !out.some((h) => h.href === r.href)) out.push({ key: `re:${r.href}`, kind: "Go to", title: r.label, detail: "Open earlier", href: r.href, group: "Recent" }); } catch { /* no recent pages */ } }
    /* The pages of the person's places (hospital, laboratory, programme): findable by name like any other. */
    for (const pg of pages) if ((t ? pg.label.toLowerCase().includes(t) || pg.detail.toLowerCase().includes(t) : !menu.length) && !out.some((h) => h.href === pg.href)) out.push({ key: `go:${pg.href}`, kind: "Go to", title: pg.label, detail: pg.detail, href: pg.href, group: t ? undefined : "Go to" });
    for (const g of def.index) for (const l of g.links) if (t && l.label.toLowerCase().includes(t) && !def.nav.some((n) => n.href === l.href)) out.push({ key: `go:${l.href}`, kind: "Go to", title: l.label, detail: `${def.label} · ${g.label}`, href: l.href });
    if (t) {
      for (const c of allCities.filter((c) => c.toLowerCase().includes(t)).slice(0, 4)) out.push({ key: `c:${c}`, kind: "City", title: c, detail: "City register on the map", href: `/community?city=${encodeURIComponent(c)}` });
      for (const p of places) out.push({ key: `p:${p.city}:${p.name}`, kind: "Place", title: p.name, detail: `${p.city} · ${p.animals.toLocaleString("en-IN")} animal record${p.animals === 1 ? "" : "s"} placed in this locality`, href: `/community?city=${encodeURIComponent(p.city)}&place=${encodeURIComponent(p.name)}` });
      for (const a of animals) out.push({ key: `a:${a.id}`, kind: "Animal", title: a.title, detail: [a.zone, a.city].filter(Boolean).join(", ") || "Place not recorded", href: `/animal/${a.id}` });
      for (const c of cases) out.push({ key: `k:${c.id}`, kind: "Case", title: `${shortCode(c.case_code)} · ${c.condition_class ?? c.title ?? "Open case"}`, detail: [c.animal_name && !/·/.test(c.animal_name) ? c.animal_name : c.straypaw_id, c.zone, c.status_class?.replace(/_/g, " ")].filter(Boolean).join(" · "), href: `/ngo/cases/${c.id}` });
    }
    return out;
  }, [q, ws, role, reviewer, allCities, places, animals, cases, onAsk, pages, browse, actions, menu, recent]);

  useEffect(() => { setAt(0); }, [hits.length]);
  const ai = useAi();
  const go = (h: Hit | undefined) => { if (!h) return; if (h.kind === "Ask Kaju") { onAsk?.(q.trim()); return; } if (h.href === "#kaju") { onClose(); ai.setOpen(true); return; } onClose(); router.push(h.href); };

  return (
    <dialog ref={ref} className={`sp-finder${browse ? " is-browse" : ""}`} aria-label={browse ? "All sections" : "Search"} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sp-finder-in">
        <label className="sp-finder-field">
          <Search size={18} aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={browse ? "Every section of this workspace. Type to search records too" : "Animal ID or name, a city or locality, a case code"}
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
            const Icon = h.kind === "Ask Kaju" || h.href === "#kaju" ? Sparkles : h.kind === "Do" ? Plus : h.kind === "Animal" ? PawPrint : h.kind === "Case" ? ClipboardList : h.kind === "Go to" ? ArrowRight : MapPin;
            const head = h.group && h.group !== hits[i - 1]?.group ? <li key={`g:${h.group}`} role="presentation" className="sp-finder-group">{h.group}</li> : null;
            return (
              <Fragment key={h.key}>
                {head}
                <li id={`sp-hit-${i}`} role="option" aria-selected={i === at} onMouseEnter={() => setAt(i)} onClick={() => go(h)}>
                  <Icon size={17} aria-hidden /><span><b>{h.title}</b>{h.detail ? <small>{h.detail}</small> : null}</span>{h.group ? null : <em className="k">{h.kind}</em>}
                </li>
              </Fragment>
            );
          })}
        </ul>
        <p className="sp-finder-foot k" role="status">
          {state === "loading" ? "Searching the public record…" : state === "error" ? "Search is unavailable right now. That is not the same as no results; try again." : q.trim().length > 0 && q.trim().length < 3 ? "Type three letters or more." : q.trim() && !places.length && !animals.length && !cases.length ? "Nothing on the public record matches. A place may be on the record under another spelling." : member ? "Your organisation's cases are searched with your access, never shown to anyone else." : "Searches the public record only. Exact locations and private notes are never searchable."}
        </p>
      </div>
    </dialog>
  );
}
