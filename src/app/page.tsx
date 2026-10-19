import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getLandingStory, getLandingPortraits } from "@/lib/landing/story";
import { getMapCities } from "@/lib/livingmap/server";
import { getOperationalPartners } from "@/lib/partners";
import { sxSerif } from "@/components/shell/fonts";
import { DemoProvider } from "@/components/request/DemoProvider";
import { ExampleProfile } from "@/components/marketing/ExampleProfile";
import { HeroRecord } from "@/components/marketing/HeroRecord";
import { WORK_IMAGES, creditLine } from "@/lib/art/sources";
import { RecordMap } from "@/components/marketing/RecordMap";
import { ProfileGallery } from "@/components/marketing/ProfileGallery";
import { MapShowcase } from "@/components/marketing/MapShowcase";
import { Chain } from "@/components/request/Chain";
import { Commons, type Loc } from "@/components/ecosystem/Commons";
import "@/components/site/site.css";
import "@/components/world/home.css";
import "@/components/ecosystem/commons.css";
import "@/components/marketing/precision.css";
import "@/components/marketing/folio.css";
import "@/components/marketing/depth.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw. The digital infrastructure for India's street animals.",
  description: "One place to report animals, coordinate care, and keep track of what happens next.",
};
const fmt = (n: number) => n.toLocaleString("en-IN");

export default async function HomePage() {
  const [story, cities, portraits, partners] = await Promise.all([
    getLandingStory().catch(() => null), getMapCities().catch(() => []),
    getLandingPortraits().catch(() => []), getOperationalPartners().catch(() => []),
  ]);
  const animal = story?.relay ? { id: story.relay.animalId, straypaw_id: story.relay.straypawId } : null;
  const totals = story?.totals;
  const city = cities.find((c) => c.city === story?.hero.city);
  const brief = city ? { city: city.city, animals: city.animals, cells: city.cells, sterilised: city.sterilised, ster_unknown: city.ster_unknown, cases: city.cases } : null;
  const locs: Loc[] = (() => {
    const by = new Map<string, number>();
    for (const a of story?.desk.cells ?? []) if (a.name) by.set(a.name, (by.get(a.name) ?? 0) + a.open);
    return [...by.entries()].map(([name, open]) => ({ name, open })).sort((a, b) => b.open - a.open);
  })();
  return (
    <div className={`sp sw precision folio ${sxSerif.variable}`}>
      <PageView name="landing_view" />
      <SiteHeader tone="paper" />
      <DemoProvider><main>
        <section id="world" className="pr-hero" aria-labelledby="home-title">
          <div className="pr-hero-copy">
            <p className="pr-place">StrayPaw · India</p>
            <h1 id="home-title">The digital infrastructure for India’s street animals.</h1>
            <p className="pr-lede">One place to report animals, coordinate care, and keep track of what happens next.</p>
            <div className="sw-acts">
              <Link href="/municipalities" className="sw-btn is-flame">Plan a municipal pilot <ArrowUpRight size={17} aria-hidden /></Link>
              <Link href="/explore" className="sw-btn is-paper">Explore the map</Link>
            </div>
          </div>
          <figure className="pr-hero-art">
            <HeroRecord record={<ExampleProfile />} map={<RecordMap story={story} />} place={story?.hero.city ?? null} places={cities.filter(c => c.animals > 0).slice(0, 4).map(c => ({ name: c.city, href: `/explore?city=${encodeURIComponent(c.city)}` }))} />
            <figcaption><Link href="/art-credits">Palampore, Coromandel Coast · The Met · CC0</Link></figcaption>
          </figure>
          <div className="pr-hero-record">
            {totals && totals.cities > 0 ? <>
              <dl className="pr-metrics">
                <div><dt>Animal records</dt><dd>{fmt(totals.animals)}<small>Public animal records</small></dd></div>
                <div><dt>Requests for help</dt><dd>{fmt(totals.cases)}<small>Open and closed requests</small></dd></div>
                <div><dt>Cities</dt><dd>{fmt(totals.cities)}<small>Cities with animal records.</small></dd></div>
              </dl>
              <p className="pr-note"><Link href="/evidence">Sources and definitions</Link></p>
            </> : <p className="pr-note">Public figures are unavailable right now. <Link href="/explore">Explore the record</Link>.</p>}
          </div>
          <ProfileGallery portraits={portraits} />
        </section>
        <section id="why" className="pr-section pr-request" aria-labelledby="request-title"><Chain map={<RecordMap story={story} />} /></section>
        <section id="how" className="pr-section pr-ecosystem" aria-labelledby="ecosystem-title">
          <Commons map={<RecordMap story={story} />} queue={story?.desk.queue ?? []} locs={locs} brief={brief} place={story?.hero.city ?? "Your area"} />
          <MapShowcase map={<RecordMap story={story} />} places={cities.filter(c => c.animals > 0).sort((a, b) => (b.cells > 1 ? 1 : 0) - (a.cells > 1 ? 1 : 0)).slice(0, 4).map(c => ({ city: c.city, animals: c.animals, cells: c.cells }))} />
        </section>
        <section id="company" className="pr-section pr-company lp-company-close" aria-labelledby="company-title">
          <div className="pr-company-editorial">
            <h2 id="company-title">Better care starts with better information.</h2>
            <dl className="lp-company-ledger">
              <div><dt>Why</dt><dd>Care needs a record beyond chats and spreadsheets.</dd></div>
              <div><dt>Built</dt><dd>Reporting, cases, animal histories and the Living Map.</dd></div>
              <div><dt>Next</dt><dd>Paid municipal pilots with a funded field network.</dd></div>
            </dl>
            {partners.length > 0 && <div className="depth-field-proof"><p>Field partners</p><ul>{partners.slice(0, 3).map(p => <li key={p.id}><b>{p.name}</b><span>{[p.city, p.state].filter(Boolean).join(", ")} · {p.partnerStatus === "pilot_partner" ? "Pilot partner" : "Field partner"}</span></li>)}</ul><p><Link href="/community/organisations">Partner directory</Link> · <Link href="/evidence">Data sources</Link></p></div>}
            <Link href="/municipalities" className="sw-btn is-flame">Explore a paid pilot <ArrowUpRight size={17} aria-hidden /></Link>
          </div>
          <figure className="pr-company-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={WORK_IMAGES.dogWithPups.src} width={1400} height={997} alt="Dog with pups, a hand-painted Rajasthani work from about 1780. An artwork, not a photograph of a StrayPaw animal." loading="lazy" />
            <figcaption><Link href="/art-credits">{creditLine("dogWithPups")}</Link></figcaption>
            {animal && <div className="lp-company-record"><span>Public animal history</span><Link href={`/animal/${animal.id}`}>{animal.straypaw_id ?? "Open animal history"} <ArrowUpRight size={16} aria-hidden /></Link></div>}
          </figure>
        </section>
      </main></DemoProvider>
      <SiteFooter />
    </div>
  );
}
