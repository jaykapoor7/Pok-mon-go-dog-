import Link from "next/link";
import "./footer-index.css";

const LINKS = [
  ["Product", "/product"], ["Solutions", "/solutions"], ["Our Story", "/our-story"],
  ["Explore", "/explore"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"],
];
export function FooterIndex() {
  return <div className="fx-compact">
    <nav aria-label="Site index">{LINKS.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
  </div>;
}
