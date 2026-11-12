import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Block, CloseInvite, PageHead, S4Page } from "@/sp4/site/kit";
import { KIND_HOUR_MATERIALS } from "@/lib/platform/education";
export const metadata={title:"Education, StrayPaw",description:"Credited learning materials, workshop guidance and real local records for teaching safe coexistence."};
export default function EducationPage(){return <S4Page close={<CloseInvite />}>
 <PageHead title="Learn, teach and share." lede="Bring credited teaching materials and real local animal records into a classroom, club or community session." actions={<Link className="s4-btn is-primary" href="/learn/resources">Open learning resources <ArrowRight size={17} aria-hidden /></Link>} />
 <Block title="Choose a resource for the room."><p>Materials from The Kind Hour Foundation are available with their source credit. Choose for age and context; review sensitive content before sharing.</p><ul className="s4-items">{KIND_HOUR_MATERIALS.map(m=><li key={m.id}><h3>{m.title}</h3><p>{m.purpose}</p><small>{m.audience} · {m.languages}</small></li>)}</ul><div className="s4-links"><Link href="/learn/resources">Read the original materials</Link><Link href="/learn/courses">Browse lessons</Link></div></Block>
 <Block title="Connect learning to a place."><p>Open the map and ask what is known nearby. Explore an animal’s history, discuss safe reporting and look for what the record cannot yet say.</p><div className="s4-links"><Link href="/explore">Explore local records</Link><Link href="/learn/playground">Interactive learning</Link><Link href="/learn/workshops">Workshop guidance</Link><Link href="/contact?subject=Education%20session">Discuss a session</Link></div><p className="s4-small">Crediting a resource does not imply a commercial partnership or a scheduled workshop.</p></Block>
 </S4Page>;}
