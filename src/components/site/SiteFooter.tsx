import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { FooterIndex } from "./FooterIndex";

/* What closes every page outside the console: the site index, then the
   legal strip. One component, one set of links, so two footers cannot
   drift apart; the landing footer renders the same index. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`sp-footer mk-foot ${className}`.trim()}>
      <FooterIndex />
      <div className="sp-footer-bottom sp-mono">
        <span>© 2026 StrayPaw</span>
        <span className="sp-footer-links"><FeedbackButton label="Feedback" /></span>
        <span>Built in India, for street animals everywhere.</span>
      </div>
    </footer>
  );
}
