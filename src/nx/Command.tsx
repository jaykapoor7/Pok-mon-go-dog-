"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SPRING } from "./motion/tokens";
import { ArrowRight, Camera, ClipboardList, CornerDownLeft, Hash, History, MessageSquare, PawPrint, Search, Smartphone, Sparkles } from "lucide-react";
import { recordHref, searchMessages } from "./collab";
import { getSupabase } from "@/lib/supabase";
import { ANIMALS, CASES, CHANNELS } from "./fixtures";
import { PAGES } from "./nav";
import { useChannels, useLive } from "./live";
import { animalLine, animalSearch } from "./animalLabel";
import "./css/command.css";

/* The command bar. One box finds a page, a channel, an animal or a case, or hands the words to Kaju.
   Records come from the signed-in organisation only, through the same row-level security as every page.
   Clinical records are not searched here: a patient is found from inside the facility's own register. */

type Hit = { id: string; group: "Pages" | "Channels" | "Animals" | "Cases" | "Messages" | "Kaju" | "Recent"; label: string; detail?: string; href: string; icon: React.ReactNode };
const esc = (s: string) => s.replace(/[%_\\,()]/g, " ").trim();

/* On a phone the empty box lists what this person opened from it lately, kept in this browser only (a convenience:
   nothing is sent or stored elsewhere, and a record they can no longer open simply will not open). */
const RECENT = "nx.cmd.recent.v1";
type Recent = { label: string; detail?: string; href: string; kind: Hit["group"] };
const readRecent = (): Recent[] => { try { const v = JSON.parse(localStorage.getItem(RECENT) ?? "[]"); return Array.isArray(v) ? v.filter((x) => x && typeof x.href === "string" && typeof x.label === "string").slice(0, 6) : []; } catch { return []; } };
const keepRecent = (h: Hit) => { if (h.group === "Kaju" || h.group === "Messages") return; try { const kind = h.group === "Recent" ? (readRecent().find((r) => r.href === h.href)?.kind ?? "Pages") : h.group; localStorage.setItem(RECENT, JSON.stringify([{ label: h.label, detail: h.detail, href: h.href, kind }, ...readRecent().filter((r) => r.href !== h.href)].slice(0, 6))); } catch {} };
const KIND_ICON: Partial<Record<Hit["group"], React.ReactNode>> = { Animals: <PawPrint size={14} />, Cases: <ClipboardList size={14} />, Channels: <Hash size={14} /> };

export function Command({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const live = useLive();
  const calm = useReducedMotion();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const [records, setRecords] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  const ngo = live.orgFor("ngo");
  const [recent, setRecent] = useState<Recent[]>([]);
  useEffect(() => { if (open && window.matchMedia("(max-width: 640px)").matches) setRecent(readRecent()); }, [open]);
  const chans = useChannels(live.org?.org_id ?? null);
  /* Focus moves into the box on open and goes back to where the person was on close (WCAG 2.4.3). */
  const before = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) { before.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setQ(""); setAt(0); setRecords([]); window.setTimeout(() => box.current?.focus(), 10); return; }
    const back = before.current; before.current = null;
    // After the box has left the page (its removal would otherwise drop focus on the document).
    if (!back) return; // never opened: nothing to give back
    window.setTimeout(() => (back && back !== document.body && back.isConnected ? back : document.getElementById("nx-main"))?.focus({ preventScroll: true }), 60);
  }, [open]);
  /* Escape closes it wherever focus is, including in the moment before focus has reached the box (the bar's code loads
     when it is first opened, so it can be on screen a little before the box takes focus). The box's own handler runs
     first and marks the key as handled, so it never closes twice. */
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);

  /* Records: sample rows when signed out; otherwise the NGO's own animals and cases, asked for once the person pauses. */
  useEffect(() => {
    const n = q.trim();
    if (!open || n.length < 2) { setRecords([]); return; }
    if (!live.org) {
      const l = n.toLowerCase();
      setRecords([
        ...ANIMALS.filter((a) => `${a.id} ${a.name} ${a.ward}`.toLowerCase().includes(l)).slice(0, 5).map((a): Hit => ({ id: a.id, group: "Animals", label: animalLine({ id: a.id, name: a.name, code: a.id, species: a.species }), detail: `${a.ward} · code ${a.id}`, href: `/ngo/animals/${a.id}`, icon: <PawPrint size={14} /> })),
        ...CASES.filter((c) => `${c.code} ${c.title} ${c.place}`.toLowerCase().includes(l)).slice(0, 5).map((c): Hit => ({ id: c.id, group: "Cases", label: c.title, detail: `${c.code} · ${c.place}`, href: "/ngo/cases", icon: <ClipboardList size={14} /> })),
      ]);
      return;
    }
    const db = getSupabase();
    if (!db) { setRecords([]); return; }
    const term = esc(n);
    if (!term) { setRecords([]); return; }
    let alive = true;
    setBusy(true);
    const t = window.setTimeout(async () => {
      const like = `%${term}%`;
      /* "Dog 128", "#128" and "Tiger (128)" look for the number, which finds the code YEL-128. */
      const dlike = `%${esc(animalSearch(n)) || term}%`;
      const none = Promise.resolve({ data: [] as unknown[] });
      const [d, c, msgs] = await Promise.all([
        ngo ? db.from("dogs").select("id,name,code,species,zone").eq("ngo_id", ngo.org_id).or(`name.ilike.${dlike},code.ilike.${dlike},zone.ilike.${dlike}`).limit(5) : none,
        ngo ? db.from("cases").select("id,title,case_code,zone").eq("ngo_id", ngo.org_id).or(`title.ilike.${like},case_code.ilike.${like},zone.ilike.${like}`).limit(5) : none,
        n.length >= 3 ? searchMessages(n) : Promise.resolve([]),
      ]);
      if (!alive) return;
      setBusy(false);
      setRecords([
        ...((d.data ?? []) as { id: string; name: string | null; code: string | null; species: string | null; zone: string | null }[]).map((x): Hit => ({ id: x.id, group: "Animals", label: animalLine(x), detail: [x.zone, x.code ? `code ${x.code}` : null].filter(Boolean).join(" · "), href: `/ngo/animals/${x.id}`, icon: <PawPrint size={14} /> })),
        ...((c.data ?? []) as { id: string; title: string | null; case_code: string | null; zone: string | null }[]).map((x): Hit => ({ id: x.id, group: "Cases", label: x.title || "Untitled case", detail: [x.case_code && x.case_code.length > 14 ? `${x.case_code.slice(0, 4)}…${x.case_code.slice(-6)}` : x.case_code, x.zone].filter(Boolean).join(" · "), href: `/ngo/cases/${x.id}`, icon: <ClipboardList size={14} /> })),
        ...msgs.slice(0, 6).map((m): Hit => ({ id: `m${m.id}`, group: "Messages", label: m.body.length > 90 ? `${m.body.slice(0, 90)}…` : m.body, detail: `${m.channel_kind === "dm" ? "Direct message" : m.channel_kind === "record" ? m.record_label ?? "Record discussion" : `#${m.channel_name}`} · ${m.author_name ?? "Member"}`, href: m.channel_kind === "record" ? recordHref(m.record_kind, m.record_id) ?? "/ngo/today" : `/channels/${m.channel_name}?m=${m.id}`, icon: <MessageSquare size={14} /> })),
      ]);
    }, 180);
    return () => { alive = false; window.clearTimeout(t); setBusy(false); };
  }, [q, open, live.org, ngo]);

  const hits = useMemo<Hit[]>(() => {
    const l = q.trim().toLowerCase();
    const office = live.org?.source === "review_office", lab = live.org?.kind === "laboratory";
    const pages = PAGES.filter((p) => (!p.office || !live.org || office) && (!p.lab || !live.org || lab)).filter((p) => !l || `${p.label} ${p.ws}`.toLowerCase().includes(l)).slice(0, l ? 6 : 8)
      .map((p): Hit => ({ id: p.href + p.ws, group: "Pages", label: p.label, detail: p.ws, href: p.href, icon: <p.icon size={14} /> }));
    const chanNames = live.org ? (chans.rows ?? []).filter((c) => c.kind === "channel" || c.kind === "announcement").map((c) => c.name) : CHANNELS.map((c) => c.name);
    const channels = chanNames.filter((c) => !l || c.includes(l)).slice(0, 4).map((c): Hit => ({ id: `#${c}`, group: "Channels", label: `#${c}`, href: `/channels/${c}`, icon: <Hash size={14} /> }));
    const kaju: Hit[] = l ? [{ id: "kaju", group: "Kaju", label: `Ask Kaju: “${q.trim()}”`, detail: "Nothing is sent until you press Run", href: `/kaju?q=${encodeURIComponent(q.trim())}`, icon: <Sparkles size={14} /> }] : [];
    /* Recording an animal is one step from anywhere in an NGO workspace: field mode opens with the record screen up. */
    const acts: Hit[] = !live.org || ngo ? ([
      [{ id: "act:record", group: "Pages", label: "Record an animal", detail: "Field mode", href: "/ngo/field?record=1", icon: <Camera size={14} /> }, "record animal dog report intake register capture photo new"],
      [{ id: "act:field", group: "Pages", label: "Field mode", detail: "NGO", href: "/ngo/field", icon: <Smartphone size={14} /> }, "field mode round offline phone stops"],
    ] as [Hit, string][]).filter(([, words]) => !l || l.split(/\s+/).every((w) => words.includes(w))).map(([h]) => h) : [];
    const lately: Hit[] = l ? [] : recent.map((r) => ({ id: `r${r.href}`, group: "Recent", label: r.label, detail: r.detail, href: r.href, icon: KIND_ICON[r.kind] ?? <History size={14} /> }));
    return [...lately, ...records, ...acts, ...pages, ...channels, ...kaju];
  }, [q, records, live.org, ngo, chans.rows, recent]);

  useEffect(() => { setAt(0); }, [q]);
  const go = (h: Hit | undefined) => { if (!h) return; keepRecent(h); onClose(); router.push(h.href); };
  const groups = hits.reduce<{ name: Hit["group"]; items: { h: Hit; i: number }[] }[]>((acc, h, i) => { const g = acc.find((x) => x.name === h.group); if (g) g.items.push({ h, i }); else acc.push({ name: h.group, items: [{ h, i }] }); return acc; }, []);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div key="cmd" className="nx-cmd-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: calm ? 0 : .12 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label="Search and commands" className="nx-cmd" onMouseDown={(e) => e.stopPropagation()}
            initial={calm ? false : { opacity: 0, y: -8, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={calm ? { opacity: 0 } : { opacity: 0, y: -6, scale: .99 }} transition={SPRING.pop}>
            <label className="nx-cmd-in"><Search size={16} />
              <input ref={box} value={q} onChange={(e) => setQ(e.target.value)} placeholder={live.org ? "Search pages, channels, animals and cases" : "Search the sample workspace"} aria-label="Search" role="combobox" aria-expanded aria-controls="nx-cmd-list" aria-activedescendant={hits[at] ? `nx-cmd-${at}` : undefined}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { e.preventDefault(); onClose(); }
                  else if (e.key === "ArrowDown") { e.preventDefault(); setAt((a) => Math.min(hits.length - 1, a + 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setAt((a) => Math.max(0, a - 1)); }
                  else if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); go(hits[at]); }
                }} />
              {busy ? <span className="nx-cmd-busy" aria-hidden /> : <kbd>Esc</kbd>}
              <button type="button" className="nx-cmd-x" onClick={onClose}>Cancel</button>
            </label>
            <div className="nx-cmd-list" id="nx-cmd-list" role="listbox" aria-label="Results">
              {groups.map((g) => (
                <div key={g.name} role="group" aria-label={g.name}>
                  <p className="nx-cmd-g">{g.name}</p>
                  {g.items.map(({ h, i }) => (
                    <button key={h.id} id={`nx-cmd-${i}`} type="button" role="option" aria-selected={i === at} className={`nx-cmd-o ${i === at ? "is-on" : ""}`} onMouseMove={() => setAt(i)} onClick={() => go(h)}>
                      <span className={`nx-cmd-i ${h.group === "Kaju" ? "is-kaju" : ""}`}>{h.icon}</span><span className="nx-cmd-t"><span className="nx-cmd-l">{h.label}</span>{h.detail ? <small>{h.detail}</small> : null}</span>{i === at ? <CornerDownLeft size={13} className="nx-cmd-k" /> : <ArrowRight size={13} className="nx-cmd-k is-off" />}
                    </button>
                  ))}
                </div>
              ))}
              {!hits.length ? <p className="nx-cmd-none">Nothing matches “{q}”.</p> : null}
            </div>
            <p className="nx-cmd-f"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span>{live.org ? "Only records you can open are shown. Patient records are not searched here." : "Sample data"}</span></p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
