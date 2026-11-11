import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { Hero6, Page6 } from "@/site6/kit";

export const metadata = { title: "Pricing · StrayPaw", description: "StrayPaw is free to start for rescue and welfare groups. Funded programmes, municipal offices and multi-institution One Health programmes are priced per programme, agreed in writing." };

const PLANS: { name: string; who: string; price: string; cta: { href: string; label: string }; on?: boolean; items: string[] }[] = [
  { name: "Community", who: "Small rescue, feeding and welfare groups", price: "Free to start", cta: { href: "/sign-in?as=org", label: "Get started" },
    items: ["Cases, follow-ups and the animal register", "Community reports in one inbox", "Phone field mode", "Register import from Excel or CSV"] },
  { name: "Operator", who: "Funded ABC operators and NGOs", price: "Per programme", cta: { href: "/demo", label: "Book a demo" }, on: true,
    items: ["Everything in Community", "ABC capture, treatment and release on one record", "Evidence checks and duplicate review", "Report packages in PDF and XLSX", "Kaju with confirmed writes", "Onboarding, import and team training"] },
  { name: "Government", who: "Municipal offices that fund ABC and vaccination", price: "Pilot with an operator you fund", cta: { href: "/demo?type=pilot", label: "Request a government demo" },
    items: ["Read-only review of submitted packages", "Queries and acceptance on the record", "Programme and ward reporting", "Procurement on your department's terms"] },
  { name: "Programme", who: "City and state One Health programmes with several institutions", price: "Scoped with the programme", cta: { href: "/demo?type=programme", label: "Talk to us" },
    items: ["Everything in Government", "Hospitals, health centres and laboratories as partners", "Bite care and PEP tracking, care network, alerts", "Coverage, programme report and research extract", "State oversight across city programmes"] },
];
const FAQ: [string, string][] = [
  ["Why is there no price list?", "Pricing is agreed per programme. Every programme differs in areas, partners, team size, registers to import and reporting. We scope it with you and agree the price in writing before any work begins."],
  ["Is there a free plan?", "Yes. Any rescue, feeding or welfare group can register online and start at once. Reporting an animal and the public map are free for everyone, with no account."],
  ["Do hospitals and laboratories pay separately?", "No. Institutions join a programme as partners; the programme is what is priced. A hospital that works in two programmes is not charged twice."],
  ["How does a municipal office buy it?", "Usually as a pilot alongside an operator it already funds, on the department's own procurement terms. We do not claim compliance with a tender we have not read."],
  ["Can we leave?", "Yes. Registers, evidence and reports export to XLSX, CSV and PDF at any time."],
];

export default function PricingPage() {
  return (
    <Page6>
      <Hero6 kicker="Pricing" title="Pricing that fits the programme." lede="Register your organisation and start today, free. Funded programmes are priced per programme and agreed in writing before work begins." actions={<></>} />
      <section className="s6-sec is-tight" aria-label="Plans" style={{ paddingTop: 0 }}>
        <div className="s6-wrap">
          <div className="s6-plans m-stagger">
            {PLANS.map((p) => (
              <div key={p.name} className={`s6-plan${p.on ? " is-on" : ""}`} data-reveal>
                <h3>{p.name}</h3><p className="who">{p.who}</p><p className="price">{p.price}</p>
                <Link href={p.cta.href} className={`s6-btn ${p.on ? "is-primary" : "is-line"}`}>{p.cta.label}</Link>
                <ul>{p.items.map((x) => <li key={x}><Check size={15} aria-hidden /><span>{x}</span></li>)}</ul>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 22, color: "var(--mute)", fontSize: 14.5 }}>WhatsApp and SMS are not connected yet and are not part of any plan until they are. Prices are agreed per programme, so none are listed here.</p>
        </div>
      </section>
      <section className="s6-sec" id="questions" aria-labelledby="pq-h">
        <div className="s6-wrap s6-split">
          <div className="s6-head" data-reveal><h2 id="pq-h" className="s6-h2">Questions</h2></div>
          <div className="s6-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}<Plus size={20} aria-hidden /></summary><p>{a}</p></details>)}</div>
        </div>
      </section>
    </Page6>
  );
}
