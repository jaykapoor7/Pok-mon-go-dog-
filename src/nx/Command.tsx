"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ClipboardList, CornerDownLeft, Hash, PawPrint, Search, Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { ANIMALS, CASES, CHANNELS } from "./fixtures";
import { PAGES } from "./nav";
import { useChannels, useLive } from "./live";

/* The command bar. One box finds a page, a channel, an animal or a case, or hands the words to Kaju.
   Records come from the signed-in organisation only, through the same row-level security as every page.
   Clinical records are not searched here: a patient is found from inside the facility's own register. */

type Hit = { id: string; group: "Pages" | "Channels" | "Animals" | "Cases" | "Kaju"; label: string; detail?: string; href: string; icon: React.ReactNode };
const esc = (s: string) => s.replace(/[%_\\,()]/g, " ").trim();

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
  const chans = useChannels(live.org?.org_id ?? null);
  useEffect(() => { if (open) { setQ(""); setAt(0); setRecords([]); window.setTimeout(() => box.current?.focus(), 10); } }, [open]);

  /* Records: sample rows when signed out; otherwise the NGO's own animals and cases, asked for once the person pauses. */
  useEffect(() => {
    const n = q.trim();
    if (!open || n.length < 2) { setRecords([]); return; }
    if (!live.org) {
      const l = n.toLowerCase();
      setRecords([
        ...ANIMALS.filter((a) => `${a.id} ${a.name} ${a.ward}`.toLowerCase().includes(l)).slice(0, 5).map((a): Hit => ({ id: a.id, group: "Animals", label: a.name, detail: `${a.id} · ${a.ward}`, href: `/next/ngo/animals/${a.id}`, icon: <PawPrint size={14} /> })),
        ...CASES.filter((c) => `${c.code} ${c.title} ${c.place}`.toLowerCase().includes(l)).slice(0, 5).map((c): Hit => ({ id: c.id, group: "Cases", label: c.title, detail: `${c.code} · ${c.place}`, href: "/next/ngo/cases", icon: <ClipboardList size={14} /> })),
      ]);
      return;
    }
    const db = getSupabase();
    if (!db || !ngo) { setRecords([]); return; }
    const term = esc(n);
    if (!term) { setRecords([]); return; }
    let alive = true;
    setBusy(true);
    const t = window.setTimeout(async () => {
      const like = `%${term}%`;
      const [d, c] = await Promise.all([
        db.from("dogs").select("id,name,code,zone").eq("ngo_id", ngo.org_id).or(`name.ilike.${like},code.ilike.${like},zone.ilike.${like}`).limit(5),
        db.from("cases").select("id,title,case_code,zone").eq("ngo_id", ngo.org_id).or(`title.ilike.${like},case_code.ilike.${like},zone.ilike.${like}`).limit(5),
      ]);
      if (!alive) return;
      setBusy(false);
      setRecords([
        ...((d.data ?? []) as { id: string; name: string | null; code: string | null; zone: string | null }[]).map((x): Hit => ({ id: x.id, group: "Animals", label: x.name || "Unnamed", detail: [x.code, x.zone].filter(Boolean).join(" · "), href: `/next/ngo/animals/${x.id}`, icon: <PawPrint size={14} /> })),
        ...((c.data ?? []) as { id: string; title: string | null; case_code: string | null; zone: string | null }[]).map((x): Hit => ({ id: x.id, group: "Cases", label: x.title || "Untitled case", detail: [x.case_code && x.case_code.length > 14 ? `${x.case_code.slice(0, 4)}…${x.case_code.slice(-6)}` : x.case_code, x.zone].filter(Boolean).join(" · "), href: `/ngo/cases/${x.id}`, icon: <ClipboardList size={14} /> })),
      ]);
    }, 180);
    return () => { alive = false; window.clearTimeout(t); setBusy(false); };
  }, [q, open, live.org, ngo]);

  const hits = useMemo<Hit[]>(() => {
    const l = q.trim().toLowerCase();
    const office = live.org?.source === "review_office", lab = live.org?.kind === "laboratory";
    const pages = PAGES.filter((p) => (!p.office || !live.org || office) && (!p.lab || !live.org || lab)).filter((p) => !l || `${p.label} ${p.ws}`.toLowerCase().includes(l)).slice(0, l ? 6 : 8)
      .map((p): Hit => ({ id: p.href + p.ws, group: "Pages", label: p.label, detail: p.ws, href: p.href, icon: <p.icon size={14} /> }));
    const chanNames = live.org ? (chans.rows ?? []).filter((c) => c.kind !== "dm").map((c) => c.name) : CHANNELS.map((c) => c.name);
    const channels = chanNames.filter((c) => !l || c.includes(l)).slice(0, 4).map((c): Hit => ({ id: `#${c}`, group: "Channels", label: `#${c}`, href: `/next/channels/${c}`, icon: <Hash size={14} /> }));
    const kaju: Hit[] = l ? [{ id: "kaju", group: "Kaju", label: `Ask Kaju: “${q.trim()}”`, detail: "Nothing is sent until you press Run", href: `/next/kaju?q=${encodeURIComponent(q.trim())}`, icon: <Sparkles size={14} /> }] : [];
    return [...records, ...pages, ...channels, ...kaju];
  }, [q, records, live.org, chans.rows]);

  useEffect(() => { setAt(0); }, [q]);
  const go = (h: Hit | undefined) => { if (!h) return; onClose(); router.push(h.href); };
  const groups = hits.reduce<{ name: Hit["group"]; items: { h: Hit; i: number }[] }[]>((acc, h, i) => { const g = acc.find((x) => x.name === h.group); if (g) g.items.push({ h, i }); else acc.push({ name: h.group, items: [{ h, i }] }); return acc; }, []);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div key="cmd" className="nx-cmd-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: calm ? 0 : .12 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label="Search and commands" className="nx-cmd" onMouseDown={(e) => e.stopPropagation()}
            initial={calm ? false : { opacity: 0, y: -8, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={calm ? { opacity: 0 } : { opacity: 0, y: -6, scale: .99 }} transition={{ type: "spring", stiffness: 520, damping: 40, mass: .7 }}>
            <label className="nx-cmd-in"><Search size={16} />
              <input ref={box} value={q} onChange={(e) => setQ(e.target.value)} placeholder={live.org ? "Search pages, channels, animals and cases" : "Search the sample workspace"} aria-label="Search" role="combobox" aria-expanded aria-controls="nx-cmd-list" aria-activedescendant={hits[at] ? `nx-cmd-${at}` : undefined}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { e.preventDefault(); onClose(); }
                  else if (e.key === "ArrowDown") { e.preventDefault(); setAt((a) => Math.min(hits.length - 1, a + 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setAt((a) => Math.max(0, a - 1)); }
                  else if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); go(hits[at]); }
                }} />
              {busy ? <span className="nx-cmd-busy" aria-hidden /> : <kbd>Esc</kbd>}
            </label>
            <div className="nx-cmd-list" id="nx-cmd-list" role="listbox" aria-label="Results">
              {groups.map((g) => (
                <div key={g.name} role="group" aria-label={g.name}>
                  <p className="nx-cmd-g">{g.name}</p>
                  {g.items.map(({ h, i }) => (
                    <button key={h.id} id={`nx-cmd-${i}`} type="button" role="option" aria-selected={i === at} className={`nx-cmd-o ${i === at ? "is-on" : ""}`} onMouseMove={() => setAt(i)} onClick={() => go(h)}>
                      <span className={`nx-cmd-i ${h.group === "Kaju" ? "is-kaju" : ""}`}>{h.icon}</span><span className="nx-cmd-l">{h.label}</span>{h.detail ? <small>{h.detail}</small> : null}{i === at ? <CornerDownLeft size={13} className="nx-cmd-k" /> : <ArrowRight size={13} className="nx-cmd-k is-off" />}
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
