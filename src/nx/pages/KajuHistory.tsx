"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Check as Tick, Hand } from "lucide-react";
import { isOpen } from "@/lib/kaju/jobs";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { Empty, Failed, Skeleton, errText } from "../kit";
import { MISSIONS_DONE } from "../fixtures";
import { useLive } from "../live";
import { runMine, useMissionList } from "../kaju/data";
import { JobRow, useOpenJob } from "../kaju/JobCard";
import { KajuHistory as Conversations } from "../kaju/History";
import { KajuPlaces } from "../kaju/Places";
import "../kaju/workspace.css";
import "../kaju/jobs.css";

/* Kaju's History: the person's saved conversations, and the work Kaju finished or stopped for them, newest first. Each
   opens the same card as everywhere else, over this page, with every step, everything it made and every decision kept.
   Work still in progress is not here: it shows where it was asked, on its record, in Needs you and on Kaju's home. */

const SUB = "Your conversations with Kaju, and the work it finished or stopped, with every step, everything it made and every decision kept.";

function LiveHistory() {
  const live = useLive();
  const openJob = useOpenJob();
  const list = useMissionList(live.org?.org_id ?? null);
  const done = (list.rows ?? []).filter((m) => !isOpen(m.state));
  const open = (list.rows ?? []).length - done.length;
  useEffect(() => { void runMine().then(() => list.reload()); /* run anything due while the person is here */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Shell ws="kaju" crumb={["Kaju", "History"]}>
      <div className="kj kj-list">
        <KajuPlaces />
        <div className="kj-list-h"><div><p className="kj-eyebrow">{live.org?.name}</p><h1 className="kj-h1 is-page">History</h1><p className="kj-sub">{SUB}</p></div></div>
        <div className="kj-sec" style={{ marginTop: 24 }}><Conversations /></div>
        <section className="kj-sec" aria-labelledby="kj-done">
          <div className="kj-sec-h"><h2 id="kj-done">Finished work</h2>{done.length ? <span className="kj-count">{done.length}</span> : null}</div>
          {list.error ? <Failed error={errText(list.error)} retry={list.reload} /> : list.rows === null ? <Skeleton /> : !done.length ? (
            <Empty title="Nothing finished yet" hint={<>Say what you want done on Kaju&apos;s home, or in the Kaju panel on any page<span className="nx-keys"> (⌘J)</span>. You see the plan before anything starts.</>} action={<Link className="nx-btn" href="/kaju">Ask Kaju</Link>} />
          ) : (
            <div className="kjb-group"><ul aria-label="Finished work">{done.map((m) => <li key={m.id}><JobRow m={m} onOpen={openJob} /></li>)}</ul></div>
          )}
          {open ? <p className="kjb-more">{open === 1 ? "1 piece of work is" : `${open} pieces of work are`} still in progress: see <Link className="kj-link" href="/kaju">Kaju&apos;s work</Link>.</p> : null}
        </section>
      </div>
    </Shell>
  );
}

/* Signed out: the sample organisation's finished work, labelled sample. */
function SampleHistory() {
  return (
    <Shell ws="kaju" crumb={["Kaju", "History"]}>
      <div className="kj kj-list">
        <KajuPlaces />
        <div className="kj-list-h"><div><p className="kj-eyebrow">Sample history<Sample /></p><h1 className="kj-h1 is-page">History</h1><p className="kj-sub">{SUB}</p></div><Link href="/try" className="kj-btn" title="Opens the live demo, where this works">Try it live</Link></div>
        <div className="nx-runs-l is-flat">{MISSIONS_DONE.map((m) => <article key={m.id} className="nx-run kj-samplerun"><div className="nx-run-h"><div><h2>{m.title}</h2><p className="nx-t3">{m.meta}</p></div><Chip tone={m.tone}>{m.state}</Chip></div>
          <ol className="nx-run-steps">{m.steps.map((s, i) => <li key={i} className={`is-${s.state === "done" ? "done" : s.state === "wait" ? "waiting_approval" : s.state === "run" ? "running" : "todo"}`}><span className={`nx-rs ${s.state === "done" ? "is-done" : s.state === "wait" ? "is-wait" : ""}`}>{s.state === "done" ? <Tick size={11} strokeWidth={3} /> : s.state === "wait" ? <Hand size={12} /> : null}</span><div className="nx-run-s"><b>{s.text}</b></div></li>)}</ol></article>)}</div>
      </div>
    </Shell>
  );
}

export function KajuHistoryPage() {
  const live = useLive();
  if (!live.ready) return <Shell ws="kaju" crumb={["Kaju", "History"]}><div className="nx-page"><Skeleton /></div></Shell>;
  if (!live.org) return <SampleHistory />;
  return <LiveHistory />;
}
