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

export function FiveSteps() {
  const box = useRef<HTMLElement>(null);
  const swipe = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(0);
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
      setProg(p); setOn(Math.floor(p * STEPS.length));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [pinned]);
  // Phone: the five steps stack; the sticky tabs follow the step in view.
  useEffect(() => {
    if (pinned) return;
    const cards = [...(swipe.current?.children ?? [])] as HTMLElement[];
    if (!cards.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setOn(cards.indexOf(e.target as HTMLElement)); }, { rootMargin: "-40% 0px -55% 0px" });
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [pinned]);
  const go = (i: number) => {
    const el = box.current;
    const smooth = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (!pinned) {
      setOn(i);
      const card = swipe.current?.children[i] as HTMLElement | undefined;
      if (card) window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 128, behavior: smooth });
      return;
    }
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + span * ((i + 0.5) / STEPS.length);
    window.scrollTo({ top, behavior: smooth });
  };
  const panel = (s: Step, key?: string) => (
    <div className="s7-step" key={key}>
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
  const s = STEPS[on];
  return (
    <section ref={box} id="workflow" className={`s7-steps${pinned ? " is-pinned" : ""}`} aria-labelledby="steps-title" style={pinned ? { height: `${STEPS.length * 85 + 40}vh` } : undefined}>
      <div className="s7-steps-pin">
        <div className="s4-wrap">
          <div className="s7-steps-head">
            <h2 id="steps-title" className="s4-h2">Use cases</h2>
          </div>
          <div className="s7-steps-tabs" role="tablist" aria-label="The five steps">
            {STEPS.map((x, i) => (
              <button key={x.key} type="button" role="tab" aria-selected={on === i} aria-controls="s7-step-panel" onClick={() => go(i)}>
                {x.tab}
                {on === i && <i className="s7-steps-bar" aria-hidden />}
              </button>
            ))}
          </div>
          {pinned
            ? <div id="s7-step-panel" role="tabpanel">{panel(s, s.key)}</div>
            : <div id="s7-step-panel" role="tabpanel" className="s7-stack" ref={swipe}>{STEPS.map((x) => <div key={x.key} className="s7-stack-card">{panel(x)}</div>)}</div>}
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
