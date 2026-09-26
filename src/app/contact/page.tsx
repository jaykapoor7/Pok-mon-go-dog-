import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ContactForm } from "@/components/contact/ContactForm";
import "./contact.css";

export const metadata = {
  title: "Contact, StrayPaw",
  description: "Get in touch with StrayPaw, questions, partnership ideas, feedback, or content requests.",
};

export default function ContactPage() {
  return (
    <MarketingShell
      eyebrow="Contact"
      title="Get in touch."
      intro="Partnerships, product questions, corrections and removal requests all reach the person building StrayPaw."
      wide
    >
      <div className="ct-layout">
        <ContactForm />
        <aside className="ct-aside" aria-label="Other ways to continue">
          <p className="ct-label">Before you write</p>
          <h2>Send it to the right place.</h2>
          <ul>
            <li><b>NGO access</b><span>See the Field Workspace and application terms first.</span><Link href="/for-ngos">For NGOs <ArrowUpRight size={13} /></Link></li>
            <li><b>Data or privacy</b><span>Ask for a correction, export or removal. Include the page or StrayPaw ID if you have it.</span><Link href="/data-governance">Data policy <ArrowUpRight size={13} /></Link></li>
            <li><b>Education</b><span>Plan a classroom or community session using the original partner materials.</span><Link href="/education">Education <ArrowUpRight size={13} /></Link></li>
          </ul>
          <p className="ct-place"><span>Built in India</span>Working across the country with residents, field teams and public institutions.</p>
        </aside>
      </div>
    </MarketingShell>
  );
}
