"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check as Tick, Hand, Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { Empty, Failed, Skeleton, errText } from "../kit";
import { MISSIONS, MISSIONS_DONE } from "../fixtures";
import { useLive } from "../live";
import { runMine, useMissionList, type MissionRow } from "../kaju/data";
import { Progress, StateDot, ago, missionWord } from "../kaju/bits";
import { nowLine } from "../kaju/MissionCard";
import { Workroom } from "../kaju/Workroom";
import { KajuPlaces } from "../kaju/Places";
import "../kaju/workspace.css";

/* Missions, Approvals and History: the person's own missions as a list, and the chosen one's workroom beside it (on a
   phone, the workroom opens on its own). Approving, editing, rejecting, retrying and cancelling call the database's own
   functions, which only the person who started the mission can use. */

type ViewId = "missions" | "approvals" | "history";
const TITLE: Record<ViewId, [string, string]> = {
  missions: ["Missions", "Work Kaju is doing for you. Each mission keeps going when this page is closed, and stops wherever a person decides."],
  approvals: ["Approvals", "Steps waiting for you: changes to several records, messages outside StrayPaw, and decisions only a person can make."],
  history: ["History", "Finished and cancelled missions, with every step, everything they made, and every decision kept."],
};
const inView = (v: ViewId, m: MissionRow) => v === "approvals" ? m.state === "waiting_person" || m.state === "blocked" : v === "history" ? m.state === "completed" || m.state === "cancelled" : !["completed", "cancelled"].includes(m.state);
const narrow = () => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;

function LiveMissions({ view }: { view: ViewId }) {
  const live = useLive();
  const router = useRouter();
  const sp = useSearchParams();
  const calm = useReducedMotion();
  const list = useMissionList(live.org?.org_id ?? null);
  const shown = (list.rows ?? []).filter((m) => inView(view, m));
  const sel = sp.get("m");
  const open = (list.rows ?? []).find((m) => m.id === sel) ?? (narrow() ? null : shown[0] ?? null);
  useEffect(() => { void runMine().then(() => list.reload()); /* run anything due while the person is here */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = (id: string) => { if (narrow()) router.push(`?m=${id}`, { scroll: true }); else router.replace(`?m=${id}`, { scroll: false }); };
  const [t, sub] = TITLE[view];
  return (
    <Shell ws="kaju" crumb={["Kaju", t]}>
      <div className="kj kj-list">
        <KajuPlaces />
        <div className={`kj-list-h ${sel ? "has-sel" : ""}`}><div><p className="kj-eyebrow">{live.org?.name}</p><h1 className="kj-h1 is-page">{t}</h1><p className="kj-sub">{sub}</p></div><Link href="/kaju" className="kj-btn is-quiet"><Plus size={14} />New mission</Link></div>
        {list.error ? <Failed error={errText(list.error)} retry={list.reload} /> : list.rows === null ? <Skeleton /> : !shown.length && !open ? <Empty title={view === "approvals" ? "Nothing is waiting for you" : view === "history" ? "No finished missions yet" : "No missions running"} hint={view === "missions" ? <>Say what you want done on Kaju&apos;s home, or in the Kaju panel on any page<span className="nx-keys"> (⌘J)</span>.</> : undefined} action={view !== "missions" ? <Link className="nx-btn is-quiet" href="/kaju/missions">All missions</Link> : <Link className="nx-btn" href="/kaju">Ask Kaju</Link>} /> : (
          <div className={`kj-runs ${sel ? "has-sel" : ""}`}>
            <ul className="kj-runlist" aria-label={t}>
              {shown.map((m) => { const [w] = missionWord(m.state); const steps = [...m.nx_mission_steps].sort((a, b) => a.position - b.position); return (
                <li key={m.id}><button type="button" className={open?.id === m.id ? "is-on" : ""} aria-current={open?.id === m.id ? "true" : undefined} onClick={() => choose(m.id)}>
                  <span className="kj-runlist-top"><StateDot state={m.state} /><span>{w}</span><time>{ago(m.updated_at)}</time></span>
                  <b>{m.title}</b>
                  <Progress steps={steps} />
                  <small>{nowLine(m, steps)}</small>
                </button></li>); })}
              {open && !shown.some((m) => m.id === open.id) ? <li className="kj-quiet">The open mission is listed under {inView("history", open) ? <Link href={`/kaju/history?m=${open.id}`}>History</Link> : <Link href={`/kaju/missions?m=${open.id}`}>Missions</Link>}.</li> : null}
            </ul>
            <div className="kj-runroom">
              {open ? <button type="button" className="kj-back is-m" onClick={() => router.replace(`/kaju/${view}`)}><ArrowLeft size={14} />{t}</button> : null}
              <AnimatePresence mode="wait">{open ? <motion.div key={open.id} initial={calm ? { opacity: 0 } : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2, ease: [0.2, 0.7, 0.2, 1] }}><Workroom id={open.id} embedded onChanged={list.reload} /></motion.div> : null}</AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function SampleMissions({ view }: { view: ViewId }) {
  const [t, sub] = TITLE[view];
  const rows = view === "history" ? MISSIONS_DONE : MISSIONS.filter((m) => view !== "approvals" || m.act);
  return (
    <Shell ws="kaju" crumb={["Kaju", t]}>
      <div className="kj kj-list">
        <KajuPlaces />
        <div className="kj-list-h"><div><p className="kj-eyebrow">Sample missions<Sample /></p><h1 className="kj-h1 is-page">{t}</h1><p className="kj-sub">{sub}</p></div><Link href="/try" className="kj-btn" title="Opens the live demo, where this works">Try a live mission</Link></div>
        <div className="nx-runs-l is-flat">{rows.map((m) => <article key={m.id} className="nx-run kj-samplerun"><div className="nx-run-h"><div><h2>{m.title}</h2><p className="nx-t3">{m.meta}</p></div><Chip tone={m.tone}>{m.state}</Chip></div>
          <ol className="nx-run-steps">{m.steps.map((s, i) => <li key={i} className={`is-${s.state === "done" ? "done" : s.state === "wait" ? "waiting_approval" : s.state === "run" ? "running" : "todo"}`}><span className={`nx-rs ${s.state === "done" ? "is-done" : s.state === "wait" ? "is-wait" : ""}`}>{s.state === "done" ? <Tick size={11} strokeWidth={3} /> : s.state === "wait" ? <Hand size={12} /> : null}</span><div className="nx-run-s"><b>{s.text}</b></div></li>)}</ol></article>)}</div>
      </div>
    </Shell>
  );
}

export function Missions({ view }: { view: ViewId }) {
  const live = useLive();
  if (!live.ready) return <Shell ws="kaju" crumb={["Kaju", TITLE[view][0]]}><div className="nx-page"><Skeleton /></div></Shell>;
  if (!live.org) return <SampleMissions view={view} />;
  return <Suspense fallback={<Shell ws="kaju" crumb={["Kaju", TITLE[view][0]]}><div className="nx-page"><Skeleton /></div></Shell>}><LiveMissions view={view} /></Suspense>;
}

/** One mission's workroom on its own page: /kaju/missions/[id]. */
export function MissionRoomPage({ id }: { id: string }) {
  const live = useLive();
  useEffect(() => { void runMine(); }, []);
  return (
    <Shell ws="kaju" crumb={["Kaju", "Missions"]}>
      <div className="kj kj-roompage">
        {!live.ready ? <Skeleton /> : !live.org ? (
          <div className="kj-room-empty"><p><b>Missions are private to the person who started them.</b> Sign in to see yours, or try a live mission in the demo.</p><Link className="kj-btn" href="/try">Try a live mission</Link></div>
        ) : <Workroom id={id} />}
      </div>
    </Shell>
  );
}
