"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { programmeCategory, programmePrimaryTotal, type PublicProgramme, type PublicProgrammeCategory } from "@/lib/public-programmes";

const FILTERS:Array<{id:"all"|PublicProgrammeCategory;label:string}>=[
 {id:"all",label:"All"},{id:"treatment",label:"Rescue & treatment"},{id:"vaccination",label:"Rabies / vaccination"},{id:"sterilisation",label:"ABC / sterilisation"},{id:"study",label:"Studies"},{id:"other",label:"Other"},
];

export function PublicProgrammeBrowser({programmes,initialKind="all"}:{programmes:PublicProgramme[];initialKind?:string}){
 const valid=FILTERS.some(f=>f.id===initialKind)?initialKind:"all";
 const [filter,setFilter]=useState(valid),[query,setQuery]=useState("");
 const shown=useMemo(()=>{const q=query.trim().toLowerCase();return programmes.filter(p=>{const category=programmeCategory(p);if(filter!=="all"&&category!==filter)return false;if(!q)return true;return[p.name,p.ngo_name,p.city,p.state,p.zone,p.public_summary,p.kind].filter(Boolean).some(v=>String(v).toLowerCase().includes(q))})},[programmes,filter,query]);
 return <section>
  <div className="flex flex-col gap-3 border-y border-black/[.09] py-4 sm:flex-row sm:items-center sm:justify-between">
   <div className="flex flex-wrap gap-2">{FILTERS.map(f=><button key={f.id} type="button" onClick={()=>setFilter(f.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter===f.id?"border-[#2457ce] bg-[#eef3ff] text-[#2457ce]":"border-black/[.1]"}`}>{f.label}</button>)}</div>
   <label className="flex min-w-64 items-center gap-2 border border-black/[.1] bg-white px-3"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search programme, organisation, place…" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
  </div>
  <div className="flex items-center justify-between py-4 text-xs opacity-60"><span>{shown.length} programme{shown.length===1?"":"s"}</span>{query&&<button onClick={()=>setQuery("")} className="font-semibold">Clear search</button>}</div>
  <div className="border-t border-black/[.09]">{shown.map(p=>{const category=programmeCategory(p),total=programmePrimaryTotal(p);return <Link key={p.id} href={`/programmes/${p.id}`} className="grid gap-2 border-b border-black/[.08] py-5 transition hover:bg-black/[.02] sm:grid-cols-[170px_minmax(0,1fr)_110px_22px] sm:items-center"><span className="text-xs font-semibold uppercase tracking-[.08em] opacity-55">{category.replace(/_/g," ")}</span><span><b className="block text-sm">{p.name}</b><small className="mt-1 block text-xs leading-5 opacity-65">{p.ngo_name}{p.city?` · ${p.city}`:""}{p.state?`, ${p.state}`:""}{p.public_summary?` — ${p.public_summary}`:""}</small></span><strong className="text-right text-2xl tabular-nums">{total.toLocaleString()}</strong><ArrowUpRight size={15}/></Link>})}{shown.length===0&&<p className="py-8 text-sm opacity-60">No published programme matches this view.</p>}</div>
 </section>
}
