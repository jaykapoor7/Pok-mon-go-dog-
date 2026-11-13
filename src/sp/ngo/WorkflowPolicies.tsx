"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/components/auth/AuthProvider';
import {useMembership} from '../shell/Shell';
import {operationsDb,operationRpc,verifyOperationReceipt,OPERATION_LABELS,type OperationReceipt,type WorkflowPolicy} from '@/lib/operations';
import {ChevronRight,Plus} from 'lucide-react';
import {Btn,Empty,Head,Note,Page,Panel,Tag} from '@/ws/kit';
import './org.k.css';
const fields=['performedBy','facility','procedure','location','destination','reason','dueDate','vaccine','batch','dose','route'];
export function WorkflowPolicies(){const {user}=useAuth(),mem=useMembership(),allowed=['admin','coordinator'].includes(mem.role??'');const [policies,setPolicies]=useState<WorkflowPolicy[]>([]),[name,setName]=useState(''),[version,setVersion]=useState(1),[source,setSource]=useState(''),[vet,setVet]=useState(false),[required,setRequired]=useState<Record<string,string[]>>({}),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[adding,setAdding]=useState(false),[open,setOpen]=useState<string|null>(null),[read,setRead]=useState(false);const lock=useRef(false),requests=useRef(new Map<string,string>());
 const load=useCallback(async()=>{if(!mem.org)return;const r=await operationsDb().from('operations_policies').select('id,name,version,rules,source_reference').eq('ngo_id',mem.org.id).order('created_at',{ascending:false}).limit(100);if(r.error)throw r.error;setPolicies(r.data as WorkflowPolicy[]);setRead(true)},[mem.org]);useEffect(()=>{void load().catch(()=>setError('Policies could not be read.'))},[load]);
 return<Page width="narrow">
  <Head title="Settings" sum={error?'Policies could not be read.':!read?'Reading your policies…':policies.length?<><b>{policies.length}</b> policy {policies.length===1?'version':'versions'}: your organisation&apos;s procedure requirements, by version.</>:'No organisation policy is configured. Required clinical and evidence checks still apply.'}
   actions={allowed?<Btn variant={adding?'plain':'primary'} icon={<Plus size={14}/>} aria-expanded={adding} onClick={()=>setAdding(v=>!v)}>Configure a policy version</Btn>:undefined}/>
  {error&&<Note tone="flame">{error}</Note>}{message&&<p role="status" className="og-p og-receipt">{message}</p>}
  {allowed&&adding&&<Panel pad><form className="og-form" aria-label="Configure a policy version" onSubmit={async e=>{e.preventDefault();if(!user||lock.current)return;if(!window.confirm('Save this source-backed workflow policy as an immutable version?'))return;lock.current=true;setBusy(true);setError('');const args={p_name:name,p_version:version,p_rules:{releaseRequiresVet:vet,requiredFields:required},p_reference:source},key=JSON.stringify(args);let request=requests.current.get(key);if(!request){request=crypto.randomUUID();requests.current.set(key,request)}try{const r=await operationRpc<OperationReceipt>('operations_save_policy',{p_request:request,...args});await verifyOperationReceipt(r,'operations_policies',user.id,{name,version},request);setMessage('Policy version saved; source and audit checked.');await load()}catch(x){setError(x instanceof Error?x.message:'Policy could not be saved.')}finally{lock.current=false;setBusy(false)}}}>
   <label className="og-f"><span className="og-l">Policy name</span><input className="og-in" required minLength={3} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label className="og-f"><span className="og-l">Version</span><input className="og-in" required type="number" min={1} step={1} value={version} onChange={e=>setVersion(Number(e.target.value))}/></label>
   <label className="og-f"><span className="og-l">Authoritative source reference</span><input className="og-in" required maxLength={1000} value={source} onChange={e=>setSource(e.target.value)}/></label>
   <label className="og-check"><input type="checkbox" checked={vet} onChange={e=>setVet(e.target.checked)}/>This policy requires existing veterinary authorisation before a reported release</label>
   <p className="og-hint">Location and a field note are already required for release. Record any additional source requirements below.</p>
   {Object.entries(OPERATION_LABELS).filter(([k])=>!['correction','identification'].includes(k)).map(([kind,label])=><details key={kind} className="wp-kind"><summary>{label} · additional required fields{required[kind]?.length?` (${required[kind].length})`:''}</summary><div className="wp-fields">{fields.map(field=><label key={field} className="og-check"><input type="checkbox" checked={required[kind]?.includes(field)??false} onChange={e=>setRequired(v=>({...v,[kind]:e.target.checked?[...(v[kind]??[]),field]:(v[kind]??[]).filter(f=>f!==field)}))}/>{field.replace(/([A-Z])/g,' $1')}</label>)}</div></details>)}
   <div className="og-go"><Btn type="submit" variant="primary" disabled={busy}>Save policy version</Btn><Btn disabled={busy} onClick={()=>setAdding(false)}>Cancel</Btn></div></form></Panel>}
  {read&&<Panel>{policies.length===0?<Empty title="No organisation policy is configured">Required clinical and evidence checks still apply.</Empty>:
  <ul className="k-rows" aria-label="Policy versions">{policies.map(p=>{const on=open===p.id,extra=Object.entries(p.rules.requiredFields??{});return<li key={p.id}>
   <button type="button" className="k-row" aria-expanded={on} onClick={()=>setOpen(on?null:p.id)}>
    <span className="og-x-btn" aria-expanded={on} aria-hidden><ChevronRight size={14}/></span>
    <span className="k-row-t"><b>{p.name} · version {p.version}</b><small>Source: {p.source_reference}</small></span>
    <span className="k-row-e"><Tag tone={p.rules.releaseRequiresVet?'blue':'plain'}>{p.rules.releaseRequiresVet?'Vet sign-off required':'Vet sign-off not configured'}</Tag></span>
   </button>
   {on&&<div className="og-x"><p className="og-p">Source: <b>{p.source_reference}</b></p><p className="og-p">Veterinary sign-off before reported release: <b>{p.rules.releaseRequiresVet?'required by this policy':'not configured by this policy'}</b></p>{extra.length?<ul className="og-list">{extra.map(([kind,list])=><li key={kind}>{kind}: {list.join(', ')||'no additional fields'}</li>)}</ul>:<p className="og-p">No additional required fields.</p>}</div>}
  </li>})}</ul>}</Panel>}
 </Page>
}
