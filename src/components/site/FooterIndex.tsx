import Link from "next/link";
import "./footer-index.css";

/* ════════════════════════════════════════════════════════════════════
   The index at the foot of every public page. The header carries five
   places; everything else StrayPaw publishes is listed here once, in four
   columns, so a page dropped from the header is never dropped from the
   site. Both footers render this one list.
   ════════════════════════════════════════════════════════════════════ */

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  { title: "The record", links: [
    { label: "Explore", href: "/explore" },
    { label: "Map", href: "/map" },
    { label: "Insights", href: "/insights" },
    { label: "Stories", href: "/stories" },
    { label: "Report an animal", href: "/report" },
  ] },
  { title: "Who it's for", links: [
    { label: "NGOs", href: "/for-ngos" },
    { label: "Municipalities", href: "/for-governments" },
    { label: "Funders", href: "/for-funders" },
    { label: "Volunteers", href: "/get-involved" },
    { label: "Schools and educators", href: "/education" },
    { label: "Researchers", href: "/research-standards" },
  ] },
  { title: "StrayPaw", links: [
    { label: "About", href: "/about" },
    { label: "Partner NGOs", href: "/orgs" },
    { label: "Evidence", href: "/evidence" },
    { label: "Contact", href: "/contact" },
  ] },
  { title: "Policies", links: [
    { label: "Data policy", href: "/data-governance" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ] },
];

export function FooterIndex() {
  return (
    <nav className="fx" aria-label="Site index">
      {COLUMNS.map((c) => (
        <div key={c.title} className="fx-col">
          <h2 className="fx-h">{c.title}</h2>
          <ul>
            {c.links.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
          </ul>
        </div>
      ))}
    </nav>
  );
}
