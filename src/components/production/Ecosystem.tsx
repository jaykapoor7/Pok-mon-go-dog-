"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { RegisterFocus } from "@/lib/landing/story";

const PEOPLE = [
 { name:"Community", title:"Start with what you see.", text:"A photograph, a place and an observation give the next person something to work from.", href:"/for-community", entry:"/community/report", cta:"Report an animal", sheet:"An observation", steps:[{title:"Report",text:"Add a photograph, location and what you saw.",href:"/community/report"},{title:"Discover",text:"Find an animal and open its existing record.",href:"/explore"},{title:"Follow",text:"See recorded updates on the animal’s profile.",href:"/community"}] },
 { name:"NGOs & Rescues", title:"Keep the next step clear.", text:"Move between the work, the animal and the place. Care stays attached to the record.", href:"/for-ngos", entry:"/ngo", cta:"Open NGO workspace", sheet:"The work ahead", steps:[{title:"Work",text:"Review intake, accept cases and assign a team member.",href:"/ngo"},{title:"Animals",text:"Find histories, import records and add care entries.",href:"/ngo/animals"},{title:"Map",text:"Locate fieldwork and inspect the record by area.",href:"/ngo/map"}] },
 { name:"Municipalities", title:"Read the programme, area by area.", text:"Bring programme geography, animal records and veterinary care into the same conversation.", href:"/for-governments", entry:"/contact?subject=Request%20a%20Pilot", cta:"Request a Pilot", sheet:"The programme record", steps:[{title:"Explore coverage",text:"Read recorded care by city and locality, with unknowns visible.",href:"/explore"},{title:"Plan with vets",text:"Scope vaccination, sterilisation and treatment record workflows.",href:"/for-governments"},{title:"Define a paid pilot",text:"Agree geography, records, responsibilities, reporting and fees.",href:"/for-governments#pilot"}] },
 { name:"Feeders", title:"Know the animals you see again.", text:"Make the everyday observation useful to the next feeder, field team or vet.", href:"/for-feeders", entry:"/explore", cta:"Find your animals", sheet:"The familiar faces", steps:[{title:"Identify",text:"Search the map and check the animal’s photograph and tag.",href:"/explore"},{title:"Add a sighting",text:"Open the profile and choose “I saw this animal”.",href:"/explore"},{title:"Report a concern",text:"Add what changed for review by a care team.",href:"/community/report"}] },
 { name:"Education", title:"Take the record into the room.", text:"Use local observations to make coexistence practical, understandable and teachable.", href:"/education", entry:"/learn/resources", cta:"Open learning materials", sheet:"The learning notebook", steps:[{title:"Learn",text:"Credited teaching materials for safe, informed coexistence.",href:"/learn/resources"},{title:"Teach",text:"Workshop guidance for your group and setting.",href:"/learn/workshops"},{title:"Explore together",text:"Interactive learning alongside the public animal record.",href:"/learn/playground"}] },
];

export function Ecosystem({animal,partners}:{animal:RegisterFocus;partners:{id:string;name:string;slug:string;city:string|null}[]}) {
 const [active,setActive]=useState(1);
 const tabs=useRef<(HTMLButtonElement|null)[]>([]);
 const role=PEOPLE[active];
 function key(e:KeyboardEvent,i:number){const n=e.key==="ArrowRight"||e.key==="ArrowDown"?(i+1)%5:e.key==="ArrowLeft"||e.key==="ArrowUp"?(i+4)%5:e.key==="Home"?0:e.key==="End"?4:-1;if(n<0)return;e.preventDefault();setActive(n);tabs.current[n]?.focus();}
 return <div className="care-commons" data-role={active}>
  <div className="care-chapters" role="tablist" aria-label="One connected ecosystem">
   {PEOPLE.map((p,i)=><button type="button" role="tab" key={p.name} ref={el=>{tabs.current[i]=el;}} id={`people-${i}`} aria-selected={i===active} aria-controls="people-panel" tabIndex={i===active?0:-1} onClick={()=>setActive(i)} onKeyDown={e=>key(e,i)}><span className="care-index" aria-hidden>0{i+1}</span><span>{p.name}</span><ArrowUpRight size={18} aria-hidden/></button>)}
  </div>
  <div className="care-desk" id="people-panel" role="tabpanel" tabIndex={0} aria-labelledby={`people-${active}`}>
   <div className="care-shared">
    <p className="care-overline">The same animal. A continuing record.</p>
    <Link href={`/animal/${animal.id}`} className="care-photo">
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={animal.cover_photo} alt={`Animal ${animal.straypaw_id}, photographed in ${animal.city}`} width={520} height={520} loading="lazy"/>
     <span>{animal.straypaw_id}<ArrowUpRight size={17} aria-hidden/></span>
    </Link>
    <div className="care-record-caption"><span>{animal.city}</span><b>Animal record</b></div>
    <svg className="care-binding" viewBox="0 0 300 56" aria-hidden><path d="M3 19C65 19 62 48 117 36S206 6 297 25" pathLength="1"/><circle cx="3" cy="19" r="3"/><circle cx="297" cy="25" r="3"/></svg>
    <p className="care-source">A real public profile. Each role contributes through its own workspace.</p>
   </div>
   <div className="care-page" key={active}>
    <div className="care-page-top"><span>{role.sheet}</span><span>0{active+1} / 05</span></div>
    <h3>{role.title}</h3><p className="care-lede">{role.text}</p>
    <ol className="care-actions">{role.steps.map((step,i)=><li key={step.title}><Link href={step.href}><span className="care-step">{i+1}</span><span><b>{step.title}</b><small>{step.text}</small></span><ArrowUpRight size={19} aria-hidden/></Link></li>)}</ol>
    <div className="care-entry"><Link className="care-primary" href={role.entry}>{role.cta}<ArrowRight size={18} aria-hidden/></Link><Link className="care-details" href={role.href}>For {role.name.toLowerCase()}<ArrowUpRight size={14} aria-hidden/></Link></div>
    {active===1&&<p className="care-access">Organisation access requires a verified workspace.</p>}
   </div>
  </div>
  <div className="care-channels"><span>Another way into the same record</span><div><h3>WhatsApp / CareOS</h3><p>Report in WhatsApp. Coordinate through your organisation’s workspace.</p></div><Link href="/contact?subject=WhatsApp%20CareOS%20access">Connect your team<ArrowUpRight size={18} aria-hidden/></Link><small>Contact us for the reporting channel, organisation setup and costs.</small></div>
  <div className="care-partners"><span>NGO field partners</span><div>{partners.map(p=><Link key={p.id} href={`/community/organisations/${p.slug}`}>{p.name}</Link>)}</div></div>
 </div>;
}
