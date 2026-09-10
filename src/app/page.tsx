import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin, Check, Plus } from "lucide-react";
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

const STEPS = [
  { number: "01", title: "Notice someone.", body: "A familiar face on your street. An animal you are worried about. Start with what you can see." },
  { number: "02", title: "Put them on the map.", body: "Add a photo, a place and a few details. Leave anything you are unsure about as unknown." },
  { number: "03", title: "Keep their story together.", body: "Sightings, care and follow-ups stay connected, so the next person has somewhere to begin." },
];

export default async function HomePage() {
  const dogs = await getShowcaseDogs(8);
  return (
    <div className="sp field-site">
      <PageView name="landing_view" />
      <LandingMotion />
      <SiteHeader />
      <main>
        <Hero />
        <div className="field-intro-strip"><span>Care starts close to home.</span><p>For the neighbour who notices. The volunteer who returns. The team that follows up.</p><Link href="/why-straypaw">Why we’re building this <ArrowUpRight size={16} /></Link></div>

        <section className="field-map-section" id="neighbourhood">
          <div className="field-section-heading field-heading-row"><div><span className="field-eyebrow">The map is where it begins</span><h2>Your street.<br /><span>A little better known.</span></h2></div><p>Look around. Open an animal’s record. See what neighbours have noticed and what care has been recorded.</p></div>
          <FieldMapPreview dogs={dogs} />
          <div className="field-map-footer"><p>Every marker opens a record. Every record can grow.</p><Link href="/map" className="field-button">Open the full map <ArrowUpRight size={18} /></Link></div>
          {dogs.length > 0 && <div className="field-dogs" aria-label="Recently recorded animals">{dogs.slice(0,4).map(dog => <Link href={`/dog/${dog.id}`} key={dog.id}><Image src={dog.cover_photo} alt={dogLabel(dog)} width={72} height={72} unoptimized /><div><b>{dogLabel(dog)}</b><span>{dog.zone || "Location in record"}</span></div><ArrowUpRight size={16}/></Link>)}</div>}
        </section>

        <section className="field-section field-how" id="how">
          <div className="field-section-heading"><span className="field-eyebrow">Meet Pinky. Then meet your neighbours.</span><h2>A familiar face.<br /><span>Not a forgotten one.</span></h2></div>
          <div className="field-how-grid">
            <div className="field-photo-story">
              <Image src="https://toujthlzjmhmoyykmayx.supabase.co/storage/v1/object/public/sightings/2026-08-23/c21e9833-6058-48a6-91ee-7f278219c75c.jpeg" alt="Pinky enjoying the sunshine in Bengaluru" width={756} height={1344} sizes="(max-width: 760px) 85vw, 35vw" />
              <div className="field-photo-label"><MapPin size={15} /><span>Pinky, Bengaluru.<br /><b>A familiar face from the community.</b></span></div>
              <Link className="field-photo-index" href="/dog/e1de4c0b-ef56-469a-a05b-ab720da42939">Open Pinky’s record <ArrowUpRight size={16}/></Link>
            </div>
            <div className="field-steps">
              {STEPS.map((step) => <article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></article>)}
              <Link href="/report" className="field-inline-link">Make your first report <ArrowRight size={18} /></Link>
            </div>
          </div>
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


        <section className="field-section field-more">
          <div><span className="field-eyebrow">Care reaches further together</span><h2>There’s a place<br /><span>for your part.</span></h2><p>Start where your time, experience or resources can help.</p></div>
          <div className="field-paths">{[
            { n:"01", title:"Lend a hand nearby", body:"Find animal-welfare organisations and ways to get involved.", href:"/get-involved" },
            { n:"02", title:"Plan work that matters", body:"Explore published coverage, unanswered questions and programme costs.", href:"/what-would-it-take" },
            { n:"03", title:"Understand the evidence", body:"See where our figures come from and what they can tell us.", href:"/the-data" },
          ].map(item=><Link href={item.href} key={item.n}><span>{item.n}</span><div><h3>{item.title}</h3><p>{item.body}</p></div><ArrowUpRight size={22}/></Link>)}</div>
        </section>

        <section className="field-closing"><span className="field-eyebrow">Your neighbourhood is a good place to begin</span><h2>Know one dog?<br /><span>Start there.</span></h2><div className="field-actions"><Link href="/map" className="field-button">Take a look around <ArrowUpRight size={18}/></Link><Link href="/report" className="field-text-link">Add a sighting <Plus size={18}/></Link></div></section>
      </main>
      <footer className="field-footer"><Link href="/" className="field-footer-brand">StrayPaw<span>They live here, too.</span></Link><nav aria-label="Footer"><Link href="/mission">Our mission</Link><Link href="/for-ngos">For NGOs</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><span>Built with care, in India.<br />© {new Date().getFullYear()} StrayPaw</span></footer>
    </div>
  );
}
