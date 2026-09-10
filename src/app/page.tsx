import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PageView } from "@/components/analytics/PageView";
import { LandingMotion } from "@/components/site/LandingMotion";
import { Hero } from "@/components/site/Hero";
import { FieldMapPreview } from "@/components/site/FieldMapPreview";
import { getShowcaseDogs } from "@/lib/data";
import { dogLabel } from "@/lib/utils";
import "@/components/site/site.css";
import "@/components/site/field-site.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "StrayPaw · They live here, too",
  description: "A shared map for India's street animals. Record sightings, follow care, and help local animal-welfare teams work together.",
};

export default async function HomePage() {
  const dogs = await getShowcaseDogs(8);
  return (
    <div className="sp field-site">
      <PageView name="landing_view" />
      <LandingMotion />
      <SiteHeader />
      <main>
        <Hero />
        <section className="record-intro" id="record-sequence">
          <div className="record-intro-copy"><span className="field-eyebrow">A better way to begin</span><h2>A street animal is not<br /><span>a blank space on a map.</span></h2><p>They are a familiar face, a place someone remembers, and a story that should not disappear between visits.</p><Link href="/why-straypaw" className="field-inline-link">Why we’re building this <ArrowUpRight size={16} /></Link></div>
          <div className="record-stages" aria-label="How a StrayPaw record grows">
            <article className="record-stage"><span className="record-stage-number">01 / NOTICE</span><div><h3>Start with what you saw.</h3><p>A dog near a tea stall. A limping paw. A face you have seen all week. The report does not ask you to know everything.</p></div><div className="record-stage-data"><span>OBSERVATION</span><b>A moment on the street</b></div></article>
            <article className="record-stage"><span className="record-stage-number">02 / PLACE</span><div><h3>Give the memory an address.</h3><p>A pin, a landmark and a photo make it possible for another person to find the same place with confidence.</p></div><div className="record-stage-data"><span>LOCATION</span><b>Saved for the next visit</b></div></article>
            <article className="record-stage"><span className="record-stage-number">03 / FOLLOW THROUGH</span><div><h3>Leave the next person somewhere to begin.</h3><p>Care, sightings and notes stay together. One useful history, built gently by the people who show up.</p></div><div className="record-stage-data"><span>SHARED RECORD</span><b>Ready when it matters</b></div></article>
          </div>
        </section>

        <section className="field-map-section map-chapter" id="neighbourhood">
          <div className="field-section-heading field-heading-row"><div><span className="field-eyebrow">A shared memory of the street</span><h2>The map is not<br /><span>a dashboard.</span></h2></div><p>It is the place a neighbour’s sighting can become the next volunteer’s starting point. Open a record and see what a street has already told us.</p></div>
          <FieldMapPreview dogs={dogs} />
          <div className="field-map-footer"><p>Every marker opens a record. Every record can grow.</p><Link href="/map" className="field-button">Open the full map <ArrowUpRight size={18} /></Link></div>
          {dogs.length > 0 && <div className="field-dogs" aria-label="Recently recorded animals">{dogs.slice(0,4).map(dog => <Link href={`/dog/${dog.id}`} key={dog.id}><Image src={dog.cover_photo} alt={dogLabel(dog)} width={72} height={72} unoptimized /><div><b>{dogLabel(dog)}</b><span>{dog.zone || "Location in record"}</span></div><ArrowUpRight size={16}/></Link>)}</div>}
        </section>

        <section className="field-section field-team">
          <div className="field-team-copy"><span className="field-eyebrow">For the people doing the work</span><h2>Good care takes people.<br /><span>And a shared record.</span></h2><p>An animal register, incoming reports and care history, in one place. For the field visit, the team handover, and the next person trying to help.</p><Link href="/partner" className="field-button field-button-dark">Explore the NGO workspace <ArrowUpRight size={18} /></Link><Link href="/join" className="field-inline-link">Have a team code? Join here <ArrowRight size={16} /></Link></div>
          <div className="field-workspace-example">
            <div className="field-example-top"><span>STRAYPAW / FIELD WORKSPACE</span><span>Illustrative record</span></div>
            <div className="field-example-animal"><Image src="https://toujthlzjmhmoyykmayx.supabase.co/storage/v1/object/public/sightings/2026-08-23/c21e9833-6058-48a6-91ee-7f278219c75c.jpeg" width={84} height={84} alt="Pinky from the StrayPaw community" /><div><span>One animal. Shared context.</span><h3>A record you can return to.</h3></div></div>
            <div className="field-record-tabs"><span>Overview</span><span>Care history</span><span>Photos</span></div>
            <ol className="field-care-example"><li><div><b>A sighting is added</b><span>Photo, place and observation</span></div><span>01</span></li><li><div><b>The team reviews it</b><span>A person takes responsibility</span></div><span>02</span></li><li><div><b>Care is recorded</b><span>What happened, when and by whom</span></div><span>03</span></li></ol>
            <p className="field-example-note"><Check size={15}/> One history, ready for the next visit.</p>
          </div>
        </section>
        <section className="field-closing"><span className="field-eyebrow">Your neighbourhood is a good place to begin</span><h2>Know one dog?<br /><span>Start there.</span></h2><div className="field-actions"><Link href="/map" className="field-button">Take a look around <ArrowUpRight size={18}/></Link><Link href="/report" className="field-text-link">Add a sighting <Plus size={18}/></Link></div></section>
      </main>
      <footer className="field-footer"><Link href="/" className="field-footer-brand">StrayPaw<span>They live here, too.</span></Link><nav aria-label="Footer"><Link href="/mission">Our mission</Link><Link href="/for-ngos">For NGOs</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><span>Built with care, in India.<br />© {new Date().getFullYear()} StrayPaw</span></footer>
    </div>
  );
}
