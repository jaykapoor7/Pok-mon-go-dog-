import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { StrayPawMark } from "@/components/site/SiteHeader";
import "@/sp3/sp3.css";
import "@/sp4/sp4.css";

/* What closes every public page (StrayPaw 4): the dark site index and the
   legal strip. The closing call to action belongs to each page, above the
   footer, so `cta` is accepted for old callers and ignored. */
const COLS: [string, [string, string][]][] = [
  ["Product", [["ABC Operations & Verification", "/abc-operations"], ["Platform overview", "/platform"], ["Kaju", "/ai"], ["WhatsApp field intake", "/whatsapp"], ["Integrations", "/platform#integrations"], ["Security", "/security"], ["Book a demo", "/demo"]]],
  ["Solutions", [["ABC operators & NGOs", "/for-ngos"], ["ABC / ARV programmes", "/solutions/abc-arv"], ["Rescue & care", "/solutions/rescue-care"], ["Government oversight", "/for-governments"], ["Community & welfare groups", "/for-community"]]],
  ["Resources", [["Customer stories", "/customers"], ["Documentation", "/docs"], ["Research", "/research"], ["Public map", "/explore"], ["Academy", "/learn"], ["FAQ", "/faq"]]],
  ["Company", [["Our story", "/our-story"], ["Contact", "/contact"], ["Partner with us", "/partner-apply"], ["Data governance", "/data-governance"], ["Licences", "/licences"]]],
];

export function SiteFooter({ className = "", cta = true }: { className?: string; cta?: boolean }) {
  void cta;
  return (
    <footer className={`s4 s4-foot ${className}`.trim()}>
      <div className="s4-wrap">
        <div className="s4-foot-grid">
          <div className="s4-foot-brand">
            <Link href="/" className="s4-brand"><StrayPawMark size={28} /><span>StrayPaw</span></Link>
            <p>Operations and verification software for animal birth control programmes, and the people who deliver them.</p>
            <Link href="/for-community" className="s4-link">Report an animal <ArrowRight size={15} aria-hidden /></Link>
            <div><LanguageSwitcher /></div>
          </div>
          {COLS.map(([h, links]) => (
            <div key={h}>
              <h4>{h}</h4>
              <ul>{links.map(([l, href]) => <li key={href}><Link href={href}>{l}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="s4-foot-base">
          <span>© {new Date().getFullYear()} StrayPaw. Built in India.</span>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Storage</Link>
            <Link href="/community-guidelines">Guidelines</Link><Link href="/report-content">Report content</Link>
            <FeedbackButton label="Feedback" />
          </nav>
        </div>
      </div>
    </footer>
  );
}
