"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Radio } from "lucide-react";

type Tone = "vermilion" | "electric" | "cyan" | "violet";

type Point = {
  id: string;
  x: string;
  y: string;
  label: string;
  tone: Tone;
  title: string;
  note: string;
  confidence: string;
  next: string;
};

/* Illustrative records — the shape of the evidence layer, not live data. */
const POINTS: Point[] = [
  {
    id: "SP-1042",
    x: "24%",
    y: "34%",
    label: "Needs study",
    tone: "vermilion",
    title: "Jahangirpuri cluster",
    note: "18 observations, no sterilisation record within 4 km.",
    confidence: "0.42 / low",
    next: "Scope a study brief",
  },
  {
    id: "SP-1039",
    x: "61%",
    y: "21%",
    label: "Verified",
    tone: "electric",
    title: "Nizamuddin edge",
    note: "12 observations confirmed. Partner NGO matched and briefed.",
    confidence: "0.86 / high",
    next: "Validate study brief",
  },
  {
    id: "SP-1035",
    x: "76%",
    y: "57%",
    label: "In field",
    tone: "cyan",
    title: "Rohini sector 4",
    note: "Study active. Field team collecting, 4 days remaining.",
    confidence: "0.71 / medium",
    next: "Review interim data",
  },
  {
    id: "SP-1031",
    x: "38%",
    y: "71%",
    label: "Signal",
    tone: "violet",
    title: "Moolchand crossing",
    note: "6 community observations. Below validation threshold.",
    confidence: "0.28 / low",
    next: "Await corroboration",
  },
  {
    id: "SP-1028",
    x: "82%",
    y: "79%",
    label: "Outcome",
    tone: "electric",
    title: "CR Park",
    note: "Sterilisation intervention complete. 24 animals, post-field verified.",
    confidence: "0.94 / high",
    next: "Publish outcome record",
  },
];

const LAYERS = ["Observations", "Studies", "Needs", "Interventions"];

export function MapConsole() {
  const [selected, setSelected] = useState<Point>(POINTS[1]);
  const [layer, setLayer] = useState("Observations");

  return (
    <div className="sp-console">
      <div className="sp-console-bar">
        <div className="sp-console-title">
          <Radio size={15} />
          <span>LIVE NETWORK</span>
          <i />
          <span className="muted">DELHI NCR · ILLUSTRATIVE</span>
        </div>
        <div className="sp-layers">
          {LAYERS.map((l) => (
            <button
              key={l}
              className={layer === l ? "active" : ""}
              onClick={() => setLayer(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="sp-stage">
        <div className="sp-river" />
        <div className="sp-route a" />
        <div className="sp-route b" />
        {POINTS.map((p) => (
          <button
            key={p.id}
            className={`sp-point ${p.tone} ${selected.id === p.id ? "selected" : ""}`}
            style={{ left: p.x, top: p.y }}
            onClick={() => setSelected(p)}
            aria-label={`Select ${p.title}`}
          >
            <span />
          </button>
        ))}
        <div className="sp-legend">
          ACTIVE LAYER / {layer.toUpperCase()}
          <br />
          <span className="sp-dot-legend" /> VERIFIED / IN FIELD &nbsp;
          <span className="sp-dot-legend gap" /> COVERAGE GAP
        </div>
        <div className="sp-scale">0 &nbsp;&nbsp;&nbsp;&nbsp; 5 KM</div>
      </div>

      <aside className="sp-drawer">
        <div className="sp-drawer-top">
          <span>SELECTED RECORD</span>
          <span>{selected.id}</span>
        </div>
        <div className="sp-drawer-status">
          <span className={`sp-status-dot ${selected.tone}`} />
          {selected.label}
        </div>
        <h3>{selected.title}</h3>
        <p>{selected.note}</p>
        <div className="sp-drawer-rule" />
        <div className="sp-drawer-row">
          <span>LAST UPDATED</span>
          <b>6 min ago</b>
        </div>
        <div className="sp-drawer-row">
          <span>CONFIDENCE</span>
          <b>{selected.confidence}</b>
        </div>
        <div className="sp-drawer-row">
          <span>NEXT ACTION</span>
          <b>{selected.next}</b>
        </div>
        <Link href="/map" className="sp-drawer-btn">
          Open the living map <ArrowUpRight size={15} />
        </Link>
      </aside>
    </div>
  );
}
