"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {getSupabase} from '@/lib/supabase';
import {useAi} from '@/sp3/ai/AiPanel';
import {readSnapshot,type CheckSnapshot} from '@/sp3/ai/snapshots';
const labels:Record<string,string>={overdue_followup:'Overdue follow-ups',missing_evidence:'Missing evidence',awaiting_vet:'Awaiting veterinary authorisation',open_clarification:'Municipal clarifications',programme_activity:'Programme activity',reporting_deadline:'Reporting deadline'};
export function KajuActivity({orgId}:{orgId:string}){
 const ai=useAi();const sequence=useRef(0);
 const [state,setState]=useState<{org:string;run:CheckSnapshot|null;failed:boolean;loading:boolean}>({org:orgId,run:null,failed:false,loading:true});
 const load=useCallback(async()=>{
  const version=++sequence.current;const db=getSupabase();
  try{
   if(!db)throw Error('Unavailable');
   const {data,error}=await db.from('kaju_check_runs').select('id,ngo_id,checked_at,rules_version,findings').eq('ngo_id',orgId).order('checked_at',{ascending:false}).limit(1).maybeSingle();
   const run=data?readSnapshot(data):null;if(error||data&&!run)throw Error('Unavailable');
   if(version===sequence.current)setState({org:orgId,run,failed:false,loading:false});
  }catch{if(version===sequence.current)setState({org:orgId,run:null,failed:true,loading:false})}
 },[orgId]);
 // This sequence invalidates in-flight reads after unmount.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{void load();const refresh=()=>{if(document.visibilityState==='visible')void load()};window.addEventListener('kaju-check-completed',refresh);window.addEventListener('focus',refresh);return()=>{sequence.current++;window.removeEventListener('kaju-check-completed',refresh);window.removeEventListener('focus',refresh)}},[load]);
 const current=state.org===orgId?state:null;const run=current?.run;
 const flagged=run?.findings.filter(f=>f.count!==0||f.configured===false)??[];
 const stale=run&&Date.now()-Date.parse(run.checked_at)>26*3600000;
 const time=(date:string)=>new Date(date).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});
 return <section className="br-sec br-kaju" aria-labelledby="br-kaju-activity">
  <h2 id="br-kaju-activity" className="br-h">Kaju activity</h2>
  <div role="status"><p className="br-empty">{!current||current.loading?'Reading the latest record check…':current.failed?'The latest check could not be read. Findings are unknown.':run?<>Records checked <time dateTime={run.checked_at}>{time(run.checked_at)}</time>. {flagged.length} of {run.findings.length} rules need review.</>:'No operational check is recorded yet.'}</p></div>
  {current?.failed&&<button type="button" className="ai3-inline" onClick={()=>void load()}>Read check again</button>}
  {run&&<>
   {stale&&<p className="br-empty">This check is older than 26 hours. Check the records again for current findings.</p>}
   <p className="br-empty">At most 100 records per rule. These are record gaps, not clinical or government decisions.</p>
   {flagged.length>0&&<ul className="br-findings">{flagged.map(f=><li key={f.rule}>
    <b>{labels[f.rule]??f.rule.replaceAll('_',' ')}: {f.configured===false?'not set':f.count===null?'unknown':f.count}</b>
    <p>{f.explanation}</p>{f.dueOn&&<p>Due <time dateTime={f.dueOn}>{new Date(f.dueOn+"T00:00:00Z").toLocaleDateString("en-IN",{dateStyle:"medium",timeZone:"UTC"})}</time>. Set by your organisation lead.</p>}<small>Checked <time dateTime={run.checked_at}>{time(run.checked_at)}</time></small>{f.rule==='reporting_deadline'&&f.dueOn&&<div className="br-chips"><Link href="/ngo/settings#kaju-deadline-title">Deadline settings</Link></div>}
    {f.records.length>0?<div className="br-chips">{f.records.slice(0,3).map(r=><Link key={r.id} href={r.href}>{r.label}</Link>)}</div>:f.configured===false?<p>No deadline source is recorded. {ai.role==='admin'?<Link href="/ngo/settings">Set a reporting deadline</Link>:'Ask your organisation lead to set one.'}</p>:f.count===null?<p>The source could not establish a count.</p>:null}
   </li>)}</ul>}
  </>}
  <div className="br-chips"><button type="button" disabled={ai.busy||!ai.scope} onClick={()=>ai.ask('Run operational checks on my organisation. Explain the recorded gaps and prepare a report for review. Do not change any case or send a message.')}>{ai.busy?'Checking records…':'Check records with Kaju'}</button></div>
 </section>;
}
