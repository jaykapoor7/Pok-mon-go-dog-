"use client";

import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import { ArrowLeft,ArrowRight,ArrowUpRight,Download,Search,SlidersHorizontal } from "lucide-react";
import { getPartnerRecordRows,type PartnerRecordKind,type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE=100;
const PRIMARY:Array<{id:"all"|PartnerRecordKind;label:string}>=[
 {id:"all",label:"All"},{id:"rescue",label:"Rescues"},{id:"care",label:"Care"},{id:"follow_up",label:"Follow-ups"},{id:"outcome",label:"Outcomes"}
];
const ATTENTION=[{id:"overdue",label:"Overdue"},{id:"due_today",label:"Due today"},{id:"upcoming",label:"Upcoming"}] as const;
function pending(row:PartnerRecordRow){if(row.kind!=="follow_up")return false;return !["done","completed","cancelled","canceled","missed"].includes(String(row.status??"").toLowerCase())}
function dayStart(){const d=new Date();d.setHours(0,0,0,0);return +d}
function matches(row:PartnerRecordRow,filter:string){
 if(filter==="all")return true;if(filter==="overdue")return pending(row)&&+new Date(row.date)<dayStart();
 if(filter==="due_today"){const t=+new Date(row.date);return pending(row)&&t>=dayStart()&&t<dayStart()+86400000}
 if(filter==="upcoming"){const t=+new Date(row.date);return pending(row)&&t>=dayStart()+86400000&&t<dayStart()+15*86400000}
 if(filter==="vaccination")return row.kind==="care"&&/vaccin|rabies|arv/.test(row.subtype.toLowerCase());
 if(filter==="sterilisation")return row.kind==="care"&&/sterili|abc|spay|neuter/.test(row.subtype.toLowerCase());
 if(filter==="treatment")return row.kind==="care"&&/treat|chemo|tvt|surgery|wound|diagnostic|rehab|medicine|admission/.test(row.subtype.toLowerCase());
 return row.kind===filter;
}
function destination(row:PartnerRecordRow){if(row.caseId)return `/partner/cases/${row.caseId}`;if(row.animalId)return `/partner/animals/${row.animalId}`;return "/partner/records"}
const esc=(v:unknown)=>{const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};

export function PartnerRecordExplorer({initialFilter="all"}:{initialFilter?:string}){
 const [rows,setRows]=useState<PartnerRecordRow[]|null>(null),[query,setQuery]=useState(""),[filter,setFilter]=useState(initialFilter),[locality,setLocality]=useState(""),[year,setYear]=useState(""),[species,setSpecies]=useState(""),[status,setStatus]=useState(""),[subtype,setSubtype]=useState(""),[sort,setSort]=useState("newest"),[page,setPage]=useState(1);
 useEffect(()=>{getPartnerRecordRows().then(setRows).catch(()=>setRows([]))},[]);
 const options=useMemo(()=>{const r=rows??[];return{localities:[...new Set(r.map(x=>x.locality).filter(Boolean) as string[])].sort(),years:[...new Set(r.map(x=>String(new Date(x.date).getFullYear())).filter(x=>x!=="NaN"))].sort((a,b)=>b.localeCompare(a)),species:[...new Set(r.map(x=>x.species).filter(Boolean) as string[])].sort(),statuses:[...new Set(r.map(x=>x.status).filter(Boolean) as string[])].sort(),subtypes:[...new Set(r.map(x=>x.subtype).filter(Boolean))].sort()}},[rows]);
 const visible=useMemo(()=>{if(!rows)return[];const q=query.trim().toLowerCase();return rows.filter(r=>matches(r,filter)&&(!locality||r.locality===locality)&&(!year||String(new Date(r.date).getFullYear())===year)&&(!species||r.species===species)&&(!status||r.status===status)&&(!subtype||r.subtype===subtype)&&(!q||[r.title,r.detail,r.locality,r.animalLabel,r.straypawId,r.sourceCode,r.subtype,r.status,r.species].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)))).sort((a,b)=>sort==="oldest"?+new Date(a.date)-+new Date(b.date):sort==="locality"?String(a.locality??"").localeCompare(String(b.locality??"")):sort==="status"?String(a.status??"").localeCompare(String(b.status??"")):+new Date(b.date)-+new Date(a.date))},[rows,query,filter,locality,year,species,status,subtype,sort]);
 const pages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE)),safe=Math.min(page,pages),shown=visible.slice((safe-1)*PAGE_SIZE,safe*PAGE_SIZE);
 const attention=useMemo(()=>({overdue:(rows??[]).filter(r=>matches(r,"overdue")).length,today:(rows??[]).filter(r=>matches(r,"due_today")).length,upcoming:(rows??[]).filter(r=>matches(r,"upcoming")).length}),[rows]);
 function reset(){setQuery("");setFilter("all");setLocality("");setYear("");setSpecies("");setStatus("");setSubtype("");setSort("newest");setPage(1)}
 function exportCsv(){const cols=["date","type","straypaw_id","source_organisation_id","animal","species","locality","status","detail","case_id"],body=visible.map(r=>[r.date,r.subtype,r.straypawId,r.sourceCode,r.animalLabel,r.species,r.locality,r.status,r.detail,r.caseId].map(esc).join(","));const blob=new Blob([[cols.join(","),...body].join("\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`straypaw-records-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}
 const change=(fn:(v:string)=>void)=>(v:string)=>{fn(v);setPage(1)};
 return <section>
  <div className="grid gap-4 border-y border-[#0b1e3d]/10 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
   <label className="flex h-12 items-center gap-3 border-b border-[#0b1e3d]/20 bg-transparent px-0"><Search size={17} className="opacity-35"/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Search animal, StrayPaw ID, locality, treatment…" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#0b1e3d]/30"/></label>
   <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">
    <button onClick={()=>{setFilter("overdue");setPage(1)}} className={filter==="overdue"?"text-[#f05b40]":"opacity-55"}>{attention.overdue} overdue</button>
    <button onClick={()=>{setFilter("due_today");setPage(1)}} className={filter==="due_today"?"text-[#2457ce]":"opacity-55"}>{attention.today} due today</button>
    <button onClick={()=>{setFilter("upcoming");setPage(1)}} className={filter==="upcoming"?"text-[#2457ce]":"opacity-55"}>{attention.upcoming} upcoming</button>
   </div>
  </div>

  <div className="flex flex-col gap-4 border-b border-[#0b1e3d]/10 py-4 sm:flex-row sm:items-center sm:justify-between">
   <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Record type">{PRIMARY.map(x=><button key={x.id} onClick={()=>{setFilter(x.id);setPage(1)}} className={`text-sm font-semibold ${filter===x.id?"text-[#0b1e3d]":"text-[#0b1e3d]/35"}`}>{x.label}</button>)}</nav>
   <details className="group relative"><summary className="inline-flex cursor-pointer list-none items-center gap-2 text-xs font-semibold opacity-55"><SlidersHorizontal size={13}/>Refine</summary><div className="mt-3 grid gap-2 border-l border-[#0b1e3d]/10 pl-4 sm:absolute sm:right-0 sm:z-20 sm:w-[620px] sm:grid-cols-3 sm:border sm:bg-[#f4f1e9] sm:p-4 sm:shadow-lg"><Select value={subtype} onChange={change(setSubtype)} label="All record types" items={options.subtypes}/><Select value={year} onChange={change(setYear)} label="All years" items={options.years}/><Select value={locality} onChange={change(setLocality)} label="All localities" items={options.localities}/><Select value={species} onChange={change(setSpecies)} label="All species" items={options.species}/><Select value={status} onChange={change(setStatus)} label="All statuses" items={options.statuses}/><select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} className="h-10 border border-[#0b1e3d]/10 bg-transparent px-2 text-xs"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="locality">Locality A–Z</option><option value="status">Status A–Z</option></select></div></details>
  </div>

  <div className="flex items-center justify-between gap-4 py-4 text-xs"><span className="opacity-45">{rows===null?"Loading records…":`${visible.length.toLocaleString()} records in this view`}</span><div className="flex gap-4 font-semibold"><button onClick={reset} className="opacity-55">Clear</button><button onClick={exportCsv} disabled={!visible.length} className="inline-flex items-center gap-1 text-[#2457ce] disabled:opacity-30"><Download size={13}/>Export</button></div></div>

  <div className="border-t border-[#0b1e3d]/10">
   <div className="hidden grid-cols-[105px_145px_minmax(0,1fr)_135px_120px] gap-4 border-b border-[#0b1e3d]/10 py-2 text-[10px] font-bold uppercase tracking-[.1em] opacity-35 sm:grid"><span>Date</span><span>Record</span><span>Animal / detail</span><span>Locality</span><span>Status</span></div>
   {rows!==null&&visible.length===0?<p className="py-10 text-sm opacity-45">No records match this view.</p>:shown.map(row=><Link key={row.id} href={destination(row)} className="group grid gap-2 border-b border-[#0b1e3d]/8 py-4 transition hover:bg-white/35 sm:grid-cols-[105px_145px_minmax(0,1fr)_135px_120px] sm:items-center sm:gap-4"><time className="text-xs tabular-nums opacity-45">{formatDate(row.date)}</time><span className="text-xs font-semibold capitalize text-[#2457ce]">{row.subtype.replace(/_/g," ")}</span><span className="min-w-0"><span className="flex items-center gap-2"><b className="truncate text-sm">{row.animalLabel||row.title}</b>{row.straypawId&&<small className="shrink-0 font-mono text-[9px] opacity-35">{row.straypawId}</small>}</span><small className="mt-1 block truncate text-xs opacity-45">{row.detail||row.title}</small></span><span className="truncate text-xs opacity-50">{row.locality||"Not recorded"}</span><span className="flex items-center justify-between gap-2 text-xs capitalize opacity-55">{row.status||"—"}<ArrowUpRight size={13} className="opacity-0 transition group-hover:opacity-70"/></span></Link>)}
  </div>
  {visible.length>PAGE_SIZE&&<div className="flex items-center justify-between py-5 text-xs"><button disabled={safe<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="inline-flex items-center gap-1 font-semibold disabled:opacity-25"><ArrowLeft size={13}/>Previous</button><span className="opacity-45">{safe} / {pages}</span><button disabled={safe>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="inline-flex items-center gap-1 font-semibold disabled:opacity-25">Next <ArrowRight size={13}/></button></div>}
 </section>
}
function Select({value,onChange,label,items}:{value:string;onChange:(v:string)=>void;label:string;items:string[]}){return <select value={value} onChange={e=>onChange(e.target.value)} className="h-10 border border-[#0b1e3d]/10 bg-transparent px-2 text-xs"><option value="">{label}</option>{items.map(item=><option key={item} value={item}>{item.replace(/_/g," ")}</option>)}</select>}
