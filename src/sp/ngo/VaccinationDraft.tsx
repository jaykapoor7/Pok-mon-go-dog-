"use client";
import {useState} from 'react';
import type {VaccinationData} from '@/lib/field/outbox';
/** Versioned observation form; no clinical or municipal attestation. */
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export function VaccinationDraft({dogId,onSave,onCancel,defaults}:{dogId:string;defaults?:Pick<VaccinationData,'vaccine'|'batch'|'performedBy'>;onSave:(v:VaccinationData)=>Promise<void>;onCancel:()=>void}){
 const [data,setData]=useState<VaccinationData>({template:'arv-field-v1',dogId,eventDate:localDate(),vaccine:defaults?.vaccine??'',batch:defaults?.batch??'',performedBy:defaults?.performedBy??'',dose:'',route:'',location:'',notes:''});const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const field=(key:'vaccine'|'batch'|'performedBy'|'dose'|'route'|'location'|'notes',label:string,required=false,max=100)=><label>{label}<input className="input" aria-label={label} required={required} maxLength={max} value={data[key]} onChange={e=>setData(d=>({...d,[key]:e.target.value}))}/></label>;
 return <form className="stack" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onSave(data);onCancel()}catch(x){setError(x instanceof Error?x.message:'The device could not store this vaccination record.')}finally{setBusy(false)}}}>
 <h3>ARV field record</h3>{defaults&&<p>Previous product and batch are prefilled. Check them for this animal.</p>}<p>Record what was administered. Veterinary sign-off and municipal review remain separate.</p>
 <label>Date given<input className="input" aria-label="Date given" type="date" required max={localDate()} value={data.eventDate} onChange={e=>setData(d=>({...d,eventDate:e.target.value}))}/></label>
 {field('vaccine','Vaccine product',true,200)}{field('batch','Batch or lot',true)}{field('performedBy','Reported vaccinator',true)}{field('dose','Dose recorded',false,50)}{field('route','Route recorded',false,50)}{field('location','Location observed',true,300)}<button type="button" className="btn" onClick={()=>navigator.geolocation.getCurrentPosition(p=>setData(d=>({...d,location:`Observed GPS: ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}`})),()=>setError('Location unavailable. Record the observed location in words.'))}>Use current location</button>{field('notes','Record note',false,500)}
 {error&&<p role="alert">{error}</p>}<button className="btn is-ink" disabled={busy}>Keep vaccination as draft</button><button className="btn" type="button" onClick={onCancel}>Cancel</button></form>
}
