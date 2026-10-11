import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   Directly under the hero: what StrayPaw does for the people doing the
   care, in four steps. WhatsApp intake is in pilot and says so; the rest
   runs today. The point is continuity: care lands on the animal, so the
   next team starts from what was done, not from nothing.
   ════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { k: "WhatsApp", t: "A message comes in", d: "A resident sends a photo and a place, on the app they already use.", pilot: true },
  { k: "NGO", t: "A team owns the case", d: "One person claims it, treats the animal and schedules the follow-up." },
  { k: "Animal history", t: "Care lands on the animal", d: "Treatment joins the animal's record, so the next team sees it first." },
  { k: "Outcome", t: "It ends in an outcome", d: "The case closes with what happened, and reports count it once." },
];

export function CareStory() {
  return (
    <section className="ld-sec ld-sec-bone ld-care" aria-labelledby="ld-care-title">
      <header className="sys-head">
        <h2 id="ld-care-title">One message, <em>a continuing record.</em></h2>
        <p>StrayPaw CareOS runs community-dog care for NGOs, from the first message to the outcome, and keeps each animal&apos;s history across every team that meets it.</p>
      </header>
      <ol className="ld-care-line">
        {STEPS.map((s, i) => (
          <li key={s.k}>
            <span className="ld-care-k"><span className="ld-care-n">{String(i + 1).padStart(2, "0")}</span>{s.k}{s.pilot && <em>Pilot</em>}</span>
            <b>{s.t}</b>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
      <p className="ld-care-acts">
        <Link href="/for-ngos" className="sys-btn is-flame">CareOS for NGOs <ArrowUpRight size={15} /></Link>
        <Link href="/report" className="ld-care-link">Report a dog <ArrowUpRight size={14} /></Link>
      </p>
    </section>
  );
}
