"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Field mode (decisions 021, 033, 043).

   The phone in one hand, on the street. Only what is yours today: the
   cases you hold and the follow-ups due on them, nearest deadline first,
   each with the one action that fits a thumb. A note typed with no signal
   is kept on this device as a draft, labelled "not sent", and sent only
   when you choose to once the connection is back. Pending is never saved.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { dueFollowups, openCases, type DueFollowup, type OpenCase } from "@/lib/ops";
import { Ack, State, day, since, PageBrief } from "../ui";
import { Reading } from "../ui/Reading";
import { addNote, setFollowup, startWork, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./ngo.css";
import {VaccinationDraft} from "./VaccinationDraft";
import {useMembership} from "../shell/Shell";
import {readDrafts,putDraft,deleteDraft,fieldCache,type VaccinationData,type FieldDraft} from "@/lib/field/outbox";
import {getSupabase} from "@/lib/supabase";
import {submitFieldDraft} from "@/lib/field/sync";
import {compressForUpload} from "@/lib/photo/compress";
import {EVIDENCE_LABEL,type EvidenceKind} from "@/lib/abc";

export function Field() {
  const { user } = useAuth();
  const mem=useMembership();
  const scope=user&&mem.org?`${user.id}:${mem.org.id}`:null;
  const [vaccinationDefaults,setVaccinationDefaults]=useState<Pick<VaccinationData,'vaccine'|'batch'|'performedBy'>|undefined>();
  useEffect(()=>{let live=true;setVaccinationDefaults(undefined);if(scope)void fieldCache<Pick<VaccinationData,'vaccine'|'batch'|'performedBy'>>(`vaccination-settings:${scope}`).then(c=>{if(live)setVaccinationDefaults(c?.value)}).catch(()=>{});return()=>{live=false}},[scope]);
  const [legacyDrafts,setLegacyDrafts]=useState(false);
  useEffect(()=>{try{setLegacyDrafts(localStorage.getItem("sp2.field.drafts")!==null)}catch{}},[]);
  const [storageError,setStorageError]=useState<string|null>(null);
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
    if(scope&&!navigator.onLine){const cached=await fieldCache<{cases:OpenCase[];fus:DueFollowup[];assignedIds:string[]}>(scope).catch(()=>undefined);if(currentScope.current!==scope)return;setCases(cached?.value.cases??null);setFus(cached?.value.fus??[]);setAssignedIds(cached?.value.assignedIds??[]);setCachedAt(cached?.at??null);setFailed(!cached);return}
    try { const db=getSupabase();if(!db||!user||!mem.org)throw Error("Workspace unavailable");const [c, f, assigned] = await Promise.all([openCases(), dueFollowups(),db.from("cases").select("id").eq("ngo_id",mem.org.id).eq("assignee_id",user.id).limit(800)]);if(assigned.error)throw assigned.error;const ids=(assigned.data??[]).map(c=>c.id); if(currentScope.current!==scope)return;setCases(c);setFus(f);setAssignedIds(ids);setCachedAt(null);if(scope)await fieldCache(scope,{cases:c,fus:f,assignedIds:ids}).catch(()=>setStorageError("Assignments could not be cached on this device. Keep the page open when offline.")); } catch { if(currentScope.current!==scope)return;setFailed(true);if(scope){const cached=await fieldCache<{cases:OpenCase[];fus:DueFollowup[];assignedIds:string[]}>(scope).catch(()=>undefined);setCases(cached?.value.cases??null);setFus(cached?.value.fus??[]);setAssignedIds(cached?.value.assignedIds??[]);setCachedAt(cached?.at??null)} }
  }, [scope,user,mem.org]);
  useEffect(() => { setCases(null);setFus([]);setAssignedIds([]);if (user&&scope) void load(); }, [user, scope, load]);
  useEffect(() => {
    setDrafts([]);
    let live=true;
    if(scope)readDrafts(scope).then(d=>{if(live)setDrafts(d)}).catch(()=>{if(live)setStorageError("Device storage could not be opened. Keep this page open and copy your unsent note.")});
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { live=false; window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [scope]);

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
  const sendDrafts = async (selected?:string[]) => {
    if (!actor||!scope||syncLock.current) return;
    syncLock.current=true;setSyncing(true);
    try{for(const d of (await readDrafts(scope)).filter(d=>!selected||selected.includes(d.id))){
      if(currentScope.current!==scope)break;
      let confirmedAt:string;try{const saved=await submitFieldDraft(d,actor.id,mem.org!.id);confirmedAt=saved.confirmedAt}catch(e){await putDraft({...d,status:'failed',error:e instanceof Error?e.message:'Sync interrupted'});continue}
      await deleteDraft(d.id);done(`n${d.caseId}`,{ok:true,at:confirmedAt,what:'Field record synchronised; source and audit checked'});
    }}catch(e){setStorageError(e instanceof Error?e.message:'Sync interrupted. Drafts remain on this device.')}
    finally{syncLock.current=false;setSyncing(false);if(currentScope.current===scope)try{setDrafts(await readDrafts(scope))}catch{setStorageError("Device storage could not be read. Drafts were not discarded.")}}
  };

  return (
    <NgoGate title="Field mode" lede="Your cases and follow-ups for today, one hand, on the street.">
      <div className="fd">
        <p><Link href="/ngo/programmes/zones">Working zones and assignments</Link></p>
        {storageError&&<p role="alert">{storageError}</p>}
        {legacyDrafts&&<p role="status">Older field drafts remain on this device. They have no account identity, so they cannot be imported automatically. Ask your organisation administrator to arrange recovery with the person who recorded them.</p>}
        {cachedAt&&<p role="status">Offline assignment snapshot from {new Date(cachedAt).toLocaleString()}. Assignments may have changed; synchronisation checks current access.</p>}
        {visibleDrafts.length>0&&<section aria-label="Unsent field records"><h2>On this device · not submitted</h2>{visibleDrafts.map(d=><details key={d.id}><summary>{d.code??'Case'} · {new Date(d.at).toLocaleString()} · {d.status==='failed'?'Needs retry':'Pending'}</summary><p style={{whiteSpace:'pre-wrap'}}>{d.note}</p>{d.location&&<p>{d.location}</p>}{d.vaccination&&<p>{d.vaccination.eventDate} · reported vaccinator {d.vaccination.performedBy} · {d.vaccination.dose||"dose not recorded"} · {d.vaccination.route||"route not recorded"} · {d.vaccination.location} · {d.vaccination.notes}</p>}{d.file&&<button className="btn" type="button" onClick={()=>{const url=URL.createObjectURL(d.file!);const a=document.createElement('a');a.href=url;a.download=`field-evidence-${d.id}.${d.file!.type==='application/pdf'?'pdf':d.file!.type==='image/png'?'png':d.file!.type==='image/webp'?'webp':'jpg'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}>Download device file</button>}<button className="btn" disabled={!online||syncing} onClick={()=>void sendDrafts([d.id])}>Synchronise this record</button><button className="btn" onClick={async()=>{if(!scope||!window.confirm('Remove this device copy? An already synchronised record will remain on the server.'))return;try{await deleteDraft(d.id);setDrafts(await readDrafts(scope))}catch{setStorageError('The device copy could not be removed.')}}}>Remove device copy</button><Link href={`/ngo/cases/${d.caseId}`}>Open case</Link></details>)}</section>}
        {visibleDrafts.map(d=>d.error&&<p key={d.id} role="status">{d.code??"Case"}: {d.error}</p>)}
        <header className="fd-head">
          <p className="small">{offlineReady?"Field page available offline on this device.":"Preparing this device for offline work…"}</p>
          <p className="k">Field · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</p>
          <h1 className="serif">{cases === null ? failed?"Assignments unavailable":<Reading>Reading your day</Reading> : `${mine.length} case${mine.length === 1 ? "" : "s"}, ${myFus.length} follow-up${myFus.length === 1 ? "" : "s"}`}</h1>
          {!online && <p className="fd-off" role="status"><WifiOff size={15} aria-hidden /> No connection. Field records stay on this device as drafts until you synchronise.</p>}
          {visibleDrafts.length > 0 && (
            <div className="fd-drafts">
              <Ack state="draft">{visibleDrafts.length} field record{visibleDrafts.length === 1 ? "" : "s"} not sent</Ack>
              <button type="button" className="btn is-ink is-s" disabled={!online||syncing} onClick={() => void sendDrafts()}>{syncing ? "Synchronising…" : online ? "Review and synchronise" : "Waiting for a connection"}</button>
            </div>
          )}
        </header>
        <PageBrief items={[["For", "The cases you hold, on your phone, one hand."], ["Watch", "Late follow-ups first."], ["Next", "Done, Missed, Start or a note: one tap each."], ["After", "Saved means the database answered; drafts stay on this device until you choose to synchronise."]]} />
        {failed && <State kind="error" title="Not read" action={<button type="button" className="btn" onClick={() => void load()}>Try again</button>}>Your cases could not be read. If you are offline, drafts still work.</State>}
        {myFus.length > 0 && <h2 className="fd-h">Due</h2>}
        <ul className="fd-cards">
          {myFus.map((f) => {
            const late = Date.parse(f.due_at) < Date.now();
            return (
              <li key={f.id} className={`fd-card${late ? " is-late" : ""}`}>
                <p className="k">{late ? `Late · due ${day(f.due_at)}` : `Due ${day(f.due_at)}`} · {f.case_code ?? "follow-up"}</p>
                <h3>{(f.kind ?? "Recheck").replace(/_/g, " ")}{f.animal_name ? ` · ${f.animal_name}` : ""}</h3>
                <p className="small">{[f.zone, f.note].filter(Boolean).join(" · ") || "No note"}</p>
                {r[`f${f.id}`]?.ok ? <Ack state="saved">{(r[`f${f.id}`] as { what: string }).what}</Ack> : (
                  <div className="fd-act">
                    <button type="button" className="btn is-ink" disabled={!online} onClick={async () => done(`f${f.id}`, await setFollowup(f.id, "done"))}>Done</button>
                    <button type="button" className="btn" disabled={!online} onClick={async () => done(`f${f.id}`, await setFollowup(f.id, "missed"))}>Missed</button>
                  </div>
                )}
                {r[`f${f.id}`] && !r[`f${f.id}`].ok && <Ack state="failed">Not saved: {(r[`f${f.id}`] as { error: string }).error}</Ack>}
              </li>
            );
          })}
        </ul>
        {mine.length > 0 && <h2 className="fd-h">Yours</h2>}
        <ul className="fd-cards">
          {mine.map((c) => <CaseCard key={c.id} c={c} online={online} receipt={r[`n${c.id}`]} startR={r[`s${c.id}`]} drafted={visibleDrafts.filter((d) => d.caseId === c.id).length} onStart={async () => actor && done(`s${c.id}`, await startWork(c.id, actor))} onNote={(t) => note(c, t)} onEvidence={(kind,file,location)=>evidence(c,kind,file,location)} onVaccination={v=>vaccination(c,v)} vaccinationDefaults={vaccinationDefaults} />)}
        </ul>
        {cases !== null && !failed && !mine.length && !myFus.length && (
          <State art="ngo-empty" title="Nothing held by you" action={<Link className="btn is-ink" href="/ngo/work?focus=unowned">See {unowned} unowned case{unowned === 1 ? "" : "s"}</Link>}>Take a case from Work and it appears here for the field.</State>
        )}
        <p className="small fd-foot">Field mode shows only cases you hold. <Link className="link" href="/ngo/work">Open the full queue</Link>.</p>
      </div>
    </NgoGate>
  );
}

function CaseCard({ c, online, receipt, startR, drafted, onStart, onNote, onEvidence, onVaccination, vaccinationDefaults }: { c: OpenCase; online: boolean; receipt?: Receipt; startR?: Receipt; drafted: number; onStart: () => void; onNote: (t: string) => Promise<void>;onEvidence:(kind:EvidenceKind,file:File|null,location:string)=>Promise<void>;onVaccination:(v:VaccinationData)=>Promise<void>;vaccinationDefaults?:Pick<VaccinationData,'vaccine'|'batch'|'performedBy'> }) {
  const [open, setOpen] = useState(false);
  const [addingVaccination,setAddingVaccination]=useState(false);
  const [addingEvidence,setAddingEvidence]=useState(false),[kind,setKind]=useState<EvidenceKind>('capture_photo'),[file,setFile]=useState<File|null>(null),[location,setLocation]=useState(''),[error,setError]=useState<string|null>(null);
  const [t, setT] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <li className="fd-card">
      <p className="k">{c.case_code ?? "Case"} · {c.status_class === "in_progress" ? "in progress" : "open"} · {since(c.occurred_at)}</p>
      <h3><Link href={`/ngo/cases/${c.id}`}>{c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title ?? "Case"}</Link></h3>
      <p className="small">{[c.animal_name, c.zone].filter(Boolean).join(" · ") || "Animal and place not recorded"}</p>
      {addingVaccination&&c.dog_id&&<VaccinationDraft dogId={c.dog_id} defaults={vaccinationDefaults} onSave={onVaccination} onCancel={()=>setAddingVaccination(false)}/>}
      {error&&<p role="alert">{error}</p>}
      {addingEvidence&&<form className="stack" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onEvidence(kind,file,location);setAddingEvidence(false);setFile(null);setLocation('');setError(null)}catch(x){setError(x instanceof Error?x.message:'Evidence could not be stored. Keep the file on this device.')}finally{setBusy(false)}}}>
        <label>Evidence type<select aria-label="Evidence type" className="input" value={kind} onChange={e=>setKind(e.target.value as EvidenceKind)}>{Object.entries(EVIDENCE_LABEL).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        {kind!=='release_location'&&<label>Evidence file<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={e=>setFile(e.target.files?.[0]??null)}/></label>}
        <label>Location observation<textarea className="textarea" maxLength={1500} required={kind==='release_location'} value={location} onChange={e=>setLocation(e.target.value)}/></label>
        <button type="button" className="btn" onClick={()=>navigator.geolocation.getCurrentPosition(p=>setLocation(`Observed GPS: ${p.coords.latitude}, ${p.coords.longitude}; accuracy ${Math.round(p.coords.accuracy)} m; ${new Date(p.timestamp).toISOString()}`),()=>setError('Location unavailable. You can record the location in words.'))}>Use current location</button>
        <button className="btn is-ink" disabled={busy}>Keep evidence as draft</button><button className="btn" type="button" onClick={()=>setAddingEvidence(false)}>Cancel</button>
      </form>}
      {open ? (
        <form className="fd-note" onSubmit={async (e) => { e.preventDefault(); if (!t.trim()) return; setBusy(true); try{await onNote(t.trim());setT("");setOpen(false)}catch{/* Keep unsaved text visible. */}finally{setBusy(false)} }}>
          <textarea className="textarea" value={t} onChange={(e) => setT(e.target.value)} placeholder="What you saw or did" maxLength={1500} autoFocus aria-label="Note" />
          <div className="fd-act"><button type="submit" className="btn is-ink" disabled={busy || !t.trim()}>{online ? (busy ? "Saving…" : "Keep as draft") : "Keep as draft"}</button><button type="button" className="btn is-ghost" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      ) : (
        <div className="fd-act">
          {c.status_class !== "in_progress" && !startR?.ok && <button type="button" className="btn is-ink" disabled={!online} onClick={onStart}>Start</button>}
          <button type="button" className="btn" onClick={() => setOpen(true)}>Add a note</button>
          <button type="button" className="btn" onClick={()=>setAddingEvidence(true)}>Add evidence</button>
          {c.dog_id&&<button type="button" className="btn" onClick={()=>setAddingVaccination(true)}>Record ARV vaccination</button>}
          <Link className="btn is-ghost" href={`/ngo/cases/${c.id}`}>Close or more</Link>
        </div>
      )}
      <div aria-live="polite">
        {startR && (startR.ok ? <Ack state="saved">{startR.what}</Ack> : <Ack state="failed">Not saved: {startR.error}</Ack>)}
        {receipt && (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not sent: {receipt.error}</Ack>)}
        {drafted > 0 && <Ack state="draft">{drafted} draft record{drafted === 1 ? "" : "s"} on this phone, not sent</Ack>}
      </div>
    </li>
  );
}
