"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin, SendHorizontal, RotateCcw, FileText, Check } from "lucide-react";
import { CONDITIONS, type Condition } from "@/lib/register/taxonomy";
import { EXAMPLE_OBSERVATION, useDemo, type DemoView } from "./DemoProvider";
import { DEMO_VIEWS, WorkflowPreview } from "./WorkflowPreview";

export function Chain({ map }: { map?: ReactNode }) {
  const { demo, change, reset } = useDemo();
  const [view, setView] = useState<DemoView>("queue");
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [observation, setObservation] = useState(EXAMPLE_OBSERVATION);
  const [condition, setCondition] = useState<Condition>("Minor injury");
  useEffect(() => { setHydrated(true); }, []);
  const report = useRef<HTMLTextAreaElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const sent = demo.sent;
  const index = DEMO_VIEWS.findIndex(v => v.key === view);
  function replay() { reset(); setObservation(EXAMPLE_OBSERVATION); setCondition("Minor injury"); setView("queue"); setEditing(false); requestAnimationFrame(() => report.current?.focus({ preventScroll: true })); }
  return <div className={`pr-chain lp-demo${sent ? " is-sent" : ""}${editing ? " is-editing" : ""}`}>
    <header><p className="pr-place">One Request</p><h2 id="request-title">Today, one rescue lives in twelve places.</h2></header>
    <div className="lp-demo-toolbar"><span>Report → Coordinate → Understand</span><div className="lp-toolbar-actions">{sent && <button type="button" onClick={replay}><RotateCcw size={16} aria-hidden />Replay the example</button>}<a href="#how">Skip the demo <ArrowRight size={16} aria-hidden /></a></div></div>
    <div className="lp-demo-stage">
      <form hidden={sent && !editing} className="pr-phone lp-composer" aria-label="WhatsApp-style example report" onSubmit={e => { e.preventDefault(); if (!observation.trim()) { report.current?.setCustomValidity("Describe what you saw in this example."); report.current?.reportValidity(); return; } change({ sent: true, observation: observation.trim(), condition }); setView("queue"); setEditing(false); requestAnimationFrame(() => workspace.current?.focus({ preventScroll: true })); }}>
        <fieldset disabled={!hydrated} className="lp-example-fields"><header><span className="rq-avatar" aria-hidden><MapPin size={22} /></span><div><b>StrayPaw</b><span>WhatsApp-style example</span></div></header>
        <div className="rq-chat"><label htmlFor="demo-observation">What you saw</label><textarea ref={report} id="demo-observation" name="example-observation" autoComplete="off" maxLength={240} required value={observation} onChange={e => { e.target.setCustomValidity(""); setObservation(e.target.value); }} /><label htmlFor="demo-condition">Reported condition</label><select id="demo-condition" name="example-condition" value={condition} onChange={e => setCondition(e.target.value as Condition)}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select><p className="lp-attachment"><MapPin size={16} aria-hidden />Bus stand · example</p></div>
        <button type="submit" className="pr-send"><SendHorizontal size={18} aria-hidden />{sent ? "Update the example report" : "Send the example report"}</button></fieldset>
      </form>
      {sent && !editing && <aside className="depth-sent-receipt"><span><Check size={20} aria-hidden />Example received</span><blockquote>{demo.observation}</blockquote><p>{demo.condition} · Bus stand</p><button type="button" onClick={() => { setEditing(true); requestAnimationFrame(() => report.current?.focus({ preventScroll: true })); }}>Edit this message</button></aside>}
      <div className="lp-transfer" aria-hidden><FileText size={24} /><ArrowRight size={24} /></div>
      <div ref={workspace} className="lp-demo-record" id="request-record" tabIndex={-1} aria-label="Example workflow workspace"><WorkflowPreview view={view} setView={setView} map={map} />{sent && <div className="lp-demo-navigation"><button type="button" onClick={() => { if (index > 0) setView(DEMO_VIEWS[index - 1].key); else { setEditing(true); requestAnimationFrame(() => report.current?.focus({ preventScroll: true })); } }}><ArrowLeft size={16} aria-hidden />{index ? "Back" : "Edit report"}</button>{index < DEMO_VIEWS.length - 1 ? <button type="button" onClick={() => setView(DEMO_VIEWS[index + 1].key)}>{index === 0 ? "Inspect the case" : `Next: ${DEMO_VIEWS[index + 1].title}`}<ArrowRight size={16} aria-hidden /></button> : <a href="#how">See all four views <ArrowRight size={16} aria-hidden /></a>}</div>}</div>
    </div>
        <p className="pr-receipt" role="status">{demo.assigned ? "Example: assigned to a team member." : demo.accepted ? "Example: accepted, awaiting assignment." : sent ? "Example received · pending acceptance." : "Try Send."}</p>
    <p className="pr-note rq-disclosure">Interactive example · no real report is sent. <Link href="/community/report">Report an animal</Link>.</p>
    <noscript><p>The interactive example needs JavaScript. Report → review → acceptance → assignment; care is recorded only when it happens. <a href="/product">Explore the product</a>.</p></noscript>
  </div>;
}
