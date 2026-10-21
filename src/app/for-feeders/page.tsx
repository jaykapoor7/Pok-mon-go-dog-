import Link from "next/link";
import { AudiencePage, AudienceSection } from "@/components/production/AudiencePage";
import { PublicRecord } from "@/components/production/PublicRecord";
export const revalidate=300;
export const metadata={title:"For feeders, StrayPaw",description:"Find the animals you know, add sightings and keep observations connected to their history."};
export default function FeedersPage(){return <AudiencePage audience="Feeders" title="Know the animals you see again." intro="Keep sightings and observations connected to the same animal, so the next person has a place to start." cta="Find your animals" href="/explore" seed={3}>
 <AudienceSection title="Add to a continuing record."><ol className="audience-workflow"><li><b>Look for an existing profile.</b><span>Search by place or StrayPaw ID. Compare the photograph and recorded details.</span></li><li><b>Record a sighting.</b><span>Choose “I saw this animal” on its profile and describe what you observed.</span></li><li><b>Report a concern.</b><span>Add a new observation through the reporting flow; an organisation may review it.</span></li></ol><p>Existing <Link href="/community/feeding">feeding-place records</Link> are also accessible in the app. StrayPaw does not infer feeding, vaccination or treatment from a sighting.</p></AudienceSection>
 <AudienceSection title="Recognition starts here."><PublicRecord/></AudienceSection>
 </AudiencePage>;}
