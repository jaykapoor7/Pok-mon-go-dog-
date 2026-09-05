"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Radio } from "lucide-react";

type Tone = "vermilion" | "electric" | "cyan" | "violet";

/**
 * An explanation of the map's record states, not a set of records.
 *
 * The landing page used to show five invented sightings here with IDs and
 * place names. Nothing has been reported yet, so those were fiction. This
 * shows what each state on the map *means* instead, which is real product
 * information, and survives contact with a reader who clicks through.
 */
type State = {
  key: string;
  x: string;
  y: string;
  tone: Tone;
  label: string;
  title: string;
  meaning: string;
  entersWhen: string;
  leavesWhen: string;
};

const STATES: State[] = [
  {
    key: "signal",
    x: "24%",
    y: "34%",
    tone: "violet",
    label: "Signal",
    title: "One report, unconfirmed",
    meaning:
      "Somebody saw an animal and said so. One observation on its own is a lead, not evidence.",
    entersWhen: "A community member submits a report.",
    leavesWhen: "A second independent observation corroborates it.",
  },
  {
    key: "verified",
    x: "61%",
    y: "21%",
    tone: "electric",
    label: "Verified",
    title: "Corroborated record",
    meaning:
      "Enough independent observations agree on the place and the condition for the record to be worth acting on.",
    entersWhen: "Observations corroborate.",
    leavesWhen: "It is picked up by a study or an intervention.",
  },
  {
    key: "gap",
    x: "38%",
    y: "71%",
    tone: "vermilion",
    label: "Coverage gap",
    title: "Nothing known here",
    meaning:
      "An area with no records at all. Silence is not absence. It usually means nobody has looked.",
    entersWhen: "An area has no reports and no survey history.",
    leavesWhen: "A field survey establishes a baseline.",
  },
  {
    key: "field",
    x: "76%",
    y: "57%",
    tone: "cyan",
    label: "In field",
    title: "Work underway",
    meaning:
      "A funded study or intervention is running here right now, and data is coming back.",
    entersWhen: "A partner organisation begins fieldwork.",
    leavesWhen: "The programme closes and reach is verified.",
  },
  {
    key: "outcome",
    x: "82%",
    y: "79%",
    tone: "electric",
    label: "Outcome",
    title: "Closed and verified",
    meaning:
      "Something was funded, executed and checked. The record keeps its method and its confidence rating.",
    entersWhen: "Post-field verification completes.",
    leavesWhen: "It doesn't, outcomes are permanent.",
  },
];

const LAYERS = ["Observations", "Studies", "Needs", "Interventions"];

export function MapConsole() {
  const [selected, setSelected] = useState<State>(STATES[1]);
  const [layer, setLayer] = useState("Observations");

  return (
    <div className="sp-console">
      <div className="sp-console-bar">
        <div className="sp-console-title">
          <Radio size={15} />
          <span>RECORD STATES</span>
          <i />
          <span className="muted">HOW THE MAP CLASSIFIES WHAT IT KNOWS</span>
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
        {STATES.map((s) => (
          <button
            key={s.key}
            className={`sp-point ${s.tone} ${selected.key === s.key ? "selected" : ""}`}
            style={{ left: s.x, top: s.y }}
            onClick={() => setSelected(s)}
            aria-label={`What "${s.label}" means`}
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
        <div className="sp-scale">SELECT A POINT</div>
      </div>

      <aside className="sp-drawer">
        <div className="sp-drawer-top">
          <span>RECORD STATE</span>
          <span>
            {STATES.indexOf(selected) + 1} / {STATES.length}
          </span>
        </div>
        <div className="sp-drawer-status">
          <span className={`sp-status-dot ${selected.tone}`} />
          {selected.label}
        </div>
        <h3>{selected.title}</h3>
        <p>{selected.meaning}</p>
        <div className="sp-drawer-rule" />
        <div className="sp-drawer-row">
          <span>ENTERS WHEN</span>
          <b>{selected.entersWhen}</b>
        </div>
        <div className="sp-drawer-row">
          <span>LEAVES WHEN</span>
          <b>{selected.leavesWhen}</b>
        </div>
        <Link href="/map" className="sp-drawer-btn">
          Open the map <ArrowUpRight size={15} />
        </Link>
      </aside>
    </div>
  );
}
