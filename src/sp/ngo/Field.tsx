"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Field mode: the round (decisions 021, 033, 043).

   The phone in one hand, on the street. The page is a round of stops:
   the follow-ups due on the cases you hold, then the cases themselves.
   One large control records an animal that is in front of you. Each stop
   carries its one thumb action; "Record" opens four tools (note, evidence,
   vaccination, care or movement) and one form at a time.

   Where a record goes is a chip in the head, not a mode to choose first:
   online it saves straight to the register; offline it is kept on this
   phone, locked with the PIN, and sent when the person chooses. "This
   phone" lists what is waiting and what was sent. Waiting is never shown
   as saved.
   ════════════════════════════════════════════════════════════════════ */

import { shortCode } from "@/lib/caseCode";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Camera, Check, ChevronDown, Lock, MapPin, PenLine, Play, Plus, Route, ScanLine, Smartphone, Syringe, Trash2, WifiOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { dueFollowups, openCases, type DueFollowup, type OpenCase } from "@/lib/ops";
import { Ack, day, since } from "../ui";
import { Empty } from "../ui/Page";
import { addNote, setFollowup, startWork, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./ngo.css";
import "./round.css";
import {OfflineStorage} from "./OfflineStorage";
import {IntakeDraft,type KnownAnimal} from "./IntakeDraft";
import {LifecycleForm} from "./LifecycleForm";
import type {IntakeData,LifecycleData,OperationKind,WorkflowPolicy} from "@/lib/operations";
import {VaccinationDraft} from "./VaccinationDraft";
import {useMembership} from "../shell/Shell";
import {readDrafts,putDraft,deleteDraft,fieldCache,archiveDraft,readSynced,offlineUnlocked,lockOffline,startOnlineSession,clearOfflineDevice,type SyncedFieldRecord,type VaccinationData,type FieldDraft} from "@/lib/field/outbox";
import {getSupabase} from "@/lib/supabase";
import {submitFieldDraft} from "@/lib/field/sync";
import {compressForUpload} from "@/lib/photo/compress";
import {EVIDENCE_LABEL,type EvidenceKind} from "@/lib/abc";

export function Field() {
  const { user } = useAuth();
  const mem=useMembership();
  const base=user&&mem.org?`${user.id}:${mem.org.id}`:null;
  /* Online: work starts at once and every record syncs as it is saved. Offline: records wait on this phone, encrypted with the PIN. */
  const [mode,setMode]=useState<'online'|'offline'>('online');
  const [storageError,setStorageError]=useState<string|null>(null);
  const [scope,setScope]=useState<string|null>(null);
  const [storageOpen,setStorageOpen]=useState(false),[addingIntake,setAddingIntake]=useState(false);
  const [known,setKnown]=useState<KnownAnimal[]>([]),[policies,setPolicies]=useState<WorkflowPolicy[]>([]),[synced,setSynced]=useState<SyncedFieldRecord[]>([]);
  useEffect(()=>{const q=new URLSearchParams(window.location.search).get('mode');if(q==='offline'||!navigator.onLine)setMode('offline')},[]);
  useEffect(()=>{let live=true;setStorageOpen(false);if(!base){setScope(null);return}
    const begin=()=>{if(mode==='online')void startOnlineSession(base).then(sc=>{if(live){setScope(sc);setStorageOpen(true)}}).catch(()=>{if(live)setStorageError('This browser cannot save field records. Use the work queue.')});else{setScope(base);setStorageOpen(offlineUnlocked(base))}};
    begin();const lock=()=>{if(live)begin()};window.addEventListener("straypaw-offline-locked",lock);return()=>{live=false;window.removeEventListener("straypaw-offline-locked",lock)}},[base,mode]);
  const [vaccinationDefaults,setVaccinationDefaults]=useState<Pick<VaccinationData,'vaccine'|'batch'|'performedBy'>|undefined>();
  useEffect(()=>{let live=true;setVaccinationDefaults(undefined);if(scope)void fieldCache<Pick<VaccinationData,'vaccine'|'batch'|'performedBy'>>(`vaccination-settings:${scope}`).then(c=>{if(live)setVaccinationDefaults(c?.value)}).catch(()=>{});return()=>{live=false}},[scope,storageOpen]);
  const [legacyDrafts,setLegacyDrafts]=useState(false);
  useEffect(()=>{try{setLegacyDrafts(localStorage.getItem("sp2.field.drafts")!==null)}catch{}},[]);
  const [syncing,setSyncing]=useState(false);
  const currentScope=useRef(scope);currentScope.current=scope;
  const syncLock=useRef(false);
  const [offlineReady,setOfflineReady]=useState(false);
  useEffect(()=>{
    if(!('serviceWorker' in navigator))return;let live=true;
    void(async()=>{
      const registration=await navigator.serviceWorker.register('/sw.js');
      const worker=registration.installing??registration.waiting??registration.active;
      if(!worker)throw Error('Offline worker unavailable');
      if(worker.state!=='activated')await new Promise<void>((resolve,reject)=>{worker.addEventListener('statechange',()=>{if(worker.state==='activated')resolve();if(worker.state==='redundant')reject(Error('Offline setup interrupted'))})});
      const ready=await new Promise<boolean>(resolve=>{const channel=new MessageChannel();const timer=setTimeout(()=>resolve(false),15000);channel.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data?.ready===true)};worker.postMessage({type:'warm-field-shell',urls:performance.getEntriesByType('resource').map(e=>e.name)},[channel.port2])});
      if(live)setOfflineReady(ready);
    })().catch(()=>{});return()=>{live=false};
  },[]);
  const [cachedAt,setCachedAt]=useState<string|null>(null);
  const [assignedIds,setAssignedIds]=useState<string[]>([]);
  const [cases, setCases] = useState<OpenCase[] | null>(null);
  const [fus, setFus] = useState<DueFollowup[]>([]);
  const [online, setOnline] = useState(true);
  const [drafts, setDrafts] = useState<FieldDraft[]>([]);
  const visibleDrafts=drafts.filter(d=>d.scope===scope);
  const [failed, setFailed] = useState(false);
  const [r, setR] = useState<Record<string, Receipt>>({});

  const load = useCallback(async () => {
    setFailed(false);
    if(scope&&!navigator.onLine){const cached=await fieldCache<{cases:OpenCase[];fus:DueFollowup[];assignedIds:string[];known?:KnownAnimal[];policies?:WorkflowPolicy[]}>(scope).catch(()=>undefined);if(currentScope.current!==scope)return;setCases(cached?.value.cases??null);setFus(cached?.value.fus??[]);setAssignedIds(cached?.value.assignedIds??[]);setCachedAt(cached?.at??null);setKnown(cached?.value.known??[]);setPolicies(cached?.value.policies??[]);setFailed(!cached);return}
    try { const db=getSupabase();if(!db||!user||!mem.org)throw Error("Workspace unavailable");const [c, f, assigned, animals, policy] = await Promise.all([openCases(), dueFollowups(),db.from("cases").select("id").eq("ngo_id",mem.org.id).eq("assignee_id",user.id).limit(800),db.from("dogs").select("id,name,code,straypaw_id,identifiers").eq("ngo_id",mem.org.id).order("created_at",{ascending:false}).limit(500),db.from("operations_policies").select("id,name,version,rules,source_reference").eq("ngo_id",mem.org.id).order("created_at",{ascending:false}).limit(100)]);if(assigned.error||animals.error||policy.error)throw assigned.error??animals.error??policy.error;const ids=(assigned.data??[]).map(c=>c.id); if(currentScope.current!==scope)return;setCases(c);setFus(f);setAssignedIds(ids);setCachedAt(null);setKnown(animals.data??[]);setPolicies((policy.data??[]) as WorkflowPolicy[]);if(scope)await fieldCache(scope,{cases:c,fus:f,assignedIds:ids,known:animals.data??[],policies:policy.data??[]}).catch(()=>setStorageError("Assignments could not be cached on this device. Keep the page open when offline.")); } catch { if(currentScope.current!==scope)return;setFailed(true);if(scope){const cached=await fieldCache<{cases:OpenCase[];fus:DueFollowup[];assignedIds:string[];known?:KnownAnimal[];policies?:WorkflowPolicy[]}>(scope).catch(()=>undefined);setCases(cached?.value.cases??null);setFus(cached?.value.fus??[]);setAssignedIds(cached?.value.assignedIds??[]);setCachedAt(cached?.at??null);setKnown(cached?.value.known??[]);setPolicies(cached?.value.policies??[])} }
  }, [scope,user,mem.org]);
  useEffect(() => { setCases(null);setFus([]);setAssignedIds([]);if (user&&scope&&storageOpen) void load(); }, [user, scope, load,storageOpen]);
  useEffect(() => {
    setDrafts([]);
    let live=true;
    if(scope&&storageOpen)Promise.all([readDrafts(scope),readSynced(scope)]).then(([d,journal])=>{if(live){setDrafts(d);setSynced(journal)}}).catch(()=>{if(live)setStorageError("Device storage could not be opened. Keep this page open and copy your unsent note.")});
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { live=false; window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [scope,storageOpen]);

  const mine = useMemo(() => (cases ?? []).filter((c) => assignedIds.includes(c.id) && c.provenance !== "imported_historical_record"), [cases, assignedIds]);
  const myFus = useMemo(() => { const ids = new Set(mine.map((c) => c.id)); return fus.filter((f) => f.source === "scheduled" && (f.case_id && ids.has(f.case_id))).sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at)); }, [fus, mine]);
  const unowned = useMemo(() => (cases ?? []).filter((c) => !c.assignee_name && c.provenance !== "imported_historical_record").length, [cases]);
  const actor = user ? { id: user.id, name: user.name } : null;
  const done = (k: string, x: Receipt) => setR((m) => ({ ...m, [k]: x }));

  const note = async (c: OpenCase, text: string) => {
    if (!actor||!scope) throw Error('Sign in to your organisation before recording work');
    const d:FieldDraft={id:crypto.randomUUID(),scope,caseId:c.id,code:c.case_code,note:text,at:new Date().toISOString(),status:'pending'};
    try{await putDraft(d);setDrafts(await readDrafts(scope));setStorageError(null)}catch{setStorageError('Draft could not be saved on this device. Copy your note before leaving.');throw Error('Device storage unavailable')}
  };
  const evidence=async(c:OpenCase,kind:EvidenceKind,file:File|null,location:string)=>{
    if(!scope)throw Error('Sign in to your organisation');if(kind!=='release_location'&&!file)throw Error('Choose an evidence file');if(file&&!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type))throw Error('Choose JPEG, PNG, WebP or PDF');
    const body=file?await compressForUpload(file):undefined;if(body&&body.size>15*1024*1024)throw Error('File is over 15 MB');
    await putDraft({id:crypto.randomUUID(),scope,caseId:c.id,code:c.case_code,note:EVIDENCE_LABEL[kind],kind,file:body,location,at:new Date().toISOString(),status:'pending'});setDrafts(await readDrafts(scope));
  };
  const vaccination=async(c:OpenCase,v:VaccinationData)=>{if(!scope||c.dog_id!==v.dogId)throw Error('Open the matching registered animal first');await putDraft({id:crypto.randomUUID(),scope,caseId:c.id,code:c.case_code,note:`ARV field record · ${v.vaccine} · batch ${v.batch}`,vaccination:v,at:new Date().toISOString(),status:'pending'});const defaults={vaccine:v.vaccine,batch:v.batch,performedBy:v.performedBy};if(currentScope.current===scope)setVaccinationDefaults(defaults);await fieldCache(`vaccination-settings:${scope}`,defaults).catch(()=>{});setDrafts(await readDrafts(scope))};
  const intake=async(data:IntakeData,file:File|null,requestId:string)=>{
    if(!scope)throw Error('Sign in first');if(file&&!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Choose a JPEG, PNG or WebP photo');const body=file?await compressForUpload(file):undefined;if(body&&body.size>15*1024*1024)throw Error('Photo is over 15 MB');
    await putDraft({id:requestId,caseId:requestId,scope,code:null,note:`Animal intake · ${data.name||data.code||data.identifiers||'identity provisional'}`,intake:data,file:body,at:data.observedAt,status:'pending'});setDrafts(await readDrafts(scope));
  };
  const operation=async(caseId:string,code:string|null,kind:OperationKind,data:LifecycleData,policyId:string|null,requestId:string,intakeRequest?:string)=>{
    if(!scope)throw Error('Sign in first');await putDraft({id:requestId,scope,caseId,code,note:`${kind} · ${data.notes}`,lifecycle:{kind,data,policyId},intakeRequest,at:data.occurredAt,status:'pending'});setDrafts(await readDrafts(scope));
  };
  const sendDrafts = async (selected?:string[]) => {
    if (!actor||!scope||syncLock.current||!storageOpen) return;
    syncLock.current=true;setSyncing(true);
    try{const queued=(await readDrafts(scope)).filter(d=>!selected||selected.includes(d.id)).sort((a,b)=>Number(!!b.intake)-Number(!!a.intake)||Date.parse(a.at)-Date.parse(b.at));for(const d of queued){
      if(currentScope.current!==scope)break;
      try{const saved=await submitFieldDraft(d,actor.id,mem.org!.id);await archiveDraft(d,{id:d.id,scope,at:saved.confirmedAt,caseId:saved.caseId,dogId:saved.dogId,auditId:saved.audit_id,label:d.note.slice(0,120)});done(`n${d.caseId}`,{ok:true,at:saved.confirmedAt,what:'Field record synchronised; source and audit checked'})}catch(e){await putDraft({...d,status:'failed',error:e instanceof Error?e.message:'Sync interrupted'})}
    }await load()}catch(e){setStorageError(e instanceof Error?e.message:'Sync interrupted. Drafts remain on this device.')}
    finally{syncLock.current=false;setSyncing(false);if(currentScope.current===scope)try{setDrafts(await readDrafts(scope));setSynced(await readSynced(scope))}catch{setStorageError("Device storage could not be read. Drafts were not discarded.")}}
  };
  /* Online: a saved record goes to the server straight away. */
  useEffect(()=>{if(mode==='online'&&online&&storageOpen&&!syncing&&drafts.some(d=>d.status==='pending'))void sendDrafts()},[mode,online,storageOpen,syncing,drafts]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Where a record goes right now. A chip in the head says it; opening the chip changes it. Nobody chooses a "mode" before they can work. */
  const signal=mode==='offline'?'offline':online?'online':'nosignal';
  const waitingN=visibleDrafts.length;
  const [netOpen,setNetOpen]=useState(false);
  const netShown=netOpen||signal==='nosignal';
  const lateN=myFus.filter(f=>Date.parse(f.due_at)<Date.now()).length;
  const stops=mine.length+myFus.length;
  const today=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"});

  const head=(
    <header className="rn-head">
      <div>
        <p className="rn-date">{today}</p>
        <h1 className="rn-title">Your round</h1>
        <p className="rn-sum" aria-live="polite">{mode==='offline'&&!storageOpen?"Unlock this phone's records to carry on offline.":cases===null?(failed?"Your stops could not be read.":"Reading your stops…"):stops===0?"Nothing is held by you right now.":<><b>{stops}</b> {stops===1?"stop":"stops"}{lateN?<> · <b className="is-hot">{lateN}</b> late</>:null}</>}</p>
      </div>
      <button type="button" className="rn-net" data-signal={signal} aria-expanded={netShown} aria-controls="rn-netp" onClick={()=>setNetOpen(v=>!v)}>
        <span className="rn-bars" aria-hidden><i/><i/><i/></span>
        <span className="rn-net-t" role="status"><b>{signal==='online'?'Online':signal==='offline'?'Offline':'No signal'}</b>{waitingN?<small>{waitingN} waiting</small>:null}</span>
        <ChevronDown size={14} aria-hidden/>
      </button>
    </header>
  );
  const netPanel=(
    <div id="rn-netp" className="rn-netp" data-open={netShown} data-signal={signal} inert={netShown?undefined:true}>
      <div className="rn-netp-in" role="group" aria-label="Connection">
        <p>{signal==='online'?'Every record saves straight to your register as you make it.':signal==='offline'?(waitingN?`${waitingN} ${waitingN===1?'record is':'records are'} waiting on this phone. They are sent when you choose, once there is signal.`:'Records stay on this phone, locked with your PIN, until you are back in signal.'):'Nothing can be sent right now. Carry on offline and send when the signal is back.'}</p>
        {signal==='nosignal'
          ?<button type="button" className="btn is-ink rn-go" onClick={()=>setMode('offline')}><WifiOff size={15} aria-hidden/>Keep working offline</button>
          :<button type="button" role="switch" aria-checked={mode==='offline'} className="rn-switch" onClick={()=>setMode(mode==='offline'?'online':'offline')}><span>Work offline</span><i aria-hidden/></button>}
      </div>
    </div>
  );
  if(base&&mode==='offline'&&!storageOpen)return <NgoGate title="Field mode" lede="Your assigned fieldwork."><div className="rn">{head}{netPanel}<div className="rn-lock"><OfflineStorage scope={base} onUnlock={()=>setStorageOpen(true)} onPage/></div></div></NgoGate>;

  return (
    <NgoGate title="Field mode" lede="Your cases and follow-ups for today, one hand, on the street.">
      <div className="rn">
        {head}
        {netPanel}
        <div className="rn-grid">
          <div className="rn-main">
            <button type="button" className={`rn-capture${addingIntake?" is-open":""}`} aria-label="Register animal intake" aria-expanded={addingIntake} onClick={()=>setAddingIntake(v=>!v)}>
              <span className="rn-capture-ic" aria-hidden><Camera size={20}/></span>
              <span className="rn-capture-t"><b>Record an animal</b><small>A photo, the place and why it is here. About a minute.</small></span>
              <span className="rn-capture-x" aria-hidden><Plus size={18}/></span>
            </button>
            {addingIntake&&<div className="rn-sheet"><IntakeDraft known={known} onSave={intake} onCancel={()=>setAddingIntake(false)}/></div>}
            {storageError&&<p className="rn-alert" role="alert">{storageError}</p>}
            {legacyDrafts&&<p className="rn-note" role="status">Older drafts on this phone can&apos;t be imported. Ask your admin.</p>}
            {cachedAt&&<p className="rn-note" role="status">Showing the stops saved on this phone at {new Date(cachedAt).toLocaleString()}. They may have changed since; sending checks your current access.</p>}
            {visibleDrafts.map(d=>d.error&&<p key={d.id} className="rn-alert" role="status">{d.code??"Record"}: {d.error}</p>)}
            {failed&&<div className="rn-alert" role="alert"><span>Your stops could not be read. If you are offline, records you make are still kept on this phone.</span><button type="button" className="btn is-s" onClick={()=>void load()}>Try again</button></div>}

            {cases===null&&!failed?<ol className="rn-stops" aria-hidden><li className="rn-skel"/><li className="rn-skel"/><li className="rn-skel"/></ol>:null}

            {myFus.length>0&&<section aria-labelledby="rn-due">
              <h2 className="rn-h" id="rn-due">Due<b>{myFus.length}</b></h2>
              <ol className="rn-stops">
                {myFus.map((f,j)=>{
                  const late=Date.parse(f.due_at)<Date.now(),rc=r[`f${f.id}`];
                  return (
                    <li key={f.id} className={`rn-stop${late?" is-late":""}${rc?.ok?" is-done":""}`} style={{["--j" as string]:j}}>
                      <span className="rn-when"><b>{late?"Late":"Due"}</b><small>{day(f.due_at)}</small></span>
                      <div className="rn-body">
                        <h3>{(f.kind??"Recheck").replace(/_/g," ")}{f.animal_name?` · ${f.animal_name}`:""}</h3>
                        <p>{[shortCode(f.case_code,"follow-up"),f.zone,f.note].filter(Boolean).join(" · ")}</p>
                      </div>
                      {rc?.ok?<p className="rn-ok"><Check size={15} aria-hidden/>{(rc as {what:string}).what}</p>:(
                        <div className="rn-acts">
                          <button type="button" className="rn-btn is-yes" disabled={!online} onClick={async()=>done(`f${f.id}`,await setFollowup(f.id,"done"))}><Check size={16} aria-hidden/>Done</button>
                          <button type="button" className="rn-btn" disabled={!online} onClick={async()=>done(`f${f.id}`,await setFollowup(f.id,"missed"))}>Missed</button>
                        </div>
                      )}
                      {!online&&!rc?.ok?<p className="rn-hint">Marking a follow-up needs signal.</p>:null}
                      {rc&&!rc.ok&&<Ack state="failed">Not saved: {(rc as {error:string}).error}</Ack>}
                    </li>
                  );
                })}
              </ol>
            </section>}

            {mine.length>0&&<section aria-labelledby="rn-yours">
              <h2 className="rn-h" id="rn-yours">In your hands<b>{mine.length}</b></h2>
              <ol className="rn-stops">
                {mine.map((c,j)=><CaseStop key={c.id} j={j} c={c} online={online} receipt={r[`n${c.id}`]} startR={r[`s${c.id}`]} drafted={visibleDrafts.filter((d)=>d.caseId===c.id).length} onStart={async()=>actor&&done(`s${c.id}`,await startWork(c.id,actor))} onNote={(t)=>note(c,t)} onEvidence={(kind,file,location)=>evidence(c,kind,file,location)} onVaccination={v=>vaccination(c,v)} vaccinationDefaults={vaccinationDefaults} policies={policies} onOperation={(kind,data,policyId,requestId)=>operation(c.id,c.case_code,kind,data,policyId,requestId)}/>)}
              </ol>
            </section>}

            {cases!==null&&!failed&&!stops&&(
              <Empty title="Nothing is held by you" action={<Link className="btn is-ink" href={unowned?"/ngo/work?focus=unowned":"/ngo/work"}>{unowned?`See ${unowned} unowned case${unowned===1?"":"s"}`:"Open the queue"}</Link>}>Take a case from the queue and it becomes a stop here.</Empty>
            )}
          </div>

          <aside className={`rn-side${waitingN?" has-waiting":""}`} aria-label="This phone">
            <div className="rn-phone">
              <span className="rn-phone-ic" aria-hidden><Smartphone size={16}/></span>
              <div><b>This phone</b><small>{waitingN?`${waitingN} ${waitingN===1?"record":"records"} not sent yet`:offlineReady?"Ready to work without signal":"Nothing waiting to be sent"}</small></div>
            </div>

            {waitingN>0&&<section className="rn-tray" aria-label="Unsent field records">
              <div className="rn-tray-head">
                <h2>Not sent</h2>
                <button type="button" className="btn is-ink is-s" disabled={!online||syncing} onClick={()=>void sendDrafts()}>{syncing?"Sending…":online?(waitingN===1?"Send it":`Send all ${waitingN}`):"Waiting for signal"}</button>
              </div>
              <ul>
                {visibleDrafts.map(d=><li key={d.id}><details>
                  <summary><i className="rn-dot" data-state={d.status==='failed'?'failed':'pending'} aria-hidden/><span><b>{d.survey?'Survey observation':d.intake?'Animal intake':d.code?shortCode(d.code):'Field record'}</b><small>{new Date(d.at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} · {d.status==='failed'?'Needs another try':'Waiting'}</small></span><ChevronDown size={14} aria-hidden/></summary>
                  <div className="rn-draft">
                    <p style={{whiteSpace:'pre-wrap'}}>{d.note}</p>
                    {d.location&&<p>{d.location}</p>}
                    {d.vaccination&&<p>{d.vaccination.eventDate} · reported vaccinator {d.vaccination.performedBy} · {d.vaccination.dose||"dose not recorded"} · {d.vaccination.route||"route not recorded"} · {d.vaccination.location} · {d.vaccination.notes}</p>}
                    <div className="rn-draft-acts">
                      <button className="btn is-s" type="button" disabled={!online||syncing} onClick={()=>void sendDrafts([d.id])}>Send this one</button>
                      {d.file&&<button className="btn is-s" type="button" onClick={()=>{const url=URL.createObjectURL(d.file!);const a=document.createElement('a');a.href=url;a.download=`field-evidence-${d.id}.${d.file!.type==='application/pdf'?'pdf':d.file!.type==='image/png'?'png':d.file!.type==='image/webp'?'webp':'jpg'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}>Download the file</button>}
                      <button className="btn is-s is-ghost" type="button" onClick={async()=>{if(!scope||!window.confirm('Remove this copy from the phone? A record that was already sent stays on the server.'))return;try{await deleteDraft(d.id);setDrafts(await readDrafts(scope))}catch{setStorageError('The copy on this phone could not be removed.')}}}>Remove from phone</button>
                      {d.survey&&<Link className="rn-link" href={`/surveys/${d.survey.surveyId}`}>Open the survey</Link>}
                      {!d.survey&&!d.intake&&!d.intakeRequest&&<Link className="rn-link" href={`/ngo/cases/${d.caseId}`}>Open the case</Link>}
                    </div>
                    {d.intake&&<PendingIntakeOperation policies={policies} onSave={(kind,data,policyId,requestId)=>operation(d.caseId,d.code,kind,data,policyId,requestId,d.id)}/>}
                  </div>
                </details></li>)}
              </ul>
            </section>}

            {synced.length>0&&<details className="rn-sent">
              <summary><Check size={14} aria-hidden/><span>Sent from this phone<b>{synced.length}</b></span><ChevronDown size={14} aria-hidden/></summary>
              <ul>{[...synced].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,30).map(x=><li key={x.id}><Link href={`/ngo/cases/${x.caseId}`}>{x.label}</Link><small>Sent {new Date(x.at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} · receipt {x.auditId}</small></li>)}</ul>
            </details>}

            <nav className="rn-more" aria-label="Also in the field">
              <Link href="/ngo/animals/scan"><ScanLine size={15} aria-hidden/>Scan a tag</Link>
              <Link href="/ngo/programmes/zones"><MapPin size={15} aria-hidden/>Zones</Link>
              {mode==='offline'&&<button type="button" onClick={()=>lockOffline()}><Lock size={15} aria-hidden/>Lock offline records</button>}
              {mode==='offline'&&<button type="button" onClick={async()=>{if(!scope||!window.confirm('Remove the sent records kept on this phone? Records still waiting must be sent or removed first.'))return;try{await clearOfflineDevice(scope);setStorageOpen(false)}catch(e){setStorageError(e instanceof Error?e.message:'The records on this phone were not removed.')}}}><Trash2 size={15} aria-hidden/>Clear sent records from this phone</button>}
            </nav>
          </aside>
        </div>
      </div>
    </NgoGate>
  );
}

type Tool='note'|'evidence'|'vacc'|'care';

function CaseStop({ j, c, online, receipt, startR, drafted, onStart, onNote, onEvidence, onVaccination, vaccinationDefaults,policies,onOperation }: { j:number; c: OpenCase; online: boolean; receipt?: Receipt; startR?: Receipt; drafted: number; onStart: () => void; onNote: (t: string) => Promise<void>;onEvidence:(kind:EvidenceKind,file:File|null,location:string)=>Promise<void>;onVaccination:(v:VaccinationData)=>Promise<void>;vaccinationDefaults?:Pick<VaccinationData,'vaccine'|'batch'|'performedBy'>;policies:WorkflowPolicy[];onOperation:(kind:OperationKind,data:LifecycleData,policyId:string|null,requestId:string)=>Promise<void> }) {
  /* One card, one thing open at a time: the tools, then the one form the person chose. */
  const [open,setOpen]=useState(false),[tool,setTool]=useState<Tool|null>(null);
  const [kind,setKind]=useState<EvidenceKind>('capture_photo'),[file,setFile]=useState<File|null>(null),[location,setLocation]=useState(''),[error,setError]=useState<string|null>(null);
  const [t,setT]=useState("");
  const [busy,setBusy]=useState(false);
  const started=c.status_class==="in_progress"||!!startR?.ok;
  const pick=(x:Tool)=>{setTool(v=>v===x?null:x);setError(null)};
  const shut=()=>setTool(null);
  const tools:[Tool,string,typeof PenLine,boolean][]=[['note','Note',PenLine,true],['evidence','Evidence',Camera,true],['vacc','Vaccination',Syringe,!!c.dog_id],['care','Care or movement',Route,!!c.dog_id]];
  return (
    <li className={`rn-stop${open?" is-open":""}`} style={{["--j" as string]:j}}>
      <span className="rn-when" data-on={started||undefined}><b>{started?"Started":"Open"}</b><small>{since(c.occurred_at)}</small></span>
      <div className="rn-body">
        <h3><Link href={`/ngo/cases/${c.id}`}>{c.condition_class&&c.condition_class!=="Not recorded"?c.condition_class:c.title??"Case"}</Link></h3>
        <p>{[shortCode(c.case_code),c.animal_name,c.zone].filter(Boolean).join(" · ")||"Animal and place not recorded"}</p>
      </div>
      <div className="rn-acts">
        {!started&&<button type="button" className="rn-btn is-yes" disabled={!online} onClick={onStart}><Play size={15} aria-hidden/>Start</button>}
        <button type="button" className={`rn-btn${started?" is-yes":""}`} aria-expanded={open} onClick={()=>{setOpen(v=>!v);if(open)shut()}}><Plus size={16} aria-hidden className="rn-plus"/>Record</button>
      </div>
      {open&&<div className="rn-tools" role="group" aria-label="What to record on this case">
        {tools.filter(x=>x[3]).map(([id,label,Icon])=><button key={id} type="button" aria-pressed={tool===id} onClick={()=>pick(id)}><Icon size={18} aria-hidden/><span>{label}</span></button>)}
        <Link href={`/ngo/cases/${c.id}`}><ArrowUpRight size={18} aria-hidden/><span>Open the case</span></Link>
      </div>}
      {error&&<p className="rn-alert" role="alert">{error}</p>}
      {open&&tool==='note'&&(
        <form className="rn-form" onSubmit={async(e)=>{e.preventDefault();if(!t.trim())return;setBusy(true);try{await onNote(t.trim());setT("");shut()}catch{/* Keep unsaved text visible. */}finally{setBusy(false)}}}>
          <textarea className="textarea" value={t} onChange={(e)=>setT(e.target.value)} placeholder="What you saw or did" maxLength={1500} autoFocus aria-label="Note"/>
          <div className="rn-form-acts"><button type="submit" className="btn is-ink" disabled={busy||!t.trim()}>{busy?"Saving…":online?"Save the note":"Keep on this phone"}</button><button type="button" className="btn is-ghost" onClick={shut}>Cancel</button></div>
        </form>
      )}
      {open&&tool==='evidence'&&<form className="rn-form stack" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onEvidence(kind,file,location);shut();setFile(null);setLocation('');setError(null)}catch(x){setError(x instanceof Error?x.message:'The evidence could not be kept. Keep the file on this phone.')}finally{setBusy(false)}}}>
        <label>Evidence type<select aria-label="Evidence type" className="input" value={kind} onChange={e=>setKind(e.target.value as EvidenceKind)}>{Object.entries(EVIDENCE_LABEL).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        {kind!=='release_location'&&<label>Evidence file<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={e=>setFile(e.target.files?.[0]??null)}/></label>}
        <label>Location observation<textarea className="textarea" maxLength={1500} required={kind==='release_location'} value={location} onChange={e=>setLocation(e.target.value)}/></label>
        <button type="button" className="btn" onClick={()=>navigator.geolocation.getCurrentPosition(p=>setLocation(`Observed GPS: ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}`),()=>setError('Location unavailable. You can record the location in words.'))}><MapPin size={15} aria-hidden/>Use current location</button>
        <div className="rn-form-acts"><button className="btn is-ink" disabled={busy}>{online?"Save the evidence":"Keep on this phone"}</button><button className="btn is-ghost" type="button" onClick={shut}>Cancel</button></div>
      </form>}
      {open&&tool==='vacc'&&c.dog_id&&<div className="rn-form"><VaccinationDraft dogId={c.dog_id} defaults={vaccinationDefaults} onSave={onVaccination} onCancel={shut}/></div>}
      {open&&tool==='care'&&<div className="rn-form"><LifecycleForm policies={policies} onSave={onOperation} onCancel={shut}/></div>}
      <div className="rn-said" aria-live="polite">
        {startR&&(startR.ok?<p className="rn-ok"><Check size={15} aria-hidden/>{startR.what}</p>:<Ack state="failed">Not saved: {startR.error}</Ack>)}
        {receipt&&(receipt.ok?<p className="rn-ok"><Check size={15} aria-hidden/>{receipt.what}</p>:<Ack state="failed">Not sent: {receipt.error}</Ack>)}
        {drafted>0&&<p className="rn-wait"><i className="rn-dot" data-state="pending" aria-hidden/>{drafted} {drafted===1?"record":"records"} on this phone, not sent</p>}
      </div>
    </li>
  );
}

function PendingIntakeOperation({policies,onSave}:{policies:WorkflowPolicy[];onSave:(kind:OperationKind,data:LifecycleData,policyId:string|null,requestId:string)=>Promise<void>}){const [open,setOpen]=useState(false);return open?<div className="rn-form"><LifecycleForm policies={policies} onSave={onSave} onCancel={()=>setOpen(false)}/></div>:<button className="btn is-s" onClick={()=>setOpen(true)}>Add what was done to this animal</button>}
