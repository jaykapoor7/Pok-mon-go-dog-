"use client";

import { Download, FileText } from "lucide-react";

type Row={date:string|null;type:string;title:string;detail:string|null};
const esc=(v:unknown)=>{const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};

export function RecordExportActions({name,animalId,locality,rows}:{name:string;animalId:string;locality:string|null;rows:Row[]}){
 function download(){const csv=["animal_id,animal_name,locality,date,type,title,detail",...rows.map(r=>[animalId,name,locality,r.date,r.type,r.title,r.detail].map(esc).join(","))].join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")||"animal"}-evidence.csv`;a.click();URL.revokeObjectURL(url)}
 return <div className="flex flex-wrap gap-2"><button type="button" onClick={download} className="inline-flex h-9 items-center gap-2 border border-black/[.1] bg-white px-3 text-xs font-semibold"><Download size={14}/>Evidence CSV</button><button type="button" onClick={()=>window.print()} className="inline-flex h-9 items-center gap-2 border border-black/[.1] bg-white px-3 text-xs font-semibold"><FileText size={14}/>Print / PDF</button></div>;
}
