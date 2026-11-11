import Link from "next/link";
import { ArrowRight, ClipboardList, FileSpreadsheet, FileText, Inbox, MessageCircle, PawPrint, Smartphone, Sparkles, Users } from "lucide-react";
import { Hero6, Page6, Split6, Win6 } from "@/site6/kit";

export const metadata = {
  title: "For NGOs and ABC operators · StrayPaw",
  description: "For NGOs and contractors running funded ABC, vaccination and rescue programmes: record the work once, check the evidence, report it to the office that funds you, and answer requests from programme partners.",
};

const Chip = ({ tone, children }: { tone?: string; children: React.ReactNode }) => <span className="s6-chip" data-tone={tone}>{children}</span>;

const STEPS: [string, string][] = [
  ["Capture", "Field staff record each animal with photos and place, online or offline."],
  ["Treat", "Procedures are recorded and authorised by the vet who did them."],
  ["Check", "Evidence gaps and duplicates are fixed the same week."],
  ["Report", "The package for the funding office comes from the records."],
];

const TILES: { Icon: typeof Inbox; t: string; d: string; s: string; tone: string }[] = [
  { Icon: Inbox, t: "Inbox and triage", d: "Requests, community reports and field drafts, each with a clear next step.", s: "Live", tone: "green" },
  { Icon: ClipboardList, t: "Cases and follow-ups", d: "Assign, treat, follow up and close with an outcome.", s: "Live", tone: "green" },
  { Icon: PawPrint, t: "Animal register", d: "One history per animal, from capture to release.", s: "Live", tone: "green" },
  { Icon: Smartphone, t: "Field mode", d: "A one-hand phone view for teams on the street.", s: "Live", tone: "green" },
  { Icon: FileSpreadsheet, t: "Register import", d: "Bring your Excel or CSV. Rows stay labelled as historical.", s: "Live", tone: "green" },
  { Icon: FileText, t: "Reports and proof", d: "Programme reports and evidence workbooks on demand.", s: "Live", tone: "green" },
  { Icon: Sparkles, t: "Kaju", d: "Finds gaps, reads field messages and prepares records for you to confirm.", s: "Live", tone: "green" },
  { Icon: Users, t: "Team and roles", d: "Invite members with codes, set roles, remove access.", s: "Live", tone: "green" },
  { Icon: MessageCircle, t: "WhatsApp intake", d: "Built, awaiting Meta approval. Field mode works meanwhile.", s: "Not connected", tone: "amber" },
];

const FAQ: [string, string][] = [
  ["How long does setup take?", "It depends on your registers and team. We agree a plan with you before starting; most of the time goes into importing past registers and training field staff."],
  ["Who owns our records?", "You do. Export everything to XLSX, CSV and PDF at any time."],
  ["We are a small rescue, not an ABC contractor.", "Rescue and care run on the same record. Ask us about an accessible plan for small welfare groups."],
  ["Do we see patient details when a hospital asks for a follow-up?", "No. A request carries the place, the animal's description and what is asked of you. Patient details stay with the hospital."],
];

export default function OperatorsPage() {
  return (
    <Page6 close={{ title: "Bring your registers. Leave with a record you can prove.", body: "We import what you have, set up your team and agree the evidence your contract asks for before the first capture." }}>
      <Hero6 kicker="For NGOs and ABC operators" title="Record the work once." grey="Get credit for all of it." lede="Capture, treatment, evidence and follow-ups on one record. The report for your funder comes from the same record, and so does your answer when a hospital or the programme asks for help."
        actions={<><Link href="/demo" className="s6-btn is-primary">Book a demo<ArrowRight size={16} className="go" aria-hidden /></Link><Link href="/sign-in?next=/ngo" className="s6-btn is-line">Sign in to your workspace</Link></>} />

      <section className="s6-sec is-tight" aria-labelledby="ngo-steps-h">
        <div className="s6-wrap">
          <div className="s6-head" data-reveal><span className="s6-kicker">The working week</span><h2 id="ngo-steps-h" className="s6-h2">How a programme runs on StrayPaw.</h2></div>
          <ol className="s6-steps4">{STEPS.map(([t, d], i) => <li key={t} data-reveal style={{ ["--d" as string]: `${i * 70}ms` }}><span aria-hidden>{String(i + 1).padStart(2, "0")}</span><b>{t}</b><p>{d}</p></li>)}</ol>
        </div>
      </section>

      <Split6 id="field" kicker="Field" title="Built for the field team's phone." body="A one-hand field mode that works on low-end Android phones and slow networks. Records wait on the phone when there is no signal and send themselves when it returns."
        points={["Photo, place and time captured together", "Release recorded where the animal was caught", "Nothing is lost when the network drops"]} status={<Chip tone="green">Live</Chip>} link={{ href: "/abc-operations", label: "ABC and vaccination operations" }}
        visual={<Win6 title="Field mode" sub="Offline · 3 waiting to send" rows={[{ tone: "green", title: "Capture · brown male, left ear notch", note: "2 photos · place recorded", chip: "Saved", chipTone: "green" }, { tone: "amber", title: "Release · tag 2291", note: "Waiting for signal", chip: "Queued" }, { title: "Vaccination drive · Ward 14", note: "38 recorded today", chip: "Open", chipTone: "blue" }]} />} />

      <Split6 flip id="evidence" kicker="Evidence" title="Know what is missing before month end." body="Each animal shows the evidence your contract asks for, so gaps are fixed while the team can still fix them. The monthly package builds itself from complete records, priced from the contract."
        points={["Vet sign-off by the named vet who did the procedure", "A reminder to the person who can fix the gap, by name", "Programme reports, evidence workbooks and municipal packages in PDF and XLSX"]} status={<Chip tone="green">Live</Chip>}
        visual={<Win6 title="This month" sub="Evidence" rows={[{ tone: "green", title: "212 animals complete", note: "All five evidence items and a vet sign-off", chip: "Ready", chipTone: "green" }, { tone: "amber", title: "2 missing a release photo", note: "Field staff reminded", chip: "Fix" }, { tone: "flame", title: "1 awaiting vet sign-off", note: "Surgery recorded 4 days ago", chip: "Sign" }]} />} />

      <Split6 id="partners" kicker="Programme partners" title="Requests from a hospital reach the team that can act." body="When your organisation takes part in a city programme, a hospital's request to follow up an animal arrives in your own Today, for the areas you cover. You close it with what you found, and send a sample to the laboratory if one is needed."
        points={["Requests carry the place and the animal, never the patient", "Sample handover recorded step by step to the laboratory", "The programme sees the request answered, not your internal records"]} status={<Chip tone="blue">In rollout with programme partners</Chip>} link={{ href: "/platform#laboratory", label: "Laboratory surveillance" }}
        visual={<Win6 title="Today" sub="From the programme" rows={[{ tone: "flame", title: "Follow up a dog near the market", note: "Asked by a teaching hospital · due in 2 days", chip: "Accept", chipTone: "blue" }, { tone: "amber", title: "Sample handed to courier", note: "Reference laboratory · arriving", chip: "Track" }, { tone: "green", title: "Observation closed", note: "Animal healthy after 10 days", chip: "Done", chipTone: "green" }]} />} />

      <section className="s6-sec is-fill" aria-labelledby="ngo-all-h">
        <div className="s6-wrap">
          <div className="s6-head" data-reveal><span className="s6-kicker">The workspace</span><h2 id="ngo-all-h" className="s6-h2">Everything in the operator workspace.</h2></div>
          <div className="s6-caps">
            {TILES.map((c) => <div className="s6-cap is-chip" key={c.t} data-reveal><i aria-hidden><c.Icon size={18} /></i><div><b>{c.t}</b><p>{c.d}</p></div><Chip tone={c.tone}>{c.s}</Chip></div>)}
          </div>
          <p className="s6-note" data-reveal style={{ marginTop: 28, maxWidth: 820 }}><b>Pricing.</b> StrayPaw is scoped and priced per programme before any work begins. Small community and welfare groups can ask us about an accessible plan. <Link href="/pricing" className="s6-textlink" style={{ display: "inline-flex" }}>See pricing<ArrowRight size={15} aria-hidden /></Link></p>
        </div>
      </section>

      <section className="s6-sec" aria-labelledby="ngo-faq-h">
        <div className="s6-wrap">
          <div className="s6-head" data-reveal><h2 id="ngo-faq-h" className="s6-h2">Questions from operators.</h2></div>
          <div className="s6-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>
    </Page6>
  );
}
