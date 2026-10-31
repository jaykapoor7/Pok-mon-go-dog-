import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { StrayPawMark } from "@/components/site/SiteHeader";
import "@/sp3/sp3.css";

/* What closes every public page: an optional demo call to action, the
   site index and the legal strip. One component, so footers cannot drift. */
const COLS: [string, [string, string][]][] = [
  ["Platform", [["Operations", "/platform"], ["StrayPaw AI", "/ai"], ["CareOS for WhatsApp", "/whatsapp"], ["Integrations", "/platform#integrations"], ["Security & trust", "/platform#security"]]],
  ["Solutions", [["Municipalities", "/for-governments"], ["NGOs", "/for-ngos"], ["ABC / ARV programmes", "/solutions/abc-arv"], ["Rescue & care", "/solutions/rescue-care"], ["Funders", "/for-funders"], ["All solutions", "/solutions"]]],
  ["Customers", [["Customer stories", "/customers"], ["The Pawsome People Project", "/customers/the-pawsome-people-project"], ["The Kind Hour Foundation", "/customers/the-kind-hour-foundation"], ["Partner programmes", "/partner-programmes"], ["Apply to partner", "/partner-apply"]]],
  ["Resources", [["Public map", "/explore"], ["Research", "/evidence"], ["Academy", "/learn"], ["Community", "/for-community"], ["Documentation", "/docs"], ["FAQ", "/faq"]]],
  ["Company", [["Our story", "/our-story"], ["Mission", "/mission"], ["Contact", "/contact"], ["Book a demo", "/demo"], ["Data governance", "/data-governance"], ["Licences", "/licences"]]],
];

export function SiteFooter({ className = "", cta = true }: { className?: string; cta?: boolean }) {
  return (
    <footer className={`s3-root s3-foot ${className}`.trim()}>
      <div className="s3-wrap">
        {cta && (
          <div className="s3-foot-cta">
            <div>
              <h2>Run your next ABC/ARV programme on one record.</h2>
              <p>Tell us your city, programme and current registers. We scope a municipal pilot with your NGO partners before any work begins.</p>
            </div>
            <div className="s3-actions">
              <Link href="/demo" className="s3-btn is-primary">Book a demo <ArrowRight size={16} aria-hidden /></Link>
              <Link href="/demo?type=pilot" className="s3-btn is-line">Request a municipal pilot</Link>
            </div>
          </div>
        )}
        <div className="s3-foot-grid">
          <div className="s3-foot-brand">
            <Link href="/" className="s3-brand"><StrayPawMark size={30} /><span>StrayPaw</span></Link>
            <p>Operations software for street-animal programmes. Every intervention, accounted for.</p>
            <LanguageSwitcher />
          </div>
          {COLS.map(([h, links]) => (
            <div key={h} className="s3-foot-col">
              <h4>{h}</h4>
              <ul>{links.map(([l, href]) => <li key={href}><Link href={href}>{l}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="s3-foot-base">
          <span>© {new Date().getFullYear()} StrayPaw · Built in India</span>
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
