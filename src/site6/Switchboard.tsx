"use client";

/* What we offer, shown rather than listed. A programme is configured, not
   coded: each module is a switch. Picking one plays a small product scene;
   switching one off removes it from the workspace on the right, exactly as
   Programme setup does in the product. Scenes advance on their own until the
   visitor touches anything, and stand still under reduced motion. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Fingerprint, FlaskConical, Home, MapPinned, PawPrint, ShieldCheck, Stethoscope, Syringe } from "lucide-react";

const MODS = [
  { id: "ops", name: "ABC and vaccination", line: "Capture to accepted report", Icon: Syringe, href: "/abc-operations" },
  { id: "bite", name: "Bite care", line: "Every dose tracked", Icon: Stethoscope, href: "/platform#bite-care" },
  { id: "network", name: "Care network", line: "Who has vaccine today", Icon: MapPinned, href: "/platform#network" },
  { id: "lab", name: "Laboratory", line: "Sample to signed result", Icon: FlaskConical, href: "/platform#laboratory" },
  { id: "coverage", name: "Coverage", line: "Vaccinated against target", Icon: ShieldCheck, href: "/platform#coverage" },
  { id: "id", name: "AnimalID", line: "Seen this dog before?", Icon: Fingerprint, href: "/platform#animalid" },
] as const;
type Id = (typeof MODS)[number]["id"];
const css = (v: Record<string, string | number>) => v as React.CSSProperties;

function Scene({ id }: { id: Id }) {
  if (id === "ops") return (
    <div className="sv">
      <div className="sv-h"><b>Tag 2291</b><span>Brown male · Ward 14</span></div>
      {["Captured · 2 photos", "Surgery · signed by the vet", "Vaccinated", "Released where caught"].map((t, i) => <div className="sv-tick" key={t} style={css({ "--i": i })}><i><Check size={13} aria-hidden /></i>{t}</div>)}
      <div className="sv-foot" style={css({ "--i": 4 })}><span className="s6-chip" data-tone="green">In this month&rsquo;s report</span></div>
    </div>
  );
  if (id === "bite") return (
    <div className="sv">
      <div className="sv-h"><b>OPD 4471</b><span>Category III · assessed by the clinician</span></div>
      <div className="sv-doses">{[1, 2, 3, 4, 5].map((n) => <i key={n} data-s={n < 3 ? "done" : n === 3 ? "due" : ""} style={css({ "--i": n - 1 })}>{n < 3 ? <Check size={14} aria-hidden /> : n}</i>)}</div>
      <p className="sv-big" style={css({ "--i": 5 })}>Dose 3 of 5 <span>due today</span></p>
      <div className="sv-foot" style={css({ "--i": 6 })}><span className="s6-chip" data-tone="blue">Dates set by the clinician</span><span className="s6-chip">Reminder call logged</span></div>
    </div>
  );
  if (id === "network") return (
    <div className="sv sv-map">
      <svg viewBox="0 0 360 210" aria-hidden="true" focusable="false">
        <rect width="360" height="210" rx="12" fill="#f6f8fc" />
        <path d="M-10 160C70 130 130 180 200 150S310 90 370 120" fill="none" stroke="#dbe6fb" strokeWidth="14" strokeLinecap="round" />
        <g stroke="#e6eaf2" fill="none">{[60, 120, 180, 240, 300].map((x) => <path key={x} d={`M${x} 0v210`} />)}{[52, 104, 156].map((y) => <path key={y} d={`M0 ${y}h360`} />)}</g>
        <path className="sv-arc" pathLength={1} d="M84 70C130 20 190 30 228 92" fill="none" stroke="#2457ce" strokeWidth="2" strokeDasharray="1" style={css({ "--i": 5 })} />
        <path className="sv-arc" pathLength={1} d="M292 150C280 110 262 100 228 92" fill="none" stroke="#2457ce" strokeWidth="2" strokeDasharray="1" style={css({ "--i": 6 })} />
        {([[84, 70, "#e9963a"], [228, 92, "#2b8a5f"], [292, 150, "#d9452b"], [150, 150, "#2b8a5f"], [318, 54, "#2b8a5f"]] as [number, number, string][]).map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}><g className="sv-pin" style={css({ "--i": i })}><circle r="11" fill={c} opacity=".16" /><circle r="5.5" fill={c} stroke="#fff" strokeWidth="2" /></g></g>
        ))}
      </svg>
      <div className="sv-foot" style={css({ "--i": 7 })}><span className="s6-chip" data-tone="green">Vaccine confirmed</span><span className="s6-chip" data-tone="amber">Limited</span><span className="s6-chip" data-tone="flame">Refers on</span></div>
    </div>
  );
  if (id === "lab") return (
    <div className="sv">
      <div className="sv-h"><b>Sample S-2611</b><span>Chain of custody · 4 hands</span></div>
      <ol className="sv-steps">{["Sent", "Received", "Testing", "Result"].map((t, i) => <li key={t} style={css({ "--i": i })}><i>{i < 3 ? <Check size={13} aria-hidden /> : <FlaskConical size={13} aria-hidden />}</i>{t}</li>)}</ol>
      <p className="sv-big" style={css({ "--i": 4 })}>Positive <span>with its method</span></p>
      <div className="sv-foot" style={css({ "--i": 5 })}><span className="s6-chip" data-tone="flame">Programme alerted</span><span className="s6-chip" data-tone="violet">Signed</span></div>
    </div>
  );
  if (id === "coverage") return (
    <div className="sv">
      <div className="sv-h"><b>Dogs vaccinated</b><span>Against the population estimate</span></div>
      <div className="sv-bars">
        <span className="sv-target" aria-hidden>Target 70%</span>
        {([["Ward 12", 78], ["Ward 13", 71], ["Ward 14", 64], ["Ward 15", 52]] as [string, number][]).map(([w, v], i) => <div key={w} style={css({ "--i": i, "--v": `${v}%` })}><small>{w}</small><i data-ok={v >= 70} /><b>{v}%</b></div>)}
      </div>
      <div className="sv-foot" style={css({ "--i": 5 })}><span className="s6-chip">No estimate, no percentage</span></div>
    </div>
  );
  return (
    <div className="sv sv-id">
      <div className="sv-pair">
        <div className="sv-photo" style={css({ "--i": 0 })}><PawPrint size={30} aria-hidden /><small>Today · market gate</small></div>
        <svg viewBox="0 0 80 100" aria-hidden="true" focusable="false">{[22, 50, 78].map((y, i) => <path key={y} className="sv-arc" pathLength={1} d={`M0 ${y}C30 ${y - 10} 50 ${y + 10} 80 ${y}`} fill="none" stroke="#2457ce" strokeWidth="1.6" strokeDasharray="1" style={css({ "--i": i + 2 })} />)}</svg>
        <div className="sv-photo" style={css({ "--i": 1 })}><PawPrint size={30} aria-hidden /><small>Tag 2291 · March</small></div>
      </div>
      <p className="sv-big" style={css({ "--i": 5 })}>Possible match <span>a person confirms</span></p>
      <div className="sv-foot" style={css({ "--i": 6 })}><span className="s6-chip" data-tone="blue">Suggestion only</span></div>
    </div>
  );
}

export function Switchboard() {
  const [active, setActive] = useState<Id>("ops");
  const [on, setOn] = useState<Record<Id, boolean>>({ ops: true, bite: true, network: true, lab: true, coverage: true, id: true });
  const [auto, setAuto] = useState(true);
  const [hold, setHold] = useState(false);
  useEffect(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(false); }, []);
  useEffect(() => {
    if (!auto || hold) return;
    const t = window.setTimeout(() => setActive((a) => MODS[(MODS.findIndex((m) => m.id === a) + 1) % MODS.length].id), 4600);
    return () => window.clearTimeout(t);
  }, [active, auto, hold]);
  const cur = MODS.find((m) => m.id === active)!;
  return (
    <div className="s6-sw" data-auto={auto && !hold} onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocusCapture={() => setHold(true)} onBlurCapture={() => setHold(false)}>
      <ul className="s6-sw-list">
        {MODS.map((m) => (
          <li key={m.id} data-active={m.id === active} data-on={on[m.id]}>
            <button type="button" className="s6-sw-pick" aria-pressed={m.id === active} onClick={() => { setAuto(false); setActive(m.id); }}>
              <i aria-hidden><m.Icon size={17} /></i><span><b>{m.name}</b><small>{m.line}</small></span>
            </button>
            <button type="button" role="switch" aria-checked={on[m.id]} aria-label={`${m.name} module`} className="s6-sw-toggle" onClick={() => { setAuto(false); setActive(m.id); setOn((o) => ({ ...o, [m.id]: !o[m.id] })); }}><i /></button>
          </li>
        ))}
      </ul>
      <div className="s6-sw-stage">
        <div className="s6-sw-win" role="img" aria-label={`Illustration: ${cur.name}${on[active] ? "" : ", switched off"}`}>
          <div className="s6-sw-side" aria-hidden>
            <span className="s6-sw-org"><i>BR</i><b>City programme</b></span>
            <span className="s6-sw-nav" data-cur="false"><Home size={14} />Today</span>
            {MODS.map((m) => <span key={m.id} className="s6-sw-nav" data-cur={m.id === active} data-off={!on[m.id]}><m.Icon size={14} />{m.name}</span>)}
          </div>
          <div className="s6-sw-main" data-off={!on[active]}>
            <div key={active} className="s6-sw-scene"><Scene id={active} /></div>
            {!on[active] ? <p className="s6-sw-offnote">Off for this programme. Switch it on when you need it.</p> : null}
          </div>
        </div>
        <div className="s6-sw-cap"><span>Illustrative records</span><Link href={cur.href} className="s6-textlink">{cur.name}<ArrowRight size={15} aria-hidden /></Link></div>
      </div>
    </div>
  );
}
