"use client";

import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { ArrowRight,X } from "lucide-react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { getMyAnimals,type AnimalRow } from "@/lib/animal-actions";
import { isOverdue,speciesLabel,SPECIES,type Case,type Dog } from "@/lib/types";
import { isMissingOrEscaped,isNoAction,rescueCategory } from "@/lib/rescue-taxonomy";
import { timeAgo } from "@/lib/utils";

type Layer="cases"|"animals";
type Lens="all"|"open"|"urgent"|"followup"|"no_action"|"repeat"|"missing"|"resolved";
const LENSES:Array<{id:Lens;label:string}>=[
 {id:"all",label:"All cases"},{id:"open",label:"Open"},{id:"urgent",label:"Urgent"},{id:"followup",label:"Follow-up"},{id:"no_action",label:"No action"},{id:"repeat",label:"Repeat animals"},{id:"missing",label:"Missing / escaped"},{id:"resolved",label:"Resolved"}
];
const isOpen=(c:Case)=>c.status!=="resolved"&&c.status!=="closed";
const isUrgent=(c:Case)=>isOpen(c)&&(c.severity==="critical"||c.severity==="high"||isOverdue(c));
const caseText=(c:Case)=>({subtype:c.category,title:c.condition_text||c.title,detail:[c.description,c.outcome_note].filter(Boolean).join(" "),status:c.status});
function caseMarker(c:Case):Dog{return{id:c.id,name:c.title,zone:c.zone??"",lat:c.lat as number,lng:c.lng as number,status:isUrgent(c)?"injured":c.status==="resolved"?"sterilised":"seen",cover_photo:c.photos?.[0]??"",photos:[],size:"medium",color:"",is_friendly:true,needs_help:isUrgent(c),sterilised:c.status==="resolved",vaccinated:false,trust_score:50,sightings_count:1,feed_count:0,first_seen:c.created_at,last_seen:c.last_activity_at,last_fed_at:null,community_notes:[]}}
function animalMarker(a:AnimalRow):Dog{return{id:a.id,name:a.name??speciesLabel(a.species),zone:a.zone,lat:a.lat,lng:a.lng,status:(a.status as Dog["status"])??"seen",cover_photo:a.cover_photo,photos:[],size:"medium",color:"",is_friendly:true,needs_help:false,sterilised:false,vaccinated:false,trust_score:50,sightings_count:1,feed_count:0,first_seen:a.last_seen,last_seen:a.last_seen,last_fed_at:null,community_notes:[]}}

export function PartnerMap({cases}:{cases:Case[]}){
 const [layer,setLayer]=useState<Layer>("cases"),[species,setSpecies]=useState("all"),[lens,setLens]=useState<Lens>("open"),[category,setCategory]=useState("all"),[animals,setAnimals]=useState<AnimalRow[]>([]),[sel,setSel]=useState<{kind:Layer;id:string}|null>(null);
 useEffect(()=>{getMyAnimals().then(setAnimals).catch(()=>{})},[]);
 const repeatIds=useMemo(()=>{const m=new Map<string,number>();for(const c of cases)if(c.dog_id)m.set(c.dog_id,(m.get(c.dog_id)??0)+1);return new Set([...m.entries()].filter(([,n])=>n>1).map(([id])=>id))},[cases]);
 const categories=useMemo(()=>{const m=new Map<string,number>();for(const c of cases){const k=rescueCategory(caseText(c));m.set(k,(m.get(k)??0)+1)}return[...m.entries()].sort((a,b)=>b[1]-a[1])},[cases]);
 const speciesInPlay=useMemo(()=>{const s=new Set<string>();cases.forEach(c=>c.species&&s.add(c.species));animals.forEach(a=>s.add(a.species));return SPECIES.filter(x=>s.has(x.id))},[cases,animals]);
 const filteredCases=useMemo(()=>{let list=cases.filter(c=>c.lat!=null&&c.lng!=null);if(species!=="all")list=list.filter(c=>(c.species??"dog")===species);if(category!=="all")list=list.filter(c=>rescueCategory(caseText(c))===category);if(lens==="open")list=list.filter(isOpen);if(lens==="urgent")list=list.filter(isUrgent);if(lens==="followup")list=list.filter(c=>Boolean(c.follow_up_at));if(lens==="no_action")list=list.filter(c=>isNoAction(caseText(c)));if(lens==="repeat")list=list.filter(c=>Boolean(c.dog_id&&repeatIds.has(c.dog_id)));if(lens==="missing")list=list.filter(c=>isMissingOrEscaped(caseText(c)));if(lens==="resolved")list=list.filter(c=>c.status==="resolved"||c.status==="closed");return list},[cases,species,category,lens,repeatIds]);
 const markers=useMemo(()=>{if(layer==="cases")return filteredCases.map(caseMarker);let list=animals.filter(a=>a.lat&&a.lng);if(species!=="all")list=list.filter(a=>a.species===species);return list.map(animalMarker)},[layer,filteredCases,animals,species]);
 const hotspots=useMemo(()=>{if(layer!=="cases")return[];const cell=.025,bins=new Map<string,{count:number;zone:Map<string,number>;categories:Map<string,number>}>();for(const c of filteredCases){if(c.lat==null||c.lng==null)continue;const key=`${Math.floor(c.lat/cell)}:${Math.floor(c.lng/cell)}`,bin=bins.get(key)??{count:0,zone:new Map(),categories:new Map()};bin.count++;const z=c.zone||"Mapped area";bin.zone.set(z,(bin.zone.get(z)??0)+1);const cat=rescueCategory(caseText(c));bin.categories.set(cat,(bin.categories.get(cat)??0)+1);bins.set(key,bin)}return[...bins.values()].map(b=>({count:b.count,zone:[...b.zone.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"Mapped area",category:[...b.categories.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"Rescue"})).sort((a,b)=>b.count-a.count).slice(0,5)},[filteredCases,layer]);
 const selectedCase=sel?.kind==="cases"?cases.find(c=>c.id===sel.id):null,selectedAnimal=sel?.kind==="animals"?animals.find(a=>a.id===sel.id):null;
 return <div className="fixed bottom-0 left-0 right-0 top-14 bg-[#f4f1e9] lg:left-60 lg:top-16 lg:grid lg:grid-cols-[292px_1fr]">
  <aside className="hidden min-h-0 flex-col border-r border-[#0b1e3d]/10 bg-[#f4f1e9] p-5 text-[#0b1e3d] lg:flex">
   <div className="border-b border-[#0b1e3d]/10 pb-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#2457ce]">Field map</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.04em]">Where the work is.</h1><p className="mt-2 text-xs leading-5 opacity-50">See demand, unfinished work and repeat patterns in place.</p></div>
   <div className="flex gap-5 border-b border-[#0b1e3d]/10 py-4 text-sm font-semibold"><button onClick={()=>setLayer("cases")} className={layer==="cases"?"":"opacity-35"}>Cases</button><button onClick={()=>setLayer("animals")} className={layer==="animals"?"":"opacity-35"}>Animals</button><span className="ml-auto tabular-nums opacity-35">{markers.length}</span></div>
   {layer==="cases"&&<div className="border-b border-[#0b1e3d]/10 py-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] opacity-30">View</p><div className="grid grid-cols-2 gap-x-3 gap-y-2">{LENSES.map(x=><button key={x.id} onClick={()=>setLens(x.id)} className={`text-left text-xs font-semibold ${lens===x.id?"text-[#2457ce]":"opacity-45"}`}>{x.label}</button>)}</div></div>}
   <div className="space-y-2 border-b border-[#0b1e3d]/10 py-4">{speciesInPlay.length>1&&<select value={species} onChange={e=>setSpecies(e.target.value)} className="h-9 w-full border-b border-[#0b1e3d]/15 bg-transparent text-xs outline-none"><option value="all">All species</option>{speciesInPlay.map(s=><option key={s.id} value={s.id}>{s.plural}</option>)}</select>}{layer==="cases"&&<select value={category} onChange={e=>setCategory(e.target.value)} className="h-9 w-full border-b border-[#0b1e3d]/15 bg-transparent text-xs outline-none"><option value="all">All rescue categories</option>{categories.map(([name,count])=><option key={name} value={name}>{name} ({count})</option>)}</select>}</div>
   {layer==="cases"&&<div className="min-h-0 flex-1 overflow-auto pt-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] opacity-30">Strongest concentrations</p><div className="mt-2 divide-y divide-[#0b1e3d]/8">{hotspots.length?hotspots.map((h,i)=><div key={`${h.zone}-${i}`} className="grid grid-cols-[22px_1fr_auto] gap-2 py-3 text-xs"><span className="opacity-25">0{i+1}</span><span className="min-w-0"><b className="block truncate">{h.zone}</b><small className="block truncate opacity-45">{h.category}</small></span><b>{h.count}</b></div>):<p className="py-3 text-xs opacity-40">No repeated mapped concentration in this view.</p>}</div></div>}
   <p className="mt-auto pt-3 text-[10px] leading-4 opacity-35">Concentrations describe mapped records, not population prevalence.</p>
  </aside>

  <div className="relative min-h-0">
   <MapCanvas dogs={markers} onSelect={d=>setSel({kind:layer,id:d.id})}/>
   <div className="absolute inset-x-3 top-3 z-20 flex flex-wrap items-center gap-2 border border-[#0b1e3d]/10 bg-[#f4f1e9]/95 px-3 py-2 text-xs shadow-sm backdrop-blur lg:hidden">
    <button onClick={()=>setLayer("cases")} className={layer==="cases"?"font-semibold":"opacity-40"}>Cases</button><button onClick={()=>setLayer("animals")} className={layer==="animals"?"font-semibold":"opacity-40"}>Animals</button>
    {layer==="cases"&&<select value={lens} onChange={e=>setLens(e.target.value as Lens)} className="ml-auto bg-transparent font-semibold outline-none">{LENSES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>}
    <span className="tabular-nums opacity-40">{markers.length}</span>
   </div>
   {(selectedCase||selectedAnimal)&&<aside className="absolute inset-y-0 right-0 z-30 w-full max-w-sm border-l border-[#0b1e3d]/10 bg-[#f4f1e9] p-6 text-[#0b1e3d] shadow-xl">
    <button onClick={()=>setSel(null)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center opacity-45" aria-label="Close"><X size={16}/></button>
    {selectedCase&&<div className="pt-8"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#2457ce]">{speciesLabel(selectedCase.species)} · {rescueCategory(caseText(selectedCase))}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.035em]">{selectedCase.title}</h2><dl className="mt-6"><Fact label="Status" value={<span className="capitalize">{selectedCase.status.replace("_"," ")}</span>}/><Fact label="Severity" value={<span className="capitalize">{selectedCase.severity}</span>}/><Fact label="Assignee" value={selectedCase.assignee_name??"Unassigned"}/>{selectedCase.zone&&<Fact label="Location" value={selectedCase.zone}/>}<Fact label="Last activity" value={timeAgo(selectedCase.last_activity_at)}/>{selectedCase.follow_up_at&&<Fact label="Next" value={`Follow-up ${selectedCase.follow_up_at}`}/>}</dl><Link href={`/partner/cases/${selectedCase.id}`} className="mt-7 inline-flex items-center gap-2 border-b border-[#0b1e3d] pb-1 text-sm font-semibold">Open case <ArrowRight size={14}/></Link></div>}
    {selectedAnimal&&<div className="pt-8"><p className="font-mono text-[10px] uppercase tracking-[.1em] text-[#2457ce]">{selectedAnimal.straypaw_id??"ID pending"}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.035em]">{selectedAnimal.name??speciesLabel(selectedAnimal.species)}</h2><dl className="mt-6"><Fact label="Species" value={speciesLabel(selectedAnimal.species)}/>{selectedAnimal.code&&<Fact label="Source ID" value={selectedAnimal.code}/>} {selectedAnimal.zone&&<Fact label="Location" value={selectedAnimal.zone}/>}<Fact label="Responsible" value={selectedAnimal.assignee_name??"Unassigned"}/></dl><Link href={`/partner/animals/${selectedAnimal.id}`} className="mt-7 inline-flex items-center gap-2 border-b border-[#0b1e3d] pb-1 text-sm font-semibold">Open record <ArrowRight size={14}/></Link></div>}
   </aside>}
  </div>
 </div>
}
function Fact({label,value}:{label:string;value:React.ReactNode}){return <div className="flex items-baseline justify-between gap-4 border-b border-[#0b1e3d]/8 py-3"><dt className="text-xs opacity-45">{label}</dt><dd className="text-right text-sm font-medium">{value}</dd></div>}
