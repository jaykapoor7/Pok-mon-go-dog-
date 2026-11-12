import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Block, CloseInvite, PageHead, S4Page } from "@/sp4/site/kit";
import { PublicRecord } from "@/components/production/PublicRecord";
export const revalidate=300;
export const metadata={title:"Community, StrayPaw",description:"Report street animals, find shared animal histories and follow recorded updates."};
export default function CommunityPage(){return <S4Page close={<CloseInvite />}>
 <PageHead title="Your observation can continue a story." lede="Report an animal, find its history and follow what gets recorded next." actions={<Link className="s4-btn is-primary" href="/community/report">Report an animal <ArrowRight size={17} aria-hidden /></Link>} />
 <Block title="Start with what you see."><ol className="s4-defs"><li><b>Find the animal.</b><span><Link href="/explore">Search the map</Link> for a known record before creating another.</span></li><li><b>Add an observation.</b><span>Use a photo, an area and a description. Your contact details remain private.</span></li><li><b>Follow the record.</b><span>Open the animal’s history for sightings and care updates as contributors add them.</span></li></ol><p>Reports are checked before publication. Teams choose whether to accept requests; rescue and treatment are not guaranteed. For an emergency, contact local veterinary or rescue services directly.</p></Block>
 <Block title="What happens to a report."><ol className="s4-defs"><li><b>It is checked.</b><span>Reports are reviewed before they appear, and a photo that may show an injury starts blurred.</span></li><li><b>It reaches the right people.</b><span>Organisations working in that area see it in their inbox and decide whether they can take it on.</span></li><li><b>It joins the animal’s record.</b><span>If the animal is already known, your observation is added to its history instead of starting a second record.</span></li></ol></Block>
 <Block title="Keep your reports with you."><ol className="s4-defs"><li><b>No account needed to report.</b><span>You can report and look around without signing in.</span></li><li><b>Free, with just your email.</b><span>At <Link href="/sign-in">Sign in</Link>, enter your email and we send a six-character code. Your reports then follow you to any phone.</span></li><li><b>Your details stay private.</b><span>Your name and contact are never shown on the public map, and exact locations are shown only as areas.</span></li></ol></Block>
 <Block title="An animal, beyond one report."><PublicRecord/></Block>
 </S4Page>;}
