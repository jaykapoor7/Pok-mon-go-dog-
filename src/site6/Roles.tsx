"use client";

/* Who works in StrayPaw: pick a role, see what their Today looks like. The
   rows are illustrative and say so. */
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Building2, Check, FlaskConical, Gauge, Landmark, LineChart, PawPrint, Stethoscope } from "lucide-react";

type Row = { tone?: "flame" | "amber" | "green"; title: string; note: string; chip: string };
const ROLES: { id: string; label: string; Icon: typeof PawPrint; title: string; points: string[]; href: string; cta: string; place: string; rows: Row[] }[] = [
  { id: "municipal", label: "Municipal corporation", Icon: Landmark, title: "See the programme you fund, animal by animal.", points: ["Review each NGO's monthly submission against the evidence behind it", "Vaccination coverage by ward, only where a population estimate exists", "Contracts, rates and what was accepted, in one place"], href: "/for-governments", cta: "For municipal corporations", place: "Municipal review office", rows: [
    { tone: "amber", title: "October submission · 214 animals", note: "12 missing a release photo", chip: "Review" }, { title: "Ward 14 coverage", note: "41% of an estimated 380 dogs", chip: "Below target" }, { tone: "green", title: "September submission", note: "Accepted on 4 October", chip: "Accepted" }] },
  { id: "ngo", label: "NGO or ABC operator", Icon: PawPrint, title: "Run the work in the field. Prove it without spreadsheets.", points: ["Field mode on a phone, with or without signal", "One record per animal: capture, surgery, vaccination, release", "The monthly package prepares itself as the work is done"], href: "/for-ngos", cta: "For NGOs and operators", place: "Animal Care Trust", rows: [
    { tone: "flame", title: "2 requests from programme partners", note: "A hospital asked you to find a dog", chip: "Overdue 1" }, { title: "Treatment and release", note: "3 waiting for the vet to sign", chip: "Today" }, { tone: "amber", title: "November package", note: "2 animals missing a release place", chip: "Fix" }] },
  { id: "hospital", label: "Hospital or health centre", Icon: Stethoscope, title: "Every bite recorded once. Every dose followed.", points: ["A one-minute desk form; the patient is your register number", "Clinicians assess and set the dates; nurses record doses and calls", "Confirm vaccine and immunoglobulin for the week, so referrals are right"], href: "/platform#bite-care", cta: "Bite care and PEP tracking", place: "Anti-rabies clinic", rows: [
    { tone: "flame", title: "3 doses past their date", note: "Call list ready, consent recorded", chip: "Call" }, { title: "2 doses due today", note: "Dose 3 of 5 · Dose 2 of 5", chip: "Today" }, { tone: "green", title: "4 courses completed this week", note: "Tell each person their course is done", chip: "Done" }] },
  { id: "lab", label: "Laboratory", Icon: FlaskConical, title: "Samples in, results out, custody recorded.", points: ["Arriving, received, testing, resulted: one press per step", "A result needs its method; a rejection needs its reason", "A positive reaches the sender and the programme at once"], href: "/platform#laboratory", cta: "Laboratory surveillance", place: "Reference laboratory", rows: [
    { tone: "amber", title: "1 sample on its way", note: "Dog saliva · Koramangala", chip: "Arriving" }, { title: "1 in testing", note: "Cattle brain tissue · day 6", chip: "Testing" }, { tone: "flame", title: "1 positive this week", note: "HSR Layout · reported to 2 partners", chip: "Reported" }] },
  { id: "programme", label: "Programme coordinator", Icon: Gauge, title: "Know what needs a decision, and who is waiting on whom.", points: ["Alerts drawn from records partners entered, never from a model", "The care network on a map, with referral pathways", "A printable report with small human counts hidden"], href: "/platform", cta: "How a programme runs", place: "Programme coordination cell", rows: [
    { tone: "flame", title: "Vaccine not available at one centre", note: "Referral: teaching hospital", chip: "Urgent" }, { tone: "flame", title: "Rabies confirmed in one area", note: "Laboratory result, signed", chip: "Decide" }, { tone: "amber", title: "1 follow-up overdue", note: "Sent to the field partner 5 days ago", chip: "Ask" }] },
  { id: "research", label: "Researcher", Icon: LineChart, title: "Data you can cite, with its limits written down.", points: ["Weekly counts by area, animal and category; no row is a person", "Counts below the threshold are suppressed before they leave the database", "Imported, verified and illustrative records never mix unlabelled"], href: "/research", cta: "Research and data access", place: "Epidemiology unit", rows: [
    { title: "Exposures by week · 12 months", note: "CSV, suppressed below 5", chip: "Download" }, { title: "Vaccination coverage", note: "4 of 10 areas have an estimate", chip: "Method" }, { tone: "green", title: "Provenance", note: "Every figure names its source", chip: "Read" }] },
];

export function Roles() {
  const [on, setOn] = useState(0);
  const tabs = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ y: number; h: number } | null>(null);
  useLayoutEffect(() => { const b = tabs.current?.querySelectorAll<HTMLElement>("button")[on]; if (b) setInd({ y: b.offsetTop, h: b.offsetHeight }); }, [on]);
  const r = ROLES[on];
  const key = (e: React.KeyboardEvent) => { if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setOn((on + 1) % ROLES.length); } if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setOn((on + ROLES.length - 1) % ROLES.length); } };
  return (
    <div className="s6-roles">
      <div className="s6-roles-tabs" role="tablist" aria-label="Roles" aria-orientation="vertical" ref={tabs} onKeyDown={key}>
        {ind ? <span className="s6-roles-ind" aria-hidden style={{ transform: `translateY(${ind.y}px)`, height: ind.h }} /> : null}
        {ROLES.map((x, i) => <button key={x.id} type="button" role="tab" id={`s6-role-${x.id}`} aria-selected={i === on} aria-controls="s6-role-panel" tabIndex={i === on ? 0 : -1} onClick={() => setOn(i)}><x.Icon size={18} aria-hidden />{x.label}</button>)}
      </div>
      <div className="s6-role" role="tabpanel" id="s6-role-panel" aria-labelledby={`s6-role-${r.id}`} key={r.id}>
        <div>
          <h3 className="s6-h3" style={{ fontSize: 26, letterSpacing: "-.025em", lineHeight: 1.2 }}>{r.title}</h3>
          <ul>{r.points.map((p) => <li key={p}><Check size={16} aria-hidden /><span>{p}</span></li>)}</ul>
          <Link href={r.href} className="s6-textlink">{r.cta}<ArrowRight size={15} aria-hidden /></Link>
        </div>
        <div className="s6-today" aria-label={`Illustration: Today at ${r.place}`}>
          <div className="s6-today-h"><Building2 size={15} aria-hidden /><b>Today</b><span>· {r.place}</span></div>
          {r.rows.map((row) => <div className="s6-today-row" key={row.title}><i data-tone={row.tone} aria-hidden /><div><b>{row.title}</b><small>{row.note}</small></div><span className="s6-chip">{row.chip}</span></div>)}
          <div className="s6-today-foot">Illustrative records</div>
        </div>
      </div>
    </div>
  );
}
