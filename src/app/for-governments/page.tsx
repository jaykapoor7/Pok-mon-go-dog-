import Link from "next/link";
import { ArrowRight, ClipboardCheck, Eye, FileCheck2, History, Landmark, MessageSquareWarning } from "lucide-react";
import { Hero6, Page6, Split6, Win6 } from "@/site6/kit";

export const metadata = {
  title: "For governments · StrayPaw",
  description: "For municipal corporations, health departments and state cells: review funded ABC and vaccination work animal by animal, see bite care and vaccine availability across the city, and run a rabies elimination programme on one record.",
};

const Chip = ({ tone, children }: { tone?: string; children: React.ReactNode }) => <span className="s6-chip" data-tone={tone}>{children}</span>;

const CAN = [
  { Icon: Eye, t: "Read what was submitted", d: "Only the packages an operator has submitted to your office, and the records inside them." },
  { Icon: MessageSquareWarning, t: "Raise a query", d: "Ask about any exception. The operator answers on the same record." },
  { Icon: FileCheck2, t: "Decide each claim", d: "Accept, query, return or reject individual animal claims with your name and a note. Nothing is accepted automatically, and StrayPaw does not process payments." },
  { Icon: ClipboardCheck, t: "Never edit an operator's record", d: "Operator records stay the operator's. Review is recorded separately." },
  { Icon: History, t: "Keep the full history", d: "Every submission, query, answer and decision is kept in order, with who and when." },
  { Icon: Landmark, t: "Buy the way you already buy", d: "We work within your department's procurement. We do not claim compliance with a tender we have not read." },
];

const FAQ: [string, string][] = [
  ["Do we need to buy anything to review?", "A pilot is scoped with you and the operator you fund before any work begins. Pricing is agreed per programme."],
  ["Can we compare operators?", "Once more than one operator submits packages to your office, yes: by ward, period and evidence completeness."],
  ["Does StrayPaw replace our existing systems?", "No. It holds the programme record. We integrate with a department's system only when it asks."],
  ["Can a state see its cities?", "Yes. Programmes nest: a state cell sees the counts each city programme shares, never patient records."],
  ["Who sees human-health records?", "Only the facility that created them. Programme and government views show counts, and small counts are shown as fewer than five."],
];

export default function GovernmentPage() {
  return (
    <Page6 close={{ title: "Start with one operator you already fund.", body: "A pilot is scoped in writing first: the wards, the operator, the registers to bring across and what success means." }}>
      <Hero6 kicker="For governments" title="Check the work before you pay for it." grey="See the whole programme while it runs." lede="Municipal offices review funded ABC and vaccination work animal by animal. Health departments and programme cells see bite care, vaccine availability and coverage across the city, without anyone retyping a register."
        actions={<><Link href="/demo?type=pilot" className="s6-btn is-primary">Request a government demo<ArrowRight size={16} className="go" aria-hidden /></Link><Link href="/abc-operations" className="s6-btn is-line">How operators record the work</Link></>} />

      <Split6 id="review" kicker="Municipal review" title="A claim opens to the animals behind it." body="The operator starts the record in the field. Your office joins it at review, instead of receiving a spreadsheet of totals. Before you open a package, Kaju checks each claim against its evidence, the vet's sign-off and the contract rate. You decide every line."
        points={["Capture, surgery, vaccination, release place and photos for every animal claimed", "Missing evidence and possible duplicates listed with the operator's explanation", "Partial acceptance, with totals that follow your decisions"]}
        status={<Chip tone="blue">Built and tested · offered as a pilot</Chip>} link={{ href: "/platform#operations", label: "The operations record" }}
        visual={<Win6 title="November package" sub="Reviewing office" rows={[{ tone: "green", title: "206 claims match their evidence", note: "Signed by the vet, released where caught", chip: "Accept", chipTone: "green" }, { tone: "amber", title: "4 without a release photo", note: "Operator's note attached to each", chip: "Query" }, { tone: "flame", title: "2 possible duplicates", note: "Same animal, two capture dates", chip: "Decide" }, { title: "Decision recorded", note: "Name, date and note kept with the package", chip: "History" }]} />} />

      <Split6 flip id="programme" kicker="Health department and programme cell" title="One view of a city-wide rabies programme." body="Hospitals, health centres, field teams and the laboratory each work in their own place. The cell sees what needs a decision: a facility short of vaccine with people mid-course, a follow-up nobody has picked up, a confirmed case and where it was."
        points={["Bites by area and week, courses on time, vaccine availability each facility confirms", "Dog vaccination coverage against a stated population estimate, with its method and source", "Counts only: patient records never leave the facility that made them"]}
        status={<Chip tone="blue">In rollout · needs partner validation before real use</Chip>} link={{ href: "/platform#network", label: "The care network" }}
        visual={<Win6 title="Needs a decision" sub="Programme cell" rows={[{ tone: "flame", title: "Health centre short of immunoglobulin", note: "3 people in a course · refers to the teaching hospital", chip: "Alert" }, { tone: "amber", title: "Animal follow-up unassigned", note: "Requested 2 days ago by a hospital", chip: "Assign" }, { tone: "green", title: "Ward coverage 71%", note: "Against the 2025 dog population estimate", chip: "On target", chipTone: "green" }]} />} />

      <Split6 id="reports" kicker="Reports" title="Reports with their method attached." body="Totals by ward and week, the evidence index and the exceptions log, exported to PDF and XLSX for your file. A coverage figure is never shown without the estimate it was measured against."
        points={["Programme report by partner and area", "Research extract with small counts suppressed", "Every figure opens to its source records for the people allowed to see them"]}
        status={<Chip tone="green">Live</Chip>}
        visual={<Win6 title="Programme report" sub="October" rows={[{ title: "Animals vaccinated", note: "By partner register, per ward", chip: "PDF" }, { title: "Evidence index", note: "One line per animal claimed", chip: "XLSX" }, { title: "Exceptions log", note: "Queries, answers and decisions", chip: "XLSX" }]} />} />

      <section className="s6-sec is-fill" aria-labelledby="gov-can-h">
        <div className="s6-wrap">
          <div className="s6-head" data-reveal><span className="s6-kicker">Review rules</span><h2 id="gov-can-h" className="s6-h2">What a reviewer can and cannot do.</h2></div>
          <div className="s6-caps">
            {CAN.map((c) => <div className="s6-cap" key={c.t} data-reveal><i aria-hidden><c.Icon size={18} /></i><div><b>{c.t}</b><p>{c.d}</p></div><span /></div>)}
          </div>
          <p className="s6-note" data-reveal style={{ marginTop: 28, maxWidth: 820 }}><b>Where this is today.</b> The operator side is live. The reviewer role, package submission, queries and acceptance are built and tested, and are offered as a pilot with an operator you already fund. No municipality has accepted a package on StrayPaw yet, and no hospital or laboratory is connected.</p>
        </div>
      </section>

      <section className="s6-sec" aria-labelledby="gov-faq-h">
        <div className="s6-wrap">
          <div className="s6-head" data-reveal><h2 id="gov-faq-h" className="s6-h2">Questions from departments.</h2></div>
          <div className="s6-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>
    </Page6>
  );
}
