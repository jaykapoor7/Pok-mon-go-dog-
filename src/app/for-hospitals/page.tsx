import Link from "next/link";
import { ArrowRight, Ban, CalendarOff, EyeOff, Lightbulb } from "lucide-react";
import { Hero6, Page6, Split6, Win6 } from "@/site6/kit";

export const metadata = {
  title: "For hospitals and laboratories · StrayPaw",
  description: "For anti-rabies clinics, health centres and diagnostic laboratories in a One Health programme: a bite register, dose tracking under clinical control, service confirmations, and samples with their chain of custody.",
};

const Chip = ({ tone, children }: { tone?: string; children: React.ReactNode }) => <span className="s6-chip" data-tone={tone}>{children}</span>;

const NEVER = [
  { Icon: Lightbulb, t: "Never assesses", d: "The exposure category is the one the clinician records." },
  { Icon: CalendarOff, t: "Never schedules", d: "Dose dates are the dates the clinician sets." },
  { Icon: Ban, t: "Never suggests treatment", d: "The regimen is written by the clinician, in their words." },
  { Icon: EyeOff, t: "Never shares a patient", d: "Other partners see counts. Small counts are hidden." },
];

export default function HospitalsPage() {
  return (
    <Page6 close={{ title: "Clinical review comes first.", body: "The bite workflow is switched on for a facility only after its clinical lead and the programme have reviewed it." }}>
      <Hero6 kicker="For hospitals and laboratories" title="The register you already keep." grey="Connected to everyone who acts on it." lede="A bite recorded once at the desk. Doses that do not get missed. A sample that arrives with its history."
        actions={<><Link href="/demo?type=programme" className="s6-btn is-primary">Talk to us about a programme<ArrowRight size={16} className="go" aria-hidden /></Link><Link href="/platform#bite-care" className="s6-btn is-line">How bite care works</Link></>} />

      <Split6 id="desk" kicker="At the desk" title="One minute per bite." body="The patient is your own register number; no name is stored. The clinician records what they assessed and prescribed."
        points={["Doses due today and overdue, with consent to call", "Completion calls when a course is done", "The area's field team is asked to find the animal, without patient details"]} status={<Chip tone="blue">In rollout · needs clinical review before real use</Chip>}
        visual={<Win6 title="Today" sub="Anti-rabies clinic" rows={[{ tone: "flame", title: "Dose 1 of 5 · OPD 4471", note: "3 days overdue · consent to call", chip: "Call" }, { title: "Dose 3 of 5 · OPD 4402", note: "Due today", chip: "Record dose", chipTone: "blue" }, { tone: "green", title: "Course complete · OPD 4318", note: "Tell the patient their course is done", chip: "Done", chipTone: "green" }]} />} />

      <Split6 flip id="services" kicker="Availability" title="Say what you can offer today." body="Confirm vaccine, immunoglobulin and wound washing in one tap. A confirmation expires within a week, so an old answer is never shown as current."
        points={["Referral pathway shown when something is unavailable", "The programme is alerted if patients are mid-course", "No stock system is connected; people confirm"]} status={<Chip tone="blue">In rollout</Chip>}
        visual={<Win6 title="Services" sub="Confirmed today" rows={[{ tone: "green", title: "Anti-rabies vaccine", note: "Confirmed by the nurse in charge", chip: "Available", chipTone: "green" }, { tone: "amber", title: "Immunoglobulin", note: "Refers to the teaching hospital", chip: "Limited" }, { tone: "green", title: "Wound washing", note: "Open 8 am to 8 pm", chip: "Available", chipTone: "green" }]} />} />

      <Split6 id="lab" kicker="Laboratory" title="A sample arrives with its history." body="Every hand a sample passes through is recorded. The result carries its method and reaches the sender and the programme together."
        points={["Arriving, received, testing, result", "Dogs, cats, cattle and wildlife", "A positive result alerts the coordination cell"]} status={<Chip tone="blue">In rollout · needs the laboratory&rsquo;s result vocabulary</Chip>}
        visual={<Win6 title="Samples" sub="Reference laboratory" rows={[{ tone: "amber", title: "S-2614 · brain tissue", note: "Handed to courier 2 hours ago", chip: "Arriving" }, { title: "S-2611 · brain tissue", note: "Fluorescent antibody test", chip: "Testing", chipTone: "blue" }, { tone: "flame", title: "S-2607 · positive", note: "Sender and programme told", chip: "Reported" }]} />} />

      <section className="s6-sec is-fill" aria-labelledby="never-h">
        <div className="s6-wrap">
          <div className="s6-head" data-reveal><span className="s6-kicker">Clinical control</span><h2 id="never-h" className="s6-h2">What StrayPaw never does.</h2></div>
          <div className="s6-caps">{NEVER.map((c) => <div className="s6-cap" key={c.t} data-reveal><i aria-hidden><c.Icon size={18} /></i><div><b>{c.t}</b><p>{c.d}</p></div><span /></div>)}</div>
          <p className="s6-note" data-reveal style={{ marginTop: 28, maxWidth: 820 }}><b>Where this is today.</b> Built and tested with illustrative records. No hospital or laboratory is connected yet, and real use needs clinical, ethics and data-protection review by the partners involved.</p>
        </div>
      </section>
    </Page6>
  );
}
