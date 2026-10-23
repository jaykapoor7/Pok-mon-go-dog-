import Link from "next/link";
import "./footer-index.css";

const LINKS = [
  ["Product", "/product"], ["Solutions", "/solutions"], ["Our Story", "/our-story"],
  ["Explore", "/explore"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Licences", "/licences"],
];
export function FooterIndex({ simple = false }: { simple?: boolean }) {
  return <div className="fx-compact">
    <nav aria-label="Site index">{LINKS.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    {!simple && <details><summary>Who it’s for</summary><nav aria-label="Audiences"><Link href="/for-community">Community</Link><Link href="/for-ngos">NGOs & Rescues</Link><Link href="/for-governments">Municipalities</Link><Link href="/for-feeders">Feeders</Link><Link href="/education">Education</Link></nav></details>}
    {!simple && <details><summary>Data and resources</summary><nav aria-label="Data and resources">
      <Link href="/community/organisations">Organisation directory</Link><Link href="/evidence">Evidence and sources</Link><Link href="/data-governance">Data policy</Link><Link href="/research-standards">Research standards</Link><Link href="/community-guidelines">Community guidelines</Link><Link href="/cookies">Storage and analytics</Link><Link href="/learn">Education</Link><Link href="/report-content">Report content</Link>
    </nav></details>}
  </div>;
}
