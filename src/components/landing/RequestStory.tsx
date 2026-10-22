"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, CheckCheck, MapPin, Pause, Play, RotateCcw, SendHorizontal } from "lucide-react";
import type { Area } from "@/components/request/OriginalRequest";
import "./request-story.css";

const CHAPTERS = [
  { label: "Report", title: "It starts with a message.", text: "A photo, a place and what you saw. One report gives the next person somewhere to start." },
  { label: "Coordinate", title: "A team takes it forward.", text: "The report enters review. If a team accepts it, they can assign the case and keep the resident updated." },
  { label: "Record", title: "Care stays with the animal.", text: "Treatment and follow-ups become part of the same history, whenever a team records them." },
  { label: "See the city", title: "One record. A bigger picture.", text: "Local records bring the work into view, from one animal’s history to the city’s map." },
];

export function RequestStory({ areas, city, recordedAt }: { areas: Area[]; city: string; recordedAt?: string }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const section = useRef<HTMLElement>(null);
  const place = useMemo(() => [...areas].sort((a, b) => b.open - a.open)[0]?.name || city, [areas, city]);
  const dots = useMemo(() => {
    const points = areas.filter(a => a.ring.length >= 6).map(a => {
      let x = 0, y = 0;
      for (let i = 0; i < a.ring.length; i += 2) { x += a.ring[i]; y += a.ring[i + 1]; }
      return { x: x / (a.ring.length / 2), y: y / (a.ring.length / 2), open: a.open, name: a.name };
    });
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const w = Math.min(...xs), e = Math.max(...xs), s = Math.min(...ys), n = Math.max(...ys);
    const sc = 280 / Math.max(e - w, n - s, .001);
    return points.map(p => ({ ...p, x: 40 + (p.x - w) * sc, y: 30 + (n - p.y) * sc }));
  }, [areas]);

  // Reading is always manual on phones and under reduced motion. Optional playback
  // advances once every eight seconds and stops at the end or when off screen.
  useEffect(() => {
    if (!playing) return;
    const phone = window.matchMedia("(max-width: 760px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (phone.matches || reduce.matches) setPlaying(false); };
    if (phone.matches || reduce.matches) { setPlaying(false); return; }
    const timer = window.setTimeout(() => {
      if (step === CHAPTERS.length - 1) setPlaying(false);
      else setStep(s => s + 1);
    }, 8000);
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) setPlaying(false); });
    if (section.current) observer.observe(section.current);
    phone.addEventListener("change", stop); reduce.addEventListener("change", stop);
    const hidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", hidden);
    return () => { clearTimeout(timer); observer.disconnect(); phone.removeEventListener("change", stop); reduce.removeEventListener("change", stop); document.removeEventListener("visibilitychange", hidden); };
  }, [playing, step]);

  const choose = (n: number) => { setPlaying(false); setStep(n); };
  const chapter = CHAPTERS[step];
  return <section ref={section} id="one-request" className="request-story" aria-labelledby="request-title">
    <header className="request-story-heading"><h2 id="request-title">One report.<br />A connected record.</h2><p>From the first message to the city map.</p></header>
    <div className="request-story-body">
      <div className="request-story-copy">
        <nav className="request-story-steps" aria-label="Follow the report">{CHAPTERS.map((c, i) => <button type="button" key={c.label} aria-current={step === i ? "step" : undefined} onClick={() => choose(i)}><span aria-hidden>{i < step ? <Check size={16} /> : i + 1}</span>{c.label}</button>)}</nav>
        <div className="request-story-caption" aria-live="polite" aria-atomic="true"><h3>{chapter.title}</h3><p>{chapter.text}</p></div>
        <p className="request-story-status">WhatsApp intake in pilot · Illustrative workflow</p>
      </div>
      <div className="request-story-stage" data-chapter={step}>
        <div className="request-story-stage-top"><span>StrayPaw</span><span>{step === 3 ? city : "Example report"}</span></div>
        <div key={step} className="request-story-scene">
          {step === 0 && <div className="rs-chat"><header><b>SP</b><span>StrayPaw<small>WhatsApp · pilot preview</small></span></header><div className="rs-chat-body"><p className="rs-bubble">There’s a brown dog near the bus stand with a limp.<small>8:42 <CheckCheck size={15} aria-hidden /></small></p><div className="rs-attachment"><Camera size={26} aria-hidden /><span>Photo attached<small>Injury photo kept out of this preview</small></span></div><p className="rs-location"><MapPin size={17} aria-hidden />{place} · approximate area</p></div><button type="button" className="rs-send" onClick={() => choose(1)}>Send example report<SendHorizontal size={18} aria-hidden /></button></div>}
          {step === 1 && <div className="rs-record"><p className="rs-record-label">Organisation workspace</p><span className="rs-state">Review required</span><h4>Brown dog, limping</h4><p className="rs-place"><MapPin size={16} aria-hidden />{place}</p><ol className="rs-timeline"><li><Check size={16} aria-hidden /><span><b>Report received</b><small>Photo and area stay together</small></span></li><li><span className="rs-point" /><span><b>Team reviews the request</b><small>Acceptance is a team decision</small></span></li><li><span className="rs-point" /><span><b>Assign a person, if accepted</b><small>Updates return to the resident</small></span></li></ol><p className="rs-record-foot">A report keeps its reference through every handover.</p></div>}
          {step === 2 && <div className="rs-record"><p className="rs-record-label">The animal’s history</p><h4>Every entry stays connected.</h4><ol className="rs-timeline"><li><span className="rs-point" /><span><b>Observation received</b><small>The original report, photo and area</small></span></li><li><span className="rs-point is-care" /><span><b>Care entry, if provided</b><small>What was done, when and by whom</small></span></li><li><span className="rs-point is-care" /><span><b>Follow-up, if recorded</b><small>The next check stays with the animal</small></span></li></ol><p className="rs-record-foot">One animal’s history, across cases and teams.</p></div>}
          {step === 3 && <div className="rs-city"><svg viewBox="0 0 360 340" role="img" aria-label={`Recorded areas in ${city}`}><g>{dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.open ? 4.5 : 2.5} fill={d.open ? "#ff8a3d" : "#8fb7ff"} opacity={d.open ? 1 : .52} />)}</g></svg><div className="rs-city-caption"><b>{city}</b><span>{areas.length.toLocaleString("en-IN")} recorded areas</span><small>{recordedAt ? `Snapshot · ${recordedAt}` : "Public record"}. Recorded areas, not citywide coverage.</small></div></div>}
        </div>
        <div className="request-story-controls"><button type="button" onClick={() => choose(step - 1)} disabled={step === 0} aria-label="Previous step"><ArrowLeft size={19} aria-hidden /></button><span>{step + 1} of {CHAPTERS.length}</span><button type="button" className="rs-play" aria-label={playing ? "Pause the story" : "Play the story slowly"} aria-pressed={playing} onClick={() => { if (step === 3 && !playing) setStep(0); setPlaying(v => !v); }}>{playing ? <Pause size={17} aria-hidden /> : <Play size={17} aria-hidden />}{playing ? "Pause" : "Play"}</button><button type="button" className="rs-next" onClick={() => choose(step === 3 ? 0 : step + 1)}>{step === 3 ? "Replay" : "Next"}{step === 3 ? <RotateCcw size={17} aria-hidden /> : <ArrowRight size={17} aria-hidden />}</button></div>
      </div>
    </div>
    <p className="request-story-note">Example only. Acceptance and care depend on participating teams. <a href="/community/report">Report on the web</a>.</p>
  </section>;
}
