"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, Sparkles, X } from "lucide-react";
import { useLive } from "../live";
import { toast } from "../kit";
import { Composer } from "./Composer";
import { PlanCard, Thread } from "./Thread";
import { useKajuPrefs, useKajuVocab } from "./data";
import { useKaju, type Planned } from "./state";
import "./kaju.css";

/* Compact Kaju: summoned from any page (the Kaju button or ⌘J), aware of the page it was opened on, and sharing its
   conversation with the full Kaju page, so expanding loses nothing. It never covers a page by itself: it opens only
   when asked and closes with Escape. */

export function KajuDock({ crumb }: { crumb: string }) {
  const k = useKaju();
  const live = useLive();
  const router = useRouter();
  const calm = useReducedMotion();
  const org = live.org;
  const vocab = useKajuVocab(org?.org_id ?? null, org?.workspace ?? null);
  const { prefs } = useKajuPrefs();
  const [planned, setPlanned] = useState<Planned | null>(null);
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const before = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (k.open) { before.current = document.activeElement as HTMLElement | null; window.setTimeout(() => panel.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(), 30); }
    else {
      // After the panel has left the page; with nothing to go back to, the page's content takes focus.
      const back = before.current; before.current = null;
      if (!back) return; // never opened: nothing to give back
      window.setTimeout(() => (back && back !== document.body && back.isConnected ? back : document.getElementById("nx-main"))?.focus?.({ preventScroll: true }), 60);
    }
  }, [k.open]);
  const plan = async (text: string, intent: Parameters<typeof k.plan>[2]) => {
    if (!org) { toast({ text: "Sign in to an organisation to hand Kaju work.", tone: "bad" }); return; }
    setBusy(true); const r = await k.plan(org.org_id, text, intent); setBusy(false);
    if (r.ok) setPlanned(r.planned); else toast({ text: r.error, tone: "bad" });
  };
  const start = async () => {
    if (!org || !planned) return;
    setBusy(true); const r = await k.start(org.org_id, planned); setBusy(false);
    if (r.id) { setPlanned(null); k.setOpen(false); toast({ text: "Mission started. It runs as you and stops where it needs you.", tone: "ok", href: `/kaju/missions?m=${r.id}`, hrefLabel: "Open" }); }
    else toast({ text: r.error ?? "Not started.", tone: "bad" });
  };
  return (
    <AnimatePresence>
      {k.open ? (
        <motion.div ref={panel} key="dock" className="nx-dockk" role="dialog" aria-label="Kaju" layoutId={calm ? undefined : "kaju-surface"}
          initial={calm ? { opacity: 0 } : { opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={calm ? { opacity: 0 } : { opacity: 0, y: 12, scale: .98 }}
          transition={calm ? { duration: .1 } : { type: "spring", stiffness: 520, damping: 42 }}
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); k.setOpen(false); } }}>
          <div className="nx-dockk-h">
            <span className="nx-ka-i"><Sparkles size={13} /></span><b>Kaju</b>
            {crumb ? <span className="nx-dockk-ctx" title="Kaju knows which page you opened it on">On {crumb}</span> : null}
            <span style={{ marginLeft: "auto" }} />
            <button type="button" className="nx-ib" aria-label="Open full Kaju" title="Open full Kaju" onClick={() => { k.setOpen(false); router.push("/kaju"); }}><Maximize2 size={15} /></button>
            <button type="button" className="nx-ib" aria-label="Close Kaju" onClick={() => k.setOpen(false)}><X size={16} /></button>
          </div>
          <div className="nx-dockk-b">
            {!k.turns.length && !planned ? <p className="nx-t3" style={{ padding: "4px 2px 8px" }}>{org ? `Ask about ${org.name}'s records, or hand over work. Kaju shows a plan before anything starts.` : <>Sign in to ask about your organisation. <Link href="/try">Try the live demo</Link>.</>}</p> : null}
            <Thread compact />
            {planned ? <PlanCard planned={planned} busy={busy} onStart={start} onDiscard={() => setPlanned(null)} /> : null}
          </div>
          <Composer compact predictive={prefs.predictive} vocab={vocab} busy={busy || k.busy} disabled={k.expired} onAsk={(t) => void k.ask(t)} onPlan={(t, i) => void plan(t, i)} canPlan={!!org} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
