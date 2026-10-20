"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SoftwarePreview, type Queue, type CityBrief, type Loc } from "@/components/ecosystem/Commons";
import { RecordMap } from "@/components/marketing/RecordMap";
import type { LandingStory } from "@/lib/landing/story";
const PEOPLE = [
 { name:"Community", title:"A place for what you see.", text:"Report an animal, discover its record and follow recorded updates after review.", href:"/for-community", cta:"For the community", kind:"res" },
 { name:"NGOs & Rescues", title:"Keep the next step clear.", text:"Review requests, assign cases and keep care, follow-ups and animal histories together.", href:"/for-ngos", cta:"For care teams", kind:"ngo" },
 { name:"Municipalities", title:"See the programme through its records.", text:"Compare recorded sterilisation, vaccination and requests by area, with gaps and unknowns in view.", href:"/for-governments", cta:"For institutions", kind:"city" },
 { name:"Feeders", title:"Know the animals you see again.", text:"Find an existing profile, add a sighting and contribute observations to its continuing record.", href:"/for-feeders", cta:"For feeders", kind:"feed" },
 { name:"Education", title:"Bring the record into the room.", text:"Use credited learning materials and local animal records to teach safe, informed coexistence.", href:"/education", cta:"For educators", kind:"learn" },
];
export function Ecosystem({ queue, brief, locs, story }: {queue:Queue;brief:CityBrief;locs:Loc[];story:LandingStory|null}) {
 const [active,setActive]=useState(1); const tabs=useRef<(HTMLButtonElement|null)[]>([]); const p=PEOPLE[active];
 function key(e:KeyboardEvent,i:number) { const n=e.key==="ArrowRight"?(i+1)%5:e.key==="ArrowLeft"?(i+4)%5:e.key==="Home"?0:e.key==="End"?4:-1; if(n<0)return; e.preventDefault();setActive(n);tabs.current[n]?.focus(); }
 return <div className="ecosystem-product">
  <div className="eco-people" role="tablist" aria-label="One connected ecosystem">{PEOPLE.map((p,i)=><button type="button" role="tab" key={p.name} ref={el=>{tabs.current[i]=el;}} id={`people-${i}`} aria-selected={i===active} aria-controls="people-panel" tabIndex={i===active?0:-1} onClick={()=>setActive(i)} onKeyDown={e=>key(e,i)}><span>{p.name}</span><i aria-hidden /></button>)}</div>
  <div className="eco-view" id="people-panel" role="tabpanel" tabIndex={0} aria-labelledby={`people-${active}`}>
   <div className="eco-copy"><h3>{p.title}</h3><p>{p.text}</p><Link href={p.href}>{p.cta} <ArrowUpRight size={16} aria-hidden /></Link></div>
   {p.kind==="feed"?<div className="eco-record"><h4>A continuing animal history</h4><ol><li>Find the animal in the map or search.</li><li>Open its profile and choose “I saw this animal”.</li><li>Add your observation for review.</li></ol><Link href="/explore">Find an animal</Link><p>Locations remain generalised. Reporting does not guarantee a response.</p></div>:p.kind==="learn"?<div className="eco-record"><h4>Learn, teach and share</h4><nav aria-label="Education tools"><Link href="/learn/resources">Credited teaching materials</Link><Link href="/learn/workshops">Workshop guidance</Link><Link href="/learn/playground">Interactive learning</Link></nav><p>Choose materials for the group’s age and context. Review sensitive content before a session.</p></div>:<SoftwarePreview kind={p.kind} queue={queue} brief={brief} locs={locs} place={brief?.city} />}
  </div>
  <div className="eco-institutions"><div><h3>Municipal & veterinary programmes</h3><p>Review recorded vaccination, sterilisation and treatment alongside programme geography and field activity.</p><Link href="/for-governments#pilot">Discuss a paid pilot <ArrowUpRight size={15} aria-hidden /></Link></div><div><h3>WhatsApp / CareOS</h3><p>Report through WhatsApp and coordinate the next step in CareOS. Contact us to connect your organisation and confirm setup and costs.</p><Link href="/contact?subject=WhatsApp%20CareOS%20access">Get WhatsApp access <ArrowUpRight size={15} aria-hidden /></Link></div></div>
  {story && <div className="eco-source-map"><RecordMap story={story} /><p>One public record underpins the map and these views. Imported history is distinct from current field work. <Link href="/evidence">Read the evidence</Link>.</p></div>}
 </div>;
}
