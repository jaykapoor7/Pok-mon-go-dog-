"use client";
import {ZoneProgress} from './ZoneProgress';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabase} from '@/lib/supabase';
import {orgCampaigns,type CampaignStats} from '@/lib/campaigns';
import {getMyOrgMembers,type OrgMember} from '@/lib/team-actions';
import {useAuth} from '@/components/auth/AuthProvider';
import {useMembership} from '../shell/Shell';
import {NgoGate} from './Gate';
import './ngo.css';
type Zone={id:string;name:string;campaign_id:string;planned:number|null;status:'assigned'|'reported_complete'|'supervisor_reviewed';staff:string[];note:string|null;updated_at:string};
const labels={assigned:'Assigned work',reported_complete:'Reported complete',supervisor_reviewed:'Supervisor reviewed'};
export function WorkingZones(){
 const mem=useMembership(),{user}=useAuth(),leader=mem.role==='admin'||mem.role==='coordinator';
 const [zones,setZones]=useState<Zone[]|null>(null),[campaigns,setCampaigns]=useState<CampaignStats[]>([]),[members,setMembers]=useState<OrgMember[]>([]);
 const [error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[name,setName]=useState(''),[campaign,setCampaign]=useState(''),[planned,setPlanned]=useState('');
 const [geometry,setGeometry]=useState<unknown>(null),[geometryName,setGeometryName]=useState('');
 const [person,setPerson]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({});
 const [reporting,setReporting]=useState<string|null>(null);
 const [mineOnly,setMineOnly]=useState(false);
 const requests=useRef(new Map<string,string>()),newZone=useRef(''),locked=useRef(false);
 const load=useCallback(async()=>{try{const db=getSupabase();if(!db)throw Error('Record service unavailable');const [r,c,m]=await Promise.all([db.rpc('org_work_zones'),orgCampaigns(),leader?getMyOrgMembers():Promise.resolve([])]);if(r.error)throw Error('Working zones are unavailable on this deployment.');setZones(r.data);setCampaigns(c);setMembers(m)}catch(e){setError(e instanceof Error?e.message:'Zones could not be read')}},[leader]);
 useEffect(()=>{if(mem.member)void load()},[mem.member,load]);
 async function act(zone:string,action:string,payload:Record<string,unknown>){
  if(locked.current)return;if(!window.confirm(action==='create'?'Create this working zone?':action==='assign'?'Assign this authorised member?':action==='unassign'?'Remove this current assignment? Its audit history remains.':action==='report_complete'?'Report the assigned work complete? This does not verify coverage.':'Record supervisor review? This does not accept municipal claims.'))return;
  locked.current=true;setBusy(true);setError(null);const intent=JSON.stringify([zone,action,payload]);let request=requests.current.get(intent);if(!request){request=crypto.randomUUID();requests.current.set(intent,request)}
  try{const db=getSupabase();if(!db)throw Error('Session unavailable');const r=await db.rpc('zone_action',{p_request:request,p_zone:zone,p_action:action,p_payload:payload});if(r.error)throw Error(r.error.message);
   const [source,audit]=await Promise.all([db.from('programme_work_zones').select('id,status').eq('id',zone).single(),db.from('operational_audit_log').select('id').eq('id',r.data.audit_id).single()]);if(source.error||audit.error)throw Error('The source or audit could not be verified. Retry this same change.');
   if(action==='assign'||action==='unassign'){const assigned=await db.from('programme_zone_staff').select('user_id').eq('zone_id',zone).eq('user_id',payload.user_id).eq('active',true).maybeSingle();if(assigned.error||(action==='assign'?!assigned.data:!!assigned.data))throw Error('Staff assignment could not be verified. Retry this same change.')}
   if(action==='report_complete'&&source.data.status!=='reported_complete'||action==='review_completion'&&source.data.status!=='supervisor_reviewed')throw Error('Zone changed after this action. Review its current state.');
   await load();if(action==='create'){newZone.current='';setName('');setPlanned('');setGeometry(null);setGeometryName('')}
  }catch(e){setError(e instanceof Error?e.message:'Change failed. Retry the same change.')}finally{locked.current=false;setBusy(false)}
 }
 return <NgoGate title="Working zones" lede="Programme boundaries, assigned staff and supervisor review."><div className="ngo-page"><header className="ngo-head"><h1>Working zones</h1><p className="ngo-sum">Reported completion, supervisor review, survey coverage and municipal acceptance are separate checks. Up to 200 recent zones are shown.</p></header>
 {error&&<p role="alert">{error}</p>}
 {leader&&<details><summary>Create a working zone</summary><form className="stack" onSubmit={e=>{e.preventDefault();if(!newZone.current)newZone.current=crypto.randomUUID();void act(newZone.current,'create',{name,campaign_id:campaign,planned,geometry})}}>
 <label>Zone name<input className="input" required minLength={3} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Programme<select aria-label="Programme" className="input" required value={campaign} onChange={e=>setCampaign(e.target.value)}><option value="">Choose an active programme</option>{campaigns.filter(c=>!c.archived).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Planned interventions (optional)<input className="input" type="number" min={0} max={1000000} value={planned} onChange={e=>setPlanned(e.target.value)}/></label>
 <label>Boundary GeoJSON<input type="file" accept=".json,.geojson,application/geo+json" required onChange={async e=>{setGeometry(null);const file=e.target.files?.[0];if(!file)return;try{if(file.size>90000)throw Error('Use a boundary file smaller than 90 KB');const j=JSON.parse(await file.text()),g=j.type==='Feature'?j.geometry:j;if(!['Polygon','MultiPolygon'].includes(g?.type))throw Error('Use one Polygon or MultiPolygon geometry');setGeometry(g);setGeometryName(file.name);setError(null)}catch(x){setError(x instanceof Error?x.message:'Boundary could not be read')}}}/></label><p>{geometryName}</p><button className="btn is-ink" disabled={busy||!geometry}>Create zone</button></form></details>}
 {zones===null&&!error&&<p role="status">Reading working zones…</p>}{zones?.length===0&&<p>No working zones recorded. A coordinator can add a programme boundary and assign staff.</p>}
 <button type="button" className="chip" aria-pressed={mineOnly} onClick={()=>setMineOnly(v=>!v)}>Assigned to me</button>
 <ul className="fd-cards">{zones?.filter(z=>!mineOnly||!!user&&z.staff.includes(user.id)).map(z=><li className="fd-card" key={z.id}><h2>{z.name}</h2><p>{labels[z.status]} · planned {z.planned??'not recorded'} · {z.staff.length} assigned staff</p><p>Updated {new Date(z.updated_at).toLocaleString()}</p>{z.note&&<p>{z.note}</p>}<Link href={`/ngo/map?zone=${z.id}`}>View boundary on map</Link><button className="btn" aria-expanded={reporting===z.id} onClick={()=>setReporting(old=>old===z.id?null:z.id)}>Activity and survey reporting</button>{reporting===z.id&&<ZoneProgress zoneId={z.id}/>}
 {leader&&<div><label>Assign authorised member<select aria-label="Assign authorised member" className="input" value={person[z.id]??''} onChange={e=>setPerson(p=>({...p,[z.id]:e.target.value}))}><option value="">Choose a member</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.name} · {m.role}</option>)}</select></label><button className="btn" disabled={busy||!person[z.id]} onClick={()=>void act(z.id,'assign',{user_id:person[z.id]})}>Assign member</button><button className="btn" disabled={busy||!z.staff.includes(person[z.id]??'')} onClick={()=>void act(z.id,'unassign',{user_id:person[z.id]})}>Remove assignment</button><p>Assigned: {z.staff.map(id=>members.find(m=>m.user_id===id)?.name??'Former or unavailable member').join(', ')||'No staff assigned'}</p></div>}
 {(z.status==='assigned'&&user&&z.staff.includes(user.id)||z.status==='reported_complete'&&leader)&&<div><label>Completion or review note<textarea className="textarea" required maxLength={1500} value={notes[z.id]??''} onChange={e=>setNotes(n=>({...n,[z.id]:e.target.value}))}/></label><button className="btn is-ink" disabled={busy||!notes[z.id]?.trim()} onClick={()=>void act(z.id,z.status==='assigned'?'report_complete':'review_completion',{note:notes[z.id]})}>{z.status==='assigned'?'Report work complete':'Record supervisor review'}</button></div>}</li>)}</ul></div></NgoGate>
}
