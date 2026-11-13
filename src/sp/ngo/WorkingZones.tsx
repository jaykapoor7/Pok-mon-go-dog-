"use client";

/* NGO · Drives · Working zones. The boundaries a drive is worked in, who is
   assigned to each and how far along it is. One row per zone; a row opens in
   place to its staff, its completion note and its reporting. Every change
   goes through zone_action with a confirmation, and is checked against the
   source row and the audit log before the page says it happened. */

import {ZoneProgress} from './ZoneProgress';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ChevronRight,Plus} from 'lucide-react';
import {getSupabase} from '@/lib/supabase';
import {orgCampaigns,type CampaignStats} from '@/lib/campaigns';
import {getMyOrgMembers,type OrgMember} from '@/lib/team-actions';
import {useAuth} from '@/components/auth/AuthProvider';
import {Btn,Empty,Head,Lanes,Note,Page,Panel,Tag,Tools} from '@/ws/kit';
import {usePageState} from '@/ws/store';
import {useMembership} from '../shell/Shell';
import {Reading} from '../ui/Reading';
import {NgoGate} from './Gate';
import './org.k.css';
type Zone={id:string;name:string;campaign_id:string;planned:number|null;status:'assigned'|'reported_complete'|'supervisor_reviewed';staff:string[];note:string|null;updated_at:string};
const labels={assigned:'Assigned work',reported_complete:'Reported complete',supervisor_reviewed:'Supervisor reviewed'};
const tones={assigned:'blue',reported_complete:'amber',supervisor_reviewed:'green'} as const;
export function WorkingZones(){
 const mem=useMembership(),{user}=useAuth(),leader=mem.role==='admin'||mem.role==='coordinator';
 const [zones,setZones]=useState<Zone[]|null>(null),[campaigns,setCampaigns]=useState<CampaignStats[]>([]),[members,setMembers]=useState<OrgMember[]>([]);
 const [error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[name,setName]=useState(''),[campaign,setCampaign]=useState(''),[planned,setPlanned]=useState('');
 const [geometry,setGeometry]=useState<unknown>(null),[geometryName,setGeometryName]=useState('');
 const [person,setPerson]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({});
 const [reporting,setReporting]=useState<string|null>(null);
 const [mineOnly,setMineOnly]=usePageState<boolean>('mine',false);
 const [creating,setCreating]=useState(false),[open,setOpen]=usePageState<string|null>('zone',null);
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
   await load();if(action==='create'){newZone.current='';setName('');setPlanned('');setGeometry(null);setGeometryName('');setCreating(false)}
  }catch(e){setError(e instanceof Error?e.message:'Change failed. Retry the same change.')}finally{locked.current=false;setBusy(false)}
 }
 const shown=zones?.filter(z=>!mineOnly||!!user&&z.staff.includes(user.id))??[];
 const waiting=zones?.filter(z=>z.status==='reported_complete').length??0;
 return <NgoGate title="Working zones" lede="Drive boundaries, assigned staff and supervisor review."><Page>
 <Head title="Drives"
  sum={zones===null?(error?'Working zones could not be read.':<Reading>Reading working zones</Reading>):zones.length===0?'No working zones recorded. A coordinator can add a drive boundary and assign staff.':<><b>{zones.length}</b> working {zones.length===1?'zone':'zones'}{waiting?<>, <b>{waiting}</b> reported complete and waiting for supervisor review</>:null}.</>}
  actions={leader?<Btn variant={creating?'plain':'primary'} icon={<Plus size={14}/>} aria-expanded={creating} onClick={()=>setCreating(v=>!v)}>Create a working zone</Btn>:undefined}/>
 {error&&<Note tone="flame">{error}</Note>}
 {creating&&leader&&<Panel pad><form className="og-form" aria-label="Create a working zone" onSubmit={e=>{e.preventDefault();if(!newZone.current)newZone.current=crypto.randomUUID();void act(newZone.current,'create',{name,campaign_id:campaign,planned,geometry})}}>
  <label className="og-f"><span className="og-l">Zone name</span><input className="og-in" required minLength={3} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
  <label className="og-f"><span className="og-l">Drive</span><select className="og-in" required value={campaign} onChange={e=>setCampaign(e.target.value)}><option value="">Choose an active drive</option>{campaigns.filter(c=>!c.archived).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <label className="og-f"><span className="og-l">Planned interventions <span className="og-opt">optional</span></span><input className="og-in" type="number" min={0} max={1000000} value={planned} onChange={e=>setPlanned(e.target.value)}/></label>
  <label className="og-f"><span className="og-l">Boundary GeoJSON</span><input className="og-file" type="file" accept=".json,.geojson,application/geo+json" required onChange={async e=>{setGeometry(null);const file=e.target.files?.[0];if(!file)return;try{if(file.size>90000)throw Error('Use a boundary file smaller than 90 KB');const j=JSON.parse(await file.text()),g=j.type==='Feature'?j.geometry:j;if(!['Polygon','MultiPolygon'].includes(g?.type))throw Error('Use one Polygon or MultiPolygon geometry');setGeometry(g);setGeometryName(file.name);setError(null)}catch(x){setError(x instanceof Error?x.message:'Boundary could not be read')}}}/>{geometryName?<span className="og-hint">{geometryName}</span>:null}</label>
  <div className="og-go"><Btn type="submit" variant="primary" disabled={busy||!geometry}>Create zone</Btn><Btn disabled={busy} onClick={()=>setCreating(false)}>Cancel</Btn></div></form></Panel>}
 <Tools><Lanes label="Zones shown" value={mineOnly?'mine':'all'} onChange={v=>setMineOnly(v==='mine')} lanes={[{id:'all',label:'All zones'},{id:'mine',label:'Assigned to me'}]}/></Tools>
 {zones!==null&&<Panel>{shown.length===0?<Empty title={zones.length?'No zone is assigned to you':'No working zones recorded'}>{zones.length?'Choose All zones to see every zone.':'A coordinator can add a drive boundary and assign staff.'}</Empty>:
 <ul className="k-rows" aria-label="Working zones">{shown.map(z=>{const on=open===z.id;return <li key={z.id}>
  <button type="button" className="k-row" aria-expanded={on} onClick={()=>setOpen(on?null:z.id)}>
   <span className="og-x-btn" aria-expanded={on} aria-hidden><ChevronRight size={14}/></span>
   <span className="k-row-t"><b>{z.name}</b><small>planned {z.planned??'not recorded'} · {z.staff.length} assigned staff · updated {new Date(z.updated_at).toLocaleString()}</small></span>
   <span className="k-row-e"><Tag tone={tones[z.status]}>{labels[z.status]}</Tag></span>
  </button>
  {on&&<div className="og-x">
   {z.note&&<p className="og-p">{z.note}</p>}
   {leader&&<div className="og-form"><p className="og-p">Assigned: <b>{z.staff.map(id=>members.find(m=>m.user_id===id)?.name??'Former or unavailable member').join(', ')||'No staff assigned'}</b></p>
    <label className="og-f"><span className="og-l">Assign authorised member</span><select className="og-in" value={person[z.id]??''} onChange={e=>setPerson(p=>({...p,[z.id]:e.target.value}))}><option value="">Choose a member</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.name} · {m.role}</option>)}</select></label>
    <div className="og-go"><Btn disabled={busy||!person[z.id]} onClick={()=>void act(z.id,'assign',{user_id:person[z.id]})}>Assign member</Btn><Btn disabled={busy||!z.staff.includes(person[z.id]??'')} onClick={()=>void act(z.id,'unassign',{user_id:person[z.id]})}>Remove assignment</Btn></div></div>}
   {(z.status==='assigned'&&user&&z.staff.includes(user.id)||z.status==='reported_complete'&&leader)&&<div className="og-form"><label className="og-f"><span className="og-l">Completion or review note</span><textarea className="og-in" required maxLength={1500} value={notes[z.id]??''} onChange={e=>setNotes(n=>({...n,[z.id]:e.target.value}))}/></label><div className="og-go"><Btn variant={creating?'plain':'primary'} disabled={busy||!notes[z.id]?.trim()} onClick={()=>void act(z.id,z.status==='assigned'?'report_complete':'review_completion',{note:notes[z.id]})}>{z.status==='assigned'?'Report work complete':'Record supervisor review'}</Btn></div></div>}
   <div className="og-go"><Btn href={`/ngo/map?zone=${z.id}`}>View boundary on map</Btn><Btn aria-expanded={reporting===z.id} onClick={()=>setReporting(old=>old===z.id?null:z.id)}>Activity and survey reporting</Btn></div>
   {reporting===z.id&&<ZoneProgress zoneId={z.id}/>}
  </div>}
 </li>})}</ul>}</Panel>}
 </Page></NgoGate>
}
