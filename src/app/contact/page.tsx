import Link from "next/link";
import { CoShell } from "@/components/co3/CoShell";
import { ContactForm } from "@/components/contact/ContactForm";
import "./contact.css";

export const metadata = { title: "Contact, StrayPaw", description: "Questions, partnerships, or feedback? Send us a message." };
export default function ContactPage() {
  return <CoShell seed={5} kicker="Contact" title="Get in touch." close={false} lede="Questions, partnerships, or feedback? Send us a message.">
    <div className="co3-contact pr-contact"><div className="co3-form"><ContactForm /><p className="pr-note">Your name and email are used to handle your message. <Link href="/privacy">Privacy</Link></p></div>
      <aside className="co3-aside" aria-label="Related actions"><p><Link href="/community/report">Report an animal</Link></p><p><Link href="/partner-apply">Apply for an organisation workspace</Link></p><p><Link href="/report-content">Report a public record or photo</Link></p><p><Link href="/data-governance">Corrections and data requests</Link></p></aside>
    </div>
  </CoShell>;
}
