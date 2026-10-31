import Link from "next/link";
import type { ReactNode } from "react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { WhatsNew } from "@/sp3/entry/WhatsNew";
import "@/sp3/sp3.css";
import "./entry.css";
import "@/sp4/sp4.css";
import "@/sp4/entry4.css";

/** The account-entry frame (join with a code, request a code), matching /sign-in. */
export function EntryFrame({ children }: { children: ReactNode }) {
  return (
    <div className="s4 s4l s4e">
      <section className="s4l-left">
        <Link href="/" className="s4l-logo is-big" aria-label="StrayPaw home"><StrayPawMark size={44} /><span>StrayPaw</span></Link>
        <div className="s4l-panel s3e-legacy">{children}</div>
        <p className="s4l-help">Already have access? <Link href="/sign-in">Sign in</Link> · Need help? <Link href="/contact">Contact support</Link></p>
        <p className="s4l-legal is-faint"><Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link></p>
      </section>
      <WhatsNew />
    </div>
  );
}
