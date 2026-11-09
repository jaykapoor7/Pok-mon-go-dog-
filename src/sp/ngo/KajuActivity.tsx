"use client";
import {Fragment,useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {getSupabase} from '@/lib/supabase';
import {useAi} from '@/sp3/ai/AiPanel';
import {readSnapshot,type CheckSnapshot} from '@/sp3/ai/snapshots';
const labels:Record<string,string>={overdue_followup:'Overdue follow-ups',missing_evidence:'Missing evidence',awaiting_vet:'Awaiting veterinary authorisation',open_clarification:'Municipal clarifications',programme_activity:'Programme activity',reporting_deadline:'Reporting deadline'};
type Delivery={user_id:string;name:string;role:string;seen_at:string|null};
export function KajuActivity({orgId}:{orgId:string}){
 const ai=useAi();const sequence=useRef(0);
 const [delivery,setDelivery]=useState<Delivery[]|null>(null);const marked=useRef<string|null>(null);
 const lead=ai.role==='admin'||ai.role==='coordinator';
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
 /* Receipt: opening the findings records that this person has seen this check. Leads see who has. */
 const opened=async()=>{const db=getSupabase();if(!db||!run)return;
  if(marked.current!==run.id){marked.current=run.id;await db.rpc('kaju_mark_check_seen',{p_run:run.id});}
  if(lead){const r=await db.rpc('kaju_check_delivery',{p_run:run.id});if(!r.error)setDelivery((r.data??[]) as Delivery[]);}};
 const seen=delivery?.filter(d=>d.seen_at)??[];const unseen=delivery?.filter(d=>!d.seen_at)??[];
 const rows=flagged.map(f=>({rule:f.rule,label:labels[f.rule]??f.rule.replaceAll('_',' '),n:f.configured===false?'Not set':f.count===null?'Unknown':String(f.count),links:f.records.filter((r,i,all)=>all.findIndex(x=>x.id===r.id)===i).slice(0,2)}));
 return <details className="kx-checks" onToggle={e=>{if((e.currentTarget as HTMLDetailsElement).open)void opened()}}>
  <summary><span className="br-sq t-violet" aria-hidden>✓</span><span className="kx-t"><span>Record checks</span><small>{!current||current.loading?'Reading…':current.failed?'Could not be read':run?`${time(run.checked_at)}${stale?' · older than a day':''}`:'Not run yet'}</small></span><em className={flagged.length?'is-due':''}>{run?(flagged.length?`${flagged.length} to look at`:'All clear'):''}</em></summary>
  {current?.failed&&<button type="button" className="kx-more" onClick={()=>void load()}>Read again</button>}
  {rows.length>0&&<ul className="kx-list">{rows.map(r=><li key={r.rule}><span className="kx-n">{r.n}</span><span className="kx-t"><span>{r.label}</span>{r.links.length>0&&<small>{r.links.map((l,i)=><Fragment key={l.id}>{i>0&&' · '}<Link href={l.href}>{l.label.length>14?`${l.label.slice(0,12)}…`:l.label}</Link></Fragment>)}</small>}</span>{r.rule==='reporting_deadline'&&ai.role==='admin'?<Link className="kx-link" href="/ngo/settings">Set</Link>:<span/>}</li>)}</ul>}
  <div className="kx-foot"><button type="button" className="kx-more" disabled={ai.busy||!ai.scope} onClick={()=>ai.ask('Run operational checks on my organisation. Explain the recorded gaps and prepare a report for review. Do not change any case or send a message.')}>{ai.busy?'Checking…':'Check again with Kaju'}</button>{lead&&delivery&&delivery.length>0&&<small className="kx-seen">Seen by {seen.length} of {delivery.length}</small>}</div>
 </details>;
}
