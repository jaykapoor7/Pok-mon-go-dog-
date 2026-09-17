"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Crosshair, MapPin, Plus } from "lucide-react";
import { FieldMapPreview } from "@/components/site/FieldMapPreview";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { located } from "@/lib/geo/cluster";
import { markerMetaFor } from "@/lib/marker-state";
import type { PublicCaseStory } from "@/lib/community-case-stories";
import { isClosedStatus, rescueCategory } from "@/lib/rescue-taxonomy";
import { dogLabel, timeAgo } from "@/lib/utils";
import type { Dog, Sighting } from "@/lib/types";

const RADIUS_KM = 12;
function distanceKm(a:{lat:number;lng:number},b:{lat:number;lng:number}){const r=(v:number)=>v*Math.PI/180,e=6371,dLat=r(b.lat-a.lat),dLng=r(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;return e*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function photoTone(d:Dog){if(d.needs_help)return "urgent" as const;const s=String(d.status??"").toLowerCase();if(["resolved","released","adopted","safe"].includes(s))return "resolved" as const;return "active" as const;}

export function CommunityHome({dogs,sightings:_sightings,stories}:{dogs:Dog[];sightings:Sighting[];stories:PublicCaseStory[]}){
 const [location,setLocation]=useState<{lat:number;lng:number}|null>(null),[locating,setLocating]=useState(false),[locationError,setLocationError]=useState<string|null>(null);
 const inView=useMemo(()=>{const rows=located(dogs);return location?rows.filter(d=>distanceKm(location,d)<=RADIUS_KM):rows},[dogs,location]);
 const register=useMemo(()=>[...inView].sort((a,b)=>+new Date(b.last_seen)-+new Date(a.last_seen)),[inView]);
 const stats=useMemo(()=>{const scope=location?inView:dogs;return{recorded:scope.length,needsHelp:scope.filter(d=>d.needs_help).length}},[dogs,inView,location]);
 const recentStories=useMemo(()=>{const seen=new Set<string>(),rows:PublicCaseStory[]=[];for(const row of stories){if(!row.dog_id||seen.has(row.dog_id))continue;seen.add(row.dog_id);rows.push(row);if(rows.length===3)break}return rows},[stories]);
 function findMe(){if(!navigator.geolocation){setLocationError("This browser cannot share a location.");return}setLocating(true);navigator.geolocation.getCurrentPosition(({coords})=>{setLocation({lat:coords.latitude,lng:coords.longitude});setLocating(false);setLocationError(null)},()=>{setLocationError("We could not get your location. The shared register still works.");setLocating(false)},{timeout:10000,maximumAge:300000})}
 return <div className="community-home">
  <header className="community-command-header"><div><span className="product-kicker">Community record</span><h1>{location?<>Your street, <em>on the record.</em></>:<>Animals and work, <em>on the record.</em></>}</h1><p>{location?`Public records within about ${RADIUS_KM} km. Locations are deliberately approximate.`:"Report an animal, explore the map, or follow a rescue from first call through care and outcome."}</p></div><div className="community-command-actions"><button type="button" onClick={findMe} disabled={locating} className="community-relocate"><Crosshair size={15}/>{locating?"Finding you":location?"Refresh location":"Use my location"}</button><Link className="product-primary" href="/report"><Plus size={18}/>Report an animal</Link></div></header>
  {locationError&&<p role="status" className="community-location-error">{locationError}</p>}
  <section className="community-field-surface" aria-label="Public animal register"><div className="community-map"><FieldMapPreview dogs={inView} center={location} place={location?"Around you":"Across India"}/>{!inView.length&&<div className="community-local-empty"><MapPin size={17}/><span><b>No record here yet.</b> A photograph and place are enough.</span><Link href="/report">Report one <ArrowUpRight size={14}/></Link></div>}</div><aside className="community-journal"><div className="community-signal-line"><div><b>{stats.recorded}</b><span>animals recorded</span></div><div><b className={stats.needsHelp?"urgent":undefined}>{stats.needsHelp}</b><span>need attention</span></div></div><div className="community-journal-heading"><div><span className="product-kicker">Animal register</span><h2>Find an animal</h2></div><Link href="/map">Open map <ArrowUpRight size={16}/></Link></div>{register.length?<ul className="community-register">{register.slice(0,8).map(d=>{const meta=markerMetaFor(d);return <li key={d.id}><Link href={`/dog/${d.id}`}><DogPhoto src={d.cover_photo} alt="" seed={d.id} tone={photoTone(d)} className="community-register-photo"/><span className="community-register-who"><b>{dogLabel(d)}</b><small>{d.zone||"Location recorded"}</small></span><span className="community-register-state"><span><i style={{background:meta.color}} aria-hidden/>{meta.label}</span><em>{timeAgo(d.last_seen)}</em></span></Link></li>})}</ul>:<p className="community-register-empty">No animals in this part of the register yet.</p>}<Link href="/map" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">Search all animals <ArrowUpRight size={15}/></Link></aside></section>

  <section className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6 lg:px-8" aria-labelledby="community-stories-title">
    <div className="flex items-end justify-between gap-4 border-b border-black/[.09] pb-3"><div><span className="product-kicker">Rescue stories</span><h2 id="community-stories-title" className="mt-1 text-xl font-semibold">Follow what happened next.</h2><p className="mt-1 max-w-2xl text-sm opacity-60">A rescue, its treatment, follow-ups and outcome stay attached to the same animal.</p></div><Link href="/stories" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">All stories <ArrowUpRight size={15}/></Link></div>
    {recentStories.length?<div className="grid gap-3 pt-4 md:grid-cols-3">{recentStories.map(row=>{const completed=isClosedStatus(row.status),name=row.animal_name||row.animal_code||"Animal record",category=rescueCategory({subtype:row.category,title:row.title,detail:row.outcome});return <Link key={row.dog_id} href={`/dog/${row.dog_id}`} className="grid min-h-[132px] grid-cols-[92px_1fr] overflow-hidden rounded-xl border border-black/[.08] bg-white transition hover:-translate-y-0.5 hover:shadow-sm"><DogPhoto src={row.cover_photo} alt={name} seed={row.dog_id} tone={completed?"resolved":"active"} className="h-full w-full"/><span className="flex min-w-0 flex-col p-3"><small className={`text-[10px] font-bold uppercase tracking-[.08em] ${completed?"text-[#3e8473]":"text-[#d44d35]"}`}>{completed?"Completed":"In progress"}</small><b className="mt-1 truncate text-sm">{name}</b><span className="mt-1 line-clamp-2 text-xs leading-4 opacity-65">{row.title||category}</span><span className="mt-auto flex items-center gap-1 pt-2 text-[11px] opacity-50"><BookOpen size={11}/>{category}</span></span></Link>})}</div>:<p className="py-6 text-sm opacity-60">Published rescue stories will appear here as NGO and community records connect to an animal.</p>}
  </section>

  <div className="community-feedback"><p><b>Something not working, or missing?</b> Report it and we will look into it.</p><FeedbackButton label="Send feedback"/></div>
 </div>
}
