"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type OpsRow={id:string;sheet:string;date:string;vehicle:string;distance:string;fuel:string;driver:string;notes:string};
const clean=(v:unknown)=>String(v??"").replace(/\s+/g," ").trim();
const pick=(row:Record<string,unknown>,re:RegExp)=>{const k=Object.keys(row).find(h=>re.test(h));return k?clean(row[k]):""};

export function OperationsRegister(){
 const [rows,setRows]=useState<OpsRow[]|null>(null),[query,setQuery]=useState("");
 useEffect(()=>{(async()=>{
  const supa=getSupabase();if(!supa){setRows([]);return}
  const {data:ngoId}=await supa.rpc("my_ngo");if(!ngoId){setRows([]);return}
  const {data:batches}=await supa.from("import_batches").select("id,sheet_name").eq("ngo_id",ngoId);
  const sheetByBatch=new Map((batches??[]).map((b:any)=>[String(b.id),clean(b.sheet_name)]));
  const ids=[...sheetByBatch.keys()];if(!ids.length){setRows([]);return}
  const out:any[]=[];
  for(let i=0;i<ids.length;i+=50){
   const group=ids.slice(i,i+50);
   for(let from=0;;from+=1000){
    const {data}=await supa.from("import_rows").select("id,batch_id,raw_row,normalized").in("batch_id",group).range(from,from+999);
    out.push(...(data??[]));
    if(!data||data.length<1000)break;
   }
  }
  const mapped=out.flatMap((r:any)=>{
   const raw=(r.raw_row??{}) as Record<string,unknown>;
   const sheet=clean(r.normalized?.source_sheet||r.normalized?.sheet_name||sheetByBatch.get(String(r.batch_id))||"");
   if(!/rescu\w* van|van details|vehicle|transport/i.test(sheet))return [];
   return [{id:r.id,sheet,date:clean(r.normalized?.event_date)||pick(raw,/date|day/i),vehicle:pick(raw,/vehicle|van|number|reg/i),distance:pick(raw,/\bkm\b|kilomet|distance|odometer/i),fuel:pick(raw,/petrol|diesel|fuel|amount/i),driver:pick(raw,/driver|staff/i),notes:pick(raw,/remark|note|detail|route|place|location/i)}];
  });
  setRows(mapped)
 })().catch(()=>setRows([]))},[]);
 const shown=useMemo(()=>{const q=query.toLowerCase().trim();return (rows??[]).filter(r=>!q||Object.values(r).some(v=>v.toLowerCase().includes(q)))},[rows,query]);
 function download(){const cols=["date","vehicle","distance","fuel","driver","notes","sheet"] as const;const esc=(v:string)=>/[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;const csv=[cols.join(","),...shown.map(r=>cols.map(c=>esc(r[c])).join(","))].join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const a=document.createElement("a");a.href=url;a.download="straypaw-operations.csv";a.click();URL.revokeObjectURL(url)}
 if(rows===null)return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin"/></div>;
 return <div><header className="mb-6"><span className="product-kicker">Operations</span><h1 className="mt-1 text-2xl font-semibold">Rescue vehicle & field log</h1><p className="mt-2 max-w-2xl text-sm opacity-70">Operational rows imported from rescue-van/vehicle sheets. Sheet provenance comes from the original workbook batch when a row has not been separately labelled. Salary, rent and staff-pay records are intentionally excluded.</p></header><div className="flex flex-col gap-3 border-y border-black/[.08] py-4 sm:flex-row sm:items-center"><label className="flex flex-1 items-center gap-2 border border-black/[.1] bg-white px-3"><Search size={14}/><input className="h-10 flex-1 bg-transparent text-sm outline-none" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search vehicle, route, driver, notes…"/></label><button type="button" onClick={download} className="inline-flex h-10 items-center justify-center gap-2 border border-black/[.1] px-3 text-sm font-semibold"><Download size={14}/>Export {shown.length}</button></div>{shown.length?<div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead><tr className="border-b border-black/[.1] text-xs opacity-55"><th className="py-3">Date</th><th>Vehicle</th><th>Distance</th><th>Fuel / amount</th><th>Driver</th><th>Notes</th><th>Source</th></tr></thead><tbody>{shown.map(r=><tr key={r.id} className="border-b border-black/[.07]"><td className="py-3 pr-4">{r.date||"—"}</td><td className="pr-4">{r.vehicle||"—"}</td><td className="pr-4">{r.distance||"—"}</td><td className="pr-4">{r.fuel||"—"}</td><td className="pr-4">{r.driver||"—"}</td><td className="max-w-[320px] pr-4 text-xs leading-5 opacity-70">{r.notes||"—"}</td><td className="text-xs opacity-55">{r.sheet}</td></tr>)}</tbody></table></div>:<p className="py-10 text-sm opacity-60">No rescue-van or vehicle rows were found in this organisation’s imports.</p>}</div>;
}
