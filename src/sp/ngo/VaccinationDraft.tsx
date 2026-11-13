"use client";
import "./cases.k.css";
import "@/ws/kit.css";
import {useState} from 'react';
import type {VaccinationData} from '@/lib/field/outbox';
/** Versioned observation form; no clinical or municipal attestation. */
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export function VaccinationDraft({dogId,onSave,onCancel,defaults}:{dogId:string;defaults?:Pick<VaccinationData,'vaccine'|'batch'|'performedBy'>;onSave:(v:VaccinationData)=>Promise<void>;onCancel:()=>void}){
 const [data,setData]=useState<VaccinationData>({template:'arv-field-v1',dogId,eventDate:localDate(),vaccine:defaults?.vaccine??'',batch:defaults?.batch??'',performedBy:defaults?.performedBy??'',dose:'',route:'',location:'',notes:''});const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const field=(key:'vaccine'|'batch'|'performedBy'|'dose'|'route'|'location'|'notes',label:string,required=false,max=100)=><label className="kc-f">{label}<input className="kc-in" aria-label={label} required={required} maxLength={max} value={data[key]} onChange={e=>setData(d=>({...d,[key]:e.target.value}))}/></label>;
 return <form className="kc-form" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onSave(data);onCancel()}catch(x){setError(x instanceof Error?x.message:'The device could not store this vaccination record.')}finally{setBusy(false)}}}>
 <h3>ARV field record</h3>{defaults&&<p className="kc-hint">Previous product and batch are prefilled. Check them for this animal.</p>}<p className="kc-hint">Record what was administered. Veterinary sign-off and municipal review remain separate.</p>
 <label className="kc-f">Date given<input className="kc-in" aria-label="Date given" type="date" required max={localDate()} value={data.eventDate} onChange={e=>setData(d=>({...d,eventDate:e.target.value}))}/></label>
 {field('vaccine','Vaccine product',true,200)}{field('batch','Batch or lot',true)}{field('performedBy','Reported vaccinator',true)}{field('dose','Dose recorded',false,50)}{field('route','Route recorded',false,50)}{field('location','Location observed',true,300)}<button type="button" className="k-btn is-plain" onClick={()=>navigator.geolocation.getCurrentPosition(p=>setData(d=>({...d,location:`Observed GPS: ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}`})),()=>setError('Location unavailable. Record the observed location in words.'))}>Use current location</button>{field('notes','Record note',false,500)}
 {error&&<p className="kc-err" role="alert">{error}</p>}<div className="kc-acts"><button type="submit" className="k-btn is-primary" disabled={busy}>Keep vaccination as draft</button><button type="button" className="k-btn is-quiet" onClick={onCancel}>Cancel</button></div></form>
}
