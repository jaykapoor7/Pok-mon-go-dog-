"use client";
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {getSupabase} from '@/lib/supabase';
import {useAi} from '@/sp3/ai/AiPanel';
type Finding={rule:string;count:number;explanation:string;configured?:boolean;records?:{id:string;label:string;href:string}[]};
type Run={id:string;ngo_id:string;checked_at:string;rules_version:string;findings:Finding[]};
/** Real stored checks only. Refreshing never creates case activity or approvals. */
export function KajuActivity({orgId}:{orgId:string}){
 const ai=useAi();const [state,setState]=useState<{org:string;run:Run|null;failed:boolean}>({org:orgId,run:null,failed:false});
 const load=useCallback(async()=>{
  const db=getSupabase();if(!db)return {org:orgId,run:null,failed:true};
  try{const {data,error}=await db.from('kaju_check_runs').select('id,ngo_id,checked_at,rules_version,findings').eq('ngo_id',orgId).order('checked_at',{ascending:false}).limit(1).maybeSingle();return {org:orgId,run:error?null:data as Run|null,failed:!!error};}
  catch{return {org:orgId,run:null,failed:true};}
 },[orgId]);
 useEffect(()=>{let live=true;const refresh=()=>{void load().then(value=>{if(live)setState(value)})};refresh();window.addEventListener('kaju-check-completed',refresh);return()=>{live=false;window.removeEventListener('kaju-check-completed',refresh)}},[load]);
 const current=state.org===orgId?state:null;
 const run=current?.run;const flagged=run?.findings.filter(f=>f.count>0||f.configured===false)??[];
 const sources=flagged.flatMap(f=>f.records??[]).filter((r,i,a)=>r.href.startsWith('/ngo/')&&!r.href.startsWith('//')&&a.findIndex(v=>v.id===r.id)===i).slice(0,3);
 return <section className="br-sec br-kaju" aria-labelledby="br-kaju-activity"><h2 id="br-kaju-activity" className="br-h">Kaju activity</h2>
  <div role="status"><p className="br-empty">{current?.failed?'The latest record check could not be read.':run?<>Records checked <time dateTime={run.checked_at}>{new Date(run.checked_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</time>. {flagged.length} of {run.findings.length} rules need review.</>:'No operational check is recorded yet.'}</p></div>
  {run&&<><p className="br-empty">Counts cover at most 100 records per rule. This check does not certify procedures or change cases.</p>{flagged.length>0&&<ul>{flagged.map(f=><li key={f.rule}><b>{f.rule.replaceAll('_',' ')}: {f.configured===false?'not set':f.count}</b>. {f.explanation}</li>)}</ul>}{sources.length>0&&<div className="br-chips">{sources.map(r=><Link key={r.id} href={r.href}>{r.label}</Link>)}</div>}</>}
  <div className="br-chips"><button type="button" disabled={ai.busy} onClick={()=>ai.ask('Run operational checks on my organisation. Explain the recorded gaps and prepare a report for review. Do not change any case or send a message.')}>Check records with Kaju</button></div>
 </section>;
}
