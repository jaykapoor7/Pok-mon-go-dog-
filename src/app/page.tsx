import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getLandingStory } from "@/lib/landing/story";
import { getRegisterTotals } from "@/lib/register/totals";
import { sxSerif } from "@/components/shell/fonts";
import { Stage } from "@/components/bindu/stage";
import { WORK_IMAGES } from "@/lib/art/sources";
import { Chain } from "@/components/request/OriginalRequest";
import { CaseDive } from "@/components/landing/CaseDive";
import caseArchive from "@/data/landing-case-archive.json";
import registerArchive from "@/data/landing-register-archive.json";
import fieldPartners from "@/data/field-partners.json";
import { AnimalRegister } from "@/components/landing/AnimalRegister";
import { Ecosystem } from "@/components/production/Ecosystem";
import "@/components/site/site.css";
import "@/components/world/home.css";
import "@/components/world/world.css";
import "@/components/request/chain.css";
import "@/components/landing/landing.css";
import "@/components/production/production.css";
export const revalidate = 300;
export const metadata = { title:"StrayPaw | Street-animal care, connected.", description:"StrayPaw connects community reports, animal histories, and care teams through one shared map and workspace." };
const f=(n:number)=>n.toLocaleString("en-IN");
const FAQ=[
 ["Is StrayPaw free to use?","Public animal discovery and community reporting are available without a subscription. Institutional programmes are scoped and priced separately; contact us for organisation access."],
 ["What happens after a report?","A report is checked before publication. Organisations can review and choose whether to accept it. Reporting does not guarantee rescue, treatment or a response time."],
 ["How can an NGO participate?","Apply for an organisation workspace. After verification, your team can review requests, assign cases, import records and record care and follow-ups."],
 ["Can I report through WhatsApp? What does it cost?","WhatsApp reporting is available through CareOS. Contact StrayPaw for the reporting channel or to connect your team. Setup and costs are confirmed for your organisation; web reporting is also available."],
 ["How does an institution request a pilot?","Send your city, programme, available records and goals through Request a Pilot. We agree scope, responsibilities, deliverables, duration and fees before work begins."],
];
export default async function HomePage(){
 const [story,totals]=await Promise.all([getLandingStory().catch(()=>null),getRegisterTotals().catch(()=>null)]);
 const areas=(story?.desk.cells??[]).map(c=>({ring:c.ring,open:c.open,crit:c.crit,name:c.name}));
 // Retain the previously published case history when the live service cannot be read.
 const caseHero=story?.journey?story.hero:caseArchive.hero;
 const caseBox:[number,number,number,number]=[caseHero.box[0],caseHero.box[1],caseHero.box[2],caseHero.box[3]];
 const animal=registerArchive.data.cards[0];
 return <div className={`sp sw production ${sxSerif.variable}`}><PageView name="landing_view"/><SiteHeader/><main>
  <section id="world" className="w1 production-hero production-hero-static" aria-label="Street-animal care, connected"><div className="bs-frame">
   <div className="production-hero-art"><div className="wd" aria-hidden="true"><div className="wd-art">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={WORK_IMAGES.palamporeTree.src} width={WORK_IMAGES.palamporeTree.w} height={WORK_IMAGES.palamporeTree.h} alt="" fetchPriority="high" decoding="async"/></div></div><Link className="hero-art-credit" href="/art-credits">Coromandel palampore · The Met · CC0</Link>
    <Link className="hero-record" href={`/animal/${animal.id}`}>
     <span className="hero-record-top"><span>StrayPaw · animal record</span><ArrowUpRight size={18} aria-hidden/></span>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={animal.cover_photo} width={460} height={360} alt={`Street dog in ${animal.city}, from the public record`} fetchPriority="high"/>
     <span className="hero-record-bottom"><b>{animal.straypaw_id}</b><span>{animal.city}</span></span>
    </Link><span className="hero-record-stamp" aria-hidden>Seen.<br/>Recorded.<br/>Connected.</span>
   </div>
   <div className="production-hero-copy"><span className="hero-eyebrow">Reports → records → coordinated care</span><h1>Street-animal care, connected.</h1><p>StrayPaw connects community reports, animal histories, and care teams through one shared map and workspace.</p><div className="sw-acts"><Link href="/explore" className="sw-btn is-paper">Explore the Map <ArrowUpRight size={18} aria-hidden/></Link><Link href="/contact?subject=Request%20a%20Pilot" className="sw-btn is-flame hero-pilot">Request a Pilot</Link></div>
    {totals&&totals.animals>0&&<p className="hero-proof"><b>{f(totals.animals)}</b> animal records · <b>{f(totals.cases)}</b> requests for help · <b>{f(totals.cities)}</b> cities<small>Including historical imports. Records are not a census; requests are not rescue outcomes.</small></p>}
   </div>
  </div></section>
  <AnimalRegister data={registerArchive.data} total={registerArchive.data.total} archived/>
  <Stage id="one-request" className="w2 production-request" screens={2.8} label="One report. A connected record."><Chain areas={areas} city={story?.hero.city??"Public record"}/></Stage>
  <CaseDive j={story?.journey??caseArchive.journey} city={caseHero.city} box={caseBox} rings={caseHero.rings} events={caseHero.events}/>
  <section className="production-section ecosystem-section" id="ecosystem" aria-labelledby="ecosystem-title"><header className="section-intro"><div><h2 id="ecosystem-title">Better together.</h2><p>Different roles. One continuing record.</p></div></header><Ecosystem animal={animal} partners={fieldPartners.organisations}/></section>
  <div className="production-faq" aria-labelledby="faq-title"><div className="faq-intro"><span className="faq-kicker">Before you begin</span><h2 id="faq-title">A few things<br/><em>to know.</em></h2><p>Clear answers. A useful next step.</p><Link href="/contact">Ask us something else <ArrowUpRight size={17} aria-hidden/></Link><svg className="faq-asterisk" viewBox="0 0 100 100" aria-hidden><path d="M50 8V92M8 50H92M20 20L80 80M20 80L80 20" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round"/></svg></div><div className="faq-ledger">{FAQ.map(([q,a],i)=><details key={q}><summary><span className="faq-number">0{i+1}</span><span>{q}</span><i aria-hidden/></summary><p>{a}</p></details>)}</div></div>
  <div className="production-close"><span className="closing-index" aria-hidden>↗</span><h2>Make care easier<br/><em>to coordinate.</em></h2><Link href="/contact?subject=Work%20With%20Us" className="closing-action">Work With Us <ArrowUpRight size={24} aria-hidden/></Link></div>
 </main><SiteFooter/></div>;
}
