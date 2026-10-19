import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoShell, CoSec } from "@/components/co3/CoShell";
import { getRegisterTotals } from "@/lib/register/totals";

export const revalidate = 300;
export const metadata = { title: "Product, StrayPaw", description: "Report animals, manage cases, track care, and see what’s happening across your city." };
const fmt = (n: number) => n.toLocaleString("en-IN");
const CAPS = [
  { title: "Reporting.", description: "Add a photo, an area and what you saw. Follow recorded updates after review.", href: "/community/report", cta: "Report an animal" },
  { title: "Case management.", description: "Review requests, assign responsibility and record care, outcomes and follow-ups.", href: "/for-ngos", cta: "Explore case management" },
  { title: "Animal histories.", description: "Keep observations and care together on one record, with imported history labelled.", href: "/explore", cta: "Find an animal" },
  { title: "Living Map.", description: "Explore recorded animals, care and requests across cities. Missing records remain unknown.", href: "/explore", cta: "Explore the map" },
];
export default async function ProductPage() {
  const totals = await getRegisterTotals().catch(() => null);
  return <CoShell seed={2} kicker="Product" title="One place for every step of care."
    lede="Report animals, manage cases, track care, and see what’s happening across your city."
    actions={<><Link href="/app?choose=1" className="co3-btn is-flame">Open App <ArrowUpRight size={17} aria-hidden /></Link><Link href="/community/report" className="co3-btn is-line">Report an animal</Link></>}>
    <CoSec title="Report · Coordinate · Understand">
      <p>Start with an observation. Coordinate work when an organisation accepts a request. Understand what is recorded and what is still unknown.</p>
      <p>StrayPaw provides coordination and recordkeeping tools. It does not guarantee rescue, organisational acceptance or veterinary services.</p>
    </CoSec>
    <CoSec title="Four capabilities. One record.">
      <div className="co3-caps">{CAPS.map(c => <article className="co3-cap" key={c.title}><h3>{c.title}</h3><p>{c.description}</p><Link href={c.href}>{c.cta} <ArrowUpRight size={14} aria-hidden /></Link></article>)}</div>
      <nav className="pr-secondary" aria-label="More product tools"><Link href="/for-ngos">NGO workspaces</Link><Link href="/for-governments">Municipal intelligence</Link><Link href="/for-funders">Evidence reporting</Link><Link href="/learn">Education</Link></nav>
    </CoSec>
    <CoSec title="On the record today.">
      {totals && totals.cities > 0 ? <dl className="co3-figs">
        <div><dt>Animal records</dt><dd>{fmt(totals.animals)}<small>Recorded animals, including imported history. Not a census.</small></dd></div>
        <div><dt>Requests for help</dt><dd>{fmt(totals.cases)}<small>Recorded requests, open and closed. Not rescue outcomes.</small></dd></div>
        <div><dt>Cities</dt><dd>{fmt(totals.cities)}<small>Cities with animal records.</small></dd></div>
      </dl> : <p>Public figures are unavailable right now. <Link href="/explore">Explore the record</Link>.</p>}
      <p>Figures describe the record, not the population. Public locations use approximate areas; reporter details stay private. <Link href="/evidence">Sources and methodology</Link> · <Link href="/data-governance">Data policy</Link> · <Link href="/privacy">Privacy</Link></p>
    </CoSec>
  </CoShell>;
}
