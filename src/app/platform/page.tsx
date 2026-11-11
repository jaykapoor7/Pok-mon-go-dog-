import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero6, Page6, PRIMARY, Split6, Win6 } from "@/site6/kit";
import { HeroThread } from "@/site6/Thread";

export const metadata = { title: "Platform · StrayPaw", description: "One record across municipalities, NGOs, hospitals and laboratories: ABC and vaccination, bite care and PEP tracking, the care network, laboratory surveillance, coverage, AnimalID and Kaju." };

const JUMP: [string, string][] = [["operations", "Operations"], ["bite-care", "Bite care"], ["network", "Care network"], ["laboratory", "Laboratory"], ["coverage", "Coverage"], ["animalid", "AnimalID"], ["integrations", "Integrations"]];
const Chip = ({ tone, children }: { tone?: string; children: React.ReactNode }) => <span className="s6-chip" data-tone={tone}>{children}</span>;

const INTEGRATIONS: [string, string, string, string][] = [
  ["Excel and CSV registers", "Import past registers as they are. Rows keep their source and stay labelled as historical.", "Live", "green"],
  ["PDF and XLSX exports", "Report packages, evidence workbooks, the research extract and registers.", "Live", "green"],
  ["Email", "Invitations, sign-in codes and demo requests.", "Live", "green"],
  ["Maps and embeds", "Coverage by place, the care network, and a public map you can embed.", "Live", "green"],
  ["WhatsApp", "Built and tested on staging. Needs a verified number and Meta approval.", "Not connected", "amber"],
  ["SMS reminders", "Reminders are logged phone calls today. SMS needs sender registration.", "Not connected", "amber"],
  ["Hospital and stock systems", "None is connected. Availability is what each facility confirms.", "Not connected", "amber"],
  ["Government portals", "We integrate with a department's system only when it asks.", "On request", ""],
];

export default function PlatformPage() {
  return (
    <Page6>
      <Hero6 kicker="Platform" title="One record." grey="Every institution in the programme." lede="StrayPaw connects the people who deliver animal health and One Health programmes. Each organisation works in its own place, with its own permissions; work passes between them on a shared record."
        actions={<><Link href={PRIMARY.href} className="s6-btn is-primary">{PRIMARY.label}<ArrowRight size={16} className="go" aria-hidden /></Link><Link href="#operations" className="s6-btn is-line">Take the tour</Link></>} />
      <nav className="s6-jump" aria-label="On this page"><div className="s6-wrap s6-jump-in">{JUMP.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</div></nav>

      <Split6 id="operations" kicker="Animal health" title="ABC and vaccination, from capture to an accepted report." body="Field teams capture on a phone. The vet signs what was done. Release is recorded where the animal was caught. The monthly package builds itself from that record, and the municipal office reviews it animal by animal."
        points={["Works offline in the field; syncs when signal returns", "Evidence rules catch a missing release photo before the office does", "Acceptance is recorded with who and when; it is never confused with payment"]} link={{ href: "/abc-operations", label: "ABC and vaccination operations" }} status={<Chip tone="green">Live</Chip>}
        visual={<Win6 title="November package" sub="Ward 14 ABC unit" rows={[{ tone: "green", title: "212 animals ready", note: "Surgery signed, release photo and place recorded", chip: "Ready", chipTone: "green" }, { tone: "amber", title: "2 missing a release photo", note: "Field staff reminded by name", chip: "Fix" }, { title: "Municipal review", note: "Submitted packages are read-only for the office", chip: "Next" }]} />} />

      <Split6 flip id="bite-care" kicker="Human health" title="Bite care and PEP tracking, under clinical control." body="A hospital or health centre records each bite once. The clinician records the category they assessed, writes the regimen and sets each dose date. StrayPaw shows what is due, who to call and when a course is complete. It never assesses, schedules or suggests treatment."
        points={["The patient is the facility's own register number; no name is stored", "Doses due and overdue, with consented phone numbers and a call log", "Completion calls, wound washing recorded at the desk, and rescheduling by the clinician only"]} status={<Chip tone="blue">In rollout · needs clinical review before real use</Chip>}
        visual={<Win6 title="Today" sub="Anti-rabies clinic" rows={[{ tone: "flame", title: "Dose 1 of 5 · OPD 4471", note: "3 days overdue · consent to call", chip: "Call" }, { title: "Dose 3 of 5 · OPD 4402", note: "Due today", chip: "Record dose", chipTone: "blue" }, { tone: "green", title: "Course complete · OPD 4318", note: "Tell the patient their course is done", chip: "Done", chipTone: "green" }]} />} />

      <Split6 id="network" kicker="Referral" title="A care network people can rely on." body="Every facility confirms what it can offer today: anti-rabies vaccine, immunoglobulin, wound washing. A confirmation carries a name and a date and expires within a week, so an old answer is never shown as a current one. Each place records where it sends people for what it lacks."
        points={["Hospitals, health centres and wound-washing units on one map", "Referral pathways set by the programme, shown to staff and to the public", "An alert when a facility with patients in a course runs short"]} status={<Chip tone="blue">In rollout · needs the verified centre list</Chip>}
        visual={<div className="s6-map" role="img" aria-label="Illustration: care network map with referral pathways">
          <svg viewBox="0 0 520 320"><rect width="520" height="320" fill="#f6f8fc" /><path d="M-10 250C90 210 170 270 260 230S430 150 540 190" fill="none" stroke="#dbe6fb" strokeWidth="16" strokeLinecap="round" /><g stroke="#e3e8f1" fill="none">{[40, 120, 200, 280, 360, 440].map((x) => <path key={x} d={`M${x} 0v320`} />)}{[60, 140, 220].map((y) => <path key={y} d={`M0 ${y}h520`} />)}</g>
            <g fill="none" stroke="#2457ce" strokeWidth="1.6" strokeDasharray="4 5" opacity=".7"><path d="M120 110L270 170" /><path d="M410 90L270 170" /><path d="M360 250L270 170" /></g>
            {[[270, 170, "#1f7a4d", "Teaching hospital"], [120, 110, "#1f7a4d", "Health centre"], [410, 90, "#e04a2f", "Health centre"], [360, 250, "#2457ce", "Wound washing"]].map(([x, y, c, l]) => <g key={String(x)} transform={`translate(${x} ${y})`}><circle r="16" fill={String(c)} opacity=".14" className="s6-ta-ring" /><circle r="8" fill={String(c)} stroke="#fff" strokeWidth="3" /><text y="28" textAnchor="middle" fontSize="11" fontWeight="600" fill="#3f4b5e">{l}</text></g>)}
          </svg>
          <div className="s6-today-foot" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}><span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 8, background: "#1f7a4d", marginRight: 6 }} />Vaccine available</span><span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 8, background: "#e04a2f", marginRight: 6 }} />Not available</span><span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 8, background: "#2457ce", marginRight: 6 }} />Wound washing only</span><span>Illustrative</span></div>
        </div>} />

      <Split6 flip id="laboratory" kicker="Surveillance" title="Laboratory results with their custody intact." body="A field team or municipal division sends a sample with one form and a code for the container. The laboratory receives, tests and reports, one step at a time. A result needs its method; a rejection needs its reason. A positive reaches the sender and the programme at once."
        points={["Dogs, cats, cattle, monkeys and wildlife", "Every hand the sample passed through, in order", "Waiting times and confirmed cases by area for the programme"]} status={<Chip tone="blue">In rollout · needs the laboratory&rsquo;s result vocabulary</Chip>}
        visual={<Win6 title="Sample S-2611" sub="Chain of custody" rows={[{ tone: "green", title: "Collected", note: "Field team · 9 Nov, 10:40" }, { tone: "green", title: "Received by the laboratory", note: "10 Nov, 09:15" }, { tone: "green", title: "Testing started", note: "10 Nov, 11:00" }, { tone: "flame", title: "Result reported: positive", note: "Method recorded · sender and programme told", chip: "Signed", chipTone: "violet" }]} />} />

      <Split6 id="coverage" kicker="Decision support" title="Coverage against the target, shown honestly." body="Vaccination coverage needs two numbers: dogs vaccinated and dogs living there. StrayPaw shows coverage only where a population estimate has been recorded with its method and source. Everywhere else it says an estimate is needed, instead of implying a figure."
        points={["Partner registers by area, against the programme's target", "Alerts where coverage is below target, and for dogs due revaccination when the programme sets an interval", "A printable report and a research extract with small human counts hidden"]} status={<Chip tone="blue">In rollout</Chip>}
        visual={<Win6 title="Vaccination coverage" sub="Target 70%" rows={[{ tone: "amber", title: "HSR Layout · 41%", note: "164 of an estimated 400 dogs · mark–resight survey", chip: "Below target", chipTone: "amber" }, { tone: "green", title: "Jayanagar · 74%", note: "89 of an estimated 120 dogs · line transect", chip: "On target", chipTone: "green" }, { title: "Whitefield", note: "38 dogs recorded vaccinated", chip: "Needs an estimate" }]} />} />

      <Split6 flip id="animalid" kicker="Identity" title="AnimalID: is this animal already on the register?" body="A photo is compared with the organisation's own animals of the same species, and the closest matches are shown with their raw similarity. A person decides: same animal, not a match, or a new animal. Nothing merges on its own, and every decision can be reversed with a reason."
        points={["Searches are explicit; uploading a photo never triggers one", "Only your organisation's animals are compared", "Similarity is shown as similarity, not as a probability, until it is validated on labelled data"]} status={<Chip tone="blue">In rollout · accuracy not yet validated</Chip>}
        visual={<Win6 title="Identity review" sub="3 suggestions" rows={[{ title: "SP-1031 · tan female", note: "Same area, last seen 12 days ago", chip: "Similarity 0.83", chipTone: "blue" }, { title: "SP-0992 · tan female", note: "Different area", chip: "Similarity 0.61" }, { title: "None of these", note: "Register as a new animal", chip: "New" }]} foot="Illustrative records. A person always decides." />} />

      <section className="s6-sec is-fill" id="integrations" aria-labelledby="int-h">
        <div className="s6-wrap">
          <div className="s6-head" data-reveal><span className="s6-kicker">Integrations</span><h2 id="int-h" className="s6-h2">What is connected, <span className="s6-grey">and what is not.</span></h2></div>
          <div className="s6-status" data-reveal>{INTEGRATIONS.map(([a, b, c, tone]) => <div className="s6-status-row" key={a}><b>{a}</b><span>{b}</span><span className="s6-chip" data-tone={tone || undefined}>{c}</span></div>)}</div>
          <p style={{ marginTop: 18 }} data-reveal><Link href="/ai" className="s6-textlink">What Kaju does on this record<ArrowRight size={15} aria-hidden /></Link></p>
        </div>
      </section>
    </Page6>
  );
}
