import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { Hero } from "@/components/site/Hero";
import { LandingMotion } from "@/components/site/LandingMotion";
import { WhereTheyAre } from "@/components/site/WhereTheyAre";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getShowcaseDogs, countDogs, countUnchecked } from "@/lib/data";
import { ORGS } from "@/lib/platform/orgs";
import "@/components/site/site.css";
import "@/components/site/field-site.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "StrayPaw · One sighting, a shared record",
  description: "A shared map and operational record for India's street animals. One sighting becomes coordinated action and better local evidence.",
};

export default async function HomePage() {
  const [dogs, total, unchecked] = [[{"id": "fx-0", "name": "Pinky", "zone": "Chandni Chowk", "lat": 28.6, "lng": 77.2, "status": "seen", "cover_photo": "/dogs/delhi/asleep-by-bicycle.jpg", "photos": ["/dogs/delhi/asleep-by-bicycle.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": "Aishwarya", "trust_score": 50, "sightings_count": 1}, {"id": "fx-1", "name": null, "zone": "Yamuna Vihar", "lat": 28.610000000000003, "lng": 77.21000000000001, "status": "seen", "cover_photo": "/dogs/delhi/beside-ac-unit.jpg", "photos": ["/dogs/delhi/beside-ac-unit.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": null, "trust_score": 50, "sightings_count": 1}, {"id": "fx-2", "name": null, "zone": "Malviya Nagar", "lat": 28.62, "lng": 77.22, "status": "seen", "cover_photo": "/dogs/delhi/black-tan-shopfront.jpg", "photos": ["/dogs/delhi/black-tan-shopfront.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": null, "trust_score": 50, "sightings_count": 1}, {"id": "fx-3", "name": null, "zone": "Mayur Vihar", "lat": 28.630000000000003, "lng": 77.23, "status": "seen", "cover_photo": "/dogs/delhi/black-white-on-back.jpg", "photos": ["/dogs/delhi/black-white-on-back.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": null, "trust_score": 50, "sightings_count": 1}, {"id": "fx-4", "name": null, "zone": "Najafgarh", "lat": 28.64, "lng": 77.24000000000001, "status": "seen", "cover_photo": "/dogs/delhi/black-white-snake-plant.jpg", "photos": ["/dogs/delhi/black-white-snake-plant.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": null, "trust_score": 50, "sightings_count": 1}, {"id": "fx-5", "name": null, "zone": "Civil Lines", "lat": 28.650000000000002, "lng": 77.25, "status": "seen", "cover_photo": "/dogs/delhi/brown-by-ladder.jpg", "photos": ["/dogs/delhi/brown-by-ladder.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": null, "trust_score": 50, "sightings_count": 1}, {"id": "fx-6", "name": null, "zone": "Shastri Park", "lat": 28.66, "lng": 77.26, "status": "seen", "cover_photo": "/dogs/delhi/brown-on-ledge.jpg", "photos": ["/dogs/delhi/brown-on-ledge.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": null, "trust_score": 50, "sightings_count": 1}, {"id": "fx-7", "name": null, "zone": "Dwarka", "lat": 28.67, "lng": 77.27, "status": "seen", "cover_photo": "/dogs/delhi/cream-forecourt.jpg", "photos": ["/dogs/delhi/cream-forecourt.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": null, "trust_score": 50, "sightings_count": 1}, {"id": "fx-8", "name": null, "zone": "Karol Bagh", "lat": 28.68, "lng": 77.28, "status": "seen", "cover_photo": "/dogs/delhi/crossing-street.jpg", "photos": ["/dogs/delhi/crossing-street.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": null, "trust_score": 50, "sightings_count": 1}, {"id": "fx-9", "name": null, "zone": "Lajpat Nagar", "lat": 28.69, "lng": 77.29, "status": "seen", "cover_photo": "/dogs/delhi/dark-asleep-doorway.jpg", "photos": ["/dogs/delhi/dark-asleep-doorway.jpg"], "size": "medium", "color": "Brown", "is_friendly": true, "needs_help": false, "sterilised": false, "vaccinated": false, "sterilisation_status": "unknown", "vaccination_status": "unknown", "last_seen": "2026-09-01T10:00:00Z", "reporter": null, "trust_score": 50, "sightings_count": 1}] as unknown as Awaited<ReturnType<typeof getShowcaseDogs>>, 85, 71];
  return (
    <div className="sp field-site product-site">
      <PageView name="landing_view" />
      <LandingMotion />
      <SiteHeader />
      <main>
        <Hero dogs={dogs} total={total} />
        <WhereTheyAre dogs={dogs} total={total} unchecked={unchecked} orgs={ORGS.length} />
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
