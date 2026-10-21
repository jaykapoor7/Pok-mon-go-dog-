"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { INDIA_PATH, indiaXY } from "@/sp/atlas/india-path";
import cityCoordinates from "@/data/partner-cities.json";

export type FieldPartner = {id:string;name:string;slug:string;city:string|null};
const canonical=(city:string|null)=>city==="Gauhati"?"Guwahati":city??"";

export function PartnerNetwork({partners}:{partners:FieldPartner[]}) {
 const [city,setCity]=useState("");const [hover,setHover]=useState("");
 const cities=[...new Set(partners.map(p=>canonical(p.city)).filter(Boolean))].sort();
 const visible=city?partners.filter(p=>canonical(p.city)===city):partners;
 const current=hover||city;
 return <section className="care-partners partner-network" aria-labelledby="partner-network-title">
  <header className="partner-heading"><div><h3 id="partner-network-title">NGO field partners.</h3><p>Local organisations. A shared place for the record.</p></div><Link href="/community/organisations">Meet the organisations<ArrowUpRight size={17} aria-hidden/></Link></header>
  <div className="partner-geography"><figure className="partner-map"><svg viewBox="-8 -6 116 119" role="img" aria-label={`Organisation cities in India: ${cities.join(", ")}. City locations, not service coverage.`}>
   <path d={INDIA_PATH}/>
   {cities.map(name=>{const point=cityCoordinates.cities[name as keyof typeof cityCoordinates.cities];if(!point)return null;const [x,y]=indiaXY(point.lng,point.lat);return <g key={name} className={current===name?"is-active":""}><circle cx={x} cy={y} r={current===name?1.7:1.1}/>{current===name&&<text x={x+3} y={y+1}>{name}</text>}</g>;})}
  </svg><figcaption>Organisation cities, not service coverage.<br/><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">City geography · © OpenStreetMap contributors</a></figcaption></figure>
  <div className="partner-index"><div className="partner-filter"><label htmlFor="partner-city">Find a field partner</label><select id="partner-city" value={city} onChange={e=>{setCity(e.target.value);setHover("");}}><option value="">All cities</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
   <ul className="partner-organisations">{visible.map(p=><li key={p.id}><Link href={`/community/organisations/${p.slug}`} onMouseEnter={()=>setHover(canonical(p.city))} onMouseLeave={()=>setHover("")} onFocus={()=>setHover(canonical(p.city))} onBlur={()=>setHover("")}><span><b>{p.name}</b><small>{canonical(p.city)}</small></span><ArrowUpRight size={18} aria-hidden/></Link></li>)}</ul>
   <p className="partner-count" role="status">{visible.length} {visible.length===1?"organisation":"organisations"}{city?` · ${city}`:" on the directory"}</p>
  </div></div>
 </section>;
}
