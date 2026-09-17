"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, HeartPulse, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyAnimals } from "@/lib/animal-actions";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";

const closed=(status:string|null)=>["resolved","closed"].includes(String(status??"").toLowerCase());
const followDone=(status:string|null)=>["done","completed","cancelled","canceled","missed"].includes(String(status??"").toLowerCase());
const careMatch=(row:PartnerRecordRow,re:RegExp)=>row.kind==="care"&&re.test(row.subtype.toLowerCase());
const pct=(n:number,d:number)=>d?Math.round((n/d)*100):0;

export function PartnerRecordHome(){
 const {user,ready}=useAuth();
 const [rows,setRows]=useState<PartnerRecordRow[]|null>(null),[animals,setAnimals]=useState(0);
 useEffect(()=>{if(!ready||!user)return;Promise.all([getPartnerRecordRows(),getMyAnimals()]).then(([r,a])=>{setRows(r);setAnimals(a.length)}).catch(()=>{setRows([]);setAnimals(0)})},[ready,user?.id]);
 const stats=useMemo(()=>{
  const all=rows??[],now=new Date(),currentYear=now.getFullYear(),firstYear=currentYear-2,rescues=all.filter(r=>r.kind==="rescue"),care=all.filter(r=>r.kind==="care"),follow=all.filter(r=>r.kind==="follow_up");
  const open=rescues.filter(r=>!closed(r.status)),completed=rescues.filter(r=>closed(r.status));
  const validFollow=follow.filter(r=>{const d=new Date(r.date);return Number.isFinite(+d)&&d.getFullYear()>=firstYear&&d.getFullYear()<=currentYear});
  const overdue=validFollow.filter(r=>!followDone(r.status)&&+new Date(r.date)<+now),next7=validFollow.filter(r=>!followDone(r.status)&&+new Date(r.date)>=+now&&+new Date(r.date)<=+now+7*86400000);
  const treatment=care.filter(r=>careMatch(r,/treat|chemo|tvt|surgery|wound|diagnostic|rehab|medicine|admission/)).length;
  const vaccination=care.filter(r=>careMatch(r,/vaccin|rabies|arv/)).length;
  const sterilisation=care.filter(r=>careMatch(r,/sterili|abc|spay|neuter/)).length;
  const localityMap=new Map<string,number>();for(const r of [...rescues,...care]){const k=r.locality||"Not recorded";localityMap.set(k,(localityMap.get(k)??0)+1)}
  return{rescues,open,completed,care,overdue,next7,treatment,vaccination,sterilisation,completionRate:pct(completed.length,rescues.length),localities:[...localityMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5)};
 },[rows]);
 const maxLocality=Math.max(1,...stats.localities.map(([,n])=>n));
 if(rows===null)return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-bark-500">Loading organisation dashboard…</main>;
 return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <header className="flex flex-col gap-4 border-b border-black/[.09] pb-6 sm:flex-row sm:items-end sm:justify-between"><div><span className="text-[11px] font-semibold uppercase tracking-[.18em] text-paw-600">Organisation dashboard</span><h1 className="mt-1 text-3xl font-semibold tracking-tight">What needs attention</h1><p className="mt-2 max-w-2xl text-sm text-bark-500">The dashboard is for decisions. Detailed rows stay in Records; deeper patterns stay in Analytics.</p></div><Link href="/partner/records" className="btn-primary min-h-11 px-4"><Search size={15}/>Open records</Link></header>

  <section className="mt-6 grid gap-3 md:grid-cols-3">
   <ActionCard icon={<AlertTriangle size={17}/>} label="Open rescue cases" value={stats.open.length} detail="Cases still waiting for closure." href="/partner/records?view=rescue" urgent={stats.open.length>0}/>
   <ActionCard icon={<CalendarClock size={17}/>} label="Overdue follow-ups" value={stats.overdue.length} detail={`${stats.next7.length} more due in the next 7 days.`} href="/partner/records?view=overdue" urgent={stats.overdue.length>0}/>
   <ActionCard icon={<CheckCircle2 size={17}/>} label="Case completion" value={`${stats.completionRate}%`} detail={`${stats.completed.length.toLocaleString()} of ${stats.rescues.length.toLocaleString()} rescue cases closed or resolved.`} href="/partner/records?view=outcome"/>
  </section>

  <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.9fr]">
   <section className="rounded-xl border border-black/[.08] bg-white p-5"><div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Work delivered</h2><p className="mt-1 text-xs leading-5 text-bark-500">The care categories NGOs already track, separated into usable counts instead of buried in spreadsheets.</p></div><Link href="/partner/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-paw-600">Analytics <ArrowUpRight size={13}/></Link></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><SimpleMetric label="Treatment / medical" value={stats.treatment}/><SimpleMetric label="Rabies / vaccination" value={stats.vaccination}/><SimpleMetric label="ABC / sterilisation" value={stats.sterilisation}/></div><div className="mt-4 flex items-center justify-between border-t border-black/[.07] pt-4 text-sm"><span className="flex items-center gap-2"><HeartPulse size={15}/>All recorded care</span><b>{stats.care.length.toLocaleString()}</b></div></section>

   <section className="rounded-xl border border-black/[.08] bg-white p-5"><div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Where work is concentrated</h2><p className="mt-1 text-xs leading-5 text-bark-500">Top localities by rescue and care workload. Useful for field planning, not a population estimate.</p></div><Link href="/partner/map" className="inline-flex items-center gap-1 text-xs font-semibold text-paw-600">Map <ArrowUpRight size={13}/></Link></div><div className="mt-4">{stats.localities.map(([place,n])=><Bar key={place} label={place} value={n} max={maxLocality}/>)}</div></section>
  </div>

  <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/[.08] bg-[#f7f5ef] p-5"><div><h2 className="text-sm font-semibold">Need the underlying rows?</h2><p className="mt-1 text-xs text-bark-500">Use Records for search, filters, cohorts and export. Use Analytics only when you need patterns across the work.</p></div><div className="flex gap-2"><Link href="/partner/records" className="rounded-lg border border-black/[.1] bg-white px-4 py-2 text-sm font-semibold">Records</Link><Link href="/partner/reports" className="rounded-lg bg-[#0b1e3d] px-4 py-2 text-sm font-semibold text-white">Analytics</Link></div></section>
 </main>
}

function ActionCard({icon,label,value,detail,href,urgent=false}:{icon:React.ReactNode;label:string;value:number|string;detail:string;href:string;urgent?:boolean}){return <Link href={href} className="rounded-xl border border-black/[.08] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"><div className={`inline-flex rounded-lg p-2 ${urgent?"bg-orange-50 text-orange-700":"bg-paw-50 text-paw-700"}`}>{icon}</div><strong className="mt-5 block text-4xl tabular-nums tracking-tight">{typeof value==="number"?value.toLocaleString():value}</strong><span className="mt-1 block text-sm font-semibold">{label}</span><small className="mt-1 block text-xs leading-5 text-bark-500">{detail}</small></Link>}
function SimpleMetric({label,value}:{label:string;value:number}){return <div className="rounded-lg bg-black/[.025] p-4"><strong className="text-2xl tabular-nums">{value.toLocaleString()}</strong><span className="mt-1 block text-xs font-semibold">{label}</span></div>}
function Bar({label,value,max}:{label:string;value:number;max:number}){return <div className="mt-3"><div className="flex justify-between gap-3 text-xs"><span className="truncate capitalize">{label}</span><b>{value.toLocaleString()}</b></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[.06]"><div className="h-full rounded-full bg-[#2457ce]" style={{width:`${Math.max(4,(value/max)*100)}%`}}/></div></div>}
