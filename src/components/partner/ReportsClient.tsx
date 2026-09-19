"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, MapPin } from "lucide-react";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { isClosedStatus, isMissingOrEscaped, isNoAction, rescueCategory } from "@/lib/rescue-taxonomy";
import { ExportStudio } from "@/components/partner/ExportStudio";

const followDone=(status:string|null)=>["done","completed","cancelled","canceled","missed"].includes(String(status??"").toLowerCase());
const pct=(n:number,d:number)=>d?Math.round(n/d*100):0;

export function ReportsClient(){
 const [rows,setRows]=useState<PartnerRecordRow[]|null>(null);
 useEffect(()=>{getPartnerRecordRows().then(setRows).catch(()=>setRows([]))},[]);

 const s=useMemo(()=>{
  const all=rows??[],rescues=all.filter(r=>r.kind==="rescue"),care=all.filter(r=>r.kind==="care"),followups=all.filter(r=>r.kind==="follow_up"),outcomes=all.filter(r=>r.kind==="outcome");
  const open=rescues.filter(r=>!isClosedStatus(r.status)),noAction=outcomes.filter(r=>isNoAction(r)),missing=outcomes.filter(r=>isMissingOrEscaped(r)),pending=followups.filter(r=>!followDone(r.status)),overdue=pending.filter(r=>+new Date(r.date)<Date.now());
  const cats=new Map<string,number>(),clusters=new Map<string,{category:string;locality:string;count:number}>(),places=new Map<string,{total:number;noAction:number}>(),followPlaces=new Map<string,{pending:number;overdue:number}>(),byAnimal=new Map<string,{count:number;label:string;locality:string|null}>(),careKinds=new Map<string,number>();
  for(const r of rescues){const category=rescueCategory(r);cats.set(category,(cats.get(category)??0)+1);if(r.locality){const key=`${category}|||${r.locality.toLowerCase()}`,v=clusters.get(key)??{category,locality:r.locality,count:0};v.count++;clusters.set(key,v)}const k=r.locality||"Not recorded",p=places.get(k)??{total:0,noAction:0};p.total++;places.set(k,p);if(r.animalId){const v=byAnimal.get(r.animalId)??{count:0,label:r.animalLabel||r.straypawId||"Animal",locality:r.locality};v.count++;byAnimal.set(r.animalId,v)}}
  for(const r of noAction){const k=r.locality||"Not recorded",p=places.get(k)??{total:0,noAction:0};p.noAction++;places.set(k,p)}
  for(const r of pending){const k=r.locality||"Not recorded",v=followPlaces.get(k)??{pending:0,overdue:0};v.pending++;if(+new Date(r.date)<Date.now())v.overdue++;followPlaces.set(k,v)}
  for(const r of care){const t=r.subtype.toLowerCase(),name=/vaccin|rabies|arv/.test(t)?"Rabies / vaccination":/sterili|abc|spay|neuter/.test(t)?"ABC / sterilisation":/chemo|tvt/.test(t)?"TVT / chemotherapy":/surgery/.test(t)?"Surgery / procedure":/wound|dressing/.test(t)?"Wound care":"Treatment / medical";careKinds.set(name,(careKinds.get(name)??0)+1)}
  return{rescues,open,noAction,missing,overdue,completed:rescues.filter(r=>isClosedStatus(r.status)),categories:[...cats.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8),clusters:[...clusters.values()].filter(x=>x.count>=2).sort((a,b)=>b.count-a.count).slice(0,6),noActionPlaces:[...places.entries()].map(([name,v])=>({name,...v,rate:pct(v.noAction,v.total)})).filter(x=>x.noAction>0).sort((a,b)=>b.noAction-a.noAction||b.rate-a.rate).slice(0,6),followPlaces:[...followPlaces.entries()].map(([name,v])=>({name,...v})).sort((a,b)=>b.overdue-a.overdue||b.pending-a.pending).slice(0,6),repeat:[...byAnimal.values()].filter(x=>x.count>1).sort((a,b)=>b.count-a.count).slice(0,6),repeatCount:[...byAnimal.values()].filter(x=>x.count>1).length,careKinds:[...careKinds.entries()].sort((a,b)=>b[1]-a[1])}
 },[rows]);

 if(rows===null)return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin"/></div>;
 const max=Math.max(1,...s.categories.map(([,n])=>n));
 return <main className="min-h-screen bg-[#f4f1e9] text-[#0b1e3d]"><div className="mx-auto max-w-7xl px-4 pb-16 pt-7 sm:px-6 lg:px-8">
  <header className="border-b border-[#0b1e3d]/10 pb-7"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#2457ce]">Reports & analysis</p><div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-[clamp(2.3rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.055em]">What your records are telling you.</h1><p className="mt-3 max-w-2xl text-sm leading-6 opacity-55">Patterns across rescue, treatment, follow-up and outcome. These are signals from your organisation’s own records, not population estimates.</p></div><Link href="/partner/map" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[#2457ce] sm:self-auto"><MapPin size={14}/>See it on the map</Link></div></header>

  <section className="grid border-b border-[#0b1e3d]/10 sm:grid-cols-4">
   <Metric value={s.rescues.length} label="rescue cases" note={`${s.open.length} still open`}/>
   <Metric value={s.noAction.length} label="no intervention" note="closed without field action" hot={s.noAction.length>0}/>
   <Metric value={s.overdue.length} label="overdue follow-ups" note="need attention now" hot={s.overdue.length>0}/>
   <Metric value={s.repeatCount} label="repeat animals" note="more than one rescue case"/>
  </section>

  <div className="grid border-b border-[#0b1e3d]/10 lg:grid-cols-[1.05fr_.95fr]">
   <section className="py-9 lg:border-r lg:border-[#0b1e3d]/10 lg:pr-10"><p className="text-[11px] font-bold uppercase tracking-[.14em] opacity-35">Demand</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.035em]">What problems recur</h2><div className="mt-7 space-y-5">{s.categories.map(([name,n],i)=><div key={name}><div className="mb-2 flex items-baseline justify-between gap-3 text-sm"><span className="capitalize">{name}</span><b className="tabular-nums">{n.toLocaleString()}</b></div><div className="h-[3px] bg-[#0b1e3d]/8"><div className={`h-full ${i===0?"bg-[#f05b40]":"bg-[#2457ce]"}`} style={{width:`${Math.max(3,n/max*100)}%`}}/></div></div>)}</div></section>
   <section className="py-9 lg:pl-10"><p className="text-[11px] font-bold uppercase tracking-[.14em] opacity-35">Concentration</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.035em]">Where specific problems repeat</h2><div className="mt-5 divide-y divide-[#0b1e3d]/8">{s.clusters.length?s.clusters.map((r,i)=><Rank key={`${r.category}-${r.locality}`} i={i} title={r.locality} meta={`${r.category} · ${r.count} cases`}/>):<Empty>No repeated condition/location pattern yet.</Empty>}</div></section>
  </div>

  <section className="grid border-b border-[#0b1e3d]/10 lg:grid-cols-3">
   <Signal title="Cases ending without intervention" intro="Places where recorded demand is not becoming field action."><div className="divide-y divide-[#0b1e3d]/8">{s.noActionPlaces.length?s.noActionPlaces.map((r,i)=><Rank key={r.name} i={i} title={r.name} meta={`${r.noAction} no-action · ${r.rate}% of recorded rescues`}/>):<Empty>No no-action outcomes recorded.</Empty>}</div></Signal>
   <Signal title="Follow-up workload" intro="Pending reviews and appointments, overdue first."><div className="divide-y divide-[#0b1e3d]/8">{s.followPlaces.length?s.followPlaces.map((r,i)=><Rank key={r.name} i={i} title={r.name} meta={`${r.overdue} overdue · ${r.pending} pending`}/>):<Empty>No pending follow-up workload.</Empty>}</div></Signal>
   <Signal title="Animals re-entering rescue" intro="Permanent identities linked to multiple rescue episodes."><div className="divide-y divide-[#0b1e3d]/8">{s.repeat.length?s.repeat.map((r,i)=><Rank key={`${r.label}-${i}`} i={i} title={r.label} meta={`${r.count} cases${r.locality?` · ${r.locality}`:""}`}/>):<Empty>No repeat rescue animals linked.</Empty>}</div></Signal>
  </section>

  <section className="grid gap-8 border-b border-[#0b1e3d]/10 py-9 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] opacity-35">Care delivered</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.035em]">What was actually done</h2><p className="mt-3 max-w-sm text-sm leading-6 opacity-55">Traceable care events attached to animals, rather than monthly summary cells.</p></div><div className="grid gap-x-8 sm:grid-cols-2">{s.careKinds.map(([name,n])=><div key={name} className="flex items-baseline justify-between border-b border-[#0b1e3d]/8 py-3 text-sm"><span>{name}</span><b className="tabular-nums">{n.toLocaleString()}</b></div>)}</div></section>

  <section className="grid gap-6 border-b border-[#0b1e3d]/10 py-9 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] opacity-35">Outcome watch</p><h2 className="mt-1 text-xl font-semibold">{s.missing.length.toLocaleString()} missing / escaped / unable-to-catch outcomes</h2><p className="mt-2 max-w-2xl text-sm leading-6 opacity-55">Use the map to see whether these are geographically concentrated before treating them as isolated case failures.</p></div><Link href="/partner/map" className="inline-flex items-center gap-1 text-sm font-semibold">Open map <ArrowUpRight size={14}/></Link></section>

  <section className="pt-9"><p className="mb-4 text-[11px] font-bold uppercase tracking-[.14em] opacity-35">Take the record out</p><ExportStudio/></section>
 </div></main>
}

function Metric({value,label,note,hot=false}:{value:number;label:string;note:string;hot?:boolean}){return <div className="py-6 sm:border-r sm:border-[#0b1e3d]/10 sm:px-6 sm:first:pl-0 sm:last:border-r-0"><b className={`block text-4xl font-semibold tracking-[-.055em] tabular-nums ${hot?"text-[#f05b40]":""}`}>{value.toLocaleString()}</b><span className="mt-2 block text-sm font-semibold">{label}</span><small className="mt-1 block text-xs opacity-45">{note}</small></div>}
function Rank({i,title,meta}:{i:number;title:string;meta:string}){return <div className="grid grid-cols-[26px_1fr] gap-3 py-3"><span className="text-xs tabular-nums opacity-25">0{i+1}</span><span><b className="block truncate text-sm">{title}</b><small className="mt-0.5 block text-xs opacity-45">{meta}</small></span></div>}
function Signal({title,intro,children}:{title:string;intro:string;children:React.ReactNode}){return <section className="py-8 lg:border-r lg:border-[#0b1e3d]/10 lg:px-7 lg:first:pl-0 lg:last:border-r-0"><h2 className="text-lg font-semibold tracking-[-.025em]">{title}</h2><p className="mt-1 min-h-10 text-xs leading-5 opacity-50">{intro}</p><div className="mt-4">{children}</div></section>}
function Empty({children}:{children:React.ReactNode}){return <p className="py-5 text-sm opacity-45">{children}</p>}
