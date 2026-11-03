"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Crosshair, Minus, Plus, Loader2, Check, CheckCircle2, WifiOff, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {compressForUpload} from '@/lib/photo/compress';
import {OfflineStorage} from '@/sp/ngo/OfflineStorage';
import {offlineUnlocked,putDraft,readDrafts,readSynced,archiveDraft,type FieldDraft} from '@/lib/field/outbox';
import {submitFieldDraft} from '@/lib/field/sync';
import {getSupabase} from '@/lib/supabase';

import { SPECIES, type Survey, type SurveyArea } from "@/lib/types";
import { cn } from "@/lib/utils";

// Field capture, radically simpler than the admin UI. Large controls, one
// column, works on a phone outdoors. Keeps area + GPS between entries so a
// worker can log animal after animal quickly.
export function CollectFlow({ survey, areas }: { survey: Survey; areas: SurveyArea[] }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [areaId, setAreaId] = useState<string | null>(areas[0]?.id ?? null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [species, setSpecies] = useState(survey.species);
  const [count, setCount] = useState(1);
  const [sterilised, setSterilised] = useState<boolean | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [mark,setMark]=useState('unknown'),[animalId,setAnimalId]=useState(''),[animalSearch,setAnimalSearch]=useState(''),[animals,setAnimals]=useState<{id:string;name:string|null;code:string|null}[]>([]);
  const scope=user&&survey.ngo_id?`${user.id}:${survey.ngo_id}`:null;
  const [unlocked,setUnlocked]=useState(false);
  const sending=useRef(false),saving=useRef(false),request=useRef(crypto.randomUUID());
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [legacy,setLegacy]=useState<unknown[]>([]);
  const legacyKey=`straypaw:survey-queue:${survey.id}`;
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [drafts,setDrafts]=useState<FieldDraft[]>([]);
  useEffect(()=>{const check=()=>setUnlocked(!!scope&&offlineUnlocked(scope));check();window.addEventListener('straypaw-offline-locked',check);return()=>window.removeEventListener('straypaw-offline-locked',check)},[scope]);
  useEffect(()=>{let active=true;setAnimals([]);if(!survey.ngo_id||animalSearch.trim().length<2)return;const term=animalSearch.trim().replace(/[%_,()]/g,'').slice(0,80),timer=setTimeout(()=>{if(!term)return;void getSupabase()?.from('dogs').select('id,name,code').eq('ngo_id',survey.ngo_id!).or(`name.ilike.%${term}%,code.ilike.%${term}%`).limit(30).then(r=>{if(active){if(r.error)setError('Animal search failed.');else setAnimals(r.data??[])}})},300);return()=>{active=false;clearTimeout(timer)}},[survey.ngo_id,animalSearch]);
  async function refresh(){if(!scope||!offlineUnlocked(scope))return;const rows=(await readDrafts(scope)).filter(d=>d.survey?.surveyId===survey.id);setDrafts(rows);setPending(rows.length)}
  async function flush(){if(!scope||!user||!survey.ngo_id||sending.current||!navigator.onLine)return;sending.current=true;setError(null);try{for(const item of (await readDrafts(scope)).filter(d=>d.survey?.surveyId===survey.id)){try{const r=await submitFieldDraft(item,user.id,survey.ngo_id);await archiveDraft(item,{id:item.id,scope,caseId:survey.id,at:r.confirmedAt,auditId:r.audit_id,label:'Survey observation synchronised'});setRecorded(v=>v+1)}catch(x){await putDraft({...item,status:'failed',error:x instanceof Error?x.message:'Sync failed; retry this observation.'});setError('An observation needs retry. Its device copy was retained.')}}await refresh()}catch(x){setError(x instanceof Error?x.message:'Device storage unavailable.')}finally{sending.current=false}}
  useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);setOnline(navigator.onLine);window.addEventListener('online',on);window.addEventListener('offline',off);if(unlocked){try{const old=JSON.parse(localStorage.getItem(legacyKey)??'[]');setLegacy(Array.isArray(old)?old:[])}catch{setError('An earlier device queue could not be read. It was retained.')}}if(unlocked)void refresh().catch(()=>setError('Device queue could not be read.'));return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off)};// Refresh is scoped to the active account; synchronisation always requires an explicit action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[scope,unlocked]);
  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }


  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { setPhoto(await compressForUpload(file)); } catch { setError("This photo could not be prepared. Your other inputs remain here."); } finally { setUploading(false); }
  }

  async function submit(){if(!scope||saving.current)return;saving.current=true;setBusy(true);setError(null);try{const attributes:Record<string,unknown>={vaccination_mark:mark,...(animalId?{animal_id:animalId}:{})};if(sterilised!==null)attributes.sterilised=sterilised;if(animalId&&count!==1)throw Error('A linked animal requires a count of one.');const payload={surveyId:survey.id,areaId,lat:coords?.lat??null,lng:coords?.lng??null,photoUrl:null,species,count,attributes,notes:notes.trim()||null};await putDraft({id:request.current,scope,caseId:survey.id,code:null,note:notes,at:new Date().toISOString(),status:'pending',survey:payload,...(photo?{file:photo}:{})});request.current=crypto.randomUUID();await refresh();setCount(1);setSterilised(null);setMark('unknown');setAnimalId('');setPhoto(null);setNotes('');if(navigator.onLine)await flush()}catch(x){setError(x instanceof Error?x.message:'The device did not save this observation. Your inputs remain here.')}finally{saving.current=false;setBusy(false)}}
  if(!user)return <p>Sign in to record organisation observations.</p>;
  if(!scope)return <p>This survey has no organisation ownership. An administrator must resolve its provenance before collection.</p>;
  if(!unlocked)return <OfflineStorage scope={scope} onUnlock={()=>setUnlocked(true)}/>;
  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-20 sm:px-6">
      <Link href={`/surveys/${survey.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-bark-500 hover:text-paw-600">
        <ArrowLeft className="h-4 w-4" /> {survey.title}
      </Link>

      {(!online || pending > 0) && (
        <div className={cn("mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-[13px]", online ? "bg-status-hungry/10 text-status-hungry" : "bg-bark-100 text-bark-500 dark:bg-bark-800")}>
          {online ? <RefreshCw className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <span className="flex-1">
            {online ? `${pending} saved on this device · waiting to sync` : `Offline, ${pending} saved on this device`}
          </span>
          {online && pending > 0 && <button onClick={flush} className="font-semibold underline">Sync now</button>}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Record an animal</h1>
        {recorded > 0 && (
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-status-vaccinated">
            <CheckCircle2 className="h-4 w-4" /> {recorded} this session
          </span>
        )}
      </div>

      <div className="space-y-5">
        {legacy.length>0&&<section aria-label="Earlier device observations"><h2>Earlier device observations need review</h2><p>{legacy.length} observations from the previous survey queue remain on this device. Their original recorder and capture time were not stored. Review them before moving them into encrypted storage.</p><details><summary>Review earlier observations</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(legacy,null,2)}</pre><button className="btn" disabled={busy} onClick={async()=>{if(!scope||!window.confirm('Move these reviewed legacy drafts into this organisation’s secure queue? Original recorder and capture time remain unknown. No observation will be submitted automatically.'))return;setBusy(true);try{const before=localStorage.getItem(legacyKey);const synced=new Set((await readSynced(scope)).map(r=>r.id));for(const [i,value]of legacy.entries()){if(!value||typeof value!=='object')throw Error('An earlier observation is malformed. Its source copy was retained.');const payload=value as import('@/lib/survey-actions').SurveyResponseInput;if(payload.surveyId!==survey.id)throw Error('An earlier observation belongs to another survey. Nothing was removed.');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([scope,survey.id,i,value]))))).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32),id=`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20)}`;if(synced.has(id))continue;let file:Blob|undefined;if(payload.photoUrl){const url=new URL(payload.photoUrl),origin=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;if(url.origin!==origin||!url.pathname.startsWith('/storage/v1/object/public/'))throw Error('An earlier external photo needs manual recovery. The source queue was retained.');const response=await fetch(url);if(!response.ok)throw Error('An earlier photo could not be recovered. The source queue was retained.');file=await response.blob();if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024)throw Error('An earlier photo needs manual recovery; its source was retained.')}await putDraft({id,scope,caseId:survey.id,code:null,note:payload.notes??'Earlier survey observation',at:new Date().toISOString(),status:'pending',survey:{...payload,photoUrl:null,attributes:{...payload.attributes,legacy_original_actor:'unknown',legacy_capture_time:'unknown'}},...(file?{file}:{})})}if(localStorage.getItem(legacyKey)===before){localStorage.removeItem(legacyKey);setLegacy([])}await refresh()}catch(x){setError(x instanceof Error?x.message:'Legacy records were retained.')}finally{setBusy(false)}}}>Move reviewed drafts into secure storage</button></details></section>}
        {drafts.length>0&&<section aria-label="Pending survey observations"><h2>On this device · not submitted</h2><p>Recover these records here or in NGO Field mode. Each retry uses the same submission identifier.</p><ul>{drafts.map(d=><li key={d.id}>{new Date(d.at).toLocaleString()} · {d.status==='failed'?'Needs retry':'Pending'} · {d.survey?.count} observed{d.error&&<p role="alert">{d.error}</p>}</li>)}</ul></section>}
        {/* Area */}
        {areas.length > 0 && (
          <Block label="Area">
            <select aria-label="Survey area" value={areaId ?? ""} onChange={(e) => setAreaId(e.target.value || null)} className="w-full rounded-lg border border-black/[0.12] bg-transparent px-3 py-3 text-base outline-none focus:border-paw-400 dark:border-white/[0.15]">
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.code ? `${a.code} · ` : ""}{a.name}</option>
              ))}
            </select>
          </Block>
        )}

        {/* Location */}
        <Block label="Location">
          <button onClick={locate} className="flex w-full items-center justify-between rounded-lg border border-black/[0.12] px-3 py-3 text-base dark:border-white/[0.15]">
            <span className={cn(coords ? "text-bark-900 dark:text-bark-50" : "text-bark-400")}>
              {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Tap to capture GPS"}
            </span>
            {locating ? <Loader2 className="h-5 w-5 animate-spin text-bark-400" /> : <Crosshair className="h-5 w-5 text-paw-500" />}
          </button>
        </Block>

        {/* Species — only when the platform tracks more than one (dog-only today). */}
        {SPECIES.length > 1 && (
        <Block label="Species">
          <div className="flex flex-wrap gap-2">
            {SPECIES.filter((s) => s.id !== "other").map((s) => (
              <button key={s.id} onClick={() => setSpecies(s.id)} className={cn("rounded-lg px-3.5 py-2.5 text-base font-medium", species === s.id ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "border border-black/[0.12] text-bark-600 dark:border-white/[0.15] dark:text-bark-300")}>
                {s.label}
              </button>
            ))}
          </div>
        </Block>
        )}

        {/* Count */}
        <Block label="How many">
          <div className="flex items-center gap-4">
            <button aria-label="Decrease dog count" onClick={() => setCount((c) => Math.max(1, c - 1))} className="grid h-12 w-12 place-items-center rounded-lg border border-black/[0.12] dark:border-white/[0.15]"><Minus className="h-5 w-5" /></button>
            <span className="w-10 text-center text-2xl font-semibold tabular-nums">{count}</span>
            <button aria-label="Increase dog count" onClick={() => setCount((c) => c + 1)} className="grid h-12 w-12 place-items-center rounded-lg border border-black/[0.12] dark:border-white/[0.15]"><Plus className="h-5 w-5" /></button>
          </div>
        </Block>

        <Block label="Vaccination mark observed"><select aria-label="Vaccination mark observed" value={mark} onChange={e=>setMark(e.target.value)} className="input"><option value="unknown">Unknown / not observed</option><option value="marked">Marked</option><option value="unmarked">Unmarked</option></select><p className="text-xs">Record an observed campaign mark; this does not certify vaccination.</p></Block>
        <Block label="Animal identification (optional)"><label>Find a registered animal<input className="input" aria-label="Find observed animal" value={animalSearch} onChange={e=>setAnimalSearch(e.target.value)} placeholder="Name or tag"/></label><select className="input" aria-label="Observed animal identity" value={animalId} onChange={e=>setAnimalId(e.target.value)}><option value="">Not independently identified</option>{animals.map(a=><option key={a.id} value={a.id}>{a.name||'Unnamed'} · {a.code}</option>)}</select><p className="text-xs">Identity search needs a connection. Unidentified observations remain valid field samples.</p></Block>
        {/* Sterilised (quick attribute) */}
        <Block label="Sterilised (ear-notch)">
          <div className="flex gap-2">
            {[["Yes", true], ["No", false], ["Unsure", null]].map(([label, val]) => (
              <button key={label as string} onClick={() => setSterilised(val as boolean | null)} className={cn("flex-1 rounded-lg px-3 py-2.5 text-base font-medium", sterilised === val ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "border border-black/[0.12] text-bark-600 dark:border-white/[0.15] dark:text-bark-300")}>
                {label as string}
              </button>
            ))}
          </div>
        </Block>

        {/* Photo */}
        <Block label="Photo (optional)">
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-black/[0.15] py-4 text-base text-bark-500 dark:border-white/[0.18]">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : photo ? <><Check className="h-5 w-5 text-status-vaccinated" /> Photo added</> : <><Camera className="h-5 w-5" /> Take a photo</>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickPhoto} />
        </Block>

        <label className="block text-sm">Notes (optional)<textarea aria-label="Observation notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 w-full rounded border border-black/10 bg-transparent p-3" /></label>
        {error && <p role="alert" className="text-sm font-medium text-status-injured">{error}</p>}

        <button onClick={submit} disabled={busy} className="sticky bottom-4 flex w-full items-center justify-center gap-2 rounded bg-paw-500 py-4 text-base font-semibold text-white shadow-warm hover:bg-paw-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Save &amp; next
        </button>
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-bark-500">{label}</label>
      {children}
    </div>
  );
}
