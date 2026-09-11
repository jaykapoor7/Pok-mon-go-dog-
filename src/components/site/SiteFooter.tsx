import Link from "next/link";

/* The legal strip that closes every page outside the console.
   It was written out by hand in MarketingPage and again would have been
   written out by hand in the standalone pages, which is how two footers
   drift apart. One component, one set of links. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`sp-footer mk-foot ${className}`.trim()}>
      <div className="sp-footer-bottom sp-mono">
        <span>STRAYPAW © 2026</span>
        <span className="sp-footer-links">
          <Link href="/mission">MISSION</Link>
          <Link href="/evidence">EVIDENCE</Link>
          <Link href="/privacy">PRIVACY</Link>
          <Link href="/terms">TERMS</Link>
          <Link href="/contact">CONTACT</Link>
        </span>
        <span>BUILT IN INDIA / FOR EVERYWHERE</span>
      </div>
    </footer>
  );
}
