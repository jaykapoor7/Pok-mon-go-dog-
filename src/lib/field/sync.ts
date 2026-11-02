import {getSupabase} from '../supabase';
import type {FieldDraft} from './outbox';
export async function submitFieldDraft(d:FieldDraft,actorId:string,ngoId:string){
 const db=getSupabase();if(!db)throw Error('Session unavailable');const session=await db.auth.getUser();if(session.data.user?.id!==actorId)throw Error('Session changed. Sign in again.');
 let url:string|null=null;
 if(d.file){const extension=d.file.type==='application/pdf'?'pdf':d.file.type==='image/png'?'png':d.file.type==='image/webp'?'webp':'jpg';const path=`${ngoId}/${d.caseId}/${d.id}.${extension}`;
  const result=await db.storage.from('abc-evidence').upload(path,d.file,{contentType:d.file.type,upsert:false});
  if(result.error){const existing=await db.storage.from('abc-evidence').download(path);if(existing.error||!existing.data)throw Error(result.error.message);
   const hash=async(b:Blob)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer()))).join(',');if(await hash(existing.data)!==await hash(d.file))throw Error('Stored evidence differs from this draft. It was not overwritten.');
  }url=`storage://abc-evidence/${path}`;
 }
 const r=d.vaccination?await db.rpc('field_confirm_vaccination',{p_request:d.id,p_case:d.caseId,p_payload:d.vaccination}):d.kind?await db.rpc('field_confirm_evidence',{p_request:d.id,p_case:d.caseId,p_kind:d.kind,p_url:url,p_location:d.location??null,p_captured:d.at}):await db.rpc('field_confirm_note',{p_request:d.id,p_case:d.caseId,p_note:d.note,p_captured:d.at});
 if(r.error)throw Error(r.error.message);if(!r.data?.record_id||!r.data?.audit_id)throw Error('Receipt unavailable. Retry the same draft.');
 const table=d.vaccination?'medical_events':d.kind?'evidence_items':'case_updates';const [source,audit]=await Promise.all([db.from(table).select(d.vaccination?'id,notes,dog_id,event_date,performed_by':d.kind?'id,url,location_text':'id,note').eq('id',r.data.record_id).eq('case_id',d.caseId).maybeSingle(),db.from('operational_audit_log').select('id,created_at,after_data').eq('id',r.data.audit_id).eq('actor_id',actorId).eq('entity_id',r.data.record_id).maybeSingle()]);
 if(source.error||audit.error||!source.data||!audit.data)throw Error('Source or audit could not be verified. Retry the same draft.');const record=source.data as unknown as {note?:string;url?:string;location_text?:string;notes?:string;dog_id?:string;event_date?:string;performed_by?:string};if(d.vaccination?record.dog_id!==d.vaccination.dogId||record.event_date!==d.vaccination.eventDate||record.performed_by!==d.vaccination.performedBy.trim()||!record.notes?.includes(d.id)||!record.notes.includes(`Vaccine: ${d.vaccination.vaccine.trim()}\nBatch: ${d.vaccination.batch.trim()}`):d.kind?url?record.url!==url:record.location_text?.trim()!==d.location?.trim():!record.note?.startsWith(d.note.trim()))throw Error('Saved content differs from this draft. Review the source record.');if(audit.data.after_data?.request_id!==d.id)throw Error('Audit request differs from this draft');return {...r.data,confirmedAt:audit.data.created_at};
}
