"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { RegisterFocus } from "@/lib/landing/story";
import type { Area } from "@/components/request/OriginalRequest";
import { PartnerNetwork, type FieldPartner } from "./PartnerNetwork";
import "./ecosystem.css";

const PEOPLE = [
 {name:"Community",title:"Start with what you see.",text:"Find an animal’s record, add an observation or report a concern.",href:"/for-community",entry:"/community/report",cta:"Report an animal",links:[{title:"Report an animal",href:"/community/report"},{title:"Explore the map",href:"/explore"},{title:"Follow recorded updates",href:"/community"}]},
 {name:"NGOs & Rescues",title:"Keep the next step clear.",text:"Review intake, assign cases and keep animal histories alongside the work.",href:"/for-ngos",entry:"/ngo",cta:"Open NGO workspace",links:[{title:"Work",href:"/ngo"},{title:"Animals",href:"/ngo/animals"},{title:"Map",href:"/ngo/map"}]},
 {name:"Municipalities",title:"Read the programme, area by area.",text:"Compare programme geography, recorded care and the gaps that need a closer look.",href:"/for-governments",entry:"/contact?subject=Request%20a%20Pilot",cta:"Request a Pilot",links:[{title:"Explore geography",href:"/explore"},{title:"Veterinary collaboration",href:"/for-governments"},{title:"Paid pilot details",href:"/for-governments#pilot"}]},
 {name:"Feeders",title:"Know the animals you see again.",text:"Identify a familiar animal, contribute a sighting and keep observations attached to its history.",href:"/for-feeders",entry:"/explore",cta:"Find your animals",links:[{title:"Find an animal",href:"/explore"},{title:"Add a sighting",href:"/explore"},{title:"Report a concern",href:"/community/report"}]},
 {name:"Education",title:"Take the record into the room.",text:"Credited teaching materials and practical lessons for communities, classrooms and field teams.",href:"/education",entry:"/learn/resources",cta:"Open learning materials",links:[{title:"Credited teaching materials",href:"/learn/resources"},{title:"Workshop guidance",href:"/learn/workshops"},{title:"Interactive learning",href:"/learn/playground"}]},
];
type Workspace = {city:string;brief:{animals:number;cells:number;sterilised:number;ster_unknown:number;cases:number};queue:{condition:string;locality:string;days:number;critical:boolean}[]};
type Lesson = {title:string;minutes:number;takeaway:string;href:string};
const f=(n:number)=>n.toLocaleString("en-IN");
const date=(iso:string|null)=>iso?new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}):"Not recorded";

function RegisterView({records,feeder}:{records:RegisterFocus[];feeder:boolean}) {
 const [query,setQuery]=useState("");const [selected,setSelected]=useState(records[0].id);
 const hits=useMemo(()=>records.filter(r=>[r.straypaw_id,r.name,r.city,r.zone].filter(Boolean).join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),[records,query]);
 const animal=records.find(r=>r.id===selected)??records[0];
 return <div className="role-register">
  <div className="role-register-list"><label htmlFor="role-animal-search">Find a photographed record</label><input id="role-animal-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Animal tag or city" autoComplete="off"/>
   <span className="role-results">{f(hits.length)} profiles in this public sample</span>
   <div className="role-records" role="group" aria-label="Photographed animal records">{hits.slice(0,6).map(r=><button key={r.id} type="button" aria-pressed={r.id===animal.id} onClick={()=>setSelected(r.id)}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={r.cover_photo} width={44} height={44} alt="" loading="lazy"/><span><b>{r.straypaw_id}</b><small>{r.city}</small></span><ArrowRight size={15} aria-hidden/>
   </button>)}</div>
   {!hits.length&&<p className="role-empty">No matching profiles in this sample. <Link href="/explore">Search the full map</Link>.</p>}
  </div>
  <article className="role-inspector" aria-label="Selected animal record">
   <Link className="role-portrait care-photo" href={`/animal/${animal.id}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={animal.cover_photo} width={360} height={260} alt={`${animal.straypaw_id}, photographed in ${animal.city}`} loading="lazy"/>
   </Link>
   <div className="role-identity"><b>{animal.straypaw_id}</b><span>{animal.city}</span></div>
   <dl><div><dt>First on record</dt><dd>{date(animal.first_seen)}</dd></div><div><dt>Sightings</dt><dd>{f(animal.sightings)}</dd></div></dl>
   <Link className="role-inline-action" href={`/animal/${animal.id}`}>{feeder?"Open profile to add a sighting":"Open full animal record"}<ArrowUpRight size={15} aria-hidden/></Link>
  </article>
 </div>;
}

function GeographyView({areas,workspace}:{areas:Area[];workspace:Workspace}) {
 const [requests,setRequests]=useState(false);
 const geo=useMemo(()=>{
  const points=areas.map(a=>{let x=0,y=0;for(let i=0;i<a.ring.length;i+=2){x+=a.ring[i];y+=a.ring[i+1];}return{x:x/(a.ring.length/2),y:y/(a.ring.length/2),area:a};});
  const west=Math.min(...points.map(p=>p.x)),east=Math.max(...points.map(p=>p.x)),south=Math.min(...points.map(p=>p.y)),north=Math.max(...points.map(p=>p.y));
  const cos=Math.cos((south+north)/2*Math.PI/180),scale=Math.min(360/Math.max(.001,(east-west)*cos),230/Math.max(.001,north-south));
  return points.map(p=>({x:20+(p.x-west)*cos*scale,y:20+(north-p.y)*scale,area:p.area}));
 },[areas]);
 return <div className="role-geography"><div className="role-area-map"><div className="role-map-toolbar"><b>{workspace.city}</b><button type="button" aria-pressed={requests} onClick={()=>setRequests(v=>!v)}>{requests?"Showing requests":"Show requests"}</button></div>
  <svg viewBox="0 0 400 270" role="img" aria-label={`Actual recorded areas in ${workspace.city}; coarse area geography`}>
   {geo.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={p.area.open&&requests?3.7:2.7} className={requests?(p.area.open?"has-requests":"is-dim"):""}/>)}</svg>
  <Link href={`/explore?city=${encodeURIComponent(workspace.city)}`}>Explore the full map<ArrowUpRight size={15} aria-hidden/></Link></div>
  <div className="role-figures"><div><span>Animal records</span><b>{f(workspace.brief.animals)}</b></div><div><span>Recorded sterilised</span><b>{f(workspace.brief.sterilised)}</b></div><div><span>Sterilisation not recorded</span><b>{f(workspace.brief.ster_unknown)}</b></div><p>Unknown stays visible. An imported register does not establish current programme coverage.</p></div>
 </div>;
}

function LearningView({lessons}:{lessons:Lesson[]}) {
 const [selected,setSelected]=useState(0);const lesson=lessons[selected];
 return <div className="role-learning"><div role="group" aria-label="Choose a lesson">{lessons.map((l,i)=><button key={l.href} type="button" aria-pressed={i===selected} onClick={()=>setSelected(i)}><b>{l.title}</b><span>{l.minutes} min</span></button>)}</div><article><span>StrayPaw Academy</span><h4>{lesson.title}</h4><p>{lesson.takeaway}</p><Link href={lesson.href}>Open the lesson<ArrowUpRight size={16} aria-hidden/></Link></article></div>;
}

export function Ecosystem({records,partners,areas,workspace,lessons}:{records:RegisterFocus[];partners:FieldPartner[];areas:Area[];workspace:Workspace;lessons:Lesson[]}) {
 const [active,setActive]=useState(1);const [view,setView]=useState("Work");const tabs=useRef<(HTMLButtonElement|null)[]>([]);const role=PEOPLE[active];
 function key(e:KeyboardEvent,i:number){const n=e.key==="ArrowRight"||e.key==="ArrowDown"?(i+1)%5:e.key==="ArrowLeft"||e.key==="ArrowUp"?(i+4)%5:e.key==="Home"?0:e.key==="End"?4:-1;if(n<0)return;e.preventDefault();setActive(n);tabs.current[n]?.focus();}
 return <div className="role-experience" data-role={active}>
  <div className="role-layout"><div className="role-selector" role="tablist" aria-label="One connected ecosystem" aria-orientation="vertical">{PEOPLE.map((r,i)=><button type="button" role="tab" key={r.name} ref={el=>{tabs.current[i]=el;}} id={`people-${i}`} aria-selected={i===active} aria-controls="people-panel" tabIndex={i===active?0:-1} onClick={()=>setActive(i)} onKeyDown={e=>key(e,i)}><span>{r.name}</span><ArrowRight size={18} aria-hidden/></button>)}</div>
   <div className="role-panel" id="people-panel" role="tabpanel" tabIndex={0} aria-labelledby={`people-${active}`}>
    <header className="role-introduction"><div><h3>{role.title}</h3><p>{role.text}</p></div><Link className="care-primary" href={role.entry}>{role.cta}<ArrowUpRight size={16} aria-hidden/></Link></header>
    <div className="role-product" key={active}>
     <div className="role-product-header"><b>{active===0||active===3?"Animal register":active===1?"NGO workspace":active===2?"Programme geography":"Learning resources"}</b>
      {active===1?<div role="group" aria-label="Preview NGO workspace">{["Work","Animals","Map"].map(v=><button type="button" key={v} aria-pressed={view===v} onClick={()=>setView(v)}>{v}</button>)}</div>:<Link className="role-audience-link" href={role.href}>For {role.name.toLowerCase()}<ArrowUpRight size={14} aria-hidden/></Link>}
     </div>
     {(active===0||active===3||(active===1&&view==="Animals"))&&<RegisterView records={records} feeder={active===3}/>}
     {active===1&&view==="Work"&&<div className="role-queue"><div className="role-queue-heading"><span>Public intake sample</span><span>{workspace.city}</span></div><table><thead><tr><th scope="col">Request</th><th scope="col">Locality</th><th scope="col">Age at capture</th></tr></thead><tbody>{workspace.queue.map((q,i)=><tr key={i}><td><Link href="/ngo">{q.condition}<ArrowUpRight size={13} aria-hidden/></Link></td><td>{q.locality}</td><td>{q.days}d</td></tr>)}</tbody></table><p>Review intake and assign care in your verified organisation workspace.</p></div>}
     {(active===2||(active===1&&view==="Map"))&&<GeographyView areas={areas} workspace={workspace}/>}
     {active===4&&<LearningView lessons={lessons}/>}
     <div className="role-provenance">{active===4?"Original StrayPaw learning materials.":`Public record sample · captured 20 October 2026${active===1?" · organisation access required":""}`}</div>
    </div>
    <nav className="role-links" aria-label={`${role.name} actions`}>{role.links.map(l=><Link key={l.title} href={l.href}>{l.title}<ArrowUpRight size={14} aria-hidden/></Link>)}</nav>
   </div>
  </div>
  <div className="role-channel"><div><span>WhatsApp / CareOS</span><p>Another way into the same record. Report in WhatsApp and coordinate through your organisation.</p></div><Link href="/contact?subject=WhatsApp%20CareOS%20access">Connect your team<ArrowUpRight size={18} aria-hidden/></Link><small>Contact us for the reporting channel, organisation setup and costs.</small></div>
  <PartnerNetwork partners={partners}/>
 </div>;
}
