import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FooterIndex } from "@/components/site/FooterIndex";
import { ScaleGlyph } from "@/components/landing/ScaleGlyph";
import { HeroPlate } from "@/components/landing/HeroPlate";
import { CaseDive } from "@/components/landing/CaseDive";
import { HeroTally } from "@/components/landing/HeroTally";
import { AnimalRegister } from "@/components/landing/AnimalRegister";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { getLandingStory } from "@/lib/landing/story";
import { getRegisterTotals } from "@/lib/register/totals";
import { Stage } from "@/components/bindu/stage";
import { Chain } from "@/components/request/OriginalRequest";
import { sxSerif } from "@/components/shell/fonts";
import caseArchive from "@/data/landing-case-archive.json";
import areaArchive from "@/data/landing-area-archive.json";
import registerArchive from "@/data/landing-register-archive.json";
import fieldPartners from "@/data/field-partners.json";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/world/home.css";
import "@/components/request/chain.css";
import "@/components/landing/landing.css";
import "@/components/production/production.css";
import "@/components/landing/restored-landing.css";

export const revalidate = 300;
export const metadata = {title:"StrayPaw. Every street animal on the record.",description:"One shared record connecting sightings, field work and outcomes for India’s street animals."};
const LEVELS = [
 {level:"street",scale:"Community",who:"Residents",does:"Report what you see. Follow recorded updates.",action:"Report an animal",href:"/community/report"},
 {level:"field",scale:"NGO",who:"NGOs & Rescues",does:"Run cases, field work and care in one place.",action:"Open NGO workspace",href:"/ngo"},
 {level:"city",scale:"Municipality",who:"Municipalities",does:"Read programme geography, records and the gaps.",action:"Request a Pilot",href:"/contact?subject=Request%20a%20Pilot"},
 {level:"street",scale:"Daily care",who:"Feeders",does:"Find familiar animals. Add sightings to their history.",action:"Find your animals",href:"/explore"},
 {level:"field",scale:"Contribute",who:"Freelancers & volunteers",does:"Contribute observations and join a verified organisation’s fieldwork.",action:"Get involved",href:"/for-community"},
 {level:"city",scale:"Education",who:"Educators & students",does:"Learn, teach and share credited materials.",action:"Open learning materials",href:"/learn/resources"},
] as const;
const FAQ=[
 ["Is StrayPaw free to use?","Public animal discovery and community reporting are available without a subscription. Institutional programmes are scoped and priced separately; contact us for organisation access."],
 ["What happens after a report?","A report is checked before publication. Organisations can review and choose whether to accept it. Reporting does not guarantee rescue, treatment or a response time."],
 ["How can an NGO participate?","Apply for an organisation workspace. After verification, your team can review requests, assign cases, import records and record care and follow-ups."],
 ["Can I report through WhatsApp? What does it cost?","WhatsApp reporting is available through CareOS. Contact StrayPaw for the reporting channel or to connect your team. Setup and costs are confirmed for your organisation; web reporting is also available."],
 ["How does an institution request a pilot?","Send your city, programme, available records and goals through Request a Pilot. We agree scope, responsibilities, deliverables, duration and fees before work begins."],
];
export default async function HomePage(){
 const [story,totals]=await Promise.all([getLandingStory().catch(()=>null),getRegisterTotals().catch(()=>null)]);
 const hero=story?.hero??caseArchive.hero;
 const box:[number,number,number,number]=[hero.box[0],hero.box[1],hero.box[2],hero.box[3]];
 const liveAreas=story?.desk.cells??[];
 const areas=liveAreas.length?liveAreas.map(c=>({ring:c.ring,open:c.open,crit:c.crit,name:c.name})):areaArchive.areas;
 return <div className={`sp field-site product-site ld sw restored-landing ${sxSerif.variable}`}>
  <PageView name="landing_view"/><LandingMotion/><SiteHeader/>
  <main>
   <section id="world" className="ld-hero" aria-labelledby="hero-title"><div className="ld-stage">
    <HeroPlate city={hero.city} box={box} rings={hero.rings} events={hero.events}/>
    <div className="ld-hero-copy"><h1 id="hero-title">Every stray animal in India.<em>Seen. Tracked. Cared&nbsp;for.</em></h1>
     <p className="ld-hero-sub">One shared record for every sighting, case and outcome.</p>
     {totals&&totals.animals>0&&<HeroTally animals={totals.animals} cases={totals.cases} cities={totals.cities}/>}
     <div className="ld-hero-actions"><Link href="/community/report" className="sw-btn is-flame">Report a sighting<ArrowUpRight size={18} aria-hidden/></Link><Link href="/explore" className="sw-btn is-paper">Explore the Map<ArrowUpRight size={15} aria-hidden/></Link></div>
     {!story&&<p className="ld-hero-source">Coimbatore public record · captured 20 October 2026</p>}
    </div></div></section>
   <AnimalRegister data={registerArchive.data} total={registerArchive.data.total} archived/>
   <section className="production restored-whatsapp" aria-label="One report. A connected record."><Stage id="one-request" className="w2 production-request" screens={2.8} label="One report. A connected record."><Chain areas={areas} city={liveAreas.length?hero.city:areaArchive.city} recordedAt={liveAreas.length?undefined:"20 Oct 2026"}/></Stage></section>
   <CaseDive j={story?.journey??caseArchive.journey} city={story?.journey?hero.city:caseArchive.hero.city} box={story?.journey?box:[caseArchive.hero.box[0],caseArchive.hero.box[1],caseArchive.hero.box[2],caseArchive.hero.box[3]]} rings={story?.journey?hero.rings:caseArchive.hero.rings} events={story?.journey?hero.events:caseArchive.hero.events}/>
   <section id="ecosystem" className="ld-sec ld-sec-shell ld-audience" aria-labelledby="ld-audience-title"><div className="ld-scale">
    <header className="sys-head" data-ld-reveal="head"><p className="ld-section-kicker sys-mono">One record</p><h2 id="ld-audience-title">Every street. <em>Every scale.</em></h2></header>
    <ol className="ld-levels">{LEVELS.map((l,i)=><li key={l.who} data-ld-reveal="item" style={{["--i" as string]:i}}><Link href={l.href}><ScaleGlyph level={l.level}/><span className="ld-lv-text"><small>{l.scale}</small><b>{l.who}</b><span>{l.does}</span></span><span className="ld-lv-go">{l.action}<ArrowUpRight size={15} aria-hidden/></span></Link></li>)}</ol>
    <nav className="restored-partners" aria-label="NGO field partners"><h3>NGO field partners</h3>{fieldPartners.organisations.map(p=><Link key={p.id} href={`/community/organisations/${p.slug}`}>{p.name}</Link>)}</nav>
   </div></section>
   <section className="production restored-faq" aria-labelledby="faq-title"><div className="production-faq"><div className="faq-intro"><h2 id="faq-title">A few things to know.</h2><Link href="/contact">Ask us something else<ArrowUpRight size={17} aria-hidden/></Link></div><div className="production-faq-list">{FAQ.map(([q,a],i)=><details key={q}><summary><span className="faq-number">0{i+1}</span><span>{q}</span><i aria-hidden/></summary><p>{a}</p></details>)}</div></div></section>
   <section className="ld-close"><div className="ld-close-copy"><p className="sys-mono">Start with what you see</p><h2>See a dog? <em>Report it.</em></h2></div><div className="ld-close-action"><p><b>A photo. A place. What you see.</b><span>Keep the observation on the record.</span></p><Link href="/community/report" className="sw-btn is-flame">Report a sighting<ArrowUpRight size={18} aria-hidden/></Link></div></section>
  </main>
  <footer className="ld-foot"><div className="ld-foot-top"><Link href="/" className="ld-foot-brand">StrayPaw<span>From sighting to outcome. One shared record.</span></Link><FooterIndex/></div><p className="ld-foot-base"><span>© {new Date().getFullYear()} StrayPaw</span><span>Built with care, in India. <Link href="/art-credits">Art credits</Link></span></p></footer>
 </div>;
}
