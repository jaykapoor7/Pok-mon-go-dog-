import Link from "next/link";
import { PageHead, S4Page } from "@/sp4/site/kit";
import { ReportForm } from "./ReportForm";
import "../contact/contact.css";
import "./report.css";

/* Report content, on the site's page kit with the site header (it was inside the app frame). */
export default function ReportContentPage() {
  return <S4Page close={false} className="s4-docpage">
    <PageHead title="Report content." lede="Flag a public record or photo that breaks the community guidelines. Reports are confidential." />
    <section className="s4-wrap s4-doc">
      <div className="s4-contact">
        <div className="s4-contact-form"><ReportForm /><p className="s4-small">Your email, if you give it, is used only to tell you the outcome. <Link href="/privacy">Privacy</Link></p></div>
        <aside className="s4-contact-aside" aria-label="Related"><p><Link href="/community-guidelines">Community guidelines</Link></p><p><Link href="/data-governance">Corrections and data requests</Link></p><p><Link href="/contact">Contact us</Link></p></aside>
      </div>
    </section>
  </S4Page>;
}
