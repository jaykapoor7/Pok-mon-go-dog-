"use client";

/* ════════════════════════════════════════════════════════════════════
   04 The actual platform. A point on the map opens into the software:
   one window, drawn exactly as the product draws itself (light sidebar,
   tabs, grey stage, white cards), with a view for each kind of team.
   Each view opens the same place in the live demo, as that role.
   The records are illustrative.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, FileText, FlaskConical, Home, Landmark, PawPrint, Sparkles, Stethoscope } from "lucide-react";
import { LIVE_DEMO_URL } from "@/lib/demo-site";

type Role = { id: string; label: string; who: string; place: string; tab: string; menu: [string, string][]; view: ReactNode; open: string };
const sq = (c: string) => <i className={`cn8-pw-sq c-${c}`} aria-hidden />;

const ROLES: Role[] = [
  { id: "ngo", label: "NGOs and veterinary teams", who: "Field teams capture, vets sign, coordinators review.", place: "Ward 14 ABC Unit", tab: "SP-1042", menu: [["flame", "Pipeline"], ["blue", "Animals"], ["green", "Reports"]], open: "Open as a coordinator",
    view: <div className="cn8-pv">
      <p className="cn8-pv-code">SP-1042 <span className="cn8-tag is-blue">In care</span></p>
      <p className="cn8-pv-h">Brown female, market gate</p>
      <ol className="cn8-rail">{["New", "In care", "With the vet", "Evidence", "To report"].map((s, i) => <li key={s} className={i < 2 ? "is-done" : i === 2 ? "is-now" : undefined}>{s}</li>)}</ol>
      <div className="cn8-pv-next"><b>Next step</b><span>Sign the sterilisation and vaccination</span><em>Veterinarian</em></div>
      <ul className="cn8-pv-line">
        <li><i className="is-blue" />Captured at the market gate · 07:42 · GPS ±6 m<small>Field team</small></li>
        <li><i />Identity checked: same animal as SP-0977<small>Coordinator</small></li>
        <li><i className="is-green" />Anti-rabies vaccine, batch recorded<small>Veterinarian</small></li>
      </ul>
    </div> },
  { id: "city", label: "Municipal government", who: "The reviewing office decides on each package, figure by figure.", place: "Municipal review office", tab: "October package", menu: [["violet", "Review"], ["green", "Contracts"], ["slate", "Wards"]], open: "Open as a municipal reviewer",
    view: <div className="cn8-pv">
      <p className="cn8-pv-code">Ward 14 · October <span className="cn8-tag is-violet">Waiting for you</span></p>
      <p className="cn8-pv-h">131 sterilisations claimed, 2 exceptions</p>
      <ul className="cn8-pv-checks">{["Every record has its five evidence items", "Each procedure signed by a veterinarian", "Rates match the contract in force", "Arithmetic checked", "2 exceptions, each explained"].map((c, i) => <li key={c}><span className={i === 4 ? "is-amber" : ""}><Check size={10} strokeWidth={3} /></span>{c}</li>)}</ul>
      <div className="cn8-pv-acts"><span className="cn8-pv-btn is-primary">Accept</span><span className="cn8-pv-btn">Query a record</span><small>Accepting is the office&apos;s decision; it is not a payment.</small></div>
    </div> },
  { id: "research", label: "Researchers and spatial intelligence", who: "De-identified, suppressed counts by area and week.", place: "Programme research data", tab: "Bites by area", menu: [["teal", "Map"], ["green", "Extracts"], ["slate", "Methods"]], open: "Open the research view",
    view: <div className="cn8-pv">
      <p className="cn8-pv-code">Bites by area · last 12 weeks <span className="cn8-tag">Counts under 5 hidden</span></p>
      <svg className="cn8-pv-map" viewBox="0 0 320 150" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((k) => <path key={k} d={`M0 ${30 + k * 20} C 70 ${10 + k * 22}, 150 ${50 + k * 18}, 320 ${20 + k * 22}`} fill="none" stroke="#2457ce" strokeOpacity={0.14 + (k % 5 === 0 ? 0.2 : 0)} />)}
        {[[60, 60, 0.9], [96, 46, 0.5], [132, 78, 0.75], [170, 58, 0.3], [208, 92, 0.6], [246, 64, 0.2], [114, 108, 0.4]].map(([x, y, v], k) => <g key={k}><circle cx={x} cy={y} r={7 + v * 12} fill="#2457ce" fillOpacity={0.1 + v * 0.25} /><circle cx={x} cy={y} r={3} fill="#2457ce" /></g>)}
        <rect x="236" y="104" width="64" height="26" rx="6" fill="url(#cn8-hatch)" stroke="#c9d1e0" />
        <defs><pattern id="cn8-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#c9d1e0" strokeWidth="2" /></pattern></defs>
      </svg>
      <p className="cn8-pv-foot">Every count says where it comes from and what it leaves out.</p>
    </div> },
  { id: "health", label: "Hospitals and public health", who: "Clinicians record bites and courses; nurses record doses.", place: "Teaching Hospital", tab: "Doses due", menu: [["flame", "Bite register"], ["teal", "Record a bite"], ["violet", "Services"]], open: "Open as a hospital clinician",
    view: <div className="cn8-pv">
      <p className="cn8-pv-code">Today · Teaching Hospital <span className="cn8-tag is-amber">5 overdue</span></p>
      <ul className="cn8-pv-rows">{[["Dose 2 of 5 · OPD-0058", "26 days overdue", "flame"], ["Dose 3 of 5 · OPD-0026", "Due today", "blue"], ["Dose 4 of 5 · OPD-0047", "Due today", "blue"]].map(([a, b, c]) => <li key={a}><i className={`is-${c}`} /><span><b>{a}</b><small>{b}</small></span><span className="cn8-pv-btn is-primary">Record dose</span></li>)}</ul>
      <p className="cn8-pv-foot">Patients are identified by the hospital&apos;s own register number. The software never assesses or prescribes.</p>
    </div> },
  { id: "csr", label: "CSR sponsors", who: "What the money did, with each figure traceable to its records.", place: "Sponsor report", tab: "Q3 impact", menu: [["green", "Impact"], ["blue", "Programmes"], ["slate", "Evidence"]], open: "See a sample report",
    view: <div className="cn8-pv">
      <p className="cn8-pv-code">Q3 · two wards <span className="cn8-tag is-green">Evidence attached</span></p>
      <div className="cn8-pv-kpis">{[["Sterilised", "142"], ["Vaccinated", "139"], ["Released", "131"]].map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
      <div className="cn8-pv-bar"><span style={{ width: "92%" }} /></div>
      <p className="cn8-pv-foot">92% of records carry all five evidence items. Each figure opens the records it counts.</p>
    </div> },
];
const ICON: Record<string, typeof Home> = { ngo: PawPrint, city: Landmark, research: FlaskConical, health: Stethoscope, csr: FileText };

export function Platform() {
  const [at, setAt] = useState(0);
  /* null until the page has run: the window is clipped only once there is a script to open it */
  const [inView, setIn] = useState<boolean | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIn(true); io.disconnect(); } else setIn((v) => v ?? false); }, { threshold: 0.2 });
    io.observe(el); return () => io.disconnect();
  }, []);
  const r = ROLES[at];
  return (
    <section className="cn8-sec cn8-plat" aria-labelledby="cn8-plat-h">
      <div className="cn8-wrap">
        <p className="cn8-k">The actual platform</p>
        <h2 id="cn8-plat-h" className="cn8-h2">A point on the map opens into the software that runs the work.</h2>
        <div className="cn8-plat-tabs" role="tablist" aria-label="Who it is for">
          {ROLES.map((x, i) => { const I = ICON[x.id]; return <button key={x.id} type="button" role="tab" id={`cn8-t-${x.id}`} aria-selected={at === i} aria-controls="cn8-plat-panel" onClick={() => setAt(i)}><I size={15} aria-hidden />{x.label}</button>; })}
        </div>
      </div>
      <div ref={box} className="cn8-pw-wrap"><div className={`cn8-pw-host${inView === false ? " is-wait" : ""}`}>
        <div className="cn8-pw" id="cn8-plat-panel" role="tabpanel" aria-labelledby={`cn8-t-${r.id}`}>
          <aside className="cn8-pw-side" aria-hidden>
            <p className="cn8-pw-org"><i>{r.place[0]}</i>{r.place}</p>
            <span className="cn8-pw-quick">Quick actions <kbd>⌘K</kbd></span>
            <p className="cn8-pw-item is-on"><Home size={13} />Today</p>
            <small>Modules</small>
            {r.menu.map(([c, l]) => <p key={l} className="cn8-pw-item">{sq(c)}{l}</p>)}
            <small>Platform</small>
            <p className="cn8-pw-item">{sq("ink")}Kaju</p>
          </aside>
          <div className="cn8-pw-main">
            <div className="cn8-pw-tabs" aria-hidden><span>Today</span><span className="is-on">{r.tab}</span><span>+</span></div>
            <div className="cn8-pw-stage">
              <p className="cn8-pw-demo">Illustrative records</p>
              <div key={r.id} className="cn8-pw-view">{r.view}</div>
              <div className="cn8-pw-kaju" aria-hidden><Sparkles size={13} />Ask Kaju about this</div>
            </div>
          </div>
        </div>
      </div></div>
      <div className="cn8-wrap cn8-plat-foot">
        <p>{r.who}</p>
        <a href={LIVE_DEMO_URL} className="cn8-btn is-line">{r.open} in the live demo<ArrowRight size={15} aria-hidden /></a>
      </div>
    </section>
  );
}
