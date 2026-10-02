"use client";

/* ════════════════════════════════════════════════════════════════════
   What a "near you" screen shows before it knows where you are, when you
   are outside India, and when the record has not reached your place yet.
   Never another city's data in the meantime: one plain sentence, the two
   ways to set a place, and reporting, which never waits for any of it.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { Crosshair, Plus } from "lucide-react";
import { PlaceSearch, type PlaceOption } from "./PlaceSearch";
import { DeskHeader } from "./DeskHeader";
import "./place-gate.css";

export type GateState = "ask" | "denied" | "abroad" | "unreached";

const COPY: Record<GateState, { kicker: string; title: string; body: string }> = {
  ask: { kicker: "Near you", title: "Where do you walk?", body: "Share your location, or choose a place, and this shows the animals on the record around it: who needs help, who you follow, what was done nearby. It is kept on this device only." },
  denied: { kicker: "Near you", title: "Location is off.", body: "Allow location for this site, or type a place instead. Nothing is shown until a place is set, so nothing here is about somewhere else." },
  abroad: { kicker: "Outside India", title: "You are outside India.", body: "StrayPaw keeps the record of India's street animals. Choose a place in India to look around it." },
  unreached: { kicker: "Not on the record yet", title: "We have not reached here yet.", body: "No animal is recorded within 20 km of this place. That is not the same as no animals living here: report the first one and your street starts the record." },
};

export function PlaceGate({ state, where, locating, onLocate, options, onPick, reportHref = "/report", what = "your patch", ask }: {
  state: GateState; where?: string | null; locating?: boolean; onLocate: () => void;
  options: PlaceOption[]; onPick: (o: PlaceOption) => void; reportHref?: string; what?: string;
  /** The first question in this screen's own words. */
  ask?: { title: string; body: string };
}) {
  const c = state === "ask" && ask ? { ...COPY.ask, kicker: "Choose a place", ...ask } : COPY[state];
  return (
    <div className="pg">
      <DeskHeader
        ground={false}
        kicker={`${c.kicker}${where && state === "unreached" ? ` · ${where}` : ""}`}
        title={c.title}
        lede={c.body}
        actions={state === "unreached"
          ? <Link href={reportHref} className="dk-btn is-flame"><Plus size={16} /> Report the first animal</Link>
          : <button type="button" className="dk-btn" onClick={onLocate} disabled={locating}><Crosshair size={15} /> {locating ? "Finding you…" : "Use my location"}</button>}
      >
        <div className="pg-search"><PlaceSearch options={options} onPick={onPick} label={state === "unreached" ? "Choose another place" : "Or type a place"} /></div>
      </DeskHeader>
      {state !== "unreached" && <p className="pg-foot">Seeing an animal right now? <Link href="/report">Report it</Link>, no place needed first.</p>}
      {state === "unreached" && <p className="pg-foot">When the record reaches here, {what} fills in on its own.</p>}
    </div>
  );
}
