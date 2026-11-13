"use client";
import {useEffect,useState} from 'react';
import {getSupabase} from '@/lib/supabase';
import {Btn,Section} from '@/ws/kit';
import './org.k.css';

/** A lead supplies the reporting date; Kaju never guesses one from a programme. */
export function ReportDeadline(){
 const [due,setDue]=useState(''),[lead,setLead]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{let live=true;const db=getSupabase();if(!db)return;
  void Promise.all([db.rpc('abc_my_context'),db.from('kaju_check_settings').select('report_due_on').limit(1).maybeSingle()]).then(([ctx,settings])=>{
   if(!live)return;setLead(ctx.data?.role==='admin');
   if(ctx.error||settings.error)setStatus('The reporting deadline could not be read.');else setDue(settings.data?.report_due_on??'');
  });return()=>{live=false};
 },[]);
 async function save(){const db=getSupabase();if(!db)return;setBusy(true);setStatus('Saving…');
  try{const {error}=await db.rpc('kaju_set_report_deadline',{p_due:due||null});setStatus(error?'The deadline was not saved. Try again.':'Reporting deadline saved.');}catch{setStatus('The deadline was not saved. Try again.');}finally{setBusy(false);}
 }
 return <Section title="Reporting deadline"><div className="og-form" aria-label="Reporting deadline"><div className="og-f"><label htmlFor="kaju-report-due">Next report due</label><div className="og-go"><input id="kaju-report-due" className="og-in og-date" type="date" value={due} disabled={!lead||busy} onChange={e=>setDue(e.target.value)}/><Btn disabled={!lead||busy} onClick={()=>void save()}>Save deadline</Btn></div>{!lead&&<span className="og-hint">Only a lead can set the reporting date.</span>}</div><p role="status" className="og-p">{status}</p></div></Section>;
}
