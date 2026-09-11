import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { Hero } from "@/components/site/Hero";
import { LandingMotion } from "@/components/site/LandingMotion";
import { ProductStory } from "@/components/site/ProductStory";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getShowcaseDogs, getHeadlineCounts } from "@/lib/data";
import "@/components/site/site.css";
import "@/components/site/field-site.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "StrayPaw · One sighting, a shared record",
  description: "A shared map and operational record for India's street animals. One sighting becomes coordinated action and better local evidence.",
};

export default async function HomePage() {
  const [dogs, counts] = await Promise.all([getShowcaseDogs(18), getHeadlineCounts()]);
  return (
    <div className="sp field-site product-site">
      <PageView name="landing_view" />
      <LandingMotion />
      <SiteHeader />
      <main>
        <Hero dogs={dogs} total={counts.total} localities={counts.localities} photographed={counts.photographed} />
        <ProductStory dogs={dogs} />
        <section className="role-help" aria-labelledby="role-help-title">
          <div><span className="field-eyebrow">A different door into the same record</span><h2 id="role-help-title">Start with the role<br />you already play.</h2></div>
          <div className="role-help-links">
            <Link href="/app?choose=1"><div><b>Neighbour</b><p>Report what you see, follow a dog you know, and understand what happens next.</p></div><ArrowUpRight size={18} /></Link>
            <Link href="/app?choose=1"><div><b>Feeder</b><p>Keep your patch, regular feeding zones, and the animals you recognise connected.</p></div><ArrowUpRight size={18} /></Link>
            <Link href="/education"><div><b>Educator</b><p>Teach it with the animals on your own road, using material written by people who teach.</p></div><ArrowUpRight size={18} /></Link>
            <Link href="/partner-apply"><div><b>Organisation</b><p>Turn reports into accountable field work, care history, and better coverage decisions.</p></div><ArrowUpRight size={18} /></Link>
          </div>
        </section>
        <section className="product-closing"><span className="field-eyebrow">Better care starts with a shared memory</span><h2>Know one dog?<br /><em>Begin there.</em></h2><Link href="/report" className="field-button">Report a sighting <ArrowUpRight size={18} /></Link></section>
      </main>
      <footer className="field-footer"><Link href="/" className="field-footer-brand">StrayPaw<span>One sighting. A shared record.</span></Link><nav aria-label="Footer"><Link href="/mission">Mission</Link><Link href="/for-ngos">For NGOs</Link><Link href="/evidence">Evidence</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></nav><span>Built with care, in India.<br />© {new Date().getFullYear()} StrayPaw</span></footer>
    </div>
  );
}
