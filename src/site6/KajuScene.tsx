"use client";

/* Meet Kaju, shown at work: a question, the records he reads, an answer with
   its sources, and a prepared action that waits for a person. Kaju himself
   listens, thinks and celebrates on top of the window. Illustrative records.
   Plays on its own, pauses on hover, focus or the pause button, and shows the
   finished state under reduced motion and without script. */
import { useEffect, useState } from "react";
import { Check, FileSearch, Pause, Play } from "lucide-react";
import { KajuPresence } from "@/kaju/Presence";
import type { KajuState } from "@/kaju/poses";

const DUR = [1900, 2300, 3000, 2600, 4200];
const POSE: KajuState[] = ["listening", "thinking", "headTilt", "sitting", "success"];

export function KajuScene() {
  const [phase, setPhase] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); setPhase(4); } }, []);
  useEffect(() => {
    if (paused || still) return;
    const t = window.setTimeout(() => setPhase((p) => (p + 1) % DUR.length), DUR[phase]);
    return () => window.clearTimeout(t);
  }, [phase, paused, still]);
  const at = (n: number) => phase >= n;
  return (
    <div className="s6-ks" role="group" aria-label="Product demo: Kaju prepares, a person approves" data-phase={phase} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <span className="s6-ks-kaju" aria-hidden><KajuPresence state={POSE[phase]} size={104} /></span>
      <div className="s6-ks-bar">
        <span><b>Kaju</b> · illustrative records</span>
        {!still ? <button type="button" className="s6-relay-pause" aria-label={paused ? "Play the Kaju demo" : "Pause the Kaju demo"} onClick={() => setPaused((p) => !p)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button> : null}
      </div>
      <p className="s6-q">Which animals block this month&rsquo;s report?</p>
      <div className="s6-ks-read" data-show={at(1)} data-done={at(2)}>
        <FileSearch size={15} aria-hidden /><span>{at(2) ? "Read 214 records" : "Reading 214 records"}</span><i aria-hidden />
      </div>
      <div className="s6-a s6-ks-step" data-show={at(2)}>
        <p><b>2 animals.</b> Both were released without a release photo.</p>
        <div className="s6-cite"><span className="s6-chip" data-tone="blue">Tag 2291</span><span className="s6-chip" data-tone="blue">Tag 2304</span><span className="s6-chip">Release evidence rule</span></div>
      </div>
      <div className="s6-propose s6-ks-step" data-show={at(3)}>
        <span><b>Remind the two field staff</b><br /><small>A note on each case, by name.</small></span>
        <span className="s6-btn is-blue is-small s6-ks-ok" data-pressed={at(4)} aria-hidden>{at(4) ? <><Check size={14} />Approved</> : "Approve"}</span>
      </div>
      <p className="s6-ks-log s6-ks-step" data-show={at(4)}><Check size={14} aria-hidden />Approved by Farah · 09:42 · on the audit trail</p>
    </div>
  );
}
