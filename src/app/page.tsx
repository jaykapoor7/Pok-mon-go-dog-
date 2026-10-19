import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getLandingStory, getAnimalRegister } from "@/lib/landing/story";
import { getMapCities } from "@/lib/livingmap/server";
import { sxSerif } from "@/components/shell/fonts";
import { DemoProvider } from "@/components/request/DemoProvider";
import { PublicAnimal } from "@/components/marketing/PublicAnimal";
import { HeroRecord } from "@/components/marketing/HeroRecord";
import { WORK_IMAGES, creditLine } from "@/lib/art/sources";
import { RecordMap } from "@/components/marketing/RecordMap";
import { Chain } from "@/components/request/Chain";
import { Commons, type Loc } from "@/components/ecosystem/Commons";
import "@/components/site/site.css";
import "@/components/world/home.css";
import "@/components/ecosystem/commons.css";
import "@/components/marketing/precision.css";
import "@/components/marketing/folio.css";

export const revalidate = 300;
export const metadata = {
  title: "StrayPaw. The care infrastructure for India's street animals.",
  description: "One place to report animals, coordinate care, and keep track of what happens next.",
};
const fmt = (n: number) => n.toLocaleString("en-IN");

export default async function HomePage() {
  const [story, cities, register] = await Promise.all([getLandingStory().catch(() => null), getMapCities().catch(() => []), getAnimalRegister().catch(() => ({ total: 0, cards: [] }))]);
  const animal = register.cards.find(a => a.care.length > 0) ?? register.cards[0] ?? null;
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
            <h1 id="home-title">The care infrastructure for India’s street animals.</h1>
            <p className="pr-lede">One place to report animals, coordinate care, and keep track of what happens next.</p>
            <div className="sw-acts">
              <Link href="/app?choose=1" className="sw-btn is-flame">Open App <ArrowUpRight size={17} aria-hidden /></Link>
              <Link href="/explore" className="sw-btn is-paper">Explore the map</Link>
            </div>
          </div>
          <figure className="pr-hero-art">
            <HeroRecord record={<PublicAnimal animal={animal} />} map={<RecordMap story={story} />} place={story?.hero.city ?? null} places={cities.filter(c => c.animals > 0).slice(0, 4).map(c => ({ name: c.city, href: `/explore?city=${encodeURIComponent(c.city)}` }))} />
            <figcaption><Link href="/art-credits">Palampore, Coromandel Coast · The Met · CC0</Link></figcaption>
          </figure>
          <div className="pr-hero-record">
            {totals && totals.cities > 0 ? <>
              <dl className="pr-metrics">
                <div><dt>Animal records</dt><dd>{fmt(totals.animals)}<small>Recorded animals, including imported history. Not a census.</small></dd></div>
                <div><dt>Requests for help</dt><dd>{fmt(totals.cases)}<small>Recorded requests, open and closed. Not rescue outcomes.</small></dd></div>
                <div><dt>Cities</dt><dd>{fmt(totals.cities)}<small>Cities with animal records.</small></dd></div>
              </dl>
              <p className="pr-note">From the public record. <Link href="/evidence">Sources and definitions</Link></p>
            </> : <p className="pr-note">Public figures are unavailable right now. <Link href="/explore">Explore the record</Link>.</p>}
          </div>
        </section>
        <section id="why" className="pr-section pr-request" aria-labelledby="request-title"><Chain map={<RecordMap story={story} />} /></section>
        <section id="how" className="pr-section pr-ecosystem" aria-labelledby="ecosystem-title">
          <Commons map={<RecordMap story={story} />} queue={story?.desk.queue ?? []} locs={locs} brief={brief} place={story?.hero.city ?? "Your area"} />
        </section>
        <section id="company" className="pr-section pr-company" aria-labelledby="company-title">
          <figure className="pr-company-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={WORK_IMAGES.dogWithPups.src} width={1400} height={997} alt="Dog with pups, a hand-painted Rajasthani work from about 1780, showing a mother dog with five puppies." loading="lazy" />
            <figcaption><Link href="/art-credits">{creditLine("dogWithPups")}</Link></figcaption>
            {animal && <p className="lp-company-record">One animal, on the record: <Link href={`/animal/${animal.id}`}>{animal.straypaw_id ?? "Public history"}</Link>. Recorded history may be imported; it is not proof of a rescue by StrayPaw.</p>}
          </figure>
          <div className="pr-company-editorial">
            <h2 id="company-title">A shared record for better care.</h2>
            <div className="pr-company-topics">
              <div><h3>Why StrayPaw exists.</h3><p>Care is spread across chats, sheets and notebooks. The next person needs a record they can build on.</p></div>
              <div><h3>What we’ve built.</h3><p>Reporting, case management, animal histories and a Living Map in one platform.</p><Link href="/product">Explore the product</Link></div>
              <div><h3>What’s next.</h3><p>More field partners and better local coverage, with the limits of the record kept visible.</p><Link href="/our-story">Read our story</Link></div>
            </div>
          </div>
          <div className="pr-closing"><h2>Better care starts with better information.</h2><Link href="/partner-apply" className="sw-btn is-paper">Work with us <ArrowUpRight size={17} aria-hidden /></Link></div>
        </section>
      </main></DemoProvider>
      <SiteFooter />
    </div>
  );
}
