"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MiniWindow, ProgrammeUi, QueueUi, AuditUi } from "@/sp4/home/ui";
import "@/sp4/home/home4.css";

/* The right-hand panel of the sign-in screens: StrayPaw blue, a "What's
   new" pill, one real product update at a time, and a product view.
   Only shipped changes are listed (each is in the repository history). */
const NEWS = [
  { t: "Kaju in every workspace", d: "Search your records, find missing evidence and prepare cases, notes and follow-ups. A person confirms every change.", href: "/ai", ui: <MiniWindow title="Home · Today" label="the operator's daily queue"><QueueUi /></MiniWindow> },
  { t: "Programmes on one record", d: "Programme figures carry their method and source, and published research datasets are kept apart from programme work.", href: "/abc-operations", ui: <MiniWindow title="Programmes · ABC drive" label="programme overview" active={5}><ProgrammeUi /></MiniWindow> },
  { t: "History on every case", d: "Every change is dated and named, including changes prepared with Kaju and confirmed by a person.", href: "/security", ui: <MiniWindow title="Case SP-1067 · History" label="a case history"><AuditUi /></MiniWindow> },
];

export function WhatsNew() {
  const [i, setI] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => { setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  useEffect(() => {
    if (still) return;
    const t = window.setTimeout(() => setI((n) => (n + 1) % NEWS.length), 7000);
    return () => window.clearTimeout(t);
  }, [i, still]);
  const n = NEWS[i];
  return (
    <aside className="s4l-right" aria-label="What's new in StrayPaw">
      <span className="s4l-pill">What&apos;s new in StrayPaw</span>
      <div key={`c${i}`} className="s4l-news">
        <h2>{n.t}</h2>
        <p>{n.d}</p>
        <Link href={n.href}>Learn more</Link>
      </div>
      <div key={`u${i}`} className="s4l-shot">{n.ui}</div>
      <div className="s4l-dots" role="tablist" aria-label="Updates">
        {NEWS.map((x, k) => <button key={x.t} type="button" role="tab" aria-selected={k === i} aria-label={x.t} onClick={() => { setI(k); setStill(true); }} />)}
      </div>
    </aside>
  );
}
