"use client";

/* ════════════════════════════════════════════════════════════════════
   05 One connected ecosystem. Everyone in a One Health programme around
   one shared record, and what passes between them. Choosing a partner
   says what it records, what it sends and what it never sees.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";

type Node = { id: string; label: string; x: number; y: number; does: string };
const NODES: Node[] = [
  { id: "animals", label: "Animals", x: 50, y: 9, does: "Each animal has one identity and one history, wherever it is met and by whom." },
  { id: "field", label: "Field teams", x: 83, y: 22, does: "Capture, release and evidence on a phone, with or without signal." },
  { id: "vets", label: "Veterinarians", x: 93, y: 55, does: "Sign procedures and vaccinations. Only a veterinarian can." },
  { id: "ngos", label: "NGOs", x: 78, y: 86, does: "Run the line of work, and answer requests from hospitals in their area." },
  { id: "city", label: "Municipalities", x: 50, y: 95, does: "Review packages figure by figure; accept or query. Acceptance is not payment." },
  { id: "hospitals", label: "Hospitals", x: 21, y: 86, does: "Record bites and courses. Patient details never leave the hospital; the area's NGO is asked to find the animal." },
  { id: "labs", label: "Laboratories", x: 7, y: 55, does: "Receive, test and report samples; a positive result alerts coordination." },
  { id: "research", label: "Researchers", x: 17, y: 22, does: "Read suppressed, de-identified counts by area and week. No row describes a person." },
];
const LINKS: [string, string][] = [["hospitals", "ngos"], ["field", "vets"], ["labs", "research"], ["ngos", "city"], ["animals", "field"]];

export function Ecosystem() {
  const [on, setOn] = useState<string>("hospitals");
  const n = NODES.find((x) => x.id === on)!;
  const at = (id: string) => NODES.find((x) => x.id === id)!;
  return (
    <section className="cn8-sec cn8-eco" aria-labelledby="cn8-eco-h">
      <div className="cn8-wrap cn8-eco-grid">
        <div className="cn8-eco-copy">
          <p className="cn8-k">One connected ecosystem</p>
          <h2 id="cn8-eco-h" className="cn8-h2">One Health, as one system.</h2>
          <p className="cn8-lede">Animals, field teams, veterinarians, NGOs, municipalities, hospitals, laboratories and researchers work on one record, each seeing only what their role allows.</p>
          <div className="cn8-eco-say" aria-live="polite"><b>{n.label}</b><p>{n.does}</p></div>
          <p className="cn8-eco-note">Shaped by the requirements of a city-wide One Health rabies programme in Bengaluru: human bite care, dog vaccination coverage, laboratory confirmation and field follow-up. A city is a configuration of the same platform, not a separate product.</p>
        </div>
        <div className="cn8-eco-map">
          <svg viewBox="0 0 100 104" aria-hidden>
            {NODES.map((x) => <line key={x.id} x1="50" y1="52" x2={x.x} y2={x.y} className={`cn8-eco-spoke${on === x.id ? " is-on" : ""}`} />)}
            {LINKS.map(([a, b]) => <path key={a + b} d={`M${at(a).x} ${at(a).y} Q 50 52 ${at(b).x} ${at(b).y}`} className={`cn8-eco-arc${on === a || on === b ? " is-on" : ""}`} pathLength={1} />)}
            {NODES.map((x, i) => <circle key={x.id} r="0.9" className="cn8-eco-pulse" style={{ offsetPath: `path("M50 52 L${x.x} ${x.y}")`, animationDelay: `${i * 0.45}s` }} />)}
            <circle cx="50" cy="52" r="9" className="cn8-eco-core" />
          </svg>
          <span className="cn8-eco-centre" aria-hidden><b>One shared record</b><small>with its provenance</small></span>
          {NODES.map((x) => <button key={x.id} type="button" className={`cn8-eco-node${on === x.id ? " is-on" : ""}`} style={{ left: `${x.x}%`, top: `${(x.y / 104) * 100}%` }} aria-pressed={on === x.id} onClick={() => setOn(x.id)} onMouseEnter={() => setOn(x.id)} onFocus={() => setOn(x.id)}>{x.label}</button>)}
        </div>
      </div>
    </section>
  );
}
