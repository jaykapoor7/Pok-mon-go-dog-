"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { PrintButton } from "@/components/partner/PrintButton";
import { ConsolePage } from "./ConsolePage";
import { ProgrammeBreakdown } from "@/components/partner/ProgrammeBreakdown";
import { ExportStudio } from "@/components/partner/ExportStudio";

const closed=(status:string|null)=>["resolved","closed"].includes(String(status??"").toLowerCase());
const followDone=(status:string|null)=>["done","completed"].includes(String(status??"").toLowerCase());
const followMissed=(status:string|null)=>["missed","cancelled","canceled"].includes(String(status??"").toLowerCase());
const careMatch=(row:PartnerRecordRow,re:RegExp)=>row.kind==="care"&&re.test(row.subtype.toLowerCase());

export function ReportsClient(){
 const [rows,setRows]=useState<PartnerRecordRow[]|null>(null);
 useEffect(()=>{getPartnerRecordRows().then(setRows).catch(()=>setRows([]))},[]);
 const stats=useMemo(()=>{
  const all=rows??[],rescues=all.filter(r=>r.kind==="rescue"),followups=all.filter(r=>r.kind==="follow_up"),outcomes=all.filter(r=>r.kind==="outcome"),care=all.filter(r=>r.kind==="care"),now=Date.now();
  const openRescues=rescues.filter(r=>!closed(r.status));
  const overdue=followups.filter(r=>!followDone(r.status)&&!followMissed(r.status)&&+new Date(r.date)<now);
  const upcoming=followups.filter(r=>!followDone(r.status)&&!followMissed(r.status)&&+new Date(r.date)>=now);
  const vaccination=care.filter(r=>careMatch(r,/vaccin|rabies|arv/));
  const sterilisation=care.filter(r=>careMatch(r,/sterili|abc|spay|neuter/));
  const treatment=care.filter(r=>careMatch(r,/treat|chemo|tvt|surgery|wound|diagnostic|rehab|medicine|admission/));
  const completedFollowups=followups.filter(r=>followDone(r.status)),missedFollowups=followups.filter(r=>followMissed(r.status));
  const outcomeCounts=new Map<string,number>();for(const r of outcomes)outcomeCounts.set(r.subtype,(outcomeCounts.get(r.subtype)??0)+1);
  const localityCounts=new Map<string,number>();for(const r of all.filter(r=>r.kind!=="follow_up")){const key=r.locality||"Locality not recorded";localityCounts.set(key,(localityCounts.get(key)??0)+1)}
  const years=new Map<string,{rescue:number;care:number;follow:number;outcome:number}>();for(const r of all){const y=String(new Date(r.date).getFullYear());if(y==="NaN")continue;const value=years.get(y)??{rescue:0,care:0,follow:0,outcome:0};if(r.kind==="rescue")value.rescue++;if(r.kind==="care")value.care++;if(r.kind==="follow_up")value.follow++;if(r.kind==="outcome")value.outcome++;years.set(y,value)}
  const journeys=new Map<string,{rescue:boolean;care:boolean;follow:boolean;outcome:boolean}>();for(const r of all){if(!r.caseId)continue;const j=journeys.get(r.caseId)??{rescue:false,care:false,follow:false,outcome:false};if(r.kind==="rescue")j.rescue=true;if(r.kind==="care")j.care=true;if(r.kind==="follow_up")j.follow=true;if(r.kind==="outcome")j.outcome=true;journeys.set(r.caseId,j)}
  const journeyRows=[...journeys.values()].filter(j=>j.rescue);
  return{rescues,openRescues,care,vaccination,sterilisation,treatment,followups,overdue,upcoming,completedFollowups,missedFollowups,outcomes,outcomeCounts,localities:[...localityCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12),years:[...years.entries()].sort((a,b)=>b[0].localeCompare(a[0])),journey:{intake:journeyRows.length,care:journeyRows.filter(j=>j.care).length,follow:journeyRows.filter(j=>j.follow).length,outcome:journeyRows.filter(j=>j.outcome).length}};
 },[rows]);
 if(rows===null)return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-paw-500"/></div>;
 return <ConsolePage kicker="Field work / reports" title="Operational report" lede="What needs action, what work was delivered, what happened next and where the workload sits." actions={<PrintButton/>}>
  <ExportStudio/>
  <Section title="Work requiring action" lede="Current queue only. Historical completed reviews stay out of this section."><div className="border-t border-black/[.09]"><Row href="/partner/records?view=rescue" label="Open rescue cases" value={stats.openRescues.length} detail="Cases not yet closed or resolved."/><Row href="/partner/records?view=overdue" label="Overdue follow-ups" value={stats.overdue.length} detail="Pending reviews or appointments whose due date has passed."/><Row href="/partner/records?view=follow_up" label="Upcoming follow-ups" value={stats.upcoming.length} detail="Pending reviews with a future due date."/></div></Section>
  <Section title="Care delivered" lede="Event-level care from the native medical record, not keyword counts from a dashboard."><div className="border-t border-black/[.09]"><Row href="/partner/records?view=vaccination" label="Rabies / vaccination" value={stats.vaccination.length} detail="Traceable vaccination and ARV events."/><Row href="/partner/records?view=sterilisation" label="ABC / sterilisation" value={stats.sterilisation.length} detail="Traceable sterilisation events."/><Row href="/partner/records?view=treatment" label="Treatment / medical" value={stats.treatment.length} detail="Treatment, TVT, surgery, wound care, diagnostics and related care."/><Row href="/partner/records?view=care" label="All care events" value={stats.care.length} detail="Every medical event on the organisation record."/></div></Section>
  <Section title="Follow-up completion" lede="Review work is separated into completed, missed/cancelled and still actionable records."><div className="border-t border-black/[.09]"><Row href="/partner/records?view=follow_up" label="Completed" value={stats.completedFollowups.length} detail="Follow-ups marked done or completed."/><Row href="/partner/records?view=follow_up" label="Missed / cancelled" value={stats.missedFollowups.length} detail="Historical or current reviews that did not happen."/><Row href="/partner/records?view=overdue" label="Still overdue" value={stats.overdue.length} detail="Outstanding work that needs attention now."/></div></Section>
  <Section title="Case journey" lede="How many rescue cases have evidence at each later stage. These are case-linked records, not a decorative funnel."><div className="border-t border-black/[.09]"><PlainRow label="Rescue / intake" value={stats.journey.intake}/><PlainRow label="Reached care" value={stats.journey.care}/><PlainRow label="Has follow-up" value={stats.journey.follow}/><PlainRow label="Has recorded outcome" value={stats.journey.outcome}/></div></Section>
  <Section title="Recorded outcomes" lede="What happened to animals and cases after intervention."><div className="border-t border-black/[.09]">{stats.outcomeCounts.size?[...stats.outcomeCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([label,n])=><PlainRow key={label} label={label.replace(/_/g," ")} value={n}/>):<p className="py-5 text-sm opacity-60">No structured outcomes recorded.</p>}</div></Section>
  <Section title="Work by locality" lede="Where rescue and care records concentrate. Use this to plan field coverage, not as a population estimate."><div className="border-t border-black/[.09]">{stats.localities.map(([place,n])=><PlainRow key={place} label={place} value={n}/>)}</div></Section>
  <Section title="Historical workload" lede="Year-by-year source history using the event dates on the records, not import time."><div className="overflow-x-auto border-t border-black/[.09]"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-black/[.08] text-left text-xs opacity-55"><th className="py-3">Year</th><th>Rescue</th><th>Care</th><th>Follow-up</th><th>Outcome</th></tr></thead><tbody>{stats.years.map(([year,v])=><tr key={year} className="border-b border-black/[.07]"><th className="py-3 text-left">{year}</th><td>{v.rescue.toLocaleString()}</td><td>{v.care.toLocaleString()}</td><td>{v.follow.toLocaleString()}</td><td>{v.outcome.toLocaleString()}</td></tr>)}</tbody></table></div></Section>
  <section className="mt-12"><div className="mb-4"><span className="text-[11px] font-semibold uppercase tracking-[.14em] text-bark-400">Programmes</span><h2 className="mt-1 text-xl font-semibold">Coverage by drive</h2><p className="mt-1 text-sm text-bark-500">Keep programme coverage separate from casework so an aggregate drive total is never mistaken for a case count.</p></div><ProgrammeBreakdown/></section>
 </ConsolePage>
}
function Section({title,lede,children}:{title:string;lede:string;children:React.ReactNode}){return <section className="mt-10"><h2 className="text-xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-bark-500">{lede}</p><div className="mt-4">{children}</div></section>}
function Row({href,label,value,detail}:{href:string;label:string;value:number;detail:string}){return <Link href={href} className="grid gap-2 border-b border-black/[.08] py-4 hover:bg-black/[.02] sm:grid-cols-[220px_100px_1fr_18px] sm:items-center"><b className="text-sm">{label}</b><strong className="text-2xl tabular-nums">{value.toLocaleString()}</strong><span className="text-xs leading-5 text-bark-500">{detail}</span><ArrowUpRight size={15}/></Link>}
function PlainRow({label,value}:{label:string;value:number}){return <div className="grid grid-cols-[1fr_100px] items-center border-b border-black/[.08] py-3"><span className="text-sm capitalize">{label}</span><strong className="text-right text-lg tabular-nums">{value.toLocaleString()}</strong></div>}
