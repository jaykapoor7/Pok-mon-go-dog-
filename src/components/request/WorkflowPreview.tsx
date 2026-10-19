"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, History, MapPin, UserRound, Inbox } from "lucide-react";
import { DEFAULT_TRIAGE, STATUS_META } from "@/lib/register/taxonomy";
import { PageBrief } from "@/sp/ui";
import { useDemo, type DemoView } from "./DemoProvider";

export const DEMO_VIEWS: { key: DemoView; title: string }[] = [{ key: "queue", title: "Review queue" }, { key: "case", title: "Case details" }, { key: "history", title: "Animal history" }, { key: "area", title: "Geographic area" }];

/** Reuses the operational record ledger and vocabulary; never imports a write action. */
export function WorkflowPreview({ view, setView, map, prefix = "example" }: { view: DemoView; setView: (view: DemoView) => void; map?: ReactNode; prefix?: string }) {
  const { demo, change } = useDemo();
  const [careInfo, setCareInfo] = useState(false);
  const stages = [
    { icon: Inbox, state: demo.sent ? "Received" : "Not sent" },
    { icon: ClipboardList, state: demo.assigned ? "Assigned in demo" : demo.accepted ? "Accepted in demo" : "Pending review" },
    { icon: History, state: "Not linked" },
    { icon: MapPin, state: "Separate public data" },
  ];
  return <div className="lp-workspace" data-ui>
    <header className="lp-workspace-head"><span><ClipboardList size={18} aria-hidden /><b>Example workspace</b></span><span>Demo only</span></header>
    <div className="lp-view-nav depth-trail" role="group" aria-label="Example record views">{DEMO_VIEWS.map((v, i) => { const Icon = stages[i].icon; return <div className="depth-trail-stop" key={v.key}><button type="button" aria-describedby={`${prefix}-stage-${i}`} aria-pressed={view === v.key} aria-controls={`${prefix}-panel`} onClick={() => setView(v.key)}><Icon size={20} aria-hidden /><b>{v.title}</b></button><small id={`${prefix}-stage-${i}`}>{stages[i].state}</small></div>; })}</div>
    {demo.sent && <div className="depth-example-identity"><span>EXAMPLE</span><b>Report near the bus stand</b><small>{demo.condition}</small></div>}
    <div className="lp-panel" id={`${prefix}-panel`}>
      {view === "queue" && <><div className="lp-panel-title"><h3>Review queue</h3><span>{demo.sent ? "1 example" : "No example sent"}</span></div>{demo.sent ? <><button className="lp-queue-row" type="button" onClick={() => setView("case")}><span className="lp-queue-dot" aria-hidden /><span><b>Report near the bus stand</b><small>EXAMPLE · {demo.condition} · {DEFAULT_TRIAGE[demo.condition]}</small></span><span>{demo.accepted ? "Accepted in demo" : "Awaiting review"}<ArrowRight size={18} aria-hidden /></span></button><blockquote className="depth-intake-note">{demo.observation}</blockquote><div className="depth-intake-state"><span>Ownership <b>{demo.accepted ? "Example organisation" : "Pending acceptance"}</b></span><span>Care <b>None recorded</b></span></div></> : <div className="lp-empty"><ClipboardList size={34} aria-hidden /><b>The next report starts here.</b><p>Try Send to add the example.</p></div>}<p className="lp-footnote">Intake → review → acceptance.</p></>}
      {view === "case" && <><div className="lp-panel-title"><h3>Report near the bus stand</h3><span>EXAMPLE</span></div>{demo.sent ? <><p className="lp-observation">{demo.observation}</p><PageBrief items={[["Review", demo.accepted ? "Accepted in demo" : "Received · needs review"], ["Ownership", demo.accepted ? "Example organisation" : "Pending acceptance"], ["Assignment", demo.assigned ? "Example team member" : "Unassigned"], ["Case status", demo.accepted ? STATUS_META.open.label : "Not opened"], ["Care events", "None recorded"], ["Follow-up", "Not scheduled"]]} /><div className="lp-next-actions">{!demo.accepted ? <button type="button" className="lp-primary" onClick={() => change({ accepted: true })}>Try acceptance</button> : !demo.assigned ? <button type="button" className="lp-primary" onClick={() => change({ assigned: true })}><UserRound size={16} aria-hidden />Try assignment</button> : <button type="button" onClick={() => change({ assigned: false })}>Undo example assignment</button>}<button type="button" onClick={() => setCareInfo(s => !s)} aria-expanded={careInfo}>How care is recorded</button></div>{careInfo && <p className="lp-action-note">The team adds care and follow-ups when work is recorded. This example has none.</p>}<p className="lp-footnote">{demo.assigned ? "Example assignment." : demo.accepted ? "Accepted in this example." : "Pending acceptance."}</p></> : <p>Send the example first, or go back to the review queue.</p>}</>}
      {view === "history" && <><div className="lp-panel-title"><h3>Animal history</h3><History size={22} aria-hidden /></div><ol className="lp-chronology depth-history"><li data-recorded={demo.sent}><span aria-hidden /><div><b>Observation</b><p>{demo.sent ? demo.observation : "Waiting for Send"}</p><small>{demo.sent ? "Example report received" : "No example received"}</small></div></li><li data-recorded={demo.accepted}><span aria-hidden /><div><b>Review and ownership</b><p>{demo.accepted ? "Accepted by an example organisation · demo only" : "Pending acceptance"}{demo.assigned ? ". Example team member assigned." : " · Unassigned"}</p></div></li><li><span aria-hidden /><div><b>Animal record</b><p>Not linked</p></div></li><li><span aria-hidden /><div><b>Care and follow-up</b><p>None recorded</p></div></li></ol><p className="lp-footnote">Teams identify the animal, then link reports and care to its history.</p></>}
      {view === "area" && <><div className="lp-panel-title"><h3>Real places. Separate records.</h3><MapPin size={22} aria-hidden /></div><div className="depth-geography-boundary"><div><span>Example report</span><b>Bus stand</b><p>Illustrative area.</p></div><ArrowRight size={22} aria-hidden /><div><span>Actual public geography</span><div className="lp-area-map">{map}</div></div></div><p className="lp-footnote">Actual public areas · separate from the example.</p><a className="lp-live-link" href="#living-map-showcase">Try the interactive Living Map <ArrowRight size={16} aria-hidden /></a><Link className="lp-live-link" href="/explore">Explore actual public records <ArrowRight size={16} aria-hidden /></Link></>}
    </div>
  </div>;
}
