"use client";

/* ════════════════════════════════════════════════════════════════════
   The footer of the cinematic site: the same hillside, low on the page,
   with the site's index above it and the legal line beneath. The world
   only wakes when the footer is on screen.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { World } from "./world/World";
import "./cine.css";

const COLS: { h: string; links: [string, string][] }[] = [
  { h: "Platform", links: [["/platform", "Overview"], ["/kaju", "Kaju"], ["/abc-operations", "ABC operations"], ["/security", "Security"], ["/pricing", "Pricing"]] },
  { h: "Solutions", links: [["/for-ngos", "NGOs and veterinary teams"], ["/for-governments", "Municipal government"], ["/for-hospitals", "Hospitals and public health"], ["/research", "Researchers"], ["/for-funders", "CSR sponsors"]] },
  { h: "Proof", links: [["/customers", "Field partners"], ["/demo", "Book a demo"], ["/evidence", "Evidence"], ["/status", "Status"], ["/roadmap", "Roadmap"], ["/product-updates", "Product updates"]] },
  { h: "Company", links: [["/our-story", "Our story"], ["/docs", "Help"], ["/contact", "Contact"], ["/privacy", "Privacy"], ["/terms", "Terms"]] },
];

export function CineFooter() {
  const [ok, setOk] = useState(true);
  return (
    <footer className="cn8-foot">
      <div className="cn8-foot-in">
        <div className="cn8-foot-lead">
          <p className="cn8-foot-h">The whole world, connected.</p>
          <p>One platform for animal care, programme verification and public-health intelligence.</p>
        </div>
        <nav className="cn8-foot-cols" aria-label="Site index">
          {COLS.map((c) => (
            <div key={c.h}><p>{c.h}</p><ul>{c.links.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul></div>
          ))}
        </nav>
      </div>
      <div className={`cn8-foot-world${ok ? "" : " is-still"}`} aria-hidden>
        {ok ? <World onReady={setOk} /> : null}
      </div>
      <div className="cn8-foot-legal"><span>© {new Date().getFullYear()} StrayPaw</span><span>Illustrative records in demonstrations are labelled as such.</span><Link href="/report-content">Report content</Link></div>
    </footer>
  );
}
