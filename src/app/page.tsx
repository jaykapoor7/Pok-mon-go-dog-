import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { Hero } from "@/components/site/Hero";
import { TrustStrip } from "@/components/site/TrustStrip";
import { LandingMotion } from "@/components/site/LandingMotion";
import { WhereTheyAre } from "@/components/site/WhereTheyAre";
import { ConsoleShowcase } from "@/components/site/ConsoleShowcase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CaseStory } from "@/components/site/CaseStory";
import { getShowcaseDogs, getAllDogs, countDogs } from "@/lib/data";
import { getFeaturedStories } from "@/lib/stories";
import "@/components/site/site.css";
import "@/components/site/field-site.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "StrayPaw, every street animal on the record",
  description: "A shared map and operational record for India's street animals. One sighting becomes coordinated action and better local evidence.",
};

export default async function HomePage() {
  /* Two different questions, so two different queries.

     The hero wall wants photographs, so it asks for the animals that have
     one. The map below it wants the register: every located record, because
     a map of a city that draws ten pins is a map of a city with ten dogs in
     it, which is not what the record says.

     This block briefly held a hardcoded list of ten animals — a fixture I
     used to develop the section against and then committed. It put a
     stranger's photograph under Pinky's name, showed five pins on a map of
     Delhi, and printed two invented counts. Nothing on this page is allowed
     to come from anywhere but the database. */
  const [showcase, mapDogs, total, stories] = await Promise.all([
    getShowcaseDogs(18),
    getAllDogs(),
    countDogs(),
    getFeaturedStories(1),
  ]);

  return (
    <div className="sp field-site product-site">
      <PageView name="landing_view" />
      <LandingMotion />
      <SiteHeader />
      <main>
        <Hero dogs={showcase} total={total} />
        {/* Directly under the hero: who is already on the record, and one
            named organisation. Named partners carry further than anonymous
            totals, and every figure here is derived rather than typed. */}
        <TrustStrip total={total} />
        <CaseStory story={stories[0] ?? null} />
        <WhereTheyAre dogs={mapDogs} />
        <ConsoleShowcase />
        <section className="role-help" aria-labelledby="role-help-title">
          <div><span className="field-eyebrow">Four ways in</span><h2 id="role-help-title">Choose how you<br />use StrayPaw.</h2><p className="role-help-note">Each one opens a different part of the same record.</p></div>
          <div className="role-help-links">
            {/* Each card goes where its own sentence says it goes. Neighbour
                and Feeder both pointed at /app?choose=1, which made the choice
                illusory: two different promises, one destination, and the
                reader had to pick their role again on arrival. */}
            <Link href="/report"><div><b>Neighbour</b><p>Report an animal you pass. Follow what happens to it and get updates.</p></div><ArrowUpRight size={18} /></Link>
            <Link href="/feeder"><div><b>Feeder</b><p>Keep your feeding zones, your route and the animals you know in one place.</p></div><ArrowUpRight size={18} /></Link>
            <Link href="/education"><div><b>Educator</b><p>Teaching material, used with the animals on your own street.</p></div><ArrowUpRight size={18} /></Link>
            <Link href="/partner-apply"><div><b>Organisation</b><p>Turn incoming reports into tracked field work, with a full history.</p></div><ArrowUpRight size={18} /></Link>
          </div>
        </section>
        <section className="product-closing"><span className="field-eyebrow">Start with one animal</span><h2>Know an animal<br /><em>on your street?</em></h2><Link href="/report" className="field-button">Report a sighting <ArrowUpRight size={18} /></Link></section>
      </main>
      <footer className="field-footer"><Link href="/" className="field-footer-brand">StrayPaw<span>One sighting. A shared record.</span></Link><nav aria-label="Footer"><Link href="/mission">Mission</Link><Link href="/for-ngos">For NGOs</Link><Link href="/evidence">Evidence</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></nav><span>Built with care, in India.<br />© {new Date().getFullYear()} StrayPaw</span></footer>
    </div>
  );
}
