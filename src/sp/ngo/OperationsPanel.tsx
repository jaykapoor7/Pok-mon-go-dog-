"use client";
import {Reading} from "../ui/Reading";
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/components/auth/AuthProvider';
import {useMembership} from '../shell/Shell';
import {readOperations,operationRpc,verifyOperationReceipt,OPERATION_LABELS,type OperationReceipt,type OperationEvent,type OperationReview,type WorkflowPolicy} from '@/lib/operations';
import {LifecycleForm} from './LifecycleForm';
import '../abc/abc.css';
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
 const panel=<section className="abc-sec ops" aria-label={title}><div className="ops-head"><div><h2>{title}</h2></div>
 {!readOnly&&caseId&&<button className="btn is-s" type="button" aria-expanded={adding} onClick={()=>setAdding(v=>!v)}>{adding?'Close':'Record care or movement'}</button>}</div>
 {adding&&<LifecycleForm events={data?.events} policies={data?.policies} coordinator={coordinator} onCancel={()=>setAdding(false)} onSave={async(kind,payload,policyId,requestId)=>{if(!user||!caseId)throw Error('Sign in first');if(!window.confirm('Save this reported operation? This does not certify a procedure.'))throw Error('Not saved. Review the draft before confirming.');const r=await operationRpc<OperationReceipt>('operations_record_event',{p_request:requestId,p_case:caseId,p_kind:kind,p_payload:payload,p_policy:policyId});await verifyOperationReceipt(r,'animal_operation_events',user.id,{case_id:caseId,kind},requestId);setMessage('Operation saved; source and audit checked.');await load()}}/>}
 {error&&<p role="alert">{error} <button className="btn" onClick={()=>void load()}>Read operations again</button></p>}{message&&<p role="status">{message}</p>}
 {!data&&!error&&<p role="status"><Reading>Reading</Reading></p>}{data?.events.length===0&&<p className="ops-empty">Nothing recorded yet.</p>}
 
 <ol className="abc-hist">{data?.events.map(e=>{const last=data.reviews.find(r=>r.event_id===e.id);const details=e.payload as unknown as Record<string,unknown>;return<li key={e.id}><time dateTime={e.occurred_at}>{when(e.occurred_at)}</time><div><b>{e.kind==='intake'?'Intake':OPERATION_LABELS[e.kind]}</b>{dogId&&<Link className="ops-src" href={`/ngo/cases/${e.case_id}`}>Open source case</Link>}<p className="ops-meta">{e.actor_name} · {last?`${last.decision} by ${last.actor_name}`:'not reviewed yet'}</p>{(details.notes??details.description)?<p>{String(details.notes??details.description)}</p>:null}
 {(DETAIL_FIELDS.some(([k])=>details[k])||e.policy_id||last||(!readOnly&&coordinator))&&<details className="ops-more"><summary>{!readOnly&&coordinator&&!last?'Details and review':'Details'}</summary>{DETAIL_FIELDS.map(([k,label])=>details[k]?<p key={k}>{label}: {String(details[k])}</p>:null)}{e.policy_id&&<p>Recorded under your organisation&rsquo;s workflow policy</p>}{last&&<p>Review: {last.reason} · {when(last.created_at)}</p>}
 {!readOnly&&coordinator&&<><label>Review reason<textarea className="textarea" aria-label={`Review reason for ${e.id}`} required maxLength={2000} value={reasons[e.id]??''} onChange={v=>setReasons(r=>({...r,[e.id]:v.target.value}))}/></label><div className="row"><button className="btn" disabled={busy} onClick={()=>void review(e,'confirmed')}>Confirm field record</button><button className="btn" disabled={busy} onClick={()=>void review(e,'returned')}>Return field record</button></div></>}</details>}
 </div></li>})}</ol>{(page>0||(data?.events.length??0)>=40)&&<div className="row ops-pager"><button className="btn is-s" disabled={page===0} onClick={()=>setPage(v=>v-1)}>Newer</button><button className="btn is-s" disabled={!data||data.events.length<40} onClick={()=>setPage(v=>v+1)}>Older</button></div>}
 </section>;
 return wrap?<div className={wrap}>{panel}</div>:panel;
}
