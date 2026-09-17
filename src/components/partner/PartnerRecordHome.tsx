"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, HeartPulse, MapPin, Search, Syringe } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyAnimals } from "@/lib/animal-actions";
import { programmeBreakdown, type Breakdown } from "@/lib/campaigns";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";

const closed=(status:string|null)=>["resolved","closed"].includes(String(status??"").toLowerCase());
const followDone=(status:string|null)=>["done","completed","cancelled","canceled","missed"].includes(String(status??"").toLowerCase());
const careMatch=(row:PartnerRecordRow,re:RegExp)=>row.kind==="care"&&re.test(row.subtype.toLowerCase());
const pct=(n:number,d:number)=>d?Math.round((n/d)*100):0;

export function PartnerRecordHome(){
 const {user,ready}=useAuth();
 const [rows,setRows]=useState<PartnerRecordRow[]|null>(null),[animals,setAnimals]=useState(0),[breakdown,setBreakdown]=useState<Breakdown|null>(null);
 useEffect(()=>{if(!ready||!user)return;Promise.all([getPartnerRecordRows(),getMyAnimals(),programmeBreakdown()]).then(([r,a,b])=>{setRows(r);setAnimals(a.length);setBreakdown(b)}).catch(()=>{setRows([]);setAnimals(0)})},[ready,user?.id]);
 const stats=useMemo(()=>{
  const all=rows??[],now=Date.now(),rescues=all.filter(r=>r.kind==="rescue"),care=all.filter(r=>r.kind==="care"),follow=all.filter(r=>r.kind==="follow_up"),outcomes=all.filter(r=>r.kind==="outcome");
  const open=rescues.filter(r=>!closed(r.status)),completed=rescues.filter(r=>closed(r.status));
  const overdue=follow.filter(r=>!followDone(r.status)&&+new Date(r.date)<now),next7=follow.filter(r=>!followDone(r.status)&&+new Date(r.date)>=now&&+new Date(r.date)<=now+7*86400000);
  const vaccination=care.filter(r=>careMatch(r,/vaccin|rabies|arv/)).length,sterilisation=care.filter(r=>careMatch(r,/sterili|abc|spay|neuter/)).length,treatment=care.filter(r=>careMatch(r,/treat|chemo|tvt|surgery|wound|diagnostic|rehab|medicine|admission/)).length;
  const otherCare=Math.max(0,care.length-vaccination-sterilisation-treatment);
  const outcomeMap=new Map<string,number>();for(const r of outcomes)outcomeMap.set(r.subtype,(outcomeMap.get(r.subtype)??0)+1);
  const localityMap=new Map<string,number>();for(const r of [...rescues,...care]){const k=r.locality||"Not recorded";localityMap.set(k,(localityMap.get(k)??0)+1)}
  const months=Array.from({length:12},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(11-i));const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;return{key,label:d.toLocaleDateString("en-IN",{month:"short"}),rescue:0,care:0}});
  const monthBy=new Map(months.map(m=>[m.key,m]));for(const r of [...rescues,...care]){const d=new Date(r.date);if(Number.isNaN(+d))continue;const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;const m=monthBy.get(key);if(m){if(r.kind==="rescue")m.rescue++;else m.care++}}
  const missingLocality=all.filter(r=>r.kind!=="follow_up"&&!r.locality).length;
  const closedWithoutOutcome=completed.filter(r=>!outcomes.some(o=>o.caseId&&o.caseId===r.caseId)).length;
  return{rescues,open,completed,care,follow,outcomes,overdue,next7,vaccination,sterilisation,treatment,otherCare,outcomeRows:[...outcomeMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5),localities:[...localityMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6),months,missingLocality,closedWithoutOutcome,completionRate:pct(completed.length,rescues.length)};
 },[rows]);
 const maxMonth=Math.max(1,...stats.months.map(m=>m.rescue+m.care)),maxLocality=Math.max(1,...stats.localities.map(([,n])=>n)),careTotal=Math.max(1,stats.care.length);
 const activeDrives=breakdown?.drives.filter(d=>!d.archived).length??0;
 if(rows===null)return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-bark-500">Loading organisation dashboard…</main>;
 return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
  <header className="flex flex-col gap-4 border-b border-black/[.09] pb-6 dark:border-white/[.1] sm:flex-row sm:items-end sm:justify-between"><div><span className="text-[11px] font-semibold uppercase tracking-[.18em] text-paw-600">Organisation dashboard</span><h1 className="mt-1 text-3xl font-semibold tracking-tight">Field operations at a glance</h1><p className="mt-2 max-w-3xl text-sm text-bark-500">What needs action now, what your team is delivering, and what the historical record says about workload and outcomes.</p></div><Link href="/partner/records" className="btn-primary min-h-11 px-4"><Search size={15}/>Open records</Link></header>

  <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
   <Metric icon={<AlertTriangle size={16}/>} label="Open rescues" value={stats.open.length} detail={`${stats.rescues.length.toLocaleString()} total`} href="/partner/records?view=rescue" urgent={stats.open.length>0}/>
   <Metric icon={<CalendarClock size={16}/>} label="Overdue follow-ups" value={stats.overdue.length} detail={`${stats.next7.length} due next 7 days`} href="/partner/records?view=overdue" urgent={stats.overdue.length>0}/>
   <Metric icon={<CheckCircle2 size={16}/>} label="Case completion" value={`${stats.completionRate}%`} detail={`${stats.completed.length.toLocaleString()} closed/resolved`} href="/partner/records?view=outcome"/>
   <Metric icon={<HeartPulse size={16}/>} label="Care events" value={stats.care.length} detail={`${stats.treatment.toLocaleString()} treatment`} href="/partner/records?view=care"/>
   <Metric icon={<MapPin size={16}/>} label="Animals" value={animals} detail={`${activeDrives} active programmes`} href="/partner/animals"/>
  </section>

  <div className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
   <Panel title="12-month field activity" lede="Rescue intake and care events by source event date — not import date.">
    <div className="mt-5 flex h-52 items-end gap-2 border-b border-black/[.08] px-1">{stats.months.map(m=>{const total=m.rescue+m.care;return <div key={m.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"><div className="relative flex min-h-1 w-full flex-col justify-end overflow-hidden rounded-t bg-black/[.05]" style={{height:`${Math.max(4,(total/maxMonth)*100)}%`}}><div className="w-full bg-[#2457ce]" style={{height:`${total?Math.max(8,(m.rescue/total)*100):0}%`}}/><div className="w-full bg-[#f05b40]" style={{height:`${total?Math.max(8,(m.care/total)*100):0}%`}}/></div><span className="text-center text-[10px] opacity-55">{m.label}</span></div>})}</div>
    <div className="mt-3 flex gap-5 text-xs"><span className="flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[#2457ce]"/>Rescue/intake</span><span className="flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[#f05b40]"/>Care</span></div>
   </Panel>
   <Panel title="Action queue" lede="Things the team can act on today."><Action href="/partner/records?view=overdue" label="Overdue follow-ups" value={stats.overdue.length}/><Action href="/partner/records?view=follow_up" label="Due in next 7 days" value={stats.next7.length}/><Action href="/partner/records?view=rescue" label="Open rescue cases" value={stats.open.length}/><Action href="/partner/quality" label="Records missing locality" value={stats.missingLocality}/><Action href="/partner/quality" label="Closed without structured outcome" value={stats.closedWithoutOutcome}/></Panel>
  </div>

  <div className="mt-5 grid gap-5 lg:grid-cols-3">
   <Panel title="Care mix" lede="What the team is actually delivering."><Mix label="Treatment / medical" value={stats.treatment} total={careTotal}/><Mix label="Rabies / vaccination" value={stats.vaccination} total={careTotal}/><Mix label="ABC / sterilisation" value={stats.sterilisation} total={careTotal}/><Mix label="Other care" value={stats.otherCare} total={careTotal}/><Link href="/partner/reports" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-paw-600">Open full analytics <ArrowUpRight size={13}/></Link></Panel>
   <Panel title="Top localities" lede="Where rescue and care workload concentrates.">{stats.localities.map(([place,n])=><Bar key={place} label={place} value={n} max={maxLocality}/>)}<Link href="/partner/map" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-paw-600">View field map <ArrowUpRight size={13}/></Link></Panel>
   <Panel title="Recorded outcomes" lede="The most common structured outcomes.">{stats.outcomeRows.length?stats.outcomeRows.map(([label,n])=><Bar key={label} label={label.replace(/_/g," ")} value={n} max={Math.max(1,...stats.outcomeRows.map(([,v])=>v))}/>):<p className="mt-4 text-sm opacity-55">No structured outcomes yet.</p>}<Link href="/partner/records?view=outcome" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-paw-600">Open outcome records <ArrowUpRight size={13}/></Link></Panel>
  </div>

  <section className="mt-6 grid gap-4 md:grid-cols-3"><Insight icon={<Syringe size={17}/>} title="Vaccination evidence" value={stats.vaccination} text="Explicit ARV/vaccination events, separated from text mentions." href="/partner/records?view=vaccination"/><Insight icon={<HeartPulse size={17}/>} title="Treatment evidence" value={stats.treatment} text="TVT, wound care, surgery, diagnostics, rehabilitation and treatment events." href="/partner/records?view=treatment"/><Insight icon={<MapPin size={17}/>} title="Programme coverage" value={breakdown?.drives.length??0} text="Drive-level coverage stays separate from case counts so reports remain defensible." href="/partner/reports"/></section>
 </main>
}

function Metric({icon,label,value,detail,href,urgent=false}:{icon:React.ReactNode;label:string;value:number|string;detail:string;href:string;urgent?:boolean}){return <Link href={href} className="rounded-xl border border-black/[.08] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/[.1] dark:bg-bark-950"><div className={`mb-4 inline-flex rounded-lg p-2 ${urgent?"bg-orange-50 text-orange-700":"bg-paw-50 text-paw-700"}`}>{icon}</div><strong className="block text-3xl tabular-nums tracking-tight">{typeof value==="number"?value.toLocaleString():value}</strong><span className="mt-1 block text-sm font-semibold">{label}</span><small className="mt-1 block text-xs text-bark-500">{detail}</small></Link>}
function Panel({title,lede,children}:{title:string;lede:string;children:React.ReactNode}){return <section className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-bark-950"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-bark-500">{lede}</p>{children}</section>}
function Action({href,label,value}:{href:string;label:string;value:number}){return <Link href={href} className="flex items-center justify-between border-b border-black/[.07] py-3 text-sm"><span>{label}</span><b className="tabular-nums">{value.toLocaleString()}</b></Link>}
function Mix({label,value,total}:{label:string;value:number;total:number}){const p=Math.round((value/Math.max(1,total))*100);return <div className="mt-4"><div className="flex justify-between text-xs"><span>{label}</span><b>{value.toLocaleString()} · {p}%</b></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[#2457ce]" style={{width:`${p}%`}}/></div></div>}
function Bar({label,value,max}:{label:string;value:number;max:number}){return <div className="mt-3"><div className="flex justify-between gap-3 text-xs"><span className="truncate capitalize">{label}</span><b>{value.toLocaleString()}</b></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[#0b1e3d]" style={{width:`${Math.max(4,(value/max)*100)}%`}}/></div></div>}
function Insight({icon,title,value,text,href}:{icon:React.ReactNode;title:string;value:number;text:string;href:string}){return <Link href={href} className="rounded-xl border border-black/[.08] bg-[#f7f5ef] p-5 transition hover:border-black/20"><div className="flex items-center justify-between"><span className="inline-flex rounded-lg bg-white p-2">{icon}</span><ArrowUpRight size={15}/></div><strong className="mt-5 block text-3xl tabular-nums">{value.toLocaleString()}</strong><h3 className="mt-1 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-bark-500">{text}</p></Link>}
