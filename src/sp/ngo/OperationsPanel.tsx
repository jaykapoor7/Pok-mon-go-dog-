"use client";
import {Reading} from "../ui/Reading";
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/components/auth/AuthProvider';
import {useMembership} from '../shell/Shell';
import {readOperations,operationRpc,verifyOperationReceipt,OPERATION_LABELS,type OperationReceipt,type OperationEvent,type OperationReview,type WorkflowPolicy} from '@/lib/operations';
import {LifecycleForm} from './LifecycleForm';
import {Btn,Panel,Section,Tag} from '@/ws/kit';
import './cases.k.css';
const when=(iso:string)=>new Date(iso).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const DETAIL_FIELDS:[string,string][]=[['location','Place'],['destination','Taken to'],['facility','Facility'],['procedure','Procedure'],['performedBy','Done by'],['vaccine','Vaccine'],['batch','Batch'],['dose','Dose'],['route','Route'],['reason','Reason'],['dueDate','Due'],['identityDecision','Identity decision']];
export function OperationsPanel({caseId,dogId,readOnly=false,title='Care and movements',hideEmpty=false,wrap}:{caseId?:string;dogId?:string;readOnly?:boolean;title?:string;hideEmpty?:boolean;wrap?:string}){
 const {user}=useAuth(),mem=useMembership(),coordinator=['admin','coordinator'].includes(mem.role??'');
 const [page,setPage]=useState(0);
 const [data,setData]=useState<{events:OperationEvent[];reviews:OperationReview[];policies:WorkflowPolicy[]}|null>(null),[error,setError]=useState<string|null>(null),[message,setMessage]=useState<string|null>(null),[adding,setAdding]=useState(false),[busy,setBusy]=useState(false),[reasons,setReasons]=useState<Record<string,string>>({});const locked=useRef(false),requests=useRef(new Map<string,string>());
 const load=useCallback(async()=>{try{setData(await readOperations(caseId,page*40,dogId));setError(null)}catch(x){setError(x instanceof Error?x.message:'Operations could not be read.')}},[caseId,page,dogId]);
 useEffect(()=>{let live=true;void readOperations(caseId,page*40,dogId).then(d=>{if(live)setData(d)}).catch(x=>{if(live)setError(x instanceof Error?x.message:'Operations could not be read.')});return()=>{live=false}},[caseId,page,dogId]);
 const review=async(e:OperationEvent,decision:'confirmed'|'returned')=>{if(!user||locked.current)return;const reason=reasons[e.id]?.trim();if(!reason){setError('Record a review reason first.');return}if(!window.confirm(`${decision==='confirmed'?'Confirm':'Return'} this field record? Veterinary and municipal decisions remain separate.`))return;locked.current=true;setBusy(true);setMessage(null);const intent=JSON.stringify([e.id,decision,reason]);let request=requests.current.get(intent);if(!request){request=crypto.randomUUID();requests.current.set(intent,request)}try{const r=await operationRpc<OperationReceipt>('operations_review_event',{p_request:request,p_event:e.id,p_decision:decision,p_reason:reason});await verifyOperationReceipt(r,'animal_operation_reviews',user.id,{event_id:e.id,decision},request);setMessage('Review saved; source and audit checked.');await load()}catch(x){setError(x instanceof Error?x.message:'Review could not be verified.')}finally{locked.current=false;setBusy(false)}};
 /* A read-only list with nothing in it says nothing: the page around it already says what is missing. */
 if(hideEmpty&&data&&data.events.length===0&&!error)return null;
 const panel=<div className="kc-scope ops2"><Section title={title} count={data?.events.length||null} action={!readOnly&&caseId?<Btn small aria-expanded={adding} onClick={()=>setAdding(v=>!v)}>{adding?'Close':'Record care or movement'}</Btn>:undefined}>
 {adding&&<div className="kc-sheet ops2-add"><LifecycleForm events={data?.events} policies={data?.policies} coordinator={coordinator} onCancel={()=>setAdding(false)} onSave={async(kind,payload,policyId,requestId)=>{if(!user||!caseId)throw Error('Sign in first');if(!window.confirm('Save this reported operation? This does not certify a procedure.'))throw Error('Not saved. Review the draft before confirming.');const r=await operationRpc<OperationReceipt>('operations_record_event',{p_request:requestId,p_case:caseId,p_kind:kind,p_payload:payload,p_policy:policyId});await verifyOperationReceipt(r,'animal_operation_events',user.id,{case_id:caseId,kind},requestId);setMessage('Operation saved; source and audit checked.');await load()}}/></div>}
 {error&&<p className="kc-err" role="alert">{error} <button type="button" className="kc-link" onClick={()=>void load()}>Read operations again</button></p>}{message&&<p className="kc-ok" role="status">{message}</p>}
 <Panel>
 {!data&&!error&&<p className="kc-quiet is-pad" role="status"><Reading>Reading</Reading></p>}{data?.events.length===0&&<p className="kc-quiet is-pad">Nothing recorded yet.</p>}
 {data&&data.events.length>0&&<ol className="kc-items">{data.events.map(e=>{const last=data.reviews.find(r=>r.event_id===e.id);const details=e.payload as unknown as Record<string,unknown>;const more=DETAIL_FIELDS.some(([k])=>details[k])||e.policy_id||last||(!readOnly&&coordinator);return<li key={e.id} className="kc-item">
  <span className="kc-item-t"><b>{e.kind==='intake'?'Intake':OPERATION_LABELS[e.kind]}</b><small><time dateTime={e.occurred_at}>{when(e.occurred_at)}</time> · {e.actor_name}{(details.notes??details.description)?` · ${String(details.notes??details.description)}`:''}</small></span>
  <span className="kc-item-e"><Tag tone={last?(last.decision==='confirmed'?'green':'amber'):'plain'}>{last?`${last.decision} by ${last.actor_name}`:'not reviewed yet'}</Tag>{dogId&&<Link className="kc-link" href={`/ngo/cases/${e.case_id}`}>Open source case</Link>}</span>
  {more?<details className="ops2-more"><summary>{!readOnly&&coordinator&&!last?'Details and review':'Details'}</summary><div className="kc-form is-tight">{DETAIL_FIELDS.map(([k,label])=>details[k]?<p className="kc-hint" key={k}>{label}: {String(details[k])}</p>:null)}{e.policy_id&&<p className="kc-hint">Recorded under your organisation&rsquo;s workflow policy</p>}{last&&<p className="kc-hint">Review: {last.reason} · {when(last.created_at)}</p>}
  {!readOnly&&coordinator&&<><label className="kc-f">Review reason<textarea className="kc-in" aria-label={`Review reason for ${e.id}`} required maxLength={2000} value={reasons[e.id]??''} onChange={v=>setReasons(r=>({...r,[e.id]:v.target.value}))}/></label><div className="kc-acts"><Btn small disabled={busy} onClick={()=>void review(e,'confirmed')}>Confirm field record</Btn><Btn small disabled={busy} onClick={()=>void review(e,'returned')}>Return field record</Btn></div></>}</div></details>:null}
 </li>})}</ol>}
 </Panel>
 {(page>0||(data?.events.length??0)>=40)&&<div className="kc-acts ops2-pager"><Btn small disabled={page===0} onClick={()=>setPage(v=>v-1)}>Newer</Btn><Btn small disabled={!data||data.events.length<40} onClick={()=>setPage(v=>v+1)}>Older</Btn></div>}
 </Section></div>;
 return wrap?<div className={wrap}>{panel}</div>:panel;
}
