import Link from "next/link";
import { PageHead, S4Page } from "@/sp4/site/kit";
import { ContactForm } from "@/components/contact/ContactForm";
import "./contact.css";

export const metadata = { title: "Contact, StrayPaw", description: "Questions, partnerships, or feedback? Send us a message." };
export default function ContactPage() {
  return <S4Page close={false} className="s4-docpage">
    <PageHead title="Get in touch." lede="Questions, partnerships, or feedback? Send us a message." />
    <section className="s4-wrap s4-doc">
      <div className="s4-contact"><div className="s4-contact-form"><ContactForm /><p className="s4-small">Your name and email are used to handle your message. <Link href="/privacy">Privacy</Link></p></div>
        <aside className="s4-contact-aside" aria-label="Related actions"><p><Link href="/community/report">Report an animal</Link></p><p><Link href="/partner-apply">Apply for an organisation workspace</Link></p><p><Link href="/report-content">Report a public record or photo</Link></p><p><Link href="/data-governance">Corrections and data requests</Link></p></aside>
      </div>
    </section>
  </S4Page>;
}
