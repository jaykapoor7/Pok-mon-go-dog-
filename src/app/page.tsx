import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getAnimalRegister, getLandingStory } from "@/lib/landing/story";
import { getMapCities } from "@/lib/livingmap/server";
import { getRegisterTotals } from "@/lib/register/totals";
import { sxSerif } from "@/components/shell/fonts";
import { Stage } from "@/components/bindu/stage";
import { WORK_IMAGES } from "@/lib/art/sources";
import { Chain } from "@/components/request/OriginalRequest";
import { CaseDive } from "@/components/landing/CaseDive";
import caseArchive from "@/data/landing-case-archive.json";
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
async function Stories(){const data=await getAnimalRegister().catch(()=>({total:0,cards:[]}));return <AnimalRegister data={data} total={data.total} />;}
export default async function HomePage(){
 const [story,cities,totals]=await Promise.all([getLandingStory().catch(()=>null),getMapCities().catch(()=>[]),getRegisterTotals().catch(()=>null)]);
 const areas=(story?.desk.cells??[]).map(c=>({ring:c.ring,open:c.open,crit:c.crit,name:c.name}));
 // Retain the previously published case history when the live service cannot be read.
 const caseHero=story?.journey?story.hero:caseArchive.hero;
 const caseBox:[number,number,number,number]=[caseHero.box[0],caseHero.box[1],caseHero.box[2],caseHero.box[3]];
 const city=cities.find(c=>c.city===story?.hero.city);
 const brief=city?{city:city.city,animals:city.animals,cells:city.cells,sterilised:city.sterilised,ster_unknown:city.ster_unknown,cases:city.cases}:null;
 const locs=Array.from(areas.reduce((m,a)=>{if(a.name)m.set(a.name,(m.get(a.name)??0)+a.open);return m;},new Map<string,number>()),([name,open])=>({name,open})).sort((a,b)=>b.open-a.open);
 return <div className={`sp sw production ${sxSerif.variable}`}><PageView name="landing_view"/><SiteHeader/><main>
  <section id="world" className="w1 production-hero production-hero-static" aria-label="Street-animal care, connected"><div className="bs-frame">
   <div className="production-hero-art"><div className="wd" aria-hidden="true"><div className="wd-art">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={WORK_IMAGES.palamporeTree.src} width={WORK_IMAGES.palamporeTree.w} height={WORK_IMAGES.palamporeTree.h} alt="" fetchPriority="high" decoding="async"/></div></div><Link className="hero-art-credit" href="/art-credits">Coromandel palampore · The Met · CC0</Link></div>
   <div className="production-hero-copy"><h1>Street-animal care, connected.</h1><p>StrayPaw connects community reports, animal histories, and care teams through one shared map and workspace.</p><div className="sw-acts"><Link href="/explore" className="sw-btn is-paper">Explore the Map <ArrowUpRight size={18} aria-hidden/></Link><Link href="/contact?subject=Request%20a%20Pilot" className="sw-btn hero-pilot">Request a Pilot</Link></div>
    {totals&&totals.animals>0?<p className="hero-proof"><b>{f(totals.animals)}</b> animal records · <b>{f(totals.cases)}</b> requests for help · <b>{f(totals.cities)}</b> cities<small>Including historical imports. Records are not a census; requests are not rescue outcomes. <Link href="/evidence">Sources & definitions</Link></small></p>:<p className="hero-proof">Explore the public animal record. <Link href="/evidence">Sources & definitions</Link></p>}
   </div>
  </div></section>
  <Suspense fallback={<section className="animal-stories-loading"><h2>Every animal has a story.</h2><p role="status">Reading photographed records…</p></section>}><Stories/></Suspense>
  <Stage id="one-request" className="w2 production-request" screens={2.8} label="One report. A connected record."><Chain areas={areas} city={story?.hero.city??"Public record"}/></Stage>
  <CaseDive j={story?.journey??caseArchive.journey} city={caseHero.city} box={caseBox} rings={caseHero.rings} events={caseHero.events} archived={!story?.journey} note={!story?.journey?"Archived public record, captured 20 October 2026. The dates and care are recorded; routes are illustrative.":undefined}/>
  <section className="production-section ecosystem-section" id="ecosystem" aria-labelledby="ecosystem-title"><header className="section-intro"><div><h2 id="ecosystem-title">Better together.</h2><p>Different roles. One continuing record.</p></div></header><Ecosystem queue={story?.desk.queue??[]} brief={brief} locs={locs} story={story}/></section>
  <div className="production-faq" aria-labelledby="faq-title"><h2 id="faq-title">A few things to know.</h2><div>{FAQ.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div>
  <div className="production-close"><h2>Make care easier to coordinate.</h2><div className="sw-acts"><Link href="/app?choose=1" className="sw-btn is-flame">Open App <ArrowUpRight size={18} aria-hidden/></Link><Link href="/contact?subject=Work%20With%20Us" className="sw-btn is-paper">Work With Us</Link></div></div>
 </main><SiteFooter/></div>;
}
