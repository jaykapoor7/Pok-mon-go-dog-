"use client";

import { useState } from "react";
import { Building2, UsersRound, ClipboardCheck, ArrowRight, BadgeCheck } from "lucide-react";

const STEPS = [
  { label: "City funds a pilot", icon: Building2, title: "Start with a defined area and budget.", text: "The municipality buys the software pilot and agrees the fieldwork scope, budget and reporting requirements.", items: ["Pilot area and duration", "Sterilisation and vaccination reporting", "Software fee and field budget"] },
  { label: "Field teams record work", icon: UsersRound, title: "NGOs are the field network.", text: "Teams submit animal records and evidence of work against the agreed scope.", items: ["Animal identity and public area", "Dated field evidence", "Sterilisation or vaccination documentation"] },
  { label: "StrayPaw reviews evidence", icon: ClipboardCheck, title: "Review before the record is verified.", text: "StrayPaw reviews submissions against the pilot’s agreed evidence criteria. Corrections return to the field team.", items: ["Identity and duplicate checks", "Evidence, dates and source", "Reviewer decision and audit trail"] },
  { label: "Release funds after review", icon: BadgeCheck, title: "Fund work. Keep the evidence.", text: "StrayPaw handles disbursement to field teams after review, under the agreed pilot terms. The city receives verified records and programme reporting.", items: ["Reviewed submissions", "Disbursement under pilot terms", "City record and programme reporting"] },
];

/** Proposal navigation only. No money, verification decision or operational record is created. */
export function MunicipalPilot() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  return <div className="mp-pilot"><div className="mp-pilot-nav" role="group" aria-label="Explore the paid pilot model">{STEPS.map((item, i) => { const Icon = item.icon; return <button type="button" key={item.label} aria-pressed={step === i} aria-controls="pilot-model-detail" onClick={() => setStep(i)}><Icon size={23} aria-hidden /><span>{item.label}</span><ArrowRight size={17} aria-hidden /></button>; })}</div><div className="mp-pilot-detail" id="pilot-model-detail"><p>Paid pilot · {step + 1} of 4</p><h3>{s.title}</h3><p>{s.text}</p><ul>{s.items.map(item => <li key={item}>{item}</li>)}</ul></div></div>;
}
