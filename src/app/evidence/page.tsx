import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { StateExplorer, type StateRow } from "@/components/app/StateExplorer";
import { EvidenceTabs } from "@/components/app/EvidenceTabs";
import { buildStateRows } from "@/lib/platform/stateRows";
import { getFeaturedStories } from "@/lib/stories";
import { getPublicProgrammes } from "@/lib/public-programmes";
import { getOperationalPartners } from "@/lib/partners";

export const metadata: Metadata = {
  title: "The evidence, StrayPaw",
  description: "India's street-animal evidence, state by state: published population, coverage and the organisations doing the work.",
};

export default async function EvidencePage() {
  const rows: StateRow[] = buildStateRows();
  const [stories, programmes, partners] = await Promise.all([
    getFeaturedStories(6),
    getPublicProgrammes(6),
    getOperationalPartners(),
  ]);

  const bitesTotal = rows.reduce((total, row) => total + (row.bites2024 ?? 0), 0);
  const deathsTotal = rows.reduce((total, row) => total + (row.deaths2024 ?? 0), 0);
  const withCoverage = rows.filter((row) => row.abcCoverage !== null).length;

  return (
    <SitePage
      kicker="Public evidence"
      title={<>What is known,<br /><em>state by state.</em></>}
      lede={`What the government publishes for each of India's 28 states and 8 union territories: dog bites, suspected rabies deaths, the last population census, and sterilisation coverage where it exists. Where nobody has published a figure, the row says so.`}
      actions={<Link href="/map" className="product-primary">See the live map <ArrowUpRight size={16} /></Link>}
    >
      <div className="ev evidence-surface">
        <EvidenceTabs />
        <section className="evidence-metrics" aria-label="Evidence at a glance">
          <div><span>Dog bites reported, 2024</span><b>{(bitesTotal / 100_000).toFixed(1)} L</b><small>reported by every state and union territory through health surveillance</small></div>
          <div><span>Suspected rabies deaths, 2024</span><b>{deathsTotal}</b><small>what surveillance caught; modelling puts the real toll near 19,000</small></div>
          <div><span>Sterilisation coverage published</span><b>{withCoverage}/{rows.length}</b><small>the rest have released no figure at all</small></div>
        </section>
        <StateExplorer rows={rows} />

        <section className="evidence-field-record" id="straypaw-record" aria-labelledby="field-record-title">
          <div className="evidence-field-record-head">
            <span className="sx-kicker spa-mono">StrayPaw field record</span>
            <h2 id="field-record-title">What our partners have <em>documented.</em></h2>
            <p>Animal-linked care, completed programmes and outcomes shared by field partners live here. Private operational records, exact sensitive locations and reporter contacts stay private.</p>
          </div>

          <div className="evidence-work-grid">
            <section className="evidence-work-section" aria-labelledby="care-stories-title">
              <div className="evidence-work-heading"><span>Care stories</span><Link href="/care">Care register <ArrowUpRight size={13} /></Link></div>
              <h3 id="care-stories-title">Care, rescue and recovery in sequence.</h3>
              {stories.length ? <div className="evidence-story-list">{stories.map((story) => <article key={story.id} className="evidence-story-card"><h4>{story.title}</h4><p>{story.public_summary}</p>{story.location_label && <span><MapPin size={13} /> {story.location_label}</span>}{story.stages.length > 0 && <ol>{story.stages.slice(0, 4).map((stage, index) => <li key={`${stage.label}-${index}`}>{stage.date ? `${stage.date} · ` : ""}{stage.label}</li>)}</ol>}</article>)}</div> : <p className="evidence-empty">Care stories from partner teams will appear here.</p>}
            </section>

            <section className="evidence-work-section" aria-labelledby="drives-title">
              <div className="evidence-work-heading"><span>Programmes</span><Link href="/programmes">Programme register <ArrowUpRight size={13} /></Link></div>
              <h3 id="drives-title">Programme totals with a named team and source record.</h3>
              {programmes.length ? <div className="evidence-programme-list">{programmes.map((programme) => { const total = programme.kind === "sterilisation" ? programme.sterilised_recorded : programme.kind === "vaccination" ? programme.vaccinated_recorded : programme.animals_recorded; const label = programme.kind === "sterilisation" ? "dogs sterilised" : programme.kind === "vaccination" ? "animals vaccinated" : "animals helped"; return <article key={programme.id} className="evidence-programme-card"><p>{programme.ngo_name}</p><h4>{programme.name}</h4>{programme.public_summary && <span>{programme.public_summary}</span>}<small>{total.toLocaleString()} {label}</small></article>; })}</div> : <p className="evidence-empty">Published programmes from partner teams will appear here.</p>}
            </section>

            <section className="evidence-work-section evidence-partners" aria-labelledby="partners-title">
              <div className="evidence-work-heading"><span>NGOs & partners</span><Link href="/partners">Full directory <ArrowUpRight size={13} /></Link></div>
              <h3 id="partners-title">The organisations responsible for the work.</h3>
              <div className="evidence-partner-list">{partners.slice(0, 6).map((partner) => <article key={partner.id}><span><ShieldCheck size={13} /> {partner.partnerStatus === "operational_partner" ? "Operational partner" : "Pilot partner"}</span><h4>{partner.name}</h4><p>{[partner.city, partner.state].filter(Boolean).join(", ")}</p></article>)}</div>
            </section>
          </div>
        </section>

        <footer className="evidence-next">
          <div><b>Want to inspect where the work is concentrated?</b><span>The live map now turns mapped records into density, urgency, ARV-gap and ABC-gap views.</span></div>
          <Link href="/map" className="product-primary">Explore the map <ArrowUpRight size={16} /></Link>
        </footer>
        <nav className="evidence-context-links" aria-label="Related evidence tools">
          <Link href="/map">Map intelligence</Link>
          <Link href="/data">The published dataset</Link>
          <Link href="/sources">Every source we cite</Link>
          <Link href="/rescues">Rescue records</Link>
          <Link href="/outcomes">Outcomes</Link>
        </nav>
      </div>
    </SitePage>
  );
}
