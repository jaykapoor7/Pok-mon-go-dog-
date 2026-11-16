"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowRight, Keyboard, Mic, Trash2 } from "lucide-react";
import { Shell } from "../Shell";
import { KajuVoice } from "@/kaju/voice/KajuVoice";
import { VOICE_OFFERED } from "@/kaju/voice/availability";
import { Kaju as Puppy } from "@/kaju/Kaju";
import { Sample } from "../ui";
import { toast } from "../kit";
import { MISSIONS } from "../fixtures";
import { useLive } from "../live";
import { Composer } from "../kaju/Composer";
import { Thread } from "../kaju/Thread";
import { PlanCard } from "../kaju/Plan";
import { Jobs } from "../kaju/Jobs";
import { MissionCard } from "../kaju/MissionCard";
import { Capabilities, Noticed } from "../kaju/Noticed";
import { Progress } from "../kaju/bits";
import { KajuPlaces } from "../kaju/Places";
import { useKajuPrefs, useKajuVocab, useMissionList } from "../kaju/data";
import { plannedFrom, useCapabilities, useNoticed, type Notice } from "../kaju/work";
import { appHref, useKaju, type Planned } from "../kaju/state";
import "../kaju/workspace.css";

/* Kaju's home: one place to say what should get done. A request becomes a plan that says who does each step; Kaju runs
   what it may, stops where a person decides, and keeps going across sessions. Beside it, what Kaju noticed in the
   organisation's own records and what it can use here, said plainly. Signed out, everything shown is labelled sample. */

export function Kaju() {
  const k = useKaju();
  const live = useLive();
  const router = useRouter();
  const org = live.org;
  const vocab = useKajuVocab(org?.org_id ?? null, org?.workspace ?? null);
  const missions = useMissionList(org?.org_id ?? null);
  const { prefs } = useKajuPrefs(live.signedIn);
  const { caps, failed } = useCapabilities(!!org);
  const notices = useNoticed(org, missions.rows, appHref);
  const [planned, setPlanned] = useState<Planned | null>(null);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [noModel, setNoModel] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  /* Words handed over from the command bar (?q=) are placed in the composer, not sent. */
  useEffect(() => { try { const q = new URLSearchParams(window.location.search).get("q"); if (q) window.dispatchEvent(new CustomEvent("sp:kaju-ask", { detail: { q } })); } catch {} }, []);
  const [voice, setVoice] = useState(false);

  const plan = useCallback(async (text: string, intent: Parameters<typeof k.plan>[2]) => {
    if (!org) return;
    setBusy(true); setNoModel(null);
    const r = await k.plan(org.org_id, text, intent);
    setBusy(false);
    if (r.ok) setPlanned(r.planned);
    else if (r.noModel) setNoModel(r.error);
    else toast({ text: r.error, tone: "bad" });
  }, [k, org]);
  const start = async (p: Planned) => {
    if (!org) return;
    setBusy(true); const r = await k.start(org.org_id, p); setBusy(false);
    if (r.id) { setStarted(true); setPlanned(null); missions.reload(); router.push(`/kaju/missions/${r.id}`); }
    else toast({ text: r.error ?? "Not started.", tone: "bad" });
  };
  const act = async (n: Notice) => {
    if (!org || n.action.kind === "link") return;
    setActing(n.id);
    if (n.action.kind === "intent") await plan(n.action.text, n.action.intent);
    else setPlanned(await plannedFrom(org.org_id, n.action.plan, n.action.text));
    setActing(null);
  };

  const rows = missions.rows ?? [];
  const open = rows.filter((m) => !["completed", "cancelled"].includes(m.state));
  const recent = [...open, ...rows.filter((m) => ["completed", "cancelled"].includes(m.state)).slice(0, Math.max(0, 4 - open.length))].slice(0, 6);
  const pose = busy || k.busy ? "thinking" : started ? "success" : planned ? "explaining" : "sitting";

  return (
    <Shell ws="kaju" crumb={["Kaju"]}>
      <div className="kj kj-home">
        <KajuPlaces />
        <div className="kj-home-grid">
          <div className="kj-main">
            <header className="kj-hero">
              <div className="kj-hero-pup" aria-hidden><Puppy state={pose} size={76} /></div>
              <div className="kj-hero-t">
                <p className="kj-eyebrow">{org ? <>Kaju · works inside {org.name}, with your permissions</> : <>Kaju · answers from public records until you sign in</>}{!live.signedIn && live.ready ? <Sample /> : null}</p>
                <h1 className="kj-h1">What do you want done?</h1>
                <p className="kj-sub">Describe the outcome. Kaju turns it into a plan that says who does each step, runs the parts it is allowed to, and stops wherever a person must decide.</p>
              </div>
              {VOICE_OFFERED ? <div className="kj-hero-v"><button type="button" className="nx-btn is-quiet is-keep" aria-pressed={voice} onClick={() => setVoice((v) => !v)}>{voice ? <><Keyboard size={15} aria-hidden />Type instead</> : <><Mic size={15} aria-hidden />Talk to Kaju</>}</button></div> : null}
            </header>

            {voice ? <div className="nx-kj-voice"><KajuVoice /></div> : <>
              <div className="kj-compose">
                <Composer vocab={vocab} predictive={prefs.predictive} busy={busy || k.busy} disabled={k.expired} autoFocus canPlan={!!org} modelPlanning={!!caps?.planning}
                  onAsk={(t) => { setNoModel(null); void k.ask(t); }} onPlan={(t, i) => void plan(t, i)} />
              </div>
              {noModel ? <p className="kj-nomodel" role="status">{noModel}</p> : null}
              <Jobs vocab={vocab} canPlan={!!org} busy={busy} onPlan={(t, i) => void plan(t, i)} intro={caps && !caps.planning ? "Kaju plans these jobs by fixed rules, no model needed:" : "Or start from one of Kaju's jobs:"} />

              <AnimatePresence>{planned ? <PlanCard key={planned.key} planned={planned} vocab={vocab} busy={busy} onStart={(p) => void start(p)} onDiscard={() => setPlanned(null)} /> : null}</AnimatePresence>

              {k.turns.length ? (
                <section className="kj-convo" aria-label="Conversation">
                  <Thread />
                  <p className="kj-quiet"><button type="button" className="nx-thread" onClick={k.clear}><Trash2 size={12} /> Clear this conversation</button> · It stays in this browser tab only.</p>
                </section>
              ) : null}
            </>}

            <section className="kj-sec" aria-labelledby="kj-m">
              <div className="kj-sec-h"><h2 id="kj-m">Missions</h2>{org && rows.length ? <Link href="/kaju/missions" className="kj-link">All missions<ArrowRight size={13} /></Link> : null}{!org ? <Sample /> : null}</div>
              {org ? (missions.rows === null ? <div className="kj-skel is-tall" aria-label="Reading" /> : recent.length ? (
                <ul className="kj-mcards">{recent.map((m) => <MissionCard key={m.id} m={m} />)}</ul>
              ) : <p className="kj-quiet">No missions yet. Say what you want done above, or start from one of Kaju&apos;s jobs. Each mission gets a workroom where you can watch it happen.</p>)
                : <ul className="kj-mcards">{MISSIONS.slice(0, 2).map((m) => (
                  <li key={m.id} className={`kj-mcard t-${m.tone}`}><Link href="/kaju/missions" className="kj-mcard-in">
                    <span className="kj-mcard-top"><span className={`kj-dot t-${m.tone}`} aria-hidden /><span className="kj-mcard-w">{m.state}</span></span>
                    <b className="kj-mcard-h">{m.title}</b>
                    <Progress steps={m.steps.map((s) => ({ state: s.state === "done" ? "done" : s.state === "wait" ? "waiting_approval" : s.state === "run" ? "running" : "todo" }))} />
                    <span className="kj-mcard-now">{m.steps.find((s) => s.state !== "done")?.text ?? m.meta}</span>
                  </Link></li>))}</ul>}
            </section>
          </div>

          <aside className="kj-side">
            <Noticed items={notices} sample={!org && live.ready} busy={acting} onAct={(n) => void act(n)} />
            <Capabilities items={caps?.items ?? null} failed={failed} orgId={org?.org_id ?? null} />
            <p className="kj-rules">Kaju reads only what you can see. It never makes clinical, laboratory, verification, payment or data-access decisions; those steps wait for the person with the authority.</p>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
