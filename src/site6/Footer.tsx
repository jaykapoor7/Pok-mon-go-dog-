import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { FOOT } from "./nav";
import "./site6.css";

/* What closes every public page: the index of the site, the live status and
   the legal strip. Nothing promotional. */
export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`s6 s6-foot ${className}`.trim()}>
      <div className="s6-wrap">
        <div className="s6-foot-grid">
          <div className="s6-foot-brand">
            <Link href="/" className="s6-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/straypaw-mark.png" alt="" width={28} height={28} /><span>StrayPaw</span>
            </Link>
            <p>The operating platform for animal health and One Health programmes: municipalities, NGOs, hospitals and laboratories on one record.</p>
            <Link href="/community/report" className="s6-textlink">Report an animal<ArrowRight size={15} aria-hidden /></Link>
            <div style={{ marginTop: 16 }}><LanguageSwitcher /></div>
          </div>
          {FOOT.map(([h, links]) => (
            <div key={h}><h4>{h}</h4><ul>{links.map(([l, href]) => <li key={href}><Link href={href}>{l}</Link></li>)}</ul></div>
          ))}
        </div>
        <div className="s6-foot-base">
          <span>© {new Date().getFullYear()} StrayPaw. Built in India.</span>
          <Link href="/status" className="s6-live">System status</Link>
          <nav aria-label="Legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Storage</Link><Link href="/community-guidelines">Guidelines</Link><Link href="/report-content">Report content</Link><FeedbackButton label="Feedback" /></nav>
        </div>
      </div>
    </footer>
  );
}
