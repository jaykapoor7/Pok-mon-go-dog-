"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, MapPin, SendHorizontal, RotateCcw } from "lucide-react";

const ACTS = [
  { title: "Report", text: "A photo, a place and what you saw. The report can be reviewed by organisations working nearby." },
  { title: "Coordinate", text: "If an organisation accepts, its team can assign the case, record care and plan follow-ups." },
  { title: "Understand", text: "Recorded updates stay with the animal and contribute to the map. Missing information remains unknown." },
];

export function Chain() {
  const [sent, setSent] = useState(false);
  return <div className="pr-chain">
    <header><p className="pr-place">One Request</p><h2 id="request-title">Today, one rescue lives in twelve places.</h2><p className="pr-lede">One report can give the next person somewhere to start.</p></header>
    <div className="pr-request-body">
      <div className="pr-phone" aria-label="WhatsApp example, not a real report">
        <header><b>StrayPaw</b><span>WhatsApp · illustrative example</span></header>
        <p className="pr-message">There’s an injured dog near the bus stand. How can I report it?</p>
        <p className="pr-attachments"><Camera size={16} aria-hidden /> Photo <MapPin size={16} aria-hidden /> Area</p>
        <button type="button" className="pr-send" onClick={() => setSent(!sent)} aria-controls="request-receipt">
          {sent ? <><RotateCcw size={17} aria-hidden /> Replay the example</> : <><SendHorizontal size={17} aria-hidden /> Send the example report</>}
        </button>
        <p id="request-receipt" className="pr-receipt" role="status">{sent ? "Example received. Awaiting review; no organisation has accepted it." : "Try Send to see the example receipt."}</p>
      </div>
      <div>
        <ol className="pr-acts" aria-label="Report, Coordinate, Understand">{ACTS.map((act, i) => <li key={act.title} className={sent && i === 0 ? "is-current" : ""}><h3>{act.title}</h3><p>{act.text}</p></li>)}</ol>
        <p className="pr-note">This is an example, not a live rescue. Reporting does not guarantee organisational acceptance, rescue or veterinary treatment. <Link href="/community/report">Report an animal</Link>.</p>
      </div>
    </div>
  </div>;
}
