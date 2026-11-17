"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { ArrowUpRight, History as Clock, Keyboard, Maximize2, Mic, Plus, X } from "lucide-react";
import { KajuHistory, KeepingNote } from "./History";
import { startersFor } from "./here";
import { KajuFace } from "@/kaju/Kaju";
import { useLive } from "../live";
import { toast } from "../kit";
import { Composer } from "./Composer";
import { Thread } from "./Thread";
import { PlanCard } from "./Plan";
import { Jobs } from "./Jobs";
import { LiveMissionCard } from "./MissionCard";
import { useKajuPrefs, useKajuVocab } from "./data";
import { useCapabilities } from "./work";
import { useKaju, type Planned } from "./state";
import { KajuVoice } from "@/kaju/voice/KajuVoice";
import { VOICE_OFFERED } from "@/kaju/voice/availability";
import "./kaju.css";
import "./workspace.css";

/* Compact Kaju: summoned from any page (the Kaju button or ⌘J), aware of the page it was opened on, and sharing its
   conversation with the full Kaju page, so expanding loses nothing. The same plan card and jobs as the home, and a
   mission it starts stays in view, live. On a phone it is a sheet that a downward swipe puts away. It never covers a
   page by itself: it opens only when asked and closes with Escape. */

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function KajuDock({ crumb }: { crumb: string }) {
  const k = useKaju();
  const router = useRouter();
  const calm = useReducedMotion();
  const drag = useDragControls();
  const [planned, setPlanned] = useState<Planned | null>(null);
  const [startedId, setStartedId] = useState<string | null>(null);
  const [phone, setPhone] = useState(false);
  // Talk or type: the same Kaju, in the same panel. Closing the panel ends any conversation.
  const [voice, setVoice] = useState(false);
  const [past, setPast] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const before = useRef<HTMLElement | null>(null);
  useEffect(() => { const q = window.matchMedia("(max-width: 640px)"); const on = () => setPhone(q.matches); on(); q.addEventListener("change", on); return () => q.removeEventListener("change", on); }, []);
  useEffect(() => {
    if (k.open) { before.current = document.activeElement as HTMLElement | null; window.setTimeout(() => panel.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(), 30); }
    else {
      // After the panel has left the page; with nothing to go back to, the page's content takes focus.
      const back = before.current; before.current = null;
      if (!back) return; // never opened: nothing to give back
      window.setTimeout(() => (back && back !== document.body && back.isConnected ? back : document.getElementById("nx-main"))?.focus?.({ preventScroll: true }), 60);
    }
  }, [k.open]);
  const close = () => k.setOpen(false);
  return (
    <AnimatePresence>
      {k.open && phone ? <motion.div key="scrim" className="kj-scrim" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} onClick={close} /> : null}
      {k.open ? (
        <motion.div ref={panel} key="dock" className="nx-dockk kj-dock" role="dialog" aria-label="Kaju"
          initial={calm ? { opacity: 0 } : phone ? { y: "100%" } : { opacity: 0, y: 16, scale: .98 }} animate={calm ? { opacity: 1 } : phone ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }} exit={calm ? { opacity: 0 } : phone ? { y: "100%" } : { opacity: 0, y: 12, scale: .98 }}
          transition={calm ? { duration: .1 } : phone ? { duration: .26, ease: EASE } : { type: "spring", stiffness: 520, damping: 42 }}
          drag={phone && !calm ? "y" : false} dragControls={drag} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: .7 }}
          onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) close(); }}
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}>
          <div className="kj-grab" onPointerDown={(e) => { if (phone) drag.start(e); }} aria-hidden><span /></div>
          <div className="nx-dockk-h">
            <span className="kj-dock-face"><KajuFace size={22} /></span><b>Kaju</b>
            {crumb ? <span className="nx-dockk-ctx" title="Kaju knows which page you opened it on">On {crumb}</span> : null}
            <span style={{ marginLeft: "auto" }} />
            {k.keeping === "on" ? <button type="button" className={`nx-ib${past ? " is-on" : ""}`} aria-pressed={past} aria-label="Your conversations" title="Your conversations" onClick={() => { setVoice(false); setPast((v) => !v); }}><Clock size={15} /></button> : null}
            {VOICE_OFFERED ? <button type="button" className={`nx-ib${voice ? " is-on" : ""}`} aria-pressed={voice} aria-label={voice ? "Back to typing" : "Talk to Kaju"} title={voice ? "Back to typing" : "Talk to Kaju"} onClick={() => setVoice((v) => !v)}>
              {voice ? <Keyboard size={15} /> : <Mic size={15} />}
            </button> : null}
            <button type="button" className="nx-ib" aria-label="Open full Kaju" title="Open full Kaju" onClick={() => { close(); router.push("/kaju"); }}><Maximize2 size={15} /></button>
            <button type="button" className="nx-ib" aria-label="Close Kaju" onClick={close}><X size={16} /></button>
          </div>
          {voice ? <div className="nx-dockk-b is-voice"><KajuVoice compact /></div>
            : past ? <div className="nx-dockk-b">
                <p className="kj-quiet" style={{ marginBottom: 8 }}><button type="button" className="nx-thread" onClick={() => { k.clear(); setPast(false); }}><Plus size={12} /> New conversation</button></p>
                <KajuHistory title={null} onOpened={() => setPast(false)} />
                {k.history && !k.history.length ? <p className="kj-quiet">No saved conversations yet. What you ask here is kept for you.</p> : null}
              </div>
            : <DockBody planned={planned} setPlanned={setPlanned} startedId={startedId} setStartedId={setStartedId} />}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** The panel's contents, read only while it is open: names for the composer, the person's limits, what Kaju can use. */
function DockBody({ planned, setPlanned, startedId, setStartedId }: { planned: Planned | null; setPlanned: (p: Planned | null) => void; startedId: string | null; setStartedId: (id: string | null) => void }) {
  const k = useKaju();
  const live = useLive();
  const org = live.org;
  const vocab = useKajuVocab(org?.org_id ?? null, org?.workspace ?? null);
  const { prefs } = useKajuPrefs(live.signedIn);
  const { caps } = useCapabilities(!!org);
  const [busy, setBusy] = useState(false);
  const [noModel, setNoModel] = useState<string | null>(null);
  const plan = async (text: string, intent: Parameters<typeof k.plan>[2]) => {
    if (!org) { toast({ text: "Sign in to an organisation to hand Kaju work.", tone: "bad" }); return; }
    setBusy(true); setNoModel(null); setStartedId(null); const r = await k.plan(org.org_id, text, intent); setBusy(false);
    if (r.ok) setPlanned(r.planned); else if (r.noModel) setNoModel(r.error); else toast({ text: r.error, tone: "bad" });
  };
  const start = async (p: Planned) => {
    if (!org) return;
    setBusy(true); const r = await k.start(org.org_id, p); setBusy(false);
    if (r.id) { setPlanned(null); setStartedId(r.id); }
    else toast({ text: r.error ?? "Not started.", tone: "bad" });
  };
  const empty = !k.turns.length && !planned && !startedId;
  const here = org ? startersFor(k.page.path) : [];
  return (
    <>
      <div className="nx-dockk-b">
        {empty ? <p className="kj-dock-intro">{org ? `Ask about ${org.name}'s records, or say what you want done. Kaju shows the plan, and who does each step, before anything starts.` : <>Sign in to ask about your organisation. <Link href="/try">Try the live demo</Link>.</>}</p> : null}
        {here.length && !k.turns.length ? <div className="kj-here" role="group" aria-label={`For ${k.page.label ?? "this record"}`}>
          <span className="kj-here-l">For {k.page.label ?? "this record"}</span>
          {here.map((h) => <button key={h.label} type="button" className="nx-chipbtn" disabled={k.busy || k.expired}
            onClick={() => { if (h.send) void k.ask(h.text); else window.dispatchEvent(new CustomEvent("sp:kaju-ask", { detail: { q: h.text } })); }}>{h.label}</button>)}
        </div> : null}
        {empty && org && !here.length ? <Jobs vocab={vocab} canPlan busy={busy} compact onPlan={(t, i) => void plan(t, i)} /> : null}
        <Thread compact />
        {k.turns.length ? <p className="kj-quiet" style={{ marginTop: 6 }}><button type="button" className="nx-thread" onClick={k.clear}><Plus size={12} /> New</button> · <KeepingNote /></p> : null}
        {noModel ? <p className="kj-nomodel" role="status">{noModel}</p> : null}
        <AnimatePresence>{planned ? <PlanCard key={planned.key} planned={planned} vocab={vocab} busy={busy} compact onStart={(p) => void start(p)} onDiscard={() => setPlanned(null)} /> : null}</AnimatePresence>
        {startedId ? (
          <motion.div className="kj-dock-started" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22, ease: EASE }}>
            <p className="kj-eyebrow">Started. It runs as you and stops where it needs a person.</p>
            <LiveMissionCard id={startedId} />
            <Link href={`/kaju/missions/${startedId}`} className="kj-link" onClick={() => k.setOpen(false)}>Open the workroom<ArrowUpRight size={13} /></Link>
          </motion.div>
        ) : null}
      </div>
      <Composer compact placeholder="Ask, or say what you want done" predictive={prefs.predictive} vocab={vocab} busy={busy || k.busy} disabled={k.expired} canPlan={!!org} modelPlanning={!!caps?.planning}
        onAsk={(t) => { setNoModel(null); void k.ask(t); }} onPlan={(t, i) => void plan(t, i)} />
    </>
  );
}
