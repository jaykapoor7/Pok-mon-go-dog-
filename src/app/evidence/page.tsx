import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { StateExplorer, type StateRow } from "@/components/app/StateExplorer";
import { EvidenceTabs } from "@/components/app/EvidenceTabs";
import { buildStateRows } from "@/lib/platform/stateRows";

export const metadata: Metadata = {
  title: "The evidence, StrayPaw",
  description: "India's street-animal evidence, state by state: published population, coverage and the organisations doing the work.",
};

/** The entry opens on data, not a directory of destinations. */
export default function EvidencePage() {
  const rows: StateRow[] = buildStateRows();

  const bitesTotal = rows.reduce((total, row) => total + (row.bites2024 ?? 0), 0);
  const deathsTotal = rows.reduce((total, row) => total + (row.deaths2024 ?? 0), 0);
  const withCoverage = rows.filter((row) => row.abcCoverage !== null).length;

  return (
    <SitePage
      kicker="Public evidence"
      title={<>What is known,<br /><em>state by state.</em></>}
      lede={`What the government publishes for each of India's 28 states and 8 union territories: dog bites reported, suspected rabies deaths, the last population census, and sterilisation coverage where a figure exists at all. Where nobody has published one the row says so, because an absence is part of the picture and rounding it to zero would not be.`}
      actions={
        <Link href="/map" className="product-primary">
          See the live map <ArrowUpRight size={16} />
        </Link>
      }
    >
      <div className="ev evidence-surface">
        <EvidenceTabs />
        <section className="evidence-metrics" aria-label="Evidence at a glance">
          <div><span>Dog bites reported, 2024</span><b>{(bitesTotal / 100_000).toFixed(1)} L</b><small>reported by every state and union territory through health surveillance</small></div>
          <div><span>Suspected rabies deaths, 2024</span><b>{deathsTotal}</b><small>what surveillance caught; modelling puts the real toll near 19,000</small></div>
          <div><span>Sterilisation coverage published</span><b>{withCoverage}/{rows.length}</b><small>the rest have released no figure at all</small></div>
        </section>
        <StateExplorer rows={rows} />
        <footer className="evidence-next">
          <div><b>Need to scope the work?</b><span>Use published figures to build a costed programme for a state.</span></div>
          <Link href="/what-would-it-take" className="product-primary">Cost a programme <ArrowUpRight size={16} /></Link>
        </footer>
        {/* Three of these had no route into them from anywhere on the site.
            Density across India and the published dataset were both built,
            both working, and both reachable only by typing the URL. */}
        <nav className="evidence-context-links" aria-label="Related evidence tools">
          <Link href="/wards">Density across India</Link>
          <Link href="/data">The published dataset</Link>
          <Link href="/sources">Every source we cite</Link>
          <Link href="/needs">See local needs</Link>
          <Link href="/outcomes">See verified outcomes</Link>
        </nav>
      </div>
    </SitePage>
  );
}
