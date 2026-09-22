"use client";

import { useMemo,useState } from "react";
import Link from "next/link";
import { ArrowUpRight,Crosshair,Plus } from "lucide-react";
import { FieldMapPreview } from "@/components/site/FieldMapPreview";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { located } from "@/lib/geo/cluster";
import { markerMetaFor } from "@/lib/marker-state";
import type { PublicCaseStory } from "@/lib/community-case-stories";
import { rescueCategory } from "@/lib/rescue-taxonomy";
import { dogLabel,timeAgo } from "@/lib/utils";
import type { Dog,Sighting } from "@/lib/types";

const RADIUS_KM=12;
function distanceKm(a:{lat:number;lng:number},b:{lat:number;lng:number}){const r=(v:number)=>v*Math.PI/180,e=6371,dLat=r(b.lat-a.lat),dLng=r(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;return e*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function tone(d:Dog){if(d.needs_help)return "urgent" as const;return ["resolved","released","adopted","safe"].includes(String(d.status??"").toLowerCase())?"resolved" as const:"active" as const}
/* Imported records are named after the place and month they were filed --
   "Dog · Sukrawar Pettai · Sep 2026" -- so printing the zone underneath the
   name said the locality twice in two lines, and falling back to the species
   said "dog" under a line beginning "Dog". The second line carries the
   locality only when the name has not already spent it, and otherwise who is
   keeping the record, which is the part a reader does not already have. */
function subline(d:Dog){const name=dogLabel(d).toLowerCase(),zone=(d.zone||"").trim();if(zone&&!name.includes(zone.toLowerCase()))return zone;return d.ngo_name||d.code||"Community record"}

/* The community workspace.

   Composed as one surface rather than a column of boxes. The map is the
   spatial backbone and the register of nearby animals is attached to it,
   divided by a rule instead of floated beside it as a second card, because
   the list is a reading of the map and not an unrelated panel.

   The phone layout is not this composition stacked. Stacking gave a 430px
   map above a 430px list, so the first screen was 860px of dashboard with
   no animal visible on it. On a phone the map takes a little under half the
   viewport and the register begins immediately underneath, so the first
   records are readable without scrolling and Report is never far away. */
export function CommunityHome({dogs,sightings:_sightings,stories}:{dogs:Dog[];sightings:Sighting[];stories:PublicCaseStory[]}){
 const [location,setLocation]=useState<{lat:number;lng:number}|null>(null),[locating,setLocating]=useState(false),[error,setError]=useState<string|null>(null);
 const inView=useMemo(()=>{const rows=located(dogs);return location?rows.filter(d=>distanceKm(location,d)<=RADIUS_KM):rows},[dogs,location]);
 const register=useMemo(()=>[...inView].sort((a,b)=>Number(b.needs_help)-Number(a.needs_help)||+new Date(b.last_seen)-+new Date(a.last_seen)),[inView]);
 const scope=location?inView:dogs,needsHelp=scope.filter(d=>d.needs_help).length;
 const recent=useMemo(()=>{const seen=new Set<string>(),out:PublicCaseStory[]=[];for(const s of stories){if(!s.dog_id||seen.has(s.dog_id))continue;seen.add(s.dog_id);out.push(s);if(out.length===4)break}return out},[stories]);
 function findMe(){if(!navigator.geolocation){setError("Location is not available in this browser.");return}setLocating(true);navigator.geolocation.getCurrentPosition(({coords})=>{setLocation({lat:coords.latitude,lng:coords.longitude});setLocating(false);setError(null)},()=>{setError("We could not get your location. You can still explore the shared map.");setLocating(false)},{timeout:10000,maximumAge:300000})}

 return <main className="ch">
  {/* One line of orientation, the live count, and the action. A workspace
      does not need a marketing headline every time it opens. */}
  <header className="ch-head">
   <div className="ch-head-id">
    <h1>Animals in your area</h1>
    <p className="ch-tally">
     <b>{scope.length.toLocaleString("en-IN")}</b> on the record
     {needsHelp>0&&<><span className="ch-dot">·</span><b className="ch-urgent">{needsHelp.toLocaleString("en-IN")}</b> need help</>}
    </p>
   </div>
   <Link href="/report" className="ch-report"><Plus size={16}/>Report an animal</Link>
  </header>
  {error&&<p className="ch-error">{error}</p>}

  {/* Map and register share one surface: the rule between them is the only
      separation, so the list reads as what the map contains. */}
  <section className="ch-work" aria-label="Animals near you">
   <div className="ch-map">
    <FieldMapPreview dogs={inView} center={location} place={location?"Around you":"Across India"}/>
    <button onClick={findMe} disabled={locating} className="ch-locate"><Crosshair size={13}/>{locating?"Finding you":location?"Around you":"Use my location"}</button>
    {!inView.length&&<p className="ch-map-empty"><b>No animal recorded here yet.</b> A photo and a location are enough. <Link href="/report">Report the first</Link></p>}
   </div>

   <div className="ch-register">
    <p className="ch-register-head"><span>Nearby</span><Link href="/map">Full map <ArrowUpRight size={12}/></Link></p>
    <ul className="ch-list">
     {register.slice(0,7).map(d=>{const m=markerMetaFor(d);return <li key={d.id}>
      <Link href={`/dog/${d.id}`}>
       <DogPhoto src={d.cover_photo} alt="" seed={d.id} tone={tone(d)} className="ch-thumb"/>
       <span className="ch-who"><b>{dogLabel(d)}</b><small>{subline(d)}</small></span>
       <span className="ch-when"><small><i style={{background:m.color}} aria-hidden/>{m.label}</small><small>{timeAgo(d.last_seen)}</small></span>
      </Link>
     </li>})}
    </ul>
    {register.length>7&&<Link href="/map" className="ch-more">See all {register.length.toLocaleString("en-IN")} nearby <ArrowUpRight size={13}/></Link>}
   </div>
  </section>

  {/* Activity flows on from the register as a list, not a second grid. */}
  {recent.length>0&&<section className="ch-activity" aria-label="Recent rescue updates">
   <p className="ch-activity-head"><span>Recently completed</span><Link href="/stories">All stories <ArrowUpRight size={12}/></Link></p>
   <ul>
    {recent.map(s=>{const name=s.animal_name||s.animal_code||"Animal record",category=rescueCategory({subtype:s.category,title:s.title,detail:s.outcome});return <li key={s.dog_id}>
     <Link href={`/dog/${s.dog_id}`}>
      <DogPhoto src={s.cover_photo} alt="" seed={s.dog_id} tone="resolved" className="ch-act-thumb"/>
      <span><b>{name}</b><small>{[category,s.outcome].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(" · ")||s.title}</small></span>
      <ArrowUpRight size={15}/>
     </Link>
    </li>})}
   </ul>
  </section>}

  <p className="ch-foot">Locations are approximate. Sensitive details stay private.</p>
 </main>;
}
