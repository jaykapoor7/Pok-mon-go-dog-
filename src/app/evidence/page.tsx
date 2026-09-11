import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { StateExplorer, type StateRow } from "@/components/app/StateExplorer";
import { EvidenceTabs } from "@/components/app/EvidenceTabs";
import { DATASETS } from "@/lib/platform/datasets";
import { STATES } from "@/lib/platform/geography";
import { ORGS } from "@/lib/platform/orgs";

export const metadata: Metadata = {
  title: "The evidence, StrayPaw",
  description: "India's street-animal evidence, state by state: published population, coverage and the organisations doing the work.",
};

function pointsFor(metric: string) {
  const points = new Map<string, { value: number; source: string; year: number }>();
  for (const dataset of DATASETS) for (const point of dataset.points) {
    if (point.metric === metric && point.geo.level === "state") {
      points.set(point.geo.code, { value: point.value, source: point.source, year: point.year });
    }
  }
  return points;
}

/** The evidence entry opens on data, not a directory of destinations. */
export default function EvidencePage() {
  const population = pointsFor("dog_population");
  const coverage = pointsFor("abc_coverage");
  const rows: StateRow[] = STATES.map((state) => {
    const pop = population.get(state.code);
    const abc = coverage.get(state.code);
    const orgs = ORGS.filter((org) => org.stateCode === state.code);
    const cityGroups = [...new Map(orgs.map((org) => [org.city, orgs.filter((item) => item.city === org.city)]))]
      .map(([city, entries]) => ({ city, orgs: entries.map((org) => ({ id: org.id, name: org.name, url: org.url })) }))
      .sort((a, b) => b.orgs.length - a.orgs.length || a.city.localeCompare(b.city));
    return {
      code: state.code,
      name: state.name,
      population: pop?.value ?? null,
      populationSource: pop?.source ?? null,
      populationYear: pop?.year ?? null,
      abcCoverage: abc ? abc.value / 100 : null,
      abcSource: abc ? `${abc.source} (${abc.year})` : null,
      orgCount: orgs.length,
      orgs: orgs.map((org) => ({ id: org.id, name: org.name, city: org.city, url: org.url })),
      cityGroups,
    };
  }).filter((row) => row.population !== null || row.orgCount > 0);

  const animals = rows.reduce((total, row) => total + (row.population ?? 0), 0);
  const withCoverage = rows.filter((row) => row.abcCoverage !== null).length;

  return (
    <SitePage
      kicker="Public evidence"
      title={<>What is known,<br /><em>state by state.</em></>}
      lede="Published population, sterilisation coverage and the organisations working in each state, in one place. Where nobody has published a figure the row says so, because an absence is part of the picture and rounding it to zero would not be."
      actions={
        <Link href="/map" className="product-primary">
          See the live map <ArrowUpRight size={16} />
        </Link>
      }
    >
      <div className="ev evidence-surface">
        <EvidenceTabs />
        <section className="evidence-metrics" aria-label="Evidence at a glance">
          <div><span>States with a record</span><b>{rows.length}</b><small>published population or an active organisation</small></div>
          <div><span>Animals accounted for</span><b>{(animals / 10_000_000).toFixed(1)} Cr</b><small>across published state estimates</small></div>
          <div><span>Coverage published</span><b>{withCoverage}/{rows.length}</b><small>states reporting sterilisation coverage</small></div>
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
