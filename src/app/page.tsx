import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { Hero } from "@/components/site/Hero";
import { LandingMotion } from "@/components/site/LandingMotion";
import { WhereTheyAre } from "@/components/site/WhereTheyAre";
import { ConsoleShowcase } from "@/components/site/ConsoleShowcase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getShowcaseDogs, getAllDogs, countDogs } from "@/lib/data";
import "@/components/site/site.css";
import "@/components/site/field-site.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "StrayPaw · One sighting, a shared record",
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
  const [showcase, mapDogs, total] = await Promise.all([
    getShowcaseDogs(18),
    getAllDogs(),
    countDogs(),
  ]);

  return (
    <div className="sp field-site product-site">
      <PageView name="landing_view" />
      <LandingMotion />
      <SiteHeader />
      <main>
        <Hero dogs={showcase} total={total} />
        <WhereTheyAre dogs={mapDogs} />
        <ConsoleShowcase dogs={mapDogs} />
        <section className="role-help" aria-labelledby="role-help-title">
          <div><span className="field-eyebrow">Four doors, one record</span><h2 id="role-help-title">Start from the part<br />you already play.</h2><p className="role-help-note">Nobody has to become a different kind of person to use this. The work you are already doing on your own street is the work.</p></div>
          <div className="role-help-links">
            <Link href="/app?choose=1"><div><b>Neighbour</b><p>Report the dog you walk past. Follow what happens to her, and get told when it does.</p></div><ArrowUpRight size={18} /></Link>
            <Link href="/app?choose=1"><div><b>Feeder</b><p>Your round, your zones, and the animals you already know by sight — held together in one place.</p></div><ArrowUpRight size={18} /></Link>
            <Link href="/education"><div><b>Educator</b><p>Teach it with the animals on your own road, from material written by people who actually teach.</p></div><ArrowUpRight size={18} /></Link>
            <Link href="/partner-apply"><div><b>Organisation</b><p>Turn a stream of reports into field work somebody is answerable for, with the history to prove it.</p></div><ArrowUpRight size={18} /></Link>
          </div>
        </section>
        <section className="product-closing"><span className="field-eyebrow">It starts with one animal somebody remembers</span><h2>Know one dog?<br /><em>Begin there.</em></h2><Link href="/report" className="field-button">Report a sighting <ArrowUpRight size={18} /></Link></section>
      </main>
      <footer className="field-footer"><Link href="/" className="field-footer-brand">StrayPaw<span>One sighting. A shared record.</span></Link><nav aria-label="Footer"><Link href="/mission">Mission</Link><Link href="/for-ngos">For NGOs</Link><Link href="/evidence">Evidence</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></nav><span>Built with care, in India.<br />© {new Date().getFullYear()} StrayPaw</span></footer>
    </div>
  );
}
