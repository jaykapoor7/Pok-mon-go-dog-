"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Share2 } from "lucide-react";
import { Shell } from "../Shell";
import { Sample, TrustChip, initials } from "../ui";
import { ANIMALS } from "../fixtures";
import { AnimalBody } from "./AnimalBody";

const TABS = ["Summary", "Interventions", "Cases", "Evidence", "Activity"];

export function AnimalRecord({ id }: { id: string }) {
  const a = ANIMALS.find((x) => x.id === id);
  const [tab, setTab] = useState("Summary");
  const calm = useReducedMotion();
  if (!a) return <Shell crumb={["Animals", id]}><div className="nx-page"><h1 className="nx-h1">No animal with this ID</h1><p className="nx-sub">It may have been removed, or the link is wrong.</p><p style={{ marginTop: 16 }}><Link href="/next/ngo/animals" className="nx-btn is-quiet">Back to Animals</Link></p></div></Shell>;
  return (
    <Shell crumb={["Animals", `${a.id}`]}>
      <div className="nx-rec-h">
        <div className="nx-rec-t">
          <span className="nx-rec-av">{initials(a.species)}</span>
          <div><h1><span className="num">{a.id}</span> · {a.name}<Sample /></h1><p>{a.ward} · Last seen {a.last} <TrustChip trust={a.trust} /></p></div>
          <div className="nx-rec-acts"><button type="button" className="nx-btn is-quiet"><Share2 size={13} />Share</button><button type="button" className="nx-btn"><Plus size={14} />Add encounter</button></div>
        </div>
      </div>
      <div className="nx-tabs" role="tablist" aria-label="Record sections">
        {TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`nx-tab ${tab === t ? "is-on" : ""}`} onClick={() => setTab(t)}>{t}{tab === t ? <motion.span layoutId="nx-tab" className="nx-tab-line" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 620, damping: 46 }} /> : null}</button>)}
      </div>
      {tab === "Summary" ? <AnimalBody a={a} /> : <div className="nx-page"><p className="nx-sub">{tab} is not built yet. Summary shows the full record.</p></div>}
    </Shell>
  );
}
