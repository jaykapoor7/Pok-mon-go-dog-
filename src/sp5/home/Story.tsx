/* ════════════════════════════════════════════════════════════════════
   StrayPaw 5 homepage: the sections that carry the story between the
   hero and the close.

     Problem   the record lives in five places
     Sides     the operator prepares, the office decides (one package)
     Pilot     start with one programme

   Every record shown is illustrative and labelled so. The example animal
   (SP-1071, Sheru, Ward 14) is the same one the audit trail and the five
   steps use, so a visitor follows one animal down the page. No figures,
   customers or capabilities are claimed here that the product pages do
   not already state.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowRight, Camera, Check, ClipboardList, FileSpreadsheet, MessageCircle, Receipt } from "lucide-react";
import { Rise } from "@/sp4/site/Rise";
import { Grain } from "@/sp4/site/Grain";
import { Live } from "@/sp4/site/Live";
import { GovUi, ReviewUi } from "@/sp4/home/ui";
import "./home5.css";

const PLACES: { icon: typeof Camera; where: string; holds: string }[] = [
  { icon: MessageCircle, where: "A WhatsApp group", holds: "The first report and the photo" },
  { icon: ClipboardList, where: "A paper register", holds: "The surgery and the vet's signature" },
  { icon: Camera, where: "Someone's phone", holds: "The release photo and place" },
  { icon: FileSpreadsheet, where: "A spreadsheet", holds: "The monthly count" },
  { icon: Receipt, where: "A printed bill", holds: "The claim the office is asked to pay" },
];

const RECORD: [string, string, string][] = [
  ["30 Oct", "Reported from the field", "Ravi · field team"],
  ["30 Oct", "Registered once, duplicate merged", "Anita · coordinator"],
  ["31 Oct", "Sterilised, 14.2 kg", "Dr. Rao · vet sign-off"],
  ["2 Nov", "Released at the capture point", "Ravi · photo and place"],
  ["3 Nov", "Accepted in the October package", "Municipal office"],
];

/** 2 · The problem: five places that cannot check each other, set against one record that can. */
export function Problem() {
  return (
    <section className="s4-sec s8-problem" aria-labelledby="problem-title">
      <div className="s4-wrap">
        <Rise className="s8-head">
          <h2 id="problem-title" className="s4-h2">Today the record lives in five places.</h2>
          <p className="s4-lede">Each one is kept honestly. None of them can be checked against the others, so every month ends with someone rebuilding the story by hand.</p>
        </Rise>
        <Rise className="s8-pb">
          <ul className="s8-pb-from" aria-label="Where an ABC programme's record is usually kept">
            {PLACES.map((p, i) => (
              <li key={p.where} style={{ ["--i" as string]: i }}>
                <span className="s8-pb-ic" aria-hidden><p.icon size={18} strokeWidth={1.75} /></span>
                <span><b>{p.where}</b><small>{p.holds}</small></span>
              </li>
            ))}
          </ul>
          <div className="s8-pb-join" aria-hidden>
            <svg viewBox="0 0 120 400" preserveAspectRatio="none" focusable="false">
              {[40, 120, 200, 280, 360].map((y, i) => <path key={y} style={{ ["--i" as string]: i }} d={`M0 ${y} C 60 ${y}, 60 200, 120 200`} />)}
            </svg>
          </div>
          <figure className="s8-pb-to">
            <figcaption><span><b>SP-1071 · Sheru</b><small>Female · Ward 14</small></span><em>One record</em></figcaption>
            <ol>
              {RECORD.map(([d, what, who], i) => (
                <li key={what} style={{ ["--i" as string]: i }}>
                  <span className="s8-pb-tick" aria-hidden><Check size={12} strokeWidth={2.5} /></span>
                  <time>{d}</time>
                  <span><b>{what}</b><small>{who}</small></span>
                </li>
              ))}
            </ol>
            <p className="s8-note">Illustrative record</p>
          </figure>
        </Rise>
      </div>
    </section>
  );
}

/** 4 · Connected workflows: the same package, opened from both sides. */
export function Sides() {
  return (
    <section className="s4-sec s8-sides" aria-labelledby="sides-title">
      <div className="s4-wrap">
        <Rise className="s8-head">
          <h2 id="sides-title" className="s4-h2">The operator prepares. The office decides.</h2>
          <p className="s4-lede">Both open the same monthly package: the same animals, the same evidence, the same history. Nothing is retyped between them.</p>
        </Rise>
        <div className="s8-sd">
          <Rise className="s8-sd-col">
            <Grain v={0} id="sides-ngo"><Live><ReviewUi /></Live></Grain>
            <p className="s8-sd-k">Implementing organisation</p>
            <h3>Approve the evidence, then submit.</h3>
            <ul>
              <li>Each record shows what is present and what is missing</li>
              <li>A vet signs each procedure in their own name</li>
              <li>The package is built from approved records only</li>
            </ul>
            <Link href="/for-ngos" className="s4-link">StrayPaw for NGOs <ArrowRight size={16} aria-hidden /></Link>
          </Rise>
          <div className="s8-sd-mid" aria-hidden><span>Monthly package</span></div>
          <Rise className="s8-sd-col" delay={90}>
            <Grain v={2} id="sides-gov"><Live><GovUi /></Live></Grain>
            <p className="s8-sd-k">Municipal office</p>
            <h3>Check every line, then accept, query or return.</h3>
            <ul>
              <li>Reviewers see evidence only for packages sent to their office</li>
              <li>A query goes back to the operator on the same record</li>
              <li>Acceptance is recorded by name. Acceptance is not payment</li>
            </ul>
            <Link href="/for-governments" className="s4-link">StrayPaw for governments <ArrowRight size={16} aria-hidden /></Link>
          </Rise>
        </div>
      </div>
    </section>
  );
}

const PILOT: [string, string][] = [
  ["Bring last month's register", "Excel and CSV registers import as they are. Imported rows stay labelled as historical until they are checked through the workflow."],
  ["Agree the scope in writing", "One programme, your team's roles and what the pilot covers, settled before any work begins."],
  ["Run one reporting cycle", "Capture, vet sign-off, evidence and the monthly package, on your own records, with your own reviewing office."],
];

/** 8 · Why explore a pilot: three steps and one call to action. */
export function Pilot() {
  return (
    <section className="s4-sec s8-pilot" id="pilot" aria-labelledby="pilot-title">
      <div className="s4-wrap">
        <div className="s8-pl">
          <Rise className="s8-pl-copy">
            <h2 id="pilot-title" className="s4-h2">Start with one programme.</h2>
            <p className="s4-lede">A pilot is small on purpose: one programme, one month, your own records.</p>
            <div className="s4-actions">
              {/* The page keeps one "Book a demo" (in the hero); the pilot asks for a conversation. */}
              <Link href="/contact" className="s4-btn is-primary">Talk to us about a pilot</Link>
              <Link href="/pricing" className="s4-btn is-line">How pricing works</Link>
            </div>
          </Rise>
          <ol className="s8-pl-steps">
            {PILOT.map(([t, b], i) => (
              <Rise as="li" key={t} delay={i * 80}>
                <span className="s8-pl-n" aria-hidden>{i + 1}</span>
                <div><h3>{t}</h3><p>{b}</p></div>
              </Rise>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
