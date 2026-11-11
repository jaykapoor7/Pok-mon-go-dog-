"use client";

/* The hero: one event travelling through four institutions. A bite is
   recorded at a hospital, the area's field team is asked to find the animal
   (with no patient details), the laboratory reports a result, and the
   programme sees what to decide. Illustrative records, labelled as such.
   Advances on its own, pauses on hover, focus or the pause button, and
   stands still under reduced motion (showing the finished state). */
import { useEffect, useState } from "react";
import { Building2, FlaskConical, Gauge, Pause, PawPrint, Play } from "lucide-react";

const LANES = [
  { id: "hospital", name: "Teaching hospital", role: "Clinician", color: "linear-gradient(135deg,#f0674c,#d9452b)", Icon: Building2 },
  { id: "ngo", name: "Field team", role: "NGO", color: "linear-gradient(135deg,#2b8a5f,#1f6f4c)", Icon: PawPrint },
  { id: "lab", name: "Reference laboratory", role: "Scientist", color: "linear-gradient(135deg,#6f5fd6,#4f3fb8)", Icon: FlaskConical },
  { id: "programme", name: "Programme cell", role: "Coordinator", color: "linear-gradient(135deg,#3a6be0,#2457ce)", Icon: Gauge },
] as const;

const STEPS = [
  { lane: 0, caption: "A clinician records a bite. No name is stored." },
  { lane: 1, caption: "The field team is asked to find the dog. They never see the patient." },
  { lane: 2, caption: "The laboratory reports the result, with its method." },
  { lane: 3, caption: "The programme sees what needs a decision." },
];
const DUR = 3800;

export function Relay() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); setStep(3); } }, []);
  useEffect(() => {
    if (paused || still) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), DUR);
    return () => window.clearTimeout(t);
  }, [step, paused, still]);
  const seen = (i: number) => i <= step;
  return (
    <div className="s6-relay" role="group" aria-label="Product demo: one bite, four institutions" data-paused={paused || still} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)} style={{ ["--dur" as string]: `${DUR}ms` }}>
      <div className="s6-relay-bar">
        <span><b>Product demo</b> · illustrative records</span>
        <div className="dots">
          {STEPS.map((_, i) => <button key={i} type="button" aria-label={`Step ${i + 1} of ${STEPS.length}`} aria-current={i === step ? "step" : undefined} data-done={i < step} onClick={() => setStep(i)} />)}
          {!still ? <button type="button" className="s6-relay-pause" style={{ width: 28, height: 28, background: "none" }} aria-label={paused ? "Play the relay" : "Pause the relay"} onClick={() => setPaused((p) => !p)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button> : null}
        </div>
      </div>
      <div className="s6-lanes">
        <div className="s6-thread" aria-hidden><i style={{ ["--to" as string]: step }} /></div>
        {LANES.map((l, i) => (
          <div key={l.id} className="s6-lane" data-on={i === step} data-seen={seen(i)}>
            <div className="s6-lane-h"><i style={{ background: l.color }}><l.Icon size={16} aria-hidden /></i><div><b>{l.name}</b><span>{l.role}</span></div></div>
            {!seen(i) ? <div className="s6-ghost">Waiting</div> : i === 0 ? (
              <div className="s6-card" key={`h${step >= 0}`}>
                <b>Bite recorded · OPD 4471</b>Dog, street, HSR Layout. Wound washed before arrival.
                <div className="row"><span className="s6-chip" data-tone="flame">Category III</span><small>Dr. Rao</small></div>
                <div className="row"><small>Course prescribed · dose 1 given</small><span className="s6-chip" data-tone="green">Today</span></div>
              </div>
            ) : i === 1 ? (
              <div className="s6-card">
                <b>Find and observe the dog</b>Tan, torn left ear, near the market gate.
                <div className="row"><span className="s6-chip" data-tone="blue">From the hospital</span><small>Due in 3 days</small></div>
                <div className="row"><small>No patient details shared</small>{step >= 2 ? <span className="s6-chip" data-tone="amber">Sample sent</span> : <span className="s6-chip">New</span>}</div>
              </div>
            ) : i === 2 ? (
              <div className="s6-card">
                <b>Sample S-2611 · brain tissue</b>Received, tested, reported.
                <div className="row"><span className="s6-chip" data-tone="flame">Positive</span><small>Fluorescent antibody test</small></div>
                <div className="row"><small>Chain of custody: 4 hands</small><span className="s6-chip" data-tone="violet">Signed</span></div>
              </div>
            ) : (
              <div className="s6-card">
                <b>Rabies confirmed · HSR Layout</b>Bites here in 30 days: fewer than 5.
                <div className="row"><span className="s6-chip" data-tone="flame">Needs a decision</span><small>2 partners told</small></div>
                <div className="row"><small>Vaccine short at 1 centre</small><span className="s6-chip" data-tone="blue">Referral set</span></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="s6-relay-cap" aria-live="polite">{STEPS[step].caption}</p>
    </div>
  );
}
