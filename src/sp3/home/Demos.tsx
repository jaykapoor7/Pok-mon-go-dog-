"use client";

/* ════════════════════════════════════════════════════════════════════
   Interactive product demonstrations for the public site.

   Everything here is a DEMO and says so on screen. Programme figures are
   The Pawsome People Project's published programme archive
   (src/data/partner-programmes-archive.json); record IDs, names and the
   WhatsApp thread are illustrative. WhatsApp intake is not connected in
   production, and the demo never implies it is.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight, BarChart3, Check, CheckCircle2, ClipboardList, FileText, Home, Inbox, LayoutGrid, Map as MapIcon,
  MessageCircle, PawPrint, Search, ShieldCheck, Sparkles, Syringe, TriangleAlert,
} from "lucide-react";
import archive from "@/data/partner-programmes-archive.json";

const fmt = (n: number) => n.toLocaleString("en-IN");
type Prog = { name: string; animals_recorded: number; sterilised_recorded: number; vaccinated_recorded: number; starts_on: string | null; ends_on: string | null; public_summary?: string | null; ngo_slug?: string | null };
const PROGS = (archive.programmes as Prog[]).filter((p) => p.ngo_slug === "the-pawsome-people-project");
const ster = PROGS.find((p) => /steril/i.test(p.name));
const vacc = PROGS.find((p) => /vacc|rabies/i.test(p.name));
const resc = PROGS.find((p) => /rescue/i.test(p.name));
const rescueClosed = Number(resc?.public_summary?.match(/(\d[\d,]*) carry a closed/)?.[1]?.replace(/,/g, "") ?? 0);

/* Illustrative register rows (shape of the real register, not real records). */
const ROWS = [
  { id: "SP-CBE-4F2K", what: "Sterilisation", area: "Saibaba Colony", by: "Field team A", ev: "Photo, ear notch", st: "Ready for review", tone: "blue" },
  { id: "SP-CBE-7Q9M", what: "Anti-rabies vaccination", area: "R.S. Puram", by: "Field team B", ev: "Vial label", st: "Accepted", tone: "live" },
  { id: "SP-CBE-2H8D", what: "Sterilisation", area: "Gandhipuram", by: "Field team A", ev: "Missing release photo", st: "Needs evidence", tone: "off" },
  { id: "SP-CBE-9W1T", what: "Rescue & treatment", area: "Peelamedu", by: "Field team C", ev: "Photo, vet note", st: "In treatment", tone: "teal" },
  { id: "SP-CBE-5K3R", what: "Sterilisation", area: "Ukkadam", by: "Field team B", ev: "Possible duplicate", st: "Check duplicate", tone: "off" },
] as const;

export function DemoChip({ children = "Product demo" }: { children?: ReactNode }) {
  return <span className="s3-chip is-demo"><i style={{ background: "var(--s3-faint)" }} />{children}</span>;
}

/* ── Hero: desktop dashboard + WhatsApp phone + StrayPaw AI ─────────── */
type View = "overview" | "records" | "review" | "reports";
export function HeroDemo() {
  const [view, setView] = useState<View>("overview");
  const nav: [View, string, ReactNode, string?][] = [
    ["overview", "Overview", <Home key="h" size={14} />],
    ["records", "Records", <PawPrint key="r" size={14} />],
    ["review", "Evidence review", <ShieldCheck key="e" size={14} />, "2"],
    ["reports", "Reports", <FileText key="f" size={14} />],
  ];
  return (
    <div className="s3h-stage">
      <div className="s3-win s3h-win" role="group" aria-label="Product demo: municipal programme dashboard">
        <div className="s3-win-bar"><i /><i /><i /><span>app.straypaw.org / city / programmes</span><DemoChip /></div>
        <div className="s3-app">
          <aside className="s3-app-side" aria-label="Demo navigation">
            <div className="s3-app-org"><b>C</b>Coimbatore programme</div>
            <div className="s3-app-q"><Search size={12} />Search or ask<kbd>⌘K</kbd></div>
            {nav.map(([id, label, icon, badge]) => (
              <button key={id} type="button" className={`s3-app-nav${view === id ? " is-on" : ""}`} aria-pressed={view === id} onClick={() => setView(id)}>{icon}{label}{badge && <em>{badge}</em>}</button>
            ))}
            <div className="s3-app-label">Context</div>
            <button type="button" className="s3-app-nav" onClick={() => setView("overview")}><MapIcon size={14} />Map</button>
            <button type="button" className="s3-app-nav" onClick={() => setView("review")}><Sparkles size={14} />StrayPaw AI</button>
          </aside>
          <div className="s3-app-main">
            {view === "overview" && <Overview />}
            {view === "records" && <Records />}
            {view === "review" && <Review />}
            {view === "reports" && <Reports />}
          </div>
        </div>
      </div>
      <div className="s3h-phone"><PhoneThread /></div>
      <div className="s3h-ai"><AiMini /></div>
    </div>
  );
}

function Overview() {
  return <>
    <div className="s3-app-h"><div><h4>ABC / ARV programme</h4><p>The Pawsome People Project · published programme archive</p></div><span className="s3-chip is-blue">Source-linked</span></div>
    <div className="s3-kpis">
      <div><small>Sterilisations recorded</small><b>{fmt(ster?.sterilised_recorded ?? 0)}</b><em>Chiloo drive · 2026</em></div>
      <div><small>Vaccinations recorded</small><b>{fmt(vacc?.vaccinated_recorded ?? 0)}</b><em>2024–2026</em></div>
      <div><small>Rescue requests</small><b>{fmt(resc?.animals_recorded ?? 0)}</b><em>{fmt(rescueClosed)} closed</em></div>
      <div><small>Awaiting review</small><b>2</b><em>Illustrative</em></div>
    </div>
    <Bars />
    <MiniTable rows={ROWS.slice(0, 3)} />
  </>;
}
function Records() {
  return <>
    <div className="s3-app-h"><div><h4>Records</h4><p>Every animal and intervention, with its evidence</p></div><span className="s3-chip">5 shown</span></div>
    <MiniTable rows={[...ROWS]} />
  </>;
}
function Review() {
  return <>
    <div className="s3-app-h"><div><h4>Evidence review</h4><p>Records a person must check before they count</p></div><span className="s3-chip is-off"><i />2 need attention</span></div>
    <div className="s3h-review">
      <div className="s3-card s3h-rv"><TriangleAlert size={16} /><div><b>SP-CBE-2H8D · Missing release photo</b><p>Sterilisation recorded without a post-release photo. Ask the field team or mark as accepted with a reason.</p><div className="s3-actions"><span className="s3-btn is-sm is-line">Request evidence</span><span className="s3-btn is-sm is-ghost">Open record</span></div></div></div>
      <div className="s3-card s3h-rv"><TriangleAlert size={16} /><div><b>SP-CBE-5K3R · Possible duplicate of SP-CBE-1A7C</b><p>Same area, sex and ear notch within 9 days. A reviewer decides; nothing is merged automatically.</p><div className="s3-actions"><span className="s3-btn is-sm is-line">Compare</span><span className="s3-btn is-sm is-ghost">Not a duplicate</span></div></div></div>
    </div>
  </>;
}
function Reports() {
  return <>
    <div className="s3-app-h"><div><h4>Monthly report</h4><p>Built from accepted records only, with sources</p></div><span className="s3-chip is-live"><i />Ready to export</span></div>
    <div className="s3h-report">
      <div><small>Period</small><b>August 2026</b></div>
      <div><small>Accepted interventions</small><b>Counted from records</b></div>
      <div><small>Excluded</small><b>Records still in review</b></div>
      <div><small>Format</small><b>PDF · Excel workbook</b></div>
    </div>
    <p className="s3-small">Every figure links back to the records it was counted from. Imported history stays labelled as imported.</p>
  </>;
}
function Bars() {
  const vals = [12, 18, 9, 22, 16, 26, 14, 20, 28, 19, 24, 30];
  return <div className="s3h-bars" aria-hidden>{vals.map((v, i) => <span key={i} style={{ height: `${v * 2.4}px` }} />)}</div>;
}
function MiniTable({ rows }: { rows: readonly (typeof ROWS)[number][] }) {
  return (
    <div className="s3h-tablewrap">
      <table className="s3-table">
        <thead><tr><th scope="col">Record</th><th scope="col">Intervention</th><th scope="col">Area</th><th scope="col">Evidence</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="is-id">{r.id}</td><td>{r.what}</td><td>{r.area}</td><td>{r.ev}</td><td><span className={`s3-chip is-${r.tone}`}>{r.st}</span></td></tr>)}</tbody>
      </table>
    </div>
  );
}

const THREAD: { side: "in" | "out"; body: ReactNode; t: string }[] = [
  { side: "out", body: <><div className="s3-photo">Photo · female, ear notched</div>Released after ABC. Saibaba Colony, near the temple.</>, t: "09:41" },
  { side: "out", body: <><div className="s3-loc" />Location shared</>, t: "09:41" },
  { side: "in", body: <>Got it. I prepared a <b>sterilisation record</b>: female, ear notch, Saibaba Colony.<br />One thing is missing: the <b>surgery date</b>?</>, t: "09:42" },
  { side: "out", body: <>Yesterday, 30 Oct</>, t: "09:42" },
  { side: "in", body: <>Thanks. The record is waiting for your coordinator to review. Nothing is counted until they accept it.</>, t: "09:42" },
];
export function PhoneThread({ live = true }: { live?: boolean }) {
  const [n, setN] = useState(live ? 1 : THREAD.length);
  const reduce = useReduced();
  useEffect(() => {
    if (!live || reduce) { setN(THREAD.length); return; }
    const id = setInterval(() => setN((v) => (v >= THREAD.length + 2 ? 1 : v + 1)), 1600);
    return () => clearInterval(id);
  }, [live, reduce]);
  return (
    <div className="s3-phone" role="group" aria-label="Demo: field update over WhatsApp (not connected in production)">
      <div className="s3-phone-in">
        <div className="s3-phone-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <b><img src="/straypaw-mark.png" alt="" /></b>
          <span>StrayPaw CareOS<small>Demo · WhatsApp not yet connected</small></span>
        </div>
        <div className="s3-chat" aria-live="off">
          {THREAD.slice(0, Math.min(n, THREAD.length)).map((m, i) => <div key={i} className={`s3-msg is-${m.side}`}>{m.body}<small>{m.t}</small></div>)}
        </div>
        <div className="s3-phone-input">Message</div>
      </div>
    </div>
  );
}

function AiMini() {
  return (
    <div className="s3-ai-card" role="group" aria-label="Demo: StrayPaw AI answer">
      <header><span className="s3-ai-mark"><Sparkles size={12} /></span>StrayPaw AI<DemoChipSm /></header>
      <div className="s3-ai-body">
        <div className="s3-ai-q">Which records can’t be counted this month?</div>
        <div className="s3-ai-tool"><CheckCircle2 size={12} />find_missing_evidence · 2 results</div>
        <div className="s3-ai-a"><b>2 records</b> need a reviewer: a missing release photo <span className="s3-cite">SP-CBE-2H8D</span> and a possible duplicate <span className="s3-cite">SP-CBE-5K3R</span>.</div>
      </div>
    </div>
  );
}
function DemoChipSm() { return <span className="s3-chip is-demo" style={{ marginLeft: "auto", height: 20, fontSize: 11 }}>Demo</span>; }

/* ── Product tour: field message → record → review → report ────────── */
const TOUR = [
  { t: "Field message", d: "A field worker sends a photo, a location and what was done. Today on the web; over WhatsApp once CareOS is connected.", icon: <MessageCircle size={16} /> },
  { t: "AI-prepared record", d: "StrayPaw AI reads the message, fills the structured record and asks only for what is missing.", icon: <Sparkles size={16} /> },
  { t: "Evidence review", d: "A coordinator accepts, asks for evidence or flags a duplicate. Nothing counts until a person accepts it.", icon: <ShieldCheck size={16} /> },
  { t: "Municipal report", d: "The programme dashboard and monthly report update from accepted records, each figure linked to its sources.", icon: <BarChart3 size={16} /> },
];
export function ProductTour() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const reduce = useReduced();
  useEffect(() => {
    if (!auto || reduce) return;
    const id = setTimeout(() => setI((v) => (v + 1) % TOUR.length), 7000);
    return () => clearTimeout(id);
  }, [i, auto, reduce]);
  return (
    <div className="s3-tour">
      <div className="s3-tour-steps" role="tablist" aria-label="Product tour">
        {TOUR.map((s, k) => (
          <button key={s.t} type="button" role="tab" aria-selected={i === k} aria-controls="s3-tour-panel" onClick={() => { setI(k); setAuto(false); }}>
            <i>{k + 1}</i><span><b>{s.t}</b><small>{s.d}</small></span>
            {i === k && auto && <span className="s3-tour-progress"><span key={i} /></span>}
          </button>
        ))}
      </div>
      <div id="s3-tour-panel" role="tabpanel" className="s3-win s3h-tourwin" aria-label={TOUR[i].t}>
        <div className="s3-win-bar"><i /><i /><i /><span>{["CareOS intake", "Prepared record", "Review queue", "Programme report"][i]}</span><DemoChip /></div>
        <div className="s3h-tourbody" key={i}>
          {i === 0 && <div className="s3h-t0"><PhoneThread live={false} /><div className="s3h-t0-side"><span className="s3-chip is-off"><i />WhatsApp: not connected in production</span><p className="s3-body">The same intake works today through the web report form and the NGO field mode. The WhatsApp channel uses the same records when it is switched on.</p><Link className="s3-link" href="/whatsapp">How CareOS works <ArrowRight size={14} /></Link></div></div>}
          {i === 1 && <PreparedRecord />}
          {i === 2 && <div className="s3h-pad"><Review /></div>}
          {i === 3 && <div className="s3h-pad"><Overview /></div>}
        </div>
      </div>
    </div>
  );
}
function PreparedRecord() {
  return (
    <div className="s3h-pad s3h-prep">
      <div className="s3-ai-tool"><Sparkles size={12} style={{ color: "var(--s3-blue)" }} />Prepared from the field message · confirm before saving</div>
      <div className="s3-confirm">
        <dl>
          <dt>Intervention</dt><dd>Sterilisation (ABC)</dd>
          <dt>Animal</dt><dd>Female · adult · ear notched</dd>
          <dt>Place</dt><dd>Saibaba Colony (area cell, not exact point)</dd>
          <dt>Date</dt><dd>30 Oct 2026 <span className="s3-chip is-blue" style={{ height: 18, fontSize: 10.5 }}>asked & answered</span></dd>
          <dt>Evidence</dt><dd>1 photo, location</dd>
          <dt>Programme</dt><dd>ABC drive · Coimbatore</dd>
        </dl>
        <div className="s3-actions"><span className="s3-btn is-sm is-primary"><Check size={14} />Save for review</span><span className="s3-btn is-sm is-line">Edit</span><span className="s3-btn is-sm is-ghost">Discard</span></div>
      </div>
      <p className="s3-small">The AI never accepts its own record. A coordinator reviews it next.</p>
    </div>
  );
}

/* ── Use cases ─────────────────────────────────────────────────────── */
const CASES = [
  { id: "ster", tab: "Sterilisation", h: "Run an ABC drive from one register.", p: "Plan the drive, record each animal once, and keep surgery, release and ear-notch evidence on its history.", pts: ["Programme register with area and team", "Duplicate checks before a record counts", "Release evidence on every animal"], href: "/solutions/abc-arv", icon: <ClipboardList size={18} /> },
  { id: "vacc", tab: "Vaccination", h: "Know which animals are protected.", p: "Record anti-rabies vaccinations against the same animals, see who is due, and report coverage honestly by area.", pts: ["ARV events on the animal record", "Due lists for boosters", "Recorded coverage, never estimated population"], href: "/solutions/abc-arv", icon: <Syringe size={18} /> },
  { id: "rescue", tab: "Rescue & care", h: "From a request to a recorded outcome.", p: "Requests arrive from residents and field teams. Cases are taken, treated, followed up and closed with an outcome.", pts: ["Inbox and triage for new requests", "Treatment and follow-up schedule", "Closed with an outcome, not just archived"], href: "/solutions/rescue-care", icon: <PawPrint size={18} /> },
  { id: "review", tab: "Evidence review", h: "Resolve incomplete records before they count.", p: "Reviewers see missing evidence, possible duplicates and inconsistencies in one queue, and decide with a reason.", pts: ["Missing evidence and duplicate candidates", "Accept, request evidence or reject with reason", "Every decision kept in the history"], href: "/platform#review", icon: <ShieldCheck size={18} /> },
  { id: "report", tab: "Reporting", h: "Monthly reports from accepted records.", p: "Programme dashboards and printable reports built from the records themselves, with method and sources attached.", pts: ["Programme and city reports", "Excel evidence workbook for auditors", "Imported history labelled as imported"], href: "/platform#reports", icon: <BarChart3 size={18} /> },
];
export function UseCases() {
  const [i, setI] = useState(0);
  const c = CASES[i];
  return (
    <div>
      <div className="s3-tabs" role="tablist" aria-label="Use cases">
        {CASES.map((x, k) => <button key={x.id} type="button" role="tab" id={`uc-${x.id}`} aria-selected={i === k} aria-controls="uc-panel" onClick={() => setI(k)}>{x.tab}</button>)}
      </div>
      <div id="uc-panel" role="tabpanel" aria-labelledby={`uc-${c.id}`} className="s3-tabpanel">
        <div className="s3-tabpanel-copy">
          <span className="s3-ico s3h-ucico">{c.icon}</span>
          <h3 className="s3-h3">{c.h}</h3>
          <p className="s3-body">{c.p}</p>
          <ul>{c.pts.map((p) => <li key={p}><Check size={16} />{p}</li>)}</ul>
          <Link className="s3-link" href={c.href}>Explore {c.tab.toLowerCase()} <ArrowRight size={14} /></Link>
        </div>
        <div className="s3-win">
          <div className="s3-win-bar"><i /><i /><i /><span>{c.tab}</span><DemoChip /></div>
          <div className="s3h-pad">
            {c.id === "review" ? <Review /> : c.id === "report" ? <Reports /> : c.id === "rescue" ? <MiniTable rows={ROWS.filter((r) => r.what.startsWith("Rescue") || r.st === "Ready for review")} /> : <><Overview /></>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── StrayPaw AI showcase ──────────────────────────────────────────── */
const ASK = [
  { q: "Summarise this week’s ABC work in Saibaba Colony", tool: "summarise_programme", a: <><b>6 sterilisations</b> recorded this week, 4 accepted, 2 waiting for review <span className="s3-cite">SP-CBE-4F2K</span>. All released in the same area cell.</> },
  { q: "Find records missing evidence", tool: "find_missing_evidence", a: <><b>1 record</b> has no release photo <span className="s3-cite">SP-CBE-2H8D</span>. I can draft a request to the field team for you to send.</> },
  { q: "Open a follow-up for the dog in Peelamedu", tool: "propose_followup", a: <>I prepared a follow-up on <span className="s3-cite">SP-CBE-9W1T</span> for 4 Nov. <b>Confirm to save</b>; it will appear on the case like any manual follow-up.</>, confirm: true },
  { q: "Which areas have no vaccinations recorded?", tool: "coverage_by_area", a: <><b>3 areas</b> in the programme have sterilisations but no recorded ARV. That is a gap in the record, not proof that animals are unvaccinated.</> },
];
export function AiShowcase() {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(false);
  const reduce = useReduced();
  useEffect(() => { setTyped(false); const t = setTimeout(() => setTyped(true), reduce ? 0 : 650); return () => clearTimeout(t); }, [i, reduce]);
  const a = ASK[i];
  return (
    <div className="s3h-aishow">
      <div className="s3h-aiprompts" role="tablist" aria-label="Ask StrayPaw AI">
        {ASK.map((x, k) => <button key={x.q} type="button" role="tab" aria-selected={i === k} onClick={() => setI(k)}><Sparkles size={14} aria-hidden />{x.q}</button>)}
      </div>
      <div className="s3-ai-card s3h-aibig" role="tabpanel" aria-live="polite">
        <header><span className="s3-ai-mark"><Sparkles size={12} /></span>StrayPaw AI<span className="s3-chip is-demo" style={{ marginLeft: "auto" }}>Demo conversation</span></header>
        <div className="s3-ai-body">
          <div className="s3-ai-q">{a.q}</div>
          <div className="s3-ai-tool">{typed ? <CheckCircle2 size={12} /> : <span className="s3h-spin" />}{a.tool}()</div>
          {typed && <div className="s3-ai-a">{a.a}</div>}
          {typed && a.confirm && <div className="s3-confirm"><dl><dt>Action</dt><dd>Schedule follow-up</dd><dt>Case</dt><dd>SP-CBE-9W1T</dd><dt>Due</dt><dd>4 Nov 2026</dd></dl><div className="s3-actions"><span className="s3-btn is-sm is-primary">Confirm</span><span className="s3-btn is-sm is-ghost">Cancel</span></div></div>}
        </div>
      </div>
    </div>
  );
}

/* ── Platform screens (tabbed preview of the real workspace pages) ─── */
const SCREENS = [
  { id: "prog", t: "Programmes", icon: <LayoutGrid size={15} />, href: "/city/programmes", d: "Every ABC, ARV and rescue programme with its recorded figures and sources." },
  { id: "rec", t: "Records", icon: <PawPrint size={15} />, href: "/ngo/animals", d: "The animal register: identity, place, care history and evidence." },
  { id: "field", t: "Fieldwork", icon: <Inbox size={15} />, href: "/ngo", d: "The team’s work queue: new requests, open cases and follow-ups due." },
  { id: "rep", t: "Reporting", icon: <FileText size={15} />, href: "/city/report", d: "A print-ready city report with method, sources and limits." },
  { id: "map", t: "Contextual map", icon: <MapIcon size={15} />, href: "/explore", d: "Geography when it helps: coverage and gaps by area, never a precise animal location." },
];
export function PlatformScreens() {
  const [i, setI] = useState(0);
  const s = SCREENS[i];
  return (
    <div className="s3h-screens">
      <div className="s3h-screens-nav" role="tablist" aria-label="Platform screens">
        {SCREENS.map((x, k) => <button key={x.id} type="button" role="tab" aria-selected={i === k} onClick={() => setI(k)}>{x.icon}<span><b>{x.t}</b><small>{x.d}</small></span></button>)}
      </div>
      <div className="s3h-screens-view">
        <div className="s3-win">
          <div className="s3-win-bar"><i /><i /><i /><span>straypaw.org{s.href}</span><Link href={s.href} className="s3-chip is-blue" style={{ marginLeft: "auto" }}>Open the real page <ArrowRight size={12} /></Link></div>
          <div className="s3h-pad">{i === 0 ? <Overview /> : i === 1 ? <Records /> : i === 2 ? <MiniTable rows={ROWS.slice(1)} /> : i === 3 ? <Reports /> : <MapSketch />}</div>
        </div>
      </div>
    </div>
  );
}
function MapSketch() {
  const cells = useMemo(() => Array.from({ length: 42 }, (_, k) => ({ x: (k % 7) * 64 + ((Math.floor(k / 7) % 2) * 32) + 30, y: Math.floor(k / 7) * 46 + 30, v: (k * 37) % 9 })), []);
  return (
    <div className="s3h-mapwrap">
      <svg viewBox="0 0 500 300" role="img" aria-label="Illustrative coverage by area">
        <rect width="500" height="300" fill="#f6f3ec" />
        {cells.map((c, k) => <circle key={k} cx={c.x} cy={c.y} r={20} fill={c.v === 0 ? "url(#hatch)" : "#2457ce"} fillOpacity={c.v === 0 ? 1 : 0.1 + c.v * 0.08} stroke="#fff" strokeWidth="2" />)}
        <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f6f3ec" /><line x1="0" y1="0" x2="0" y2="6" stroke="#b8bfcb" strokeWidth="1.5" /></pattern></defs>
      </svg>
      <p className="s3-small">Round area cells; hatched = not recorded. Illustrative.</p>
    </div>
  );
}

function useReduced() {
  const [r, setR] = useState(false);
  const ref = useRef<MediaQueryList | null>(null);
  useEffect(() => {
    ref.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(!!ref.current?.matches); on();
    ref.current.addEventListener?.("change", on);
    return () => ref.current?.removeEventListener?.("change", on);
  }, []);
  return r;
}

/** A single product window on one view, for solution and platform pages. */
export function DemoWindow({ view, title }: { view: View | "prepared" | "thread"; title: string }) {
  return (
    <div className="s3-win">
      <div className="s3-win-bar"><i /><i /><i /><span>{title}</span><DemoChip /></div>
      {view === "thread" ? <div className="s3h-t0"><PhoneThread live={false} /><div className="s3h-t0-side"><span className="s3-chip is-off"><i />WhatsApp: not connected in production</span><p className="s3-body">Field teams use the web field mode today. The same record is created either way.</p></div></div>
        : <div className="s3h-pad">{view === "overview" ? <Overview /> : view === "records" ? <Records /> : view === "review" ? <Review /> : view === "reports" ? <Reports /> : <PreparedRecord />}</div>}
    </div>
  );
}
