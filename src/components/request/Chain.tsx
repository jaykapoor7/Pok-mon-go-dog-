"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Camera, MapPin, SendHorizontal, RotateCcw, FileText, Clock3, UserRound, ArrowRight, History, ClipboardList } from "lucide-react";

const ACTS = [
  { title: "Report", text: "A photo, a place and what you saw. The report can be reviewed by organisations working nearby." },
  { title: "Coordinate", text: "If an organisation accepts, its team can assign the case, record care and plan follow-ups." },
  { title: "Understand", text: "Recorded updates stay with the animal and contribute to the map. Missing information remains unknown." },
];

/** A local illustration. Send changes this example only; it never writes a report. */
export function Chain({ map }: { map?: ReactNode }) {
  const [sent, setSent] = useState(false);
  const [recordView, setRecordView] = useState<"review" | "history">("review");
  return <div className={`pr-chain${sent ? " is-sent" : ""}`}>
    <header><p className="pr-place">One Request</p><h2 id="request-title">Today, one rescue lives in twelve places.</h2><p className="pr-lede">One report can give the next person somewhere to start.</p></header>
    <div className="rq-workbench">
      <div className="pr-phone" aria-label="WhatsApp example, not a real report" data-ui>
        <header><span className="rq-avatar" aria-hidden><MapPin size={22} /></span><div><b>StrayPaw</b><span>WhatsApp · illustrative example</span></div></header>
        <div className="rq-chat">
          <p className="pr-message">There’s an injured dog near the bus stand. How can I report it?<span className="rq-message-tick" aria-hidden>{sent ? "✓✓" : ""}</span></p>
          <p className="pr-attachments"><Camera size={16} aria-hidden /> Photo <MapPin size={16} aria-hidden /> Area</p>

        </div>
        <button type="button" className="pr-send" onClick={() => { setSent(s => !s); setRecordView("review"); }} aria-controls="request-receipt request-record">
          {sent ? <><RotateCcw size={17} aria-hidden /> Replay the example</> : <><SendHorizontal size={18} aria-hidden /> Send the example report</>}
        </button>
        <p id="request-receipt" className="pr-receipt" role="status">{sent ? "Example received. Awaiting review; no organisation has accepted it." : "Try Send to see the example receipt."}</p>
      </div>
      <div className="rq-connection" aria-hidden="true"><span className="rq-thread" /><span className="rq-packet"><FileText size={21} /></span><ArrowRight size={26} /></div>
      <div id="request-record" className="rq-record" data-ui aria-label="Illustrative shared record">
        <div className="rq-file-tab"><ClipboardList size={16} aria-hidden /> Example report</div>
        <header className="rq-record-header"><div><span className="rq-record-label">Shared record</span><h3>{sent ? "One report. A place to start." : "The next step stays connected."}</h3></div><span className="rq-status"><Clock3 size={14} aria-hidden />{sent ? "Awaiting review" : "Example preview"}</span></header>
        <div className="rq-mobile-views" role="group" aria-label="Example record views">
          <button type="button" aria-pressed={recordView === "review"} aria-controls="example-review" onClick={() => setRecordView("review")}>Review queue</button>
          <button type="button" aria-pressed={recordView === "history"} aria-controls="example-history" onClick={() => setRecordView("history")}>Animal history</button>
        </div>
        <div className="rq-record-body" data-view={recordView}>
          <div id="example-review" className="rq-case">
            <div className="rq-sheet-title"><ClipboardList size={18} aria-hidden /><b>Review queue</b></div>
            <div className={`rq-case-slip${sent ? " is-received" : ""}`}><span className="rq-case-marker" aria-hidden /><div><b>{sent ? "Report near the bus stand" : "A place for the next report"}</b><span>{sent ? "Received · needs review" : "Try Send to create the example"}</span></div></div>
            <dl><div><dt><UserRound size={14} aria-hidden /> Assignment</dt><dd>Unassigned</dd></div><div><dt><FileText size={14} aria-hidden /> Care events</dt><dd>None recorded</dd></div><div><dt><Clock3 size={14} aria-hidden /> Follow-up</dt><dd>Not scheduled</dd></div></dl>
            <p className="rq-conditional">If accepted, the team can assign a case and record care.</p>
          </div>
          <div id="example-history" className="rq-history">
            <div className="rq-sheet-title"><History size={18} aria-hidden /><b>Animal history</b></div>
            <ol className="rq-timeline"><li className={sent ? "is-received" : ""}><i aria-hidden /><b>Observation</b><span>{sent ? "Example received" : "Waiting for Send"}</span></li><li><i aria-hidden /><b>Animal record</b><span>Not linked</span></li></ol>
            <div className="rq-map">{map ?? <div className="rq-map-empty"><MapPin size={24} aria-hidden /><span>Living Map</span></div>}<p>This example is not on the map.</p></div>
          </div>
        </div>
      </div>
    </div>
    <ol className="pr-acts" aria-label="Report, Coordinate, Understand">{ACTS.map(act => <li key={act.title}><h3>{act.title}</h3><p>{act.text}</p></li>)}</ol>
    <p className="pr-note rq-disclosure">This is an example, not a live rescue. Reporting does not guarantee organisational acceptance, rescue or veterinary treatment. <Link href="/community/report">Report an animal</Link>.</p>
  </div>;
}
