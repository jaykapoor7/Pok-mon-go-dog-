import Link from "next/link";
import { Check } from "lucide-react";
import { Faq, PageHead, S4Page } from "@/sp4/site/kit";
import { Rise } from "@/sp4/site/Rise";
import "@/sp4/home/home4.css";

export const metadata = { title: "Pricing · StrayPaw", description: "How StrayPaw is priced: scoped per programme, with an accessible plan for small community and welfare groups. No published price list yet." };

const PLANS: { name: string; who: string; price: string; cta: { href: string; label: string }; primary?: boolean; items: string[] }[] = [
  { name: "Community", who: "Small rescue, feeding and welfare groups", price: "Accessible plan", cta: { href: "/demo?type=ngo", label: "Ask about access" },
    items: ["Cases, follow-ups and the animal register", "Community reports in one inbox", "Phone field mode", "Register import from Excel or CSV"] },
  { name: "Operator", who: "Funded ABC operators and NGOs", price: "Scoped per programme", cta: { href: "/demo", label: "Book a demo" }, primary: true,
    items: ["Everything in Community", "ABC capture, treatment and release on one record", "Evidence checks and duplicate review", "Report packages in PDF and XLSX", "Kaju with confirmed writes", "Onboarding, import and team training"] },
  { name: "Government", who: "Municipal offices that fund ABC programmes", price: "Pilot with an operator you fund", cta: { href: "/demo?type=pilot", label: "Request a government demo" },
    items: ["Read-only review of submitted packages", "Queries and acceptance on the record", "Programme and ward reporting", "Procurement on your department's terms"] },
];

export default function PricingPage() {
  return (
    <S4Page>
      <PageHead title="Pricing that fits the programme" lede="StrayPaw is priced per programme and agreed in writing before any work begins. We do not publish a price list yet, and small community and welfare groups can ask about an accessible plan." />
      <section className="s4-wrap s4-sec" style={{ paddingTop: 72 }} aria-label="Plans">
        <div className="s4-plans">
          {PLANS.map((p, i) => (
            <Rise key={p.name} className={`s4-plan${p.primary ? " is-primary" : ""}`} delay={i * 60}>
              <p className="s4-plan-name">{p.name}</p>
              <p className="s4-plan-who">{p.who}</p>
              <p className="s4-plan-price">{p.price}</p>
              <Link href={p.cta.href} className={`s4-btn ${p.primary ? "is-primary" : "is-line"}`}>{p.cta.label}</Link>
              <ul>{p.items.map((x) => <li key={x}><Check size={16} aria-hidden />{x}</li>)}</ul>
            </Rise>
          ))}
        </div>
        <p className="s4-small" style={{ marginTop: 24 }}>WhatsApp field intake is not connected yet and is not part of any plan until it is. Prices are agreed per programme, so none are listed here.</p>
      </section>
      <Faq title="FAQs" items={[
        ["Why is there no price list?", "Every programme differs in wards, team size, registers to import and reporting. We scope a programme with you and agree the price in writing before any work begins."],
        ["Is there a free plan?", "Reporting an animal and the public map are free for everyone, with no account. Small community and welfare groups can ask about an accessible plan."],
        ["How does a municipal office buy it?", "Usually as a pilot alongside an operator it already funds, on the department's own procurement terms. We do not claim compliance with a tender we have not read."],
        ["Can we leave?", "Yes. Registers, evidence and reports export to XLSX, CSV and PDF at any time."],
      ]} />
    </S4Page>
  );
}
