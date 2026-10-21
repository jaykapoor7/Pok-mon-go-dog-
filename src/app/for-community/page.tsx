import Link from "next/link";
import { AudiencePage, AudienceSection } from "@/components/production/AudiencePage";
import { PublicRecord } from "@/components/production/PublicRecord";
export const revalidate=300;
export const metadata={title:"Community, StrayPaw",description:"Report street animals, find shared animal histories and follow recorded updates."};
export default function CommunityPage(){return <AudiencePage audience="Community" title="Your observation can continue a story." intro="Report an animal, find its history and follow what gets recorded next." cta="Report an animal" href="/community/report">
 <AudienceSection title="Start with what you see."><ol className="audience-workflow"><li><b>Find the animal.</b><span><Link href="/explore">Search the map</Link> for a known record before creating another.</span></li><li><b>Add an observation.</b><span>Use a photo, an area and a description. Your contact details remain private.</span></li><li><b>Follow the record.</b><span>Open the animal’s history for sightings and care updates as contributors add them.</span></li></ol><p>Reports are checked before publication. Teams choose whether to accept requests; rescue and treatment are not guaranteed. For an emergency, contact local veterinary or rescue services directly.</p></AudienceSection>
 <AudienceSection title="An animal, beyond one report."><PublicRecord/></AudienceSection>
 </AudiencePage>;}
