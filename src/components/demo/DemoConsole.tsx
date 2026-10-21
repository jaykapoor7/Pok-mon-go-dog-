"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, Building2, Check, ChevronRight, ClipboardCheck, Crosshair,
  HeartPulse, MapPin, Navigation, PawPrint, Plus, RefreshCw, ShieldCheck,
  Stethoscope, Users,
} from "lucide-react";
import "./demo.css";

type DemoRole = "community" | "ngo" | "map" | "municipality";
type Status = "new" | "accepted" | "treated" | "follow-up";

type Event = { id: string; at: string; title: string; detail: string };
type Report = {
  id: string;
  reference: string;
  animal: string;
  note: string;
  locality: string;
  lat: number;
  lng: number;
  photo: string;
  createdAt: string;
  status: Status;
  treatment?: string;
  followUp?: string;
  events: Event[];
};
type DemoState = { reports: Report[] };

const STORAGE_KEY = "straypaw-offline-coimbatore-demo-v1";
const PHOTOS = [
  "/art/dogs/hira.webp",
  "/art/dogs/bijantu.webp",
  "/art/dogs/rajasthan-pup-5.webp",
];

const seeded: DemoState = {
  reports: [
    {
      id: "cbe-ari-014", reference: "SP-CBE-014", animal: "Ari", locality: "Race Course, Coimbatore", lat: 11.005, lng: 76.968,
      photo: PHOTOS[0], createdAt: "2026-10-20T08:30:00.000Z", status: "follow-up", treatment: "Wound cleaned; topical treatment started.", followUp: "2026-10-24",
      note: "Limping near the park entrance; eating and alert.",
      events: [
        { id: "e1", at: "2026-10-20T08:30:00.000Z", title: "Community report received", detail: "Photo and location recorded at Race Course." },
        { id: "e2", at: "2026-10-20T10:10:00.000Z", title: "Accepted by demo NGO", detail: "Assigned to the Coimbatore field team." },
        { id: "e3", at: "2026-10-20T13:00:00.000Z", title: "Treatment recorded", detail: "Wound cleaned; topical treatment started." },
      ],
    },
    {
      id: "cbe-kavi-015", reference: "SP-CBE-015", animal: "Kavi", locality: "Saibaba Colony, Coimbatore", lat: 11.027, lng: 76.947,
      photo: PHOTOS[1], createdAt: "2026-10-20T11:15:00.000Z", status: "accepted", note: "Adult dog resting near a residential lane; no acute distress seen.",
      events: [
        { id: "e1", at: "2026-10-20T11:15:00.000Z", title: "Community report received", detail: "Observation added to the animal record." },
        { id: "e2", at: "2026-10-20T12:00:00.000Z", title: "Accepted by demo NGO", detail: "A field visit is queued." },
      ],
    },
    {
      id: "cbe-muthu-016", reference: "SP-CBE-016", animal: "Muthu", locality: "RS Puram, Coimbatore", lat: 11.012, lng: 76.953,
      photo: PHOTOS[2], createdAt: "2026-10-19T06:45:00.000Z", status: "treated", treatment: "General health check and anti-tick medication.", note: "Seen near the market; friendly and mobile.",
      events: [
        { id: "e1", at: "2026-10-19T06:45:00.000Z", title: "Community report received", detail: "Location and a low-bandwidth photo were recorded." },
        { id: "e2", at: "2026-10-19T09:30:00.000Z", title: "Treatment recorded", detail: "General health check and anti-tick medication." },
      ],
    },
  ],
};

const roleCopy: Record<DemoRole, { label: string; detail: string; Icon: typeof PawPrint }> = {
  community: { label: "Community", detail: "Report a dog", Icon: PawPrint },
  ngo: { label: "NGO workspace", detail: "Intake & care", Icon: HeartPulse },
  map: { label: "Coimbatore map", detail: "Animals & cases", Icon: MapPin },
  municipality: { label: "Municipality", detail: "Programme view", Icon: Building2 },
};

function cloneSeed(): DemoState { return JSON.parse(JSON.stringify(seeded)) as DemoState; }
function date(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function statusLabel(status: Status) { return status === "new" ? "New" : status === "accepted" ? "Accepted" : status === "treated" ? "Treated" : "Follow-up"; }

export function DemoConsole() {
  const [role, setRole] = useState<DemoRole>("community");
  const [state, setState] = useState<DemoState>(seeded);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState("cbe-ari-014");
  const [animal, setAnimal] = useState("Street dog");
  const [note, setNote] = useState("Dog needs a check-up; alert and resting near the road.");
  const [place, setPlace] = useState("RS Puram, Coimbatore");
  const [photo, setPhoto] = useState(PHOTOS[0]);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [treatment, setTreatment] = useState("Wound cleaned and antiseptic treatment recorded.");
  const [followUp, setFollowUp] = useState("2026-10-24");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setState(JSON.parse(stored) as DemoState);
    } catch { /* A blocked store still leaves the demo fully usable for this visit. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const reports = useMemo(() => [...state.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [state]);
  const active = reports.find((r) => r.id === selected) ?? reports[0];
  const open = reports.filter((r) => r.status === "new" || r.status === "accepted" || r.status === "follow-up").length;

  function updateReport(id: string, transform: (report: Report) => Report) {
    setState((current) => ({ reports: current.reports.map((report) => report.id === id ? transform(report) : report) }));
  }
  function accept(report: Report) {
    updateReport(report.id, (current) => current.status === "new" ? {
      ...current, status: "accepted", events: [...current.events, { id: crypto.randomUUID(), at: new Date().toISOString(), title: "Accepted by demo NGO", detail: "Assigned to the Coimbatore field team." }],
    } : current);
  }
  function saveCare(report: Report) {
    const events = [...report.events, { id: crypto.randomUUID(), at: new Date().toISOString(), title: "Treatment recorded", detail: treatment }];
    if (followUp) events.push({ id: crypto.randomUUID(), at: new Date().toISOString(), title: "Follow-up scheduled", detail: `Review scheduled for ${followUp}.` });
    updateReport(report.id, (current) => ({ ...current, status: followUp ? "follow-up" : "treated", treatment, followUp: followUp || undefined, events }));
  }
  function submitReport() {
    const now = new Date();
    const id = crypto.randomUUID();
    const reference = `SP-CBE-${String(Math.floor(100 + Math.random() * 900))}`;
    const locality = place.includes("Coimbatore") ? place : `${place}, Coimbatore`;
    const report: Report = {
      id, reference, animal: animal.trim() || "Street dog", note: note.trim() || "Community observation recorded.", locality,
      lat: 11.01 + Math.random() * 0.018, lng: 76.94 + Math.random() * 0.035, photo, createdAt: now.toISOString(), status: "new",
      events: [{ id: crypto.randomUUID(), at: now.toISOString(), title: "Community report received", detail: `Photo and approximate location recorded at ${locality}.` }],
    };
    setState((current) => ({ reports: [report, ...current.reports] }));
    setSelected(id); setReceipt(reference); setRole("ngo");
  }
  function reset() { setState(cloneSeed()); setSelected("cbe-ari-014"); setReceipt(null); setRole("community"); localStorage.removeItem(STORAGE_KEY); }

  return (
    <div className="demo-shell">
      <header className="demo-topbar">
        <div className="demo-brand"><span className="demo-paw">✦</span><span>StrayPaw</span><b>OFFLINE DEMO</b></div>
        <div className="demo-topnote"><ShieldCheck size={15} /> Synthetic Coimbatore records · stored in this browser</div>
        <button className="demo-reset" onClick={reset}><RefreshCw size={14} /> Reset demo</button>
      </header>
      <aside className="demo-nav" aria-label="Demo workspaces">
        <div className="demo-nav-kicker">Demo journey</div>
        {(Object.keys(roleCopy) as DemoRole[]).map((key, index) => {
          const item = roleCopy[key]; const Icon = item.Icon;
          return <button key={key} onClick={() => setRole(key)} className={role === key ? "is-active" : ""}><span className="demo-nav-index">0{index + 1}</span><Icon size={18} /><span><b>{item.label}</b><small>{item.detail}</small></span></button>;
        })}
        <div className="demo-nav-foot"><small>Demo roles</small><b>Resident → NGO → Municipality</b><span>Use the tabs to switch roles in one browser.</span></div>
      </aside>
      <main className="demo-main">
        <div className="demo-disclosure"><strong>Demo environment.</strong> Programme figures and evidence below are synthetic examples, not municipal claims or verification.</div>
        {role === "community" && <Community animal={animal} setAnimal={setAnimal} note={note} setNote={setNote} place={place} setPlace={setPlace} photo={photo} setPhoto={setPhoto} submit={submitReport} receipt={receipt} />}
        {role === "ngo" && <Ngo reports={reports} active={active} selected={selected} select={setSelected} accept={accept} treatment={treatment} setTreatment={setTreatment} followUp={followUp} setFollowUp={setFollowUp} saveCare={saveCare} />}
        {role === "map" && <MapView reports={reports} active={active} selected={selected} select={setSelected} open={open} />}
        {role === "municipality" && <Municipality reports={reports} open={open} />}
      </main>
    </div>
  );
}

function Community({ animal, setAnimal, note, setNote, place, setPlace, photo, setPhoto, submit, receipt }: {
  animal: string; setAnimal: (v: string) => void; note: string; setNote: (v: string) => void; place: string; setPlace: (v: string) => void; photo: string; setPhoto: (v: string) => void; submit: () => void; receipt: string | null;
}) {
  return <section className="demo-page">
    <div className="demo-heading"><div><p>Community report</p><h1>Put a dog <em>on the record.</em></h1><span>A photo, a location, and what you saw. This demo works without a networked database.</span></div><div className="demo-step"><b>01</b><span>Report</span></div></div>
    {receipt && <div className="demo-receipt"><Check size={20} /><div><b>Report received</b><span>Tracking reference <strong>{receipt}</strong> is now in the NGO intake below.</span></div><button onClick={() => navigator.clipboard?.writeText(receipt)}>Copy reference</button></div>}
    <div className="demo-report-grid">
      <div className="demo-card demo-form"><label>Animal label<input value={animal} onChange={(e) => setAnimal(e.target.value)} placeholder="Street dog" /></label><label>What did you see?<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} /></label><label>Location<input value={place} onChange={(e) => setPlace(e.target.value)} /></label><div className="demo-location"><Crosshair size={17}/><span>Coimbatore location selected</span><b>11.01° N · 76.96° E</b></div><button className="demo-primary" onClick={submit}><Plus size={18}/> Submit report <ChevronRight size={17}/></button></div>
      <div className="demo-card demo-photo-card"><div className="demo-photo-main"><img src={photo} alt="Selected local demo dog photo" /></div><p>Choose a locally shipped, compressed demo photo</p><div className="demo-photo-options">{PHOTOS.map((src, index) => <button key={src} onClick={() => setPhoto(src)} className={photo === src ? "is-selected" : ""}><img src={src} alt={`Dog photo ${index + 1}`} /></button>)}</div><small>Images load directly from this deployment; no image optimizer or external host is used.</small></div>
    </div>
  </section>;
}

function Ngo({ reports, active, selected, select, accept, treatment, setTreatment, followUp, setFollowUp, saveCare }: {
  reports: Report[]; active: Report; selected: string; select: (id: string) => void; accept: (r: Report) => void; treatment: string; setTreatment: (v: string) => void; followUp: string; setFollowUp: (v: string) => void; saveCare: (r: Report) => void;
}) {
  return <section className="demo-page"><div className="demo-heading"><div><p>NGO workspace · Coimbatore Street Animal Care</p><h1>Intake, treatment, <em>one animal history.</em></h1><span>Demo role · actions persist after refresh in this browser.</span></div><div className="demo-step"><b>02</b><span>Care</span></div></div>
    <div className="demo-ngo-grid"><section className="demo-card demo-intake"><header><div><small>INTAKE</small><h2>{reports.length} records</h2></div><span className="demo-pill">{reports.filter((r) => r.status === "new").length} new</span></header>{reports.map((report) => <button className={`demo-intake-row ${selected === report.id ? "is-active" : ""}`} onClick={() => select(report.id)} key={report.id}><img src={report.photo} alt=""/><span><b>{report.animal}</b><small>{report.reference} · {report.locality}</small></span><em className={`status-${report.status}`}>{statusLabel(report.status)}</em></button>)}</section>
      <section className="demo-card demo-case"><header><div><p>CASE {active.reference}</p><h2>{active.animal}</h2><span>{active.locality}</span></div><img src={active.photo} alt=""/></header><p className="demo-case-note">{active.note}</p>{active.status === "new" ? <button className="demo-primary" onClick={() => accept(active)}><ClipboardCheck size={17}/> Accept into intake</button> : <div className="demo-assigned"><Check size={16}/> Accepted by Coimbatore demo field team</div>}<div className="demo-care-form"><label>Treatment record<textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} rows={3}/></label><label>Follow-up date<input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)}/></label><button className="demo-secondary" onClick={() => saveCare(active)}><Stethoscope size={16}/> Record care and follow-up</button></div></section>
      <section className="demo-card demo-history"><header><p>COMPLETE HISTORY</p><h2>One shared record</h2></header><ol>{[...active.events].reverse().map((event) => <li key={event.id}><i></i><div><b>{event.title}</b><span>{event.detail}</span><small>{date(event.at)}</small></div></li>)}</ol></section></div></section>;
}

function MapView({ reports, active, selected, select, open }: { reports: Report[]; active: Report; selected: string; select: (id: string) => void; open: number }) {
  return <section className="demo-page"><div className="demo-heading"><div><p>Coimbatore animal map</p><h1>Where the record is <em>active.</em></h1><span>Local vector map · no external tiles · click a marker to inspect a case.</span></div><div className="demo-step"><b>03</b><span>Map</span></div></div><div className="demo-kpis"><Kpi icon={<PawPrint/>} value={reports.length} label="Animal records"/><Kpi icon={<Activity/>} value={open} label="Active cases"/><Kpi icon={<Users/>} value="3" label="Coverage areas"/><Kpi icon={<HeartPulse/>} value={reports.filter((r) => r.status === "follow-up").length} label="Follow-ups"/></div><div className="demo-map-grid"><section className="demo-card demo-map"><div className="demo-map-label"><MapPin size={16}/><b>Coimbatore</b><span>RS Puram · Race Course · Saibaba Colony</span></div><svg viewBox="0 0 800 500" role="img" aria-label="Stylised local map of Coimbatore with animal records"><path className="demo-water" d="M0 80 C130 30 220 150 340 100 S520 30 800 100 V0 H0Z"/><path className="demo-block" d="M50 160 L260 110 L365 190 L265 310 L70 280Z"/><path className="demo-block is-light" d="M365 120 L650 95 L745 250 L560 320 L390 250Z"/><path className="demo-block" d="M110 330 L330 270 L520 355 L420 485 L125 455Z"/><path className="demo-road" d="M15 390 C210 330 300 370 455 225 S610 150 790 205"/><path className="demo-road thin" d="M95 80 C180 205 360 170 510 260 S650 410 790 380"/>{reports.map((report, index) => { const x = 190 + ((report.lng - 76.94) / .04) * 460; const y = 330 - ((report.lat - 11.00) / .045) * 200 + (index % 2) * 22; return <g key={report.id} className={selected === report.id ? "is-selected" : ""} onClick={() => select(report.id)} role="button" tabIndex={0}><circle cx={x} cy={y} r="20" className="demo-marker-ring"/><circle cx={x} cy={y} r="10" className={`demo-marker status-${report.status}`}/><circle cx={x} cy={y} r="3" className="demo-marker-dot"/></g>; })}</svg><div className="demo-map-legend"><span><i className="status-new"/> New</span><span><i className="status-accepted"/> Accepted</span><span><i className="status-treated"/> Treated</span><span><i className="status-follow-up"/> Follow-up</span></div></section><aside className="demo-card demo-map-inspector"><img src={active.photo} alt=""/><p>SELECTED RECORD</p><h2>{active.animal}</h2><span>{active.reference}</span><div className={`demo-status status-${active.status}`}>{statusLabel(active.status)}</div><dl><div><dt>Location</dt><dd>{active.locality}</dd></div><div><dt>Latest activity</dt><dd>{active.events.at(-1)?.title}</dd></div><div><dt>Next follow-up</dt><dd>{active.followUp ?? "Not scheduled"}</dd></div></dl></aside></div></section>;
}

function Municipality({ reports, open }: { reports: Report[]; open: number }) {
  const closed = reports.filter((r) => r.status === "treated").length;
  return <section className="demo-page"><div className="demo-heading"><div><p>Municipality workspace · Coimbatore</p><h1>Programmes with <em>honest context.</em></h1><span>Illustrative demo data only. It is deliberately not presented as municipal verification.</span></div><div className="demo-step"><b>04</b><span>City</span></div></div><div className="demo-kpis"><Kpi icon={<PawPrint/>} value={reports.length} label="Illustrative records"/><Kpi icon={<Activity/>} value={open} label="Open demo cases"/><Kpi icon={<Check/>} value={closed} label="Care entries"/><Kpi icon={<Navigation/>} value="3" label="Demo localities"/></div><div className="demo-city-grid"><section className="demo-card demo-programmes"><header><div><p>PROGRAMMES</p><h2>Illustrative activity register</h2></div><span className="demo-pill">Demo only</span></header><Programme title="Neighbourhood welfare observation" area="RS Puram & Race Course" detail="A sample geographic activity layer for the recording walkthrough." state="Example data — not verified"/><Programme title="Community animal care follow-up" area="Saibaba Colony" detail={`${reports.length} synthetic/local browser records available in this demo session.`} state="Demo data — no external evidence"/><Programme title="Field coverage review" area="Central Coimbatore" detail="Illustrates how programme context and evidence status can be shown together." state="No municipal claim"/></section><section className="demo-card demo-evidence"><header><ShieldCheck size={22}/><div><p>EVIDENCE STATUS</p><h2>Clear about what is known</h2></div></header><div className="demo-evidence-callout"><b>There is no real municipal verification in this demo.</b><span>Records are local, synthetic examples intended only to demonstrate product navigation and data relationships.</span></div><dl><div><dt>Geographic activity</dt><dd>Illustrative points and areas</dd></div><div><dt>Outcomes</dt><dd>Browser-local demo entries</dd></div><div><dt>Supporting evidence</dt><dd>Explicitly unavailable</dd></div></dl></section></div></section>;
}

function Kpi({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) { return <div className="demo-kpi"><span>{icon}</span><b>{value}</b><small>{label}</small></div>; }
function Programme({ title, area, detail, state }: { title: string; area: string; detail: string; state: string }) { return <article className="demo-programme"><div><b>{title}</b><span><MapPin size={13}/>{area}</span><p>{detail}</p></div><em>{state}</em></article>; }
