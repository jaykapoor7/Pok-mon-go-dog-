"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { getMyAnimals } from "@/lib/animal-actions";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";

export function DataQualityClient(){
 const [animals,setAnimals]=useState<Awaited<ReturnType<typeof getMyAnimals>>|null>(null);
 const [records,setRecords]=useState<PartnerRecordRow[]|null>(null);
 useEffect(()=>{Promise.all([getMyAnimals(),getPartnerRecordRows()]).then(([a,r])=>{setAnimals(a);setRecords(r)}).catch(()=>{setAnimals([]);setRecords([])})},[]);
 const issues=useMemo(()=>{
  if(!animals||!records)return null;
  const now=Date.now(),outcomeByCase=new Set(records.filter(r=>r.kind==="outcome"&&r.caseId).map(r=>r.caseId!));
  const latestCare=new Map<string,number>(),latestFollow=new Map<string,number>();
  for(const r of records){if(!r.animalId)continue;const t=Date.parse(r.date)||0;if(r.kind==="care")latestCare.set(r.animalId,Math.max(latestCare.get(r.animalId)||0,t));if(r.kind==="follow_up")latestFollow.set(r.animalId,Math.max(latestFollow.get(r.animalId)||0,t));}
  const missingCode=animals.filter(a=>!a.code?.trim());
  const missingLocality=animals.filter(a=>!a.zone?.trim());
  const staleOpen=records.filter(r=>r.kind==="rescue"&&!/resolved|closed/i.test(r.status||"")&&now-(Date.parse(r.date)||now)>30*86400000);
  const completedNoOutcome=records.filter(r=>r.kind==="rescue"&&/resolved|closed/i.test(r.status||"")&&r.caseId&&!outcomeByCase.has(r.caseId));
  const careNoFollow=animals.filter(a=>{const c=latestCare.get(a.id)||0;return c>0&&(latestFollow.get(a.id)||0)<c;});
  return {missingCode,missingLocality,staleOpen,completedNoOutcome,careNoFollow};
 },[animals,records]);
 if(!issues)return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin"/></div>;
 const rows=[
  {title:"Animals missing ID",count:issues.missingCode.length,detail:"Harder to match across visits, spreadsheets and clinics.",href:"/partner/animals"},
  {title:"Animals missing locality",count:issues.missingLocality.length,detail:"Cannot support ward/locality reporting or repeat-hotspot work.",href:"/partner/animals"},
  {title:"Open for 30+ days",count:issues.staleOpen.length,detail:"Rescue records still open long after the recorded intake date.",href:"/partner/records?status=open"},
  {title:"Completed without structured outcome",count:issues.completedNoOutcome.length,detail:"Closed cases where the result is not represented as a first-class outcome.",href:"/partner/records?type=outcome"},
  {title:"Care recorded after last follow-up",count:issues.careNoFollow.length,detail:"Animals with medical care but no later review/follow-up entry.",href:"/partner/records?type=follow_up"},
 ];
 return <div><header className="mb-6"><span className="product-kicker">Record quality</span><h1 className="mt-1 text-2xl font-semibold">What needs cleaning</h1><p className="mt-2 max-w-2xl text-sm opacity-70">These are fixable gaps in your working record, not scores. Open a section, correct the source record, and the issue disappears.</p></header><div className="border-t border-black/[.1]">{rows.map(r=><Link key={r.title} href={r.href} className="grid gap-2 border-b border-black/[.08] py-5 hover:bg-black/[.02] sm:grid-cols-[260px_90px_1fr_20px] sm:items-center"><b className="text-sm">{r.title}</b><strong className="text-2xl tabular-nums">{r.count.toLocaleString()}</strong><span className="text-xs leading-5 opacity-65">{r.detail}</span><ArrowUpRight size={15}/></Link>)}</div></div>;
}
