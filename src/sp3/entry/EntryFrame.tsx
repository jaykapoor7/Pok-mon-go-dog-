import Link from "next/link";
import type { ReactNode } from "react";
import { KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import "@/sp3/sp3.css";
import "./entry.css";
import "@/sp4/sp4.css";
import "@/sp4/home/home4.css";
import "@/sp4/entry4.css";
import { Grain } from "@/sp4/site/Grain";

/** The account-entry frame (join with a code, request a code), matching /sign-in. */
export function EntryFrame({ children }: { children: ReactNode }) {
  return (
    <div className="s3 s3e s4 s4e">
      <section className="s3e-left">
        <header className="s3e-brand"><Link href="/" className="s3-brand"><StrayPawMark size={30} /><span>StrayPaw</span></Link><Link href="/sign-in" className="s3e-back">Sign in instead</Link></header>
        <div className="s3e-form s3e-legacy">{children}</div>
        <footer className="s3e-foot">© {new Date().getFullYear()} StrayPaw · <Link href="/privacy">Privacy</Link> · <Link href="/contact">Support</Link></footer>
      </section>
      <aside aria-label="How access works" style={{ display: "flex" }}>
        <Grain v={4} id="ef-art" className="s4e-art" style={{ flex: 1 }}>
          <div className="s4-ui s4-ui-pad s4e-news">
            <span className="s4-tag is-blue"><KeyRound size={11} />How access works</span>
            <ol>
              <li><small>Step 1</small><b>Your organisation invites you</b><span>An admin adds your email and you receive a six-character code.</span></li>
              <li><small>Step 2</small><b>Sign in with email and code</b><span>No password. The same pair works on any device.</span></li>
              <li><small>Step 3</small><b>You land in your workspace</b><span>What you can see and change is decided by your organisation and role, and checked by the database.</span></li>
            </ol>
          </div>
          <p className="s4e-cap"><ShieldCheck size={13} style={{ verticalAlign: -2 }} /> Nobody chooses their own role. Access comes from a verified organisation, never from a form. <Sparkles size={12} style={{ verticalAlign: -1 }} /> StrayPaw AI works inside the same permissions. <Link href="/docs#access">Read more</Link></p>
        </Grain>
      </aside>
    </div>
  );
}
