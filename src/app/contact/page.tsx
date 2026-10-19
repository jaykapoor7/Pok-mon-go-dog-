import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoShell } from "@/components/co3/CoShell";
import { ContactForm } from "@/components/contact/ContactForm";
import "./contact.css";

export const metadata = {
  title: "Contact, StrayPaw",
  description: "Get in touch with StrayPaw: partnerships, organisation access, product questions, corrections and removal requests.",
};

const ROUTES = [
  { t: "An animal needs help now", d: "Report it. Organisations near the place see it in their queue.", href: "/community/report", cta: "Report an animal" },
  { t: "Organisation access", d: "Apply for a free workspace, or sign in with the code you were given.", href: "/partner-apply", cta: "Apply to join" },
  { t: "Data or privacy", d: "Ask for a correction, export or removal. Include the page or StrayPaw ID if you have it.", href: "/data-governance", cta: "Data policy" },
  { t: "Report content", d: "A photo or record that should not be public.", href: "/report-content", cta: "Report content" },
];

export default function ContactPage() {
  return (
    <CoShell kicker="Contact" title={<>Talk to <em>us.</em></>} close={false}
      lede="Partnerships, organisation access, product questions, corrections and removal requests. Every message is read.">
      <div className="co3-contact">
        <div className="co3-form"><ContactForm /></div>
        <aside className="co3-aside" aria-label="Other ways to continue">
          <h2>Send it to the right place.</h2>
          {ROUTES.map((r) => (
            <p key={r.t} className="co3-route"><b>{r.t}</b><span>{r.d}</span><Link href={r.href}>{r.cta} <ArrowUpRight size={14} aria-hidden /></Link></p>
          ))}
          <p className="co3-route"><b>Built in India</b><span>Working across the country with residents, field teams and public institutions.</span></p>
        </aside>
      </div>
    </CoShell>
  );
}
