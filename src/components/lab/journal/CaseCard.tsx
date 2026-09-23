"use client";

/* One record, filling up. The card is StrayPaw's record of a
   dog found in Veerakeralam: as it scrolls into view each entry is typed on
   in the order it was made, the dose boxes are ticked, and the stamps land
   in the order the work was done. Nothing is added that the record does
   not hold. */

import { useEffect, useRef, useState } from "react";
import { Stamp } from "./parts";

type Entry = { day: number; date: string; label: string; kind: string };

export function CaseCard({ id, place, entries, dateOf }: { id: string; place: string; entries: Entry[]; dateOf: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const step = 0.28;
  const doses = entries.filter((e) => e.kind === "vacc");
  const close = entries.find((e) => e.kind === "close");
  const tDose = entries.length * step;
  return (
    <div ref={ref} className={`fj-card${on ? " on" : ""}`}>
      <div className="fj-card-top">
        <b>RECORD {id}</b>
        <span>{place} · Coimbatore</span>
        <span>StrayPaw register</span>
      </div>
      <div className="fj-card-body">
        <div className="fj-ruled" style={{ ["--fj-mx" as string]: "0px" }}>
          {entries.map((e, i) => (
            <div key={i} className="fj-line">
              <span className="d">{dateOf[e.date]}</span>
              <span className="d">D{e.day}</span>
              <span className="e" style={{ transitionDelay: `${i * step}s`, fontWeight: e.kind === "case" || e.kind === "close" ? 700 : 400 }}>{e.label}</span>
            </div>
          ))}
        </div>
        <div>
          <span className="caps" style={{ color: "var(--fj-grey)" }}>Vaccination doses, as recorded</span>
          <div className="fj-doses">
            {doses.map((d, i) => (
              <div key={i} className="fj-dose">
                <svg viewBox="0 0 54 54" aria-hidden>
                  <rect x="6" y="6" width="42" height="42" fill="none" stroke="var(--fj-ink)" strokeWidth="2" />
                  <path className="tick" d="M13 29 L23 39 L44 12" fill="none" stroke="var(--fj-pen)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transitionDelay: `${tDose + i * 0.35}s` }} />
                </svg>
                <span>Day {d.day}<br />{dateOf[d.date]}</span>
              </div>
            ))}
          </div>
          <p className="t" style={{ marginTop: 14, fontSize: 13.5, lineHeight: 1.5, color: "var(--fj-grey)" }}>
            {doses.length} doses over {doses[doses.length - 1]?.day ?? 0} days — the spacing of an anti-rabies (ARV) schedule.
          </p>
          <div className="fj-card-stamps" aria-label="Stamps on this record">
            <Stamp r={-6} style={{ left: "2%", top: 10, animationDelay: `${0.4}s` }}>Sterilised · ABC</Stamp>
            <Stamp r={4} blue style={{ left: "30%", top: 84, animationDelay: `${tDose + doses.length * 0.35}s` }}>Vaccinated ×{doses.length}</Stamp>
            {close && <Stamp r={-2} style={{ left: "6%", top: 160, animationDelay: `${tDose + doses.length * 0.35 + 0.5}s` }}>Closed · {close.label.split(": ")[1] ?? "resolved"}</Stamp>}
          </div>
        </div>
      </div>
      <div className="fj-card-foot">Transcribed from the StrayPaw register: every entry, in the order it was made, unedited.</div>
    </div>
  );
}
