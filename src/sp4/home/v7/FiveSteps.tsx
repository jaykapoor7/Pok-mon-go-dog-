"use client";

/* ════════════════════════════════════════════════════════════════════
   Use cases: the five steps of an ABC programme, each a full product
   screen with what Kaju does in it. On a laptop the section is pinned and
   the steps change as you scroll (tabs jump straight to a step); on a phone
   the tabs switch the screen. Illustrative records throughout.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Camera, Check, ChevronRight, FileSpreadsheet, FileText, MapPin, MessageCircle, Search, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";

type Step = { key: string; n: string; tab: string; title: string; lede: string; kaju: string[]; link: { href: string; label: string }; screen: ReactNode };

const STEPS: Step[] = [
  { key: "receive", n: "01", tab: "Receive", title: "Every report becomes a case, not a lost message.",
    lede: "Field staff and the public keep reporting the way they already do. Kaju reads the WhatsApp group, the call log and community reports, and prepares each one as a case.",
    kaju: ["Turns photos, voice notes and addresses into draft cases", "Spots a report about an animal you already have open", "Places each report in its ward, ready to assign"],
    link: { href: "/whatsapp", label: "How intake works" }, screen: <ReceiveScreen /> },
  { key: "register", n: "02", tab: "Register", title: "One record per animal, however it was spelled.",
    lede: "The register is the base of every claim. Kaju keeps it clean: one animal, one ID, its photos, ear notch and history, from capture to release.",
    kaju: ["Finds the same dog registered twice under two names", "Fills sex, coat and notch from the capture photos", "Keeps imported registers labelled until a person checks them"],
    link: { href: "/abc-operations#capture", label: "How registration works" }, screen: <RegisterScreen /> },
  { key: "treat", n: "03", tab: "Treat", title: "The vet signs. Kaju does the paperwork.",
    lede: "Procedures are recorded against the animal and authorised by a named vet. Kaju drafts the surgical record from the OT register, so the vet only checks and signs.",
    kaju: ["Drafts each surgical note from the OT register", "Checks the dose against the animal's weight", "Lines up today's sign-off list for the vet"],
    link: { href: "/abc-operations#treatment", label: "How sign-off works" }, screen: <TreatScreen /> },
  { key: "release", n: "04", tab: "Release", title: "Released where captured, with proof.",
    lede: "Every release needs a photo and a place that matches the capture ward. Kaju checks both the same day, while the field team can still fix a gap.",
    kaju: ["Matches each release to its capture ward on the map", "Finds releases missing a photo before the month closes", "Asks the right field worker on WhatsApp, by name"],
    link: { href: "/abc-operations#evidence", label: "How evidence works" }, screen: <ReleaseScreen /> },
  { key: "submit", n: "05", tab: "Submit & bill", title: "The monthly claim, ready the day it is due.",
    lede: "Approved records become the package the municipal office reviews: counts, rates, evidence index and exceptions, every figure linked to its animal.",
    kaju: ["Builds the claim at your contract rates", "Explains every exception before the office asks", "Exports the package as PDF, Excel and slides"],
    link: { href: "/abc-operations#report", label: "How packages work" }, screen: <SubmitScreen /> },
];

export function FiveSteps() {
  const box = useRef<HTMLElement>(null);
  const [on, setOn] = useState(0);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1000px) and (min-height: 700px)");
    const set = () => setPinned(mq.matches); set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  useEffect(() => {
    if (!pinned) return;
    let raf = 0;
    const tick = () => {
      raf = 0; const el = box.current; if (!el) return;
      const r = el.getBoundingClientRect(); const span = el.offsetHeight - window.innerHeight;
      const p = Math.min(0.999, Math.max(0, -r.top / Math.max(1, span)));
      setOn(Math.floor(p * STEPS.length));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [pinned]);
  const go = (i: number) => {
    const el = box.current;
    if (!pinned || !el) { setOn(i); return; }
    const span = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + span * ((i + 0.5) / STEPS.length);
    window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const s = STEPS[on];
  return (
    <section ref={box} id="workflow" className={`s7-steps${pinned ? " is-pinned" : ""}`} aria-labelledby="steps-title" style={pinned ? { height: `${STEPS.length * 85 + 40}vh` } : undefined}>
      <div className="s7-steps-pin">
        <div className="s4-wrap">
          <div className="s7-steps-head">
            <h2 id="steps-title" className="s4-h2">Use cases</h2>
            <p>Five steps run every ABC programme. Kaju works inside each one.</p>
          </div>
          <div className="s7-steps-tabs" role="tablist" aria-label="The five steps">
            {STEPS.map((x, i) => (
              <button key={x.key} type="button" role="tab" aria-selected={on === i} aria-controls="s7-step-panel" onClick={() => go(i)}>
                <span className="s7-steps-n">{x.n}</span>{x.tab}
                {on === i && <i className="s7-steps-bar" aria-hidden />}
              </button>
            ))}
          </div>
          <div id="s7-step-panel" role="tabpanel" className="s7-step" key={s.key}>
            <div className="s7-step-copy">
              <h3>{s.title}</h3>
              <p>{s.lede}</p>
              <div className="s7-step-kaju">
                <p><KajuFace size={20} /> <b>What Kaju does here</b></p>
                <ul>{s.kaju.map((k) => <li key={k}><Check size={15} aria-hidden />{k}</li>)}</ul>
              </div>
              <Link href={s.link.href} className="s7-link">{s.link.label} <ChevronRight size={18} aria-hidden /></Link>
            </div>
            <div className="s7-step-stage" aria-hidden>
              <div className="s7-screen">{s.screen}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── shared screen chrome ─────────────────────────────────────────── */
function Win({ title, tabs, badge, children }: { title: ReactNode; tabs?: string[]; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="s7-win">
      <div className="s7-win-top"><b>{title}</b>{tabs && <span className="s7-seg">{tabs.map((t, i) => <span key={t} className={i === 0 ? "is-on" : ""}>{t}</span>)}</span>}<span className="s7-win-end">{badge}</span></div>
      <div className="s7-win-body">{children}</div>
    </div>
  );
}
function KajuNote({ children }: { children: ReactNode }) { return <div className="s7-kn"><span className="s7-kn-face"><KajuFace size={16} /></span><div>{children}</div></div>; }

/* ── 01 · Receive: the WhatsApp group becomes draft cases ─────────── */
function ReceiveScreen() {
  const msgs: [string, string, string, boolean?][] = [
    ["Ravi", "07:42", "Brown female near the market gate, limping back left leg. Not notched.", true],
    ["Meena", "08:05", "Pup with mange outside the Ward 9 school, mother around", true],
    ["Public · 98xxxx2210", "08:31", "Dog hit by auto on Canal Road, bleeding, please come"],
    ["Ravi", "09:10", "Same brown female, now near the bus stand", true],
  ];
  return (
    <Win title="Intake" tabs={["Inbox", "Drafts", "Assigned"]} badge={<span className="s7-pill is-blue">12 drafts</span>}>
      <div className="s7-rx">
        <ul className="s7-rx-list">
          <li className="s7-rx-src"><MessageCircle size={13} /> Ward 14 field team · WhatsApp</li>
          {msgs.map(([w, t, x, ph], i) => (
            <li key={i} className={i === 0 ? "is-on" : ""}><span className="s7-av">{w[0]}</span><span><b>{w}</b><small>{x}</small>{ph && <em><Camera size={11} /> 2 photos</em>}</span><time>{t}</time></li>
          ))}
        </ul>
        <div className="s7-rx-draft">
          <p className="s7-cap">Draft case · prepared by Kaju</p>
          <div className="s7-rx-photos"><i className="p0" /><i className="p1" /></div>
          <dl>
            <div><dt>Animal</dt><dd>Adult female · brown · not ear-notched</dd></div>
            <div><dt>Condition</dt><dd>Limping, back left leg</dd></div>
            <div><dt>Place</dt><dd><MapPin size={12} /> Market gate · Ward 14</dd></div>
            <div><dt>Reported by</dt><dd>Ravi · 07:42</dd></div>
          </dl>
          <KajuNote><b>09:10 is the same dog.</b> Ravi saw her again near the bus stand. Merged into this case.</KajuNote>
          <div className="s7-row"><span className="s7-btn is-blue">Confirm case</span><span className="s7-btn">Assign to Ravi</span></div>
        </div>
      </div>
    </Win>
  );
}

/* ── 02 · Register: the animal register, with a duplicate found ───── */
function RegisterScreen() {
  const rows: [string, string, string, string, string, string, string, string?][] = [
    ["SP-1031", "Bruno", "M", "Black, tan legs", "Notched", "Ward 14", "Released"],
    ["SP-1042", "Lali", "F", "Brown", "Notched", "Ward 14", "In care"],
    ["SP-1044", "—", "F", "White, black ear", "Notched", "Ward 12", "Released"],
    ["SP-1067", "Laali", "F", "Brown", "Notched", "Ward 14", "In care", "dup"],
    ["SP-1071", "Sheru", "M", "Fawn", "Not yet", "Ward 9", "Captured"],
    ["SP-1078", "—", "F", "Black", "Notched", "Ward 17", "Released"],
  ];
  return (
    <Win title="Animal register" tabs={["All animals", "In care", "Released"]} badge={<span className="s7-search"><Search size={12} /> Search 2,277 animals</span>}>
      <table className="s7-table">
        <thead><tr><th>ID</th><th /><th>Name</th><th>Sex</th><th>Coat</th><th>Ear notch</th><th>Ward</th><th>Status</th></tr></thead>
        <tbody>{rows.map(([id, nm, sx, coat, ear, w, st, flag]) => (
          <tr key={id} className={flag ? "is-flag" : id === "SP-1042" ? "is-pair" : ""}><td className="s7-mono">{id}</td><td><i className={`s7-thumb t${id.slice(-1)}`} /></td><td>{nm}</td><td>{sx}</td><td>{coat}</td><td>{ear}</td><td>{w}</td><td><span className={`s7-pill ${st === "Released" ? "is-green" : st === "In care" ? "is-amber" : ""}`}>{st}</span></td></tr>
        ))}</tbody>
      </table>
      <KajuNote><b>SP-1042 and SP-1067 look like the same dog (94%).</b> Same coat, same notch, captured 40 m apart, names spelled two ways. <span className="s7-inline-btn">Compare and merge</span></KajuNote>
    </Win>
  );
}

/* ── 03 · Treat: a surgical record drafted for the vet's signature ── */
function TreatScreen() {
  return (
    <Win title={<><FileText size={14} /> Surgical record · SP-1071</>} badge={<span className="s7-pill is-amber">Waiting for Dr. Rao</span>}>
      <div className="s7-doc">
        <div className="s7-doc-page">
          <p className="s7-doc-h">Ovariohysterectomy · 30 Oct 2026</p>
          <p className="s7-doc-meta">Sheru · male? <s>male</s> female on examination · 14.2 kg · Ward 9 capture</p>
          <p><mark>Procedure completed under general anaesthesia. Flank approach, 2 cm incision, closed in three layers with absorbable suture.</mark></p>
          <p><mark>Ear notched (left). Anti-rabies vaccine given, batch ARV-2291. Recovery normal; release after 72 hours.</mark></p>
          <p className="s7-doc-dim">Meloxicam 0.2 mg/kg · 2.8 mg given · dose matches weight</p>
        </div>
        <div className="s7-doc-side">
          <p className="s7-cap"><Sparkles size={11} /> Kaju drafted this from</p>
          <ul>
            <li><FileSpreadsheet size={13} /> OT register, row 18</li>
            <li><Camera size={13} /> 3 surgery photos</li>
            <li><FileText size={13} /> Capture record SP-1071</li>
          </ul>
          <KajuNote><b>Sex corrected</b> from the capture record after examination. Highlighted text is Kaju&apos;s draft.</KajuNote>
          <span className="s7-btn is-blue is-full"><ShieldCheck size={14} /> Authorise in my name</span>
          <small className="s7-doc-foot">Only Dr. Rao can sign. Kaju never authorises.</small>
        </div>
      </div>
    </Win>
  );
}

/* ── 04 · Release: release vs capture on the ward map, photo gaps ─── */
function ReleaseScreen() {
  const pins: [number, number, boolean][] = [[22, 38, true], [34, 52, true], [48, 30, true], [58, 62, false], [68, 42, true], [40, 70, true], [76, 58, false], [30, 26, true], [62, 22, true]];
  return (
    <Win title="Releases · this week" tabs={["Map", "List"]} badge={<span className="s7-pill is-amber">3 need a photo</span>}>
      <div className="s7-rel">
        <div className="s7-map">
          <svg viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden>
            <path d="M8 12 L60 6 L92 20 L88 70 L40 76 L10 60 Z" className="s7-ward" />
            <path d="M0 44 Q30 40 50 46 T100 40" className="s7-road" /><path d="M46 0 Q50 30 44 80" className="s7-road" />
          </svg>
          {pins.map(([x, y, ok], i) => <span key={i} className={`s7-pin ${ok ? "is-ok" : "is-miss"}`} style={{ left: `${x}%`, top: `${y}%` }} />)}
          <span className="s7-map-label">Ward 14 boundary</span>
        </div>
        <ul className="s7-rel-list">
          {[["SP-1031", "Released at capture point", true], ["SP-1044", "No release photo", false], ["SP-1067", "No release photo", false], ["SP-1078", "Released 2.1 km from capture", false], ["SP-1083", "Released at capture point", true]].map(([id, t, ok]) => (
            <li key={id as string}><span className={`s7-chk ${ok ? "is-ok" : "is-miss"}`}>{ok ? <Check size={11} strokeWidth={3} /> : <TriangleAlert size={11} />}</span><span className="s7-mono">{id as string}</span><span>{t as string}</span></li>
          ))}
        </ul>
      </div>
      <KajuNote><b>Asked Ravi and Meena on WhatsApp</b> for the two missing photos. SP-1078 is flagged for the coordinator: released outside its capture ward.</KajuNote>
    </Win>
  );
}

/* ── 05 · Submit: the claim at contract rates, plus the package ───── */
function SubmitScreen() {
  const lines: [string, string, string, string][] = [
    ["Sterilisation (female)", "88", "₹1,650", "₹1,45,200"],
    ["Sterilisation (male)", "54", "₹1,450", "₹78,300"],
    ["Anti-rabies vaccination", "139", "₹120", "₹16,680"],
    ["Post-operative care days", "426", "₹150", "₹63,900"],
  ];
  return (
    <Win title={<><span className="s7-xl">X</span> October claim · Ward 14.xlsx</>} badge={<span className="s7-pill is-green">Ready to submit</span>}>
      <div className="s7-claim">
        <table className="s7-sheet">
          <thead><tr><th /><th>A · Item</th><th>B · Count</th><th>C · Rate</th><th>D · Amount</th></tr></thead>
          <tbody>
            {lines.map(([a, b, c, d], i) => <tr key={a}><th>{i + 2}</th><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>)}
            <tr className="is-total"><th>6</th><td>Total claimed</td><td /><td /><td>₹3,04,080</td></tr>
          </tbody>
        </table>
        <div className="s7-pack">
          <p className="s7-cap">Package for the municipal office</p>
          {[["PDF", "Summary and evidence index", "is-red"], ["XLSX", "Claim at contract rates", "is-green"], ["PPTX", "Monday review · 6 slides", "is-orange"]].map(([k, t, c]) => <div key={k} className="s7-file"><span className={`s7-ft ${c}`}>{k}</span><span>{t}</span></div>)}
          <KajuNote><b>4 exceptions, each explained:</b> 2 release photos taken late, 1 dose corrected, 1 animal held 2 extra days for a wound check.</KajuNote>
          <span className="s7-btn is-blue is-full">Review and submit <ArrowRight size={14} /></span>
        </div>
      </div>
    </Win>
  );
}
