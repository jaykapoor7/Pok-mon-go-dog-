"use client";

/* ════════════════════════════════════════════════════════════════════
   Kaju, demonstrated. A question is chosen; Kaju's run shows each step
   it takes on the records, ticking as it goes; the answer names its
   evidence, record by record, and anything it prepares waits for a
   person. Every record here is illustrative and the panel says so; the
   real Kaju reads an organisation's own records with the person's
   permissions, in the live demo and the product.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Check, FileText, MapPin, PawPrint, ShieldCheck, Sparkles } from "lucide-react";
import { LIVE_DEMO_URL } from "@/lib/demo-site";

export type Cap = "understand" | "investigate" | "prepare" | "coordinate";
type Ev = { code: string; label: string; tag: string; tone: "amber" | "violet" | "green" | "blue" | "plain"; kind: "animal" | "package" | "place" | "check" };
export type Ask = { cap: Cap; q: string; steps: string[]; answer: React.ReactNode; evidence: Ev[]; prepared?: string };

export const ASKS: Ask[] = [
  { cap: "understand", q: "Which releases this month are missing a photo?", steps: ["Read 164 Ward 14 records", "Matched each release to its capture point", "Found 2 releases without a release photo"],
    answer: <><b>2 of 18 releases</b> this month have no release photo: SP-1044 and SP-1067. SP-1067 may also be the same animal as SP-1042.</>,
    evidence: [{ code: "SP-1044", label: "Release photo missing", tag: "Evidence", tone: "amber", kind: "animal" }, { code: "SP-1067", label: "Possible duplicate of SP-1042", tag: "Check", tone: "violet", kind: "animal" }] },
  { cap: "investigate", q: "Is SP-1067 the same dog as SP-1042?", steps: ["Compared ear notches and markings", "Compared photos and capture points (220 m apart)", "Checked both histories"],
    answer: <>Likely, but not certain: the markings and ear notch match and the points are <b>220 m apart</b>. Kaju does not merge records; a coordinator decides, and both histories stay.</>,
    evidence: [{ code: "SP-1042", label: "Captured 30 Oct · market gate", tag: "Original", tone: "blue", kind: "animal" }, { code: "SP-1067", label: "Captured 6 Nov · bus depot", tag: "Possible match", tone: "violet", kind: "animal" }] },
  { cap: "prepare", q: "Draft October's package for the reviewing office", steps: ["Read the October records", "Checked evidence and vet sign-off on each", "Drafted the package, with its exceptions"],
    answer: <><b>131 of 133 records</b> are ready. Two wait for a veterinarian&apos;s signature and are listed as exceptions. Every figure in the draft opens the records it counts.</>,
    evidence: [{ code: "Ward 14 · October", label: "Package draft · 131 records", tag: "Draft", tone: "plain", kind: "package" }, { code: "2 records", label: "Waiting for vet sign-off", tag: "Exception", tone: "amber", kind: "check" }],
    prepared: "Prepared, not sent. A coordinator reviews and submits it." },
  { cap: "coordinate", q: "Which bite reports need an animal follow-up?", steps: ["Read requests from partner hospitals", "Matched each area to its NGO", "Assigned nothing: listed for the coordinator"],
    answer: <><b>3 requests</b> from partner hospitals ask for the animal to be found and observed in Ward 14. Patient details stay with the hospital; the request carries only the area and the date.</>,
    evidence: [{ code: "Request · HSR Layout", label: "Find and observe the dog · due 14 Nov", tag: "New", tone: "blue", kind: "place" }, { code: "Request · Jayanagar", label: "Category III bite · due 13 Nov", tag: "Urgent", tone: "amber", kind: "place" }],
    prepared: "Prepared as three tasks for the coordinator to assign." },
];

const ICON = { animal: PawPrint, package: FileText, place: MapPin, check: ShieldCheck };

export function KajuDemo({ asks = ASKS, place = "Ward 14 ABC Unit" }: { asks?: Ask[]; place?: string }) {
  const [i, setI] = useState<number | null>(null);
  const [n, setN] = useState(0);
  const [still, setStill] = useState(false);
  const timer = useRef<number[]>([]);
  useEffect(() => { setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches); return () => timer.current.forEach(clearTimeout); }, []);
  const ask = (k: number) => {
    timer.current.forEach(clearTimeout); timer.current = [];
    setI(k); setN(0);
    const a = asks[k];
    if (still) { setN(a.steps.length + 1); return; }
    for (let s = 1; s <= a.steps.length + 1; s++) timer.current.push(window.setTimeout(() => setN(s), 520 * s));
  };
  const a = i === null ? null : asks[i];
  const done = !!a && n > a.steps.length;
  const now = (s: number) => `09:0${2 + Math.floor(s / 2)}`;

  return (
    <div className="cn8-kd" role="group" aria-label="Kaju, demonstrated with illustrative records">
      <div className="cn8-kd-top"><span className="cn8-kd-mark" aria-hidden><Sparkles size={13} /></span><b>Kaju</b><span>{place}</span><em>Illustrative records</em></div>
      <div className="cn8-kd-body" aria-live="polite">
        {!a ? (
          <div className="cn8-kd-empty"><p>Ask about the work, not about the software.</p><small>Kaju reads the records your role can read, shows each step, and cites what it used.</small></div>
        ) : (
          <>
            <p className="cn8-kd-q">{a.q}</p>
            <div className="cn8-kd-run">
              <p className="cn8-kd-run-h"><b>{done ? "Checked" : "Working"}</b><span className={`cn8-kd-tag${done ? " is-green" : " is-blue"}`}>{done ? "Done" : "Running"}</span></p>
              <ul>{a.steps.slice(0, Math.max(1, Math.min(n, a.steps.length))).map((s, k) => (
                <li key={s}>{k < n - 1 || done ? <span className="cn8-kd-ok" aria-hidden><Check size={10} strokeWidth={3} /></span> : <span className="cn8-kd-spin" aria-hidden />}<span>{s}</span><time>{now(k)}</time></li>
              ))}</ul>
            </div>
            {done ? (
              <div className="cn8-kd-ans">
                <p>{a.answer}</p>
                <ul className="cn8-kd-ev" aria-label="Evidence">{a.evidence.map((e) => { const I = ICON[e.kind]; return <li key={e.code}><I size={14} aria-hidden /><span><b>{e.code}</b><small>{e.label}</small></span><em className={`cn8-kd-tag is-${e.tone}`}>{e.tag}</em></li>; })}</ul>
                {a.prepared ? <p className="cn8-kd-prep"><Sparkles size={12} aria-hidden />{a.prepared}</p> : null}
              </div>
            ) : null}
          </>
        )}
      </div>
      <div className="cn8-kd-asks" role="group" aria-label="Questions to ask Kaju">
        {asks.map((x, k) => <button key={x.q} type="button" aria-pressed={i === k} onClick={() => ask(k)}><span>{x.q}</span><ArrowUp size={13} aria-hidden /></button>)}
      </div>
      <a href={LIVE_DEMO_URL} className="cn8-kd-live">Ask Kaju about real sample records in the live demo<ArrowRight size={14} aria-hidden /></a>
    </div>
  );
}
