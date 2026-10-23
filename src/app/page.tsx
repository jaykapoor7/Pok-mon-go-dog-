import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { SiteHeader, StrayPawMark } from "@/components/site/SiteHeader";
import { FooterIndex } from "@/components/site/FooterIndex";
import { HeroPlate } from "@/components/landing/HeroPlate";
import { CaseDive } from "@/components/landing/CaseDive";
import { HeroTally } from "@/components/landing/HeroTally";
import { AnimalRegister } from "@/components/landing/AnimalRegister";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { getLandingStory } from "@/lib/landing/story";
import { getDogsTreated, getRegisterTotals } from "@/lib/register/totals";
import { ReportThread } from "@/components/landing/ReportThread";
import { BotGroups } from "@/components/landing/BotGroups";
import { sxSerif } from "@/components/shell/fonts";
import caseArchive from "@/data/landing-case-archive.json";
import areaArchive from "@/data/landing-area-archive.json";
import registerArchive from "@/data/landing-register-archive.json";
import "@/components/site/site.css";
import "@/components/site/field-site.css";
import "@/components/world/home.css";
import "@/components/request/chain.css";
import "@/components/landing/landing.css";
import "@/components/production/production.css";
import "@/components/landing/restored-landing.css";

export const revalidate = 300;
export const metadata = {title:"StrayPaw. Every street animal on the record.",description:"One shared record connecting sightings, field work and outcomes for India’s street animals."};
const FAQ=[
 ["Is StrayPaw free to use?","Yes for residents, community reporters and animal lookups: no account, no fee. Institutional programmes for NGOs and municipalities are scoped and priced separately; contact us for organisation access."],
 ["What happens after a report?","A report is checked before publication. Organisations can review and choose whether to accept it. Reporting does not guarantee rescue, treatment or a response time."],
 ["How can an NGO participate?","Apply for an organisation workspace. After verification, your team can review requests, assign cases, import records and record care and follow-ups."],
 ["Can I report through WhatsApp? What does it cost?","Reporting on WhatsApp is free for residents and community reporters: message the StrayPaw bot with a photo and your location, no fee. The NGO group bot (filing reports a team posts, animal lookup, drive counts and the morning due list in your team's WhatsApp group) is a paid subscription for organisations, billed monthly by usage. Contact StrayPaw to connect your NGO."],
 ["How does a municipality or institution start?","Send your city, programme, available records and goals. We agree scope, responsibilities, deliverables, duration and fees before work begins."],
];
export default async function HomePage(){
 const [story,totals,treated]=await Promise.all([getLandingStory().catch(()=>null),getRegisterTotals().catch(()=>null),getDogsTreated().catch(()=>null)]);
 const hero=story?.hero??caseArchive.hero;
 const box:[number,number,number,number]=[hero.box[0],hero.box[1],hero.box[2],hero.box[3]];
 const liveAreas=story?.desk.cells??[];
 const areas=liveAreas.length?liveAreas.map(c=>({ring:c.ring,open:c.open,crit:c.crit,name:c.name})):areaArchive.areas;
 return <div className={`sp field-site product-site ld sw restored-landing ${sxSerif.variable}`}>
  <PageView name="landing_view"/><LandingMotion/><SiteHeader overlay/>
  <main>
   <section id="world" className="ld-hero" aria-labelledby="hero-title"><div className="ld-stage">
    <HeroPlate city={hero.city} box={box} rings={hero.rings} events={hero.events}/>
    <div className="ld-hero-copy"><h1 id="hero-title">Every stray animal in India.<em>Seen. Tracked. Cared&nbsp;for.</em></h1>
     <p className="ld-hero-sub">One shared record for every sighting, case and outcome.</p>
     {totals&&totals.animals>0&&<HeroTally animals={totals.animals} treated={treated} cities={totals.cities}/>}
     <div className="ld-hero-actions"><Link href="/community/report" className="sw-btn is-flame">Report a sighting<ArrowUpRight size={18} aria-hidden/></Link><Link href="/explore" className="sw-btn is-paper">Explore the Map<ArrowUpRight size={15} aria-hidden/></Link></div>
     {!story&&<p className="ld-hero-source">Coimbatore public record · captured 20 October 2026</p>}
    </div></div></section>
   <AnimalRegister data={registerArchive.data} total={registerArchive.data.total} archived/>
   <ReportThread areas={areas} city={liveAreas.length?hero.city:areaArchive.city} recordedAt={liveAreas.length?undefined:"20 Oct 2026"}/>
   <BotGroups/>
   <CaseDive j={story?.journey??caseArchive.journey} city={story?.journey?hero.city:caseArchive.hero.city} box={story?.journey?box:[caseArchive.hero.box[0],caseArchive.hero.box[1],caseArchive.hero.box[2],caseArchive.hero.box[3]]} rings={story?.journey?hero.rings:caseArchive.hero.rings} events={story?.journey?hero.events:caseArchive.hero.events}/>
   <section className="lx-faq" aria-labelledby="faq-title"><div className="lx-faq-in">
    <div className="lx-faq-intro"><h2 id="faq-title">A few things to know.</h2><Link href="/contact">Ask us something else<ArrowUpRight size={16} aria-hidden/></Link></div>
    <div className="lx-faq-list">{FAQ.map(([q,a])=><details key={q}><summary><span>{q}</span><i aria-hidden/></summary><p>{a}</p></details>)}</div>
   </div></section>
  </main>
  <footer className="lx-end" aria-labelledby="lx-end-title">
   <div className="lx-end-in">
    <div className="lx-end-cta">
     <h2 id="lx-end-title">See a dog? <em>Report it.</em></h2>
     <p>A photo, a place and what you saw. It stays on the record for the next person who looks.</p>
     <div className="lx-end-actions"><Link href="/community/report" className="lx-btn is-flame">Report a sighting<ArrowUpRight size={18} aria-hidden/></Link><Link href="/explore" className="lx-btn is-line">Explore the map<ArrowUpRight size={16} aria-hidden/></Link></div>
    </div>
    <div className="lx-end-foot">
     <Link href="/" className="lx-end-brand"><StrayPawMark size={30}/><span>StrayPaw<small>From sighting to outcome. One shared record.</small></span></Link>
     <FooterIndex simple/>
    </div>
    <p className="lx-end-base"><span>© {new Date().getFullYear()} StrayPaw</span><span>Built with care, in India.</span></p>
   </div>
  </footer>
 </div>;
}
