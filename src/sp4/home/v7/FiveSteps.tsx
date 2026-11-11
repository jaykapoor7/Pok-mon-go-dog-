"use client";

/* ════════════════════════════════════════════════════════════════════
   Use cases: the five steps of an ABC programme, each a full product
   screen with what Kaju does in it. On a laptop the section is pinned and
   the steps change as you scroll (tabs jump straight to a step); on a phone
   the tabs switch the screen. Illustrative records throughout.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowRightLeft, Camera, Check, ChevronRight, FileSpreadsheet, FileText, FlaskConical, MapPin, MessageCircle, Search, ShieldCheck, Sparkles, Stethoscope, TriangleAlert } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";

type Step = { key: string; n: string; tab: string; title: string; lede: string; kaju: string[]; link: { href: string; label: string }; screen: ReactNode };

const STEPS: Step[] = [
  { key: "receive", n: "01", tab: "Receive", title: "Every report becomes a case.",
    lede: "Kaju turns WhatsApp messages and public reports into draft cases.",
    kaju: ["Drafts cases from photos and notes", "Merges repeat reports of one animal"],
    link: { href: "/whatsapp", label: "How intake works" }, screen: <ReceiveScreen /> },
  { key: "register", n: "02", tab: "Register", title: "One animal, one record.",
    lede: "Kaju keeps the register clean, however a name was spelled.",
    kaju: ["Finds the same dog registered twice", "Fills details from capture photos"],
    link: { href: "/abc-operations#capture", label: "How registration works" }, screen: <RegisterScreen /> },
  { key: "treat", n: "03", tab: "Treat", title: "The vet signs. Kaju drafts.",
    lede: "Surgical notes are drafted from the OT register, ready to check.",
    kaju: ["Drafts each note for the vet", "Checks dose against weight"],
    link: { href: "/abc-operations#treatment", label: "How sign-off works" }, screen: <TreatScreen /> },
  { key: "release", n: "04", tab: "Release", title: "Released where captured.",
    lede: "Kaju checks every release photo and place the same day.",
    kaju: ["Matches release to capture point", "Chases missing photos by name"],
    link: { href: "/abc-operations#evidence", label: "How evidence works" }, screen: <ReleaseScreen /> },
  { key: "submit", n: "05", tab: "Submit & bill", title: "The claim, ready on day one.",
    lede: "Approved records become the package the municipal office checks.",
    kaju: ["Builds the claim at contract rates", "Explains every exception"],
    link: { href: "/abc-operations#report", label: "How packages work" }, screen: <SubmitScreen /> },
];

/* The same frame tells a second story: a city rabies programme, where the work
   passes between a clinic, a field team, a laboratory and the programme cell. */
const CITY: Step[] = [
  { key: "record", n: "01", tab: "Record", title: "A bite is recorded once.",
    lede: "At the clinic desk, in a minute. The clinician decides; StrayPaw keeps the record.", kaju: [],
    link: { href: "/for-hospitals", label: "How bite care works" }, screen: <BiteScreen /> },
  { key: "followup", n: "02", tab: "Follow up", title: "The field team finds the animal.",
    lede: "The request carries the place and the animal, never the patient.", kaju: [],
    link: { href: "/for-ngos", label: "How requests work" }, screen: <FollowScreen /> },
  { key: "test", n: "03", tab: "Test", title: "A sample arrives with its history.",
    lede: "Every hand is recorded. The result carries its method.", kaju: [],
    link: { href: "/for-hospitals", label: "How the laboratory works" }, screen: <LabScreen /> },
  { key: "decide", n: "04", tab: "Decide", title: "The programme sees what to decide.",
    lede: "A confirmed case, a centre short of vaccine, coverage below target.", kaju: [],
    link: { href: "/for-governments", label: "How programme cells work" }, screen: <CellScreen /> },
  { key: "report", n: "05", tab: "Report", title: "One report, for everyone.",
    lede: "Partners see counts, never people. Small counts stay hidden.", kaju: [],
    link: { href: "/research", label: "How research data works" }, screen: <ProgrammeReportScreen /> },
];
const TRACKS: { key: string; label: string; steps: Step[] }[] = [{ key: "abc", label: "ABC programme", steps: STEPS }, { key: "city", label: "City rabies programme", steps: CITY }];

export function FiveSteps() {
  const box = useRef<HTMLElement>(null);
  const swipe = useRef<HTMLDivElement>(null);
  const [track, setTrack] = useState(0);
  const steps = TRACKS[track].steps;
  const [on, setOn] = useState(0);
  /* The screen arrives from the side you are moving toward. */
  const last = useRef(0);
  const dir = on >= last.current ? "fwd" : "back";
  useEffect(() => { last.current = on; }, [on]);
  const [prog, setProg] = useState(0);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1000px) and (min-height: 700px)");
    const set = () => setPinned(mq.matches); set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  // Laptop: the section is pinned and scrolling moves through the steps; a bar fills as you go.
  useEffect(() => {
    if (!pinned) return;
    let raf = 0;
    const tick = () => {
      raf = 0; const el = box.current; if (!el) return;
      const r = el.getBoundingClientRect(); const span = el.offsetHeight - window.innerHeight;
      const p = Math.min(0.999, Math.max(0, -r.top / Math.max(1, span)));
      setProg(p); setOn(Math.floor(p * steps.length));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [pinned]);
  // Phone: one step at a time. Tabs or a sideways swipe change it; the page does not grow.
  const tabs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pinned) return;
    const b = tabs.current?.children[on] as HTMLElement | undefined;
    const row = tabs.current;
    if (b && row) row.scrollTo({ left: b.offsetLeft - 16, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [on, pinned]);
  const touch = useRef<number | null>(null);
  const go = (i: number) => {
    const el = box.current;
    const smooth = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (!pinned) { setOn(Math.max(0, Math.min(steps.length - 1, i))); return; }
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + span * ((i + 0.5) / steps.length);
    window.scrollTo({ top, behavior: smooth });
  };
  const panel = (s: Step, key?: string) => (
    <div className="s7-step" key={key} data-dir={dir}>
      <div className="s7-step-copy">
        <h3>{s.title}</h3>
        <p>{s.lede}</p>
        <Link href={s.link.href} className="s7-link">{s.link.label} <ChevronRight size={18} aria-hidden /></Link>
      </div>
      <div className="s7-step-stage" aria-hidden>
        <div className="s7-screen">{s.screen}</div>
      </div>
    </div>
  );
  const s = steps[Math.min(on, steps.length - 1)];
  const pick = (i: number) => { if (i === track) return; setTrack(i); last.current = 0; if (pinned) go(0); else setOn(0); };
  return (
    <section ref={box} id="workflow" className={`s7-steps${pinned ? " is-pinned" : ""}`} aria-labelledby="steps-title" style={pinned ? { height: `${steps.length * 85 + 40}vh` } : undefined}>
      <div className="s7-steps-pin">
        <div className="s4-wrap">
          <div className="s7-steps-head">
            <h2 id="steps-title" className="s4-h2">Use cases</h2>
            <div className="s7-track" role="group" aria-label="Which programme" data-on={track}>
              {TRACKS.map((t, i) => <button key={t.key} type="button" aria-pressed={track === i} onClick={() => pick(i)}>{t.label}</button>)}
              <i aria-hidden />
            </div>
          </div>
          <div className="s7-steps-tabs" role="tablist" aria-label="The five steps" ref={tabs}>
            {steps.map((x, i) => (
              <button key={x.key} type="button" role="tab" aria-selected={on === i} aria-controls="s7-step-panel" onClick={() => go(i)}>
                {x.tab}
                {on === i && <i className="s7-steps-bar" aria-hidden />}
              </button>
            ))}
          </div>
          {pinned
            ? <div id="s7-step-panel" role="tabpanel">{panel(s, `${track}-${s.key}`)}</div>
            : <div id="s7-step-panel" role="tabpanel" className="s7-one" ref={swipe}
                onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => { const x0 = touch.current; touch.current = null; if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 48) go(on + (dx < 0 ? 1 : -1)); }}>
                {panel(s, `${track}-${s.key}`)}
                <div className="s7-one-nav">
                  <span className="s7-one-dots" aria-hidden>{steps.map((x, i) => <i key={x.key} className={i === on ? "is-on" : undefined} />)}</span>
                  {on < steps.length - 1 ? <button type="button" className="s7-one-next" onClick={() => go(on + 1)}>Next: {steps[on + 1].tab} <ArrowRight size={15} aria-hidden /></button> : <button type="button" className="s7-one-next" onClick={() => go(0)}>Start again</button>}
                </div>
              </div>}
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
  const msgs: [string, string, string][] = [
    ["Ravi", "07:42", "Brown female, limping, market gate"],
    ["Meena", "08:05", "Pup with mange near the school"],
    ["Ravi", "09:10", "Same brown female, bus stand"],
  ];
  return (
    <Win title="Intake" tabs={["Inbox", "Drafts"]} badge={<span className="s7-pill is-blue">3 new</span>}>
      <div className="s7-rx">
        <ul className="s7-rx-list">
          <li className="s7-rx-src"><MessageCircle size={13} /> Field team · WhatsApp</li>
          {msgs.map(([w, t, x], i) => (
            <li key={i} className={i === 0 ? "is-on" : ""}><span className="s7-av">{w[0]}</span><span><b>{w}</b><small>{x}</small></span><time>{t}</time></li>
          ))}
        </ul>
        <div className="s7-rx-draft">
          <p className="s7-cap">Draft case · by Kaju</p>
          <div className="s7-rx-photos"><i className="p0" /><i className="p1" /></div>
          <dl>
            <div><dt>Animal</dt><dd>Female · brown</dd></div>
            <div><dt>Place</dt><dd><MapPin size={12} /> Ward 14</dd></div>
          </dl>
          <KajuNote><b>09:10 is the same dog.</b> Merged.</KajuNote>
          <div className="s7-row"><span className="s7-btn is-blue">Confirm</span></div>
        </div>
      </div>
    </Win>
  );
}

/* ── 02 · Register: the animal register, with a duplicate found ───── */
function RegisterScreen() {
  const rows: [string, string, string, string, string?][] = [
    ["SP-1031", "Bruno", "Ward 14", "Released"],
    ["SP-1042", "Lali", "Ward 14", "In care", "pair"],
    ["SP-1044", "—", "Ward 12", "Released"],
    ["SP-1067", "Laali", "Ward 14", "In care", "pair"],
    ["SP-1071", "Sheru", "Ward 9", "Captured"],
  ];
  return (
    <Win title="Animal register" badge={<span className="s7-search"><Search size={12} /> 2,277 animals</span>}>
      <table className="s7-table">
        <thead><tr><th>ID</th><th /><th>Name</th><th>Ward</th><th>Status</th></tr></thead>
        <tbody>{rows.map(([id, nm, w, st, flag]) => (
          <tr key={id} className={flag ? "is-flag" : ""}><td className="s7-mono">{id}</td><td><i className={`s7-thumb t${id.slice(-1)}`} /></td><td>{nm}</td><td>{w}</td><td><span className={`s7-pill ${st === "Released" ? "is-green" : st === "In care" ? "is-amber" : ""}`}>{st}</span></td></tr>
        ))}</tbody>
      </table>
      <KajuNote><b>Lali and Laali are the same dog.</b> <span className="s7-inline-btn">Merge</span></KajuNote>
    </Win>
  );
}

/* ── 03 · Treat: a surgical record drafted for the vet's signature ── */
function TreatScreen() {
  return (
    <Win title={<><FileText size={14} /> Surgical record · SP-1071</>} badge={<span className="s7-pill is-amber">Awaiting Dr. Rao</span>}>
      <div className="s7-doc">
        <div className="s7-doc-page">
          <p className="s7-doc-h">Sterilisation · 30 Oct</p>
          <p className="s7-doc-meta">Sheru · female · 14.2 kg · Ward 9</p>
          <p><mark>Procedure completed under general anaesthesia. Ear notched. Anti-rabies given.</mark></p>
          <p className="s7-doc-dim"><Check size={12} /> Dose matches weight</p>
        </div>
        <div className="s7-doc-side">
          <p className="s7-cap"><Sparkles size={11} /> Drafted from</p>
          <ul>
            <li><FileSpreadsheet size={13} /> OT register</li>
            <li><Camera size={13} /> 3 photos</li>
          </ul>
          <span className="s7-btn is-blue is-full"><ShieldCheck size={14} /> Sign</span>
          <small className="s7-doc-foot">Only the vet can sign.</small>
        </div>
      </div>
    </Win>
  );
}

/* ── 04 · Release: release vs capture on the ward map, photo gaps ─── */
function ReleaseScreen() {
  /* capture point → release point; ok = released within the ward with a photo */
  const trips: { c: [number, number]; r: [number, number]; ok: boolean; id: string }[] = [
    { c: [118, 92], r: [126, 98], ok: true, id: "SP-1031" },
    { c: [212, 70], r: [204, 78], ok: true, id: "SP-1083" },
    { c: [262, 150], r: [268, 160], ok: false, id: "SP-1044" },
    { c: [160, 182], r: [154, 190], ok: true, id: "SP-1090" },
    { c: [300, 96], r: [372, 214], ok: false, id: "SP-1078" },
  ];
  return (
    <Win title="Releases · this week" badge={<span className="s7-pill is-amber">2 to fix</span>}>
      <div className="s7-rel">
        <div className="s7-map" aria-hidden>
          <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
            <rect width="400" height="240" fill="#eef1ec" />
            {/* city blocks */}
            {[[20, 20, 70, 50], [100, 20, 80, 40], [190, 15, 90, 45], [300, 20, 80, 55], [20, 90, 60, 70], [92, 110, 90, 50], [196, 98, 80, 40], [292, 110, 90, 45], [20, 175, 100, 50], [135, 205, 90, 30], [240, 175, 70, 50], [324, 175, 60, 50]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="4" fill="#e3e7e0" />)}
            <rect x="196" y="150" width="80" height="16" rx="4" fill="#d7ecd3" />
            <path d="M0 214 Q80 206 140 222 T260 236" stroke="#c9dcef" strokeWidth="10" fill="none" />
            {/* roads */}
            <path d="M0 80 H400 M0 168 H400 M90 0 V240 M186 0 V240 M288 0 V240" stroke="#fff" strokeWidth="7" />
            <path d="M0 80 H400 M0 168 H400 M90 0 V240 M186 0 V240 M288 0 V240" stroke="#f7d9a6" strokeWidth="1.2" opacity=".6" />
            {/* ward boundary */}
            <path d="M40 40 L330 30 L345 200 L60 210 Z" fill="rgba(36,87,206,.06)" stroke="#2457ce" strokeWidth="1.6" strokeDasharray="6 5" />
            <text x="48" y="56" fontSize="11" fontWeight="700" fill="#2457ce">WARD 14</text>
            {/* capture → release */}
            {trips.map((t) => <g key={t.id}>
              <line x1={t.c[0]} y1={t.c[1]} x2={t.r[0]} y2={t.r[1]} stroke={t.ok ? "#1f8a52" : "#d97706"} strokeWidth="1.6" strokeDasharray="3 3" />
              <circle cx={t.c[0]} cy={t.c[1]} r="4" fill="#fff" stroke={t.ok ? "#1f8a52" : "#d97706"} strokeWidth="2" />
              <circle cx={t.r[0]} cy={t.r[1]} r="7" fill={t.ok ? "#1f8a52" : "#d97706"} stroke="#fff" strokeWidth="2.5" className={t.ok ? "" : "s7-ping"} />
            </g>)}
          </svg>
          <span className="s7-map-key"><i className="is-c" /> Capture <i className="is-ok" /> Released <i className="is-miss" /> To fix</span>
        </div>
        <ul className="s7-rel-list">
          {[["SP-1031", "At capture point", true], ["SP-1044", "No release photo", false], ["SP-1078", "Outside the ward", false]].map(([id, t, ok]) => (
            <li key={id as string}><span className={`s7-chk ${ok ? "is-ok" : "is-miss"}`}>{ok ? <Check size={11} strokeWidth={3} /> : <TriangleAlert size={11} />}</span><span className="s7-mono">{id as string}</span><span>{t as string}</span></li>
          ))}
        </ul>
      </div>
      <KajuNote><b>Asked Ravi for SP-1044&apos;s photo.</b></KajuNote>
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
          <KajuNote><b>4 exceptions, each explained.</b></KajuNote>
          <span className="s7-btn is-blue is-full">Review and submit <ArrowRight size={14} /></span>
        </div>
      </div>
    </Win>
  );
}

/* ════ City rabies programme: the same frame, five more screens. Illustrative
   records. Kaju appears only where he is allowed to read: requests between
   partners, never a clinic's register. ════ */

/* ── 01 · Record: the clinic's own register ───────────────────────── */
function BiteScreen() {
  const rows: [string, string, string][] = [["4471", "09:12", "Category III · dog, street"], ["4466", "08:40", "Category II · cat, owned"], ["4460", "Yesterday", "Category III · dog, street"]];
  return (
    <Win title="Clinic" tabs={["Register", "Due today"]} badge={<span className="s7-pill is-blue">3 this week</span>}>
      <div className="s7-rx">
        <ul className="s7-rx-list">
          <li className="s7-rx-src"><Stethoscope size={13} /> Bite register · this facility only</li>
          {rows.map(([n, t, x], i) => <li key={n} className={i === 0 ? "is-on" : ""}><span className="s7-av">{i + 1}</span><span><b>OPD {n}</b><small>{x}</small></span><time>{t}</time></li>)}
        </ul>
        <div className="s7-rx-draft">
          <p className="s7-cap">OPD 4471 · no name stored</p>
          <dl>
            <div><dt>Category</dt><dd>III · set by the clinician</dd></div>
            <div><dt>Animal</dt><dd><MapPin size={12} /> Dog, market gate</dd></div>
          </dl>
          <div className="s7-doses">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n === 1 ? "is-done" : n === 2 ? "is-due" : undefined}>{n === 1 ? <Check size={12} /> : n}</i>)}</div>
          <p className="s7-note"><b>Field team asked</b> to find the dog. No patient details shared.</p>
          <div className="s7-row"><span className="s7-btn is-blue">Record dose</span></div>
        </div>
      </div>
    </Win>
  );
}

/* ── 02 · Follow up: the request reaches the area's field team ────── */
function FollowScreen() {
  const rows: [string, string, string, string][] = [["T", "Teaching hospital", "Find and observe a dog · market gate", "Fri"], ["H", "Health centre", "Find a puppy near the school", "Overdue"], ["P", "Programme cell", "Vaccinate around a confirmed case", "Mon"]];
  return (
    <Win title="Requests" tabs={["Partners", "Samples"]} badge={<span className="s7-pill is-amber">1 overdue</span>}>
      <div className="s7-rx">
        <ul className="s7-rx-list">
          <li className="s7-rx-src"><ArrowRightLeft size={13} /> Requests from partners · your areas</li>
          {rows.map(([a, w, x, t], i) => <li key={w} className={i === 0 ? "is-on" : ""}><span className="s7-av">{a}</span><span><b>{w}</b><small>{x}</small></span><time>{t}</time></li>)}
        </ul>
        <div className="s7-rx-draft">
          <p className="s7-cap">Request · no patient details</p>
          <dl>
            <div><dt>Animal</dt><dd>Tan, torn left ear</dd></div>
            <div><dt>Place</dt><dd><MapPin size={12} /> Market gate</dd></div>
          </dl>
          <KajuNote><b>1 request is overdue.</b> Ravi is nearest.</KajuNote>
          <div className="s7-row"><span className="s7-btn is-blue">Accept</span></div>
        </div>
      </div>
    </Win>
  );
}

/* ── 03 · Test: chain of custody, then a result with its method ───── */
function LabScreen() {
  const hands: [string, string, string][] = [["Collected", "Field team · Ravi", "Mon 10:20"], ["Handed to courier", "Sealed, cold chain", "Mon 11:05"], ["Received", "Laboratory desk", "Mon 15:40"], ["Tested", "Fluorescent antibody test", "Tue 09:30"]];
  return (
    <Win title="Laboratory" tabs={["Samples", "Results"]} badge={<span className="s7-pill is-blue">Chain of custody</span>}>
      <div className="s7-rx">
        <ul className="s7-rx-list s7-hands">
          <li className="s7-rx-src"><FlaskConical size={13} /> Sample S-2611 · brain tissue</li>
          {hands.map(([a, w, t], i) => <li key={a} style={{ ["--i" as string]: i }}><span className="s7-av"><Check size={12} /></span><span><b>{a}</b><small>{w}</small></span><time>{t}</time></li>)}
        </ul>
        <div className="s7-rx-draft">
          <p className="s7-cap">Result · signed</p>
          <p className="s7-big">Positive</p>
          <dl>
            <div><dt>Method</dt><dd>Fluorescent antibody test</dd></div>
            <div><dt>Told</dt><dd>Sender · programme cell</dd></div>
          </dl>
          <div className="s7-row"><span className="s7-btn is-blue">Report result</span></div>
        </div>
      </div>
    </Win>
  );
}

/* ── 04 · Decide: the programme cell's open decisions and coverage ── */
function CellScreen() {
  const rows: [string, string, string][] = [["Rabies confirmed · HSR Layout", "Laboratory result, with its method", "Today"], ["Centre short of immunoglobulin", "3 people mid-course · referral set", "Today"], ["Follow-up unassigned", "Asked by a hospital", "2 days"]];
  const wards: [string, number][] = [["Ward 12", 78], ["Ward 13", 71], ["Ward 14", 64]];
  return (
    <Win title="Programme" tabs={["Overview", "Care network"]} badge={<span className="s7-pill is-blue">3 to decide</span>}>
      <div className="s7-rx">
        <ul className="s7-rx-list">
          <li className="s7-rx-src"><TriangleAlert size={13} /> Needs a decision</li>
          {rows.map(([a, x, t], i) => <li key={a} className={i === 0 ? "is-on" : ""}><span className="s7-av">{i + 1}</span><span><b>{a}</b><small>{x}</small></span><time>{t}</time></li>)}
        </ul>
        <div className="s7-rx-draft">
          <p className="s7-cap">Dogs vaccinated · against the estimate</p>
          <div className="s7-cov"><span>Target 70%</span>{wards.map(([w, v], i) => <div key={w} style={{ ["--v" as string]: `${v}%`, ["--i" as string]: i }}><small>{w}</small><i className={v >= 70 ? "is-ok" : undefined} /><b>{v}%</b></div>)}</div>
          <p className="s7-note">Counts only. <b>Fewer than 5</b> is shown as &lt;5.</p>
        </div>
      </div>
    </Win>
  );
}

/* ── 05 · Report: one record, read three ways ─────────────────────── */
function ProgrammeReportScreen() {
  const lines: [string, string, string][] = [["Bites recorded", "75", "3 facilities"], ["Courses completed", "53", "Facility registers"], ["Dogs vaccinated", "1,204", "Partner registers"], ["Samples tested", "13", "Laboratory"]];
  return (
    <Win title={<><span className="s7-xl">X</span> Programme report · October.xlsx</>} badge={<span className="s7-pill is-green">Ready</span>}>
      <div className="s7-claim">
        <table className="s7-sheet">
          <thead><tr><th /><th>A · Measure</th><th>B · Count</th><th>C · Source</th></tr></thead>
          <tbody>
            {lines.map(([a, b, c], i) => <tr key={a}><th>{i + 2}</th><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}
            <tr className="is-total"><th>6</th><td>Confirmed cases</td><td>&lt;5</td><td>Hidden below 5</td></tr>
          </tbody>
        </table>
        <div className="s7-pack">
          <p className="s7-cap">One record, three readers</p>
          {[["PDF", "Programme report", "is-red"], ["XLSX", "Municipal review", "is-green"], ["CSV", "Research extract", "is-orange"]].map(([k, t, c]) => <div key={k} className="s7-file"><span className={`s7-ft ${c}`}>{k}</span><span>{t}</span></div>)}
          <p className="s7-note"><b>No name leaves a facility.</b></p>
          <span className="s7-btn is-blue is-full">Share with partners <ArrowRight size={14} /></span>
        </div>
      </div>
    </Win>
  );
}
